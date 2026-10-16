"""
=============================================================================
BACKEND DYNAMIC AUTHENTICATION SERVICE
=============================================================================
Manages executive authentication dynamically via backend API.
Zero frontend hardcoding.
Logs all authentication attempts and user sessions to JSONL audit logs.
"""

import json
from pathlib import Path
from datetime import datetime
from typing import Optional, Dict, Any
from jsonl_logger import log_event

AUTH_DATA_FILE = Path(__file__).resolve().parent / "data" / "auth_users.json"

def load_auth_users() -> list:
    """Loads all authorized executive users from backend data store."""
    if not AUTH_DATA_FILE.exists():
        return []
    try:
        with open(AUTH_DATA_FILE, "r", encoding="utf-8") as f:
            return json.load(f)
    except Exception as e:
        print(f"[AUTH ERROR] Could not read {AUTH_DATA_FILE}: {e}")
        return []

def authenticate_credentials(username: str, password: str) -> Optional[Dict[str, Any]]:
    """
    Verifies username and password dynamically.
    Returns user profile without password if valid, None otherwise.
    Logs session events to JSONL.
    """
    u = (username or "").strip().lower()
    p = (password or "").strip()

    if not u or not p:
        return None

    users = load_auth_users()
    for user in users:
        if user.get("username", "").lower() == u and user.get("password", "") == p:
            # Login Success
            profile = {
                "username": user.get("username"),
                "name": user.get("name"),
                "role": user.get("role", "Executive"),
                "designation": user.get("designation"),
                "initials": user.get("initials", "EX"),
                "badgeColor": user.get("badgeColor", "#ff914d"),
                "theme": user.get("theme", "executive"),
                "login_at": datetime.now().isoformat(),
                "token": f"sess_{int(datetime.now().timestamp())}_{user.get('username')}"
            }
            # Audit Log
            log_event("USER_LOGIN_SUCCESS", {
                "username": u,
                "actor": profile["name"],
                "role": profile["role"],
                "timestamp": profile["login_at"]
            }, user=profile["name"])

            return profile

    # Login Failure
    log_event("USER_LOGIN_FAILED", {
        "attempted_username": u,
        "timestamp": datetime.now().isoformat()
    }, user="Anonymous / Failed Login")

    return None
