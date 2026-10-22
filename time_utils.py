"""
=============================================================================
GLOBAL TIMEZONE CONVERTER & UTILITIES (UTC -> IST)
=============================================================================
Centralized timezone converter for all backend services.
Guarantees all database timestamps (MongoDB UTC BSON/ISO) and string timestamps
are converted accurately to Indian Standard Time (IST, Asia/Kolkata, UTC+05:30).
"""

from datetime import datetime, timezone, timedelta
from typing import Optional, Any, Union

# Indian Standard Time (UTC +05:30)
IST = timezone(timedelta(hours=5, minutes=30), name="IST")

def to_ist(val: Any) -> Optional[datetime]:
    """
    Converts any timestamp (datetime, ISO string, or time string) to a 
    timezone-aware datetime in IST (UTC+05:30).
    Idempotent: if already in IST, preserves the time.
    """
    if not val:
        return None

    if isinstance(val, datetime):
        if val.tzinfo is None:
            # Naive datetime from MongoDB/PyMongo represents UTC
            val = val.replace(tzinfo=timezone.utc)
        return val.astimezone(IST)

    if isinstance(val, str):
        v = val.strip()
        if not v:
            return None
        try:
            # ISO timestamp ending with 'Z'
            if v.endswith("Z"):
                dt = datetime.fromisoformat(v[:-1]).replace(tzinfo=timezone.utc)
                return dt.astimezone(IST)
            # ISO timestamp with explicit timezone offset (+05:30 or -04:00)
            elif "+" in v or (len(v) > 10 and "-" in v[10:]):
                dt = datetime.fromisoformat(v)
                return dt.astimezone(IST)
            # Naive ISO timestamp (e.g. 2026-10-22T05:02:03.892000 from MongoDB)
            elif "T" in v:
                dt = datetime.fromisoformat(v).replace(tzinfo=timezone.utc)
                return dt.astimezone(IST)
            # Date + Time space separated (e.g. 2026-10-22 05:02:03)
            elif " " in v and len(v) >= 16:
                dt = datetime.fromisoformat(v.replace(" ", "T")).replace(tzinfo=timezone.utc)
                return dt.astimezone(IST)
            # Pure time string (e.g. 05:02:03 or 05:02 UTC)
            elif ":" in v and len(v) <= 8:
                parts = [int(p) for p in v.split(":")]
                h = parts[0]
                m = parts[1]
                s = parts[2] if len(parts) > 2 else 0
                now_utc = datetime.now(timezone.utc)
                base = datetime(now_utc.year, now_utc.month, now_utc.day, h, m, s, tzinfo=timezone.utc)
                return base.astimezone(IST)
        except Exception:
            return None

    return None

def to_ist_iso(val: Any) -> Optional[str]:
    """
    Converts any timestamp to an ISO-8601 string in IST with offset (+05:30).
    Example: '2026-10-22T10:32:03.892000+05:30'
    """
    ist_dt = to_ist(val)
    if ist_dt:
        return ist_dt.isoformat()
    return str(val) if val is not None else None

def format_time_ampm(val: Any) -> str:
    """
    Converts any UTC/naive timestamp to IST and formats into 12-hour AM/PM.
    Example: '2026-10-22T05:02:03' -> '10:32 AM'
    """
    if not val:
        return ""
    ist_dt = to_ist(val)
    if ist_dt:
        return ist_dt.strftime("%I:%M %p")
    return str(val)

def format_time_ampm_with_seconds(val: Any) -> str:
    """
    Converts any timestamp to IST and formats into 12-hour AM/PM with seconds.
    Example: '2026-10-22T05:02:03' -> '10:32:03 AM'
    """
    if not val:
        return ""
    ist_dt = to_ist(val)
    if ist_dt:
        return ist_dt.strftime("%I:%M:%S %p")
    return str(val)

def format_time_24h(val: Any) -> str:
    """
    Converts any timestamp to IST and formats into 24-hour HH:MM.
    Example: '2026-10-22T05:02:03' -> '10:32'
    """
    if not val:
        return ""
    ist_dt = to_ist(val)
    if ist_dt:
        return ist_dt.strftime("%H:%M")
    return str(val)

def get_current_ist_datetime() -> datetime:
    """Returns the current datetime in Indian Standard Time."""
    return datetime.now(IST)

def get_current_ist_time_str() -> str:
    """Returns current IST formatted time e.g. '10:32 AM IST'."""
    return datetime.now(IST).strftime("%I:%M %p IST")
