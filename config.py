"""
=============================================================================
GLOBAL CONFIGURATION
=============================================================================
This file stores all global settings, paths, and constants.
You can easily edit these values manually whenever needed.
"""

import os
import sys
from pathlib import Path

# 1. Ensure Python uses packages from C:\coding\python-packages (No .venv needed)
PYTHON_PACKAGES_PATH = r"C:\coding\python-packages"
if PYTHON_PACKAGES_PATH not in sys.path:
    sys.path.insert(0, PYTHON_PACKAGES_PATH)

# 2. Base Directories
BASE_DIR = Path(__file__).resolve().parent
LOGS_DIR = BASE_DIR / "logs"
LOGS_DIR.mkdir(parents=True, exist_ok=True)

# Automatically load .env file if present
_env_file = BASE_DIR / ".env"
if _env_file.exists():
    with open(_env_file, "r", encoding="utf-8") as _f:
        for _line in _f:
            _line = _line.strip()
            if _line and not _line.startswith("#") and "=" in _line:
                _k, _v = _line.split("=", 1)
                _k, _v = _k.strip(), _v.strip()
                if _k and _k not in os.environ:
                    os.environ[_k] = _v

# 3. Schedule Settings
SCHEDULE_HOUR = 10      # 10 AM
SCHEDULE_MINUTE = 30    # 30 Minutes (10:30 AM daily routine)
TIMEZONE = "Asia/Kolkata"
ENABLE_AUTO_STARTUP_AGENT = os.getenv("ENABLE_AUTO_STARTUP_AGENT", "false").lower() in ("true", "1", "yes")

# MD / Admin Identity
MD_EMPLOYEE_NUMBER = 1

# 4. Web Server Settings (Bind to 0.0.0.0 for wireless Flutter mobile device access)
SERVER_HOST = "0.0.0.0"
SERVER_PORT = 8000

# 5. Database Settings (STRICTLY READ-ONLY)
# Actual DB queries will be connected when instructed.
MONGODB_URI = os.getenv(
    "MONGODB_URI",
    "mongodb+srv://faceerp:faceerp@cluster0.kvd3q8j.mongodb.net/?retryWrites=true&w=majority&appName=Cluster0"
)
MONGODB_READ_ONLY = True

VTS_MONGODB_URI = os.getenv(
    "VTS_MONGODB_URI",
    "mongodb+srv://faceerp:faceerp@cluster0.kvd3q8j.mongodb.net/?retryWrites=true&w=majority&appName=Cluster0"
)
VTS_MONGODB_READ_ONLY = True

# 6. Ollama AI Settings
# Cloud Configuration (Preserved for future use - uncomment when needed):
# OLLAMA_HOST = os.getenv("OLLAMA_HOST", "https://ollama.com")
# OLLAMA_MODEL = os.getenv("OLLAMA_MODEL", "gpt-oss:120b")
# OLLAMA_API_KEY = os.getenv("OLLAMA_API_KEY", "7c368832480741f0bf0e38700fc164e9.cyWjm8tTu3G2xtA9LgBL4Ein")

# Local Ollama (Default: Offline & Private):
OLLAMA_HOST = os.getenv("OLLAMA_HOST", "http://127.0.0.1:11434")
OLLAMA_MODEL = os.getenv("OLLAMA_MODEL", "deepseek-r1:8b")
OLLAMA_API_KEY = os.getenv("OLLAMA_API_KEY", "")
