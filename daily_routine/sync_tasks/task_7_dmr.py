"""
=============================================================================
TASK 7: DMR (DAILY MANAGEMENT REPORTS) AUDIT
=============================================================================
Audits previous day DMR submissions from erp.dmr_documents against active operational sites.
Extracts attachment text and metrics.
Saves clean snapshot to local_db/<YYYY-MM-DD>/task_7_dmr.json.
"""

import sys
from pathlib import Path
import json
from datetime import datetime, time, timedelta
import pymongo

from .common import get_current_date_dir, clean_for_json

def sync_task_7_dmr(client: pymongo.MongoClient) -> dict:
    """
    Task 7: DMR (Daily Management Reports) Audit.
    Strictly READ-ONLY query operations:
    1. Audits yesterday's (previous day) DMR submissions from erp.dmr_documents.
    2. Compares against active operational sites in erp.site to identify:
       - Which sites/FMs submitted DMR on time (with report title & S3 attachment link).
       - Which sites are pending DMR submission.
    3. Analyzes all-time DMR metrics and top historical submitters.
    4. Saves clean snapshot to local_db/<YYYY-MM-DD>/task_7_dmr.json.
    """
    now = datetime.now()
    today_str = now.strftime("%Y-%m-%d")
    date_dir = get_current_date_dir()
    output_file = date_dir / "task_7_dmr.json"

    erp_db = client["erp"]

    # Target: Previous Day (Yesterday)
    yesterday = (now - timedelta(days=1)).date()
    yesterday_str = yesterday.strftime("%Y-%m-%d")
    start_of_yesterday = datetime.combine(yesterday, time.min)
    end_of_yesterday = datetime.combine(yesterday, time.max)
    utc_yesterday_start = start_of_yesterday - timedelta(hours=5, minutes=30)

    # 1. Fetch Active FMS Sites from erp.site
    # Note: DMR (Daily Management Reports) are strictly required ONLY for FMS (Integrated Facility Management Services) sites.
    site_cursor = erp_db["site"].find(
        {"isActive": True},
        {"_id": 0, "unitcode": 1, "siteName": 1, "branchCode": 1, "location": 1, "deployment": 1}
    ).sort("unitcode", 1)

    all_active_sites_count = 0
    fms_sites_map = {}
    fms_sites_list = []
    for s in site_cursor:
        uc = s.get("unitcode")
        if not uc:
            continue
        all_active_sites_count += 1
        deps = s.get("deployment") or []
        # Filter strictly for FMS (Integrated Facility Management Services) sites
        is_fms = any("facility management" in str(d).lower() or "fms" in str(d).lower() for d in deps)
        if not is_fms:
            continue

        uc_clean = str(uc).strip()
        site_info = {
            "unit_code": uc_clean,
            "site_name": s.get("siteName", "Unknown").strip(),
            "branch_code": s.get("branchCode", "N/A"),
            "location": s.get("location", "N/A"),
            "deployment": deps
        }
        fms_sites_map[uc_clean] = site_info
        fms_sites_list.append(site_info)

    # 2. Query DMR submissions (yesterday full-day plus same-day catch-up submissions up to current run time!)
    dmr_cursor = erp_db["dmr_documents"].find({
        "$or": [
            {"date": {"$gte": utc_yesterday_start, "$lte": now}},
            {"date": {"$gte": start_of_yesterday, "$lte": now}},
            {"createdOn": {"$gte": utc_yesterday_start, "$lte": now}},
            {"createdOn": {"$gte": start_of_yesterday, "$lte": now}}
        ]
    }).sort("createdOn", -1)

    submitted_sites_map = {}
    submitted_reports = []

    for doc in dmr_cursor:
        unit_code_raw = doc.get("unitCode") or ""
        unit_code_clean = unit_code_raw.split("-")[0].strip() if "-" in unit_code_raw else unit_code_raw.strip()

        c_on = doc.get("createdOn") or doc.get("date")
        created_str = c_on.isoformat() if isinstance(c_on, datetime) else str(c_on) if c_on else None

        rep_item = {
            "report_id": str(doc.get("_id")),
            "unit_code_raw": unit_code_raw,
            "unit_code": unit_code_clean,
            "employee_number": str(doc.get("employeeNumber", "")).strip(),
            "employee_name": doc.get("employeeName", "Unknown"),
            "designation": doc.get("designation", "FACILITY MANAGER"),
            "title": doc.get("title", "Daily Report"),
            "attachment_name": doc.get("name"),
            "attachment_url": doc.get("url"),
            "is_approved": doc.get("isApproved", True),
            "submitted_at": created_str
        }
        submitted_reports.append(rep_item)
        if unit_code_clean and unit_code_clean not in submitted_sites_map:
            submitted_sites_map[unit_code_clean] = rep_item

    # 3. Classify Active FMS Sites into Submitted vs Pending
    submitted_sites = []
    pending_sites = []

    for s in fms_sites_list:
        uc = s["unit_code"]
        if uc in submitted_sites_map:
            rep = submitted_sites_map[uc]
            submitted_sites.append({
                **s,
                "status": "SUBMITTED",
                "report_title": rep["title"],
                "submitted_by": rep["employee_name"],
                "designation": rep["designation"],
                "attachment_name": rep["attachment_name"],
                "attachment_url": rep["attachment_url"],
                "submitted_at": rep["submitted_at"]
            })
        else:
            pending_sites.append({
                **s,
                "status": "PENDING_DMR",
                "report_title": None,
                "submitted_by": None,
                "attachment_name": None,
                "attachment_url": None,
                "submitted_at": None
            })

    # 4. Historical DMR Metrics
    total_system_dmrs = erp_db["dmr_documents"].count_documents({})

    # All-time submitters summary with their latest submission date
    submitter_agg = erp_db["dmr_documents"].aggregate([
        {
            "$group": {
                "_id": {
                    "emp_no": "$employeeNumber",
                    "name": "$employeeName",
                    "desig": "$designation"
                },
                "total_submissions": {"$sum": 1},
                "latest_submission_date": {"$max": "$date"}
            }
        },
        {"$sort": {"latest_submission_date": -1}}
    ])
    all_time_submitters = []
    for sub in submitter_agg:
        emp_info = sub["_id"]
        l_dt = sub.get("latest_submission_date")
        all_time_submitters.append({
            "employee_number": str(emp_info.get("emp_no", "")).strip(),
            "employee_name": emp_info.get("name", "Unknown"),
            "designation": emp_info.get("desig", "Unknown"),
            "total_all_time_submissions": sub["total_submissions"],
            "last_submitted_date": l_dt.isoformat() if isinstance(l_dt, datetime) else str(l_dt) if l_dt else None
        })

    # Download & Extract attachments ONLY if reports were actually submitted for yesterday!
    from daily_routine.report_extractor import process_and_extract_file, get_extracted_reports_dir
    extracted_manifest = []
    if submitted_reports:
        raw_dir, data_dir = get_extracted_reports_dir(today_str)
        for rep in submitted_reports:
            url = rep.get("attachment_url")
            fn = rep.get("attachment_name")
            if url:
                meta = {
                    "unit_code": rep.get("unit_code"),
                    "employee_name": rep.get("employee_name"),
                    "title": rep.get("title")
                }
                ext_res = process_and_extract_file(url, fn, meta, today_str)
                rep["local_raw_path"] = ext_res.get("local_raw_path")
                rep["local_extracted_json_path"] = ext_res.get("local_extracted_json_path")
                if ext_res.get("local_extracted_json_path"):
                    extracted_manifest.append(rep)

        if extracted_manifest:
            manifest_path = raw_dir.parent / "manifest.json"
            with open(manifest_path, "w", encoding="utf-8") as f:
                json.dump({
                    "date": today_str,
                    "audit_target_date": yesterday_str,
                    "total_extracted_reports": len(extracted_manifest),
                    "reports": extracted_manifest
                }, f, indent=2, ensure_ascii=False)

    final_payload = {
        "task_id": 7,
        "task_name": "DMR (Daily Management Reports) Audit",
        "date": today_str,
        "audit_target_date": yesterday_str,
        "current_run_time": now.strftime("%Y-%m-%d %I:%M %p"),
        "audit_window_start": start_of_yesterday.strftime("%Y-%m-%d 00:00:00"),
        "audit_window_end": now.strftime("%Y-%m-%d %H:%M:%S"),
        "audit_description": f"Auditing previous day ({yesterday_str}) DMRs plus same-day catch-up submissions up to {now.strftime('%I:%M %p')}",
        "metrics": {
            "total_fms_sites": len(fms_sites_list),
            "total_active_sites": len(fms_sites_list),  # Kept as total FMS sites for downstream compatibility
            "total_all_active_sites_all_types": all_active_sites_count,
            "submitted_sites_yesterday": len(submitted_sites),
            "pending_sites_yesterday": len(pending_sites),
            "compliance_percent": round((len(submitted_sites) / len(fms_sites_list) * 100), 2) if fms_sites_list else 0.0,
            "total_dmr_documents_all_time": total_system_dmrs,
            "total_reports_in_window": len(submitted_reports)
        },
        "submitted_sites": submitted_sites,
        "pending_sites": pending_sites,
        "all_submitted_reports_yesterday": submitted_reports,
        "all_time_submitters_summary": all_time_submitters
    }

    with open(output_file, "w", encoding="utf-8") as f:
        json.dump(final_payload, f, indent=2, ensure_ascii=False)

    print(f"[SYNC SUCCESS] Task 7 DMR saved to: {output_file}")
    return final_payload
