"""
=============================================================================
LOCAL DB SYNC FORWARDER
=============================================================================
Forwarding wrapper to daily_routine.sync_local_db.
"""

from daily_routine.sync_local_db import run_sync

if __name__ == "__main__":
    run_sync()
