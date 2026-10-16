"""
=============================================================================
LOCAL DB SYNC ENGINE (STRICTLY READ-ONLY ORCHESTRATOR)
=============================================================================
Orchestrates task-wise synchronization of remote MongoDB data into
local_db/<current_date>/ JSON snapshots.

The task handlers are modularized under `daily_routine/sync_tasks/`:
- task_1_checkin.py    -> sync_task_1_user_checkin
- task_3_attendance.py -> sync_task_3_head_office_attendance, sync_task_3_company_incharges
- task_5_accounts.py   -> sync_task_5_accounts
- task_6_tickets.py    -> sync_task_6_tickets
- task_7_dmr.py        -> sync_task_7_dmr
- task_8_plan.py       -> sync_task_8_52_weeks_plan

Usage:
    python sync_local_db.py
    python -m daily_routine.sync_local_db
"""

import sys
from pathlib import Path

ROOT_DIR = Path(__file__).resolve().parent.parent
if str(ROOT_DIR) not in sys.path:
    sys.path.insert(0, str(ROOT_DIR))

if r"C:\coding\python-packages" not in sys.path:
    sys.path.insert(0, r"C:\coding\python-packages")

from datetime import datetime
import pymongo
from config import MONGODB_URI, VTS_MONGODB_URI

# Re-export all task-wise sync handlers and configurations for 100% backward compatibility
from .sync_tasks import (
    LOCAL_DB_DIR,
    TARGET_EMPLOYEE_NUMBER,
    get_current_date_dir,
    clean_for_json,
    sync_task_1_user_checkin,
    COMPANY_INCHARGES_CONFIG,
    sync_task_3_head_office_attendance,
    sync_task_3_company_incharges,
    sync_task_5_accounts,
    clean_html_text,
    sync_task_6_tickets,
    sync_task_7_dmr,
    sync_task_8_52_weeks_plan
)

def run_sync():
    """
    Main orchestration function:
    Connects to MongoDB instances (strictly READ-ONLY) and executes all task syncs sequentially.
    """
    now = datetime.now()
    print("=" * 60)
    print("LOCAL DB SYNC STARTING (STRICTLY READ-ONLY)")
    print(f"Target Date: {now.strftime('%Y-%m-%d')}")
    print(f"Target Employee Number: {TARGET_EMPLOYEE_NUMBER}")
    print("=" * 60)

    # Connect to MongoDB instances (Strictly Read-Only)
    primary_client = pymongo.MongoClient(MONGODB_URI)
    vts_client = pymongo.MongoClient(VTS_MONGODB_URI)

    try:
        # 1. Sync Task 1: Admin Check-in
        task1_result = sync_task_1_user_checkin(primary_client, TARGET_EMPLOYEE_NUMBER)
        print("\n--- Task 1 Result ---")
        print(f"Checked In Today : {task1_result['checked_in']}")
        print(f"Employee Name    : {task1_result.get('employee_name')}")
        if task1_result['checked_in']:
            print(f"Check-in Time    : {task1_result.get('check_in_time')}")
            print(f"Site             : {task1_result.get('site')}")
        else:
            print(f"Status           : {task1_result.get('status')}")
            print(f"Last Known Check : {task1_result.get('last_known_checkin')}")

        # 2. Sync Task 3: Head Office Staff Attendance & Leave Audit
        task3_ho = sync_task_3_head_office_attendance(primary_client)
        print("\n--- Task 3 (Head Office) Result ---")
        print(f"Site             : {task3_ho['site_name']} ({task3_ho['site_code']})")
        print(f"Total Staff      : {task3_ho['total_staff']}")
        print(f"Present Today    : {task3_ho['present_count']}")
        print(f"On Leave Today   : {task3_ho.get('on_leave_count', 0)}")
        print(f"Not Checked In   : {task3_ho['not_checked_in_count']}")

        # 3. Sync Task 3: Company In-charges Attendance & Leave Audit
        task3_inc = sync_task_3_company_incharges(primary_client, vts_client)
        print("\n--- Task 3 (Company In-charges) Result ---")
        print(f"Total Companies  : {task3_inc['metrics']['total_companies']}")
        print(f"Total Incharges  : {task3_inc['metrics']['total_incharges']}")
        print(f"Present Today    : {task3_inc['metrics']['total_present']}")
        print(f"On Leave Today   : {task3_inc['metrics']['total_on_leave']}")
        print(f"Not Checked In   : {task3_inc['metrics']['total_not_checked_in']}")

        # 4. Sync Task 5: Accounts, Collections & Imprest Balances
        task5_acc = sync_task_5_accounts(primary_client)
        print("\n--- Task 5 (Accounts & Imprest) Result ---")
        print(f"Latest Month ({task5_acc['metrics']['latest_month_name']}) Collection: Rs {task5_acc['metrics']['latest_month_collection']:,.2f}")
        print(f"All-Time Cumulative Collections : Rs {task5_acc['metrics']['total_collections_all_time']:,.2f}")
        print(f"Current Month Imprest Net Held  : Rs {task5_acc['metrics'].get('current_month_imprest_net_balance', 0):,.2f}")
        print(f"Holders Holding Unsettled Cash  : {task5_acc['metrics']['holders_with_unsettled_cash']}")
        print(f"Total Unsettled Cash Held       : Rs {task5_acc['metrics']['total_unsettled_cash_held']:,.2f}")
        print(f"VFM Website Access Users        : {task5_acc['metrics']['vfm_website_users_total']}")
        print(f"Yesterday Work Updates Submitted: {task5_acc['metrics']['work_updates_submitted_yesterday']}")
        print(f"Yesterday Work Updates Pending  : {task5_acc['metrics']['work_updates_pending_yesterday']}")
        print(f"Work Update Compliance Rate     : {task5_acc['metrics']['work_updates_compliance_percent']}%")

        # 5. Sync Task 6: Tickets (Internal & External Separation)
        task6_tick = sync_task_6_tickets(primary_client)
        print("\n--- Task 6 (Tickets Audit) Result ---")
        print(f"Total Tickets                    : {task6_tick['metrics']['total_tickets']}")
        print(f"Internal Tickets                 : {task6_tick['metrics']['total_internal_tickets']} (Solved: {task6_tick['metrics']['internal_metrics']['solved']}, Unsolved: {task6_tick['metrics']['internal_metrics']['unsolved']})")
        print(f"External Tickets                 : {task6_tick['metrics']['total_external_tickets']}")
        print(f"Tickets Overdue > 3 Days (Danger): {task6_tick['metrics']['total_danger_tickets_overdue_3_days']} tickets")

        # 6. Sync Task 7: DMR (Daily Management Reports) Audit
        task7_dmr = sync_task_7_dmr(primary_client)
        print("\n--- Task 7 (DMR Reports) Result ---")
        print(f"Total FMS Sites Requiring DMR    : {task7_dmr['metrics']['total_fms_sites']} (Out of {task7_dmr['metrics']['total_all_active_sites_all_types']} total sites)")
        print(f"Yesterday DMR Submitted Sites    : {task7_dmr['metrics']['submitted_sites_yesterday']}")
        print(f"Yesterday DMR Pending Sites      : {task7_dmr['metrics']['pending_sites_yesterday']}")
        print(f"FMS DMR Compliance Rate          : {task7_dmr['metrics']['compliance_percent']}%")
        print(f"Total DMR Documents In System    : {task7_dmr['metrics']['total_dmr_documents_all_time']}")

        # 7. Sync Task 8: 52 Weeks Plan (Current Week Goals & Today's Plan)
        task8_plan = sync_task_8_52_weeks_plan(primary_client)
        print("\n--- Task 8 (52 Weeks Plan) Result ---")
        print(f"Current Week Number              : Week {task8_plan['metrics']['current_week_number']} ({task8_plan['metrics']['week_start_date']} to {task8_plan['metrics']['week_end_date']})")
        print(f"Total Tasks Planned This Week    : {task8_plan['metrics']['total_tasks_this_week']} tasks")
        print(f"Today's Planned Tasks ({task8_plan['metrics']['today_weekday']})  : {task8_plan['metrics']['today_total_tasks']} tasks (HK: {task8_plan['metrics']['today_housekeeping_tasks']}, MEP: {task8_plan['metrics']['today_mep_tasks']})")
        print(f"Today's Plan Status              : {task8_plan['metrics']['today_status']}")

    except Exception as e:
        print(f"[ERROR] Sync failed: {e}")
    finally:
        primary_client.close()
        vts_client.close()
        print("\n" + "=" * 60)
        print("SYNC COMPLETE")
        print("=" * 60)

if __name__ == "__main__":
    run_sync()
