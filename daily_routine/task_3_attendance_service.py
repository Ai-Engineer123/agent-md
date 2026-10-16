"""
=============================================================================
TASK 3: HEAD OFFICE & IN-CHARGES ATTENDANCE SERVICE (LOCAL DB ONLY)
=============================================================================
Zero direct MongoDB connections!
All attendance data is read purely from local JSON snapshots:
    local_db/<YYYY-MM-DD>/task_3_head_office_attendance.json
    local_db/<YYYY-MM-DD>/task_3_company_incharges.json
"""

import sys
from pathlib import Path

ROOT_DIR = Path(__file__).resolve().parent.parent
if str(ROOT_DIR) not in sys.path:
    sys.path.insert(0, str(ROOT_DIR))

if r"C:\coding\python-packages" not in sys.path:
    sys.path.insert(0, r"C:\coding\python-packages")

import json
from datetime import datetime
from config import BASE_DIR

LOCAL_DB_DIR = BASE_DIR / "local_db"

def get_head_office_attendance(target_date: datetime = None) -> dict:
    """
    Task 3 (Head Office):
    Reads Head Office attendance data directly from local_db snapshot.
    Zero remote MongoDB connection overhead.
    """
    if target_date is None:
        target_date = datetime.now()
    
    date_str = target_date.strftime("%Y-%m-%d")
    file_path = LOCAL_DB_DIR / date_str / "task_3_head_office_attendance.json"

    if file_path.exists():
        try:
            with open(file_path, "r", encoding="utf-8") as f:
                data = json.load(f)
            data["source"] = "LOCAL_DB"
            return data
        except Exception as e:
            return {"error": f"Failed to read local file: {e}", "source": "LOCAL_DB"}

    return {
        "task_id": 3,
        "task_name": "Head Office Morning Attendance",
        "date": date_str,
        "status": "NOT_SYNCED_YET",
        "message": f"Run 'python sync_local_db.py' to sync {date_str} data into local_db.",
        "source": "LOCAL_DB"
    }

def get_company_incharges_attendance(target_date: datetime = None) -> dict:
    """
    Task 3 (In-charges):
    Reads Company In-charges attendance & leave status directly from local_db snapshot.
    Zero remote MongoDB connection overhead.
    """
    if target_date is None:
        target_date = datetime.now()
    
    date_str = target_date.strftime("%Y-%m-%d")
    file_path = LOCAL_DB_DIR / date_str / "task_3_company_incharges.json"

    if file_path.exists():
        try:
            with open(file_path, "r", encoding="utf-8") as f:
                data = json.load(f)
            data["source"] = "LOCAL_DB"
            return data
        except Exception as e:
            return {"error": f"Failed to read local file: {e}", "source": "LOCAL_DB"}

    return {
        "task_id": 3,
        "task_name": "Company Incharges Morning Attendance & Leave Audit",
        "date": date_str,
        "status": "NOT_SYNCED_YET",
        "message": f"Run 'python sync_local_db.py' to sync {date_str} data into local_db.",
        "source": "LOCAL_DB"
    }

if __name__ == "__main__":
    print("Testing Task 3 get_head_office_attendance from LOCAL DB:")
    ho_res = get_head_office_attendance()
    print(f"Total staff: {ho_res.get('total_staff')}, Present: {ho_res.get('present_count')}, Not Checked in: {ho_res.get('not_checked_in_count')}")
    print("\nTesting Task 3 get_company_incharges_attendance from LOCAL DB:")
    inc_res = get_company_incharges_attendance()
    metrics = inc_res.get('metrics', {})
    print(f"Total Incharges: {metrics.get('total_incharges')}, Present: {metrics.get('total_present')}, On Leave: {metrics.get('total_on_leave')}, Not Checked In: {metrics.get('total_not_checked_in')}")
