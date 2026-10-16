"""
=============================================================================
AUDIT DRILL-DOWN SERVICE
=============================================================================
Extracts detailed itemized records from local_db for interactive
popup modal drill-downs on the Executive AI Briefing (/audit) page:
1. Workforce: Employees on leave and employees not checked-in (Tasks 1 & 3)
2. VFMS Portal Activity: Who submitted yesterday work updates (Task 5)
3. Site Operations & DMR: Submitted site codes, names & submitters (Task 7)
"""

from pathlib import Path
from datetime import datetime
import json
import logging

BASE_DIR = Path(__file__).resolve().parent.parent
LOCAL_DB_DIR = BASE_DIR / "local_db"
logger = logging.getLogger(__name__)

def resolve_target_date(date_str: str = None) -> str:
    """Finds the best date folder in local_db."""
    if date_str:
        target_path = LOCAL_DB_DIR / date_str
        if target_path.exists():
            return date_str
            
    # Default to today or most recent date folder
    today = datetime.now().strftime("%Y-%m-%d")
    if (LOCAL_DB_DIR / today).exists():
        return today
        
    available = sorted([d.name for d in LOCAL_DB_DIR.iterdir() if d.is_dir() and len(d.name) == 10], reverse=True)
    if available:
        return available[0]
        
    return today

def get_audit_drilldown_data(date_str: str = None) -> dict:
    """
    Returns granular drill-down datasets for Workforce, VFM, and DMR.
    """
    effective_date = resolve_target_date(date_str)
    date_dir = LOCAL_DB_DIR / effective_date

    result = {
        "requested_date": date_str,
        "effective_date": effective_date,
        "workforce": {
            "checked_in": [],
            "on_leave": [],
            "not_checked_in": [],
            "summary": {
                "head_office_total": 0,
                "head_office_present": 0,
                "head_office_leave": 0,
                "company_incharges_total": 0,
                "company_incharges_present": 0,
                "company_incharges_unchecked": 0
            }
        },
        "vfm_portal": {
            "submitted_users": [],
            "not_submitted_users": [],
            "metrics": {
                "total_users": 0,
                "submitted_count": 0,
                "pending_count": 0,
                "compliance_percent": 0.0
            }
        },
        "dmr_compliance": {
            "submitted_sites": [],
            "pending_sites": [],
            "metrics": {
                "total_fms_sites": 0,
                "submitted_count": 0,
                "pending_count": 0,
                "compliance_percent": 0.0
            }
        },
        "tickets": {
            "audit_window": {
                "from_day": "Yesterday",
                "to_day": "Today",
                "from_date": "",
                "to_date": effective_date,
                "label": "Last Day to Today (before Agent Run)"
            },
            "metrics": {
                "total_tickets": 0,
                "danger_tickets_count": 0,
                "internal_count": 0,
                "external_count": 0,
                "solved_count": 0,
                "unsolved_count": 0
            },
            "danger_tickets": [],
            "internal_tickets": [],
            "external_tickets": [],
            "all_tickets": []
        }
    }

    # Calculate audit window days
    try:
        from datetime import timedelta
        eff_dt = datetime.fromisoformat(effective_date)
        prev_dt = eff_dt - timedelta(days=1)
        prev_day = prev_dt.strftime("%A")
        today_day = eff_dt.strftime("%A")
        aw_obj = {
            "from_day": prev_day,
            "to_day": today_day,
            "from_date": prev_dt.strftime("%Y-%m-%d"),
            "to_date": effective_date,
            "label": f"Last Day ({prev_day}) to Today ({today_day}) before Agent Run"
        }
        result["audit_window"] = aw_obj
        result["tickets"]["audit_window"] = aw_obj
    except Exception:
        pass

    if not date_dir.exists():
        return result

    # -------------------------------------------------------------------------
    # 1. WORKFORCE (Tasks 1 & 3): Head Office Attendance + Company In-charges
    # -------------------------------------------------------------------------
    ho_file = date_dir / "task_3_head_office_attendance.json"
    if ho_file.exists():
        try:
            with open(ho_file, "r", encoding="utf-8") as f:
                ho_data = json.load(f)
                
            ho_metrics = ho_data.get("data", ho_data)
            result["workforce"]["summary"]["head_office_total"] = ho_metrics.get("total_staff", 0)
            result["workforce"]["summary"]["head_office_present"] = ho_metrics.get("present_count", 0)
            result["workforce"]["summary"]["head_office_leave"] = ho_metrics.get("on_leave_count", 0)

            for staff in ho_metrics.get("staff_attendance", []):
                st = staff.get("status", "").upper()
                if st == "ON_LEAVE":
                    leave_info = staff.get("leave_details") or {}
                    result["workforce"]["on_leave"].append({
                        "unit": "Head Office Staff",
                        "site_code": ho_metrics.get("site_code", "UC001"),
                        "employee_id": staff.get("employee_number"),
                        "employee_name": staff.get("employee_name"),
                        "role": staff.get("role", "Staff"),
                        "status": "ON_LEAVE",
                        "leave_type": leave_info.get("leave_type", "Casual Leave").replace("_", " ").title(),
                        "reason": leave_info.get("reason", "N/A"),
                        "approval_status": leave_info.get("status", "APPROVED"),
                        "last_known_checkin": staff.get("last_known_checkin")
                    })
                elif st == "NOT_CHECKED_IN":
                    result["workforce"]["not_checked_in"].append({
                        "unit": "Head Office Staff",
                        "site_code": ho_metrics.get("site_code", "UC001"),
                        "employee_id": staff.get("employee_number"),
                        "employee_name": staff.get("employee_name"),
                        "role": staff.get("role", "Staff"),
                        "status": "NOT_CHECKED_IN",
                        "last_known_checkin": staff.get("last_known_checkin")
                    })
                elif st == "PRESENT":
                    result["workforce"]["checked_in"].append({
                        "unit": "Head Office Staff",
                        "site_code": ho_metrics.get("site_code", "UC001"),
                        "employee_id": staff.get("employee_number"),
                        "employee_name": staff.get("employee_name"),
                        "role": staff.get("role", "Staff"),
                        "status": "PRESENT",
                        "check_in_time": staff.get("check_in_time"),
                        "last_known_checkin": staff.get("check_in_time")
                    })
        except Exception as e:
            logger.error(f"Error loading Head Office attendance drill-down: {e}")

    incharges_file = date_dir / "task_3_company_incharges.json"
    if incharges_file.exists():
        try:
            with open(incharges_file, "r", encoding="utf-8") as f:
                inc_data = json.load(f)
                
            inc_metrics = inc_data.get("metrics", {})
            result["workforce"]["summary"]["company_incharges_total"] = inc_metrics.get("total_incharges", 0)
            result["workforce"]["summary"]["company_incharges_present"] = inc_metrics.get("total_present", 0)
            result["workforce"]["summary"]["company_incharges_unchecked"] = inc_metrics.get("total_not_checked_in", 0)

            companies = inc_data.get("companies", {})
            for cname, cinfo in companies.items():
                for inc in cinfo.get("incharges", []):
                    st = inc.get("status", "").upper()
                    if st == "NOT_CHECKED_IN":
                        result["workforce"]["not_checked_in"].append({
                            "unit": f"Company In-Charge ({cname})",
                            "site_code": cname,
                            "employee_id": inc.get("employee_id"),
                            "employee_name": inc.get("employee_name"),
                            "role": inc.get("role", "In-charge"),
                            "status": "NOT_CHECKED_IN",
                            "last_known_checkin": inc.get("last_known_checkin")
                        })
                    elif st == "ON_LEAVE":
                        leave_info = inc.get("leave_details") or {}
                        result["workforce"]["on_leave"].append({
                            "unit": f"Company In-Charge ({cname})",
                            "site_code": cname,
                            "employee_id": inc.get("employee_id"),
                            "employee_name": inc.get("employee_name"),
                            "role": inc.get("role", "In-charge"),
                            "status": "ON_LEAVE",
                            "leave_type": leave_info.get("leave_type", "Leave").replace("_", " ").title(),
                            "reason": leave_info.get("reason", "N/A"),
                            "approval_status": leave_info.get("status", "APPROVED"),
                            "last_known_checkin": inc.get("last_known_checkin")
                        })
                    elif st in ["PRESENT", "CHECKED_IN"]:
                        result["workforce"]["checked_in"].append({
                            "unit": f"Company In-Charge ({cname})",
                            "site_code": cname,
                            "employee_id": inc.get("employee_id"),
                            "employee_name": inc.get("employee_name"),
                            "role": inc.get("role", "In-charge"),
                            "status": "PRESENT",
                            "check_in_time": inc.get("check_in_time") or inc.get("last_known_checkin"),
                            "last_known_checkin": inc.get("check_in_time") or inc.get("last_known_checkin")
                        })
        except Exception as e:
            logger.error(f"Error loading company incharges drill-down: {e}")

    # -------------------------------------------------------------------------
    # 2. VFM PORTAL ACTIVITY (Task 5): Submitted & Not Submitted Work Updates
    # -------------------------------------------------------------------------
    acc_file = date_dir / "task_5_accounts.json"
    if acc_file.exists():
        try:
            with open(acc_file, "r", encoding="utf-8") as f:
                acc_data = json.load(f)
                
            metrics = acc_data.get("metrics", {})
            vfm_audit = acc_data.get("work_updates_audit", {})
            
            result["vfm_portal"]["metrics"]["total_users"] = metrics.get("vfm_website_users_total", 105)
            result["vfm_portal"]["metrics"]["submitted_count"] = metrics.get("work_updates_submitted_yesterday", 0)
            result["vfm_portal"]["metrics"]["pending_count"] = metrics.get("work_updates_pending_yesterday", 0)
            result["vfm_portal"]["metrics"]["compliance_percent"] = metrics.get("work_updates_compliance_percent", 0.0)

            for user in vfm_audit.get("submitted_users", []):
                # Clean up description text snippet
                desc = user.get("description") or user.get("update_content") or ""
                clean_desc = desc.replace("&nbsp;", " ").replace("<br>", " ").strip()
                if len(clean_desc) > 180:
                    clean_desc = clean_desc[:180] + "..."

                result["vfm_portal"]["submitted_users"].append({
                    "employee_id": user.get("employee_id") or user.get("user_id"),
                    "name": user.get("name"),
                    "designation": user.get("designation") or user.get("role", "Staff"),
                    "site_code": user.get("site_code", "UC001"),
                    "site_name": user.get("site_name", "Head Office"),
                    "title": user.get("title", "Work Update"),
                    "work_type": user.get("work_type", "Daily Report"),
                    "submitted_at": user.get("submitted_at"),
                    "summary_snippet": clean_desc or user.get("title")
                })

            for user in vfm_audit.get("not_submitted_users", []):
                result["vfm_portal"]["not_submitted_users"].append({
                    "employee_id": user.get("employee_id") or user.get("user_id"),
                    "name": user.get("name"),
                    "designation": user.get("designation") or user.get("role", "Staff"),
                    "role": user.get("role", "OPS"),
                    "status": "NOT_SUBMITTED",
                    "description": user.get("description", "No operational work update submitted for previous day.")
                })
        except Exception as e:
            logger.error(f"Error loading VFM activity drill-down: {e}")

    # -------------------------------------------------------------------------
    # 3. SITE OPERATIONS & DMR COMPLIANCE (Task 7): Submitted Sites & Who Submitted
    # -------------------------------------------------------------------------
    dmr_file = date_dir / "task_7_dmr.json"
    if dmr_file.exists():
        try:
            with open(dmr_file, "r", encoding="utf-8") as f:
                dmr_data = json.load(f)
                
            metrics = dmr_data.get("metrics", {})
            result["dmr_compliance"]["metrics"]["total_fms_sites"] = metrics.get("total_fms_sites", 28)
            result["dmr_compliance"]["metrics"]["submitted_count"] = metrics.get("submitted_sites_yesterday", 0)
            result["dmr_compliance"]["metrics"]["pending_count"] = metrics.get("pending_sites_yesterday", 0)
            result["dmr_compliance"]["metrics"]["compliance_percent"] = metrics.get("compliance_percent", 0.0)

            for site in dmr_data.get("submitted_sites", []):
                result["dmr_compliance"]["submitted_sites"].append({
                    "unit_code": site.get("unit_code"),
                    "site_name": site.get("site_name"),
                    "location": site.get("location", ""),
                    "submitted_by": site.get("submitted_by"),
                    "designation": site.get("designation", "Facility Manager"),
                    "report_title": site.get("report_title", "Daily DMR"),
                    "submitted_at": site.get("submitted_at"),
                    "attachment_name": site.get("attachment_name"),
                    "attachment_url": site.get("attachment_url")
                })

            for psite in dmr_data.get("pending_sites", []):
                result["dmr_compliance"]["pending_sites"].append({
                    "unit_code": psite.get("unit_code"),
                    "site_name": psite.get("site_name"),
                    "location": psite.get("location", ""),
                    "status": "PENDING"
                })
        except Exception as e:
            logger.error(f"Error loading DMR compliance drill-down: {e}")

    # -------------------------------------------------------------------------
    # 4. OPERATIONAL TICKETS & SLA DANGER (Task 6)
    # -------------------------------------------------------------------------
    tick_file = date_dir / "task_6_tickets.json"
    if tick_file.exists():
        try:
            with open(tick_file, "r", encoding="utf-8") as f:
                tick_data = json.load(f)

            metrics = tick_data.get("metrics", {})
            internal_info = tick_data.get("internal_tickets", {})
            external_info = tick_data.get("external_tickets", {})

            result["tickets"]["metrics"] = {
                "total_tickets": metrics.get("total_tickets", 0),
                "danger_tickets_count": metrics.get("total_danger_tickets_overdue_3_days", 0),
                "internal_count": metrics.get("total_internal_tickets", 0),
                "external_count": metrics.get("total_external_tickets", 0),
                "solved_count": metrics.get("total_solved_tickets", 0),
                "unsolved_count": metrics.get("total_unsolved_tickets", 0)
            }

            def format_ticket_record(t):
                c_date = str(t.get("created_date") or "")[:19]
                day_name = ""
                if c_date:
                    try:
                        c_dt = datetime.fromisoformat(c_date.replace(" ", "T"))
                        day_name = c_dt.strftime("%A")
                    except Exception:
                        pass

                assigned = t.get("assigned_to", {})
                if isinstance(assigned, dict):
                    assigned_name = (assigned.get("name") or "Unassigned").strip()
                    assigned_role = (assigned.get("role") or "").strip()
                else:
                    assigned_name = str(assigned or "Unassigned").strip()
                    assigned_role = ""

                desc = t.get("issue_description") or t.get("type_of_call") or t.get("source_of_lead") or "Operational ticket"

                return {
                    "ticket_no": t.get("ticket_no"),
                    "ticket_type": t.get("ticket_type", "INTERNAL"),
                    "status": t.get("status", "OPEN"),
                    "priority": t.get("priority", "MEDIUM"),
                    "is_danger": bool(t.get("is_danger")),
                    "age_days": t.get("age_days", 0),
                    "danger_badge": t.get("danger_badge") or ("⚠️ DANGER (>3 Days)" if t.get("is_danger") else None),
                    "assigned_name": assigned_name or "Unassigned",
                    "assigned_role": assigned_role,
                    "created_date": c_date,
                    "created_day": day_name,
                    "description": desc,
                    "client_name": t.get("client_name", ""),
                    "department": t.get("department") or t.get("type_of_call") or "Operations"
                }

            int_all = [format_ticket_record(t) for t in internal_info.get("all_tickets", [])]
            ext_all = [format_ticket_record(t) for t in external_info.get("all_tickets", [])]

            all_list = int_all + ext_all
            all_list.sort(key=lambda x: int(x.get("ticket_no") or 0), reverse=True)

            danger_list = [t for t in all_list if t["is_danger"]]

            result["tickets"]["danger_tickets"] = danger_list
            result["tickets"]["internal_tickets"] = int_all
            result["tickets"]["external_tickets"] = ext_all
            result["tickets"]["all_tickets"] = all_list
        except Exception as e:
            logger.error(f"Error loading tickets drill-down: {e}")

    return result
