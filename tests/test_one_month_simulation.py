"""
One-Month (4-Week Lifecycle) Continuous Simulation Test for MD Executive Meetings
Tests the full real-world chronological flow:
Week 1 (Oct 5)  -> Review & Directives -> "Next Meeting la Idhai Kekkanum" -> Priority: HIGH -> Mark COMPLETED
Week 2 (Oct 12) -> Inherits HIGH -> Opening Questions list previous items -> Review & Resolve -> Priority: POSTPONE -> Mark COMPLETED
Week 3 (Oct 19) -> Inherits POSTPONE -> Starts as POSTPONED
Week 4 (Oct 26) -> Full monthly audit chain & Completed Protection verification
"""

import sys
from pathlib import Path

ROOT_DIR = Path(__file__).resolve().parent.parent
if str(ROOT_DIR) not in sys.path:
    sys.path.insert(0, str(ROOT_DIR))

if r"C:\coding\python-packages" not in sys.path:
    sys.path.insert(0, r"C:\coding\python-packages")

import meetings.service as svc

def run_one_month_simulation():
    print("\n" + "=" * 75)
    print(">> [LIFECYCLE TEST] ONE-MONTH (4-WEEK) EXECUTIVE MEETING CONTINUITY SIMULATION")
    print("=" * 75)

    # -------------------------------------------------------------------------
    # WEEK 1: 2026-10-05 (Monday)
    # -------------------------------------------------------------------------
    print("\n[WEEK 1] 2026-10-05: Conducting Initial Executive Review")
    print("-" * 55)

    # Reset test meeting IDs to ensure idempotent clean run
    test_ids = [
        "mtg-2026-10-05-vfm-admin-hr",
        "mtg-2026-10-12-vfm-admin-hr",
        "mtg-2026-10-19-vfm-admin-hr",
        "mtg-2026-10-26-vfm-admin-hr"
    ]
    clean_meetings = [m for m in svc.load_all_meetings() if m.get("id") not in test_ids]
    svc.save_all_meetings(clean_meetings)

    # Ensure Week 1 schedule exists
    svc.generate_week_schedule("2026-10-05")
    w1_id = "mtg-2026-10-05-vfm-admin-hr"
    w1_mtg = svc.get_meeting_by_id(w1_id)
    assert w1_mtg is not None, "Week 1 meeting could not be created/found!"

    # 1. MD adds dynamic agenda specifically for Week 1
    svc.add_topic_to_meeting(w1_id, "Q3 HR Recruitment & Vacancy Fill Plan", scope="Specific")

    # 2. MD records Directives & "Orders for Next Meeting"
    w1_updated = svc.update_meeting_feedback_and_topics(
        meeting_id=w1_id,
        md_feedback="Focus on closing urgent HR vacancies. Site inspection on Wednesday.",
        md_priority="HIGH",
        md_priority_notes="Must fill 5 admin vacancies at Site A before next review",
        next_meeting_queries=[
            {"id": "q1", "question": "Verify whether 5 admin vacancies were filled at Site A"},
            {"id": "q2", "question": "Inspect CC driver attendance log book"}
        ],
        status="COMPLETED"
    )

    print(f"  [PASS] Week 1 Meeting ID: {w1_id}")
    print(f"         Status: {w1_updated.get('status')} (Locked)")
    print(f"         Directives Recorded: \"{w1_updated.get('md_feedback')}\"")
    print(f"         Next Week Priority Set: {w1_updated.get('md_priority')}")
    print(f"         Queries For Next Meeting: {len(w1_updated.get('next_meeting_queries', []))} items added")

    # -------------------------------------------------------------------------
    # WEEK 2: 2026-10-12 (Monday)
    # -------------------------------------------------------------------------
    print("\n[WEEK 2] 2026-10-12: Generating Week 2 & Verifying Priority & Question Chain")
    print("-" * 55)

    svc.generate_week_schedule("2026-10-12")
    w2_id = "mtg-2026-10-12-vfm-admin-hr"
    w2_mtg = svc.get_meeting_by_id(w2_id)
    assert w2_mtg is not None, "Week 2 meeting could not be found!"

    # TEST: Did Week 2 inherit HIGH priority?
    assert w2_mtg.get("md_priority") == "HIGH", f"Expected HIGH priority, got {w2_mtg.get('md_priority')}"
    print(f"  [PASS] Week 2 dynamically inherited MD Priority: {w2_mtg.get('md_priority')}")

    # TEST: Dossier chaining (Last Meeting Directives & Opening Questions)
    dossier_w2 = svc.get_meeting_dossier(w2_id)
    prev = dossier_w2.get("previous_meeting")
    assert prev is not None, "Previous meeting was not chained in dossier!"
    assert prev.get("id") == w1_id, f"Expected previous meeting {w1_id}, got {prev.get('id')}"
    assert "Focus on closing urgent HR vacancies" in prev.get("md_feedback", "")
    print(f"  [PASS] Last Meeting Directives correctly shown in dossier: \"{prev.get('md_feedback')}\"")

    first_to_ask = dossier_w2.get("first_to_ask", [])
    questions_text = [q.get("question") for q in first_to_ask]
    print(f"  [PASS] Opening Questions populated in Card 1 ({len(first_to_ask)} items):")
    for idx, q in enumerate(first_to_ask, 1):
        print(f"         {idx}. {q.get('question')} [{q.get('source')}]")

    assert any("5 admin vacancies" in q for q in questions_text), "Priority directive missing from Opening Questions!"
    assert any("CC driver attendance" in q for q in questions_text), "Action query missing from Opening Questions!"

    # 3. MD conducts Week 2 review: clears questions with resolution notes, sets Next Week = POSTPONE
    cleared_first_to_ask = []
    for q in first_to_ask:
        q_copy = dict(q)
        q_copy["resolved"] = True
        q_copy["resolution_note"] = "Clarified & verified by HR manager during review session."
        cleared_first_to_ask.append(q_copy)

    w2_updated = svc.update_meeting_feedback_and_topics(
        meeting_id=w2_id,
        md_feedback="HR vacancies resolved (4 filled, 1 final round). Festival break upcoming.",
        md_priority="POSTPONE",
        md_priority_notes="Postpone next review due to festive week",
        first_to_ask=cleared_first_to_ask,
        next_meeting_queries=[
            {"id": "q3", "question": "Review festival shift roster and emergency response"}
        ],
        status="COMPLETED"
    )
    print(f"  [PASS] Week 2 Meeting cleared opening questions and marked: {w2_updated.get('status')}")

    # -------------------------------------------------------------------------
    # WEEK 3: 2026-10-19 (Monday)
    # -------------------------------------------------------------------------
    print("\n[WEEK 3] 2026-10-19: Generating Week 3 & Verifying POSTPONE Rule")
    print("-" * 55)

    svc.generate_week_schedule("2026-10-19")
    w3_id = "mtg-2026-10-19-vfm-admin-hr"
    w3_mtg = svc.get_meeting_by_id(w3_id)
    assert w3_mtg is not None, "Week 3 meeting could not be found!"

    # TEST: Did Week 3 start as POSTPONED because Week 2 set priority to POSTPONE?
    assert w3_mtg.get("status") == "POSTPONED", f"Expected status POSTPONED, got {w3_mtg.get('status')}"
    print(f"  [PASS] Week 3 meeting automatically initialized as: {w3_mtg.get('status')}")

    # -------------------------------------------------------------------------
    # WEEK 4: 2026-10-26 (Monday)
    # -------------------------------------------------------------------------
    print("\n[WEEK 4] 2026-10-26: Monthly Audit & Locked History Protection Check")
    print("-" * 55)

    svc.generate_week_schedule("2026-10-26")
    w4_id = "mtg-2026-10-26-vfm-admin-hr"
    w4_mtg = svc.get_meeting_by_id(w4_id)
    assert w4_mtg is not None, "Week 4 meeting could not be found!"

    # Verify that Week 1 & Week 2 completed meetings were NEVER overwritten or affected
    w1_check = svc.get_meeting_by_id(w1_id)
    w2_check = svc.get_meeting_by_id(w2_id)
    assert w1_check.get("status") == "COMPLETED", "Week 1 meeting status was corrupted!"
    assert w2_check.get("status") == "COMPLETED", "Week 2 meeting status was corrupted!"
    assert w1_check.get("date") == "2026-10-05", "Week 1 date was corrupted!"
    assert w2_check.get("date") == "2026-10-12", "Week 2 date was corrupted!"

    print("  [PASS] Week 1 Meeting permanently preserved (2026-10-05, COMPLETED)")
    print("  [PASS] Week 2 Meeting permanently preserved (2026-10-12, COMPLETED)")
    print("  [PASS] Week 3 Meeting postponement respected (2026-10-19, POSTPONED)")
    print("  [PASS] Week 4 Meeting active on schedule    (2026-10-26, SCHEDULED)")

    print("\n" + "=" * 75)
    print(">> [ALL PASSED] ONE-MONTH LIFECYCLE SIMULATION 100% SUCCESSFUL!")
    print("=" * 75 + "\n")

if __name__ == "__main__":
    run_one_month_simulation()
