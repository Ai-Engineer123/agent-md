"""
=============================================================================
OPERATIONS & EXECUTIVE MEETING CALENDAR SERVICE
=============================================================================
Provides month-level and day-level calendar aggregation for:
1. Daily 10:30 AM Routine Checklist Completion (Status, Progress, Verification)
2. Executive Briefings & Intelligence Archive
3. Scheduled Executive Meetings & Appointments (Modular & extensible)
"""

import json
import calendar
from datetime import datetime, date
from pathlib import Path
from typing import Optional, List, Dict, Any

from config import BASE_DIR

ROUTINES_DIR = BASE_DIR / "data" / "daily_routines"
ROUTINES_DIR.mkdir(parents=True, exist_ok=True)

AI_REPORTS_DIR = BASE_DIR / "data" / "ai_reports"
AI_REPORTS_DIR.mkdir(parents=True, exist_ok=True)

import meetings as meeting_mgr

load_all_meetings = meeting_mgr.load_all_meetings
save_all_meetings = meeting_mgr.save_all_meetings
get_meetings_for_date = meeting_mgr.get_meetings_for_date
add_or_update_meeting = meeting_mgr.add_or_update_meeting


def get_month_calendar_overview(year: int, month: int) -> Dict[str, Any]:
    """
    Generates high-performance calendar overview for a given month.
    Returns day-by-day status for checklist progress, AI executive reports, and meetings.
    """
    num_days = calendar.monthrange(year, month)[1]
    days_map = {}
    today_str = datetime.now().strftime("%Y-%m-%d")

    all_meetings = meeting_mgr.load_all_meetings()
    if not all_meetings:
        all_meetings = meeting_mgr.generate_week_schedule()
    meetings_by_date = {}
    for m in all_meetings:
        d_key = m.get("date")
        if d_key:
            meetings_by_date.setdefault(d_key, []).append(m)

    total_month_checklists_completed = 0
    total_month_checklists_active = 0
    total_month_meetings = 0

    for day in range(1, num_days + 1):
        date_str = f"{year:04d}-{month:02d}-{day:02d}"
        
        day_info = {
            "date": date_str,
            "day_number": day,
            "is_today": (date_str == today_str),
            "is_future": (date_str > today_str),
            "checklist": None,
            "has_ai_report": False,
            "meetings": meetings_by_date.get(date_str, [])
        }

        # 1. Inspect Checklist Document
        routine_file = ROUTINES_DIR / f"{date_str}.json"
        if routine_file.exists():
            try:
                with open(routine_file, "r", encoding="utf-8") as rf:
                    doc = json.load(rf)
                items = doc.get("items", [])
                total = len(items) if items else 8
                manual_count = sum(1 for it in items if it.get("completed") or it.get("manual_verified"))
                ai_count = sum(1 for it in items if it.get("ai_verified") or it.get("ai_status") in ["VERIFIED", "ATTENTION_REQUIRED"])
                verified_count = sum(1 for it in items if (it.get("completed") or it.get("manual_verified") or it.get("ai_verified") or it.get("ai_status") == "VERIFIED"))
                if verified_count == 0 and ai_count > 0:
                    verified_count = ai_count

                pct = int((verified_count / total * 100) if total else 0)
                status = "COMPLETED" if verified_count == total and total > 0 else doc.get("status", "IN_PROGRESS")

                day_info["checklist"] = {
                    "has_record": True,
                    "status": status,
                    "total_items": total,
                    "total_tasks": total,
                    "completed_items": verified_count,
                    "completed_tasks": verified_count,
                    "manual_verified_count": manual_count,
                    "ai_verified_count": ai_count,
                    "verified_count": verified_count,
                    "percentage": pct,
                    "updated_at": doc.get("updated_at")
                }
                total_month_checklists_active += 1
                if verified_count == total and total > 0:
                    total_month_checklists_completed += 1
            except Exception:
                pass

        # 2. Inspect AI Executive Report
        report_file = AI_REPORTS_DIR / f"{date_str}.json"
        if report_file.exists():
            day_info["has_ai_report"] = True

        total_month_meetings += len(day_info["meetings"])
        days_map[date_str] = day_info

    completed_meetings_count = sum(
        1 for d in days_map.values() for m in d.get("meetings", []) if m.get("status") == "COMPLETED"
    )

    return {
        "year": year,
        "month": month,
        "month_name": calendar.month_name[month],
        "days_in_month": num_days,
        "first_weekday": calendar.monthrange(year, month)[0],  # 0=Mon, 6=Sun
        "today": today_str,
        "stats": {
            "checklists_completed": total_month_checklists_completed,
            "checklists_recorded": total_month_checklists_active,
            "scheduled_meetings": total_month_meetings,
            "completed_meetings": completed_meetings_count
        },
        "days": days_map
    }


def get_calendar_day_detail(date_str: str) -> Dict[str, Any]:
    """
    Returns full granular inspection records for a single day:
    - All 8 checklist items with title, status, feedback, and AI verification
    - Scheduled meetings
    - AI Executive Summary highlights
    """
    routine_file = ROUTINES_DIR / f"{date_str}.json"
    routine_doc = None
    if routine_file.exists():
        try:
            with open(routine_file, "r", encoding="utf-8") as rf:
                routine_doc = json.load(rf)
            items = routine_doc.get("items", [])
            man_c = sum(1 for it in items if it.get("completed") or it.get("manual_verified"))
            ai_c = sum(1 for it in items if it.get("ai_verified") or it.get("ai_status") in ["VERIFIED", "ATTENTION_REQUIRED"])
            v_c = sum(1 for it in items if (it.get("completed") or it.get("manual_verified") or it.get("ai_verified") or it.get("ai_status") == "VERIFIED"))
            if v_c == 0 and ai_c > 0:
                v_c = ai_c
            routine_doc["manual_verified_count"] = man_c
            routine_doc["ai_verified_count"] = ai_c
            routine_doc["verified_count"] = v_c
            routine_doc["completed_items"] = v_c
            routine_doc["total_items"] = len(items) if items else 8
        except Exception:
            routine_doc = None

    # Load AI report snippet if exists
    ai_report = None
    report_file = AI_REPORTS_DIR / f"{date_str}.json"
    if report_file.exists():
        try:
            with open(report_file, "r", encoding="utf-8") as arf:
                ai_data = json.load(arf)
                ai_report = {
                    "date": ai_data.get("report_date"),
                    "generated_at": ai_data.get("generated_at"),
                    "model": ai_data.get("model"),
                    "raw_summary": (ai_data.get("raw_summary") or "")[:400] + "..." if ai_data.get("raw_summary") else ""
                }
        except Exception:
            pass

    meetings = get_meetings_for_date(date_str)

    return {
        "date": date_str,
        "formatted_date": datetime.strptime(date_str, "%Y-%m-%d").strftime("%A, %d %B %Y"),
        "has_routine": routine_doc is not None,
        "routine": routine_doc,
        "meetings": meetings,
        "ai_report": ai_report
    }
