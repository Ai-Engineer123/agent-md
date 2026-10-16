"""
=============================================================================
SYNC TASKS PACKAGE (TASK-WISE MODULAR SYNC HANDLERS)
=============================================================================
Modular, decoupled handlers for pulling remote MongoDB collections
into lightweight local JSON files under local_db/<YYYY-MM-DD>/.

Modules:
- common.py: Shared utilities (date dirs, json cleaners, constants)
- task_1_checkin.py: Task 1 User Check-in Verification
- task_3_attendance.py: Task 3 Head Office & Company In-charges Attendance & Leaves
- task_5_accounts.py: Task 5 Accounts, 8-Component Collections, Imprest & Work Updates
- task_6_tickets.py: Task 6 Tickets Audit (Internal/External, SLA Danger)
- task_7_dmr.py: Task 7 DMR Management Reports & Attachments Audit
- task_8_plan.py: Task 8 52 Weeks PPM Schedule & Today's Maintenance Tasks
"""

from .common import (
    LOCAL_DB_DIR,
    TARGET_EMPLOYEE_NUMBER,
    get_current_date_dir,
    clean_for_json
)

from .task_1_checkin import sync_task_1_user_checkin
from .task_3_attendance import (
    COMPANY_INCHARGES_CONFIG,
    sync_task_3_head_office_attendance,
    sync_task_3_company_incharges
)
from .task_5_accounts import sync_task_5_accounts, clean_html_text
from .task_6_tickets import sync_task_6_tickets
from .task_7_dmr import sync_task_7_dmr
from .task_8_plan import sync_task_8_52_weeks_plan

__all__ = [
    "LOCAL_DB_DIR",
    "TARGET_EMPLOYEE_NUMBER",
    "get_current_date_dir",
    "clean_for_json",
    "sync_task_1_user_checkin",
    "COMPANY_INCHARGES_CONFIG",
    "sync_task_3_head_office_attendance",
    "sync_task_3_company_incharges",
    "sync_task_5_accounts",
    "clean_html_text",
    "sync_task_6_tickets",
    "sync_task_7_dmr",
    "sync_task_8_52_weeks_plan"
]
