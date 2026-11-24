"""
database.py — SQLAlchemy engine, session factory, and Base declaration.
"""
import os
import sys
from pathlib import Path
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker, DeclarativeBase

BASE_DIR = Path(__file__).resolve().parent
RUNTIME_DIR = Path(sys.executable).resolve().parent if getattr(sys, "frozen", False) else BASE_DIR
DEFAULT_DB_PATH = (RUNTIME_DIR / "knowfact.db").resolve()
DATABASE_URL = os.getenv("DATABASE_URL", f"sqlite:///{DEFAULT_DB_PATH.as_posix()}")
UPLOAD_DIR = Path(os.getenv("UPLOADS_DIR", str((RUNTIME_DIR / "uploads").resolve())))
UPLOAD_DIR.mkdir(parents=True, exist_ok=True)

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

        # ---------------------------------------------------------------
        # Migrations : gamification tables
        # ---------------------------------------------------------------
        # ---------------------------------------------------------------
        # Migrations : useful_count + security_note on fiches
        # ---------------------------------------------------------------
        try:
            con = sqlite3.connect(db_path)
            cur = con.cursor()
            fiche_cols = [col[1] for col in cur.execute("PRAGMA table_info(fiches)").fetchall()]
            if "useful_count" not in fiche_cols:
                cur.execute("ALTER TABLE fiches ADD COLUMN useful_count INTEGER DEFAULT 0")
            if "security_note" not in fiche_cols:
                cur.execute("ALTER TABLE fiches ADD COLUMN security_note TEXT")
            con.commit()
            con.close()
        except Exception as e:
            print(f"init_db migration (useful_count/security_note) note: {e}")

        try:
            con = sqlite3.connect(db_path)
            cur = con.cursor()

            # Seed default point_config rows if table is empty
            existing_tables = [row[0] for row in cur.execute("SELECT name FROM sqlite_master WHERE type='table'").fetchall()]

            if "point_config" in existing_tables:
                count = cur.execute("SELECT COUNT(*) FROM point_config").fetchone()[0]
                if count == 0:
                    default_configs = [
                        ("publish_problem_solution", 20, "Publish a Technical Solution", "Award when a problem_solution fiche is published"),
                        ("publish_procedure", 25, "Publish a Maintenance Procedure", "Award when a procedure fiche is published"),
                        ("publish_task_post", 15, "Publish a Technical Task", "Award when a task_post fiche is published"),
                        ("share_best_practice", 15, "Share an Industrial Best Practice", "Award for sharing best practices"),
                        ("provide_useful_answer", 10, "Provide a Useful Answer", "Award for providing helpful answers"),
                        ("receive_positive_evaluation", 5, "Receive a Positive Evaluation", "Award when a solution is positively evaluated"),
                        ("solution_approved_by_expert", 10, "Solution Approved by Expert", "Bonus when approved by expert or admin"),
                        ("improvement_validated", 10, "Improvement Proposal Validated", "Award when an improvement proposal is validated"),
                        ("admin_adjustment", 0, "Admin Manual Adjustment", "Manual point adjustment by administrator"),
                    ]
                    cur.executemany(
                        "INSERT INTO point_config (action_key, points, label, description, is_active) VALUES (?, ?, ?, ?, 1)",
                        default_configs,
                    )

            con.commit()
            con.close()
        except Exception as e:
            print(f"init_db migration (gamification seed) note: {e}")


def get_db():
    """FastAPI dependency that yields a database session and ensures it closes."""
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()
