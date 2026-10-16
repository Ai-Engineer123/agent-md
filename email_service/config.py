"""
=============================================================================
EMAIL SERVICE CONFIGURATION
=============================================================================
Manages SMTP settings, authentication credentials, and default sender info.
Loads automatically from .env or environment variables.
"""

import os
from pathlib import Path

BASE_DIR = Path(__file__).resolve().parent.parent

def load_smtp_config():
    """Dynamically re-reads .env so credential edits take effect immediately."""
    _env_file = BASE_DIR / ".env"
    if _env_file.exists():
        with open(_env_file, "r", encoding="utf-8") as _f:
            for _line in _f:
                _line = _line.strip()
                if _line and not _line.startswith("#") and "=" in _line:
                    _k, _v = _line.split("=", 1)
                    _k, _v = _k.strip(), _v.strip()
                    os.environ[_k] = _v

    return {
        "SMTP_HOST": os.getenv("SMTP_HOST", "smtp.gmail.com"),
        "SMTP_PORT": int(os.getenv("SMTP_PORT", "587")),
        "SMTP_USE_SSL": os.getenv("SMTP_USE_SSL", "false").lower() in ("true", "1", "yes"),
        "SMTP_USER": os.getenv("SMTP_USER", "").strip(),
        "SMTP_PASSWORD": os.getenv("SMTP_PASSWORD", "").strip(),
        "SENDER_NAME": os.getenv("SENDER_NAME", "VTS Executive AI Agent"),
        "SENDER_EMAIL": os.getenv("SENDER_EMAIL", "").strip() or os.getenv("SMTP_USER", "").strip() or "reports@vipras.in",
        "DEFAULT_RECIPIENT": os.getenv("DEFAULT_RECIPIENT", "").strip()
    }

# Initial module load
_cfg = load_smtp_config()
SMTP_HOST = _cfg["SMTP_HOST"]
SMTP_PORT = _cfg["SMTP_PORT"]
SMTP_USE_SSL = _cfg["SMTP_USE_SSL"]
SMTP_USER = _cfg["SMTP_USER"]
SMTP_PASSWORD = _cfg["SMTP_PASSWORD"]
SENDER_NAME = _cfg["SENDER_NAME"]
SENDER_EMAIL = _cfg["SENDER_EMAIL"]
DEFAULT_RECIPIENT = _cfg["DEFAULT_RECIPIENT"]

