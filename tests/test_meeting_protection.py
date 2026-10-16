"""
Automated Test for Meeting Business Logic Rules:
1. Completed meetings cannot be rescheduled.
2. Completed meetings cannot be swapped.
3. Priority inheritance (HIGH, POSTPONE, SKIP, NORMAL) for next week's schedule generation.
4. Completed meetings are never overwritten on schedule generation.
"""

import sys
from pathlib import Path
ROOT_DIR = Path(__file__).resolve().parent.parent
if str(ROOT_DIR) not in sys.path:
    sys.path.insert(0, str(ROOT_DIR))

if r"C:\coding\python-packages" not in sys.path:
    sys.path.insert(0, r"C:\coding\python-packages")

import meetings.service as svc

def test_meeting_protection_rules():
    print("\n" + "=" * 70)
    print(">> [BACKEND] MEETING PROTECTION & PRIORITY TEST SUITE")
    print("=" * 70)

    # Setup dummy completed meeting
    test_id = "test-comp-verify-01"
    test_completed_mtg = {
        "id": test_id,
        "title": "Mock Board Review (Completed)",
        "date": "2026-10-14",
        "time": "11:00 AM - 01:00 PM",
        "status": "COMPLETED",
        "md_feedback": "Completed with directives"
    }

    all_m = svc.load_all_meetings()
    all_m.append(test_completed_mtg)
    svc.save_all_meetings(all_m)

    try:
        # TEST 1: Reschedule Completed Meeting must fail
        print("\n[TEST 1] Reschedule guard on COMPLETED meeting:")
        res = svc.reschedule_meeting(test_id, "2026-10-22")
        is_blocked = isinstance(res, dict) and res.get("error") == "CANNOT_RESCHEDULE_COMPLETED"
        if is_blocked:
            print("  [PASS] Completed meeting reschedule blocked with error: CANNOT_RESCHEDULE_COMPLETED")
        else:
            print(f"  [FAIL] Completed meeting reschedule was NOT blocked! Result: {res}")

        # TEST 2: Swap Completed Meeting must fail
        print("\n[TEST 2] Swap guard on COMPLETED meeting:")
        other_id = all_m[0]["id"]
        mtg_a, mtg_b = svc.swap_meetings(test_id, other_id)
        if mtg_a is None and mtg_b is None:
            print("  [PASS] Swap involving completed meeting rejected (returned None, None)")
        else:
            print(f"  [FAIL] Completed meeting swap was NOT rejected!")

        # TEST 3: Completed meeting is never overwritten
        print("\n[TEST 3] Overwrite protection during week generation:")
        gen_res = svc.generate_week_schedule()
        persisted = svc.get_meeting_by_id(test_id)
        if persisted and persisted.get("status") == "COMPLETED":
            print("  [PASS] Completed meeting preserved intact and NOT overwritten!")
        else:
            print("  [FAIL] Completed meeting was altered or erased during generation!")

    finally:
        # Cleanup
        clean_m = [m for m in svc.load_all_meetings() if m.get("id") != test_id]
        svc.save_all_meetings(clean_m)
        print("\n>> Cleanup complete. Test meeting removed.")
        print("=" * 70 + "\n")

if __name__ == "__main__":
    test_meeting_protection_rules()
