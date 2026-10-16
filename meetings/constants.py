"""
=============================================================================
MEETINGS MODULE CONSTANTS & AGENDA DEFINITIONS
=============================================================================
Defines standard schedules, departments, and topic checklists for MD meetings.
Zero remote MongoDB dependency - completely local.
"""

# Allowed meeting days (0 = Monday, 1 = Tuesday, 2 = Wednesday, 5 = Saturday)
ALLOWED_WEEKDAYS = {
    0: "Monday",
    1: "Tuesday",
    2: "Wednesday",
    5: "Saturday"  # First half only
}

# Standard operating time window
STANDARD_TIME_WINDOW = {
    "start": "11:00 AM",
    "end": "06:00 PM"
}

# ---------------------------------------------------------------------------
# DEPARTMENT TOPICS (STRICTLY DYNAMIC - ZERO HARDCODING)
# ---------------------------------------------------------------------------

VFM_ADMIN_HR_TOPICS = []
VFM_ACCOUNTS_TOPICS = []
VFM_OPERATIONS_GM_AGM_TOPICS = []

# ---------------------------------------------------------------------------
# MASTER COMPANIES CONFIGURATION
# ---------------------------------------------------------------------------
COMPANIES_CONFIG = {
    "VFMS": {
        "name": "Vipras Facility Management",
        "short_name": "VFMS",
        "departments": [
            {
                "id": "admin_hr",
                "name": "Administrative & HR",
                "has_topics": False,
                "topics": [],
                "preferred_day": "Monday",
                "time": "11:00 AM - 01:00 PM"
            },
            {
                "id": "accounts",
                "name": "Accounts",
                "has_topics": False,
                "topics": [],
                "preferred_day": "Tuesday",
                "time": "02:00 PM - 04:00 PM"
            },
            {
                "id": "operations",
                "name": "Operations (Facility & Security)",
                "has_topics": False,
                "topics": [],
                "preferred_day": "Wednesday",
                "time": "11:00 AM - 01:30 PM"
            },
            {
                "id": "business_dev",
                "name": "Business Development",
                "has_topics": False,
                "preferred_day": "Monday",
                "time": "03:00 PM - 04:30 PM"
            },
            {
                "id": "management",
                "name": "Management Review",
                "has_topics": False,
                "preferred_day": "Wednesday",
                "time": "03:30 PM - 05:00 PM"
            },
            {
                "id": "monthly_om_fm",
                "name": "Monthly OM & FM Meeting",
                "frequency": "MONTHLY_ONCE",
                "is_monthly": True,
                "start_time": "08:00 AM",
                "time": "08:00 AM - 12:30 PM",
                "has_topics": False
            }
        ]
    },
    "VTS": {
        "name": "Vipras Tech Solutions",
        "short_name": "VTS",
        "frequency": "TWICE_WEEKLY",
        "schedule_days": ["Tuesday", "Saturday"],
        "sub_teams": ["GG", "AI"],
        "time_slots": {
            "Tuesday": "04:30 PM - 06:00 PM",
            "Saturday": "11:00 AM - 01:00 PM"
        },
        "has_topics": False
    },
    "CC": {
        "name": "City Coolies",
        "short_name": "CC",
        "frequency": "TWICE_WEEKLY",
        "schedule_days": ["Tuesday", "Saturday"],
        "time_slots": {
            "Tuesday": "11:00 AM - 12:30 PM",
            "Saturday": "09:30 AM - 11:00 AM"
        },
        "has_topics": False
    },
    "Profox": {
        "name": "Profox",
        "short_name": "Profox",
        "frequency": "ONCE_WEEKLY",
        "schedule_days": ["Wednesday"],
        "time_slots": {
            "Wednesday": "02:00 PM - 03:30 PM"
        },
        "has_topics": False
    }
}
