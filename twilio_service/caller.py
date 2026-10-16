"""
=============================================================================
TWILIO OUTBOUND VOICE CALL DISPATCHER
=============================================================================
Initiates automated outbound executive briefing calls to the Managing
Director or executive via Twilio Voice API.
"""

import sys
from pathlib import Path
from datetime import datetime
import json
import logging

ROOT_DIR = Path(__file__).resolve().parent.parent
if str(ROOT_DIR) not in sys.path:
    sys.path.insert(0, str(ROOT_DIR))

if r"C:\coding\python-packages" not in sys.path:
    sys.path.insert(0, r"C:\coding\python-packages")

from .config import load_twilio_config, BASE_DIR
from .speech_script import build_executive_speech_text, generate_twiml

logger = logging.getLogger(__name__)

CALL_LOGS_DIR = BASE_DIR / "data" / "call_logs"
CALL_LOGS_DIR.mkdir(parents=True, exist_ok=True)

def preview_call_speech(date_str: str = None) -> dict:
    """
    Returns the speech text, metadata, and generated TwiML XML
    without dialing any phone number.
    """
    cfg = load_twilio_config()
    speech_text, meta = build_executive_speech_text(date_str)
    twiml = generate_twiml(speech_text, voice=cfg["TWILIO_VOICE"], language=cfg["TWILIO_LANGUAGE"])
    
    return {
        "date": meta["date"],
        "spoken_date": meta["spoken_date"],
        "speech_text": speech_text,
        "metadata": meta,
        "twiml": twiml,
        "voice": cfg["TWILIO_VOICE"],
        "language": cfg["TWILIO_LANGUAGE"],
        "configured_recipient": cfg["EXECUTIVE_CALL_RECIPIENT"],
        "is_configured": cfg["IS_CONFIGURED"]
    }

def trigger_executive_briefing_call(
    to_phone: str = None,
    date_str: str = None
) -> dict:
    """
    Initiates an automated outbound phone call with the Executive AI Briefing.
    If Twilio credentials are not configured, returns safe status with speech preview.
    """
    cfg = load_twilio_config()
    target_phone = (to_phone or cfg["EXECUTIVE_CALL_RECIPIENT"] or "").strip()

    # 1. Build speech and TwiML
    speech_text, meta = build_executive_speech_text(date_str)
    twiml_xml = generate_twiml(speech_text, voice=cfg["TWILIO_VOICE"], language=cfg["TWILIO_LANGUAGE"])

    # 2. Check phone number
    if not target_phone:
        return {
            "success": False,
            "status": "MISSING_PHONE_NUMBER",
            "error": "Recipient phone number is required (e.g. +919876543210).",
            "speech_preview": speech_text
        }

    # Ensure phone number has international format e.g. +91
    if not target_phone.startswith("+"):
        if len(target_phone) == 10:
            target_phone = f"+91{target_phone}"
        else:
            target_phone = f"+{target_phone}"

    # 3. Check Twilio Credentials
    if not cfg["IS_CONFIGURED"]:
        return {
            "success": False,
            "status": "TWILIO_NOT_CONFIGURED",
            "message": "Twilio credentials (TWILIO_ACCOUNT_SID, TWILIO_AUTH_TOKEN, TWILIO_PHONE_NUMBER) are not yet configured in .env.",
            "recipient": target_phone,
            "speech_preview": speech_text,
            "date": meta["date"]
        }

    # 4. Dispatch Call via Twilio
    try:
        from twilio.rest import Client

        client = Client(cfg["TWILIO_ACCOUNT_SID"], cfg["TWILIO_AUTH_TOKEN"])

        call = client.calls.create(
            to=target_phone,
            from_=cfg["TWILIO_PHONE_NUMBER"],
            twiml=twiml_xml
        )

        call_record = {
            "call_sid": call.sid,
            "status": call.status,
            "recipient": target_phone,
            "from_number": cfg["TWILIO_PHONE_NUMBER"],
            "timestamp": datetime.now().isoformat(),
            "speech_text": speech_text
        }

        # Log call history
        log_file = CALL_LOGS_DIR / f"call_{datetime.now().strftime('%Y%m%d_%H%M%S')}_{call.sid}.json"
        with open(log_file, "w", encoding="utf-8") as f:
            json.dump(call_record, f, indent=2)

        return {
            "success": True,
            "status": "CALL_INITIATED",
            "call_sid": call.sid,
            "recipient": target_phone,
            "initial_status": call.status,
            "speech_preview": speech_text
        }

    except Exception as e:
        logger.error(f"Twilio Voice Call dispatch error: {e}")
        return {
            "success": False,
            "status": "TWILIO_DISPATCH_ERROR",
            "error": str(e),
            "recipient": target_phone,
            "speech_preview": speech_text
        }

if __name__ == "__main__":
    import argparse
    parser = argparse.ArgumentParser(description="Trigger Executive Voice Call")
    parser.add_argument("--to", help="Target phone number (e.g. +919876543210)", default=None)
    parser.add_argument("--date", help="Briefing date (YYYY-MM-DD)", default=None)
    parser.add_argument("--script-only", action="store_true", help="Print speech script only without dialing")
    args = parser.parse_args()

    if args.script_only:
        preview = preview_call_speech(args.date)
        print("=" * 60)
        print("EXECUTIVE VOICE SCRIPT PREVIEW:")
        print("=" * 60)
        print(preview["speech_text"])
        print("=" * 60)
    else:
        res = trigger_executive_briefing_call(args.to, args.date)
        print("Call Dispatch Result:", json.dumps(res, indent=2))
