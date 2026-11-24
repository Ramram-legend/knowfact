"""
main.py — FastAPI application entry point for KnowFact.

Start the server with:
    uvicorn main:app --reload --port 8000
"""
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles

from database import Base, engine, init_db, UPLOAD_DIR
from routes import auth, fiches, search, users, departments, stats
from routes import gamification as gamification_router
from routes import ai_assistant as ai_assistant_router

# ---------------------------------------------------------------------------
# Create all database tables on startup & ensure schema migrations
# ---------------------------------------------------------------------------
init_db()

# ---------------------------------------------------------------------------
# Create upload directory
# ---------------------------------------------------------------------------
UPLOAD_DIR.mkdir(parents=True, exist_ok=True)

# ---------------------------------------------------------------------------
# App instance
# ---------------------------------------------------------------------------
app = FastAPI(
    title="KnowFact API",
    description="Industrial Knowledge Management System — MVP Backend",
    version="1.0.0",
    docs_url="/docs",
    redoc_url="/redoc",
)

# ---------------------------------------------------------------------------
# CORS — allow the Vite dev server (localhost:5173) and common origins
# ---------------------------------------------------------------------------
app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:5173",
        "http://127.0.0.1:5173",
        "http://localhost:3000",
        "http://127.0.0.1:3000",
        "http://localhost:8000",
        "http://127.0.0.1:8000",
        # Electron production (file:// renderer calling localhost backend)
        "null",
    ],
    allow_origin_regex=r"^https?://(localhost|127\.0\.0\.1)(:\d+)?$",
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# ---------------------------------------------------------------------------
# Serve uploaded files statically
# ---------------------------------------------------------------------------
app.mount("/uploads", StaticFiles(directory=str(UPLOAD_DIR)), name="uploads")

# ---------------------------------------------------------------------------
# Routers
# ---------------------------------------------------------------------------
app.include_router(auth.router)
app.include_router(fiches.router)
app.include_router(search.router)
app.include_router(users.router)
app.include_router(departments.router)
app.include_router(gamification_router.router)
app.include_router(stats.router)
app.include_router(ai_assistant_router.router)


# ---------------------------------------------------------------------------
# Health check
# ---------------------------------------------------------------------------
@app.get("/health", tags=["health"])
def health():
    return {"status": "ok", "service": "KnowFact API v1.0.0"}


if __name__ == "__main__":
    import argparse
    import os
    import uvicorn

    parser = argparse.ArgumentParser(description="KnowFact API Server")
    parser.add_argument("--host", default="127.0.0.1")
    parser.add_argument("--port", type=int, default=int(os.getenv("PORT", "8000")))
    args = parser.parse_args()

    uvicorn.run(app, host=args.host, port=args.port, log_level="info")
