"""
=============================================================================
TWILIO VOICE CALL SERVICE CONFIGURATION
=============================================================================
Manages Twilio credentials, outbound caller ID, recipient numbers,
and Text-to-Speech (TTS) voice parameters.
Loads dynamically from .env or environment variables.
"""

import os
from pathlib import Path

BASE_DIR = Path(__file__).resolve().parent.parent

def load_twilio_config() -> dict:
    """Dynamically re-reads .env so credential changes take effect immediately."""
    env_file = BASE_DIR / ".env"
    if env_file.exists():
        with open(env_file, "r", encoding="utf-8") as f:
            for line in f:
                line = line.strip()
                if line and not line.startswith("#") and "=" in line:
                    k, v = line.split("=", 1)
                    k, v = k.strip(), v.strip()
                    os.environ[k] = v

    account_sid = os.getenv("TWILIO_ACCOUNT_SID", "").strip()
    auth_token = os.getenv("TWILIO_AUTH_TOKEN", "").strip()
    from_phone = os.getenv("TWILIO_PHONE_NUMBER", "").strip()
    to_phone = os.getenv("EXECUTIVE_CALL_RECIPIENT", os.getenv("DEFAULT_RECIPIENT_PHONE", "")).strip()

    # Voice & Speech synthesis settings
    # Default: Amazon Polly Indian English 'Polly.Aditi' or 'Polly.Raveena'
    voice_name = os.getenv("TWILIO_VOICE", "Polly.Aditi").strip()
    language = os.getenv("TWILIO_LANGUAGE", "en-IN").strip()

    return {
        "TWILIO_ACCOUNT_SID": account_sid,
        "TWILIO_AUTH_TOKEN": auth_token,
        "TWILIO_PHONE_NUMBER": from_phone,
        "EXECUTIVE_CALL_RECIPIENT": to_phone,
        "TWILIO_VOICE": voice_name,
        "TWILIO_LANGUAGE": language,
        "IS_CONFIGURED": bool(account_sid and auth_token and from_phone)
    }

# Quick initial exports
_initial_cfg = load_twilio_config()
TWILIO_ACCOUNT_SID = _initial_cfg["TWILIO_ACCOUNT_SID"]
TWILIO_AUTH_TOKEN = _initial_cfg["TWILIO_AUTH_TOKEN"]
TWILIO_PHONE_NUMBER = _initial_cfg["TWILIO_PHONE_NUMBER"]
EXECUTIVE_CALL_RECIPIENT = _initial_cfg["EXECUTIVE_CALL_RECIPIENT"]
TWILIO_VOICE = _initial_cfg["TWILIO_VOICE"]
TWILIO_LANGUAGE = _initial_cfg["TWILIO_LANGUAGE"]
