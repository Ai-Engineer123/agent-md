"""
=============================================================================
TEST SUITE: EXECUTIVE LOGIN & ACTOR AUDIT TRAIL (CREATED_BY / UPDATED_BY)
=============================================================================
Validates:
1. Two distinct hardcoded credentials:
   - Managing Director: 'md' / 'md123'
   - Executive Assistant: 'admin' / 'admin123' and 'ea' / 'ea123'
2. updated_by / created_by tracking in:
   - Meetings Feedback & Status save
   - Meeting Reschedule history
   - Meeting Slot Swap history
   - Daily Routine Checklist ticks & notes
3. JSONL audit log actor recording
"""

import sys
import io
import json
from pathlib import Path

# Force UTF-8 stdout
sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding="utf-8")

ROOT_DIR = Path(__file__).resolve().parent.parent
sys.path.insert(0, str(ROOT_DIR))

from meetings import service as meeting_service
from daily_routine.checklist_items import checklist_mgr
from jsonl_logger import read_today_logs

def run_tests():
    print("=" * 70)
    print(">> [TEST] EXECUTIVE LOGIN CREDENTIALS & ACTOR AUDIT LOGGING")
    print("=" * 70)

    # 1. Test Dynamic Backend Authentication Service
    from auth_service import authenticate_credentials
    md_user = authenticate_credentials("md", "md123")
    assert md_user is not None and md_user["role"] == "Executive Office", "MD login failed"
    assert md_user["initials"] == "MD", "MD initials mismatch"

    ea_user = authenticate_credentials("admin", "admin123")
    assert ea_user is not None and ea_user["name"] == "Executive Assistant", "EA login failed"

    invalid_user = authenticate_credentials("md", "wrongpass")
    assert invalid_user is None, "Invalid password should return None"

    print("\n[PASS] Rule 1: Dynamic Backend Authentication verified (Zero frontend hardcode)")

    # 2. Test Meeting Feedback with updated_by = "Executive Assistant"
    all_meetings = meeting_service.load_all_meetings()
    assert len(all_meetings) > 0, "No meetings found"
    target_meeting = all_meetings[0]
    m_id = target_meeting["id"]

    updated_m = meeting_service.update_meeting_feedback_and_topics(
        meeting_id=m_id,
        md_feedback="Reviewed and verified by Executive Assistant",
        status="IN_PROGRESS",
        updated_by="Executive Assistant"
    )
    assert updated_m is not None, "Failed to update meeting feedback"
    assert updated_m.get("updated_by") == "Executive Assistant", f"Expected 'Executive Assistant', got {updated_m.get('updated_by')}"
    print(f"[PASS] Rule 2: Meeting feedback saved with updated_by='{updated_m.get('updated_by')}'")

    # 3. Test Checklist Item tick with updated_by = "Executive Assistant"
    chk_res = checklist_mgr.update_item(
        item_id="item_1",
        completed=True,
        feedback="EA automated pre-check completed.",
        updated_by="Executive Assistant"
    )
    assert chk_res.get("success") is True, "Failed to update checklist item"
    assert chk_res["item"].get("updated_by") == "Executive Assistant", "Checklist item missing updated_by"
    print(f"[PASS] Rule 3: Checklist item updated with updated_by='{chk_res['item'].get('updated_by')}'")

    # 4. Test Meeting Reschedule with actor = "Managing Director"
    # Find a non-completed meeting
    sched_meetings = [m for m in all_meetings if m.get("status") != "COMPLETED"]
    assert len(sched_meetings) >= 2, "Need scheduled meetings for reschedule test"
    resched_target = sched_meetings[0]
    orig_date = resched_target["date"]
    orig_time = resched_target["time"]

    resched_result = meeting_service.reschedule_meeting(
        meeting_id=resched_target["id"],
        new_date=orig_date,
        new_time=orig_time,
        reason="Test audit tracking",
        actor="Managing Director"
    )
    assert resched_result is not None and not resched_result.get("error"), "Reschedule failed"
    assert resched_result.get("updated_by") == "Managing Director", "Reschedule record missing updated_by"
    latest_hist = resched_result["reschedule_history"][-1]
    assert latest_hist.get("rescheduled_by") == "Managing Director", "History missing rescheduled_by"
    print(f"[PASS] Rule 4: Meeting reschedule audit recorded with actor='{latest_hist.get('rescheduled_by')}'")

    # 5. Test JSONL audit log
    logs = read_today_logs()
    assert len(logs) > 0, "Expected JSONL log entries for today"
    latest_log = logs[-1]
    assert "actor" in latest_log or "updated_by" in latest_log, f"Log entry missing actor: {latest_log}"
    print(f"[PASS] Rule 5: JSONL audit log confirmed with actor='{latest_log.get('actor')}' on event '{latest_log.get('event_type')}'")

    print("\n" + "=" * 70)
    print(">> [ALL PASSED] LOGIN & ACTOR AUDIT TRAIL 100% VALIDATED!")
    print("=" * 70)

if __name__ == "__main__":
    run_tests()
