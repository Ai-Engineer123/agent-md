"""
=============================================================================
FASTAPI WEB SERVER
=============================================================================
Provides the backend REST API for the Executive Web Dashboard and runs
the background 10:30 AM agent scheduler.
"""

import sys
if r"C:\coding\python-packages" not in sys.path:
    sys.path.insert(0, r"C:\coding\python-packages")

from fastapi import FastAPI, HTTPException, Response
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from fastapi.responses import FileResponse
from pydantic import BaseModel
from typing import Optional, List, Dict, Any
from pathlib import Path
from datetime import datetime

from config import SERVER_HOST, SERVER_PORT, BASE_DIR, ENABLE_AUTO_STARTUP_AGENT
from daily_routine import checklist_mgr
from scheduler_service import (
    start_scheduler,
    get_scheduler_status,
    start_background_startup_sync,
    execute_routine_sync
)
from jsonl_logger import read_today_logs, get_today_log_file

app = FastAPI(title="Executive Agent Assistant", version="1.0.0")

# Enable CORS for local access
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Request Models
class LoginRequest(BaseModel):
    username: str
    password: str

class UpdateItemRequest(BaseModel):
    item_id: str
    completed: bool
    feedback: Optional[str] = ""
    updated_by: Optional[str] = "Managing Director"

# ---------------------------------------------------------------------------
# API ROUTES
# ---------------------------------------------------------------------------

@app.post("/api/auth/login")
def login_endpoint(req: LoginRequest):
    """Dynamically authenticates executive credentials via backend auth service (zero frontend hardcode)."""
    from auth_service import authenticate_credentials
    user = authenticate_credentials(req.username, req.password)
    if not user:
        raise HTTPException(status_code=401, detail="Invalid username or password. Please verify credentials.")
    return {"success": True, "user": user}

@app.on_event("startup")
def on_startup():
    start_scheduler()
    if ENABLE_AUTO_STARTUP_AGENT:
        print("[SERVER STARTUP] Auto-startup Agent sync is ENABLED. Launching background routine sync...")
        start_background_startup_sync()
    else:
        print("[SERVER STARTUP] Auto-startup Agent sync is DISABLED (ENABLE_AUTO_STARTUP_AGENT=false). UI and APIs ready immediately with 0 background agent activity!")

    # Auto-schedule current month meetings in advance
    try:
        import meetings as meeting_mgr
        from datetime import datetime
        now = datetime.now()
        meeting_mgr.ensure_month_scheduled(now.year, now.month)
        print(f"[SERVER STARTUP] Pre-scheduled full month meetings for {now.strftime('%B %Y')}.")
    except Exception as e:
        print(f"[SERVER STARTUP] Error pre-scheduling month: {e}")

@app.post("/api/routine/sync")
def trigger_routine_sync_endpoint():
    """Manually triggers an immediate pull of all daily routine data from MongoDB."""
    import threading
    t = threading.Thread(target=execute_routine_sync, daemon=True)
    t.start()
    return {"status": "SYNC_TRIGGERED", "message": "Routine data pull started in background."}

@app.get("/api/checklist")
def get_checklist():
    """Fetch current day's active checklist and progress."""
    return checklist_mgr.get_checklist()

@app.get("/api/routine/today")
def get_today_routine_document():
    """Fetch the complete MongoDB-style structured document for today."""
    from daily_routine import load_daily_routine_document
    doc = load_daily_routine_document()
    return doc or checklist_mgr.get_checklist()

@app.get("/api/attendance/checkin-status")
def get_attendance_status(emp_no: Optional[int] = None):
    """Inspects live MongoDB checkin status for employee."""
    from daily_routine import check_user_checkin, DEFAULT_ADMIN_EMP_NO
    emp = emp_no or DEFAULT_ADMIN_EMP_NO
    return check_user_checkin(emp)

@app.post("/api/checklist/update")
def update_checklist_item(req: UpdateItemRequest):
    """Tick/untick an item and submit feedback notes with updated_by tracking."""
    res = checklist_mgr.update_item(
        item_id=req.item_id,
        completed=req.completed,
        feedback=req.feedback,
        updated_by=req.updated_by or "Managing Director"
    )
    if not res.get("success"):
        raise HTTPException(status_code=404, detail=res.get("error"))
    return res

@app.post("/api/checklist/trigger")
def trigger_manual_routine():
    """Triggers the full MD Agent routine sync from MongoDB immediately and returns updated checklist."""
    execute_routine_sync()
    chk = checklist_mgr.get_checklist()
    return {"success": True, "checklist": chk, "items": chk.get("items", [])}

@app.get("/api/logs/today")
def get_today_logs():
    """Returns today's recorded JSONL events."""
    return {
        "log_file": str(get_today_log_file().name),
        "entries": read_today_logs()
    }

@app.get("/api/status")
def get_system_status():
    """System health check and scheduler next run info."""
    return {
        "status": "online",
        "auto_startup_agent_enabled": ENABLE_AUTO_STARTUP_AGENT,
        "scheduler": get_scheduler_status(),
        "today_log_file": str(get_today_log_file().name)
    }

@app.get("/api/accounts/summary")
def get_accounts_api_summary(date: Optional[str] = None):
    """Returns Task 5 accounts, collections, and imprest holder data directly from local_db."""
    from daily_routine import get_accounts_summary
    from datetime import datetime
    target_dt = datetime.strptime(date, "%Y-%m-%d") if date else None
    return get_accounts_summary(target_dt)

@app.get("/api/dmr/summary")
def get_dmr_api_summary(date: Optional[str] = None):
    """Returns Task 7 DMR audit data directly from local_db."""
    from daily_routine import get_dmr_summary
    from datetime import datetime
    target_dt = datetime.strptime(date, "%Y-%m-%d") if date else None
    return get_dmr_summary(target_dt)

@app.get("/api/plan/summary")
def get_plan_api_summary(date: Optional[str] = None):
    """Returns Task 8 52 Weeks Plan audit data directly from local_db."""
    from daily_routine import get_plan_summary
    from datetime import datetime
    target_dt = datetime.strptime(date, "%Y-%m-%d") if date else None
    return get_plan_summary(target_dt)

@app.get("/api/tickets/summary")
def get_tickets_api_summary(date: Optional[str] = None):
    """Returns Task 6 Tickets audit data directly from local_db."""
    from daily_routine import get_tickets_summary
    target_dt = datetime.strptime(date, "%Y-%m-%d") if date else None
    return get_tickets_summary(target_dt)

@app.get("/api/audit/drilldown")
def get_audit_drilldown_api(date: Optional[str] = None):
    """Returns granular drill-down datasets for Workforce (unchecked/leave), VFM (submitted updates), and DMR (submitted sites)."""
    from daily_routine.audit_drilldown import get_audit_drilldown_data
    return get_audit_drilldown_data(date)

# ---------------------------------------------------------------------------
# AI ENGINE SUMMARY ROUTES
# ---------------------------------------------------------------------------

@app.get("/api/ai/latest-summary")
def get_ai_latest_summary_api(date: Optional[str] = None):
    """Returns the archived AI executive report for the given date."""
    from ai_engine import get_latest_ai_report
    return get_latest_ai_report(date)

@app.post("/api/ai/generate-summary")
def generate_ai_summary_api(date: Optional[str] = None):
    """Triggers on-demand generation and archiving of the AI Executive Briefing."""
    from ai_engine import generate_and_archive_summary
    from datetime import datetime
    target_dt = datetime.strptime(date, "%Y-%m-%d") if date else None
    return generate_and_archive_summary(target_dt)


# ---------------------------------------------------------------------------
# EMAIL INTEGRATION ROUTES
# ---------------------------------------------------------------------------
class EmailSendRequest(BaseModel):
    to_email: Optional[str] = None
    date: Optional[str] = None
    subject: Optional[str] = None

@app.post("/api/email/send-summary")
def send_summary_email_endpoint(req: EmailSendRequest):
    """Email sending is currently disabled per user preference."""
    # from email_service import send_executive_briefing_email
    # res = send_executive_briefing_email(
    #     to_email=req.to_email,
    #     date_str=req.date,
    #     subject=req.subject
    # )
    # return res
    return {
        "success": False,
        "status": "EMAIL_DISABLED",
        "message": "Email dispatch has been disabled per configuration."
    }

@app.get("/api/email/preview-html")
def preview_email_html_endpoint(date: Optional[str] = None):
    """Returns the luxury HTML briefing preview directly for viewing in browser."""
    from email_service import generate_email_preview
    from fastapi.responses import HTMLResponse
    html_content, report_data, preview_path = generate_email_preview(date)
    return HTMLResponse(content=html_content)

# ---------------------------------------------------------------------------
# TWILIO VOICE CALL INTEGRATION ROUTES
# ---------------------------------------------------------------------------
class TwilioCallRequest(BaseModel):
    to_phone: Optional[str] = None
    date: Optional[str] = None

@app.post("/api/twilio/trigger-call")
def trigger_call_endpoint(req: TwilioCallRequest):
    """Triggers automated executive phone call via Twilio Voice API."""
    from twilio_service import trigger_executive_briefing_call
    return trigger_executive_briefing_call(
        to_phone=req.to_phone,
        date_str=req.date
    )

@app.get("/api/twilio/preview-speech")
def preview_speech_endpoint(date: Optional[str] = None):
    """Returns the preview of what the AI Voice Agent will speak on the phone call."""
    from twilio_service import preview_call_speech
    return preview_call_speech(date)

# ---------------------------------------------------------------------------
# STATIC FILES & WEB DASHBOARD
# ---------------------------------------------------------------------------
static_dir = BASE_DIR / "static"
static_dir.mkdir(parents=True, exist_ok=True)
app.mount("/static", StaticFiles(directory=str(static_dir)), name="static")

@app.get("/api/audit/data")
def get_audit_data(date: Optional[str] = None):
    """Directly loads and returns the AI executive report from data/ai_reports/<date>.json."""
    from ai_engine import get_latest_ai_report
    return get_latest_ai_report(date)

@app.get("/api/audit/drilldown")
def get_audit_drilldown_endpoint(date: Optional[str] = None):
    """Returns granular drill-down records for Workforce, VFM, and DMR."""
    from daily_routine.audit_drilldown import get_audit_drilldown_data
    return get_audit_drilldown_data(date)

# ---------------------------------------------------------------------------
# CALENDAR & MEETING API ROUTES
# ---------------------------------------------------------------------------
class MeetingRequest(BaseModel):
    id: Optional[str] = None
    title: str
    date: str
    time: Optional[str] = "10:00 AM"
    location: Optional[str] = "Office / Online"
    type: Optional[str] = "Executive Meeting"
    attendees: Optional[list] = []
    notes: Optional[str] = ""
    status: Optional[str] = "SCHEDULED"

@app.get("/api/calendar/month-summary")
def get_calendar_month_summary(year: Optional[int] = None, month: Optional[int] = None):
    """Returns calendar month overview with daily checklist progress & meetings."""
    import calendar_service
    from datetime import datetime
    now = datetime.now()
    y = year or now.year
    m = month or now.month
    return calendar_service.get_month_calendar_overview(y, m)

@app.get("/api/calendar/day-detail")
def get_calendar_day_detail_endpoint(date: Optional[str] = None):
    """Returns complete day records: 8 checklist items breakdown, meetings & AI report snippet."""
    import calendar_service
    from datetime import datetime
    target_date = date or datetime.now().strftime("%Y-%m-%d")
    return calendar_service.get_calendar_day_detail(target_date)

@app.get("/api/meetings")
def get_meetings_endpoint(response: Response, date: Optional[str] = None, company: Optional[str] = None):
    """Returns all executive meetings, optionally filtered by date or company."""
    response.headers["Cache-Control"] = "no-cache, no-store, must-revalidate"
    response.headers["Pragma"] = "no-cache"
    response.headers["Expires"] = "0"
    import meetings as meeting_mgr
    meetings = meeting_mgr.load_all_meetings()
    if date:
        meetings = [m for m in meetings if m.get("date") == date]
    if company and company.upper() != "ALL":
        meetings = [m for m in meetings if m.get("company", "").upper() == company.upper()]
    return meeting_mgr.sort_meetings_by_datetime(meetings)

@app.post("/api/meetings")
def save_meeting_endpoint(req: MeetingRequest):
    """Schedules or updates an executive meeting."""
    import meetings as meeting_mgr
    meeting_data = req.dict()
    return meeting_mgr.add_or_update_meeting(meeting_data)

class MeetingUpdateFeedbackRequest(BaseModel):
    md_feedback: Optional[str] = None
    topics_progress: Optional[List[Dict[str, Any]]] = None
    status: Optional[str] = None
    md_priority: Optional[str] = None
    md_priority_notes: Optional[str] = None
    next_meeting_queries: Optional[List[Any]] = None
    first_to_ask: Optional[List[Any]] = None
    updated_by: Optional[str] = "Managing Director"

@app.get("/api/meetings/{meeting_id}/dossier")
def get_meeting_dossier_endpoint(meeting_id: str, response: Response):
    """Returns complete meeting dossier including previous meeting directives and opening questions."""
    response.headers["Cache-Control"] = "no-cache, no-store, must-revalidate"
    response.headers["Pragma"] = "no-cache"
    response.headers["Expires"] = "0"
    import meetings as meeting_mgr
    dossier = meeting_mgr.get_meeting_dossier(meeting_id)
    if not dossier:
        raise HTTPException(status_code=404, detail="Meeting not found")
    return dossier

@app.post("/api/meetings/{meeting_id}/feedback")
def update_meeting_feedback_endpoint(meeting_id: str, req: MeetingUpdateFeedbackRequest):
    """Updates MD feedback, topic completion, status, or MD next-week priority with updated_by tracking."""
    import meetings as meeting_mgr
    updated = meeting_mgr.update_meeting_feedback_and_topics(
        meeting_id=meeting_id,
        md_feedback=req.md_feedback,
        topics_progress=req.topics_progress,
        status=req.status,
        md_priority=req.md_priority,
        md_priority_notes=req.md_priority_notes,
        next_meeting_queries=req.next_meeting_queries,
        first_to_ask=req.first_to_ask,
        updated_by=req.updated_by or "Managing Director"
    )
    if not updated:
        raise HTTPException(status_code=404, detail="Meeting not found")
    return {"success": True, "meeting": updated}

class ReorderPriorityRequest(BaseModel):
    week_start_date: Optional[str] = None

@app.post("/api/meetings/reorder-priority")
def reorder_priority_endpoint(req: ReorderPriorityRequest):
    """Reorganizes upcoming uncompleted meetings in the week strictly by priority."""
    import meetings as meeting_mgr
    meetings = meeting_mgr.reorder_week_by_priority(req.week_start_date)
    return {"success": True, "meetings": meetings}


# ---------------------------------------------------------------------------
# COMMON & DYNAMIC AGENDA ENDPOINTS
# ---------------------------------------------------------------------------

@app.get("/api/agenda/common")
def get_common_agenda_endpoint():
    """Returns shared common agenda templates."""
    import meetings as meeting_mgr
    return meeting_mgr.load_common_agenda()

class AddCommonAgendaRequest(BaseModel):
    title: str
    scope: Optional[str] = "Common"

@app.post("/api/agenda/common")
def add_common_agenda_endpoint(req: AddCommonAgendaRequest):
    """Adds a new shared common agenda template item."""
    import meetings as meeting_mgr
    if not req.title or not req.title.strip():
        raise HTTPException(status_code=400, detail="Title cannot be empty")
    item = meeting_mgr.add_common_agenda_item(title=req.title, scope=req.scope or "Common")
    return {"success": True, "item": item}

@app.delete("/api/agenda/common/{item_id}")
def delete_common_agenda_endpoint(item_id: str):
    """Deletes a common agenda template item."""
    import meetings as meeting_mgr
    ok = meeting_mgr.delete_common_agenda_item(item_id)
    if not ok:
        raise HTTPException(status_code=404, detail="Item not found")
    return {"success": True, "deleted_id": item_id}

class AddMeetingTopicRequest(BaseModel):
    title: str
    scope: Optional[str] = "Specific"
    is_common: Optional[bool] = False
    created_by: Optional[str] = "Managing Director"

@app.post("/api/meetings/{meeting_id}/topics")
def add_meeting_topic_endpoint(meeting_id: str, req: AddMeetingTopicRequest):
    """Allows MD to add a custom/specific or common agenda topic to a meeting with created_by tracking."""
    import meetings as meeting_mgr
    if not req.title or not req.title.strip():
        raise HTTPException(status_code=400, detail="Topic title cannot be empty")
    updated = meeting_mgr.add_topic_to_meeting(
        meeting_id=meeting_id,
        title=req.title,
        scope=req.scope or "Specific",
        is_common=req.is_common or False,
        created_by=req.created_by or "Managing Director"
    )
    if not updated:
        raise HTTPException(status_code=404, detail="Meeting not found")
    return {"success": True, "meeting": updated, "topics": updated.get("topics", [])}

class UpdateMeetingTopicRequest(BaseModel):
    title: Optional[str] = None
    scope: Optional[str] = None
    completed: Optional[bool] = None
    notes: Optional[str] = None
    updated_by: Optional[str] = "Managing Director"

@app.put("/api/meetings/{meeting_id}/topics/{topic_id}")
def update_meeting_topic_endpoint(meeting_id: str, topic_id: str, req: UpdateMeetingTopicRequest):
    """Allows MD to edit or toggle any topic with updated_by tracking."""
    import meetings as meeting_mgr
    updated = meeting_mgr.update_topic_in_meeting(
        meeting_id=meeting_id,
        topic_id=topic_id,
        title=req.title,
        scope=req.scope,
        completed=req.completed,
        notes=req.notes,
        updated_by=req.updated_by or "Managing Director"
    )
    if not updated:
        raise HTTPException(status_code=404, detail="Meeting or topic not found")
    return {"success": True, "meeting": updated, "topics": updated.get("topics", [])}

@app.delete("/api/meetings/{meeting_id}/topics/{topic_id}")
def delete_meeting_topic_endpoint(meeting_id: str, topic_id: str):
    """Allows MD to delete any agenda topic from a meeting."""
    import meetings as meeting_mgr
    updated = meeting_mgr.delete_topic_from_meeting(meeting_id=meeting_id, topic_id=topic_id)
    if not updated:
        raise HTTPException(status_code=404, detail="Meeting not found")
    return {"success": True, "meeting": updated, "topics": updated.get("topics", [])}

@app.post("/api/meetings/{meeting_id}/topics/import-common")
def import_common_agenda_endpoint(meeting_id: str):
    """Appends all shared common agenda topics into this meeting."""
    import meetings as meeting_mgr
    updated = meeting_mgr.apply_common_agenda_to_meeting(meeting_id=meeting_id)
    if not updated:
        raise HTTPException(status_code=404, detail="Meeting not found")
    return {"success": True, "meeting": updated, "topics": updated.get("topics", [])}

class MeetingRescheduleRequest(BaseModel):
    new_date: str
    new_time: Optional[str] = None
    reason: Optional[str] = None
    reschedule_om_fm: Optional[bool] = False
    updated_by: Optional[str] = "Managing Director"

@app.post("/api/meetings/{meeting_id}/reschedule")
def reschedule_meeting_endpoint(meeting_id: str, req: MeetingRescheduleRequest):
    """Postpones, prepones, or adjusts time for a meeting with full audit trail & actor."""
    import meetings as meeting_mgr
    updated = meeting_mgr.reschedule_meeting(
        meeting_id=meeting_id,
        new_date=req.new_date,
        new_time=req.new_time,
        reason=req.reason,
        reschedule_om_fm=req.reschedule_om_fm or False,
        actor=req.updated_by or "Managing Director"
    )
    if not updated:
        raise HTTPException(status_code=404, detail="Meeting not found")
    if isinstance(updated, dict) and updated.get("error") == "CANNOT_RESCHEDULE_COMPLETED":
        raise HTTPException(status_code=400, detail="Cannot reschedule a completed meeting. Completed records are locked.")
    return {"success": True, "meeting": updated}

class MeetingSwapRequest(BaseModel):
    meeting_id_a: str
    meeting_id_b: str
    reason: Optional[str] = None
    updated_by: Optional[str] = "Managing Director"

@app.post("/api/meetings/swap")
def swap_meetings_endpoint(req: MeetingSwapRequest):
    """Swaps date and time slots between two scheduled meetings with actor tracking."""
    import meetings as meeting_mgr
    mtg_a, mtg_b = meeting_mgr.swap_meetings(
        meeting_id_a=req.meeting_id_a,
        meeting_id_b=req.meeting_id_b,
        reason=req.reason,
        actor=req.updated_by or "Managing Director"
    )
    if not mtg_a or not mtg_b:
        raise HTTPException(status_code=400, detail="Cannot swap: One or both meetings not found, or one of the meetings is already COMPLETED (locked).")
    return {"success": True, "meeting_a": mtg_a, "meeting_b": mtg_b}

class GenerateWeekScheduleRequest(BaseModel):
    week_start_date: Optional[str] = None
    force: Optional[bool] = False

@app.post("/api/meetings/generate-week")
def generate_week_schedule_endpoint(req: GenerateWeekScheduleRequest):
    """Generates schedule for a specific week, inheriting MD priorities."""
    import meetings as meeting_mgr
    all_meetings = meeting_mgr.generate_week_schedule(
        week_start_date=req.week_start_date,
        force=req.force or False
    )
    return {"success": True, "meetings": all_meetings}

class ScheduleMonthlyAssemblyRequest(BaseModel):
    date: str
    time: Optional[str] = "08:00 AM - 12:30 PM"
    location: Optional[str] = "Main Assembly Hall / Boardroom"
    created_by: Optional[str] = "Managing Director"

@app.post("/api/meetings/schedule-monthly-assembly")
def schedule_monthly_assembly_endpoint(req: ScheduleMonthlyAssemblyRequest):
    """On-demand scheduling of the monthly OM & FM 8:00 AM assembly."""
    import meetings as meeting_mgr
    assembly = meeting_mgr.schedule_monthly_om_fm_meeting(
        target_date=req.date,
        time=req.time or "08:30 AM - 01:30 PM (Half Day)",
        location=req.location or "Main Assembly Hall / Boardroom"
    )
    return {"success": True, "meeting": assembly}
 
class GenerateMonthScheduleRequest(BaseModel):
    year: int
    month: int
    force: Optional[bool] = False

@app.get("/api/meetings/month")
def get_month_meetings_endpoint(year: Optional[int] = None, month: Optional[int] = None):
    """Returns comprehensive full-month meetings breakdown with week-by-week hierarchy & OM/FM half-day assembly."""
    import meetings as meeting_mgr
    from datetime import datetime
    now = datetime.now()
    y = year or now.year
    m = month or now.month
    return meeting_mgr.get_month_meetings_breakdown(y, m)

@app.post("/api/meetings/generate-month")
def generate_month_endpoint(req: GenerateMonthScheduleRequest):
    """Generates all weeks and half-day assembly for an entire month."""
    import meetings as meeting_mgr
    breakdown = meeting_mgr.get_month_meetings_breakdown(req.year, req.month)
    return {"success": True, "breakdown": breakdown}


@app.get("/")
def api_root():
    """Root health-check and API directory for Flutter mobile app."""
    return {
        "status": "online",
        "service": "Executive MD Operations Assistant API",
        "target_client": "Flutter Mobile & Desktop",
        "version": "1.0.0",
        "endpoints": {
            "checklist": "/api/checklist",
            "meetings": "/api/meetings",
            "routine": "/api/routine/today",
            "audit": "/api/audit/report",
            "calendar": "/api/calendar/events",
            "logs": "/api/logs/today",
            "scheduler": "/api/scheduler/status"
        }
    }

@app.get("/checklist")
def serve_checklist_page():
    checklist_file = static_dir / "checklist.html"
    if checklist_file.exists():
        return FileResponse(checklist_file)
    return {"message": "Checklist page not found."}

@app.get("/audit")
def serve_audit_page():
    audit_file = static_dir / "audit.html"
    if audit_file.exists():
        return FileResponse(audit_file)
    return {"message": "Audit page not found."}

@app.get("/calendar")
def serve_calendar_page():
    calendar_file = static_dir / "calendar.html"
    if calendar_file.exists():
        return FileResponse(calendar_file)
    return {"message": "Calendar page not found."}

@app.get("/meetings")
def serve_meetings_page():
    meetings_file = static_dir / "meetings.html"
    if meetings_file.exists():
        return FileResponse(meetings_file)
    return {"message": "Meetings page not found."}

if __name__ == "__main__":
    import uvicorn
    uvicorn.run("server:app", host=SERVER_HOST, port=SERVER_PORT, reload=True)
