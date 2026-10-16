---
title: Dynamic Data & Poppins Font Rule
description: Enforces strictly dynamic data fetching without hardcoded data and Poppins font across the entire app
---

# Workspace Rules: Dynamic Data & Poppins Font

## 1. Strictly Dynamic Data Only (Zero Hardcoding)
- **Zero Hardcoded Business Data**: NEVER hardcode operational data, daily routine items, checklist items, tickets, reports, attendance numbers, collections, or user records inside frontend components or mock fallback arrays (e.g. `FALLBACK_ROUTINE_ITEMS = [...]`).
- **Dynamic Fetch Only**: All operational, routine, and executive data must be fetched live from backend API endpoints (`/api/...`) connected to the actual data source.
- **Handling Empty / Loading States**:
  - Show proper animated loading skeletons or empty states with a dynamic refresh/resync action.
  - DO NOT silently inject fake/mock records into the UI when an API call fails or is empty.

## 2. Poppins Font For Entire Website
- **Font Requirement**: The entire website must use **Poppins** font (`'Poppins', sans-serif`).
- **Enforcement**:
  - All typography tokens, CSS resets (`*`, `body`, `button`, `input`, `textarea`, `select`), cards, badges, headings, readouts, and counters must use `'Poppins', sans-serif !important`.
  - No fallback to other fonts; Poppins is the single universal typeface for this application.
