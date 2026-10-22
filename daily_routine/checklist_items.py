"""
=============================================================================
CHECKLIST ITEMS & MANAGEMENT
=============================================================================
This file defines the 8 daily items that the agent will remind you about every day.
You can easily edit, reword, or add new items right here in this file!
"""

import sys
from pathlib import Path

ROOT_DIR = Path(__file__).resolve().parent.parent
if str(ROOT_DIR) not in sys.path:
    sys.path.insert(0, str(ROOT_DIR))

if r"C:\coding\python-packages" not in sys.path:
    sys.path.insert(0, r"C:\coding\python-packages")



from datetime import datetime
from jsonl_logger import log_event
from time_utils import format_time_ampm, to_ist
from .task_1_checkin_service import check_user_checkin, DEFAULT_ADMIN_EMP_NO
from .document_store import save_daily_routine_document, load_daily_routine_document

def format_inr(amount) -> str:
    """Formats amount into Indian Rupee format with ₹ symbol (e.g., 15318855 -> ₹ 1,53,18,855)"""
    try:
        val = int(round(float(amount)))
    except (ValueError, TypeError):
        return f"₹ {amount}"
    is_neg = val < 0
    s = str(abs(val))
    if len(s) <= 3:
        res = s
    else:
        last3 = s[-3:]
        rest = s[:-3]
        groups = []
        while len(rest) > 2:
            groups.insert(0, rest[-2:])
            rest = rest[:-2]
        if rest:
            groups.insert(0, rest)
        res = ",".join(groups) + "," + last3
    return f"{'-' if is_neg else ''}₹ {res}"

# format_time_ampm is globally handled by time_utils to guarantee accurate IST conversion
# from any UTC/naive MongoDB timestamps.

# ---------------------------------------------------------------------------
# DEFAULT 8 DAILY ITEMS
# You can change titles, descriptions, or categories anytime below:
# ---------------------------------------------------------------------------
DEFAULT_CHECKLIST_DEFINITIONS = [
    {
        "id": "item_1",
        "number": 1,
        "title": "User Check-in Verification",
        "english_summary": "Verify today's check-in status for executive user",
        "tanglish_summary": "Verify today's check-in status for executive user",
        "description": "Check whether you (admin/user) have checked in for today.",
        "category": "Attendance & Personal",
        "icon": "user-check",
    },
    {
        "id": "item_2",
        "number": 2,
        "title": "Head Office & In-charges Morning Attendance",
        "english_summary": "Verify morning attendance for Head Office staff and company in-charges",
        "tanglish_summary": "Verify morning attendance for Head Office staff and company in-charges",
        "description": "Audit whether Head Office staff and all branch/company in-charges marked morning attendance.",
        "category": "Attendance Audit",
        "icon": "users",
    },
    {
        "id": "item_3",
        "number": 3,
        "title": "Daily Emails Review",
        "english_summary": "Review and respond to critical business emails and communications",
        "tanglish_summary": "Review and respond to critical business emails and communications",
        "description": "Reminder to review and respond to today's critical business emails and communications.",
        "category": "Communication",
        "icon": "mail",
    },
    {
        "id": "item_4",
        "number": 4,
        "title": "Director, GM, AGM, OM & Vacancy Reports",
        "english_summary": "Review yesterday's submitted leadership and vacancy reports",
        "tanglish_summary": "Review yesterday's submitted leadership and vacancy reports",
        "description": "Reminder to inspect yesterday's submitted reports from Director, GM, AGM, OM, and vacant position reports.",
        "category": "Management Reports",
        "icon": "file-text",
    },
    {
        "id": "item_5",
        "number": 5,
        "title": "DMR (Daily Management Reports)",
        "english_summary": "Audit site DMR submissions and track pending daily reports",
        "tanglish_summary": "Audit site DMR submissions and track pending daily reports",
        "description": "Review today's Daily Management Reports (DMR) documents and operational summaries.",
        "category": "Management Reports",
        "icon": "bar-chart-2",
    },
    {
        "id": "item_6",
        "number": 6,
        "title": "52 Weeks Plan (Current Week Goals)",
        "english_summary": "Review current week milestone goals and today's planned operations",
        "tanglish_summary": "Review current week milestone goals and today's planned operations",
        "description": "Display and check the active milestone goals and planned deliverables for the current week.",
        "category": "Strategic Planning",
        "icon": "calendar",
    },
    {
        "id": "item_7",
        "number": 7,
        "title": "Operational & Support Tickets",
        "english_summary": "Audit pending tickets, resolved issues & overdue SLA danger alerts",
        "tanglish_summary": "Audit pending tickets, resolved issues & overdue SLA danger alerts",
        "description": "Review pending operational tickets, solved issues, customer escalations, and turnaround times.",
        "category": "Support & Operations",
        "icon": "help-circle",
    },
    {
        "id": "item_8",
        "number": 8,
        "title": "Accounts, Imprest & Employee Portal Updates",
        "english_summary": "Audit collections, unsettled imprest balances & staff work updates",
        "tanglish_summary": "Audit collections, unsettled imprest balances & staff work updates",
        "description": "Review yesterday's total collections, imprest cash balances, bank accounts, and employee work updates submitted on the company website.",
        "category": "Accounts & Operations",
        "icon": "dollar-sign",
    },
]

def is_today_synced(target_date: str = None) -> bool:
    """Returns True only if today's local snapshot directory exists and has been populated."""
    if not target_date:
        target_date = datetime.now().strftime("%Y-%m-%d")
    today_dir = ROOT_DIR / "local_db" / target_date
    return today_dir.exists() and (today_dir / "task_1_checkin.json").exists()


class ChecklistManager:
    """Manages active checklist state for the current day."""
    
    def __init__(self):
        self.active_date = None
        self.items = []
        self._init_daily_checklist()

    def _init_daily_checklist(self, force_reset: bool = False):
        today_str = datetime.now().strftime("%Y-%m-%d")
        if self.active_date != today_str or force_reset:
            self.active_date = today_str
            self.items = []
            
            # Check if document already exists on disk in data/daily_routines/
            existing = load_daily_routine_document(today_str) if not force_reset else None
            if existing and existing.get("items"):
                existing_by_id = {it.get("id"): it for it in existing["items"] if it.get("id")}
                merged = []
                for d in DEFAULT_CHECKLIST_DEFINITIONS:
                    old = existing_by_id.get(d["id"], {})
                    merged.append({
                        **d,
                        "completed": old.get("completed", False),
                        "manual_verified": old.get("manual_verified", old.get("completed", False)),
                        "feedback": old.get("feedback", ""),
                        "user_feedback": old.get("user_feedback", old.get("feedback", "")),
                        "completed_at": old.get("completed_at", None),
                        "last_updated": old.get("last_updated", None),
                        "auto_verified": old.get("auto_verified", False),
                        "ai_verified": old.get("ai_verified", False),
                        "ai_status": old.get("ai_status", "PENDING_AUDIT"),
                        "ai_feedback": old.get("ai_feedback", ""),
                        "ai_verified_at": old.get("ai_verified_at", None),
                        "live_meta": old.get("live_meta", {})
                    })
                self.items = merged
            else:
                for d in DEFAULT_CHECKLIST_DEFINITIONS:
                    self.items.append({
                        **d,
                        "completed": False,          # Manual Verified (synced for backward compat)
                        "manual_verified": False,    # MD Manual Tick
                        "feedback": "",              # User Feedback (synced for backward compat)
                        "user_feedback": "",         # MD Directives & Remarks
                        "completed_at": None,
                        "last_updated": None,
                        "auto_verified": False,      # Kept for backward compat
                        "ai_verified": False,        # AI Verification Tick
                        "ai_status": "PENDING_AUDIT",
                        "ai_feedback": "",           # AI Real-time Audit Observation Note
                        "ai_verified_at": None,
                        "live_meta": {}
                    })
                # Automatically check attendance for Item 1
                self.verify_user_checkin()

            # Persist the full MongoDB-style document
            save_daily_routine_document({
                "date": today_str,
                "items": self.items,
                "last_action": "INIT" if not force_reset else "RESET"
            })

            # Log the checklist generation in JSONL
            log_event("CHECKLIST_GENERATED", {
                "date": today_str,
                "total_items": len(self.items)
            })

    def verify_user_checkin(self):
        """Queries local snapshot read-only to check if MD (employee 1) checked in today."""
        att = check_user_checkin(DEFAULT_ADMIN_EMP_NO)
        for item in self.items:
            if item["id"] == "item_1":
                item["live_meta"] = att
                if att.get("checked_in"):
                    item["completed"] = True
                    item["auto_verified"] = True
                    item["completed_at"] = att.get("check_in_time")
                    if not item["feedback"]:
                        time_part = format_time_ampm(att.get("check_in_time", ""))
                        item["feedback"] = f"Auto-verified from DB: Checked in at {time_part} ({att.get('site', 'HEAD OFFICE')})"
                    log_event("AUTO_CHECKIN_VERIFIED", att)
                break

    def auto_evaluate_from_local_snapshots(self):
        """Evaluates all routine checklist items against freshly synced local_db snapshots."""
        today_str = datetime.now().strftime("%Y-%m-%d")
        if self.active_date != today_str:
            self._init_daily_checklist()

        # If today's routine has NOT synced yet, keep items in AWAITING_SYNC state
        # instead of falsely marking items as verified or falling back to yesterday!
        if not is_today_synced(today_str):
            for item in self.items:
                if "manual_verified" not in item:
                    item["manual_verified"] = item.get("completed", False)
                if "user_feedback" not in item:
                    item["user_feedback"] = item.get("feedback", "")

                if item["id"] in ("item_3", "item_4"):
                    item["ai_verified"] = False
                    item["ai_status"] = "MANUAL_CHECK_REQUIRED"
                    if not item.get("ai_feedback") or "not been run" in item.get("ai_feedback", ""):
                        if item["id"] == "item_4":
                            item["ai_feedback"] = "Digital reports not in DB. MD manual inspection of physical/drive submissions required."
                        else:
                            item["ai_feedback"] = "Official email inbox not connected to database. MD direct review required for client escalations."
                else:
                    item["ai_verified"] = False
                    item["ai_status"] = "AWAITING_SYNC"
                    item["ai_feedback"] = "⏳ Today's routine audit has not been run yet. Click 'Trigger 10:30 AM Routine Now' above."
                    item["ai_verified_at"] = None

            save_daily_routine_document({
                "date": today_str,
                "items": self.items,
                "last_action": "AWAITING_SYNC_STATE"
            })
            return self.items

        from .task_1_checkin_service import check_user_checkin
        from .task_3_attendance_service import get_head_office_attendance, get_company_incharges_attendance
        from .task_5_accounts_service import get_accounts_summary
        from .task_6_tickets_service import get_tickets_summary
        from .task_7_dmr_service import get_dmr_summary
        from .task_8_plan_service import get_plan_summary

        now_iso = datetime.now().isoformat()

        for item in self.items:
            item["live_meta"] = {}  # Keep checklist clean; detailed data stays strictly in local_db

            # Ensure dual verification schema fields exist
            if "manual_verified" not in item:
                item["manual_verified"] = item.get("completed", False)
            if "user_feedback" not in item:
                item["user_feedback"] = item.get("feedback", "")

            # Item 1: Admin Checkin
            if item["id"] == "item_1":
                att = check_user_checkin(DEFAULT_ADMIN_EMP_NO)
                if att.get("checked_in"):
                    time_ampm = format_time_ampm(att.get("check_in_time", ""))
                    site_name = att.get("site", "HEAD OFFICE")
                    item["ai_verified"] = True
                    item["ai_status"] = "VERIFIED"
                    item["ai_feedback"] = f"MD S GANESAMOORTHY marked attendance at {time_ampm} ({site_name})."
                else:
                    last_known_raw = att.get("last_known_checkin", "")
                    last_known_str = format_time_ampm(last_known_raw) if last_known_raw else ""
                    last_str = f"at {last_known_str}" if last_known_str else "None"
                    item["ai_verified"] = False
                    item["ai_status"] = "AWAITING_SYNC"
                    item["ai_feedback"] = f"MD has not checked in yet for today. Last known: {last_str}"

            # Item 2: HO & Incharges Morning Attendance
            elif item["id"] == "item_2":
                ho = get_head_office_attendance()
                inc = get_company_incharges_attendance()
                if ho.get("status") == "NOT_SYNCED_YET" or inc.get("status") == "NOT_SYNCED_YET":
                    item["ai_verified"] = False
                    item["ai_status"] = "AWAITING_SYNC"
                    item["ai_feedback"] = "⏳ Attendance snapshot not synced yet for today."
                else:
                    ho_pres = ho.get("present_count", 0)
                    ho_tot = ho.get("total_staff", 0)
                    ho_leave = ho.get("on_leave_count", 0)
                    ho_abs = ho.get("not_checked_in_count", 0)
                    inc_m = inc.get("metrics", {})
                    inc_pres = inc_m.get("total_present", 0)
                    inc_tot = inc_m.get("total_incharges", 0)
                    inc_leave = inc_m.get("total_on_leave", 0)
                    inc_abs = inc_m.get("total_not_checked_in", 0)

                    if ho_tot == 0 and inc_tot == 0:
                        item["ai_verified"] = False
                        item["ai_status"] = "AWAITING_SYNC"
                        item["ai_feedback"] = "⏳ Attendance data not yet recorded for today."
                    else:
                        item["ai_verified"] = True
                        item["ai_status"] = "ATTENTION_REQUIRED" if (ho_abs > 0 or inc_abs > 0) else "VERIFIED"
                        item["ai_feedback"] = (
                            f"HO Staff: {ho_pres}/{ho_tot} Present ({ho_leave} on leave, {ho_abs} absent) | "
                            f"In-charges: {inc_pres}/{inc_tot} Present ({inc_abs} not checked in)."
                        )

            # Item 3: Daily Emails Review (Manual MD Check)
            elif item["id"] == "item_3":
                item["ai_verified"] = False
                item["ai_status"] = "MANUAL_CHECK_REQUIRED"
                item["ai_feedback"] = "Official email inbox not connected to database. MD direct review required for client escalations."

            # Item 4: Director, GM, AGM, OM & Vacancy Reports (Manual MD Check)
            elif item["id"] == "item_4":
                item["ai_verified"] = False
                item["ai_status"] = "MANUAL_CHECK_REQUIRED"
                item["ai_feedback"] = "Digital reports not in DB. MD manual inspection of physical/drive submissions required."

            # Item 5: DMR Reports (FMS Sites Only)
            elif item["id"] == "item_5":
                dmr = get_dmr_summary(allow_fallback=False)
                if dmr.get("status") == "NOT_SYNCED_YET":
                    item["ai_verified"] = False
                    item["ai_status"] = "AWAITING_SYNC"
                    item["ai_feedback"] = "⏳ DMR snapshot not synced yet for today."
                else:
                    dm = dmr.get("metrics", {})
                    sites_tot = dm.get("total_fms_sites", dm.get("total_active_sites", 0))
                    sites_sub = dm.get("submitted_sites_yesterday", 0)
                    sites_pen = dm.get("pending_sites_yesterday", 0)
                    comp_pct = dm.get("compliance_percent", 0.0)

                    item["ai_verified"] = True
                    item["ai_status"] = "ATTENTION_REQUIRED" if sites_pen > 0 else "VERIFIED"
                    item["ai_feedback"] = (
                        f"FMS Sites: {sites_sub} submitted, {sites_pen} pending out of {sites_tot} total FMS sites "
                        f"({comp_pct}% compliance)."
                    )

            # Item 6: 52 Weeks Plan (Current Week Goals)
            elif item["id"] == "item_6":
                plan = get_plan_summary(allow_fallback=False)
                if plan.get("status") == "NOT_SYNCED_YET":
                    item["ai_verified"] = False
                    item["ai_status"] = "AWAITING_SYNC"
                    item["ai_feedback"] = "⏳ 52 Weeks Plan snapshot not synced yet for today."
                else:
                    pm = plan.get("metrics", {})
                    curr_wk = pm.get("current_week_number", 0)
                    wk_tasks = pm.get("total_tasks_this_week", 0)
                    today_tasks = pm.get("today_total_tasks", 0)
                    today_hk = pm.get("today_housekeeping_tasks", 0)
                    today_mep = pm.get("today_mep_tasks", 0)
                    today_status = pm.get("today_status", "pending")

                    yest_tasks = pm.get("yesterday_completed_tasks", 0)
                    yest_day = pm.get("yesterday_weekday", "Yesterday")
                    today_day = pm.get("today_weekday", "Today")
                    assets_cnt = pm.get("total_critical_assets_tracked", 61)

                    item["ai_verified"] = True
                    item["ai_status"] = "VERIFIED"
                    item["ai_feedback"] = (
                        f"Week {curr_wk} Active ({wk_tasks} total operational tasks). "
                        f"Yesterday ({yest_day}) completed: {yest_tasks} tasks. "
                        f"Today ({today_day}) planned: {today_tasks} tasks across {assets_cnt} facility assets."
                    )

            # Item 7: Operational & Support Tickets
            elif item["id"] == "item_7":
                tick = get_tickets_summary(allow_fallback=False)
                if tick.get("status") == "NOT_SYNCED_YET":
                    item["ai_verified"] = False
                    item["ai_status"] = "AWAITING_SYNC"
                    item["ai_feedback"] = "⏳ Tickets snapshot not synced yet for today."
                else:
                    tm = tick.get("metrics", {})
                    tot_tickets = tm.get("total_tickets", 0)
                    int_tickets = tm.get("total_internal_tickets", 0)
                    ext_tickets = tm.get("total_external_tickets", 0)
                    dan_tickets = tm.get("total_danger_tickets_overdue_3_days", 0)

                    item["ai_verified"] = True
                    item["ai_status"] = "ATTENTION_REQUIRED" if dan_tickets > 0 else "VERIFIED"
                    item["ai_feedback"] = (
                        f"Total: {tot_tickets} tickets ({int_tickets} Internal, {ext_tickets} External). "
                        f"Alert: {dan_tickets} danger tickets overdue > 3 days requiring escalation."
                    )

            # Item 8: Accounts, Collections, Imprest & Employee Portal Updates
            elif item["id"] == "item_8":
                acc = get_accounts_summary(allow_fallback=False)
                if acc.get("status") == "NOT_SYNCED_YET":
                    item["ai_verified"] = False
                    item["ai_status"] = "AWAITING_SYNC"
                    item["ai_feedback"] = "⏳ Accounts snapshot not synced yet for today."
                else:
                    m = acc.get("metrics", {})
                    month_name = m.get("latest_month_name", "October-2026")
                    col_month = m.get("latest_month_collection", 0)
                    wu_sub = m.get("work_updates_submitted_yesterday", 0)
                    wu_tot = m.get("vfm_website_users_total", 0)
                    imp_holders = m.get("current_month_imprest_active_holders", m.get("holders_with_unsettled_cash", 0))
                    imp_cash = m.get("current_month_imprest_net_balance", m.get("total_unsettled_cash_held", 0))

                    col_inr = format_inr(col_month)
                    imp_inr = format_inr(imp_cash)

                    item["ai_verified"] = True
                    item["ai_status"] = "ATTENTION_REQUIRED" if (wu_tot - wu_sub > 50) else "VERIFIED"
                    item["ai_feedback"] = (
                        f"Month Collection: {col_inr} ({month_name}) | "
                        f"Imprest Held: {imp_inr} across {imp_holders} holders | "
                        f"Portal Work Updates: {wu_sub}/{wu_tot} submitted ({wu_tot - wu_sub} pending)."
                    )

            item["ai_verified_at"] = now_iso

        save_daily_routine_document({
            "date": today_str,
            "items": self.items,
            "last_action": "AUTO_EVALUATED_SNAPSHOTS"
        })
        log_event("ROUTINE_AUTO_EVALUATED", {"date": today_str, "items_count": len(self.items)})
        return self.items

    def get_checklist(self) -> dict:
        """Returns the current day's active checklist items and overall progress."""
        today_str = datetime.now().strftime("%Y-%m-%d")
        if self.active_date != today_str:
            self._init_daily_checklist()

        # Refresh AI evaluation notes from local snapshots so they're always up to date
        self.auto_evaluate_from_local_snapshots()

        total = len(self.items)
        manual_completed = sum(1 for item in self.items if item.get("completed") or item.get("manual_verified"))
        ai_verified_count = sum(1 for item in self.items if item.get("ai_verified"))

        return {
            "date": self.active_date,
            "total_items": total,
            "completed_items": manual_completed,
            "manual_verified_count": manual_completed,
            "ai_verified_count": ai_verified_count,
            "percentage": int((manual_completed / total) * 100) if total > 0 else 0,
            "items": self.items
        }

    def update_item(self, item_id: str, completed: bool, feedback: str, updated_by: str = "Managing Director") -> dict:
        """
        Updates the tick (manual_verified / completed) status and user feedback note for a given item,
        and logs the full update immediately to today's JSONL file with updated_by tracking.
        """
        today_str = datetime.now().strftime("%Y-%m-%d")
        if self.active_date != today_str:
            self._init_daily_checklist()

        target_item = None
        for item in self.items:
            if item["id"] == item_id:
                item["completed"] = bool(completed)
                item["manual_verified"] = bool(completed)
                item["feedback"] = feedback.strip() if feedback else ""
                item["user_feedback"] = feedback.strip() if feedback else ""
                item["updated_by"] = updated_by
                item["last_updated"] = datetime.now().isoformat()
                if item["completed"] and not item.get("completed_at"):
                    item["completed_at"] = datetime.now().isoformat()
                elif not item["completed"]:
                    item["completed_at"] = None
                target_item = item
                break

        if target_item:
            # Persist the complete MongoDB-style document
            save_daily_routine_document({
                "date": today_str,
                "items": self.items,
                "last_action": f"ITEM_UPDATED_{target_item['id']}",
                "updated_by": updated_by
            })

            # Log the event into today's JSONL file
            log_event("ITEM_UPDATED", {
                "item_id": target_item["id"],
                "number": target_item["number"],
                "title": target_item["title"],
                "completed": target_item["completed"],
                "feedback": target_item["feedback"],
                "completed_at": target_item.get("completed_at"),
                "updated_by": updated_by
            }, user=updated_by)
            return {"success": True, "item": target_item}
        
        return {"success": False, "error": f"Item with id {item_id} not found."}

    def trigger_routine(self) -> dict:
        """Manually or automatically triggers the 10:30 AM routine."""
        self._init_daily_checklist(force_reset=True)
        log_event("ROUTINE_1030_TRIGGERED", {
            "time": datetime.now().isoformat(),
            "triggered_by": "System Scheduler or Manual Test"
        })
        return self.get_checklist()

# Global singleton instance
checklist_mgr = ChecklistManager()