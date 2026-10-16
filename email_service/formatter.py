"""
=============================================================================
EXECUTIVE BRIEFING EMAIL FORMATTER & HTML BUILDER
=============================================================================
Transforms the raw AI Executive Summary markdown into a self-contained,
luxury-styled HTML email with inlined CSS that renders consistently across
Gmail, Outlook, Apple Mail, and mobile email clients.
"""

import re
import sys
from pathlib import Path
from datetime import datetime

ROOT_DIR = Path(__file__).resolve().parent.parent
if str(ROOT_DIR) not in sys.path:
    sys.path.insert(0, str(ROOT_DIR))

if r"C:\coding\python-packages" not in sys.path:
    sys.path.insert(0, r"C:\coding\python-packages")

import markdown

def clean_markdown_for_email(raw_md: str) -> str:
    """Strips trailing checklists, recap checkboxes, and normalizes spacing."""
    if not raw_md:
        return ""
    
    # Strip any trailing 'Quick Recap Checklist' or checkbox blocks
    cleaned = re.sub(
        r"(?:---|---)?\s*###?\s*.*(?:Checklist|Recap|Tick as you go|Walk‑through|Walk-through)[\s\S]*$",
        "",
        raw_md,
        flags=re.IGNORECASE
    )
    cleaned = re.sub(r"(?:\n\s*[-*]\s*\[[ xX]\].*)+$", "", cleaned, flags=re.IGNORECASE)
    return cleaned.strip()

def style_html_elements_for_email(html_body: str) -> str:
    """Injects inline CSS styles to standard HTML elements generated from Markdown."""
    
    # Style Tables
    html_body = html_body.replace(
        "<table>",
        '<table style="width: 100%; border-collapse: collapse; margin: 18px 0; background-color: #0f172a; border-radius: 8px; overflow: hidden; border: 1px solid #334155;">'
    )
    html_body = re.sub(
        r"<th>(.*?)</th>",
        r'<th style="background-color: #1e293b; color: #00e5ff; font-weight: 700; text-align: left; padding: 12px 14px; font-size: 13px; text-transform: uppercase; letter-spacing: 0.05em; border-bottom: 2px solid #00e5ff;">\1</th>',
        html_body
    )
    html_body = re.sub(
        r"<td>(.*?)</td>",
        r'<td style="padding: 10px 14px; border-bottom: 1px solid #1e293b; color: #cbd5e1; font-size: 13.5px; line-height: 1.5;">\1</td>',
        html_body
    )
    
    # Style Headings
    html_body = re.sub(
        r"<h2>(.*?)</h2>",
        r'<h2 style="color: #00e5ff; font-size: 18px; font-weight: 700; margin-top: 28px; margin-bottom: 12px; padding-bottom: 6px; border-bottom: 1px solid rgba(0, 229, 255, 0.25); letter-spacing: -0.01em;">\1</h2>',
        html_body
    )
    html_body = re.sub(
        r"<h3>(.*?)</h3>",
        r'<h3 style="color: #38bdf8; font-size: 15px; font-weight: 600; margin-top: 20px; margin-bottom: 10px;">\1</h3>',
        html_body
    )
    
    # Style Blockquotes
    html_body = re.sub(
        r"<blockquote>([\s\S]*?)</blockquote>",
        r'<blockquote style="margin: 16px 0; padding: 12px 18px; background-color: rgba(0, 229, 255, 0.06); border-left: 4px solid #00e5ff; border-radius: 4px; color: #94a3b8; font-style: normal; font-size: 13.5px;">\1</blockquote>',
        html_body
    )
    
    # Style Paragraphs & Lists
    html_body = re.sub(
        r"<p>",
        r'<p style="margin: 0 0 12px 0; color: #e2e8f0; font-size: 14px; line-height: 1.65;">',
        html_body
    )
    html_body = re.sub(
        r"<ul>",
        r'<ul style="margin: 0 0 16px 0; padding-left: 20px; color: #cbd5e1; font-size: 14px; line-height: 1.6;">',
        html_body
    )
    html_body = re.sub(
        r"<li>",
        r'<li style="margin-bottom: 6px;">',
        html_body
    )
    
    # Style Strong / Bold
    html_body = re.sub(
        r"<strong>(.*?)</strong>",
        r'<strong style="color: #ffffff; font-weight: 700;">\1</strong>',
        html_body
    )
    
    return html_body

def build_executive_email_html(report_data: dict, target_date_str: str = None) -> str:
    """
    Builds the full HTML email document with luxury executive styling.
    """
    if not target_date_str:
        target_date_str = report_data.get("date", datetime.now().strftime("%Y-%m-%d"))
    
    try:
        dt_obj = datetime.strptime(target_date_str, "%Y-%m-%d")
        formatted_date = dt_obj.strftime("%A, %B %d, %Y")
    except Exception:
        formatted_date = target_date_str

    raw_md = report_data.get("ai_response_raw", "")
    cleaned_md = clean_markdown_for_email(raw_md)
    
    # Convert Markdown to HTML
    body_html_raw = markdown.markdown(
        cleaned_md,
        extensions=["tables", "fenced_code", "nl2br"]
    )
    
    styled_content_html = style_html_elements_for_email(body_html_raw)
    
    now_str = datetime.now().strftime("%I:%M %p IST")

    full_html = f"""<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>MD Executive Intelligence Briefing — {target_date_str}</title>
</head>
<body style="margin: 0; padding: 0; background-color: #040810; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; color: #e2e8f0; -webkit-font-smoothing: antialiased;">
  <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="background-color: #040810; padding: 24px 12px;">
    <tr>
      <td align="center">
        <!-- Main Email Container -->
        <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="max-width: 720px; background-color: #0b1322; border: 1px solid #1e293b; border-radius: 12px; overflow: hidden; box-shadow: 0 10px 30px rgba(0, 0, 0, 0.5);">
          
          <!-- Top Header Banner -->
          <tr>
            <td style="padding: 28px 32px; background: linear-gradient(135deg, #091322 0%, #0f213b 100%); border-bottom: 2px solid #00e5ff;">
              <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0">
                <tr>
                  <td>
                    <!-- Badge -->
                    <span style="display: inline-block; padding: 4px 10px; background-color: rgba(0, 229, 255, 0.15); border: 1px solid rgba(0, 229, 255, 0.4); border-radius: 20px; font-size: 11px; font-weight: 700; color: #00e5ff; text-transform: uppercase; letter-spacing: 0.08em; margin-bottom: 10px;">
                      ⚡ VTS EXECUTIVE INTELLIGENCE BRIEFING
                    </span>
                    <h1 style="margin: 0 0 6px 0; color: #ffffff; font-size: 24px; font-weight: 800; letter-spacing: -0.02em;">
                      Managing Director Daily Operational Briefing
                    </h1>
                    <p style="margin: 0; color: #94a3b8; font-size: 13.5px;">
                      Audited Date: <strong style="color: #f8fafc;">{formatted_date}</strong> • Generated at <strong style="color: #00e5ff;">{now_str}</strong>
                    </p>
                  </td>
                </tr>
              </table>
            </td>
          </tr>

          <!-- Meta Pill Summary Bar -->
          <tr>
            <td style="padding: 12px 32px; background-color: #0f1c30; border-bottom: 1px solid #1e293b;">
              <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0">
                <tr>
                  <td style="font-size: 12px; color: #94a3b8;">
                    👤 Managing Director: <strong style="color: #38bdf8;">S GANESAMOORTHY</strong>
                  </td>
                  <td align="right" style="font-size: 12px; color: #94a3b8;">
                    🏢 Head Office: <strong style="color: #10b981;">UC001 (SHOLINGANALLUR)</strong>
                  </td>
                </tr>
              </table>
            </td>
          </tr>

          <!-- Main Briefing Content Body -->
          <tr>
            <td style="padding: 32px 32px 24px 32px; color: #e2e8f0; font-size: 14px; line-height: 1.65;">
              {styled_content_html}
            </td>
          </tr>

          <!-- Footer & Confidentiality -->
          <tr>
            <td style="padding: 24px 32px; background-color: #070d18; border-top: 1px solid #1e293b; text-align: center;">
              <p style="margin: 0 0 6px 0; font-size: 12px; color: #64748b;">
                Generated autonomously by <strong>VTS Executive Operations AI Agent</strong>
              </p>
              <p style="margin: 0; font-size: 11px; color: #475569;">
                Confidential & Proprietary • Managing Director Strategic Decision Support • Zero Write-Safeguards Active
              </p>
            </td>
          </tr>

        </table>
      </td>
    </tr>
  </table>
</body>
</html>
"""
    return full_html
