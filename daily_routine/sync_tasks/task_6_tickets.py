"""
=============================================================================
TASK 6: OPERATIONAL & CUSTOMER TICKETS AUDIT
=============================================================================
Internal & External separation, status-wise breakdown, and SLA Danger alert (> 3 days).
Strictly READ-ONLY from erp.crm.
Saves snapshot to local_db/<YYYY-MM-DD>/task_6_tickets.json.
"""

import sys
from pathlib import Path
import json
from datetime import datetime
from collections import Counter
import pymongo

from .common import get_current_date_dir, clean_for_json

def sync_task_6_tickets(client: pymongo.MongoClient) -> dict:
    """
    Task 6: Tickets Audit (Internal & External Separation, Status-wise, SLA Danger Alert > 3 Days)
    Strictly READ-ONLY from erp.crm.
    Saves snapshot to local_db/<YYYY-MM-DD>/task_6_tickets.json
    """
    now = datetime.now()
    output_dir = get_current_date_dir()
    output_file = output_dir / "task_6_tickets.json"

    erp_db = client["erp"]
    crm_collection = erp_db["crm"]

    # Strictly READ-ONLY fetch
    crm_cursor = crm_collection.find()
    all_tickets_raw = list(crm_cursor)

    internal_tickets = []
    external_tickets = []

    internal_status_counts = Counter()
    internal_priority_counts = Counter()
    external_status_counts = Counter()
    external_sources_counts = Counter()
    external_call_types_counts = Counter()

    for doc in all_tickets_raw:
        t_type = str(doc.get("ticketType") or "").strip().upper()
        raw_status = str(doc.get("status") or "").strip().upper()
        
        # Parse creation date
        created_on = doc.get("createdOn") or doc.get("date")
        if isinstance(created_on, str):
            try:
                created_dt = datetime.fromisoformat(created_on)
            except Exception:
                created_dt = now
        elif isinstance(created_on, datetime):
            created_dt = created_on
        else:
            created_dt = now

        age_days = max(0, (now - created_dt).days)
        is_solved = raw_status in ["CLOSED", "COMPLETED"]
        is_danger = (not is_solved) and (age_days > 3)

        base_item = {
            "ticket_no": doc.get("ticketNo"),
            "ticket_type": "EXTERNAL" if "EXT" in t_type else "INTERNAL",
            "status": raw_status if raw_status else ("PENDING_TRIAGE" if "EXT" in t_type else "OPEN"),
            "is_solved": is_solved,
            "created_date": str(created_dt)[:19],
            "age_days": age_days,
            "is_danger": is_danger,
            "danger_badge": "⚠️ DANGER (>3 Days Unsolved)" if is_danger else None,
            "danger_reason": f"Ticket unsolved for {age_days} days (SLA breached)" if is_danger else None,
            "assigned_to": {
                "id": doc.get("assignedEmployeeId"),
                "name": (doc.get("assignedEmployeeName") or "").strip(),
                "role": (doc.get("assignedEmployeeRole") or "").strip()
            },
            "confirmed_date": str(doc.get("confirmedDate") or "")[:19] or None,
            "commencement_date": str(doc.get("dateOfCommencement") or "")[:19] or None,
            "updated_on": str(doc.get("updatedOn") or "")[:19] or None
        }

        if "EXT" in t_type:
            # External Ticket
            base_item.update({
                "client_name": (doc.get("clientName") or "").strip(),
                "contact_number": (doc.get("contactNumber") or "").strip(),
                "email": (doc.get("emailId") or "").strip(),
                "address": (doc.get("address") or "").strip(),
                "source_of_lead": (doc.get("sourceOfLead") or "UNKNOWN").strip().upper(),
                "type_of_call": (doc.get("typeOfCall") or "UNSPECIFIED").strip().upper(),
                "created_by_name": (doc.get("createdByName") or "").strip(),
                "comments_count": len(doc.get("comments") or []),
                "comments": [
                    {
                        "comment": c.get("comments"),
                        "date": str(c.get("date") or "")[:19],
                        "status": c.get("status")
                    } for c in (doc.get("comments") or []) if isinstance(c, dict)
                ]
            })
            external_tickets.append(base_item)
            external_status_counts[base_item["status"]] += 1
            external_sources_counts[base_item["source_of_lead"]] += 1
            external_call_types_counts[base_item["type_of_call"]] += 1
        else:
            # Internal Ticket
            prio = str(doc.get("ticketPriority") or "UNSPECIFIED").strip().upper()
            base_item.update({
                "priority": prio,
                "issue_description": str(doc.get("issueDescription") or "").strip(),
                "unit_code": doc.get("unitCode"),
                "department": doc.get("department"),
                "first_level_escalation": {
                    "id": doc.get("firstLevelEmployeeId"),
                    "name": (doc.get("firstLevelEmployeeName") or "").strip(),
                    "role": (doc.get("firstLevelEmployeeRole") or "").strip()
                },
                "second_level_escalation": {
                    "id": doc.get("secondLevelEmployeeId"),
                    "name": (doc.get("secondLevelEmployeeName") or "").strip(),
                    "role": (doc.get("secondLevelEmployeeRole") or "").strip()
                },
                "has_documents": bool(doc.get("issueDocuments") and any(d for d in doc.get("issueDocuments") if d)),
                "issue_documents": [d for d in (doc.get("issueDocuments") or []) if d],
                "before_photos": [d for d in (doc.get("beforePhotoURL") or []) if d],
                "after_photos": [d for d in (doc.get("afterPhotosURL") or []) if d],
                "quotes": {
                    "quote_1": [q for q in (doc.get("quoteOneURL") or []) if q],
                    "quote_2": [q for q in (doc.get("quoteTwoURL") or []) if q],
                    "quote_3": [q for q in (doc.get("quoteThreeURL") or []) if q],
                    "final_quote": [q for q in (doc.get("finalQuoteURL") or []) if q]
                },
                "comments_count": len(doc.get("comments") or []),
                "comments": [
                    {
                        "comment": c.get("comments"),
                        "date": str(c.get("date") or "")[:19],
                        "status": c.get("status")
                    } for c in (doc.get("comments") or []) if isinstance(c, dict)
                ]
            })
            internal_tickets.append(base_item)
            internal_status_counts[base_item["status"]] += 1
            internal_priority_counts[prio] += 1

    # Sort tickets descending by ticket number
    internal_tickets.sort(key=lambda x: int(x.get("ticket_no") or 0), reverse=True)
    external_tickets.sort(key=lambda x: int(x.get("ticket_no") or 0), reverse=True)

    internal_danger_tickets = [t for t in internal_tickets if t["is_danger"]]
    external_danger_tickets = [t for t in external_tickets if t["is_danger"]]

    total_tickets = len(all_tickets_raw)
    total_internal = len(internal_tickets)
    total_external = len(external_tickets)
    total_danger = len(internal_danger_tickets) + len(external_danger_tickets)
    total_solved = sum(1 for t in internal_tickets if t["is_solved"]) + sum(1 for t in external_tickets if t["is_solved"])
    total_unsolved = total_tickets - total_solved

    final_payload = {
        "task_id": 6,
        "task_name": "Tickets Audit (Internal & External Separation)",
        "date": now.strftime("%Y-%m-%d"),
        "metrics": {
            "total_tickets": total_tickets,
            "total_internal_tickets": total_internal,
            "total_external_tickets": total_external,
            "total_solved_tickets": total_solved,
            "total_unsolved_tickets": total_unsolved,
            "total_danger_tickets_overdue_3_days": total_danger,
            "danger_overdue_rate_percent": round((total_danger / total_unsolved * 100), 1) if total_unsolved > 0 else 0.0,
            "internal_metrics": {
                "total": total_internal,
                "solved": sum(1 for t in internal_tickets if t["is_solved"]),
                "unsolved": sum(1 for t in internal_tickets if not t["is_solved"]),
                "danger_overdue_3_days": len(internal_danger_tickets),
                "status_breakdown": dict(internal_status_counts),
                "priority_breakdown": dict(internal_priority_counts)
            },
            "external_metrics": {
                "total": total_external,
                "solved": sum(1 for t in external_tickets if t["is_solved"]),
                "unsolved": sum(1 for t in external_tickets if not t["is_solved"]),
                "danger_overdue_3_days": len(external_danger_tickets),
                "status_breakdown": dict(external_status_counts),
                "source_breakdown": dict(external_sources_counts),
                "call_type_breakdown": dict(external_call_types_counts)
            }
        },
        "danger_alerts_summary": {
            "total_danger_count": total_danger,
            "internal_danger_count": len(internal_danger_tickets),
            "external_danger_count": len(external_danger_tickets),
            "description": "Tickets pending/unsolved for more than 3 days since registration (breached 3-day resolution SLA)"
        },
        "internal_tickets": {
            "total_count": total_internal,
            "status_summary": dict(internal_status_counts),
            "priority_summary": dict(internal_priority_counts),
            "danger_count": len(internal_danger_tickets),
            "danger_tickets": internal_danger_tickets,
            "all_tickets": internal_tickets
        },
        "external_tickets": {
            "total_count": total_external,
            "status_summary": dict(external_status_counts),
            "sources_summary": dict(external_sources_counts),
            "call_types_summary": dict(external_call_types_counts),
            "danger_count": len(external_danger_tickets),
            "danger_tickets": external_danger_tickets,
            "all_tickets": external_tickets
        }
    }

    with open(output_file, "w", encoding="utf-8") as f:
        json.dump(final_payload, f, indent=2, ensure_ascii=False)

    print(f"[SYNC SUCCESS] Task 6 Tickets saved to: {output_file}")
    return final_payload
