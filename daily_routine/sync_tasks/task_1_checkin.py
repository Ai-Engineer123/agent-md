"""
=============================================================================
TASK 1: USER CHECK-IN VERIFICATION
=============================================================================
Queries erp -> erp-attendance-checkInOut for employee 1 (MD) for the current day.
Saves the result to local_db/<current_date>/task_1_checkin.json.
"""

import sys
from pathlib import Path
import json
from datetime import datetime, time, timedelta
import pymongo

from .common import get_current_date_dir, clean_for_json, TARGET_EMPLOYEE_NUMBER

def sync_task_1_user_checkin(client: pymongo.MongoClient, target_employee_number: int = TARGET_EMPLOYEE_NUMBER) -> dict:
    """
    Task 1:
    Queries erp -> erp-attendance-checkInOut for employee 1 (MD) for the current day.
    Saves the result to local_db/<current_date>/task_1_checkin.json
    """
    now = datetime.now()
    today_str = now.strftime("%Y-%m-%d")
    date_dir = get_current_date_dir()
    output_file = date_dir / "task_1_checkin.json"

    # Define current day range (covers IST and UTC time windows)
    start_of_day = datetime.combine(now.date(), time.min)
    end_of_day = datetime.combine(now.date(), time.max)
    # Also 24-hour UTC window for IST timezone (+5:30)
    utc_start = start_of_day - timedelta(hours=5, minutes=30)
    utc_end = end_of_day - timedelta(hours=5, minutes=30)

    erp_db = client["erp"]
    collection = erp_db["erp-attendance-checkInOut"]

    # Query: Match employeeNumber (as integer or string) on current day
    query = {
        "$or": [
            {"employeeNumber": target_employee_number},
            {"employeeNumber": str(target_employee_number)}
        ],
        "$and": [
            {
                "$or": [
                    {"checkInTime": {"$gte": utc_start, "$lte": end_of_day}},
                    {"createdOn": {"$gte": utc_start, "$lte": end_of_day}}
                ]
            }
        ]
    }

    # Find the most recent checkin for today
    doc = collection.find_one(query, sort=[("checkInTime", -1)])

    if doc:
        cleaned_record = clean_for_json(doc)
        result = {
            "task_id": 1,
            "task_name": "User Check-in Verification",
            "date": today_str,
            "checked_in": True,
            "employee_number": target_employee_number,
            "employee_name": cleaned_record.get("employeeName", "S GANESAMOORTHY"),
            "role": cleaned_record.get("role", "ADMIN"),
            "site": cleaned_record.get("siteCodeWithName", "UC001-HEAD OFFICE"),
            "check_in_time": cleaned_record.get("checkInTime"),
            "record": cleaned_record
        }
    else:
        # Not checked in yet today -> fetch latest previous check-in for reference
        latest_prev = collection.find_one(
            {"$or": [{"employeeNumber": target_employee_number}, {"employeeNumber": str(target_employee_number)}]},
            sort=[("checkInTime", -1)]
        )
        prev_cleaned = clean_for_json(latest_prev) if latest_prev else None

        result = {
            "task_id": 1,
            "task_name": "User Check-in Verification",
            "date": today_str,
            "checked_in": False,
            "employee_number": target_employee_number,
            "employee_name": prev_cleaned.get("employeeName", "S GANESAMOORTHY") if prev_cleaned else "Unknown",
            "role": prev_cleaned.get("role", "ADMIN") if prev_cleaned else "ADMIN",
            "status": "NOT_CHECKED_IN_YET_TODAY",
            "last_known_checkin": prev_cleaned.get("checkInTime") if prev_cleaned else None,
            "last_known_site": prev_cleaned.get("siteCodeWithName") if prev_cleaned else None
        }

    # Write clean JSON into local_db/<current_date>/task_1_checkin.json
    with open(output_file, "w", encoding="utf-8") as f:
        json.dump(result, f, indent=2, ensure_ascii=False)

    print(f"[SYNC SUCCESS] Task 1 Check-in data saved to: {output_file}")
    return result
