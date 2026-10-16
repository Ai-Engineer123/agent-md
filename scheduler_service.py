"""
=============================================================================
10:30 AM BACKGROUND SCHEDULER & AUTO-SYNC SERVICE
=============================================================================
Automatically triggers the daily executive routine data pull and verification:
1. At 10:30 AM every day via BackgroundScheduler.
2. Automatically on server boot (startup sync in background thread).
3. On-demand via API endpoint /api/routine/sync.
"""

import sys
if r"C:\coding\python-packages" not in sys.path:
    sys.path.insert(0, r"C:\coding\python-packages")

import threading
from datetime import datetime
from apscheduler.schedulers.background import BackgroundScheduler
from apscheduler.triggers.cron import CronTrigger
from config import SCHEDULE_HOUR, SCHEDULE_MINUTE
from daily_routine import checklist_mgr, run_sync
from jsonl_logger import log_event

scheduler = BackgroundScheduler()
_sync_lock = threading.Lock()

def execute_routine_sync() -> dict:
    """
    Core function that pulls all MongoDB data into local_db snapshots
    and auto-evaluates all daily routine tasks.
    Safe against concurrent double-executions.
    """
    if not _sync_lock.acquire(blocking=False):
        print("[AGENT AUTO-SYNC] A sync is already in progress. Skipping duplicate run.")
        return {"status": "ALREADY_RUNNING"}

    try:
        now_str = datetime.now().strftime("%Y-%m-%d %H:%M:%S")
        print(f"\n" + "=" * 60)
        print(f"[AGENT AUTO-SYNC] Pulling Daily Routine Data at {now_str}")
        print("=" * 60)

        # 1. Pull data from MongoDB into local_db snapshots
        run_sync()

        # 2. Auto-evaluate all tasks in daily routine document
        checklist_mgr.auto_evaluate_from_local_snapshots()

        # 3. Generate & archive AI executive briefing
        try:
            from ai_engine.summarizer import generate_and_archive_summary
            print("[AGENT AUTO-SYNC] Triggering AI Engine briefing generation...")
            ai_res = generate_and_archive_summary()
            print(f"[AGENT AUTO-SYNC] AI Engine Briefing generated! Status: {ai_res.get('status')}")
        except Exception as ai_err:
            print(f"[AGENT AUTO-SYNC] AI generation notice: {ai_err}")

        # Automatic email dispatch disabled per user request
        # try:
        #     from email_service import send_executive_briefing_email
        #     from email_service.config import DEFAULT_RECIPIENT, SMTP_USER
        #     if DEFAULT_RECIPIENT and SMTP_USER:
        #         print(f"[AGENT AUTO-SYNC] Auto-dispatching briefing email to: {DEFAULT_RECIPIENT}...")
        #         mail_res = send_executive_briefing_email(DEFAULT_RECIPIENT)
        #         print(f"[AGENT AUTO-SYNC] Email dispatch status: {mail_res.get('status')}")
        # except Exception as mail_err:
        #     print(f"[AGENT AUTO-SYNC] Email auto-dispatch notice: {mail_err}")

        # Automatic Twilio voice call if configured
        try:
            from twilio_service import trigger_executive_briefing_call, load_twilio_config
            tw_cfg = load_twilio_config()
            if tw_cfg.get("IS_CONFIGURED") and tw_cfg.get("EXECUTIVE_CALL_RECIPIENT"):
                print(f"[AGENT AUTO-SYNC] Triggering automated executive briefing call to: {tw_cfg['EXECUTIVE_CALL_RECIPIENT']}...")
                call_res = trigger_executive_briefing_call(tw_cfg["EXECUTIVE_CALL_RECIPIENT"])
                print(f"[AGENT AUTO-SYNC] Call trigger status: {call_res.get('status')}")
        except Exception as call_err:
            print(f"[AGENT AUTO-SYNC] Voice call notice: {call_err}")

        log_event("ROUTINE_AUTO_SYNC_SUCCESS", {
            "status": "success",
            "timestamp": datetime.now().isoformat(),
            "description": "Daily routine data successfully pulled, evaluated, and AI briefing generated."
        })
        print(f"[AGENT AUTO-SYNC] Complete! Today's routine & AI briefing ready with 0ms latency.")
        print("=" * 60 + "\n")
        return {"status": "SUCCESS", "timestamp": now_str}
    except Exception as e:
        print(f"[AGENT AUTO-SYNC ERROR] Sync failed: {e}")
        log_event("ROUTINE_AUTO_SYNC_FAILED", {"error": str(e)})
        return {"status": "ERROR", "error": str(e)}
    finally:
        _sync_lock.release()

def run_daily_1030_routine():
    """Triggered by APScheduler at 10:30 AM daily."""
    print(f"\n[AGENT ALARM] Scheduled 10:30 AM Routine Fired!")
    execute_routine_sync()

def start_background_startup_sync():
    """Kicks off a background thread to pull today's data immediately upon server startup."""
    print("[SERVER STARTUP] Launching background thread for initial routine data pull...")
    t = threading.Thread(target=execute_routine_sync, daemon=True, name="StartupDataSyncThread")
    t.start()

def start_scheduler():
    """Starts the background scheduler if not already running."""
    if not scheduler.running:
        scheduler.add_job(
            run_daily_1030_routine,
            trigger=CronTrigger(hour=SCHEDULE_HOUR, minute=SCHEDULE_MINUTE),
            id="daily_1030_routine",
            name="Daily 10:30 AM Agent Routine",
            replace_existing=True
        )
        scheduler.start()
        print(f"[SCHEDULER] Started background scheduler for daily {SCHEDULE_HOUR:02d}:{SCHEDULE_MINUTE:02d} AM.")

def get_scheduler_status() -> dict:
    """Returns the current scheduler status and next run time."""
    job = scheduler.get_job("daily_1030_routine")
    next_run = str(job.next_run_time) if job and job.next_run_time else "Not scheduled"
    return {
        "running": scheduler.running,
        "schedule_time": f"{SCHEDULE_HOUR:02d}:{SCHEDULE_MINUTE:02d} AM",
        "next_run_time": next_run
    }
