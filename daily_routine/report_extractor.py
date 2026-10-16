"""
=============================================================================
REPORT EXTRACTOR & DOWNLOADER (EXCEL, PDF, DOCX)
=============================================================================
Automatically downloads operational report files (DMR, site updates, attachments)
from cloud/S3 storage and extracts detailed structured content:
- Excel (.xlsx, .xls): Attendance, DG/Power, Equipment Health, Complaints, Notes
- PDF (.pdf): Full text, page breakdown, metadata
- Word (.docx): Headings, paragraphs, tables

Stores downloaded files in:
    local_db/<YYYY-MM-DD>/extracted_reports/raw_files/
Stores extracted data in:
    local_db/<YYYY-MM-DD>/extracted_reports/extracted_data/
"""

import sys
from pathlib import Path

ROOT_DIR = Path(__file__).resolve().parent.parent
if str(ROOT_DIR) not in sys.path:
    sys.path.insert(0, str(ROOT_DIR))

if r"C:\coding\python-packages" not in sys.path:
    sys.path.insert(0, r"C:\coding\python-packages")

import os
import json
import re
import urllib.request
import urllib.parse
from datetime import datetime
from config import BASE_DIR

LOCAL_DB_DIR = BASE_DIR / "local_db"

def get_extracted_dir(date_str: str = None, category: str = "extracted_reports") -> tuple:
    """Returns (raw_files_dir, extracted_data_dir) for given date and category."""
    if not date_str:
        date_str = datetime.now().strftime("%Y-%m-%d")
    base = LOCAL_DB_DIR / date_str / category
    raw_dir = base / "raw_files"
    data_dir = base / "extracted_data"
    raw_dir.mkdir(parents=True, exist_ok=True)
    data_dir.mkdir(parents=True, exist_ok=True)
    return raw_dir, data_dir

def get_extracted_reports_dir(date_str: str = None) -> tuple:
    """Returns (raw_files_dir, extracted_data_dir) for site DMR reports."""
    return get_extracted_dir(date_str, "extracted_reports")

def get_extracted_work_updates_dir(date_str: str = None) -> tuple:
    """Unified alias: points directly to extracted_reports."""
    return get_extracted_dir(date_str, "extracted_reports")

def download_file(url: str, output_path: Path, timeout: int = 25) -> bool:
    """Downloads a file from URL to output_path if not already present."""
    if output_path.exists() and output_path.stat().st_size > 0:
        return True  # Already cached

    try:
        parsed = urllib.parse.urlsplit(url)
        # Unquote first to avoid double encoding, then quote cleanly
        clean_path = urllib.parse.quote(urllib.parse.unquote(parsed.path))
        encoded_url = urllib.parse.urlunsplit((parsed.scheme, parsed.netloc, clean_path, parsed.query, parsed.fragment))

        req = urllib.request.Request(encoded_url, headers={"User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64)"})
        with urllib.request.urlopen(req, timeout=timeout) as response:
            content = response.read()

        with open(output_path, "wb") as f:
            f.write(content)

        return True
    except Exception as e:
        print(f"[DOWNLOAD ERROR] Failed to download {url}: {e}")
        return False

def extract_excel_content(file_path: Path) -> dict:
    """Extracts detailed structured sections from an Excel DMR file."""
    import openpyxl

    wb = openpyxl.load_workbook(file_path, data_only=True)
    sheets_data = {}
    consolidated_summary = {
        "site_name": None,
        "month": None,
        "attendance": {},
        "power_and_dg": [],
        "critical_equipment": [],
        "non_critical_equipment": [],
        "daily_complaints_and_highlights": [],
        "pest_control": [],
        "breakdowns": [],
        "incidents": [],
        "all_text_snippets": []
    }

    for sheet_name in wb.sheetnames:
        ws = wb[sheet_name]
        sheet_rows = []
        for r in range(1, ws.max_row + 1):
            row_vals = [str(ws.cell(r, c).value or "").strip() for c in range(1, min(15, ws.max_column + 1))]
            cleaned = [v for v in row_vals if v and v != "None"]
            if cleaned:
                sheet_rows.append({"row_num": r, "values": cleaned, "line": " | ".join(cleaned)})

        # Parse sections from the newest / active sheet into consolidated_summary
        for item in sheet_rows:
            line = item["line"]
            lower = line.lower()

            # Site details
            if "site details" in lower and not consolidated_summary["site_name"]:
                consolidated_summary["site_name"] = line
            if "month :" in lower and not consolidated_summary["month"]:
                consolidated_summary["month"] = line

            # Complaints & Daily work notes
            if any(k in lower for k in ["work completed", "agreement", "fault", "pressure", "chamber work", "handover", "nature of complaint"]):
                consolidated_summary["daily_complaints_and_highlights"].append(line)

            # Equipment health
            if any(k in lower for k in ["transformer", "dg systems", "elevator", "cctv", "street lighting", "access control"]):
                if "critical" in lower:
                    consolidated_summary["critical_equipment"].append(line)
                else:
                    consolidated_summary["non_critical_equipment"].append(line)

            # Pest control
            if "pest" in lower or "fogging" in lower:
                consolidated_summary["pest_control"].append(line)

            # DG & Power
            if any(k in lower for k in ["dg-1", "dg-2", "tneb", "consumption", "running hour"]):
                consolidated_summary["power_and_dg"].append(line)

            # Attendance
            if any(k in lower for k in ["facility manager", "technician", "house keeping", "aso", "gardener", "security guard"]):
                consolidated_summary["attendance"][item["values"][0]] = " | ".join(item["values"][1:])

        sheets_data[sheet_name] = {
            "total_rows": len(sheet_rows),
            "rows": sheet_rows
        }

    return {
        "file_type": "EXCEL",
        "sheet_names": wb.sheetnames,
        "active_sheet": wb.active.title if wb.active else None,
        "consolidated_highlights": consolidated_summary,
        "sheets": sheets_data
    }

def extract_pdf_content(file_path: Path) -> dict:
    """Extracts text, pages, and metadata from a PDF file using pypdf."""
    from pypdf import PdfReader

    reader = PdfReader(str(file_path))
    pages_text = []
    full_text = []

    for i, page in enumerate(reader.pages):
        text = page.extract_text() or ""
        pages_text.append({
            "page_num": i + 1,
            "text": text.strip()
        })
        if text.strip():
            full_text.append(text.strip())

    return {
        "file_type": "PDF",
        "total_pages": len(reader.pages),
        "pages": pages_text,
        "full_text": "\n\n".join(full_text)
    }

def extract_docx_content(file_path: Path) -> dict:
    """Extracts paragraphs and tables from a Word (.docx) file."""
    import docx

    doc = docx.Document(str(file_path))
    paragraphs = [p.text.strip() for p in doc.paragraphs if p.text.strip()]

    tables_data = []
    for t_idx, table in enumerate(doc.tables):
        rows = []
        for row in table.rows:
            r_vals = [cell.text.strip() for cell in row.cells]
            if any(r_vals):
                rows.append(r_vals)
        if rows:
            tables_data.append({"table_index": t_idx + 1, "rows": rows})

    return {
        "file_type": "DOCX",
        "total_paragraphs": len(paragraphs),
        "paragraphs": paragraphs,
        "tables": tables_data,
        "full_text": "\n".join(paragraphs)
    }

def process_and_extract_file(url: str, original_filename: str, report_meta: dict, date_str: str = None, category: str = "extracted_reports") -> dict:
    """
    Downloads file from URL, extracts content based on extension,
    and saves clean extracted JSON into category folder (e.g. extracted_reports, extracted_work_updates).
    """
    if not url:
        return {"status": "SKIPPED_NO_URL"}

    raw_dir, data_dir = get_extracted_dir(date_str, category)

    # Clean local file name
    clean_name = re.sub(r'[^a-zA-Z0-9_.-]', '_', original_filename or Path(urllib.parse.urlparse(url).path).name)
    if not clean_name:
        clean_name = f"report_{datetime.now().strftime('%H%M%S')}.bin"

    local_raw_path = raw_dir / clean_name
    extracted_json_path = data_dir / f"{clean_name}.json"

    # 1. Download
    download_success = download_file(url, local_raw_path)
    if not download_success:
        return {
            "status": "DOWNLOAD_FAILED",
            "url": url,
            "filename": clean_name
        }

    # 2. Extract based on extension
    ext = local_raw_path.suffix.lower()
    extracted_data = {}
    try:
        if ext in [".xlsx", ".xls"]:
            extracted_data = extract_excel_content(local_raw_path)
        elif ext == ".pdf":
            extracted_data = extract_pdf_content(local_raw_path)
        elif ext == ".docx":
            extracted_data = extract_docx_content(local_raw_path)
        elif ext in [".jpg", ".jpeg", ".png"]:
            extracted_data = {
                "file_type": "IMAGE",
                "filename": clean_name,
                "file_size_bytes": local_raw_path.stat().st_size
            }
        else:
            extracted_data = {
                "file_type": "UNKNOWN",
                "filename": clean_name,
                "file_size_bytes": local_raw_path.stat().st_size
            }
    except Exception as e:
        extracted_data = {
            "file_type": ext,
            "extraction_error": str(e)
        }

    # 3. Save combined metadata & extracted content
    result_doc = {
        "filename": clean_name,
        "source_url": url,
        "file_extension": ext,
        "file_size_bytes": local_raw_path.stat().st_size if local_raw_path.exists() else 0,
        "local_raw_path": str(local_raw_path),
        "local_extracted_json_path": str(extracted_json_path),
        "report_metadata": report_meta,
        "extracted_content": extracted_data,
        "extracted_at": datetime.now().isoformat()
    }

    with open(extracted_json_path, "w", encoding="utf-8") as f:
        json.dump(result_doc, f, indent=2, ensure_ascii=False)

    return result_doc
