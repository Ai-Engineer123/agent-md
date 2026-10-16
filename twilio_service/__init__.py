"""
=============================================================================
TWILIO VOICE CALL SERVICE
=============================================================================
Provides automated voice briefing phone calls to the Managing Director
powered by Twilio Voice & Polly Neural Text-to-Speech.
"""

from .config import load_twilio_config
from .speech_script import build_executive_speech_text, generate_twiml
from .caller import trigger_executive_briefing_call, preview_call_speech

__all__ = [
    "load_twilio_config",
    "build_executive_speech_text",
    "generate_twiml",
    "trigger_executive_briefing_call",
    "preview_call_speech"
]
