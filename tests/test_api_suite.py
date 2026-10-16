"""
Backend Automated Test Suite for MD Executive Agent
Tests:
1. System & Scheduler Online Health
2. Date-Wise Telemetry Snapshots (Today & Historical dates)
3. Calendar, Meetings & Routine APIs
"""

import sys
if r"C:\coding\python-packages" not in sys.path:
    sys.path.insert(0, r"C:\coding\python-packages")

import urllib.request
import json
import time

BASE_URL = "http://127.0.0.1:8000"

def test_endpoint(name: str, path: str):
    url = f"{BASE_URL}{path}"
    t0 = time.time()
    try:
        req = urllib.request.Request(url, headers={"User-Agent": "TestRunner/1.0"})
        with urllib.request.urlopen(req, timeout=10) as resp:
            status = resp.status
            data = json.loads(resp.read().decode('utf-8'))
            ms = int((time.time() - t0) * 1000)
            return True, status, ms, data
    except Exception as e:
        ms = int((time.time() - t0) * 1000)
        return False, str(e), ms, None

def run_tests():
    print("\n" + "=" * 70)
    print(">> [BACKEND] MD EXECUTIVE AGENT - API TEST SUITE")
    print("=" * 70)

    # 1. Core Health & Scheduler
    print("\n[PHASE 1] System & Scheduler Health")
    print("-" * 50)
    ok, st, ms, data = test_endpoint("System Status", "/api/status")
    if ok and data.get("status") == "online":
        sched = data.get("scheduler", {})
        print(f"  [PASS] /api/status -> ONLINE ({ms}ms)")
        print(f"         Scheduler Running: {sched.get('running')}")
        print(f"         Scheduled Alarm  : {sched.get('schedule_time')}")
        print(f"         Next Run Time    : {sched.get('next_run_time')}")
    else:
        print(f"  [FAIL] /api/status: {st}")

    # 2. Date-Wise Telemetry Tests
    test_dates = ["2026-10-15", "2026-10-14", "2026-10-12", "2026-10-10"]
    print("\n[PHASE 2] Date-Wise Telemetry Audit APIs")
    print("-" * 50)

    for d in test_dates:
        print(f"\n[DATE TEST] Target Date: {d}")
        endpoints = [
            ("Accounts Summary", f"/api/accounts/summary?date={d}"),
            ("Tickets Summary", f"/api/tickets/summary?date={d}"),
            ("DMR Audit", f"/api/dmr/summary?date={d}"),
            ("52-Week Plan", f"/api/plan/summary?date={d}"),
            ("Audit Drilldown", f"/api/audit/drilldown?date={d}"),
            ("AI Briefing", f"/api/ai/latest-summary?date={d}"),
            ("Day Detail", f"/api/calendar/day-detail?date={d}")
        ]

        for label, ep in endpoints:
            ok, st, ms, resp_data = test_endpoint(label, ep)
            if ok:
                items_count = len(resp_data) if isinstance(resp_data, list) else (len(resp_data.keys()) if isinstance(resp_data, dict) else 1)
                print(f"  [PASS] {label:<18} [{ep}] -> HTTP {st} ({ms}ms) | {items_count} keys/items")
            else:
                print(f"  [FAIL] {label:<18} [{ep}] -> FAILED: {st}")

    # 3. Calendar & Meetings
    print("\n[PHASE 3] Calendar & Executive Meetings")
    print("-" * 50)
    for label, ep in [
        ("Month Overview", "/api/calendar/month-summary?year=2026&month=10"),
        ("All Meetings", "/api/meetings"),
        ("Common Agenda", "/api/agenda/common"),
        ("Today Checklist", "/api/checklist")
    ]:
        ok, st, ms, resp_data = test_endpoint(label, ep)
        if ok:
            items_count = len(resp_data) if isinstance(resp_data, list) else (len(resp_data.keys()) if isinstance(resp_data, dict) else 1)
            print(f"  [PASS] {label:<18} [{ep}] -> HTTP {st} ({ms}ms) | {items_count} records")
        else:
            print(f"  [FAIL] {label:<18} [{ep}] -> FAILED: {st}")

    print("\n" + "=" * 70)
    print(">> ALL BACKEND API & DATE-WISE TESTS COMPLETE")
    print("=" * 70 + "\n")

if __name__ == "__main__":
    run_tests()
