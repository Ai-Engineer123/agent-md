"""
=============================================================================
EXECUTIVE ROUTINE SUMMARIZER
=============================================================================
Aggregates high-level metrics from Tasks 1 to 8, formats an executive prompt,
calls the Ollama LLM client, and archives the complete input & response in:
    data/ai_reports/<YYYY-MM-DD>.json
"""

import sys
from pathlib import Path

ROOT_DIR = Path(__file__).resolve().parent.parent
if str(ROOT_DIR) not in sys.path:
    sys.path.insert(0, str(ROOT_DIR))

if r"C:\coding\python-packages" not in sys.path:
    sys.path.insert(0, r"C:\coding\python-packages")

import json
from datetime import datetime
from config import BASE_DIR
from .client import OllamaClient
from daily_routine import (
    check_user_checkin,
    get_head_office_attendance,
    get_company_incharges_attendance,
    get_accounts_summary,
    get_tickets_summary,
    get_dmr_summary,
    get_plan_summary
)

AI_REPORTS_DIR = BASE_DIR / "data" / "ai_reports"
AI_REPORTS_DIR.mkdir(parents=True, exist_ok=True)

def collect_routine_metrics(target_date: datetime = None) -> dict:
    """
    Collects high-level summary metrics across Tasks 1 to 8.
    Applies explicit missing-data markers for Tasks 2, 4, and Task 5 Bank Details.
    """
    if target_date is None:
        target_date = datetime.now()

    date_str = target_date.strftime("%Y-%m-%d")

    # Task 1: Admin Checkin
    t1_raw = check_user_checkin(target_date=target_date)
    task_1 = {
        "task_name": "Task 1: User Check-in Verification",
        "has_data": True,
        "checked_in_today": t1_raw.get("checked_in", False),
        "employee_name": t1_raw.get("employee_name", "S GANESAMOORTHY"),
        "status": t1_raw.get("status", "NOT_CHECKED_IN"),
        "check_in_time": t1_raw.get("check_in_time"),
        "site": t1_raw.get("site", "HEAD OFFICE")
    }

    # Task 2: Leadership & Vacancy Reports (No DB Data)
    task_2 = {
        "task_name": "Task 2: Director, GM, AGM, OM & Vacancy Reports",
        "has_data": False,
        "notice": "DATA_NOT_IN_DB: No reports submitted digitally in database. MD must inspect manually."
    }

    # Task 3: HO & In-charges Attendance
    t3_ho = get_head_office_attendance(target_date)
    t3_inc = get_company_incharges_attendance(target_date)
    task_3 = {
        "task_name": "Task 3: Head Office Staff & Company In-charges Attendance",
        "has_data": True,
        "head_office": {
            "total_staff": t3_ho.get("total_staff", 0),
            "present_count": t3_ho.get("present_count", 0),
            "on_leave_count": t3_ho.get("on_leave_count", 0),
            "not_checked_in_count": t3_ho.get("not_checked_in_count", 0)
        },
        "company_incharges": {
            "total_incharges": t3_inc.get("metrics", {}).get("total_incharges", 0),
            "present": t3_inc.get("metrics", {}).get("total_present", 0),
            "on_leave": t3_inc.get("metrics", {}).get("total_on_leave", 0),
            "not_checked_in": t3_inc.get("metrics", {}).get("total_not_checked_in", 0)
        }
    }

    # Task 4: Daily Emails Review (No DB Data)
    task_4 = {
        "task_name": "Task 4: Daily Emails Review",
        "has_data": False,
        "notice": "DATA_NOT_IN_DB: Email inbox is not connected in database. MD must review official emails directly."
    }

    # Task 5: Accounts, Imprest & Work Updates
    t5_acc = get_accounts_summary(target_date)
    t5_m = t5_acc.get("metrics", {})
    task_5 = {
        "task_name": "Task 5: Accounts, Collections & Imprest Balances",
        "has_data": True,
        "collections_all_time": t5_m.get("total_collections_all_time", 0),
        "collections_breakdown_all_time": {
            "opening_balance": t5_m.get("total_opening_balance_all_time", 0),
            "client_receipt": t5_m.get("total_client_receipts", 0),
            "subcontractor_receipt": t5_m.get("total_subcontractor_receipts", 0),
            "cash_to_bank": t5_m.get("total_cash_to_bank_all_time", 0),
            "od_receipt": t5_m.get("total_od_receipts", 0),
            "hand_loan_receipt": t5_m.get("total_hand_loan_receipts_all_time", 0),
            "other_receipt": t5_m.get("total_other_receipts_all_time", 0),
            "excess_spend_by_imp_holder": t5_m.get("total_excess_spend_by_imp_holder_all_time", 0)
        },
        "latest_month_name": t5_m.get("latest_month_name"),
        "latest_month_total_collection": t5_m.get("latest_month_collection", 0),
        "latest_month_breakdown": {
            "opening_balance": t5_m.get("latest_month_opening_balance", 0),
            "client_receipt": t5_m.get("latest_month_client_receipt", 0),
            "subcontractor_receipt": t5_m.get("latest_month_subcontractor_receipt", 0),
            "cash_to_bank": t5_m.get("latest_month_cash_to_bank", 0),
            "od_receipt": t5_m.get("latest_month_od_receipt", 0),
            "hand_loan_receipt": t5_m.get("latest_month_hand_loan_receipt", 0),
            "other_receipt": t5_m.get("latest_month_other_receipt", 0),
            "excess_spend_by_imp_holder": t5_m.get("latest_month_excess_spend_by_imp_holder", 0)
        },
        "latest_month_operational_collection": t5_m.get("latest_month_operational_collection", 0),
        "latest_month_od_receipt": t5_m.get("latest_month_od_receipt", 0),
        "current_month_imprest": {
            "month": t5_m.get("latest_month_name", "October-2026"),
            "active_holders_count": t5_m.get("current_month_imprest_active_holders", 0),
            "total_disbursed": t5_m.get("current_month_imprest_disbursed", 0),
            "total_settled": t5_m.get("current_month_imprest_settled", 0),
            "net_balance_in_field": t5_m.get("current_month_imprest_net_balance", 0),
            "top_active_holders": t5_acc.get("imprest_audit", {}).get("current_month_activity", {}).get("top_active_holders", [])[:10]
        },
        "imprest_holders_with_unsettled_cash": t5_m.get("holders_with_unsettled_cash", 0),
        "imprest_total_credit_disbursed_to_unsettled_holders": t5_m.get("imprest_total_credit_disbursed_to_unsettled_holders", 0),
        "imprest_total_debit_settled_by_unsettled_holders": t5_m.get("imprest_total_debit_settled_by_unsettled_holders", 0),
        "total_unsettled_cash_held": t5_m.get("total_unsettled_cash_held", 0),
        "imprest_critical_overdue_holders_over_180_days": t5_m.get("imprest_critical_overdue_holders", 0),
        "imprest_critical_overdue_cash_over_180_days": t5_m.get("imprest_critical_overdue_cash", 0),
        "imprest_aging_summary": t5_acc.get("imprest_audit", {}).get("summary", {}).get("aging_breakdown", {}),
        "top_unsettled_holders_with_dates": [
            {
                "name": h.get("holder_name"),
                "holder_id": h.get("holder_id"),
                "credit_given": h.get("total_credit_received"),
                "debit_settled": h.get("total_debit_settled"),
                "unsettled_balance": h.get("unsettled_balance"),
                "first_date": h.get("first_disbursed_date"),
                "last_date": h.get("last_activity_date"),
                "days_ago": h.get("days_since_last_activity"),
                "duration_status": h.get("duration_status")
            }
            for h in t5_acc.get("imprest_audit", {}).get("holders_with_unsettled_balance", [])[:5]
        ],
        "vfm_website_users_total": t5_m.get("vfm_website_users_total", 0),
        "yesterday_work_updates_submitted": t5_m.get("work_updates_submitted_yesterday", 0),
        "yesterday_work_updates_pending": t5_m.get("work_updates_pending_yesterday", 0),
        "bank_details_status": "DATA_NOT_IN_DB: Bank account balances are NOT in database. MD must check bank accounts / net banking directly."
    }

    # Task 6: Operational & Support Tickets
    t6_tick = get_tickets_summary(target_date)
    t6_m = t6_tick.get("metrics", {})
    task_6 = {
        "task_name": "Task 6: Operational & Customer Tickets",
        "has_data": True,
        "total_tickets": t6_m.get("total_tickets", 0),
        "total_internal_tickets": t6_m.get("total_internal_tickets", 0),
        "total_external_tickets": t6_m.get("total_external_tickets", 0),
        "internal_solved": t6_m.get("internal_metrics", {}).get("solved", 0),
        "internal_unsolved": t6_m.get("internal_metrics", {}).get("unsolved", 0),
        "total_danger_tickets_overdue_3_days": t6_m.get("total_danger_tickets_overdue_3_days", 0),
        "danger_internal_count": t6_m.get("internal_metrics", {}).get("danger_overdue_3_days", 0),
        "danger_external_count": t6_m.get("external_metrics", {}).get("danger_overdue_3_days", 0),
        "status_breakdown": t6_m.get("internal_metrics", {}).get("status_breakdown", {})
    }

    # Task 7: DMR (Daily Management Reports)
    t7_dmr = get_dmr_summary(target_date)
    t7_m = t7_dmr.get("metrics", {})
    task_7 = {
        "task_name": "Task 7: DMR Management Reports Audit (FMS Sites Only)",
        "has_data": True,
        "total_fms_sites": t7_m.get("total_fms_sites", t7_m.get("total_active_sites", 0)),
        "total_active_sites": t7_m.get("total_active_sites", 0),
        "total_all_sites_in_system": t7_m.get("total_all_active_sites_all_types", 88),
        "yesterday_dmr_submitted_sites": t7_m.get("submitted_sites_yesterday", 0),
        "yesterday_dmr_pending_sites": t7_m.get("pending_sites_yesterday", 0),
        "compliance_percent": t7_m.get("compliance_percent", 0.0),
        "total_dmr_documents_all_time": t7_m.get("total_dmr_documents_all_time", 0)
    }

    # Task 8: 52 Weeks Plan (PPM & Operations)
    t8_plan = get_plan_summary(target_date)
    t8_m = t8_plan.get("metrics", {})
    task_8 = {
        "task_name": "Task 8: 52 Weeks Plan & Operational Maintenance (Yesterday Done & Today's Plan)",
        "has_data": True,
        "current_week_number": t8_m.get("current_week_number", 42),
        "total_tasks_this_week": t8_m.get("total_tasks_this_week", 0),
        "yesterday_date": t8_m.get("yesterday_date"),
        "yesterday_weekday": t8_m.get("yesterday_weekday", "Thursday"),
        "yesterday_completed_tasks": t8_m.get("yesterday_completed_tasks", 0),
        "yesterday_mep_tasks": t8_m.get("yesterday_mep_tasks", 0),
        "today_weekday": t8_m.get("today_weekday", "Friday"),
        "today_total_tasks": t8_m.get("today_total_tasks", 0),
        "today_mep_tasks": t8_m.get("today_mep_tasks", 0),
        "today_housekeeping_tasks": t8_m.get("today_housekeeping_tasks", 0),
        "today_status": t8_m.get("today_status", "in_progress"),
        "total_critical_assets_tracked": t8_m.get("total_critical_assets_tracked", 61)
    }

    return {
        "date": date_str,
        "tasks": {
            "task_1": task_1,
            "task_2": task_2,
            "task_3": task_3,
            "task_4": task_4,
            "task_5": task_5,
            "task_6": task_6,
            "task_7": task_7,
            "task_8": task_8
        }
    }

def build_executive_prompt(metrics_payload: dict) -> tuple:
    """Builds (system_prompt, user_prompt) for the executive summarizer in true MD persona."""
    system_prompt = (
        "You are the Executive AI Co-Pilot thinking and speaking with the mindset, authority, and strategic rigor of Managing Director S GANESAMOORTHY. "
        "You oversee enterprise operations across VTS, VFM, Commercial Cleaning, Enterprises, and Profox.\n\n"
        "CORE PERSONA & LANGUAGE FOR MANAGING DIRECTOR:\n"
        "• Language: Use SIMPLE, CLEAR, DIRECT ENGLISH that a non-technical Managing Director can understand instantly in 30 seconds.\n"
        "• Sentence Structure: Short, sweet, punchy sentences. Absolutely NO long winding paragraphs, NO complex academic words, and NO corporate buzzwords.\n"
        "• Tone: Decisive, authoritative, practical, and action-focused.\n"
        "• Directives: Give direct instructions (e.g. 'Call unit in-charge by 2 PM', 'Demand original bills before releasing funds', 'Escalate overdue tickets to senior ops lead').\n"
        "• Currency: Use Indian Rupee format (₹ or Rs) with comma grouping.\n\n"
        "STATIC BRIEFING TEMPLATE (You MUST use this EXACT template structure with these exact section headers & icons every single time):\n\n"
        "# 🎯 MD Executive Intelligence Briefing — {date}\n"
        "**Managing Director Operational Directives & Enterprise Status**\n\n"
        "---\n\n"
        "## ⚡ 1. Immediate Executive Directives (Top 3 Priorities)\n"
        "*(3 non-negotiable operational priorities that require direct MD intervention or delegated executive command today.)*\n\n"
        "## 👥 2. Enterprise Workforce & Roll-Call Audit (Tasks 1 & 3)\n"
        "*(Includes a clean Markdown table with: Unit / Role | Total Staff | Present Today | On Leave | Deficit / Unchecked | MD Operational Directive)*\n"
        "*(Must include an MD Strategic Suggestion on roll-call discipline and attendance accountability in simple English.)*\n\n"
        "## 💰 3. Cash Flow, Imprest & Team Accountability (Task 5)\n"
        "*(Must report Collections based on the full 8-component formula: Total Collection = Opening Balance + Client Receipt + Subcontractor Receipt + Cash to Bank + OD Receipt + Hand Loan Receipt + Other Receipt + Excess Spend by Imp.Holder. Show Current Month with the breakdown of all 8 components and All-Time Cumulative. Clearly explain in simple words: OD is bank credit, Hand Loan is borrowing, Client/Subcontractor receipts are real income, and Excess Spend is field expense paid by staff.)*\n"
        "*(Must report Imprest Holder Management strictly focusing on CURRENT MONTH activity: Disbursed advances this month, bills settled this month, net cash held in field this month, active holders count, and a clear Markdown table of top active holders this month showing Disbursed, Settled, and Net Cash Held. Issue MD directives in simple English to audit physical vouchers and clear the current month net balance.)*\n"
        "*(Must explicitly report VFM Work Updates: Total portal users, Yesterday submitted count, and Yesterday pending/defaulting count with percentage)*\n"
        "*(Must include blockquote: '> ⚠️ **CRITICAL CASH AUDIT: Bank account balances are not in database. MD must inspect net-banking directly to verify true liquidity.**')*\n"
        "*(Must include MD Strategic Directives for immediate imprest recovery timeline, aging enforcement, and daily work updates.)*\n\n"
        "## 🚨 4. Operational Friction & SLA Danger Breaches (Task 6)\n"
        "*(Must break down Total tickets, and specifically highlight the ⚠️ Danger tickets overdue > 3 days, internal vs external)*\n"
        "*(Must include MD Strategic Directives on customer risk mitigation and escalation timelines.)*\n\n"
        "## 🏗️ 5. Site Operations & DMR Compliance (Task 7)\n"
        "*(Must report total active sites, submitted yesterday vs pending sites, and compliance percentage)*\n"
        "*(Must include MD Strategic Directives on site manager accountability and audit readiness.)*\n\n"
        "## ⚙️ 6. Planned Maintenance & Asset Reliability (Task 8)\n"
        "*(Must report current week PPM status, today's planned tasks, and MD guidance on keeping preventive maintenance active.)*\n\n"
        "## 📋 7. Mandatory Governance & Manual Reviews (Tasks 2 & 4)\n"
        "*(Must state in simple words: Task 2 Leadership/Vacancy reports not in DB -> MD must inspect physical/drive reports directly; Task 4 Official emails not in DB -> MD must review inbox directly for client escalations.)*\n\n"
        "STRICT CONSTRAINTS:\n"
        "• NEVER generate any trailing 'Quick Recap Checklist', 'Desk Checklist', or checkboxes (- [ ]) at the end.\n"
        "• End the briefing cleanly immediately after Section 7."
    )

    t5 = metrics_payload.get("tasks", {}).get("task_5", {})
    t6 = metrics_payload.get("tasks", {}).get("task_6", {})
    t7 = metrics_payload.get("tasks", {}).get("task_7", {})
    t8 = metrics_payload.get("tasks", {}).get("task_8", {})
    date_str = metrics_payload.get('date', 'Today')

    danger_tickets_cnt = t6.get('total_danger_tickets_overdue_3_days', 0)
    dmr_sub = t7.get('yesterday_dmr_submitted_sites', 0)
    dmr_pen = t7.get('yesterday_dmr_pending_sites', 0)
    dmr_comp = t7.get('compliance_percent', 0.0)
    dmr_tot = t7.get('total_active_sites', 0)

    curr_imp = t5.get("current_month_imprest", {})

    user_prompt = (
        f"Generate the MD Executive Intelligence Briefing for Date: {date_str}.\n\n"
        f"ENTERPRISE OPERATIONAL DATA (Tasks 1 to 8 Metrics):\n"
        f"{json.dumps(metrics_payload, indent=2)}\n\n"
        "MANDATORY EXECUTION INSTRUCTIONS:\n"
        "1. Write in the authoritative, strategic, decision-making voice of Managing Director S GANESAMOORTHY.\n"
        "2. LANGUAGE MUST BE SIMPLE ENGLISH: Use simple words, short sentences, and crystal clear instructions so the MD can grasp everything at a glance without effort. Avoid complex vocabulary or long academic paragraphs.\n"
        "3. Follow the EXACT static template headers with icons defined in the system prompt.\n"
        "4. In Section 3 (Cash & Accountability), you MUST include:\n"
        f"   - Complete 8-Component Collection Breakdown:\n"
        f"     Total Collection is the exact sum of all 8 channels: Opening Balance + Client Receipt + Subcontractor Receipt + Cash to Bank + OD Receipt + Hand Loan Receipt + Other Receipt + Excess Spend by Imp.Holder.\n"
        f"     • Current Month ({t5.get('latest_month_name', 'October-2026')}) Total: Rs {t5.get('latest_month_total_collection', 0):,.0f} (Opening Balance: Rs {t5.get('latest_month_breakdown', {}).get('opening_balance', 0):,.0f}, Client: Rs {t5.get('latest_month_breakdown', {}).get('client_receipt', 0):,.0f}, Subcontractor: Rs {t5.get('latest_month_breakdown', {}).get('subcontractor_receipt', 0):,.0f}, Cash to Bank: Rs {t5.get('latest_month_breakdown', {}).get('cash_to_bank', 0):,.0f}, OD Receipt: Rs {t5.get('latest_month_breakdown', {}).get('od_receipt', 0):,.0f}, Hand Loan: Rs {t5.get('latest_month_breakdown', {}).get('hand_loan_receipt', 0):,.0f}, Other: Rs {t5.get('latest_month_breakdown', {}).get('other_receipt', 0):,.0f}, Excess Spend by Imp.Holder: Rs {t5.get('latest_month_breakdown', {}).get('excess_spend_by_imp_holder', 0):,.0f}).\n"
        f"     • All-Time Cumulative Total across all 24 months: Rs {t5.get('collections_all_time', 0):,.0f} (Opening Balance: Rs {t5.get('collections_breakdown_all_time', {}).get('opening_balance', 0):,.0f}, Client: Rs {t5.get('collections_breakdown_all_time', {}).get('client_receipt', 0):,.0f}, Subcontractor: Rs {t5.get('collections_breakdown_all_time', {}).get('subcontractor_receipt', 0):,.0f}, Cash to Bank: Rs {t5.get('collections_breakdown_all_time', {}).get('cash_to_bank', 0):,.0f}, OD Receipt: Rs {t5.get('collections_breakdown_all_time', {}).get('od_receipt', 0):,.0f}, Hand Loan: Rs {t5.get('collections_breakdown_all_time', {}).get('hand_loan_receipt', 0):,.0f}, Other: Rs {t5.get('collections_breakdown_all_time', {}).get('other_receipt', 0):,.0f}, Excess Spend by Imp.Holder: Rs {t5.get('collections_breakdown_all_time', {}).get('excess_spend_by_imp_holder', 0):,.0f}).\n"
        "     Clearly note that OD is bank credit financing, Hand Loans are debt/borrowing, Client/Subcontractor receipts are operational business income, and Excess Spend is expenses paid directly by field holders out-of-pocket.\n"
        f"   - Imprest Holder Management (STRICT CURRENT MONTH FOCUS — {t5.get('latest_month_name', 'October-2026')}):\n"
        f"     • Focus exclusively on this month's cash operations:\n"
        f"       - Active Holders this month: {curr_imp.get('active_holders_count', 26)}\n"
        f"       - Disbursed this month (Credit Given): Rs {curr_imp.get('total_disbursed', 0):,.0f}\n"
        f"       - Settled this month (Bills Submitted): Rs {curr_imp.get('total_settled', 0):,.0f}\n"
        f"       - Net Cash Remaining in Field this month: Rs {curr_imp.get('net_balance_in_field', 0):,.0f}\n"
        f"     • Include a Markdown Table for Top Active Holders this Month:\n"
        f"       Columns: Imprest Holder | Given (Credit) | Settled (Bills) | Net Held | MD Operational Directive\n"
        f"       Holders data: {json.dumps(curr_imp.get('top_active_holders', []))}\n"
        f"     • Issue clear directives to demand bills/vouchers from top holders (PROFOX BUSINESS SOLUTIONS, JALAPATHY, DEVARAJ SINGH, THAVASEELAN D, PRAMANAD SINGH, SURAJ MAURYA) to settle the remaining Rs {curr_imp.get('net_balance_in_field', 0):,.0f} before month end.\n"
        f"   - Total VFM Portal Users: {t5.get('vfm_website_users_total', 0)}\n"
        f"   - Yesterday Submitted Work Updates: {t5.get('yesterday_work_updates_submitted', 0)}\n"
        f"   - Yesterday Pending Updates (Defaulting Staff): {t5.get('yesterday_work_updates_pending', 0)}\n"
        "   - The bank balance net banking inspection warning.\n"
        f"4. In Section 4 (Tickets), highlight the {danger_tickets_cnt} Danger tickets (>3 days unresolved) and issue sharp escalation directives.\n"
        f"5. In Section 5 (DMR), highlight {dmr_sub} submitted vs {dmr_pen} pending FMS sites ({dmr_comp}% compliance) out of {dmr_tot} total active FMS sites (DMR reports are strictly applicable ONLY to FMS sites, out of {t7.get('total_all_sites_in_system', 88)} total sites in system) with operational suggestions.\n"
        f"6. In Section 6 (Planned Maintenance & Asset Reliability), explicitly report: Current Week ({t8.get('current_week_number', 42)}) operational tasks: {t8.get('total_tasks_this_week', 25)}; Yesterday ({t8.get('yesterday_weekday', 'Thursday')}) completed/submitted: {t8.get('yesterday_completed_tasks', 4)} tasks; Today ({t8.get('today_weekday', 'Friday')}) active/planned: {t8.get('today_total_tasks', 2)} tasks across {t8.get('total_critical_assets_tracked', 61)} facility assets with decisive MD directives.\n"
        "7. In Section 7 (Manual Checks), provide direct instructions for Task 2 (Director/GM/Vacancy) and Task 4 (Emails).\n"
        "8. Provide strategic MD-level suggestions and directives for EVERY section.\n"
        "9. Absolutely NO trailing recap checklist or checkboxes at the end. End after Section 7."
    )

    return system_prompt, user_prompt

def generate_and_archive_summary(target_date: datetime = None, client: OllamaClient = None) -> dict:
    """
    Main pipeline:
    1. Collects Tasks 1-8 high-level metrics.
    2. Builds prompts.
    3. Sends to Ollama client.
    4. Archives the complete input data and AI response into data/ai_reports/<date>.json.
    5. Returns full result.
    """
    if target_date is None:
        target_date = datetime.now()

    date_str = target_date.strftime("%Y-%m-%d")
    report_file = AI_REPORTS_DIR / f"{date_str}.json"

    if client is None:
        client = OllamaClient()

    # 1. Collect Metrics
    metrics_payload = collect_routine_metrics(target_date)

    # 2. Build Prompts
    system_prompt, user_prompt = build_executive_prompt(metrics_payload)

    # 3. Call AI
    ai_result = client.generate(user_prompt, system_prompt=system_prompt)

    # 4. If preferred model fails (e.g. 404), try fallback model if available
    if not ai_result.get("success"):
        available_models = client.list_models()
        if available_models and available_models[0] != client.model:
            fallback_model = available_models[0]
            print(f"[AI ENGINE] Primary model '{client.model}' failed. Trying fallback '{fallback_model}'...")
            fallback_client = OllamaClient(host=client.host, model=fallback_model, api_key=client.api_key)
            ai_result = fallback_client.generate(user_prompt, system_prompt=system_prompt)
            ai_result["fallback_used"] = True

    # 5. Deterministic Response Post-Processing
    import re
    clean_response = ai_result.get("response", "")

    # A. Strip any trailing recap checklist or checkboxes
    clean_response = re.sub(r'(?:---\s*\n+)?###?\s*.*(?:Checklist|Recap|Tick as you go|Walk‑through|Walk-through)[\s\S]*$', '', clean_response, flags=re.IGNORECASE).strip()
    clean_response = re.sub(r'(?:\n\s*[-*]\s*\[[ xX]\].*)+$', '', clean_response).strip()

    # B. Guarantee VFM Work Updates counts are always explicitly present in Task 5
    t5_meta = metrics_payload.get("tasks", {}).get("task_5", {})
    submitted_cnt = t5_meta.get("yesterday_work_updates_submitted", 0)
    pending_cnt = t5_meta.get("yesterday_work_updates_pending", 0)
    users_cnt = t5_meta.get("vfm_website_users_total", 0)

    if str(pending_cnt) not in clean_response or "Work Updates" not in clean_response:
        updates_text = (
            f"\n\n**VFM Employee Work Updates (Task 5)**\n"
            f"- Total portal users: **{users_cnt}**\n"
            f"- Yesterday submitted updates: **{submitted_cnt}**\n"
            f"- Yesterday pending updates (did NOT submit): **{pending_cnt}**\n"
        )
        if re.search(r'Bank balances? are not in database', clean_response, re.IGNORECASE):
            clean_response = re.sub(r'([>\s]*\*{0,2}[^>\n]*Bank balances? are not in database[^\n]*)', updates_text + r'\n\1', clean_response, count=1, flags=re.IGNORECASE)
        elif "## 2" in clean_response or "Cash & Financial" in clean_response:
            clean_response = re.sub(r'(##\s*2[^\n]*\n)', r'\1' + updates_text, clean_response, count=1)
        else:
            clean_response += updates_text

    # 6. Build Complete Archive Record
    archive_doc = {
        "date": date_str,
        "timestamp": datetime.now().isoformat(),
        "model_requested": client.model,
        "model_used": ai_result.get("model", client.model),
        "ollama_host": client.host,
        "input_data_sent_to_ai": metrics_payload,
        "system_prompt": system_prompt,
        "user_prompt": user_prompt,
        "ai_response_raw": clean_response,
        "ai_execution_status": "SUCCESS" if ai_result.get("success") else "FAILED",
        "error": ai_result.get("error"),
        "error_details": ai_result.get("error_details"),
        "archive_file": str(report_file)
    }

    # 6. Save to data/ai_reports/<date>.json
    with open(report_file, "w", encoding="utf-8") as f:
        json.dump(archive_doc, f, indent=2, ensure_ascii=False)

    print(f"[AI ENGINE] Archive record saved to: {report_file}")
    return archive_doc

def get_latest_ai_report(date_str: str = None) -> dict:
    """Returns the saved AI report document from data/ai_reports/."""
    available_files = sorted([f.stem for f in AI_REPORTS_DIR.glob("*.json")], reverse=True)
    if not date_str:
        date_str = datetime.now().strftime("%Y-%m-%d")

    report_file = AI_REPORTS_DIR / f"{date_str}.json"
    if report_file.exists():
        try:
            with open(report_file, "r", encoding="utf-8") as f:
                data = json.load(f)
                data["available_dates"] = available_files
                data["requested_date"] = date_str
                return data
        except Exception as e:
            return {"status": "ERROR_READING_FILE", "error": str(e), "available_dates": available_files}

    # If specifically requested date doesn't exist, fallback to newest available report
    if available_files:
        try:
            with open(AI_REPORTS_DIR / f"{available_files[0]}.json", "r", encoding="utf-8") as f:
                data = json.load(f)
                data["available_dates"] = available_files
                data["requested_date"] = date_str
                data["is_fallback"] = (available_files[0] != date_str)
                return data
        except Exception:
            pass

    return {"status": "NO_REPORTS_FOUND", "date": date_str, "available_dates": available_files}
