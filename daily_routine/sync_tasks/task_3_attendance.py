"""
=============================================================================
TASK 3: HEAD OFFICE & COMPANY IN-CHARGES ATTENDANCE & LEAVE AUDIT
=============================================================================
1. Head Office Morning Attendance (UC001-HEAD OFFICE)
   Queries active employees, today's check-ins, and leave_management.
   Saves to local_db/<current_date>/task_3_head_office_attendance.json.

2. Company In-charges Attendance & Leave Audit across 5 companies:
   VFM, CC, Enterprises, Profox (Primary ERP), and VTS (VTS ERP).
   Saves to local_db/<current_date>/task_3_company_incharges.json.
"""

import sys
from pathlib import Path
import json
from datetime import datetime, time, timedelta
import pymongo

from .common import get_current_date_dir, clean_for_json

# Company in-charges mapping per user specification
COMPANY_INCHARGES_CONFIG = {
    "VFM": {
        "db_source": "primary_erp",
        "incharges": [2, 18065, 19751, 10621]
    },
    "CC": {
        "db_source": "primary_erp",
        "incharges": [9558, 3965]
    },
    "Enterprises": {
        "db_source": "primary_erp",
        "incharges": [11019, 2]
    },
    "profox": {
        "db_source": "primary_erp",
        "incharges": [14928, 15761]
    },
    "VTS": {
        "db_source": "vts_vipras_plus",
        "incharges": ["VTS002", "VTS004"]
    }
}

def sync_task_3_head_office_attendance(client: pymongo.MongoClient) -> dict:
    """
    Task 3 (Head Office):
    Queries erp -> erp-attendance-checkInOut for all employees at 'UC001-HEAD OFFICE',
    verifies leave status from erp -> leave_management,
    and determines who is PRESENT, ON_LEAVE, or NOT_CHECKED_IN today.
    Saves the result to local_db/<current_date>/task_3_head_office_attendance.json.
    """
    now = datetime.now()
    today_str = now.strftime("%Y-%m-%d")
    date_dir = get_current_date_dir()
    output_file = date_dir / "task_3_head_office_attendance.json"

    # Define current day range
    start_of_day = datetime.combine(now.date(), time.min)
    end_of_day = datetime.combine(now.date(), time.max)
    utc_start = start_of_day - timedelta(hours=5, minutes=30)

    erp_db = client["erp"]
    attendance_col = erp_db["erp-attendance-checkInOut"]

    # 1. Fetch strictly active staff assigned to UC001-HEAD OFFICE from erp.employee
    active_employees_cursor = erp_db["employee"].find(
        {"isActive": True, "siteCodeWithName": "UC001-HEAD OFFICE"},
        {
            "_id": 0,
            "employeeNumber": 1,
            "employeeName": 1,
            "role": 1,
            "designation": 1
        }
    ).sort("employeeName", 1)

    staff_registry = {}
    active_emp_lookup = {}

    for emp in active_employees_cursor:
        emp_no = emp.get("employeeNumber")
        if emp_no is None:
            continue
        emp_key = str(emp_no).strip()
        role_label = emp.get("role") or emp.get("designation") or "EMPLOYEE"
        staff_registry[emp_key] = {
            "employee_number": emp_no,
            "employee_name": emp.get("employeeName", "Unknown").strip(),
            "role": role_label,
            "last_known_checkin": None
        }
        active_emp_lookup[emp_no] = emp_key
        active_emp_lookup[emp_key] = emp_key

    # 2. Fetch check-in records for Head Office to match today's attendance & latest check-ins
    chk_cursor = attendance_col.find(
        {"siteCodeWithName": "UC001-HEAD OFFICE"},
        {
            "_id": 0,
            "employeeNumber": 1,
            "employeeName": 1,
            "role": 1,
            "checkInTime": 1,
            "checkOutTime": 1,
            "totalWorkingHours": 1,
            "createdOn": 1
        }
    ).sort("checkInTime", -1)

    today_checkins_map = {}

    for doc in chk_cursor:
        raw_emp_no = doc.get("employeeNumber")
        if raw_emp_no is None:
            continue
        canonical_key = active_emp_lookup.get(raw_emp_no) or active_emp_lookup.get(str(raw_emp_no).strip())
        if not canonical_key or canonical_key not in staff_registry:
            continue

        chk_time = doc.get("checkInTime") or doc.get("createdOn")

        # Record latest known check-in for this active staff member
        if staff_registry[canonical_key]["last_known_checkin"] is None and chk_time:
            staff_registry[canonical_key]["last_known_checkin"] = chk_time

        # Check if record belongs to today
        if chk_time and utc_start <= chk_time <= end_of_day:
            if canonical_key not in today_checkins_map:
                today_checkins_map[canonical_key] = doc

    # 3. Check if any Head Office staff has an active approved/pending leave for today
    today_start_raw = datetime.combine(now.date(), time.min)
    today_leaves_map = {}
    if "leave_management" in erp_db.list_collection_names():
        leave_cursor = erp_db["leave_management"].find({
            "$or": [
                {"date": {"$gte": today_start_raw, "$lte": end_of_day}},
                {"startDate": {"$lte": end_of_day}, "endDate": {"$gte": today_start_raw}},
                {"fromDate": {"$lte": end_of_day}, "toDate": {"$gte": today_start_raw}}
            ]
        })
        for l_doc in leave_cursor:
            emp_val = l_doc.get("employeeId") or l_doc.get("employeeNumber")
            if emp_val is not None:
                c_key = active_emp_lookup.get(emp_val) or active_emp_lookup.get(str(emp_val).strip())
                if c_key and (l_doc.get("status") in ["APPROVED", "PENDING", None] or not l_doc.get("status")):
                    today_leaves_map[c_key] = l_doc

    # 4. Build attendance list for active Head Office staff
    attendance_list = []
    present_count = 0
    on_leave_count = 0

    for emp_key, profile in staff_registry.items():
        if emp_key in today_checkins_map:
            record = today_checkins_map[emp_key]
            present_count += 1
            attendance_list.append({
                "employee_number": profile["employee_number"],
                "employee_name": profile["employee_name"],
                "role": profile["role"],
                "status": "PRESENT",
                "check_in_time": record.get("checkInTime").isoformat() if isinstance(record.get("checkInTime"), datetime) else str(record.get("checkInTime")),
                "check_out_time": record.get("checkOutTime").isoformat() if isinstance(record.get("checkOutTime"), datetime) else str(record.get("checkOutTime")) if record.get("checkOutTime") else None,
                "working_hours": record.get("totalWorkingHours")
            })
        elif emp_key in today_leaves_map:
            l_rec = today_leaves_map[emp_key]
            on_leave_count += 1
            last_dt = profile.get("last_known_checkin")
            last_str = last_dt.isoformat() if isinstance(last_dt, datetime) else str(last_dt) if last_dt else None
            attendance_list.append({
                "employee_number": profile["employee_number"],
                "employee_name": profile["employee_name"],
                "role": profile["role"],
                "status": "ON_LEAVE",
                "check_in_time": None,
                "check_out_time": None,
                "last_known_checkin": last_str,
                "leave_details": {
                    "leave_type": l_rec.get("leaveType", "LEAVE"),
                    "reason": l_rec.get("reason", "On Leave"),
                    "status": l_rec.get("status", "APPROVED")
                }
            })
        else:
            last_dt = profile.get("last_known_checkin")
            last_str = last_dt.isoformat() if isinstance(last_dt, datetime) else str(last_dt) if last_dt else None
            attendance_list.append({
                "employee_number": profile["employee_number"],
                "employee_name": profile["employee_name"],
                "role": profile["role"],
                "status": "NOT_CHECKED_IN",
                "check_in_time": None,
                "check_out_time": None,
                "last_known_checkin": last_str
            })

    # Sort attendance list: PRESENT first, ON_LEAVE second, NOT_CHECKED_IN third, then alphabetically by name
    def sort_order(status):
        if status == "PRESENT":
            return 0
        if status == "ON_LEAVE":
            return 1
        return 2

    attendance_list.sort(key=lambda x: (sort_order(x["status"]), x["employee_name"]))

    result = {
        "task_id": 3,
        "task_name": "Head Office Morning Attendance",
        "date": today_str,
        "site_code": "UC001",
        "site_name": "HEAD OFFICE",
        "total_staff": len(staff_registry),
        "present_count": present_count,
        "on_leave_count": on_leave_count,
        "not_checked_in_count": len(staff_registry) - present_count - on_leave_count,
        "staff_attendance": attendance_list
    }

    # Write clean JSON into local_db/<current_date>/task_3_head_office_attendance.json
    with open(output_file, "w", encoding="utf-8") as f:
        json.dump(result, f, indent=2, ensure_ascii=False)

    print(f"[SYNC SUCCESS] Task 3 Head Office Attendance saved to: {output_file}")
    return result

def sync_task_3_company_incharges(primary_client: pymongo.MongoClient, vts_client: pymongo.MongoClient) -> dict:
    """
    Task 3 (In-charges):
    Queries attendance and leave status for company in-charges across:
      - Primary ERP: VFM (2, 18065, 19751, 10621), CC (9558, 3965), Enterprises (11019, 2), profox (14928, 15761)
      - VTS ERP: VTS (VTS002, VTS004)
    Saves the result to local_db/<current_date>/task_3_company_incharges.json
    """
    now = datetime.now()
    today_str = now.strftime("%Y-%m-%d")
    date_dir = get_current_date_dir()
    output_file = date_dir / "task_3_company_incharges.json"

    # Current day bounds (IST window: from 00:00:00 to 23:59:59)
    start_of_day = datetime.combine(now.date(), time.min) - timedelta(hours=5, minutes=30)
    end_of_day = datetime.combine(now.date(), time.max)
    today_start_raw = datetime.combine(now.date(), time.min)

    companies_result = {}
    total_incharges = 0
    total_present = 0
    total_leave = 0
    total_not_checked_in = 0

    for company_name, config in COMPANY_INCHARGES_CONFIG.items():
        is_vts = config["db_source"] == "vts_vipras_plus"
        target_db = vts_client["vipras_plus"] if is_vts else primary_client["erp"]
        incharges_list = config["incharges"]

        company_incharges_data = []
        comp_present = 0
        comp_leave = 0
        comp_not_checked = 0

        for emp_id in incharges_list:
            total_incharges += 1

            # 1. Match employee in attendance collection
            emp_filter = {"$or": [{"employeeNumber": emp_id}, {"employeeNumber": str(emp_id)}]}
            if isinstance(emp_id, int):
                emp_filter["$or"].append({"employeeNumber": emp_id})

            # Check if checked in today
            today_query = {
                "$and": [
                    emp_filter,
                    {
                        "$or": [
                            {"checkInTime": {"$gte": start_of_day, "$lte": end_of_day}},
                            {"createdOn": {"$gte": start_of_day, "$lte": end_of_day}}
                        ]
                    }
                ]
            }
            chk_today = target_db["erp-attendance-checkInOut"].find_one(today_query, sort=[("checkInTime", -1)])

            # Get general profile / latest checkin
            latest_chk = target_db["erp-attendance-checkInOut"].find_one(emp_filter, sort=[("checkInTime", -1)])
            emp_profile = target_db["employee"].find_one(emp_filter) if "employee" in target_db.list_collection_names() else None

            emp_name = (chk_today or latest_chk or emp_profile or {}).get("employeeName", f"Emp #{emp_id}")
            role = (chk_today or latest_chk or emp_profile or {}).get("role", "INCHARGE")

            # 2. Check if employee is on leave today
            leave_record = None
            if "leave_management" in target_db.list_collection_names():
                leave_filter = {
                    "$and": [
                        {"$or": [{"employeeId": emp_id}, {"employeeId": str(emp_id)}, {"employeeNumber": emp_id}, {"employeeNumber": str(emp_id)}]},
                        {
                            "$or": [
                                {"date": {"$gte": today_start_raw, "$lte": end_of_day}},
                                {"startDate": {"$lte": end_of_day}, "endDate": {"$gte": today_start_raw}},
                                {"fromDate": {"$lte": end_of_day}, "toDate": {"$gte": today_start_raw}}
                            ]
                        }
                    ]
                }
                leave_record = target_db["leave_management"].find_one(leave_filter, sort=[("date", -1)])

            # 3. Determine status
            status = "NOT_CHECKED_IN"
            check_in_time = None
            check_out_time = None
            leave_details = None

            if chk_today:
                status = "PRESENT"
                comp_present += 1
                total_present += 1
                chk_in_dt = chk_today.get("checkInTime") or chk_today.get("createdOn")
                check_in_time = chk_in_dt.isoformat() if isinstance(chk_in_dt, datetime) else str(chk_in_dt)
                chk_out_dt = chk_today.get("checkOutTime")
                check_out_time = chk_out_dt.isoformat() if isinstance(chk_out_dt, datetime) else str(chk_out_dt) if chk_out_dt else None
            elif leave_record and leave_record.get("status") in ["APPROVED", "PENDING", None]:
                status = "ON_LEAVE"
                comp_leave += 1
                total_leave += 1
                leave_details = {
                    "leave_type": leave_record.get("leaveType", "LEAVE"),
                    "reason": leave_record.get("reason", "On Leave"),
                    "status": leave_record.get("status", "APPROVED"),
                    "from_date": leave_record.get("fromDate", leave_record.get("startDate")).isoformat() if isinstance(leave_record.get("fromDate", leave_record.get("startDate")), datetime) else str(leave_record.get("fromDate", leave_record.get("startDate"))),
                    "to_date": leave_record.get("toDate", leave_record.get("endDate")).isoformat() if isinstance(leave_record.get("toDate", leave_record.get("endDate")), datetime) else str(leave_record.get("toDate", leave_record.get("endDate")))
                }
            else:
                comp_not_checked += 1
                total_not_checked_in += 1

            last_chk_time = None
            if latest_chk:
                l_dt = latest_chk.get("checkInTime") or latest_chk.get("createdOn")
                last_chk_time = l_dt.isoformat() if isinstance(l_dt, datetime) else str(l_dt) if l_dt else None

            company_incharges_data.append({
                "employee_id": emp_id,
                "employee_name": emp_name,
                "role": role,
                "status": status,
                "check_in_time": check_in_time,
                "check_out_time": check_out_time,
                "last_known_checkin": last_chk_time,
                "leave_details": leave_details
            })

        # Sort company incharges: PRESENT first, then alphabetical
        company_incharges_data.sort(key=lambda x: (0 if x["status"] == "PRESENT" else 1, x["employee_name"]))

        companies_result[company_name] = {
            "company_name": company_name,
            "db_source": config["db_source"],
            "total_incharges": len(incharges_list),
            "present_today": comp_present,
            "on_leave_today": comp_leave,
            "not_checked_in_today": comp_not_checked,
            "incharges": company_incharges_data
        }

    final_payload = {
        "task_id": 3,
        "task_name": "Company In-charges Attendance & Leave Audit",
        "date": today_str,
        "metrics": {
            "total_companies": len(COMPANY_INCHARGES_CONFIG),
            "total_incharges": total_incharges,
            "total_present": total_present,
            "total_on_leave": total_leave,
            "total_not_checked_in": total_not_checked_in
        },
        "companies": companies_result
    }

    # Write clean JSON into local_db/<current_date>/task_3_company_incharges.json
    with open(output_file, "w", encoding="utf-8") as f:
        json.dump(final_payload, f, indent=2, ensure_ascii=False)

    print(f"[SYNC SUCCESS] Task 3 Company Incharges saved to: {output_file}")
    return final_payload
