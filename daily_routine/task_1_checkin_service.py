"""
=============================================================================
TASK 1: USER CHECK-IN SERVICE (LOCAL DB ONLY)
=============================================================================
Zero direct MongoDB connections!
All check-in data is read purely from local JSON snapshots:
    local_db/<YYYY-MM-DD>/task_1_checkin.json
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
DEFAULT_ADMIN_EMP_NO = 1

def get_local_checkin_file(date_str: str = None) -> Path:
    """Returns the Path to local_db/<date_str>/task_1_checkin.json."""
    if not date_str:
        date_str = datetime.now().strftime("%Y-%m-%d")
    return LOCAL_DB_DIR / date_str / "task_1_checkin.json"

def check_user_checkin(employee_number: int = DEFAULT_ADMIN_EMP_NO, target_date: datetime = None) -> dict:
    """
    Reads Task 1 checkin data directly from local_db snapshot.
    Zero remote MongoDB connection overhead.
    """
    if target_date is None:
        target_date = datetime.now()
    
    date_str = target_date.strftime("%Y-%m-%d")
    file_path = get_local_checkin_file(date_str)

    # 1. Check if local_db file exists
    if file_path.exists():
        try:
            with open(file_path, "r", encoding="utf-8") as f:
                data = json.load(f)
            
            return {
                "checked_in": data.get("checked_in", False),
                "is_today": True,
                "employee_number": data.get("employee_number", employee_number),
                "employee_name": data.get("employee_name", "S GANESAMOORTHY"),
                "check_in_time": data.get("check_in_time"),
                "site": data.get("site") or data.get("last_known_site", "HEAD OFFICE"),
                "role": data.get("role", "ADMIN"),
                "status": data.get("status", "SYNCED"),
                "last_known_checkin": data.get("last_known_checkin"),
                "source": "LOCAL_DB"
            }
        except Exception as e:
            return {
                "checked_in": False,
                "error": f"Failed to read local file: {e}",
                "source": "LOCAL_DB"
            }

    # 2. If file not yet synced locally
    return {
        "checked_in": False,
        "is_today": False,
        "employee_number": employee_number,
        "employee_name": "S GANESAMOORTHY",
        "status": "NOT_SYNCED_YET",
        "message": f"Run 'python sync_local_db.py' to sync {date_str} data into local_db.",
        "source": "LOCAL_DB"
    }

if __name__ == "__main__":
    print("Testing Task 1 check_user_checkin from LOCAL DB:")
    res = check_user_checkin()
    print(json.dumps(res, indent=2))
