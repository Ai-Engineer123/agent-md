"""
=============================================================================
TASK 6: TICKETS & SLA OVERDUE SERVICE (LOCAL DB ONLY)
=============================================================================
Zero direct MongoDB connections!
All Tickets data (Internal & External, Status, Danger SLA alerts) is read purely
from local snapshots:
    local_db/<YYYY-MM-DD>/task_6_tickets.json
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

def get_local_tickets_file(date_str: str = None) -> Path:
    """Returns the Path to local_db/<date_str>/task_6_tickets.json."""
    if not date_str:
        date_str = datetime.now().strftime("%Y-%m-%d")
    return LOCAL_DB_DIR / date_str / "task_6_tickets.json"

def get_tickets_summary(target_date: datetime = None, allow_fallback: bool = False) -> dict:
    """
    Reads Task 6 Tickets audit data directly from local_db snapshot.
    Zero remote MongoDB connection overhead.
    """
    if target_date is None:
        target_date = datetime.now()

    date_str = target_date.strftime("%Y-%m-%d")
    file_path = get_local_tickets_file(date_str)

    if not file_path.exists():
        return {
            "source": "LOCAL_DB",
            "status": "NOT_SYNCED_YET",
            "date": date_str,
            "metrics": {},
            "danger_alerts_summary": {},
            "internal_tickets": {},
            "external_tickets": {}
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
            "date": date_str
        }

if __name__ == "__main__":
    result = get_tickets_summary()
    print("Local Tickets Summary Loaded:")
    print("Total Tickets:", result.get("metrics", {}).get("total_tickets"))
    print("Danger Tickets (>3 days):", result.get("metrics", {}).get("total_danger_tickets_overdue_3_days"))
