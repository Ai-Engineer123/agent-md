# Workspace Rules & Instructions

## 🚨 STRICT DATABASE SAFETY RULE (CRITICAL)

### MongoDB Connection: READ-ONLY ONLY
- **Database Scope**: The MongoDB database configured for this workspace is **READ-ONLY**.
- **Allowed Operations**:
  - `find()`, `findOne()`
  - Read-only `aggregate()` (strictly **NO** `$out` or `$merge` stages)
  - `count_documents()` / `estimated_document_count()`
  - Schema inspection & index inspection (`list_collection_names()`, etc.)
- **STRICTLY PROHIBITED**:
  - ❌ **NO inserts**: `insert_one`, `insert_many`, `bulk_write`
  - ❌ **NO updates**: `update_one`, `update_many`, `replace_one`, `find_one_and_update`
  - ❌ **NO deletes**: `delete_one`, `delete_many`, `find_one_and_delete`
  - ❌ **NO drops**: `drop_collection`, `drop_database`, `drop_index`
- **Enforcement**:
  - Any database client or abstraction built in any language (Python, Rust, Go, TypeScript) MUST implement read-only safeguards (e.g. read-only driver wrappers or connection options) preventing any write/mutation operation.
  - If any user or agent request implies modifying the database, reject the mutation immediately and state that the database is read-only.

## ⚡ RULE 1: STRICTLY DYNAMIC DATA ONLY (NO HARDCODING)
- **Zero Hardcoded Business Data**: NEVER hardcode operational data, daily routine items, checklist items, tickets, reports, attendance numbers, collections, or user records inside frontend components or mock fallback arrays (e.g. `FALLBACK_ROUTINE_ITEMS = [...]`).
- **Dynamic Fetch Only**: All operational, routine, and executive data must be fetched live from backend API endpoints (`/api/...`) connected to the actual data source.
- **Handling Empty / Loading States**:
  - Show proper animated loading skeletons or empty states with a dynamic refresh/resync action.
  - DO NOT silently inject fake/mock records into the UI when an API call fails or is empty.

## 🎨 RULE 2: SPACE GROTESK FONT FOR ENTIRE WEBSITE
- **Font Requirement**: The entire website must use **Space Grotesk** font (`'Space Grotesk', sans-serif`).
- **Enforcement**:
  - All typography tokens, CSS resets (`*`, `body`, `button`, `input`, `textarea`, `select`), cards, badges, headings, readouts, and counters must use `'Space Grotesk', sans-serif !important`.
  - No fallback to other fonts; Space Grotesk is the single universal typeface for this application.

