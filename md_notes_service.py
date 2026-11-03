"""
=============================================================================
MD EXECUTIVE NOTES & AI COMPANION SERVICE (DATE-BASED JSON STORAGE)
=============================================================================
Provides a unified, date-partitioned storage and AI companion service for MD S GANESAMOORTHY.
- Stored in data/md_notes/<date>.json (e.g. data/md_notes/2026-10-22.json)
- Matches existing date architecture (data/daily_routines/2026-10-22.json, data/ai_reports/2026-10-22.json)
- Each note is an interactive discussion topic with Executive AI
- Remembers discussions across all dates ("ennaikko pesunadha patthi kepparu")
- Strict read-only database safety: zero writes to remote MongoDB
- Completely isolated from daily routine background agent & 10:30 AM scheduler
"""

import sys
from pathlib import Path

ROOT_DIR = Path(__file__).resolve().parent
if str(ROOT_DIR) not in sys.path:
    sys.path.insert(0, str(ROOT_DIR))

import json
import re
import threading
from datetime import datetime
from typing import List, Dict, Any, Optional
from config import BASE_DIR
from time_utils import format_time_ampm, get_current_ist_datetime, to_ist_iso
from ai_engine.client import OllamaClient

# Directory setup
MD_NOTES_DIR = BASE_DIR / "data" / "md_notes"
MD_NOTES_DIR.mkdir(parents=True, exist_ok=True)

_lock = threading.Lock()

# ---------------------------------------------------------------------------
# DATE-BASED FILE PATH HELPERS
# ---------------------------------------------------------------------------

def get_current_date_str() -> str:
    """Returns today's IST date string 'YYYY-MM-DD'."""
    return get_current_ist_datetime().strftime("%Y-%m-%d")

def get_date_filename(date_str: Optional[str] = None) -> str:
    """Returns filename like '2026-10-22.json'."""
    d = date_str or get_current_date_str()
    return f"{d}.json"

def get_date_file_path(date_str: Optional[str] = None) -> Path:
    """Returns absolute path like data/md_notes/2026-10-22.json."""
    return MD_NOTES_DIR / get_date_filename(date_str)

# ---------------------------------------------------------------------------
# SESSION LOADING & PERSISTENCE (DATE-PARTITIONED)
# ---------------------------------------------------------------------------

def _load_date_sessions() -> List[Dict[str, Any]]:
    """
    Loads all discussion topics/notes from date files in data/md_notes/
    (e.g., 2026-10-22.json). Also handles migration from sessions.json if needed.
    """
    today_str = get_current_date_str()
    today_file = get_date_file_path(today_str)
    sessions_fallback = MD_NOTES_DIR / "sessions.json"

    # Migration check: If today_file doesn't exist yet, but sessions.json exists, migrate it!
    if not today_file.exists() and sessions_fallback.exists():
        try:
            with open(sessions_fallback, "r", encoding="utf-8") as f:
                old_data = json.load(f)
            if isinstance(old_data, list) and len(old_data) > 0:
                with open(today_file, "w", encoding="utf-8") as f:
                    json.dump(old_data, f, indent=2, ensure_ascii=False)
        except Exception as e:
            print(f"[MD NOTES] Error migrating sessions.json to {today_file.name}: {e}")

    # Discover all date-based json files (e.g. 2026-10-22.json)
    date_files: List[Path] = []
    if MD_NOTES_DIR.exists():
        for p in MD_NOTES_DIR.glob("*.json"):
            if re.match(r"^\d{4}-\d{2}-\d{2}\.json$", p.name):
                date_files.append(p)

    # If still no date file exists, create initial welcome session for today
    if not date_files:
        now_ist = get_current_ist_datetime()
        time_str = format_time_ampm(now_ist)
        initial_session = {
            "id": "topic_welcome",
            "title": "MD Operational Directives & Thoughts",
            "category": "Directives",
            "date": today_str,
            "updatedAt": time_str,
            "created_at": to_ist_iso(now_ist),
            "messages": [
                {
                    "id": "msg_welcome",
                    "sender": "ai",
                    "text": "Good day Managing Director S GANESAMOORTHY sir! I am your personal Executive Notes & AI Companion. We can discuss your daily operations, brainstorm ideas, talk casually, clear doubts, or organize instructions. I remember our past discussions and your saved notes.",
                    "time": time_str,
                    "date": today_str
                }
            ]
        }
        with open(today_file, "w", encoding="utf-8") as f:
            json.dump([initial_session], f, indent=2, ensure_ascii=False)
        date_files.append(today_file)

    # Load and merge all date files (newest date first)
    all_sessions: List[Dict[str, Any]] = []
    seen_ids = set()

    for fpath in sorted(date_files, reverse=True):
        try:
            with open(fpath, "r", encoding="utf-8") as f:
                data = json.load(f)
                if isinstance(data, list):
                    for s in data:
                        if isinstance(s, dict) and s.get("id"):
                            if s["id"] not in seen_ids:
                                s["_date_file"] = fpath.name
                                # Normalization for ChatGPT Project-style multi-chat hierarchy:
                                # Each Note has a list of chat history threads (chats: [...])
                                if "chats" not in s or not isinstance(s["chats"], list) or len(s["chats"]) == 0:
                                    legacy_msgs = s.get("messages", [])
                                    s["chats"] = [
                                        {
                                            "id": f"chat_{s['id']}_1",
                                            "title": s.get("title", "Main Discussion"),
                                            "date": s.get("date", today_str),
                                            "updatedAt": s.get("updatedAt", ""),
                                            "created_at": s.get("created_at", ""),
                                            "messages": legacy_msgs
                                        }
                                    ]
                                # Keep top-level messages synced with first chat for backward compatibility
                                if s["chats"]:
                                    s["messages"] = s["chats"][0].get("messages", [])
                                seen_ids.add(s["id"])
                                all_sessions.append(s)
        except Exception as e:
            print(f"[MD NOTES] Error reading {fpath.name}: {e}")

    return all_sessions

def _save_date_sessions(sessions: List[Dict[str, Any]]) -> bool:
    """
    Saves sessions partitioned into their respective date files (e.g. data/md_notes/2026-10-22.json).
    Uses atomic temp file replacement.
    """
    today_str = get_current_date_str()
    files_map: Dict[str, List[Dict[str, Any]]] = {}

    for s in sessions:
        dest_filename = s.get("_date_file")
        if not dest_filename or not re.match(r"^\d{4}-\d{2}-\d{2}\.json$", dest_filename):
            d_val = s.get("date") or today_str
            dest_filename = get_date_filename(d_val)
        files_map.setdefault(dest_filename, []).append(s)

    for filename, group in files_map.items():
        dest_path = MD_NOTES_DIR / filename
        clean_group = []
        for item in group:
            clean_item = {k: v for k, v in item.items() if not k.startswith("_")}
            clean_group.append(clean_item)

        temp_file = dest_path.with_suffix(".json.tmp")
        try:
            with open(temp_file, "w", encoding="utf-8") as f:
                json.dump(clean_group, f, indent=2, ensure_ascii=False)
                f.flush()
            temp_file.replace(dest_path)
        except Exception:
            with open(dest_path, "w", encoding="utf-8") as f:
                json.dump(clean_group, f, indent=2, ensure_ascii=False)

    return True

# ---------------------------------------------------------------------------
# NOTE / PROJECT MANAGEMENT (ChatGPT Project Concept)
# ---------------------------------------------------------------------------

def get_all_sessions() -> List[Dict[str, Any]]:
    """Returns metadata for all Notes (Projects) with their chat history pages."""
    with _lock:
        sessions = _load_date_sessions()
        summaries = []
        for s in sessions:
            chats = s.get("chats", [])
            chat_summaries = []
            total_msgs = 0
            latest_preview = ""
            for c in chats:
                c_msgs = c.get("messages", [])
                total_msgs += len(c_msgs)
                last_m = c_msgs[-1].get("text", "") if c_msgs else ""
                prev = (last_m[:80] + "...") if len(last_m) > 80 else last_m
                if not latest_preview and prev:
                    latest_preview = prev
                chat_summaries.append({
                    "id": c.get("id"),
                    "title": c.get("title", "Chat Page"),
                    "date": c.get("date"),
                    "updatedAt": c.get("updatedAt"),
                    "created_at": c.get("created_at"),
                    "message_count": len(c_msgs),
                    "preview": prev
                })

            summaries.append({
                "id": s.get("id"),
                "title": s.get("title", "Untitled Note"),
                "category": s.get("category", "General"),
                "date": s.get("date"),
                "updatedAt": s.get("updatedAt"),
                "created_at": s.get("created_at"),
                "chat_count": len(chats),
                "message_count": total_msgs,
                "preview": latest_preview or "(Fresh note)",
                "chats": chat_summaries
            })
        return summaries

def get_session(session_id: str) -> Optional[Dict[str, Any]]:
    """Returns the full Note record with all its chats and messages."""
    with _lock:
        sessions = _load_date_sessions()
        for s in sessions:
            if s.get("id") == session_id:
                return s
            for c in s.get("chats", []):
                if c.get("id") == session_id:
                    return s
        return sessions[0] if sessions else None

def create_session(title: str = "New Note", category: str = "General", date_str: Optional[str] = None) -> Dict[str, Any]:
    """Creates a fresh Note (Project) with its initial chat page."""
    with _lock:
        sessions = _load_date_sessions()
        now_ist = get_current_ist_datetime()
        time_str = format_time_ampm(now_ist)
        target_date = date_str or now_ist.strftime("%Y-%m-%d")

        new_note_id = f"note_{int(now_ist.timestamp() * 1000)}"
        new_chat_id = f"chat_{int(now_ist.timestamp() * 1000)}"
        note_title = title.strip() or "New Note"

        initial_chat = {
            "id": new_chat_id,
            "title": "Discussion Page 1",
            "date": target_date,
            "updatedAt": time_str,
            "created_at": to_ist_iso(now_ist),
            "messages": [
                {
                    "id": f"msg_init_{int(now_ist.timestamp() * 1000)}",
                    "sender": "ai",
                    "text": f"Good day MD sir. Started new note: \"{note_title}\". What would you like to discuss, direct, or note down?",
                    "time": time_str,
                    "date": target_date
                }
            ]
        }

        new_session = {
            "id": new_note_id,
            "title": note_title,
            "category": category or "General",
            "date": target_date,
            "updatedAt": time_str,
            "created_at": to_ist_iso(now_ist),
            "_date_file": get_date_filename(target_date),
            "chats": [initial_chat],
            "messages": initial_chat["messages"]
        }
        sessions.insert(0, new_session)
        _save_date_sessions(sessions)
        return new_session

def update_session_meta(session_id: str, title: Optional[str] = None, category: Optional[str] = None) -> Optional[Dict[str, Any]]:
    """Updates the title of an existing Note."""
    with _lock:
        sessions = _load_date_sessions()
        target = None
        for s in sessions:
            if s.get("id") == session_id:
                if title is not None:
                    s["title"] = title.strip() or "Untitled Note"
                if category is not None:
                    s["category"] = category
                target = s
                break

        if target:
            _save_date_sessions(sessions)

        return target

def delete_session(session_id: str) -> bool:
    """Deletes a Note and all its chat pages from its date file."""
    with _lock:
        sessions = _load_date_sessions()
        target = next((s for s in sessions if s.get("id") == session_id), None)
        if not target:
            return False

        dest_filename = target.get("_date_file") or get_date_filename(target.get("date"))
        dest_path = MD_NOTES_DIR / dest_filename

        remaining = [s for s in sessions if s.get("id") != session_id and s.get("_date_file") == dest_filename]

        clean_group = []
        for item in remaining:
            clean_item = {k: v for k, v in item.items() if not k.startswith("_")}
            clean_group.append(clean_item)

        with open(dest_path, "w", encoding="utf-8") as f:
            json.dump(clean_group, f, indent=2, ensure_ascii=False)

        return True

# ---------------------------------------------------------------------------
# CHAT PAGES INSIDE A NOTE (ChatGPT Project Threads)
# ---------------------------------------------------------------------------

def create_chat_in_note(note_id: str, title: str = "New Chat") -> Optional[Dict[str, Any]]:
    """Creates a fresh chat history page inside an existing Note."""
    with _lock:
        sessions = _load_date_sessions()
        target_note = None
        for s in sessions:
            if s.get("id") == note_id:
                target_note = s
                break

        if not target_note:
            return None

        now_ist = get_current_ist_datetime()
        time_str = format_time_ampm(now_ist)
        target_date = now_ist.strftime("%Y-%m-%d")
        new_chat_id = f"chat_{int(now_ist.timestamp() * 1000)}"
        chat_title = title.strip() or f"Discussion Page {len(target_note.get('chats', [])) + 1}"

        new_chat = {
            "id": new_chat_id,
            "title": chat_title,
            "date": target_date,
            "updatedAt": time_str,
            "created_at": to_ist_iso(now_ist),
            "messages": [
                {
                    "id": f"msg_init_{int(now_ist.timestamp() * 1000)}",
                    "sender": "ai",
                    "text": f"Good day MD sir. Started new chat page: \"{chat_title}\" in note \"{target_note.get('title')}\". What would you like to discuss?",
                    "time": time_str,
                    "date": target_date
                }
            ]
        }
        target_note.setdefault("chats", []).insert(0, new_chat)
        target_note["updatedAt"] = time_str
        target_note["messages"] = new_chat["messages"]
        _save_date_sessions(sessions)
        return new_chat

def delete_chat_in_note(note_id: str, chat_id: str) -> bool:
    """Deletes a specific chat history page from a note."""
    with _lock:
        sessions = _load_date_sessions()
        target_note = next((s for s in sessions if s.get("id") == note_id), None)
        if not target_note:
            return False

        chats = target_note.get("chats", [])
        remaining = [c for c in chats if c.get("id") != chat_id]
        if not remaining:
            now_ist = get_current_ist_datetime()
            time_str = format_time_ampm(now_ist)
            remaining = [
                {
                    "id": f"chat_{int(now_ist.timestamp() * 1000)}",
                    "title": "Discussion Page 1",
                    "date": now_ist.strftime("%Y-%m-%d"),
                    "updatedAt": time_str,
                    "created_at": to_ist_iso(now_ist),
                    "messages": []
                }
            ]
        target_note["chats"] = remaining
        target_note["messages"] = remaining[0].get("messages", [])
        _save_date_sessions(sessions)
        return True

def update_chat_title(note_id: str, chat_id: str, title: str) -> bool:
    """Renames a specific chat page inside a note."""
    with _lock:
        sessions = _load_date_sessions()
        target_note = next((s for s in sessions if s.get("id") == note_id), None)
        if not target_note:
            return False

        for c in target_note.get("chats", []):
            if c.get("id") == chat_id:
                c["title"] = title.strip() or "Untitled Chat"
                _save_date_sessions(sessions)
                return True
        return False

# ---------------------------------------------------------------------------
# CORE CONVERSATIONAL ENGINE & REAL-TIME SSE STREAMING (PER CHAT PAGE)
# ---------------------------------------------------------------------------

class ThinkFilter:
    """Strips <think>...</think> tags and internal reasoning during live streaming."""
    def __init__(self):
        self.in_think = False
        self.buffer = ""

    def process_token(self, token: str) -> str:
        if not token:
            return ""
        self.buffer += token
        output = ""
        while self.buffer:
            if not self.in_think:
                if "<think>" in self.buffer:
                    idx = self.buffer.find("<think>")
                    output += self.buffer[:idx]
                    self.buffer = self.buffer[idx + 7:]
                    self.in_think = True
                elif any("<think>"[:i] == self.buffer for i in range(1, 7)):
                    break
                else:
                    output += self.buffer
                    self.buffer = ""
            else:
                if "</think>" in self.buffer:
                    idx = self.buffer.find("</think>")
                    self.buffer = self.buffer[idx + 8:].lstrip("\n\r ")
                    self.in_think = False
                else:
                    self.buffer = ""
                    break
        return output

    def flush(self) -> str:
        if not self.in_think and self.buffer:
            out = self.buffer
            self.buffer = ""
            return out
        return ""


def _prepare_session_and_prompt(session_id: str, user_message: str, chat_id: Optional[str] = None):
    """
    Registers MD user message into the targeted Chat page inside the Note
    and prepares prompt with cross-note memory archive.
    """
    clean_msg = user_message.strip()
    if not clean_msg:
        return None, None, None, None, None

    with _lock:
        sessions = _load_date_sessions()
        target_note = None
        target_chat = None

        # Match note by session_id or chat_id
        for s in sessions:
            if s.get("id") == session_id:
                target_note = s
                break
            for c in s.get("chats", []):
                if c.get("id") == session_id:
                    target_note = s
                    target_chat = c
                    break
            if target_note:
                break

        if not target_note and sessions:
            target_note = sessions[0]

        if not target_note:
            return None, None, None, None, None

        # Match chat inside note
        chats = target_note.get("chats", [])
        if not target_chat and chat_id:
            for c in chats:
                if c.get("id") == chat_id:
                    target_chat = c
                    break

        if not target_chat and chats:
            target_chat = chats[0]

        now_ist = get_current_ist_datetime()
        time_str = format_time_ampm(now_ist)
        date_str = now_ist.strftime("%Y-%m-%d")

        user_entry = {
            "id": f"msg_{int(now_ist.timestamp() * 1000)}",
            "sender": "user",
            "text": clean_msg,
            "time": time_str,
            "date": date_str
        }
        target_chat["messages"].append(user_entry)
        target_chat["updatedAt"] = time_str
        target_chat["date"] = date_str
        target_note["updatedAt"] = time_str
        target_note["messages"] = target_chat["messages"]

        # Auto-title chat page if still default
        if target_chat.get("title") in ("New Chat", "Untitled Chat", "General Discussion", "Main Discussion", "Discussion Page 1"):
            words = clean_msg.split()
            auto_title = " ".join(words[:5])
            if len(words) > 5:
                auto_title += "..."
            target_chat["title"] = auto_title[:45]

        # Save immediately to date file
        _save_date_sessions(sessions)

    # Build Memory Context across all notes & chats:
    archive_lines = []
    for s in sessions:
        s_title = s.get("title", "")
        for c in s.get("chats", []):
            msgs = c.get("messages", [])
            sample_msgs = []
            for m in msgs[-3:]:
                sample_msgs.append(f"    - {m.get('sender').upper()}: {m.get('text')[:100]}")
            sample_str = "\n".join(sample_msgs) if sample_msgs else "    - (No messages)"
            archive_lines.append(
                f"- Note: \"{s_title}\" > Chat: \"{c.get('title')}\" [Date: {c.get('date')} {c.get('updatedAt')}]\n{sample_str}"
            )
    archive_context = "\n".join(archive_lines[:15])

    current_msgs = target_chat.get("messages", [])
    recent_flow = []
    for m in current_msgs[-10:-1]:
        speaker = "MD" if m.get("sender") == "user" else "AI"
        recent_flow.append(f"{speaker} ({m.get('date')} {m.get('time')}): {m.get('text')}")
    recent_flow_str = "\n".join(recent_flow) if recent_flow else "(Fresh chat page)"

    system_prompt = (
        "You are the dedicated Executive AI Companion and Chief Thought Partner for Managing Director S GANESAMOORTHY (MD) of Vipras Group.\n\n"
        "YOUR ROLE & BEHAVIOR:\n"
        "- Address the user respectfully as 'MD sir' or 'Ganesamoorthy sir'.\n"
        "- Speak in clear, crisp, simple English, and understand Tanglish/Tamil colloquial references like 'ennaikko pesunadhu', 'idha note pannu', 'solli vachuko', 'doubt clear pannu'.\n"
        "- MD can discuss operational ideas, brainstorm strategies, clear doubts, talk casually, or dictate instructions.\n"
        "- When MD asks about past discussions or previous topics ('ennaikko pesunadha patthi kepparu'), cross-reference the PAST TOPICS & ARCHIVE accurately and answer with specific points.\n"
        "- Be highly structured, supportive, and actionable.\n"
        "- Keep answers concise without unnecessary robotic preamble."
    )

    full_prompt = (
        f"--- PAST TOPICS & ARCHIVE HISTORY ---\n{archive_context}\n\n"
        f"--- ACTIVE NOTE: \"{target_note.get('title')}\" > CHAT PAGE: \"{target_chat.get('title')}\" ---\n"
        f"{recent_flow_str}\n\n"
        f"--- CURRENT MESSAGE FROM MD S GANESAMOORTHY ---\n"
        f"MD: {clean_msg}\n\n"
        f"Respond directly to MD sir:"
    )

    return target_note.get("id"), target_chat.get("id"), full_prompt, system_prompt, clean_msg


def _finalize_ai_message(note_id: str, chat_id: str, reply_text: str) -> str:
    """
    Saves finalized AI message into the targeted chat page inside the date-partitioned JSON file.
    """
    clean_reply = reply_text.strip()
    if not clean_reply:
        clean_reply = "I have noted this, MD sir. What further details or actions should we structure for this topic?"

    with _lock:
        sessions = _load_date_sessions()
        for s in sessions:
            if s.get("id") == note_id:
                for c in s.get("chats", []):
                    if c.get("id") == chat_id:
                        now_ist = get_current_ist_datetime()
                        ai_entry = {
                            "id": f"msg_{int(now_ist.timestamp() * 1000)}",
                            "sender": "ai",
                            "text": clean_reply,
                            "time": format_time_ampm(now_ist),
                            "date": now_ist.strftime("%Y-%m-%d")
                        }
                        c["messages"].append(ai_entry)
                        c["updatedAt"] = format_time_ampm(now_ist)
                        s["updatedAt"] = format_time_ampm(now_ist)
                        s["messages"] = c["messages"]
                        break
                break

        _save_date_sessions(sessions)

    return clean_reply


def stream_message_to_session(session_id: str, user_message: str, chat_id: Optional[str] = None):
    """
    Streams AI response token-by-token via Server-Sent Events (SSE) into a chat page.
    """
    note_id, chat_id_found, full_prompt, system_prompt, clean_msg = _prepare_session_and_prompt(session_id, user_message, chat_id)
    if not note_id:
        yield f"data: {json.dumps({'error': 'Message is empty', 'done': True})}\n\n"
        return

    client = OllamaClient()
    accumulated_tokens = []
    think_filter = ThinkFilter()

    try:
        for chunk in client.stream_generate(
            prompt=full_prompt,
            system_prompt=system_prompt,
            temperature=0.3,
            timeout=120
        ):
            raw_token = chunk.get("token", "")
            if raw_token:
                filtered = think_filter.process_token(raw_token)
                if filtered:
                    accumulated_tokens.append(filtered)
                    yield f"data: {json.dumps({'token': filtered, 'done': False})}\n\n"

            if chunk.get("done"):
                break

        leftover = think_filter.flush()
        if leftover:
            accumulated_tokens.append(leftover)
            yield f"data: {json.dumps({'token': leftover, 'done': False})}\n\n"

    except Exception as e:
        err_msg = f" (Note: Connection interrupted: {e})"
        accumulated_tokens.append(err_msg)
        yield f"data: {json.dumps({'token': err_msg, 'done': False})}\n\n"

    full_reply = "".join(accumulated_tokens).strip()
    if not full_reply:
        full_reply = "I have noted this, MD sir. What further details or actions should we structure for this topic?"
        yield f"data: {json.dumps({'token': full_reply, 'done': False})}\n\n"

    final_reply = _finalize_ai_message(note_id, chat_id_found, full_reply)

    final_payload = {
        "token": "",
        "done": True,
        "full_text": final_reply,
        "note_id": note_id,
        "chat_id": chat_id_found,
        "session": get_session(note_id),
        "sessions": get_all_sessions()
    }
    yield f"data: {json.dumps(final_payload)}\n\n"


def send_message_to_session(session_id: str, user_message: str, chat_id: Optional[str] = None) -> Dict[str, Any]:
    """
    Synchronous fallback conversational interface for MD S GANESAMOORTHY.
    """
    note_id, chat_id_found, full_prompt, system_prompt, clean_msg = _prepare_session_and_prompt(session_id, user_message, chat_id)
    if not note_id:
        return {"success": False, "error": "Message is empty"}

    client = OllamaClient()
    try:
        ai_raw = client.generate(
            prompt=full_prompt,
            system_prompt=system_prompt,
            temperature=0.3,
            timeout=90
        )
        reply_text = ai_raw.get("response", "")
        reply_text = re.sub(r"<think>[\s\S]*?</think>", "", reply_text).strip()
    except Exception as e:
        reply_text = f"MD sir, I have recorded your message: \"{clean_msg}\". (Note: Local AI inference busy: {e})"

    final_reply = _finalize_ai_message(note_id, chat_id_found, reply_text)

    return {
        "success": True,
        "reply": final_reply,
        "note_id": note_id,
        "chat_id": chat_id_found,
        "session": get_session(note_id),
        "sessions": get_all_sessions()
    }

# ---------------------------------------------------------------------------
# BACKWARD COMPATIBILITY ADAPTERS
# ---------------------------------------------------------------------------
def get_all_notes() -> List[Dict[str, Any]]:
    return get_all_sessions()

def save_note(note_data: Dict[str, Any]) -> Dict[str, Any]:
    note_id = note_data.get("id")
    if note_id:
        updated = update_session_meta(note_id, title=note_data.get("title"), category=note_data.get("category"))
        if updated:
            return updated
    return create_session(title=note_data.get("title", "New Note"), category=note_data.get("category", "General"))

def delete_note(note_id: str) -> bool:
    return delete_session(note_id)

def get_chat_history(limit: int = 50) -> List[Dict[str, Any]]:
    sessions = _load_date_sessions()
    if sessions:
        return sessions[0].get("messages", [])[-limit:]
    return []

def chat_with_md_companion(user_message: str, active_note_id: Optional[str] = None) -> Dict[str, Any]:
    sessions = _load_date_sessions()
    session_id = active_note_id or (sessions[0].get("id") if sessions else "topic_welcome")
    return send_message_to_session(session_id, user_message)

def clear_chat_history() -> bool:
    sessions = _load_date_sessions()
    if sessions:
        first_id = sessions[0].get("id")
        return delete_session(first_id)
    return True
