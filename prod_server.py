"""
=============================================================================
PRODUCTION UNIFIED SERVER (PURE PYTHON FASTAPI)
=============================================================================
Combines the FastAPI REST APIs from server.py with the compiled React SPA
frontend from react_vite/dist into a single, self-contained server.

ZERO 3rd-party proxies (No Caddy, No Ngrok, No Cloud tunnels).
100% on-premise and direct.
"""

import sys
import os
from pathlib import Path

# Ensure Python packages from C:\coding\python-packages or current venv are available
if r"C:\coding\python-packages" not in sys.path:
    sys.path.insert(0, r"C:\coding\python-packages")

from fastapi import HTTPException, Request, Response
from fastapi.staticfiles import StaticFiles
from fastapi.responses import FileResponse
import uvicorn

# Set ENABLE_AUTO_STARTUP_AGENT=false to ensure no automated calls/sync run during testing
os.environ["ENABLE_AUTO_STARTUP_AGENT"] = "false"

# Import base FastAPI app and configurations from server.py
from server import app as base_app
from config import BASE_DIR

DIST_DIR = BASE_DIR / "react_vite" / "dist"
ASSETS_DIR = DIST_DIR / "assets"

# Remove legacy static HTML page routes from server.py so React SPA handles them
OLD_STATIC_PATHS = {"/", "/checklist", "/audit", "/calendar", "/meetings"}
base_app.router.routes = [
    route for route in base_app.router.routes
    if not (hasattr(route, "path") and route.path in OLD_STATIC_PATHS)
]

# Mount compiled assets directory (/assets/...)
if ASSETS_DIR.exists():
    base_app.mount("/assets", StaticFiles(directory=str(ASSETS_DIR)), name="assets")

# SPA Fallback and Static File Handler
@base_app.get("/{full_path:path}", include_in_schema=False)
async def serve_spa(request: Request, full_path: str):
    # Pass through unhandled /api requests as 404 API responses
    if full_path.startswith("api/") or full_path == "api":
        raise HTTPException(status_code=404, detail=f"API endpoint '/{full_path}' not found")

    # Check if a static file directly in dist exists (e.g. favicon.svg, icons.svg)
    requested_file = DIST_DIR / full_path
    if full_path and requested_file.is_file():
        return FileResponse(requested_file)

    # For all page routes, serve the React SPA index.html
    index_html = DIST_DIR / "index.html"
    if index_html.exists():
        return FileResponse(index_html)

    return Response(
        content="React production build not found. Please run 'npm run build' inside react_vite folder.",
        media_type="text/plain",
        status_code=503
    )

# Root route serves index.html
@base_app.get("/", include_in_schema=False)
async def serve_root():
    index_html = DIST_DIR / "index.html"
    if index_html.exists():
        return FileResponse(index_html)
    return Response(
        content="React production build not found. Please run 'npm run build' inside react_vite folder.",
        media_type="text/plain",
        status_code=503
    )

app = base_app

if __name__ == "__main__":
    port = int(os.getenv("PORT", "80"))
    host = os.getenv("HOST", "0.0.0.0")
    print("=" * 60)
    print(f"[PROD SERVER] Starting Unified FastAPI + React Server on http://{host}:{port}")
    print(f"[PROD SERVER] React dist: {DIST_DIR}")
    print(f"[PROD SERVER] Agent auto-run: DISABLED (Safe Testing Mode)")
    print("=" * 60)
    uvicorn.run("prod_server:app", host=host, port=port, reload=False)
