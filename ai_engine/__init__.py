"""
=============================================================================
AI ENGINE MODULE (UNIVERSAL)
=============================================================================
Universal, decoupled AI layer for Executive Daily Routine Summaries:
- Ollama & LLM Client
- Metric Collector (Tasks 1 to 8)
- Input & Output Archiver into data/ai_reports/<date>.json
"""

from .client import OllamaClient
from .summarizer import (
    collect_routine_metrics,
    build_executive_prompt,
    generate_and_archive_summary,
    get_latest_ai_report
)
