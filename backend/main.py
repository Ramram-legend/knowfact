"""
main.py — FastAPI application entry point for KnowFact.

Start the server with:
    uvicorn main:app --reload --port 8000
"""
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from pathlib import Path

from database import Base, engine, init_db
from routes import auth, fiches, search, users, departments

# ---------------------------------------------------------------------------
# Create all database tables on startup & ensure schema migrations
# ---------------------------------------------------------------------------
init_db()

# ---------------------------------------------------------------------------
# Create upload directory
# ---------------------------------------------------------------------------
Path("uploads").mkdir(exist_ok=True)

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
    ],
    allow_origin_regex=r"^https?://(localhost|127\.0\.0\.1)(:\d+)?$",
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# ---------------------------------------------------------------------------
# Serve uploaded files statically
# ---------------------------------------------------------------------------
app.mount("/uploads", StaticFiles(directory="uploads"), name="uploads")

# ---------------------------------------------------------------------------
# Routers
# ---------------------------------------------------------------------------
app.include_router(auth.router)
app.include_router(fiches.router)
app.include_router(search.router)
app.include_router(users.router)
app.include_router(departments.router)


# ---------------------------------------------------------------------------
# Health check
# ---------------------------------------------------------------------------
@app.get("/health", tags=["health"])
def health():
    return {"status": "ok", "service": "KnowFact API v1.0.0"}
