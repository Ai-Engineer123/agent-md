"""
=============================================================================
TASK 8: 52 WEEKS PLAN SERVICE (LOCAL DB ONLY)
=============================================================================
Zero direct MongoDB connections!
All 52 Weeks Plan / PPM data is read purely from local snapshots:
    local_db/<YYYY-MM-DD>/task_8_52_weeks_plan.json
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

def get_local_plan_file(date_str: str = None) -> Path:
    """Returns the Path to local_db/<date_str>/task_8_52_weeks_plan.json."""
    if not date_str:
        date_str = datetime.now().strftime("%Y-%m-%d")
    return LOCAL_DB_DIR / date_str / "task_8_52_weeks_plan.json"

def get_plan_summary(target_date: datetime = None, allow_fallback: bool = False) -> dict:
    """
    Reads Task 8 (52 Weeks Plan) audit data directly from local_db snapshot.
    Zero remote MongoDB connection overhead.
    """
    if target_date is None:
        target_date = datetime.now()

    date_str = target_date.strftime("%Y-%m-%d")
    file_path = get_local_plan_file(date_str)

    if not file_path.exists():
        return {
            "source": "LOCAL_DB",
            "status": "NOT_SYNCED_YET",
            "date": date_str,
            "metrics": {},
            "current_day_plan": {},
            "current_week_plan": {}
        }

    try:
        with open(file_path, "r", encoding="utf-8") as f:
            data = json.load(f)

        data["source"] = "LOCAL_DB"
        data["file_path"] = str(file_path)
        return data
    except Exception as e:
        return {
            "source": "LOCAL_DB",
            "status": "ERROR_READING_SNAPSHOT",
            "error": str(e),
            "date": date_str,
            "metrics": {},
            "current_day_plan": {},
            "current_week_plan": {}
        }

if __name__ == "__main__":
    result = get_plan_summary()
    print("Local 52 Weeks Plan Summary Loaded:")
    print("Current Week Number:", result.get("metrics", {}).get("current_week_number"))
    print("Today Total Tasks Planned:", result.get("metrics", {}).get("today_total_tasks"))
