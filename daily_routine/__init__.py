"""
=============================================================================
DAILY ROUTINE MODULE
=============================================================================
Centralized hub for all Daily Routine Services, Snapshot Engines, and Store.

Task-wise Services:
- Task 1: task_1_checkin_service.py (User Check-in Verification)
- Task 3: task_3_attendance_service.py (Head Office & In-charges Attendance)
- Task 5: task_5_accounts_service.py (Accounts, Collections, Imprest & Work Updates)
- Task 6: task_6_tickets_service.py (Operational & Customer Tickets)
- Task 7: task_7_dmr_service.py (DMR Daily Management Reports Audit)
- Task 8: task_8_plan_service.py (52 Weeks Plan Goals Review)
"""

import sys
from pathlib import Path

ROOT_DIR = Path(__file__).resolve().parent.parent
if str(ROOT_DIR) not in sys.path:
    sys.path.insert(0, str(ROOT_DIR))

# 1. Task-wise Services
from .task_1_checkin_service import (
    check_user_checkin,
    get_local_checkin_file,
    DEFAULT_ADMIN_EMP_NO
)
from .task_3_attendance_service import (
    get_head_office_attendance,
    get_company_incharges_attendance
)
from .task_5_accounts_service import (
    get_accounts_summary,
    get_local_accounts_file
)
from .task_6_tickets_service import (
    get_tickets_summary,
    get_local_tickets_file
)
from .task_7_dmr_service import (
    get_dmr_summary,
    get_local_dmr_file
)
from .task_8_plan_service import (
    get_plan_summary,
    get_local_plan_file
)

# 2. Document Store & Definitions
from .document_store import (
    save_daily_routine_document,
    load_daily_routine_document,
    get_all_available_dates
)
from .checklist_items import (
    DEFAULT_CHECKLIST_DEFINITIONS,
    ChecklistManager,
    checklist_mgr
)

# 3. Sync Engine & Report Extractor
from .sync_local_db import run_sync
from .report_extractor import (
    process_and_extract_file,
    get_extracted_reports_dir,
    download_file,
    extract_excel_content,
    extract_pdf_content,
    extract_docx_content
)
