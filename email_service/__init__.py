"""
=============================================================================
EMAIL SERVICE PACKAGE
=============================================================================
Module for generating luxury HTML Executive Briefings and sending them
via SMTP to leadership and management.
"""

from .config import (
    SMTP_HOST,
    SMTP_PORT,
    SMTP_USER,
    SENDER_EMAIL,
    SENDER_NAME,
    DEFAULT_RECIPIENT
)
from .formatter import (
    build_executive_email_html,
    clean_markdown_for_email
)
from .sender import (
    send_executive_briefing_email,
    generate_email_preview
)

__all__ = [
    "SMTP_HOST",
    "SMTP_PORT",
    "SMTP_USER",
    "SENDER_EMAIL",
    "SENDER_NAME",
    "DEFAULT_RECIPIENT",
    "build_executive_email_html",
    "clean_markdown_for_email",
    "send_executive_briefing_email",
    "generate_email_preview"
]
