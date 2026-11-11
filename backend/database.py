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

        # ---------------------------------------------------------------
        # Migrations : colonnes departments, workstations, user_departments
        # ---------------------------------------------------------------
        try:
            con = sqlite3.connect(db_path)
            cur = con.cursor()

            # users → primary_department_id, primary_workstation_id
            user_cols = [col[1] for col in cur.execute("PRAGMA table_info(users)").fetchall()]
            if user_cols:
                if "primary_department_id" not in user_cols:
                    cur.execute("ALTER TABLE users ADD COLUMN primary_department_id INTEGER REFERENCES departments(id)")
                if "primary_workstation_id" not in user_cols:
                    cur.execute("ALTER TABLE users ADD COLUMN primary_workstation_id INTEGER REFERENCES workstations(id)")

            # fiches → department_id, workstation_id
            fiche_cols = [col[1] for col in cur.execute("PRAGMA table_info(fiches)").fetchall()]
            if fiche_cols:
                if "department_id" not in fiche_cols:
                    cur.execute("ALTER TABLE fiches ADD COLUMN department_id INTEGER REFERENCES departments(id)")
                if "workstation_id" not in fiche_cols:
                    cur.execute("ALTER TABLE fiches ADD COLUMN workstation_id INTEGER REFERENCES workstations(id)")

            con.commit()
            con.close()
        except Exception as e:
            print(f"init_db migration (departments) note: {e}")


def get_db():
    """FastAPI dependency that yields a database session and ensures it closes."""
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()
