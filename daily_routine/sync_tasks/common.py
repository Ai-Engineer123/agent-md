"""
=============================================================================
SYNC TASKS - COMMON UTILITIES & CONSTANTS
=============================================================================
Shared helpers for local_db synchronization.
"""

import sys
from pathlib import Path

ROOT_DIR = Path(__file__).resolve().parent.parent.parent
if str(ROOT_DIR) not in sys.path:
    sys.path.insert(0, str(ROOT_DIR))

if r"C:\coding\python-packages" not in sys.path:
    sys.path.insert(0, r"C:\coding\python-packages")

from datetime import datetime
from bson import ObjectId
from config import BASE_DIR

# Base local_db directory
LOCAL_DB_DIR = BASE_DIR / "local_db"

# Admin / MD employee number to verify
TARGET_EMPLOYEE_NUMBER = 1

def get_current_date_dir(target_date: datetime = None) -> Path:
    """Creates and returns the path for local_db/YYYY-MM-DD/"""
    if target_date is None:
        target_date = datetime.now()
    today_str = target_date.strftime("%Y-%m-%d")
    date_dir = LOCAL_DB_DIR / today_str
    date_dir.mkdir(parents=True, exist_ok=True)
    return date_dir

def clean_for_json(obj):
    """Recursively converts ObjectIds, Datetimes and removes binary/heavy fields."""
    if isinstance(obj, dict):
        cleaned = {}
        for k, v in obj.items():
            # Exclude heavy binary fields like face encodings
            if k in ["faceEncoding", "raw_image"]:
                continue
            cleaned[k] = clean_for_json(v)
        return cleaned
    elif isinstance(obj, list):
        return [clean_for_json(item) for item in obj]
    elif isinstance(obj, ObjectId):
        return str(obj)
    elif isinstance(obj, datetime):
        return obj.isoformat()
    return obj
