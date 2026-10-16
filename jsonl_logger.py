"""
=============================================================================
JSONL AUDIT LOGGER
=============================================================================
Stores all agent reminders, user ticks, and user feedback in daily JSONL files.
File format: logs/YYYY-MM-DD.jsonl (e.g., logs/2026-10-08.jsonl)

Every single action is appended as a line of JSON so that nothing is ever lost.
"""

import sys
from pathlib import Path
if r"C:\coding\python-packages" not in sys.path:
    sys.path.insert(0, r"C:\coding\python-packages")

import json
from datetime import datetime
from config import LOGS_DIR

def get_today_log_file() -> Path:
    """Returns the Path to today's log file (e.g. logs/2026-10-08.jsonl)."""
    today_str = datetime.now().strftime("%Y-%m-%d")
    return LOGS_DIR / f"{today_str}.jsonl"

def log_event(event_type: str, data: dict, user: str = None) -> dict:
    """
    Appends a new event entry into today's JSONL log file with actor / updated_by tracking.
    
    Parameters:
        event_type (str): e.g. "ROUTINE_TRIGGERED", "ITEM_TICKED", "FEEDBACK_SUBMITTED"
        data (dict): The payload containing item details, user feedback, status, etc.
        user (str): Actor name (e.g. "Managing Director", "Executive Assistant")
        
    Returns:
        dict: The complete logged entry with timestamp and actor.
    """
    log_file = get_today_log_file()
    actor = user or data.get("updated_by") or data.get("created_by") or data.get("author") or "Managing Director"
    
    entry = {
        "timestamp": datetime.now().isoformat(),
        "event_type": event_type,
        "actor": actor,
        "updated_by": actor,
        "payload": data
    }
    
    # Append as a single JSON line
    with open(log_file, "a", encoding="utf-8") as f:
        f.write(json.dumps(entry, ensure_ascii=False) + "\n")
        
    return entry

def read_today_logs() -> list:
    """Reads all JSON lines recorded for today."""
    log_file = get_today_log_file()
    if not log_file.exists():
        return []
    
    logs = []
    with open(log_file, "r", encoding="utf-8") as f:
        for line in f:
            line = line.strip()
            if line:
                try:
                    logs.append(json.loads(line))
                except json.JSONDecodeError:
                    continue
    return logs

def read_logs_for_date(date_str: str) -> list:
    """Reads all JSON lines recorded for a specific date (YYYY-MM-DD)."""
    log_file = LOGS_DIR / f"{date_str}.jsonl"
    if not log_file.exists():
        return []
    
    logs = []
    with open(log_file, "r", encoding="utf-8") as f:
        for line in f:
            line = line.strip()
            if line:
                try:
                    logs.append(json.loads(line))
                except json.JSONDecodeError:
                    continue
    return logs
