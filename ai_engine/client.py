"""
=============================================================================
UNIVERSAL OLLAMA / LLM CLIENT
=============================================================================
Standalone, decoupled AI client supporting:
- Ollama local & remote cloud endpoints (/api/generate, /api/chat)
- OpenAI-compatible endpoints (/v1/chat/completions)
- Configurable model, temperature, timeout, and API keys.
"""

import sys
from pathlib import Path

ROOT_DIR = Path(__file__).resolve().parent.parent
if str(ROOT_DIR) not in sys.path:
    sys.path.insert(0, str(ROOT_DIR))

if r"C:\coding\python-packages" not in sys.path:
    sys.path.insert(0, r"C:\coding\python-packages")

import os
import json
import urllib.request
import urllib.error
from typing import Optional, Dict, Any
from dotenv import load_dotenv

load_dotenv()

DEFAULT_OLLAMA_HOST = os.getenv("OLLAMA_HOST", "https://ollama.com").rstrip("/")
DEFAULT_OLLAMA_MODEL = os.getenv("OLLAMA_MODEL", "gpt-oss:120b")
DEFAULT_OLLAMA_API_KEY = os.getenv("OLLAMA_API_KEY", "7c368832480741f0bf0e38700fc164e9.cyWjm8tTu3G2xtA9LgBL4Ein")

class OllamaClient:
    """Universal client for interacting with Ollama and compatible LLM providers."""

    def __init__(self, host: str = None, model: str = None, api_key: str = None):
        self.host = (host or DEFAULT_OLLAMA_HOST).rstrip("/")
        self.model = model or DEFAULT_OLLAMA_MODEL
        self.api_key = api_key or DEFAULT_OLLAMA_API_KEY

    def list_models(self, timeout: int = 10) -> list:
        """Returns list of models available in Ollama."""
        try:
            url = f"{self.host}/api/tags"
            req = urllib.request.Request(url, headers=self._get_headers())
            with urllib.request.urlopen(req, timeout=timeout) as res:
                data = json.loads(res.read().decode("utf-8"))
                return [m.get("name") for m in data.get("models", [])]
        except Exception as e:
            return []

    def generate(self, prompt: str, system_prompt: str = None, temperature: float = 0.3, timeout: int = 120) -> Dict[str, Any]:
        """
        Sends generation request to Ollama /api/generate or /api/chat.
        Returns dict with status, response, model, and metadata.
        """
        payload = {
            "model": self.model,
            "prompt": prompt,
            "stream": False,
            "options": {
                "temperature": temperature
            }
        }
        if system_prompt:
            payload["system"] = system_prompt

        url = f"{self.host}/api/generate"
        headers = self._get_headers()

        try:
            req_data = json.dumps(payload).encode("utf-8")
            req = urllib.request.Request(url, data=req_data, headers=headers)
            with urllib.request.urlopen(req, timeout=timeout) as res:
                data = json.loads(res.read().decode("utf-8"))
                return {
                    "success": True,
                    "response": data.get("response", ""),
                    "model": data.get("model", self.model),
                    "total_duration": data.get("total_duration"),
                    "eval_count": data.get("eval_count")
                }
        except urllib.error.HTTPError as e:
            error_body = ""
            try:
                error_body = e.read().decode("utf-8")
            except Exception:
                pass
            return {
                "success": False,
                "error": f"HTTP {e.code}: {e.reason}",
                "error_details": error_body,
                "model": self.model,
                "host": self.host
            }
        except Exception as e:
            return {
                "success": False,
                "error": str(e),
                "model": self.model,
                "host": self.host
            }

    def _get_headers(self) -> dict:
        headers = {
            "Content-Type": "application/json",
            "User-Agent": "ollama/0.5.0"
        }
        if self.api_key:
            headers["Authorization"] = f"Bearer {self.api_key}"
        return headers
