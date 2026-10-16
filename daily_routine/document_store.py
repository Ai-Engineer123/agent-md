"""
=============================================================================
DOCUMENT STORE (MONGODB-LIKE LOCAL JSON REPOSITORY)
=============================================================================
Stores daily routines and agent data as structured MongoDB-like documents.
Saved in: data/daily_routines/YYYY-MM-DD.json

Each document contains the complete state:
- _id, date, timestamps, status, progress metrics
- Complete array of items with details, live metadata, ticks, and feedback
- Revision history / audit trail
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
from pathlib import Path
from config import BASE_DIR

DATA_DIR = BASE_DIR / "data" / "daily_routines"
DATA_DIR.mkdir(parents=True, exist_ok=True)

def get_routine_file_path(date_str: str) -> Path:
    """Returns Path for a specific date's routine document."""
    return DATA_DIR / f"{date_str}.json"

def save_daily_routine_document(routine_data: dict) -> dict:
    """
    Saves or updates a complete MongoDB-like document for the routine.
    
    Structure:
    {
        "_id": "routine_2026-10-08",
        "date": "2026-10-08",
        "status": "IN_PROGRESS" | "COMPLETED",
        "created_at": "...",
        "updated_at": "...",
        "total_items": 8,
        "completed_items": 2,
        "percentage": 25,
        "items": [ ... full items list ... ],
        "summary": { ... }
    }
    """
    date_str = routine_data.get("date", datetime.now().strftime("%Y-%m-%d"))
    file_path = get_routine_file_path(date_str)
    
    existing_doc = {}
    if file_path.exists():
        try:
            with open(file_path, "r", encoding="utf-8") as f:
                existing_doc = json.load(f)
        except Exception:
            existing_doc = {}

    # Build rich MongoDB-like document
    now_iso = datetime.now().isoformat()
    raw_items = routine_data.get("items", [])
    seen_ids = set()
    items = []
    for it in raw_items:
        i_id = it.get("id")
        if i_id not in seen_ids:
            seen_ids.add(i_id)
            items.append(it)

    total = len(items)
    completed = sum(1 for it in items if it.get("completed") or it.get("manual_verified"))
    pct = int((completed / total) * 100) if total > 0 else 0

    document = {
        "_id": f"routine_{date_str}",
        "collection": "daily_routines",
        "date": date_str,
        "status": "COMPLETED" if (total > 0 and completed == total) else "IN_PROGRESS",
        "created_at": existing_doc.get("created_at", now_iso),
        "updated_at": now_iso,
        "metrics": {
            "total_items": total,
            "completed_items": completed,
            "pending_items": total - completed,
            "completion_percentage": pct
        },
        "items": items,
        "last_action": routine_data.get("last_action", "UPDATED")
    }

    # Save cleanly with indentation like a real document
    with open(file_path, "w", encoding="utf-8") as f:
        json.dump(document, f, indent=2, ensure_ascii=False)

    return document

def load_daily_routine_document(date_str: str = None) -> dict:
    """Loads the complete MongoDB-style document for a date."""
    if not date_str:
        date_str = datetime.now().strftime("%Y-%m-%d")
    
    file_path = get_routine_file_path(date_str)
    if not file_path.exists():
        return None

    with open(file_path, "r", encoding="utf-8") as f:
        return json.load(f)

def get_all_available_dates() -> list:
    """Returns sorted list of all dates that have recorded data."""
    from config import LOGS_DIR
    dates = set()
    
    # Check data/daily_routines
    if DATA_DIR.exists():
        for p in DATA_DIR.glob("*.json"):
            dates.add(p.stem)
            
    # Check logs/
    if LOGS_DIR.exists():
        for p in LOGS_DIR.glob("*.jsonl"):
            dates.add(p.stem)
            
    today_str = datetime.now().strftime("%Y-%m-%d")
    dates.add(today_str)
    return sorted(list(dates), reverse=True)