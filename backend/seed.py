"""
seed.py — Populate the KnowFact database with demo data.

Run with:
    python seed.py

Creates:
  - admin@knowfact.com   / admin123  (admin)
  - expert@knowfact.com  / expert123 (expert)
  - engineer@knowfact.com/ engineer123 (engineer)
  - 3 sample fiches in different states
"""
import json
import sys
from datetime import datetime, timedelta, timezone

# Ensure the backend package root is on the path when running directly
sys.path.insert(0, ".")

from database import Base, SessionLocal, engine
from models import Fiche, FicheStatus, FicheType, FicheVersion, User, UserRole, VersionStatus
from auth import hash_password

# ---------------------------------------------------------------------------
# Reset & recreate tables
# ---------------------------------------------------------------------------
from database import init_db
init_db()

db = SessionLocal()

# ---------------------------------------------------------------------------
# Helper: get-or-create user
# ---------------------------------------------------------------------------


def upsert_user(
    email: str,
    password: str,
    full_name: str,
    role: UserRole,
) -> User:
    user = db.query(User).filter(User.email == email).first()
    if not user:
        user = User(
            email=email,
            password_hash=hash_password(password),
            full_name=full_name,
            role=role,
            is_active=True,
        )
        db.add(user)
        db.flush()
        print(f"  [+] Created user: {email} ({role.value})")
    else:
        print(f"  [-] User already exists: {email}")
    return user


# ---------------------------------------------------------------------------
# Seed users
# ---------------------------------------------------------------------------
print("\n[1/3] Seeding users …")

admin = upsert_user("admin@knowfact.com", "admin123", "Admin KnowFact", UserRole.admin)
expert = upsert_user("expert@knowfact.com", "expert123", "Expert Laurent", UserRole.expert)
engineer = upsert_user(
    "engineer@knowfact.com", "engineer123", "Ingénieur Sophie", UserRole.engineer
)
technician = upsert_user(
    "technician@knowfact.com", "technician123", "Technicien Lucas", UserRole.technician
)

db.commit()

# ---------------------------------------------------------------------------
# Seed fiches
# ---------------------------------------------------------------------------
print("\n[2/3] Seeding fiches …")

now = datetime.now(timezone.utc)


def make_content(description: str, steps: list, tags: list, equipment: str = "", safety: str = "") -> str:
    structured_steps = []
    for i, s in enumerate(steps):
        if isinstance(s, dict):
            structured_steps.append(s)
        else:
            structured_steps.append({"order": i + 1, "content": s})
    return json.dumps(
        {
            "description": description,
            "steps": structured_steps,
            "tags": tags,
            "equipment": equipment,
            "safety_notes": safety,
        }
    )


fiches_data = [
    {
        "title": "Hydraulic Pump Failure Diagnosis & Repair",
        "type": FicheType.problem_solution,
        "content": make_content(
            description="Systematic approach to diagnosing and resolving hydraulic pump failures on production lines.",
            steps=[
                "Shut down the machine and lock out/tag out energy sources.",
                "Check hydraulic fluid level and condition.",
                "Inspect pressure relief valve setting.",
                "Measure pump output pressure with a gauge.",
                "Inspect pump shaft seal for leaks.",
                "Replace worn seals or pump assembly as needed.",
                "Refill hydraulic fluid to correct level.",
                "Test operation under no-load, then full load.",
            ],
            tags=["hydraulic", "pump", "maintenance", "diagnosis"],
            equipment="Pressure gauge, seal kit, hydraulic fluid, lockout-tagout kit",
            safety="Always de-energise and de-pressurise the system before opening any hydraulic connections.",
        ),
        "author": engineer,
        "status": FicheStatus.published,
        "validated_at": now - timedelta(days=2),
        "published_at": now - timedelta(days=1),
        "reviewed_by": expert.id,
        "review_comment": "Well-documented procedure. Approved.",
    },
    {
        "title": "Weekly Safety Inspection Checklist — CNC Zone",
        "type": FicheType.procedure,
        "content": make_content(
            description="Weekly safety and maintenance inspection for the CNC machining zone.",
            steps=[
                "Verify emergency-stop buttons are functional on all machines.",
                "Inspect all safety guards and interlocks.",
                "Check coolant fluid levels and top up if needed.",
                "Inspect tool holders for wear or damage.",
                "Clean chip conveyors and coolant collection trays.",
                "Verify fire extinguisher accessibility and expiry dates.",
                "Log any anomalies in the maintenance register.",
            ],
            tags=["safety", "cnc", "weekly", "inspection"],
            equipment="Inspection checklist form, PPE (safety glasses, gloves), torch",
            safety="Wear appropriate PPE at all times in the CNC zone.",
        ),
        "author": expert,
        "status": FicheStatus.under_review,
        "review_due_date": now + timedelta(days=3),
    },
    {
        "title": "Conveyor Belt Tension Adjustment",
        "type": FicheType.task_post,
        "content": make_content(
            description="Procedure for adjusting conveyor belt tension to prevent slippage or over-tensioning.",
            steps=[
                "Stop the conveyor and lock out power.",
                "Locate the tension adjustment bolts at the tail end.",
                "Loosen locking nuts.",
                "Turn adjustment bolts clockwise to increase tension.",
                "Check belt deflection: 10–15 mm under 10 kg load at belt midpoint.",
                "Tighten locking nuts once correct tension is achieved.",
                "Restart and monitor for 10 minutes.",
            ],
            tags=["conveyor", "belt", "tension", "adjustment"],
            equipment="Wrench set, deflection gauge, lockout-tagout kit",
            safety="Never reach under a running conveyor. Always lock out before adjustment.",
        ),
        "author": engineer,
        "status": FicheStatus.draft,
    },
]

for data in fiches_data:
    existing = db.query(Fiche).filter(Fiche.title == data["title"]).first()
    if existing:
        print(f"  · Fiche already exists: '{data['title']}'")
        continue

    fiche = Fiche(
        title=data["title"],
        type=data["type"],
        content=data["content"],
        author_id=data["author"].id,
        status=data["status"],
        version=1,
        reviewed_by=data.get("reviewed_by"),
        review_comment=data.get("review_comment"),
        validated_at=data.get("validated_at"),
        published_at=data.get("published_at"),
        review_due_date=data.get("review_due_date"),
    )
    db.add(fiche)
    db.flush()

    # Create initial version snapshot
    version_entry = FicheVersion(
        fiche_id=fiche.id,
        version_number=1,
        title=fiche.title,
        content=fiche.content,
        changed_by=data["author"].id,
        status=VersionStatus.active,
        change_reason="Initial version (seeded)",
    )
    db.add(version_entry)

    print(f"  [+] Created fiche: '{data['title']}' [{data['status'].value}]")

db.commit()

# ---------------------------------------------------------------------------
# Seed Improvement Proposal (v2 pending review)
# ---------------------------------------------------------------------------
print("\n[3/3] Seeding demo improvement proposal ...")

target_fiche = db.query(Fiche).filter(Fiche.title == "Hydraulic Pump Failure Diagnosis & Repair").first()
if target_fiche:
    existing_prop = db.query(FicheVersion).filter(
        FicheVersion.fiche_id == target_fiche.id,
        FicheVersion.version_number == 2,
    ).first()

    if not existing_prop:
        v1_version = db.query(FicheVersion).filter(
            FicheVersion.fiche_id == target_fiche.id,
            FicheVersion.version_number == 1,
        ).first()

        improved_content = make_content(
            description="Procedure optimisee de diagnostic et purge rapide sur pompes hydrauliques haute pression.",
            steps=[
                {"order": 1, "content": "Arret immediat de la ligne et consignation LOTO (cadenassage)."},
                {"order": 2, "content": "Branchement direct du manometre digital sur le piquage test rapide."},
                {"order": 3, "content": "Controle du niveau et analyse colorimetrique de l'huile hydraulique."},
                {"order": 4, "content": "Purge automatique assistee via vanne quart de tour haute securite (gain de 30 min)."},
                {"order": 5, "content": "Controle d'etancheite du joint d'arbre avec lampe UV."},
                {"order": 6, "content": "Remplacement preventif des joints toriques fluoroelastomeres."},
                {"order": 7, "content": "Redemarrage progressif sous surveillance de telemetrie."},
            ],
            tags=["hydraulic", "pump", "maintenance", "purge-rapide", "optimisation"],
            equipment="Manometre digital haute precision, kit joints toriques Viton, kit LOTO, lampe UV",
            safety="Port de visiere integrale et gants thermiques anti-projection. Depressuriser totalement avant ouverture.",
        )

        proposal = FicheVersion(
            fiche_id=target_fiche.id,
            version_number=2,
            title="Hydraulic Pump Rapid Diagnosis & High-Safety Purge",
            content=improved_content,
            changed_by=technician.id,
            status=VersionStatus.pending_review,
            improvement_reason="Remplacement de la methode manuelle par une purge assistee : reduction de l'arret machine de 45 a 15 minutes, meilleure securite operateur grace aux gants thermiques et a la visiere anti-projection.",
            change_reason="Optimisation purge rapide et securite",
            parent_version_id=v1_version.id if v1_version else None,
        )
        db.add(proposal)
        db.commit()
        print(f"  [+] Created improvement proposal (v2 pending_review) for fiche #{target_fiche.id} by {technician.email}")
    else:
        print("  [-] Improvement proposal v2 already exists.")

db.close()

print("\n[OK] Seed complete!\n")
print("  Credentials:")
print("    Admin:       admin@knowfact.com      / admin123")
print("    Expert:      expert@knowfact.com     / expert123")
print("    Ingénieur:   engineer@knowfact.com   / engineer123")
print("    Technicien:  technician@knowfact.com / technician123")
print("\n  Start the API with:")
print("    uvicorn main:app --reload --port 8000\n")
