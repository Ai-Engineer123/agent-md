"""
=============================================================================
EXECUTIVE BRIEFING EMAIL DISPATCHER
=============================================================================
Dispatches the AI Executive Intelligence Briefing via SMTP (TLS / SSL)
to the target recipient email address with robust error handling and
fallback HTML preview saving.
"""

import sys
import smtplib
from pathlib import Path
from email.mime.multipart import MIMEMultipart
from email.mime.text import MIMEText
from datetime import datetime
import json
import logging

ROOT_DIR = Path(__file__).resolve().parent.parent
if str(ROOT_DIR) not in sys.path:
    sys.path.insert(0, str(ROOT_DIR))

if r"C:\coding\python-packages" not in sys.path:
    sys.path.insert(0, r"C:\coding\python-packages")

from .config import (
    load_smtp_config,
    DEFAULT_RECIPIENT,
    BASE_DIR
)
from .formatter import build_executive_email_html
from ai_engine import get_latest_ai_report

logger = logging.getLogger(__name__)

EMAIL_PREVIEWS_DIR = BASE_DIR / "data" / "email_previews"
EMAIL_PREVIEWS_DIR.mkdir(parents=True, exist_ok=True)

def generate_email_preview(date_str: str = None) -> tuple:
    """
    Loads the AI executive briefing and generates the complete HTML email body.
    Saves a local preview to data/email_previews/<date>.html.
    Returns (html_content, report_data, preview_path).
    """
    report_data = get_latest_ai_report(date_str)
    effective_date = report_data.get("date", datetime.now().strftime("%Y-%m-%d"))
    
    html_content = build_executive_email_html(report_data, effective_date)
    
    preview_path = EMAIL_PREVIEWS_DIR / f"{effective_date}.html"
    with open(preview_path, "w", encoding="utf-8") as f:
        f.write(html_content)
        
    return html_content, report_data, preview_path

def send_executive_briefing_email(
    to_email: str,
    date_str: str = None,
    subject: str = None
) -> dict:
    """
    Sends the Executive Intelligence Briefing for date_str to to_email.
    Returns status dict with success status, details, and preview path.
    """
    if not to_email:
        to_email = DEFAULT_RECIPIENT
    
    if not to_email:
        return {
            "success": False,
            "status": "MISSING_RECIPIENT",
            "error": "Recipient email address ('to_email') is required."
        }

    # 1. Generate HTML email body & preview file
    try:
        html_content, report_data, preview_path = generate_email_preview(date_str)
    except Exception as e:
        return {
            "success": False,
            "status": "HTML_GENERATION_FAILED",
            "error": f"Failed to generate email HTML: {e}"
        }

    effective_date = report_data.get("date", datetime.now().strftime("%Y-%m-%d"))

    # 2. Check dynamic SMTP configuration
    cfg = load_smtp_config()
    smtp_host = cfg["SMTP_HOST"]
    smtp_port = cfg["SMTP_PORT"]
    smtp_ssl = cfg["SMTP_USE_SSL"]
    smtp_user = cfg["SMTP_USER"]
    smtp_pass = cfg["SMTP_PASSWORD"]
    sender_name = cfg["SENDER_NAME"]
    sender_email = cfg["SENDER_EMAIL"] or smtp_user or "reports@vipras.in"

    if not smtp_user or not smtp_pass:
        return {
            "success": False,
            "status": "SMTP_NOT_CONFIGURED",
            "message": "SMTP credentials (SMTP_USER & SMTP_PASSWORD) are not yet configured in .env.",
            "preview_saved_to": str(preview_path),
            "effective_date": effective_date,
            "recipient": to_email
        }

    # 3. Build Email Message
    if not subject:
        subject = f"⚡ MD Executive Intelligence Briefing — {effective_date} (S GANESAMOORTHY)"

    msg = MIMEMultipart("alternative")
    msg["Subject"] = subject
    msg["From"] = f"{sender_name} <{sender_email}>"
    msg["To"] = to_email
    msg["Date"] = datetime.now().strftime("%a, %d %b %Y %H:%M:%S +0530")

    # Plain text fallback
    plain_text = f"MD Executive Intelligence Briefing for {effective_date}.\nPlease view this email in an HTML-capable email client."
    part1 = MIMEText(plain_text, "plain", "utf-8")
    part2 = MIMEText(html_content, "html", "utf-8")

    msg.attach(part1)
    msg.attach(part2)

    # 4. Connect to SMTP and transmit
    try:
        if smtp_ssl or smtp_port == 465:
            server = smtplib.SMTP_SSL(smtp_host, smtp_port, timeout=20)
        else:
            server = smtplib.SMTP(smtp_host, smtp_port, timeout=20)
            server.ehlo()
            server.starttls()
            server.ehlo()

        server.login(smtp_user, smtp_pass)
        server.sendmail(sender_email, [to_email], msg.as_string())
        server.quit()

        return {
            "success": True,
            "status": "EMAIL_SENT",
            "recipient": to_email,
            "subject": subject,
            "date": effective_date,
            "preview_saved_to": str(preview_path)
        }

    except smtplib.SMTPAuthenticationError as e:
        return {
            "success": False,
            "status": "SMTP_AUTH_ERROR",
            "error": f"Authentication failed with {SMTP_HOST}: {e}",
            "preview_saved_to": str(preview_path)
        }
    except Exception as e:
        return {
            "success": False,
            "status": "SMTP_DISPATCH_ERROR",
            "error": f"Failed to send email via SMTP: {e}",
            "preview_saved_to": str(preview_path)
        }

if __name__ == "__main__":
    import argparse
    parser = argparse.ArgumentParser(description="Send Executive Briefing Email")
    parser.add_argument("--to", help="Recipient email address", default=DEFAULT_RECIPIENT)
    parser.add_argument("--date", help="Briefing date (YYYY-MM-DD)", default=None)
    parser.add_argument("--preview-only", action="store_true", help="Generate preview HTML only without sending")
    args = parser.parse_args()

    if args.preview_only:
        html, rep, p = generate_email_preview(args.date)
        print(f"[PREVIEW GENERATED] Saved to: {p}")
    else:
        if not args.to:
            print("Please provide --to <recipient_email> or use --preview-only")
            sys.exit(1)
        res = send_executive_briefing_email(args.to, args.date)
        print("Dispatch Result:", json.dumps(res, indent=2))
