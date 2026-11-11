"""
database.py — SQLAlchemy engine, session factory, and Base declaration.
"""
import os
from pathlib import Path
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker, DeclarativeBase

BASE_DIR = Path(__file__).resolve().parent
DEFAULT_DB_PATH = (BASE_DIR / "knowfact.db").resolve()
DATABASE_URL = os.getenv("DATABASE_URL", f"sqlite:///{DEFAULT_DB_PATH.as_posix()}")

engine = create_engine(
    DATABASE_URL,
    connect_args={"check_same_thread": False},
    echo=False,
)

SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)


class Base(DeclarativeBase):
    pass


def init_db():
    """Ensure all tables and columns exist in SQLite without requiring Alembic."""
    import sqlite3
    Base.metadata.create_all(bind=engine)
    
    # Check if we are on SQLite and auto-add missing columns on fiche_versions if needed
    if "sqlite" in DATABASE_URL:
        db_path = DATABASE_URL.replace("sqlite:///", "").replace("sqlite://", "")
        if db_path.startswith("./"):
            db_path = str((BASE_DIR / db_path[2:]).resolve())
        try:
            con = sqlite3.connect(db_path)
            cur = con.cursor()
            cols = [col[1] for col in cur.execute("PRAGMA table_info(fiche_versions)").fetchall()]
            if cols:
                if "title" not in cols:
                    cur.execute("ALTER TABLE fiche_versions ADD COLUMN title VARCHAR(500)")
                if "status" not in cols:
                    cur.execute("ALTER TABLE fiche_versions ADD COLUMN status VARCHAR(50) DEFAULT 'active'")
                if "improvement_reason" not in cols:
                    cur.execute("ALTER TABLE fiche_versions ADD COLUMN improvement_reason TEXT")
                if "parent_version_id" not in cols:
                    cur.execute("ALTER TABLE fiche_versions ADD COLUMN parent_version_id INTEGER REFERENCES fiche_versions(id)")
                if "updated_at" not in cols:
                    cur.execute("ALTER TABLE fiche_versions ADD COLUMN updated_at DATETIME")
                con.commit()
            con.close()
        except Exception as e:
            print(f"init_db migration note: {e}")


def get_db():
    """FastAPI dependency that yields a database session and ensures it closes."""
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()
