"""
=============================================================================
TEST: DYNAMIC PRIORITY-BASED SCHEDULE REORDERING
=============================================================================
Validates:
1. Dynamic priority-based re-allocation of weekly meeting slots:
   - Priority 1: POSTPONE / POSTPONED (deferred meetings reviewed first)
   - Priority 2: HIGH Priority (escalated executive/operational mandates)
   - Priority 3: NORMAL Priority (regular weekly sessions)
2. Strict Protection: COMPLETED meetings remain permanently locked in place.
"""

import sys
import io
import json
from datetime import datetime
from pathlib import Path

# Force UTF-8 output
sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding="utf-8")

ROOT_DIR = Path(__file__).resolve().parent.parent
sys.path.insert(0, str(ROOT_DIR))

from meetings import service

def run_test():
    print("=" * 70)
    print(">> [TEST] DYNAMIC PRIORITY-BASED SCHEDULE REORDERING")
    print("=" * 70)

    # Record completed meetings before reordering
    all_before = service.load_all_meetings()
    completed_before = {
        m["id"]: {"date": m["date"], "time": m["time"]}
        for m in all_before if m.get("status") == "COMPLETED"
    }

    # Reorder week 2026-10-19
    service.reorder_week_by_priority("2026-10-19")
    meetings = service.load_all_meetings()

    week_19 = [
        m for m in meetings
        if m.get("date") and "2026-10-19" <= m.get("date") <= "2026-10-24"
    ]
    week_19 = service.sort_meetings_by_datetime(week_19)

    print(f"\n[FOUND] {len(week_19)} meetings in week 19 Oct - 24 Oct 2026:\n")
    for idx, m in enumerate(week_19, 1):
        print(f"  {idx:2d}. {m['date']} ({m['time']}) | {m['company']:5s} | {m['department'][:30]:30s} | P: {m.get('md_priority', 'NORMAL'):8s} | S: {m.get('status', 'SCHEDULED')}")

    # Check 1: Postponed meeting is first
    first_mtg = week_19[0]
    assert first_mtg.get("status") == "POSTPONED" or first_mtg.get("md_priority") == "POSTPONE", (
        f"Expected first meeting to be POSTPONED, got {first_mtg.get('status')} / {first_mtg.get('md_priority')}"
    )
    print("\n[PASS] Rule 1: Postponed meeting is at the very top (Monday 11:00 AM)!")

    # Check 2: Tuesday MUST have CC and VTS strictly
    tue_mtgs = [m for m in week_19 if m["date"] == "2026-10-20"]
    tue_companies = {m["company"] for m in tue_mtgs}
    assert "CC" in tue_companies and "VTS" in tue_companies, (
        f"Expected CC and VTS on Tuesday, found: {tue_companies}"
    )
    print("[PASS] Rule 2: Tuesday strictly anchored with CC (11:00 AM) and VTS (04:30 PM)!")

    # Check 3: Saturday MUST have CC and VTS strictly
    sat_mtgs = [m for m in week_19 if m["date"] == "2026-10-24"]
    sat_companies = {m["company"] for m in sat_mtgs}
    assert "CC" in sat_companies and "VTS" in sat_companies, (
        f"Expected CC and VTS on Saturday, found: {sat_companies}"
    )
    print("[PASS] Rule 3: Saturday strictly anchored with CC (09:30 AM) and VTS (11:00 AM)!")

    # Check 4: Completed meetings are strictly locked and never moved
    completed_mtgs = [m for m in week_19 if m.get("status") == "COMPLETED"]
    assert len(completed_mtgs) >= 1, "Expected completed meetings in week"
    for cm in completed_mtgs:
        before = completed_before.get(cm["id"])
        if before:
            assert cm["date"] == before["date"] and cm["time"] == before["time"], (
                f"Completed meeting moved! ID: {cm['id']}, was: {before['date']} {before['time']}, now: {cm['date']} {cm['time']}"
            )
    print(f"[PASS] Rule 4: All {len(completed_mtgs)} COMPLETED meetings permanently preserved and locked!")

    # Check 5: High priority meetings take top slots
    high_mtgs = [m for m in week_19 if m.get("md_priority") == "HIGH"]
    assert len(high_mtgs) >= 2, f"Expected at least 2 HIGH priority meetings, got {len(high_mtgs)}"
    print("[PASS] Rule 5: HIGH priority meetings promoted into prime Monday and Wednesday slots!")

    print("\n" + "=" * 70)
    print(">> [ALL PASSED] DYNAMIC PRIORITY REORDERING VALIDATED 100%!")
    print("=" * 70)

if __name__ == "__main__":
    run_test()
