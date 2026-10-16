"""
=============================================================================
TASK 5: ACCOUNTS, COLLECTIONS, IMPREST & VFM WORK UPDATES AUDIT
=============================================================================
Syncs Task 5 Accounts & Imprest data into local_db/<YYYY-MM-DD>/task_5_accounts.json.
Strictly READ-ONLY query operations:
1. Collections: erp.collectionExpenses (8-component collection formula)
   - Opening Balance + Client Receipt + Subcontractor Receipt + Cash to Bank
   - OD Receipt + Hand Loan Receipt + Other Receipt + Excess Spend by Imp.Holder
2. Imprest Holder Balances:
   - All-time cumulative balances and duration aging buckets
   - Current Month (October 2026) active advances, bill settlements, and net cash held
3. VFM Website User Work Updates Audit:
   - erp.users vs erp.work_updates for previous day
   - Attachment download & text extraction
"""

import sys
from pathlib import Path
import json
import re
import urllib.parse
from datetime import datetime, time, timedelta
import pymongo
import logging
logger = logging.getLogger(__name__)

from .common import get_current_date_dir, clean_for_json

def clean_html_text(raw_text: str) -> str:
    """Strips HTML tags and normalizes whitespace from rich text descriptions."""
    if not raw_text:
        return ""
    text = re.sub(r"<[^>]+>", " ", str(raw_text))
    text = urllib.parse.unquote(text)
    text = re.sub(r"\s+", " ", text).strip()
    return text

def sync_task_5_accounts(client: pymongo.MongoClient) -> dict:
    """
    Syncs Task 5 Accounts & Imprest data into local_db/<YYYY-MM-DD>/task_5_accounts.json.
    Strictly READ-ONLY query operations.
    """
    now = datetime.now()
    today_str = now.strftime("%Y-%m-%d")
    date_dir = get_current_date_dir()
    output_file = date_dir / "task_5_accounts.json"

    erp_db = client["erp"]

    # 1. Fetch collectionExpenses and enhance current month with live receipt collections
    col_exp_records = list(erp_db["collectionExpenses"].find().sort("createdOn", -1))

    current_month_name = now.strftime("%B-%Y")  # e.g., 'October-2026'

    # 1a. Live Client Receipts from imprest_transaction
    live_client_agg = list(erp_db["imprest_transaction"].aggregate([
        {
            "$match": {
                "month": current_month_name,
                "payType": "CLIENT_RECEIPTS",
                "transactionType": "CREDIT"
            }
        },
        {
            "$group": {
                "_id": None,
                "total": {"$sum": "$credit"}
            }
        }
    ]))
    live_client_receipt = float(live_client_agg[0]["total"] if live_client_agg else 0)

    # 1b. Live Subcontractor & Cash to Bank from subcontractor_list
    month_prefix = now.strftime("%Y-%m")
    all_subs = list(erp_db["subcontractor_list"].find())
    sub_total_rec = 0.0
    cash_to_bank_val = 0.0

    for s in all_subs:
        rad = s.get("receivedAmountDetails") or []
        for r in rad:
            rd_str = str(r.get("receivedDate", ""))
            if month_prefix in rd_str:
                amt = float(r.get("receivedAmount", 0) or 0)
                md_ho = float(r.get("handOverToMD", 0) or 0)
                sub_total_rec += amt
                cash_to_bank_val += md_ho

    live_subcontractor_receipt = sub_total_rec - cash_to_bank_val
    live_cash_to_bank = cash_to_bank_val

    # 1d. Live OD Receipts from imprest_transaction
    live_od_agg = list(erp_db["imprest_transaction"].aggregate([
        {
            "$match": {
                "$or": [
                    {"month": current_month_name},
                    {"date": {"$gte": datetime(now.year, now.month, 1), "$lt": datetime(now.year + (1 if now.month == 12 else 0), 1 if now.month == 12 else now.month + 1, 1)}}
                ],
                "payType": "OD_RECEIPT",
                "transactionType": "CREDIT"
            }
        },
        {
            "$group": {
                "_id": None,
                "total": {"$sum": "$credit"}
            }
        }
    ]))
    live_od_receipt = float(live_od_agg[0]["total"] if live_od_agg else 0)

    # 1e. Live Excess Spend by Imprest Holders in Active Month (where monthly debit > credit)
    live_excess_agg = list(erp_db["imprest_transaction"].aggregate([
        {
            "$match": {
                "imprestholderName": {"$nin": ["", None]},
                "imprestholderId": {"$nin": [0, None]},
                "$or": [
                    {"month": current_month_name},
                    {"date": {"$gte": datetime(now.year, now.month, 1), "$lt": datetime(now.year + (1 if now.month == 12 else 0), 1 if now.month == 12 else now.month + 1, 1)}}
                ]
            }
        },
        {
            "$group": {
                "_id": "$imprestholderId",
                "credit": {"$sum": "$credit"},
                "debit": {"$sum": "$debit"}
            }
        }
    ]))
    live_excess_spend_month = sum(float(h.get("debit", 0) - h.get("credit", 0)) for h in live_excess_agg if float(h.get("debit", 0) or 0) > float(h.get("credit", 0) or 0))

    monthly_collections = []
    total_opening_balance = 0.0
    total_client_receipts = 0.0
    total_subcontractor_receipts = 0.0
    total_cash_to_bank = 0.0
    total_od_receipts = 0.0
    total_hand_loan_receipts = 0.0
    total_other_receipts = 0.0
    total_excess_spend_by_imp_holder = 0.0
    total_collections_all_time = 0.0

    for rec in col_exp_records:
        rec_month = rec.get("month", "Unknown")
        is_current_active_month = (rec_month.lower() == current_month_name.lower())

        op_bal = float(rec.get("openingBalance", 0) or 0)

        # If it's the current active month, use live transactions if they have newer/larger values
        if is_current_active_month and live_client_receipt > 0:
            c_rcpt = max(float(rec.get("clientReceipt", 0) or 0), live_client_receipt)
        else:
            c_rcpt = float(rec.get("clientReceipt", 0) or 0)

        if is_current_active_month and live_subcontractor_receipt > 0:
            s_rcpt = max(float(rec.get("subContractorReceipt", 0) or 0), live_subcontractor_receipt)
        else:
            s_rcpt = float(rec.get("subContractorReceipt", 0) or 0)

        if is_current_active_month and live_cash_to_bank > 0:
            cb_rcpt = max(float(rec.get("cashToBank", 0) or 0), live_cash_to_bank)
        else:
            cb_rcpt = float(rec.get("cashToBank", 0) or 0)

        if is_current_active_month and live_od_receipt > 0:
            od_rcpt = max(float(rec.get("odReceipt", 0) or 0), live_od_receipt)
        else:
            od_rcpt = float(rec.get("odReceipt", 0) or 0)

        hl_rcpt = float(rec.get("handLoan", 0) or rec.get("handLoanReceipt", 0) or 0)
        oth_rcpt = float(rec.get("otherReceipt", 0) or rec.get("investment", 0) or rec.get("dds", 0) or 0)
        excess_spend = live_excess_spend_month if is_current_active_month else float(rec.get("excessSpend", 0) or rec.get("excess_spend", 0) or 0)

        # Full 8-component collection total:
        month_total = op_bal + c_rcpt + s_rcpt + cb_rcpt + od_rcpt + hl_rcpt + oth_rcpt + excess_spend

        total_opening_balance += op_bal
        total_client_receipts += c_rcpt
        total_subcontractor_receipts += s_rcpt
        total_cash_to_bank += cb_rcpt
        total_od_receipts += od_rcpt
        total_hand_loan_receipts += hl_rcpt
        total_other_receipts += oth_rcpt
        total_excess_spend_by_imp_holder += excess_spend
        total_collections_all_time += month_total

        created_dt = rec.get("createdOn")
        created_str = created_dt.isoformat() if isinstance(created_dt, datetime) else str(created_dt) if created_dt else None

        monthly_collections.append({
            "month": rec_month,
            "opening_balance": op_bal,
            "client_receipt": c_rcpt,
            "subcontractor_receipt": s_rcpt,
            "cash_to_bank": cb_rcpt,
            "od_receipt": od_rcpt,
            "hand_loan_receipt": hl_rcpt,
            "other_receipt": oth_rcpt,
            "excess_spend_by_imp_holder": excess_spend,
            "total_collection": month_total,
            "closing_balance": float(rec.get("closingBalance", 0) or 0),
            "created_on": created_str
        })

    latest_month_collection = monthly_collections[0] if monthly_collections else {
        "month": "N/A",
        "opening_balance": 0.0,
        "client_receipt": 0.0,
        "subcontractor_receipt": 0.0,
        "cash_to_bank": 0.0,
        "od_receipt": 0.0,
        "hand_loan_receipt": 0.0,
        "other_receipt": 0.0,
        "excess_spend_by_imp_holder": 0.0,
        "total_collection": 0.0
    }

    # 2. Fetch Imprest Holder Balances
    imprest_pipeline = [
        {
            "$match": {
                "imprestholderName": {"$nin": ["", None]}
            }
        },
        {
            "$group": {
                "_id": {
                    "id": "$imprestholderId",
                    "name": "$imprestholderName"
                },
                "total_credit": {"$sum": "$credit"},
                "total_debit": {"$sum": "$debit"},
                "transaction_count": {"$sum": 1},
                "first_disbursed_date": {"$min": "$date"},
                "last_activity_date": {"$max": "$date"}
            }
        },
        {
            "$project": {
                "_id": 0,
                "holder_id": "$_id.id",
                "holder_name": "$_id.name",
                "total_credit": 1,
                "total_debit": 1,
                "unsettled_balance": {"$subtract": ["$total_credit", "$total_debit"]},
                "transaction_count": 1,
                "first_disbursed_date": 1,
                "last_activity_date": 1
            }
        },
        {
            "$sort": {"unsettled_balance": -1}
        }
    ]

    holder_results = list(erp_db["imprest_transaction"].aggregate(imprest_pipeline))

    unsettled_holders = []
    settled_holders = []
    excess_spend_holders = []
    total_unsettled_cash = 0.0
    total_credit_disbursed_unsettled = 0.0
    total_debit_settled_unsettled = 0.0
    total_excess_spend_all_time = 0.0

    bucket_0_30 = []
    bucket_31_90 = []
    bucket_91_180 = []
    bucket_over_180 = []

    for h in holder_results:
        credit = float(h.get("total_credit", 0) or 0)
        debit = float(h.get("total_debit", 0) or 0)
        bal = float(h.get("unsettled_balance", 0) or 0)
        first_dt = h.get("first_disbursed_date")
        last_dt = h.get("last_activity_date")

        days_since_last = (now - last_dt).days if isinstance(last_dt, datetime) else None

        if days_since_last is not None:
            if days_since_last <= 30:
                duration_status = "ACTIVE_WITHIN_30_DAYS"
            elif days_since_last <= 90:
                duration_status = "DORMANT_31_90_DAYS"
            elif days_since_last <= 180:
                duration_status = "STALE_91_180_DAYS"
            else:
                duration_status = "CRITICAL_OVERDUE_OVER_180_DAYS"
        else:
            duration_status = "UNKNOWN_NO_DATE"

        holder_obj = {
            "holder_id": h.get("holder_id"),
            "holder_name": h.get("holder_name"),
            "total_credit_received": credit,
            "total_debit_settled": debit,
            "unsettled_balance": bal,
            "transaction_count": h.get("transaction_count", 0),
            "first_disbursed_date": first_dt.isoformat() if isinstance(first_dt, datetime) else str(first_dt) if first_dt else None,
            "last_activity_date": last_dt.isoformat() if isinstance(last_dt, datetime) else str(last_dt) if last_dt else None,
            "days_since_last_activity": days_since_last,
            "duration_status": duration_status,
            "status": "UNSETTLED_CASH_HELD" if bal > 0 else "BALANCED_OR_EXCESS_DEBIT"
        }

        if bal > 0:
            unsettled_holders.append(holder_obj)
            total_unsettled_cash += bal
            total_credit_disbursed_unsettled += credit
            total_debit_settled_unsettled += debit

            if days_since_last is not None:
                if days_since_last <= 30:
                    bucket_0_30.append(holder_obj)
                elif days_since_last <= 90:
                    bucket_31_90.append(holder_obj)
                elif days_since_last <= 180:
                    bucket_91_180.append(holder_obj)
                else:
                    bucket_over_180.append(holder_obj)
            else:
                bucket_over_180.append(holder_obj)
        else:
            settled_holders.append(holder_obj)
            if debit > credit:
                excess_amt = debit - credit
                holder_obj["excess_spend"] = excess_amt
                excess_spend_holders.append(holder_obj)
                total_excess_spend_all_time += excess_amt

    # Sort unsettled holders descending by balance
    unsettled_holders.sort(key=lambda x: x["unsettled_balance"], reverse=True)
    excess_spend_holders.sort(key=lambda x: x.get("excess_spend", 0), reverse=True)

    aging_summary = {
        "active_within_30_days": {
            "holders_count": len(bucket_0_30),
            "unsettled_amount": sum(x["unsettled_balance"] for x in bucket_0_30),
            "description": "Active operational cash (transacted within last 30 days)"
        },
        "dormant_31_to_90_days": {
            "holders_count": len(bucket_31_90),
            "unsettled_amount": sum(x["unsettled_balance"] for x in bucket_31_90),
            "description": "Dormant cash (no statement in 1 to 3 months)"
        },
        "stale_91_to_180_days": {
            "holders_count": len(bucket_91_180),
            "unsettled_amount": sum(x["unsettled_balance"] for x in bucket_91_180),
            "description": "Stale cash (no statement in 3 to 6 months)"
        },
        "critical_overdue_over_180_days": {
            "holders_count": len(bucket_over_180),
            "unsettled_amount": sum(x["unsettled_balance"] for x in bucket_over_180),
            "description": "Critical overdue cash (> 6 months without statement)"
        }
    }

    # General / unallocated pool (where imprestholderId == 0 or name was empty)
    general_pool_pipeline = [
        {
            "$match": {
                "imprestholderName": {"$in": ["", None]}
            }
        },
        {
            "$group": {
                "_id": None,
                "total_credit": {"$sum": "$credit"},
                "total_debit": {"$sum": "$debit"},
                "count": {"$sum": 1}
            }
        }
    ]
    general_pool_res = list(erp_db["imprest_transaction"].aggregate(general_pool_pipeline))
    general_pool = {}
    if general_pool_res:
        gp = general_pool_res[0]
        general_pool = {
            "description": "Unassigned / Direct Site Transfer Pool (imprestholderId 0 or blank name)",
            "total_credit": float(gp.get("total_credit", 0) or 0),
            "total_debit": float(gp.get("total_debit", 0) or 0),
            "balance": float((gp.get("total_credit", 0) or 0) - (gp.get("total_debit", 0) or 0)),
            "transaction_count": gp.get("count", 0)
        }

    # All named holders list (sorted descending by unsettled balance)
    all_named_holders = unsettled_holders + settled_holders

    # 2b. Current Month Imprest Holders Activity (Strictly Current Month Advances & Settlements)
    current_month_imprest_pipeline = [
        {
            "$match": {
                "createType": "IMPREST",
                "imprestholderName": {"$nin": ["", None]},
                "imprestholderId": {"$nin": [0, None]},
                "$or": [
                    {"month": current_month_name},
                    {"date": {"$gte": datetime(now.year, now.month, 1), "$lt": datetime(now.year + (1 if now.month == 12 else 0), 1 if now.month == 12 else now.month + 1, 1)}}
                ]
            }
        },
        {
            "$group": {
                "_id": {
                    "id": "$imprestholderId",
                    "name": "$imprestholderName"
                },
                "month_credit": {"$sum": "$credit"},
                "month_debit": {"$sum": "$debit"},
                "transaction_count": {"$sum": 1}
            }
        }
    ]
    curr_month_holders_res = list(erp_db["imprest_transaction"].aggregate(current_month_imprest_pipeline))
    curr_month_disbursed = sum(float(r.get("month_credit", 0) or 0) for r in curr_month_holders_res)
    curr_month_settled = sum(float(r.get("month_debit", 0) or 0) for r in curr_month_holders_res)
    curr_month_net_held = curr_month_disbursed - curr_month_settled

    curr_month_holders_list = []
    for r in curr_month_holders_res:
        c = float(r.get("month_credit", 0) or 0)
        d = float(r.get("month_debit", 0) or 0)
        curr_month_holders_list.append({
            "holder_id": r["_id"]["id"],
            "holder_name": r["_id"]["name"],
            "credit_received": c,
            "debit_settled": d,
            "net_balance": c - d,
            "transaction_count": r.get("transaction_count", 0)
        })
    curr_month_holders_list.sort(key=lambda x: abs(x["net_balance"]), reverse=True)

    current_month_imprest_summary = {
        "month": current_month_name,
        "active_holders_count": len(curr_month_holders_list),
        "total_disbursed": curr_month_disbursed,
        "total_settled": curr_month_settled,
        "net_unsettled_balance": curr_month_net_held,
        "top_active_holders": curr_month_holders_list[:10]
    }

    # 3. Fetch Work Updates for VFM Website Users (Previous Day Audit)
    yesterday = (now - timedelta(days=1)).date()
    yesterday_str = yesterday.strftime("%Y-%m-%d")
    start_of_yesterday = datetime.combine(yesterday, time.min)
    end_of_yesterday = datetime.combine(yesterday, time.max)
    utc_yesterday_start = start_of_yesterday - timedelta(hours=5, minutes=30)

    # 3a. Get all active registered website users in VFM (erp.users where status is True)
    users_cursor = erp_db["users"].find(
        {"status": True},
        {"_id": 0, "userId": 1, "employeeId": 1, "fullName": 1, "role": 1, "designation": 1, "status": 1}
    ).sort("fullName", 1)

    website_users_list = []
    user_lookup = {}
    seen_user_keys = set()

    for u in users_cursor:
        uid = u.get("userId") or u.get("employeeId")
        if not uid:
            continue
        uid_str = str(uid).strip()
        if uid_str in seen_user_keys:
            continue
        seen_user_keys.add(uid_str)

        user_info = {
            "user_id": uid_str,
            "employee_id": u.get("employeeId"),
            "name": u.get("fullName", "Unknown").strip(),
            "role": u.get("role", "EMPLOYEE"),
            "designation": u.get("designation") or u.get("role"),
            "is_active": True
        }
        website_users_list.append(user_info)
        user_lookup[uid_str] = user_info
        if u.get("employeeId"):
            user_lookup[str(u.get("employeeId")).strip()] = user_info

    # 3b. Fetch work update submissions for yesterday STRICTLY from erp.work_updates
    submissions_by_user = {}

    try:
        wu_cursor = erp_db["work_updates"].find({
            "$or": [
                {"date": {"$gte": utc_yesterday_start, "$lte": now}},
                {"date": {"$gte": start_of_yesterday, "$lte": now}},
                {"createdOn": {"$gte": utc_yesterday_start, "$lte": now}},
                {"createdOn": {"$gte": start_of_yesterday, "$lte": now}}
            ]
        }).sort("createdOn", -1)

        for doc in wu_cursor:
            uid_val = doc.get("userId")
            emp_val = doc.get("employeeId")
            matched_key = None
            if uid_val and str(uid_val).strip() in user_lookup:
                matched_key = str(uid_val).strip()
            elif emp_val and str(emp_val).strip() in user_lookup:
                matched_key = str(emp_val).strip()
            elif uid_val:
                matched_key = str(uid_val).strip()
            elif emp_val:
                matched_key = str(emp_val).strip()

            if not matched_key:
                continue

            c_on = doc.get("createdOn") or doc.get("date")
            title = doc.get("title") or doc.get("workType") or "Daily Work Update"
            raw_desc = doc.get("description") or ""
            clean_desc = clean_html_text(raw_desc)
            effective_desc = clean_desc if clean_desc else title

            att_url = doc.get("attachment") or doc.get("file") or doc.get("reportUrl") or None
            att_name = doc.get("attachmentName") or doc.get("fileName") or (Path(att_url).name if att_url else None)

            update_entry = {
                "id": str(doc.get("_id", "")),
                "title": title,
                "description": effective_desc,
                "work_type": doc.get("workType", "Daily Operations"),
                "site_code": doc.get("unitcode") or doc.get("siteCode"),
                "site_name": doc.get("unitcodeWithName") or doc.get("siteName"),
                "has_attachment": bool(att_url),
                "attachment_name": att_name,
                "attachment_url": att_url,
                "submitted_at": c_on.isoformat() if isinstance(c_on, datetime) else str(c_on) if c_on else None
            }

            if matched_key in submissions_by_user:
                submissions_by_user[matched_key]["updates"].append(update_entry)
            else:
                submissions_by_user[matched_key] = {
                    "matched_key": matched_key,
                    "site_code": doc.get("unitcode") or doc.get("siteCode"),
                    "site_name": doc.get("unitcodeWithName") or doc.get("siteName"),
                    "title": title,
                    "description": effective_desc,
                    "work_type": doc.get("workType", "Daily Operations"),
                    "has_attachment": bool(att_url),
                    "attachment_name": att_name,
                    "attachment_url": att_url,
                    "submitted_at": c_on.isoformat() if isinstance(c_on, datetime) else str(c_on) if c_on else None,
                    "updates": [update_entry]
                }
    except Exception as e:
        logger.warning(f"Error querying work_updates: {e}")

    # 3c. Classify all website users into submitted vs not submitted
    submitted_users = []
    not_submitted_users = []

    from daily_routine.report_extractor import process_and_extract_file, get_extracted_reports_dir
    raw_wu_dir, data_wu_dir = get_extracted_reports_dir(today_str)
    extracted_wu_manifest = []

    for u in website_users_list:
        uid_key = str(u.get("user_id", "")).strip()
        emp_key = str(u.get("employee_id", "")).strip() if u.get("employee_id") is not None else ""
        sub = submissions_by_user.get(uid_key) or (submissions_by_user.get(emp_key) if emp_key else None)

        if sub:
            user_sub_record = {
                **u,
                "status": "SUBMITTED",
                "site_code": sub.get("site_code"),
                "site_name": sub.get("site_name"),
                "title": sub.get("title"),
                "description": sub.get("description"),
                "work_type": sub.get("work_type"),
                "update_content": sub.get("description") or sub.get("title"),
                "has_attachment": sub.get("has_attachment", False),
                "attachment_name": sub.get("attachment_name"),
                "attachment_url": sub.get("attachment_url"),
                "submitted_at": sub.get("submitted_at"),
                "source": "work_updates",
                "updates_count": len(sub.get("updates", [])),
                "updates": sub.get("updates", []),
                "local_raw_path": None,
                "local_extracted_json_path": None
            }

            # Download & Extract attachment if present
            if sub.get("has_attachment") and sub.get("attachment_url"):
                meta = {
                    "user_id": u.get("user_id"),
                    "employee_id": u.get("employee_id"),
                    "name": u.get("name"),
                    "role": u.get("role"),
                    "designation": u.get("designation"),
                    "site_code": sub.get("site_code"),
                    "site_name": sub.get("site_name"),
                    "title": sub.get("title"),
                    "description": sub.get("description")
                }
                ext_res = process_and_extract_file(
                    url=sub["attachment_url"],
                    date_str=today_str,
                    category="work_updates",
                    identifier=f"user_{uid_key}",
                    metadata=meta
                )
                if ext_res.get("success"):
                    user_sub_record["local_raw_path"] = ext_res.get("raw_path")
                    user_sub_record["local_extracted_json_path"] = ext_res.get("extracted_path")
                    extracted_wu_manifest.append(ext_res)

            submitted_users.append(user_sub_record)
        else:
            not_submitted_users.append({
                **u,
                "status": "NOT_SUBMITTED",
                "description": "No operational work update submitted for previous day.",
                "work_type": None,
                "source": None
            })

    # Sort users alphabetically
    submitted_users.sort(key=lambda x: x.get("name", ""))
    not_submitted_users.sort(key=lambda x: x.get("name", ""))

    work_updates_audit = {
        "summary": {
            "audit_target_date": yesterday_str,
            "current_run_time": now.strftime("%Y-%m-%d %I:%M %p"),
            "audit_window_start": start_of_yesterday.strftime("%Y-%m-%d 00:00:00"),
            "audit_window_end": now.strftime("%Y-%m-%d %H:%M:%S"),
            "description": f"Auditing previous day ({yesterday_str}) work updates plus same-day catch-up submissions up to {now.strftime('%I:%M %p')}",
            "total_website_users": len(website_users_list),
            "total_submitted": len(submitted_users),
            "total_not_submitted": len(not_submitted_users),
            "total_extracted_attachments": len(extracted_wu_manifest),
            "submission_compliance_percent": round((len(submitted_users) / len(website_users_list) * 100), 2) if website_users_list else 0.0
        },
        "submitted_users": submitted_users,
        "not_submitted_users": not_submitted_users
    }

    final_payload = {
        "task_id": 5,
        "task_name": "Accounts, Collections, Imprest & VFM Work Updates Audit",
        "date": today_str,
        "metrics": {
            "total_collections_all_time": total_collections_all_time,
            "total_opening_balance_all_time": total_opening_balance,
            "total_client_receipts": total_client_receipts,
            "total_subcontractor_receipts": total_subcontractor_receipts,
            "total_cash_to_bank_all_time": total_cash_to_bank,
            "total_od_receipts": total_od_receipts,
            "total_hand_loan_receipts_all_time": total_hand_loan_receipts,
            "total_other_receipts_all_time": total_other_receipts,
            "total_excess_spend_by_imp_holder_all_time": total_excess_spend_all_time,
            "total_operational_collections_all_time": total_client_receipts + total_subcontractor_receipts,
            "latest_month_name": latest_month_collection.get("month"),
            "latest_month_collection": latest_month_collection.get("total_collection"),
            "latest_month_opening_balance": latest_month_collection.get("opening_balance"),
            "latest_month_client_receipt": latest_month_collection.get("client_receipt"),
            "latest_month_subcontractor_receipt": latest_month_collection.get("subcontractor_receipt"),
            "latest_month_cash_to_bank": latest_month_collection.get("cash_to_bank"),
            "latest_month_od_receipt": latest_month_collection.get("od_receipt"),
            "latest_month_hand_loan_receipt": latest_month_collection.get("hand_loan_receipt"),
            "latest_month_other_receipt": latest_month_collection.get("other_receipt"),
            "latest_month_excess_spend_by_imp_holder": latest_month_collection.get("excess_spend_by_imp_holder", 0.0),
            "latest_month_operational_collection": float(latest_month_collection.get("client_receipt", 0) or 0) + float(latest_month_collection.get("subcontractor_receipt", 0) or 0),
            "total_named_imprest_holders": len(holder_results),
            "holders_with_unsettled_cash": len(unsettled_holders),
            "holders_with_excess_spend": len(excess_spend_holders),
            "imprest_total_credit_disbursed_to_unsettled_holders": total_credit_disbursed_unsettled,
            "imprest_total_debit_settled_by_unsettled_holders": total_debit_settled_unsettled,
            "total_unsettled_cash_held": total_unsettled_cash,
            "imprest_critical_overdue_holders": len(bucket_over_180),
            "imprest_critical_overdue_cash": sum(x["unsettled_balance"] for x in bucket_over_180),
            "current_month_imprest_active_holders": len(curr_month_holders_list),
            "current_month_imprest_disbursed": curr_month_disbursed,
            "current_month_imprest_settled": curr_month_settled,
            "current_month_imprest_net_balance": curr_month_net_held,
            "vfm_website_users_total": len(website_users_list),
            "work_updates_submitted_yesterday": len(submitted_users),
            "work_updates_pending_yesterday": len(not_submitted_users),
            "work_updates_compliance_percent": work_updates_audit["summary"]["submission_compliance_percent"]
        },
        "latest_month_summary": latest_month_collection,
        "collections_history": monthly_collections,
        "imprest_audit": {
            "summary": {
                "total_registered_holders": len(all_named_holders),
                "total_holders_with_unsettled_balance": len(unsettled_holders),
                "total_settled_or_zero_holders": len(settled_holders),
                "total_credit_disbursed_to_unsettled_holders": total_credit_disbursed_unsettled,
                "total_debit_settled_by_unsettled_holders": total_debit_settled_unsettled,
                "total_unsettled_cash_held": total_unsettled_cash,
                "aging_breakdown": aging_summary,
                "current_month_activity": current_month_imprest_summary
            },
            "current_month_activity": current_month_imprest_summary,
            "holders_with_unsettled_balance": unsettled_holders,
            "all_imprest_holders": all_named_holders,
            "general_unallocated_pool": general_pool
        },
        "work_updates_audit": work_updates_audit
    }

    with open(output_file, "w", encoding="utf-8") as f:
        json.dump(final_payload, f, indent=2, ensure_ascii=False)

    print(f"[SYNC SUCCESS] Task 5 Accounts saved to: {output_file}")
    return final_payload
