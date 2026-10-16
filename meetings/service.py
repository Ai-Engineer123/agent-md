"""
=============================================================================
MEETINGS SERVICE (DYNAMIC WEEKLY ENGINE - ZERO REMOTE DB)
=============================================================================
Manages executive meeting schedules, department topics checklists, MD directives,
and dynamic weekly planning based on MD priorities.

Key Features:
- Week-by-Week Dynamic Generation (Mon, Tue, Wed, Sat 11 AM - 6 PM)
- End-of-Meeting "Next Week Priority" (High, Normal, Postpone, Skip) & directives
- Rescheduling: Postpone, Prepone, Time Adjust with audit history
- Swap: Swap schedule slots between two meetings
- Flexible Monthly OM & FM Meeting (Starts 8:00 AM on chosen Saturday)
- Stores all state purely in local JSON (data/meetings/meetings.json)
"""

import json
import os
import re
import calendar
import threading
import time
import logging
from datetime import datetime, date, timedelta
from pathlib import Path
from typing import List, Dict, Any, Optional, Tuple

from config import BASE_DIR
from .constants import (
    COMPANIES_CONFIG,
    ALLOWED_WEEKDAYS,
    VFM_ADMIN_HR_TOPICS,
    VFM_ACCOUNTS_TOPICS,
    VFM_OPERATIONS_GM_AGM_TOPICS
)

MEETINGS_DIR = BASE_DIR / "data" / "meetings"
MEETINGS_DIR.mkdir(parents=True, exist_ok=True)
MEETINGS_FILE = MEETINGS_DIR / "meetings.json"
COMMON_AGENDA_FILE = MEETINGS_DIR / "common_agenda.json"


# ---------------------------------------------------------------------------
# MEETING SPECIFIC AGENDA TOPICS (PURE MEETING ISOLATION - ZERO COMMON)
# ---------------------------------------------------------------------------

def load_common_agenda() -> List[Dict[str, Any]]:
    """Deprecated: Common agenda concept erased per MD directive."""
    return []


def save_common_agenda(items: List[Dict[str, Any]]) -> bool:
    """Deprecated: Common agenda concept erased per MD directive."""
    return True


def add_common_agenda_item(title: str, scope: str = "Specific") -> Dict[str, Any]:
    """Deprecated: Common agenda concept erased per MD directive."""
    return {"id": f"top_{int(datetime.now().timestamp())}", "title": title.strip()}


def delete_common_agenda_item(item_id: str, title: Optional[str] = None) -> bool:
    """Deprecated: Common agenda concept erased per MD directive."""
    return True


def get_effective_meeting_topics(meeting_id: str, meeting_obj: Optional[Dict[str, Any]] = None) -> List[Dict[str, Any]]:
    """
    Returns the topics specific to this meeting only.
    Zero common agenda injection or cross-meeting bleeding.
    """
    m = meeting_obj or get_meeting_by_id(meeting_id) or {}
    raw_topics = list(m.get("topics") or [])

    effective = []
    seen_ids = set()

    for t in raw_topics:
        t_id = t.get("id")
        t_title = t.get("title", "").strip()
        if not t_title or t_id in seen_ids:
            continue
        effective.append({
            "id": t_id,
            "title": t_title,
            "completed": bool(t.get("completed", False)),
            "notes": t.get("notes", "")
        })
        seen_ids.add(t_id)

    return effective


# ---------------------------------------------------------------------------
# DYNAMIC MEETING TOPICS (ADD, EDIT, DELETE - STRICTLY FOR THIS MEETING ONLY)
# ---------------------------------------------------------------------------

def add_topic_to_meeting(meeting_id: str, title: str, scope: str = "Specific", is_common: bool = False, created_by: str = "Managing Director") -> Optional[Dict[str, Any]]:
    """Allows MD or EA to add a topic specifically for this meeting."""
    meetings = load_all_meetings()
    for m in meetings:
        if m.get("id") == meeting_id:
            clean_title = title.strip()
            raw_topics = list(m.get("topics") or [])
            t_id = f"top_{int(datetime.now().timestamp())}_{len(raw_topics) + 1}"

            new_top = {
                "id": t_id,
                "title": clean_title,
                "completed": False,
                "notes": "",
                "created_by": created_by
            }
            raw_topics.append(new_top)
            m["topics"] = raw_topics
            m["has_topics"] = True
            m["updated_by"] = created_by
            m["updated_at"] = datetime.now().isoformat()
            save_all_meetings(meetings)

            m_copy = dict(m)
            m_copy["topics"] = get_effective_meeting_topics(meeting_id, m)
            return m_copy
    return None


def update_topic_in_meeting(
    meeting_id: str,
    topic_id: str,
    title: Optional[str] = None,
    scope: Optional[str] = None,
    completed: Optional[bool] = None,
    notes: Optional[str] = None,
    is_common: Optional[bool] = None,
    updated_by: str = "Managing Director"
) -> Optional[Dict[str, Any]]:
    """Allows MD or EA to edit an existing topic in this meeting only."""
    meetings = load_all_meetings()
    for m in meetings:
        if m.get("id") == meeting_id:
            raw_topics = list(m.get("topics") or [])
            for t in raw_topics:
                if t.get("id") == topic_id:
                    if title is not None:
                        t["title"] = title.strip()
                    if completed is not None:
                        t["completed"] = bool(completed)
                    if notes is not None:
                        t["notes"] = notes.strip()
                    t["updated_by"] = updated_by
                    break

            m["topics"] = raw_topics
            m["has_topics"] = len(raw_topics) > 0
            m["updated_by"] = updated_by
            m["updated_at"] = datetime.now().isoformat()
            save_all_meetings(meetings)

            m_copy = dict(m)
            m_copy["topics"] = get_effective_meeting_topics(meeting_id, m)
            return m_copy
    return None


def delete_topic_from_meeting(meeting_id: str, topic_id: str) -> Optional[Dict[str, Any]]:
    """Allows MD to delete an agenda topic from this meeting only."""
    meetings = load_all_meetings()
    target_meeting = None

    for m in meetings:
        if m.get("id") == meeting_id:
            target_meeting = m
            raw_topics = list(m.get("topics") or [])
            new_topics = [t for t in raw_topics if t.get("id") != topic_id]
            m["topics"] = new_topics
            m["has_topics"] = len(new_topics) > 0
            m["updated_at"] = datetime.now().isoformat()
            break

    if target_meeting:
        save_all_meetings(meetings)
        m_copy = dict(target_meeting)
        m_copy["topics"] = get_effective_meeting_topics(meeting_id, target_meeting)
        return m_copy
    return None


def apply_common_agenda_to_meeting(meeting_id: str) -> Optional[Dict[str, Any]]:
    """Deprecated: Common agenda concept erased per MD directive."""
    return get_meeting_by_id(meeting_id)


# ---------------------------------------------------------------------------
# STORAGE ACCESS (READ/WRITE LOCAL JSON)
# ---------------------------------------------------------------------------

def parse_meeting_start_minutes(time_str: str) -> int:
    """
    Parses meeting time window string (e.g. '11:00 AM - 01:00 PM', '03:30 PM')
    into minutes from midnight (0..1439) for true 24-hour chronological ordering.
    """
    if not time_str or not isinstance(time_str, str):
        return 0
    m = re.search(r"(\d{1,2}):(\d{2})\s*(AM|PM)", time_str, re.IGNORECASE)
    if not m:
        return 0
    hr = int(m.group(1))
    mn = int(m.group(2))
    mer = m.group(3).upper()
    if mer == "PM" and hr < 12:
        hr += 12
    elif mer == "AM" and hr == 12:
        hr = 0
    return hr * 60 + mn


def sort_meetings_by_datetime(meetings: List[Dict[str, Any]]) -> List[Dict[str, Any]]:
    """
    Sorts meetings strictly in chronological order by Date (YYYY-MM-DD)
    and then Start Time (24-hr minutes from midnight).
    """
    return sorted(
        meetings,
        key=lambda m: (
            m.get("date", "") or "",
            parse_meeting_start_minutes(m.get("time", ""))
        )
    )


_meetings_lock = threading.RLock()
_in_memory_meetings_cache: Optional[List[Dict[str, Any]]] = None


def load_all_meetings() -> List[Dict[str, Any]]:
    """Loads all scheduled executive meetings from local storage with thread safety and transient retry."""
    global _in_memory_meetings_cache

    with _meetings_lock:
        if not MEETINGS_FILE.exists():
            return _in_memory_meetings_cache or []

        # Retry up to 3 times to prevent transient Windows file-lock / write collisions
        for attempt in range(3):
            try:
                with open(MEETINGS_FILE, "r", encoding="utf-8") as f:
                    data = json.load(f)
                    if isinstance(data, list) and len(data) > 0:
                        sorted_list = sort_meetings_by_datetime(data)
                        _in_memory_meetings_cache = sorted_list
                        return sorted_list
                    elif isinstance(data, list) and len(data) == 0:
                        if _in_memory_meetings_cache and len(_in_memory_meetings_cache) > 0:
                            return _in_memory_meetings_cache
                        return []
            except (json.JSONDecodeError, PermissionError, OSError):
                time.sleep(0.04)
            except Exception:
                break

        if _in_memory_meetings_cache and len(_in_memory_meetings_cache) > 0:
            return _in_memory_meetings_cache

        return []


def save_all_meetings(meetings: List[Dict[str, Any]]) -> bool:
    """Saves meetings list safely using atomic replace and thread locking."""
    global _in_memory_meetings_cache

    with _meetings_lock:
        if not meetings and _in_memory_meetings_cache and len(_in_memory_meetings_cache) > 0:
            return False

        try:
            sorted_meetings = sort_meetings_by_datetime(meetings)
            _in_memory_meetings_cache = sorted_meetings

            temp_file = MEETINGS_FILE.with_suffix(".json.tmp")
            with open(temp_file, "w", encoding="utf-8") as f:
                json.dump(sorted_meetings, f, indent=2, ensure_ascii=False)
                f.flush()
                os.fsync(f.fileno())

            temp_file.replace(MEETINGS_FILE)
            return True
        except Exception:
            try:
                with open(MEETINGS_FILE, "w", encoding="utf-8") as f:
                    json.dump(sorted_meetings, f, indent=2, ensure_ascii=False)
                return True
            except Exception:
                return False


def get_meetings_for_date(date_str: str) -> List[Dict[str, Any]]:
    """Returns meetings scheduled on a specific date, sorted chronologically by time."""
    all_meetings = load_all_meetings()
    day_meetings = [m for m in all_meetings if m.get("date") == date_str]
    return sort_meetings_by_datetime(day_meetings)


def get_meeting_by_id(meeting_id: str) -> Optional[Dict[str, Any]]:
    """Finds a specific meeting by ID."""
    all_meetings = load_all_meetings()
    for m in all_meetings:
        if m.get("id") == meeting_id:
            return m
    return None


def add_or_update_meeting(meeting: Dict[str, Any]) -> Dict[str, Any]:
    """Adds a new meeting or updates an existing one."""
    meetings = load_all_meetings()
    if not meeting.get("id"):
        meeting["id"] = f"mtg-{int(datetime.now().timestamp())}"
    if not meeting.get("created_at"):
        meeting["created_at"] = datetime.now().isoformat()
    meeting["updated_at"] = datetime.now().isoformat()

    found = False
    for i, m in enumerate(meetings):
        if m.get("id") == meeting.get("id"):
            meetings[i] = meeting
            found = True
            break
    if not found:
        meetings.append(meeting)

    save_all_meetings(meetings)
    return meeting


# ---------------------------------------------------------------------------
# FEEDBACK & MD DIRECTIVES / NEXT WEEK PRIORITY
# ---------------------------------------------------------------------------

def update_meeting_feedback_and_topics(
    meeting_id: str,
    md_feedback: Optional[str] = None,
    topics_progress: Optional[List[Dict[str, Any]]] = None,
    status: Optional[str] = None,
    md_priority: Optional[str] = None,
    md_priority_notes: Optional[str] = None,
    next_meeting_queries: Optional[List[Any]] = None,
    first_to_ask: Optional[List[Any]] = None,
    updated_by: Optional[str] = None
) -> Optional[Dict[str, Any]]:
    """
    Updates MD feedback, topic items completion status, meeting state,
    and the crucial MD Next-Week Priority directive.
    Tracks updated_by user identity.
    """
    meetings = load_all_meetings()
    target_meeting = None

    for m in meetings:
        if m.get("id") == meeting_id:
            if md_feedback is not None:
                m["md_feedback"] = md_feedback.strip()
                m["notes"] = md_feedback.strip()
            if status is not None:
                m["status"] = status
            if md_priority is not None:
                m["md_priority"] = md_priority.strip().upper()
            if md_priority_notes is not None:
                m["md_priority_notes"] = md_priority_notes.strip()

            if topics_progress is not None:
                existing_topics = m.get("topics", [])
                existing_map = {t.get("id"): t for t in existing_topics if t.get("id")}
                synced_topics = []
                for idx, item in enumerate(topics_progress, 1):
                    t_id = item.get("id") or f"top_{int(datetime.now().timestamp())}_{idx}"
                    old = existing_map.get(t_id, {})
                    synced_topics.append({
                        "id": t_id,
                        "title": item.get("title", old.get("title", "")).strip(),
                        "scope": item.get("scope", old.get("scope", "Specific")).strip(),
                        "completed": bool(item.get("completed", old.get("completed", False))),
                        "is_common": bool(item.get("is_common", old.get("is_common", False))),
                        "notes": item.get("notes", old.get("notes", ""))
                    })
                m["topics"] = synced_topics
                m["has_topics"] = len(synced_topics) > 0

            if next_meeting_queries is not None:
                m["next_meeting_queries"] = next_meeting_queries
            if first_to_ask is not None:
                m["first_to_ask"] = first_to_ask
            if updated_by:
                m["updated_by"] = updated_by

            m["updated_at"] = datetime.now().isoformat()
            target_meeting = m
            break

    if target_meeting:
        save_all_meetings(meetings)
        # Dynamically cascade priority to upcoming week's schedule
        if md_priority:
            try:
                curr_d = datetime.strptime(target_meeting.get("date", ""), "%Y-%m-%d").date()
                curr_mon = curr_d - timedelta(days=curr_d.weekday())
                next_mon_str = (curr_mon + timedelta(days=7)).strftime("%Y-%m-%d")
                generate_week_schedule(week_start_date=next_mon_str)
                reorder_week_by_priority(next_mon_str)
            except Exception:
                pass

        m_copy = dict(target_meeting)
        m_copy["topics"] = get_effective_meeting_topics(meeting_id, target_meeting)
        return m_copy
    return None


def get_meeting_dossier(meeting_id: str) -> Optional[Dict[str, Any]]:
    """
    Returns full executive dossier for a meeting:
    - current meeting details
    - previous meeting history for the same company/department (date < current date)
    - previous MD directives and feedback
    - previous completed/pending agenda topics
    - opening queries to ask first (from previous meeting)
    """
    meetings = load_all_meetings()
    target = None
    for m in meetings:
        if m.get("id") == meeting_id:
            target = m
            break
    if not target:
        return None

    curr_date = target.get("date", "")
    curr_company = target.get("company", "")
    curr_dept = target.get("department", "")
    curr_title = target.get("title", "")

    past_meetings = []
    for m in meetings:
        if m.get("id") == meeting_id:
            continue
        match = (m.get("company") == curr_company) and (
            (curr_dept and m.get("department") == curr_dept) or
            (curr_title and m.get("title") == curr_title)
        )
        if match and m.get("date", "") < curr_date:
            past_meetings.append(m)

    past_meetings.sort(key=lambda x: x.get("date", ""), reverse=True)
    previous_meeting = past_meetings[0] if past_meetings else None

    # Construct "First to Ask" questions from previous meeting or target
    first_to_ask = []
    if target.get("first_to_ask"):
        first_to_ask = target.get("first_to_ask")
    elif previous_meeting:
        if previous_meeting.get("md_priority_notes"):
            first_to_ask.append({
                "id": "q_priority",
                "question": previous_meeting.get("md_priority_notes"),
                "source": f"Priority Directive from {previous_meeting.get('date')}",
                "resolved": False
            })
        for idx, q in enumerate(previous_meeting.get("next_meeting_queries", [])):
            first_to_ask.append({
                "id": f"q_{idx+1}",
                "question": q if isinstance(q, str) else q.get("question", ""),
                "source": f"Direct Action Item from {previous_meeting.get('date')}",
                "resolved": q.get("resolved", False) if isinstance(q, dict) else False
            })
        if previous_meeting.get("topics"):
            incomplete = [t for t in previous_meeting.get("topics", []) if not t.get("completed")]
            for t in incomplete[:3]:
                first_to_ask.append({
                    "id": f"topic_{t.get('id')}",
                    "question": f"Pending Topic: {t.get('title')}",
                    "source": f"Carry forward from {previous_meeting.get('date')}",
                    "resolved": False
                })

    target_copy = dict(target)
    target_copy["topics"] = get_effective_meeting_topics(meeting_id, target)

    return {
        "meeting": target_copy,
        "previous_meeting": previous_meeting,
        "first_to_ask": first_to_ask
    }


# ---------------------------------------------------------------------------
# RESCHEDULING ENGINE (POSTPONE, PREPONE, TIME CHANGE, SWAP)
# ---------------------------------------------------------------------------

def reschedule_meeting(
    meeting_id: str,
    new_date: str,
    new_time: Optional[str] = None,
    reason: Optional[str] = None,
    reschedule_om_fm: bool = False,
    updated_by: Optional[str] = None,
    actor: Optional[str] = None
) -> Optional[Dict[str, Any]]:
    """
    Reschedules a meeting to a new date and/or time.
    Automatically classifies into POSTPONED, PREPONED, or TIME_ADJUSTED
    and maintains an audit trail with actor identity.
    If reschedule_om_fm is True, also syncs the OM & FM Assembly to match.
    """
    meetings = load_all_meetings()
    target_meeting = None

    for m in meetings:
        if m.get("id") == meeting_id:
            # STRICT GUARD: Completed meetings are historically locked and cannot be rescheduled!
            if m.get("status") == "COMPLETED":
                return {"error": "CANNOT_RESCHEDULE_COMPLETED", "message": "Cannot reschedule a completed meeting. Historical records are locked."}

            old_date = m.get("date")
            old_time = m.get("time")
            effective_time = new_time if new_time else old_time

            # Classify action
            if new_date > old_date:
                action = "POSTPONED"
            elif new_date < old_date:
                action = "PREPONED"
            else:
                action = "TIME_ADJUSTED"

            # Record history
            if "reschedule_history" not in m or not isinstance(m["reschedule_history"], list):
                m["reschedule_history"] = []

            effective_actor = actor or updated_by or "Managing Director"
            m["reschedule_history"].append({
                "action": action,
                "from_date": old_date,
                "from_time": old_time,
                "to_date": new_date,
                "to_time": effective_time,
                "reason": reason or f"Rescheduled via MD Desk as {action.lower()}",
                "rescheduled_by": effective_actor,
                "timestamp": datetime.now().isoformat()
            })

            m["date"] = new_date
            m["time"] = effective_time
            m["status"] = action
            m["updated_by"] = effective_actor
            m["updated_at"] = datetime.now().isoformat()
            target_meeting = m
            break

    # If reschedule_om_fm is True, cascade to the OM & FM meeting
    if target_meeting and reschedule_om_fm:
        try:
            ndt = datetime.strptime(new_date, "%Y-%m-%d").date()
            # Calculate Saturday of that week (weekday 5)
            sat_offset = (5 - ndt.weekday())
            target_sat = (ndt + timedelta(days=sat_offset)).strftime("%Y-%m-%d")
        except Exception:
            target_sat = new_date

        for om in meetings:
            if (om.get("is_monthly") or "om-fm" in om.get("id", "").lower()) and om.get("id") != meeting_id:
                om_old_date = om.get("date")
                om["date"] = target_sat
                om["status"] = "POSTPONED" if target_sat > om_old_date else "PREPONED"
                om.setdefault("reschedule_history", []).append({
                    "action": "OM_FM_CASCADE_RESCHEDULE",
                    "from_date": om_old_date,
                    "to_date": target_sat,
                    "reason": f"Cascaded reschedule with '{target_meeting.get('title')}' by MD order",
                    "timestamp": datetime.now().isoformat()
                })
                om["updated_at"] = datetime.now().isoformat()

    if target_meeting:
        save_all_meetings(meetings)
    return target_meeting


def swap_meetings(
    meeting_id_a: str,
    meeting_id_b: str,
    reason: Optional[str] = None,
    actor: str = "Managing Director"
) -> Tuple[Optional[Dict[str, Any]], Optional[Dict[str, Any]]]:
    """
    Swaps date and time slots between Meeting A and Meeting B.
    Both meetings have their status updated to SWAPPED with audit logs and updated_by actor.
    """
    meetings = load_all_meetings()
    mtg_a = None
    mtg_b = None

    for m in meetings:
        if m.get("id") == meeting_id_a:
            mtg_a = m
        elif m.get("id") == meeting_id_b:
            mtg_b = m

    if not mtg_a or not mtg_b:
        return None, None

    # STRICT GUARD: Completed meetings are historically locked and cannot be swapped!
    if mtg_a.get("status") == "COMPLETED" or mtg_b.get("status") == "COMPLETED":
        return None, None

    date_a, time_a = mtg_a.get("date"), mtg_a.get("time")
    date_b, time_b = mtg_b.get("date"), mtg_b.get("time")

    # Swap dates and times
    mtg_a["date"], mtg_a["time"] = date_b, time_b
    mtg_b["date"], mtg_b["time"] = date_a, time_a

    # Maintain history
    now_iso = datetime.now().isoformat()
    mtg_a.setdefault("reschedule_history", []).append({
        "action": "SWAPPED",
        "swapped_with_id": mtg_b["id"],
        "swapped_with_title": mtg_b.get("title"),
        "from_date": date_a,
        "from_time": time_a,
        "to_date": date_b,
        "to_time": time_b,
        "reason": reason or f"Swapped with '{mtg_b.get('title')}'",
        "swapped_by": actor,
        "timestamp": now_iso
    })
    mtg_b.setdefault("reschedule_history", []).append({
        "action": "SWAPPED",
        "swapped_with_id": mtg_a["id"],
        "swapped_with_title": mtg_a.get("title"),
        "from_date": date_b,
        "from_time": time_b,
        "to_date": date_a,
        "to_time": time_a,
        "reason": reason or f"Swapped with '{mtg_a.get('title')}'",
        "swapped_by": actor,
        "timestamp": now_iso
    })

    mtg_a["status"] = "SWAPPED"
    mtg_b["status"] = "SWAPPED"
    mtg_a["updated_by"] = actor
    mtg_b["updated_by"] = actor
    mtg_a["updated_at"] = now_iso
    mtg_b["updated_at"] = now_iso

    save_all_meetings(meetings)
    return mtg_a, mtg_b


# ---------------------------------------------------------------------------
# FLEXIBLE MONTHLY OM & FM ASSEMBLY SCHEDULER
# ---------------------------------------------------------------------------

HALF_DAY_ASSEMBLY_TIME = "08:00 AM - 01:00 PM (Half Day)"


def schedule_monthly_om_fm_meeting(
    target_date: str,
    time: str = HALF_DAY_ASSEMBLY_TIME,
    location: str = "Main Assembly Hall / Head Office Boardroom"
) -> Dict[str, Any]:
    """
    Schedules the special monthly VFM OM & FM Half-Day Assembly (08:00 AM - 01:00 PM).
    Since the exact date is decided dynamically by MD, this can be triggered on-demand
    for any Saturday.
    Automatically shifts CC and VTS on that Saturday to afternoon to prevent timing collisions!
    """
    meeting_id = f"mtg-{target_date}-vfm-monthly-om-fm"
    existing = get_meeting_by_id(meeting_id)
    if existing:
        existing["date"] = target_date
        existing["time"] = time
        existing["type"] = "Monthly Half-Day Assembly"
        existing["is_half_day"] = True
        existing["is_monthly"] = True
        mtg_result = add_or_update_meeting(existing)
    else:
        meeting_obj = {
            "id": meeting_id,
            "date": target_date,
            "company": "VFMS",
            "company_name": "Vipras Facility Management",
            "department": "Operations (OM & FM)",
            "title": "VFMS — Monthly Operations Managers (OM) & Facility Managers (FM) Half-Day Assembly",
            "time": time,
            "type": "Monthly Half-Day Assembly",
            "location": location,
            "status": "SCHEDULED",
            "has_topics": False,
            "topics": [],
            "is_monthly": True,
            "is_half_day": True,
            "duration": "5 Hours (Half Day)",
            "md_priority": "HIGH",
            "md_feedback": "",
            "created_at": datetime.now().isoformat()
        }
        mtg_result = add_or_update_meeting(meeting_obj)

    # Shift CC and VTS on target_date to afternoon to eliminate clash
    all_meetings = load_all_meetings()
    for m in all_meetings:
        if m.get("date") == target_date:
            if m.get("company") == "CC":
                m["time"] = "02:00 PM - 03:30 PM"
            elif m.get("company") == "VTS":
                m["time"] = "03:30 PM - 05:30 PM"
    save_all_meetings(all_meetings)

    return mtg_result


# ---------------------------------------------------------------------------
# DYNAMIC WEEKLY SCHEDULE GENERATOR
# ---------------------------------------------------------------------------

def get_week_monday(reference_date: Optional[str] = None) -> date:
    """Calculates Monday date for the given date (default today)."""
    if reference_date:
        dt = datetime.strptime(reference_date, "%Y-%m-%d").date()
    else:
        dt = date.today()
    return dt - timedelta(days=dt.weekday())


def generate_week_schedule(
    week_start_date: Optional[str] = None,
    force: bool = False
) -> List[Dict[str, Any]]:
    """
    Generates the master schedule for a SINGLE WEEK (Monday, Tuesday, Wednesday, Saturday).
    Checks previous week's meetings to inherit MD priorities and carry-over directives.

    Schedule Matrix:
    - Monday:
      * 11:00 AM - 01:00 PM: VFM Administrative & HR (18 topics)
      * 03:00 PM - 04:30 PM: VFM Business Development
    - Tuesday:
      * 11:00 AM - 12:30 PM: City Coolies (CC) Bi-weekly
      * 02:00 PM - 04:00 PM: VFM Accounts (13 topics)
      * 04:30 PM - 06:00 PM: VTS (GG, AI) Bi-weekly
    - Wednesday:
      * 11:00 AM - 01:30 PM: VFM Operations (Facility & Security) (10 topics)
      * 02:00 PM - 03:30 PM: Profox Weekly Review
      * 03:30 PM - 05:00 PM: VFM Management Review
    - Saturday (First half only):
      * 09:30 AM - 11:00 AM: City Coolies (CC) Bi-weekly
      * 11:00 AM - 01:00 PM: VTS (GG, AI) Bi-weekly
    """
    mon_dt = get_week_monday(week_start_date)
    existing_meetings = load_all_meetings()
    existing_ids = {m.get("id") for m in existing_meetings}

    # Inspect prior week (Monday - 7 days) to find MD priorities set
    prior_mon_dt = mon_dt - timedelta(days=7)
    prior_week_str = prior_mon_dt.strftime("%Y-%m-%d")
    prior_week_priorities = {}
    for m in existing_meetings:
        if m.get("date") and m.get("date") >= prior_week_str and m.get("date") < mon_dt.strftime("%Y-%m-%d"):
            dept_key = (m.get("company", ""), m.get("department", ""))
            if m.get("md_priority"):
                prior_week_priorities[dept_key] = {
                    "priority": m.get("md_priority"),
                    "notes": m.get("md_priority_notes") or ""
                }

    # Dates of the active week
    mon_str = mon_dt.strftime("%Y-%m-%d")
    tue_str = (mon_dt + timedelta(days=1)).strftime("%Y-%m-%d")
    wed_str = (mon_dt + timedelta(days=2)).strftime("%Y-%m-%d")
    sat_str = (mon_dt + timedelta(days=5)).strftime("%Y-%m-%d")

    new_meetings = []

    # Helper to inherit priority & determine status for upcoming week
    def get_inherited(company, dept):
        k = (company, dept)
        item = prior_week_priorities.get(k, {"priority": "NORMAL", "notes": ""})
        p = (item.get("priority") or "NORMAL").upper()
        status = "SCHEDULED"
        if p == "POSTPONE":
            status = "POSTPONED"
        elif p == "SKIP":
            status = "SKIPPED"
        return {
            "priority": p,
            "notes": item.get("notes", ""),
            "status": status
        }

    existing_map = {m.get("id"): m for m in existing_meetings if m.get("id")}

    def register_meeting(m_dict, inh):
        m_id = m_dict["id"]
        if m_id in existing_map:
            ex = existing_map[m_id]
            # STRICT GUARD: If already completed, NEVER alter it!
            if ex.get("status") == "COMPLETED":
                return
            # If untouched placeholder without MD feedback, update priority & status
            if not ex.get("md_feedback"):
                ex["md_priority"] = inh["priority"]
                ex["md_priority_notes"] = inh["notes"]
                ex["status"] = inh["status"]
                ex["updated_at"] = datetime.now().isoformat()
        else:
            existing_map[m_id] = m_dict

    # -----------------------------------------------------------------------
    # 1. MONDAY
    # -----------------------------------------------------------------------
    # Mon A: VFM Administrative & HR
    m_id = f"mtg-{mon_str}-vfm-admin-hr"
    inh = get_inherited("VFMS", "Administrative & HR")
    register_meeting({
        "id": m_id,
        "date": mon_str,
        "company": "VFMS",
        "company_name": "Vipras Facility Management",
        "department": "Administrative & HR",
        "title": "VFMS — Administrative & HR Weekly Review",
        "time": "11:00 AM - 01:00 PM",
        "type": "Department Review",
        "location": "Head Office Boardroom",
        "status": inh["status"],
        "has_topics": False,
        "topics": [],
        "md_priority": inh["priority"],
        "md_priority_notes": inh["notes"],
        "md_feedback": "",
        "created_at": datetime.now().isoformat()
    }, inh)

    # Mon B: VFM Business Development
    m_id = f"mtg-{mon_str}-vfm-bd"
    inh = get_inherited("VFMS", "Business Development")
    register_meeting({
        "id": m_id,
        "date": mon_str,
        "company": "VFMS",
        "company_name": "Vipras Facility Management",
        "department": "Business Development",
        "title": "VFMS — Business Development & Pipeline Review",
        "time": "03:00 PM - 04:30 PM",
        "type": "Department Review",
        "location": "Head Office Boardroom",
        "status": inh["status"],
        "has_topics": False,
        "topics": [],
        "md_priority": inh["priority"],
        "md_priority_notes": inh["notes"],
        "md_feedback": "",
        "created_at": datetime.now().isoformat()
    }, inh)

    # -----------------------------------------------------------------------
    # 2. TUESDAY
    # -----------------------------------------------------------------------
    # Tue A: City Coolies (CC)
    m_id = f"mtg-{tue_str}-cc"
    inh = get_inherited("CC", "Operations & Service")
    register_meeting({
        "id": m_id,
        "date": tue_str,
        "company": "CC",
        "company_name": "City Coolies",
        "department": "Operations & Service",
        "title": "City Coolies (CC) — Bi-weekly Review",
        "time": "11:00 AM - 12:30 PM",
        "type": "Company Review",
        "location": "Head Office / Online",
        "status": inh["status"],
        "has_topics": False,
        "topics": [],
        "md_priority": inh["priority"],
        "md_priority_notes": inh["notes"],
        "md_feedback": "",
        "created_at": datetime.now().isoformat()
    }, inh)

    # Tue B: VFM Accounts
    m_id = f"mtg-{tue_str}-vfm-accounts"
    inh = get_inherited("VFMS", "Accounts")
    register_meeting({
        "id": m_id,
        "date": tue_str,
        "company": "VFMS",
        "company_name": "Vipras Facility Management",
        "department": "Accounts",
        "title": "VFMS — Accounts Governance & Audit",
        "time": "02:00 PM - 04:00 PM",
        "type": "Department Review",
        "location": "Head Office Boardroom",
        "status": inh["status"],
        "has_topics": False,
        "topics": [],
        "md_priority": inh["priority"],
        "md_priority_notes": inh["notes"],
        "md_feedback": "",
        "created_at": datetime.now().isoformat()
    }, inh)

    # Tue C: VTS (GG, AI)
    m_id = f"mtg-{tue_str}-vts"
    inh = get_inherited("VTS", "Tech (GG & AI Teams)")
    register_meeting({
        "id": m_id,
        "date": tue_str,
        "company": "VTS",
        "company_name": "Vipras Tech Solutions",
        "department": "Tech (GG & AI Teams)",
        "title": "VTS Tech Solutions — GG & AI Review",
        "time": "04:30 PM - 06:00 PM",
        "type": "Company Review",
        "location": "Tech Lab / Online",
        "status": inh["status"],
        "has_topics": False,
        "topics": [],
        "sub_teams": ["GG", "AI"],
        "md_priority": inh["priority"],
        "md_priority_notes": inh["notes"],
        "md_feedback": "",
        "created_at": datetime.now().isoformat()
    }, inh)

    # -----------------------------------------------------------------------
    # 3. WEDNESDAY
    # -----------------------------------------------------------------------
    # Wed A: VFM Operations (Facility & Security)
    m_id = f"mtg-{wed_str}-vfm-ops"
    inh = get_inherited("VFMS", "Operations (Facility & Security)")
    register_meeting({
        "id": m_id,
        "date": wed_str,
        "company": "VFMS",
        "company_name": "Vipras Facility Management",
        "department": "Operations (Facility & Security)",
        "title": "VFMS — Operations (Facility & Security) Review",
        "time": "11:00 AM - 01:30 PM",
        "type": "Department Review",
        "location": "Head Office Boardroom",
        "status": inh["status"],
        "has_topics": False,
        "topics": [],
        "md_priority": inh["priority"],
        "md_priority_notes": inh["notes"],
        "md_feedback": "",
        "created_at": datetime.now().isoformat()
    }, inh)

    # Wed B: Profox Weekly
    m_id = f"mtg-{wed_str}-profox"
    inh = get_inherited("Profox", "Operations")
    register_meeting({
        "id": m_id,
        "date": wed_str,
        "company": "Profox",
        "company_name": "Profox",
        "department": "Operations",
        "title": "Profox — Weekly Operations Review",
        "time": "02:00 PM - 03:30 PM",
        "type": "Company Review",
        "location": "Head Office / Online",
        "status": inh["status"],
        "has_topics": False,
        "topics": [],
        "md_priority": inh["priority"],
        "md_priority_notes": inh["notes"],
        "md_feedback": "",
        "created_at": datetime.now().isoformat()
    }, inh)

    # Wed C: VFM Management
    m_id = f"mtg-{wed_str}-vfm-management"
    inh = get_inherited("VFMS", "Management")
    register_meeting({
        "id": m_id,
        "date": wed_str,
        "company": "VFMS",
        "company_name": "Vipras Facility Management",
        "department": "Management",
        "title": "VFMS — Management Review & Strategy",
        "time": "03:30 PM - 05:00 PM",
        "type": "Executive Review",
        "location": "Head Office Boardroom",
        "status": inh["status"],
        "has_topics": False,
        "topics": [],
        "md_priority": inh["priority"],
        "md_priority_notes": inh["notes"],
        "md_feedback": "",
        "created_at": datetime.now().isoformat()
    }, inh)

    # -----------------------------------------------------------------------
    # 4. SATURDAY (Regular Weekly Schedule: CC and VTS)
    # -----------------------------------------------------------------------
    # Sat A: CC Saturday
    m_id = f"mtg-{sat_str}-cc"
    inh = get_inherited("CC", "Operations & Service")
    register_meeting({
        "id": m_id,
        "date": sat_str,
        "company": "CC",
        "company_name": "City Coolies",
        "department": "Operations & Service",
        "title": "City Coolies (CC) — Saturday Review",
        "time": "09:30 AM - 11:00 AM",
        "type": "Company Review",
        "location": "Head Office / Online",
        "status": inh["status"],
        "has_topics": False,
        "topics": [],
        "md_priority": inh["priority"],
        "md_priority_notes": inh["notes"],
        "md_feedback": "",
        "created_at": datetime.now().isoformat()
    }, inh)

    # Sat B: VTS Saturday
    m_id = f"mtg-{sat_str}-vts"
    inh = get_inherited("VTS", "Tech (GG & AI Teams)")
    register_meeting({
        "id": m_id,
        "date": sat_str,
        "company": "VTS",
        "company_name": "Vipras Tech Solutions",
        "department": "Tech (GG & AI Teams)",
        "title": "VTS Tech Solutions — Saturday Demo & Sprint",
        "time": "11:00 AM - 01:00 PM",
        "type": "Company Review",
        "location": "Tech Lab / Online",
        "status": inh["status"],
        "has_topics": False,
        "topics": [],
        "sub_teams": ["GG", "AI"],
        "md_priority": inh["priority"],
        "md_priority_notes": inh["notes"],
        "md_feedback": "",
        "created_at": datetime.now().isoformat()
    }, inh)

    save_all_meetings(list(existing_map.values()))
    reorder_week_by_priority(mon_str)
    return load_all_meetings()


def reorder_week_by_priority(week_start_date: Optional[str] = None) -> List[Dict[str, Any]]:
    """
    Dynamically reorganizes upcoming uncompleted meetings in the week strictly by priority
    while strictly preserving mandatory company cadence:
    1. ANCHORED COMPANY DAYS: CC and VTS are guaranteed every Tuesday and every Saturday.
       - Tuesday:  CC (11:00 AM - 12:30 PM), VTS (04:30 PM - 06:00 PM)
       - Saturday: CC (09:30 AM - 11:00 AM), VTS (11:00 AM - 01:00 PM)
    2. STRICT COMPLETION LOCK: Completed meetings remain permanently locked in place.
    3. FLEXIBLE DEPARTMENT SLOTS (VFMS & Profox):
       - Priority 1: POSTPONE / POSTPONED (deferred reviews placed first on Monday morning)
       - Priority 2: HIGH Priority (escalated executive/operational mandates in prime slots)
       - Priority 3: NORMAL Priority (standard weekly department reviews)
    """
    mon_dt = get_week_monday(week_start_date)
    mon_str = mon_dt.strftime("%Y-%m-%d")
    tue_str = (mon_dt + timedelta(days=1)).strftime("%Y-%m-%d")
    wed_str = (mon_dt + timedelta(days=2)).strftime("%Y-%m-%d")
    sat_str = (mon_dt + timedelta(days=5)).strftime("%Y-%m-%d")

    all_meetings = load_all_meetings()

    # Find meetings in this week (Mon..Sat)
    week_meetings = [
        m for m in all_meetings
        if m.get("date") and mon_str <= m.get("date") <= sat_str
    ]

    if not week_meetings:
        return all_meetings

    # Check if there is an OM & FM Assembly on Saturday
    has_assembly = any(
        m.get("date") == sat_str and (m.get("is_monthly") or "om-fm" in m.get("id", "").lower())
        for m in all_meetings
    )

    sat_slot_1 = "02:00 PM - 03:30 PM" if has_assembly else "09:30 AM - 11:00 AM"
    sat_slot_2 = "03:30 PM - 05:30 PM" if has_assembly else "11:00 AM - 01:00 PM"

    # Identify anchored CC & VTS meetings for Tuesday & Saturday
    tue_cc = next((m for m in week_meetings if m.get("company") == "CC" and "saturday" not in m.get("title", "").lower() and "sat" not in m.get("id", "").lower()), None)
    sat_cc = next((m for m in week_meetings if m.get("company") == "CC" and m != tue_cc), None)

    tue_vts = next((m for m in week_meetings if m.get("company") == "VTS" and "saturday" not in m.get("title", "").lower() and "sat" not in m.get("id", "").lower()), None)
    sat_vts = next((m for m in week_meetings if m.get("company") == "VTS" and m != tue_vts), None)

    anchored_map = {}
    if tue_cc: anchored_map[tue_cc["id"]] = (tue_str, "11:00 AM - 12:30 PM")
    if tue_vts: anchored_map[tue_vts["id"]] = (tue_str, "04:30 PM - 06:00 PM")
    if sat_cc: anchored_map[sat_cc["id"]] = (sat_str, sat_slot_1)
    if sat_vts: anchored_map[sat_vts["id"]] = (sat_str, sat_slot_2)

    # Completed meetings are strictly locked
    completed_meetings = [m for m in week_meetings if m.get("status") == "COMPLETED"]
    completed_ids = {m["id"] for m in completed_meetings}

    # Apply anchored Tuesday & Saturday slots to CC and VTS
    for m in week_meetings:
        if m["id"] in anchored_map and m["id"] not in completed_ids:
            d, t = anchored_map[m["id"]]
            m["date"] = d
            m["time"] = t
            p = (m.get("md_priority") or "").upper()
            if p == "POSTPONE":
                m["status"] = "POSTPONED"
            elif p == "SKIP":
                m["status"] = "SKIPPED"
            elif m.get("status") not in ("COMPLETED", "POSTPONED", "SKIPPED"):
                m["status"] = "SCHEDULED"
            m["updated_at"] = datetime.now().isoformat()

    # Identify remaining flexible departmental meetings (VFMS & Profox)
    flexible_meetings = [
        m for m in week_meetings
        if m["id"] not in anchored_map and m["id"] not in completed_ids
    ]

    occupied_slots = {
        (m["date"], m["time"]) for m in week_meetings
        if m["id"] in anchored_map or m["id"] in completed_ids
    }

    standard_flexible_slots = [
        (mon_str, "11:00 AM - 01:00 PM"),
        (mon_str, "03:00 PM - 04:30 PM"),
        (tue_str, "02:00 PM - 04:00 PM"),
        (wed_str, "11:00 AM - 01:30 PM"),
        (wed_str, "02:00 PM - 03:30 PM"),
        (wed_str, "03:30 PM - 05:00 PM"),
    ]

    available_flex_slots = [s for s in standard_flexible_slots if s not in occupied_slots]

    def priority_sort_key(m):
        p = (m.get("md_priority") or "").upper()
        st = (m.get("status") or "").upper()
        # Postponed first!
        if p == "POSTPONE" or st == "POSTPONED":
            return (0, m.get("title", ""))
        # High priority next!
        if p == "HIGH":
            return (1, m.get("title", ""))
        # Normal priority
        if p == "NORMAL" or st == "SCHEDULED":
            return (2, m.get("title", ""))
        # Skip
        if p == "SKIP" or st == "SKIPPED":
            return (3, m.get("title", ""))
        return (2, m.get("title", ""))

    flexible_meetings.sort(key=priority_sort_key)

    for (d, t), m in zip(available_flex_slots, flexible_meetings):
        m["date"] = d
        m["time"] = t
        p = (m.get("md_priority") or "").upper()
        if p == "POSTPONE":
            m["status"] = "POSTPONED"
        elif p == "SKIP":
            m["status"] = "SKIPPED"
        elif m.get("status") not in ("COMPLETED", "POSTPONED", "SKIPPED"):
            m["status"] = "SCHEDULED"
        m["updated_at"] = datetime.now().isoformat()

    save_all_meetings(all_meetings)
    return load_all_meetings()




# ---------------------------------------------------------------------------
# CLEANUP & BACKWARD COMPATIBILITY
# ---------------------------------------------------------------------------

def prune_to_active_week(current_week_monday: Optional[str] = None) -> List[Dict[str, Any]]:
    """
    Cleans up bloated 31-day auto-generated dummy meetings and retains only
    the current active week plus any meetings with actual MD feedback.
    """
    mon_dt = get_week_monday(current_week_monday)
    mon_str = mon_dt.strftime("%Y-%m-%d")
    sat_str = (mon_dt + timedelta(days=5)).strftime("%Y-%m-%d")

    all_meetings = load_all_meetings()
    pruned = []
    for m in all_meetings:
        d = m.get("date", "")
        has_user_work = bool(m.get("md_feedback") or m.get("md_priority") or any(t.get("completed") for t in m.get("topics", [])))
        # Keep if within current week or if MD has logged work
        if (mon_str <= d <= sat_str) or has_user_work:
            pruned.append(m)

    save_all_meetings(pruned)
    return pruned


def generate_standard_month_schedule(year: int, month: int) -> List[Dict[str, Any]]:
    """
    Backward-compatible entry point. Ensures full month is generated.
    """
    return ensure_month_scheduled(year, month)


# ---------------------------------------------------------------------------
# FULL MONTH AUTOMATIC SCHEDULER & BREAKDOWN
# ---------------------------------------------------------------------------

def ensure_month_scheduled(year: int, month: int, force: bool = False) -> List[Dict[str, Any]]:
    """
    Ensures that meetings for all weeks across the entire month are pre-scheduled.
    At the start of the month, all weeks (Mon, Tue, Wed, Sat) are generated in advance.
    - CC and VTS MUST appear on every Tuesday and every Saturday.
    - Exactly ONE Monthly OM & FM Half-Day Assembly (08:00 AM - 01:00 PM) is scheduled
      on a designated Saturday (default 1st Saturday of the month).
    - On that Monthly Assembly Saturday, CC and VTS are adjusted to 02:00 PM - 03:30 PM
      and 03:30 PM - 05:30 PM so there is ZERO timing collision!
    - On all other Saturdays, CC is 09:30 AM - 11:00 AM and VTS is 11:00 AM - 01:00 PM.
    - Any duplicate OM & FM meetings on non-assembly Saturdays are removed.
    """
    cal = calendar.monthcalendar(year, month)
    mon_dates = set()
    saturdays_in_month = []

    for week_days in cal:
        valid_days = [d for d in week_days if d != 0]
        if not valid_days:
            continue
        first_d = date(year, month, valid_days[0])
        mon_d = first_d - timedelta(days=first_d.weekday())
        mon_dates.add(mon_d.strftime("%Y-%m-%d"))

        # Find Saturday in this month
        if week_days[5] != 0:
            saturdays_in_month.append(f"{year:04d}-{month:02d}-{week_days[5]:02d}")

    # 1. Generate regular weekly schedules (Tuesday CC & VTS, Saturday CC & VTS)
    for mon_str in sorted(list(mon_dates)):
        generate_week_schedule(week_start_date=mon_str, force=force)

    # 2. Re-load meetings and resolve OM & FM and Saturday timings
    meetings = load_all_meetings()
    month_prefix = f"{year:04d}-{month:02d}"

    # Determine designated assembly Saturday
    assembly_date = None
    for m in meetings:
        d = m.get("date", "")
        if d.startswith(month_prefix) and (m.get("is_monthly") or "om-fm" in m.get("id", "").lower()):
            assembly_date = d
            break

    if not assembly_date and saturdays_in_month:
        assembly_date = saturdays_in_month[0]

    # Clean up duplicate OM & FM meetings, keeping only ONE per month
    cleaned_meetings = []
    primary_assembly_found = False

    for m in meetings:
        d = m.get("date", "")
        is_om_fm = m.get("is_monthly") or "om-fm" in m.get("id", "").lower()

        if d.startswith(month_prefix) and is_om_fm:
            if d == assembly_date and not primary_assembly_found:
                m["time"] = HALF_DAY_ASSEMBLY_TIME
                m["type"] = "Monthly Half-Day Assembly"
                m["is_half_day"] = True
                m["is_monthly"] = True
                m["duration"] = "5 Hours (Half Day)"
                m["title"] = "VFMS — Monthly Operations Managers (OM) & Facility Managers (FM) Half-Day Assembly"
                m["company"] = "VFMS"
                cleaned_meetings.append(m)
                primary_assembly_found = True
            else:
                # Remove duplicate OM & FM meetings from other Saturdays
                continue
        else:
            cleaned_meetings.append(m)

    # If no assembly existed, create the single monthly assembly
    if not primary_assembly_found and assembly_date:
        assembly_obj = {
            "id": f"mtg-{assembly_date}-vfm-om-fm",
            "date": assembly_date,
            "company": "VFMS",
            "company_name": "Vipras Facility Management",
            "department": "Operations (OM & FM)",
            "title": "VFMS — Monthly Operations Managers (OM) & Facility Managers (FM) Half-Day Assembly",
            "time": HALF_DAY_ASSEMBLY_TIME,
            "type": "Monthly Half-Day Assembly",
            "location": "Main Assembly Hall / Head Office Boardroom",
            "status": "SCHEDULED",
            "has_topics": False,
            "topics": [],
            "is_monthly": True,
            "is_half_day": True,
            "duration": "5 Hours (Half Day)",
            "md_priority": "HIGH",
            "md_priority_notes": "Monthly Operations Review",
            "md_feedback": "",
            "created_at": datetime.now().isoformat()
        }
        cleaned_meetings.append(assembly_obj)

    # 3. Synchronize Saturday timings: ZERO clash!
    for m in cleaned_meetings:
        d = m.get("date", "")
        if d.startswith(month_prefix):
            c = m.get("company", "")
            if d == assembly_date:
                # On the monthly assembly Saturday, CC and VTS run in afternoon (no overlap with 08:00 AM - 01:00 PM)
                if c == "CC":
                    m["time"] = "02:00 PM - 03:30 PM"
                elif c == "VTS":
                    m["time"] = "03:30 PM - 05:30 PM"
            elif d in saturdays_in_month:
                # On regular Saturdays, CC and VTS run in standard morning slots
                if c == "CC":
                    m["time"] = "09:30 AM - 11:00 AM"
                elif c == "VTS":
                    m["time"] = "11:00 AM - 01:00 PM"

    save_all_meetings(cleaned_meetings)
    return cleaned_meetings


def get_month_meetings_breakdown(year: int, month: int) -> Dict[str, Any]:
    """
    Returns full structured breakdown for a specific month:
    - Month metadata (name, total meetings count)
    - Monthly Half-Day OM & FM Assembly spotlight record
    - Week-by-week aggregated lists (Week 1..5) with dates, totals, and meeting lists
    - All meetings list for the month
    """
    ensure_month_scheduled(year, month)
    all_meetings = load_all_meetings()

    month_prefix = f"{year:04d}-{month:02d}"
    month_meetings = [m for m in all_meetings if m.get("date", "").startswith(month_prefix)]
    month_meetings = sort_meetings_by_datetime(month_meetings)

    cal = calendar.monthcalendar(year, month)
    weeks = []
    today_str = datetime.now().strftime("%Y-%m-%d")

    monthly_assembly = None
    for m in month_meetings:
        if m.get("is_monthly") or m.get("is_half_day") or "om-fm" in m.get("id", "").lower():
            monthly_assembly = m
            break

    for idx, week_days in enumerate(cal, 1):
        valid_days = [d for d in week_days if d != 0]
        if not valid_days:
            continue
        first_d = date(year, month, valid_days[0])
        mon_d = first_d - timedelta(days=first_d.weekday())
        sat_d = mon_d + timedelta(days=5)
        mon_str = mon_d.strftime("%Y-%m-%d")
        sat_str = sat_d.strftime("%Y-%m-%d")

        # Meetings in this week within the month (sorted chronologically)
        wtg = [m for m in month_meetings if mon_str <= m.get("date", "") <= sat_str]
        wtg = sort_meetings_by_datetime(wtg)
        is_current = mon_str <= today_str <= sat_str

        weeks.append({
            "week_index": idx,
            "label": f"Week {idx}",
            "date_range": f"{mon_d.strftime('%d %b')} – {sat_d.strftime('%d %b %Y')}",
            "monday": mon_str,
            "saturday": sat_str,
            "is_current": is_current,
            "total_meetings": len(wtg),
            "meetings": wtg
        })

    month_name = date(year, month, 1).strftime("%B %Y")
    return {
        "year": year,
        "month": month,
        "month_name": month_name,
        "total_meetings": len(month_meetings),
        "total_weeks": len(weeks),
        "monthly_assembly": monthly_assembly,
        "weeks": weeks,
        "all_meetings": month_meetings
    }
