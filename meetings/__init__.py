"""
=============================================================================
MEETINGS PACKAGE INITIALIZATION
=============================================================================
"""

from .constants import (
    ALLOWED_WEEKDAYS,
    STANDARD_TIME_WINDOW,
    COMPANIES_CONFIG,
    VFM_ADMIN_HR_TOPICS,
    VFM_ACCOUNTS_TOPICS,
    VFM_OPERATIONS_GM_AGM_TOPICS,
)

from .service import (
    load_all_meetings,
    save_all_meetings,
    get_meetings_for_date,
    get_meeting_by_id,
    add_or_update_meeting,
    sort_meetings_by_datetime,
    parse_meeting_start_minutes,
    update_meeting_feedback_and_topics,
    generate_week_schedule,
    reorder_week_by_priority,
    generate_standard_month_schedule,
    reschedule_meeting,
    swap_meetings,
    schedule_monthly_om_fm_meeting,
    prune_to_active_week,
    get_week_monday,
    ensure_month_scheduled,
    get_month_meetings_breakdown,
    get_meeting_dossier,
    load_common_agenda,
    save_common_agenda,
    add_common_agenda_item,
    delete_common_agenda_item,
    add_topic_to_meeting,
    update_topic_in_meeting,
    delete_topic_from_meeting,
    apply_common_agenda_to_meeting,
)
