"""
seed.py — Populate the KnowFact database with demo data.

Run with:
    python seed.py

Creates:
  - admin@knowfact.com        / admin123      (admin)
  - expert@knowfact.com       / expert123     (expert)
  - engineer@knowfact.com     / engineer123   (engineer)
  - technician@knowfact.com   / technician123 (technician)
  - operator@knowfact.com     / operator123   (operator)         [NEW]
  - new_arrival@knowfact.com  / newarrival123 (operator)         [NEW]
  - Departments: Production, Maintenance, Qualité, Logistique, HSE
  - 8 demo fiches covering T1–T8 scenarios
"""
import json
import sys
from datetime import datetime, timedelta, timezone

# Ensure the backend package root is on the path when running directly
sys.path.insert(0, ".")

from database import Base, SessionLocal, engine
from models import (
    Department,
    Fiche,
    FicheStatus,
    FicheType,
    FicheVersion,
    User,
    UserDepartment,
    UserRole,
    VersionReview,
    VersionStatus,
    ReviewDecision,
    Workstation,
)
from auth import hash_password

# ---------------------------------------------------------------------------
# Reset & recreate tables
# ---------------------------------------------------------------------------
from database import init_db
init_db()

db = SessionLocal()

# ---------------------------------------------------------------------------
# Counters for final summary
# ---------------------------------------------------------------------------
_counts = {
    "users_created": 0,
    "users_existing": 0,
    "depts_created": 0,
    "workstations_created": 0,
    "fiches_created": 0,
    "fiches_existing": 0,
    "versions_created": 0,
    "reviews_created": 0,
}

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
        _counts["users_created"] += 1
        print(f"  [+] Created user: {email} ({role.value})")
    else:
        _counts["users_existing"] += 1
        print(f"  [-] User already exists: {email}")
    return user


# ---------------------------------------------------------------------------
# Seed users
# ---------------------------------------------------------------------------
print("\n[1/5] Seeding users …")

admin = upsert_user("admin@knowfact.com", "admin123", "Admin KnowFact", UserRole.admin)
expert = upsert_user("expert@knowfact.com", "expert123", "Expert Laurent", UserRole.expert)
engineer = upsert_user(
    "engineer@knowfact.com", "engineer123", "Ingénieur Sophie", UserRole.engineer
)
technician = upsert_user(
    "technician@knowfact.com", "technician123", "Technicien Lucas", UserRole.technician
)
operator = upsert_user(
    "operator@knowfact.com", "operator123", "Opérateur Marc", UserRole.operator
)
new_arrival = upsert_user(
    "new_arrival@knowfact.com", "newarrival123", "Nouveau Collaborateur", UserRole.operator
)

db.commit()

# ---------------------------------------------------------------------------
# Seed departments & workstations
# ---------------------------------------------------------------------------
print("\n[2/5] Seeding departments, workstations & user assignments …")

now = datetime.now(timezone.utc)

depts_data = [
    {
        "name": "Production",
        "code": "PROD",
        "description": "Lignes de fabrication, assemblage et conditionnement.",
        "color": "#2563eb",
        "icon": "Factory",
        "manager_id": engineer.id,
        "display_order": 1,
        "workstations": [
            {"name": "Ligne de production 1", "code": "L1", "description": "Ligne principale d'usinage grande cadence"},
            {"name": "Poste Conditionnement", "code": "COND-01", "description": "Mise sous emballage et palettisation"},
        ],
    },
    {
        "name": "Maintenance",
        "code": "MAINT",
        "description": "Maintenance préventive, corrective et gestion des pièces de rechange.",
        "color": "#0d9488",
        "icon": "Wrench",
        "manager_id": expert.id,
        "display_order": 2,
        "workstations": [
            {"name": "Atelier mécanique", "code": "MEC-01", "description": "Réparation composants mécaniques et hydrauliques"},
            {"name": "Banc d'essais électriques", "code": "ELEC-01", "description": "Diagnostic variateurs et automates"},
            {"name": "Ligne A - Convoyeur", "code": "CONV-A", "description": "Poste convoyeur ligne A — contrôle et maintenance"},
        ],
    },
    {
        "name": "Qualité",
        "code": "QUAL",
        "description": "Contrôle qualité, métrologie, audits et conformité industrielle.",
        "color": "#16a34a",
        "icon": "ShieldCheck",
        "manager_id": expert.id,
        "display_order": 3,
        "workstations": [
            {"name": "Laboratoire contrôle", "code": "LAB-01", "description": "Analyses dimensionnelles et spectrométrie"},
            {"name": "Poste contrôle visuel", "code": "CTRL-01", "description": "Contrôle d'aspect en fin de ligne"},
        ],
    },
    {
        "name": "Logistique",
        "code": "LOG",
        "description": "Réception matières, gestion des magasins et expéditions.",
        "color": "#9333ea",
        "icon": "Package",
        "manager_id": admin.id,
        "display_order": 4,
        "workstations": [
            {"name": "Quai réception", "code": "QUAI-REC", "description": "Déchargement camions et contrôle arrivages"},
            {"name": "Magasin central", "code": "MAG-01", "description": "Stockage composants et kitting production"},
        ],
    },
    {
        "name": "HSE",
        "code": "HSE",
        "description": "Hygiène, Sécurité, Environnement et prévention des risques.",
        "color": "#dc2626",
        "icon": "AlertTriangle",
        "manager_id": admin.id,
        "display_order": 5,
        "workstations": [
            {"name": "Poste de garde & premiers secours", "code": "HSE-01", "description": "Gestion des accès et trousses d'urgence"},
            {"name": "Station traitement effluents", "code": "HSE-ENV", "description": "Surveillance rejets et tri sélectif"},
        ],
    },
]

created_depts = {}
for d_info in depts_data:
    dept = db.query(Department).filter(Department.code == d_info["code"]).first()
    if not dept:
        dept = Department(
            name=d_info["name"],
            code=d_info["code"],
            description=d_info["description"],
            color=d_info["color"],
            icon=d_info["icon"],
            manager_id=d_info["manager_id"],
            display_order=d_info["display_order"],
            is_active=True,
        )
        db.add(dept)
        db.flush()
        _counts["depts_created"] += 1
        print(f"  [+] Created department: {dept.name} ({dept.code})")
    else:
        print(f"  [-] Department already exists: {dept.name}")
    created_depts[dept.code] = dept

    # Workstations
    for ws_info in d_info["workstations"]:
        ws = db.query(Workstation).filter(
            Workstation.department_id == dept.id,
            Workstation.name == ws_info["name"],
        ).first()
        if not ws:
            ws = Workstation(
                department_id=dept.id,
                name=ws_info["name"],
                code=ws_info.get("code"),
                description=ws_info.get("description"),
                is_active=True,
            )
            db.add(ws)
            db.flush()
            _counts["workstations_created"] += 1
            print(f"      [+] Created workstation: {ws.name}")

db.commit()


# ---------------------------------------------------------------------------
# Helper: assign user to department
# ---------------------------------------------------------------------------
def assign_user(user_obj, dept_code, ws_name=None, is_primary=False):
    dept_obj = created_depts.get(dept_code)
    if not dept_obj:
        return
    ws_obj = None
    if ws_name:
        ws_obj = db.query(Workstation).filter(
            Workstation.department_id == dept_obj.id,
            Workstation.name == ws_name,
        ).first()

    assignment = db.query(UserDepartment).filter(
        UserDepartment.user_id == user_obj.id,
        UserDepartment.department_id == dept_obj.id,
    ).first()
    if not assignment:
        assignment = UserDepartment(
            user_id=user_obj.id,
            department_id=dept_obj.id,
            workstation_id=ws_obj.id if ws_obj else None,
            is_primary=is_primary,
        )
        db.add(assignment)
        print(f"  [+] Assigned {user_obj.full_name} to {dept_obj.name}" + (f" ({ws_name})" if ws_name else ""))

    if is_primary:
        user_obj.primary_department_id = dept_obj.id
        if ws_obj:
            user_obj.primary_workstation_id = ws_obj.id


assign_user(engineer, "PROD", "Ligne de production 1", is_primary=True)
assign_user(technician, "MAINT", "Atelier mécanique", is_primary=True)
assign_user(expert, "QUAL", "Laboratoire contrôle", is_primary=True)
assign_user(operator, "PROD", "Ligne de production 1", is_primary=True)
assign_user(new_arrival, "PROD", "Ligne de production 1", is_primary=True)

# Admin affecté à tous les départements
for code in ["PROD", "MAINT", "QUAL", "LOG", "HSE"]:
    assign_user(admin, code, is_primary=(code == "PROD"))

db.commit()

# ---------------------------------------------------------------------------
# Seed fiches (8 demo fiches)
# ---------------------------------------------------------------------------
print("\n[3/5] Seeding 8 demo fiches …")

maint_dept = created_depts.get("MAINT")
prod_dept = created_depts.get("PROD")

# Resolve the "Ligne A - Convoyeur" workstation
conv_ws = None
if maint_dept:
    conv_ws = db.query(Workstation).filter(
        Workstation.department_id == maint_dept.id,
        Workstation.name == "Ligne A - Convoyeur",
    ).first()


def _fiche(title, fiche_type, content_dict, status, author,
           security_note=None, dept=None, ws=None,
           reviewed_by_id=None, review_comment=None,
           validated_at=None, published_at=None):
    """Upsert a fiche by title and return it."""
    existing = db.query(Fiche).filter(Fiche.title == title).first()
    if existing:
        _counts["fiches_existing"] += 1
        print(f"  [-] Fiche already exists: '{title}'")
        return existing

    fiche = Fiche(
        title=title,
        type=fiche_type,
        content=json.dumps(content_dict, ensure_ascii=False),
        author_id=author.id,
        status=status,
        version=1,
        reviewed_by=reviewed_by_id,
        review_comment=review_comment,
        validated_at=validated_at,
        published_at=published_at,
        security_note=security_note,
        department_id=dept.id if dept else None,
        workstation_id=ws.id if ws else None,
    )
    db.add(fiche)
    db.flush()
    _counts["fiches_created"] += 1
    print(f"  [+] Created fiche [{status.value}]: '{title}'")
    return fiche


def _version(fiche, version_number, author, status=VersionStatus.active,
             change_reason="Initial version (seeded)",
             improvement_reason=None, parent_version_id=None):
    """Create a FicheVersion if it doesn't already exist."""
    existing = db.query(FicheVersion).filter(
        FicheVersion.fiche_id == fiche.id,
        FicheVersion.version_number == version_number,
    ).first()
    if existing:
        return existing
    v = FicheVersion(
        fiche_id=fiche.id,
        version_number=version_number,
        title=fiche.title,
        content=fiche.content,
        changed_by=author.id,
        status=status,
        change_reason=change_reason,
        improvement_reason=improvement_reason,
        parent_version_id=parent_version_id,
    )
    db.add(v)
    db.flush()
    _counts["versions_created"] += 1
    return v


def _review(version_obj, reviewer, decision, comment):
    """Create a VersionReview."""
    existing = db.query(VersionReview).filter(
        VersionReview.version_id == version_obj.id,
        VersionReview.reviewer_id == reviewer.id,
    ).first()
    if existing:
        return existing
    r = VersionReview(
        version_id=version_obj.id,
        reviewer_id=reviewer.id,
        decision=decision,
        comment=comment,
    )
    db.add(r)
    db.flush()
    _counts["reviews_created"] += 1
    return r


# ── Fiche 1 ─ Vibration moteur M04 (published, problem_solution) ─────────
f1 = _fiche(
    title="Vibration anormale du moteur M04 – roulement usé",
    fiche_type=FicheType.problem_solution,
    content_dict={
        "description": "Vibration et bruit métallique en régime établi, échauffement du palier côté ventilateur. Apparition progressive sur 3 semaines.",
        "symptomes": "Vibration >2.8mm/s, bruit métallique, chaleur palier",
        "diagnostic": "Roulement côté ventilateur usé, aggravé par léger désalignement d'accouplement. Certitude : confirmée (mesure + démontage)",
        "solution": "1. Consigner le moteur. 2. Déposer carter et accouplement. 3. Remplacer les deux roulements. 4. Réaligner au comparateur. 5. Graisser selon gamme. 6. Remise en service et essai.",
        "resultat": "Vibration ramenée sous 2.8mm/s. Température palier stable après 2h.",
        "mots_cles": "vibration, roulement, M04, convoyeur, maintenance",
        "label": "experience_partagee",
    },
    status=FicheStatus.published,
    author=technician,
    security_note="Consignation électrique obligatoire. Gants et lunettes de protection. Appliquer PRO-MNT-012 (ne pas remplacer cette fiche)",
    dept=maint_dept,
    ws=conv_ws,
    reviewed_by_id=expert.id,
    review_comment="Procédure vérifiée sur site. Résultats conformes. Approuvée.",
    validated_at=now - timedelta(days=5),
    published_at=now - timedelta(days=4),
)
v1_f1 = _version(f1, 1, technician)

# ── Fiche 2 ─ Contrôle début de poste convoyeur (published, task_post) ───
f2 = _fiche(
    title="Contrôle de début de poste – Convoyeur Ligne A",
    fiche_type=FicheType.task_post,
    content_dict={
        "poste": "Opérateur Ligne A",
        "objectif": "Vérifier l'état du convoyeur avant démarrage",
        "frequence": "Chaque début de poste",
        "etapes": [
            "1. Vérifier EPI (gants, lunettes, chaussures de sécurité)",
            "2. Contrôler pression air comprimé (6-8 bar)",
            "3. Inspecter courroies convoyeur (absence de craquelures)",
            "4. Relever températures moteurs M04 et M05",
            "5. Vérifier absence de corps étrangers sur ligne",
            "6. Consigner les anomalies dans le carnet de bord",
        ],
        "controles": "Pression air: 6-8 bar / Temp moteurs: <70°C",
        "mots_cles": "début de poste, convoyeur, contrôle, opérateur",
        "label": "procedure_officielle",
    },
    status=FicheStatus.published,
    author=engineer,
    dept=maint_dept,
    ws=conv_ws,
    reviewed_by_id=expert.id,
    review_comment="Procédure opérationnelle validée.",
    validated_at=now - timedelta(days=10),
    published_at=now - timedelta(days=9),
)
_version(f2, 1, engineer)

# ── Fiche 3 ─ Fuite air comprimé sertisseuse (published, problem_solution)
f3 = _fiche(
    title="Fuite air comprimé – raccord rapide sertisseuse S2",
    fiche_type=FicheType.problem_solution,
    content_dict={
        "symptomes": "Sifflement audible, pression en baisse progressive",
        "diagnostic": "Raccord rapide défaillant, joint torique usé",
        "solution": "1. Couper alimentation air. 2. Remplacer le raccord rapide 1/4 pouce. 3. Tester l'étanchéité.",
        "resultat": "Fuite éliminée, pression stabilisée",
        "mots_cles": "fuite, air comprimé, sertisseuse, raccord",
        "label": "experience_partagee",
    },
    status=FicheStatus.published,
    author=technician,
    dept=maint_dept,
    reviewed_by_id=expert.id,
    review_comment="Intervention simple et efficace. Publiée.",
    validated_at=now - timedelta(days=7),
    published_at=now - timedelta(days=6),
)
_version(f3, 1, technician)

# ── Fiche 4 ─ Surchauffe transformateur T3 (validated) ───────────────────
f4 = _fiche(
    title="Surchauffe transformateur T3 – ventilation insuffisante",
    fiche_type=FicheType.problem_solution,
    content_dict={
        "symptomes": "Alarme température >85°C, disjoncteur déclenché",
        "diagnostic": "Filtre ventilation obstrué par poussière métallique",
        "solution": "1. Couper l'alimentation. 2. Nettoyer ou remplacer le filtre. 3. Vérifier le ventilateur.",
        "resultat": "En cours de validation",
        "mots_cles": "surchauffe, transformateur, ventilation, filtre",
        "label": "experience_partagee",
    },
    status=FicheStatus.validated,
    author=engineer,
    dept=maint_dept,
    reviewed_by_id=expert.id,
    review_comment="Validée techniquement, en attente de publication.",
    validated_at=now - timedelta(days=1),
)
_version(f4, 1, engineer)

# ── Fiche 5 ─ Changement de format presse P01 (published, task_post) ─────
f5 = _fiche(
    title="Procédure de changement de format – presse P01",
    fiche_type=FicheType.task_post,
    content_dict={
        "poste": "Technicien Méthodes",
        "objectif": "Changer le format de production sur la presse P01",
        "etapes": [
            "1. Arrêter la production",
            "2. Consigner la presse",
            "3. Déposer l'outil actuel",
            "4. Monter le nouvel outil selon gamme G-P01-FORMAT",
            "5. Régler les paramètres selon fiche technique",
            "6. Lancer un cycle à vide",
            "7. Valider la première pièce",
        ],
        "mots_cles": "changement de format, presse, outillage",
        "label": "procedure_officielle",
    },
    status=FicheStatus.published,
    author=technician,
    dept=prod_dept,
    reviewed_by_id=expert.id,
    review_comment="Procédure de changement de format validée.",
    validated_at=now - timedelta(days=15),
    published_at=now - timedelta(days=14),
)
_version(f5, 1, technician)

# ── Fiche 6 ─ Bourrage alimentateur de vis M12 (submitted) ───────────────
f6 = _fiche(
    title="Bourrage fréquent – alimentateur de vis M12",
    fiche_type=FicheType.problem_solution,
    content_dict={
        "symptomes": "Bourrage toutes les 2h en moyenne",
        "diagnostic": "Hypothèse : mauvais réglage du débit vibratoire (non confirmé)",
        "solution": "Réduire fréquence de vibration de 45Hz à 40Hz en test",
        "resultat": "À confirmer",
        "mots_cles": "bourrage, alimentateur, vis, vibration",
        "label": "experience_partagee",
    },
    status=FicheStatus.submitted,
    author=operator,
    dept=prod_dept,
)
# Version en attente de review
_version(f6, 1, operator, status=VersionStatus.pending_review,
         change_reason="Soumission initiale pour relecture expert")

# ── Fiche 7 ─ Optimisation énergie variateur VSD03 (rejected) ────────────
f7 = _fiche(
    title="Optimisation énergie – variateur VSD03",
    fiche_type=FicheType.problem_solution,
    content_dict={
        "symptomes": "Consommation élevée",
        "diagnostic": "Paramètre P-15 non optimisé (non vérifié par expert)",
        "solution": "Modifier P-15 à 75%",
        "resultat": "Non validé – risque non évalué",
        "mots_cles": "énergie, variateur, optimisation",
    },
    status=FicheStatus.rejected,
    author=operator,
    dept=maint_dept,
    reviewed_by_id=expert.id,
    review_comment="Modification non sécurisée — paramètre P-15 non évalué. Rejetée.",
)
v1_f7 = _version(f7, 1, operator, status=VersionStatus.rejected,
                 change_reason="Rejetée après relecture expert")
# VersionReview avec décision reject
_review(v1_f7, expert, ReviewDecision.reject,
        "Paramètre P-15 non évalué — risque de surtension. Fiche rejetée. Une analyse complète est nécessaire avant toute modification.")

# ── Fiche 8 ─ Parcours d'intégration opérateur (published, task_post) ────
f8 = _fiche(
    title="Parcours d'intégration – Opérateur Ligne A",
    fiche_type=FicheType.task_post,
    content_dict={
        "poste": "Nouveau collaborateur",
        "objectif": "Intégration poste opérateur Ligne A en 5 étapes",
        "etapes": [
            "Semaine 1: Lecture des procédures de sécurité",
            "Semaine 1: Observation avec un opérateur senior",
            "Semaine 2: Prise en main contrôle début de poste (fiche KF-002)",
            "Semaine 2: Diagnostic des anomalies courantes",
            "Semaine 3: Autonomie complète avec validation formateur",
        ],
        "mots_cles": "intégration, formation, nouveau collaborateur, onboarding",
        "label": "parcours_integration",
    },
    status=FicheStatus.published,
    author=expert,
    dept=prod_dept,
    ws=conv_ws,
    reviewed_by_id=expert.id,
    review_comment="Parcours d'intégration validé par la direction.",
    validated_at=now - timedelta(days=20),
    published_at=now - timedelta(days=19),
)
_version(f8, 1, expert)

db.commit()

# ---------------------------------------------------------------------------
# Seed improvement proposal (hydraulic pump — legacy demo)
# ---------------------------------------------------------------------------
print("\n[4/5] Seeding legacy improvement proposal …")

legacy_title = "Hydraulic Pump Failure Diagnosis & Repair"

def make_content(description, steps, tags, equipment="", safety=""):
    structured_steps = []
    for i, s in enumerate(steps):
        if isinstance(s, dict):
            structured_steps.append(s)
        else:
            structured_steps.append({"order": i + 1, "content": s})
    return json.dumps({
        "description": description,
        "steps": structured_steps,
        "tags": tags,
        "equipment": equipment,
        "safety_notes": safety,
    })

legacy_fiches_data = [
    {
        "title": legacy_title,
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

for data in legacy_fiches_data:
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
    _counts["fiches_created"] += 1
    _counts["versions_created"] += 1
    print(f"  [+] Created legacy fiche: '{data['title']}' [{data['status'].value}]")

db.commit()

# Improvement proposal for hydraulic pump fiche
target_fiche = db.query(Fiche).filter(Fiche.title == legacy_title).first()
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
        _counts["versions_created"] += 1
        print(f"  [+] Created improvement proposal (v2 pending_review) for '{legacy_title}'")
    else:
        print("  [-] Improvement proposal v2 already exists.")

# ---------------------------------------------------------------------------
# Attach department to all fiches that still have no dept
# ---------------------------------------------------------------------------
qual_dept = created_depts.get("QUAL")
all_fiches = db.query(Fiche).all()
for f in all_fiches:
    if f.department_id:
        continue
    if f.type == FicheType.problem_solution and maint_dept:
        f.department_id = maint_dept.id
    elif f.type == FicheType.procedure and qual_dept:
        f.department_id = qual_dept.id
    elif f.type == FicheType.task_post and prod_dept:
        f.department_id = prod_dept.id

db.commit()

# ---------------------------------------------------------------------------
# Gamification
# ---------------------------------------------------------------------------
print("\n[5/5] Seeding gamification points & badges …")

from gamification import award_points, check_top_contributor_badges_global

award_points(
    user_id=expert.id,
    action="publish_procedure",
    db=db,
    override_points=650,
    reason="Historique de 26 procédures de validation qualité publiées",
)
award_points(
    user_id=engineer.id,
    action="publish_problem_solution",
    db=db,
    override_points=380,
    reason="Solutions techniques validées et partages de bonnes pratiques",
)
award_points(
    user_id=technician.id,
    action="publish_procedure",
    db=db,
    override_points=240,
    reason="Procédures de maintenance préventive et interventions",
)
award_points(
    user_id=admin.id,
    action="admin_adjustment",
    db=db,
    override_points=1100,
    reason="Contributions fondatrices et architecture technique",
)
award_points(
    user_id=operator.id,
    action="submit_fiche",
    db=db,
    override_points=50,
    reason="Premières contributions opérateur",
)

db.commit()
check_top_contributor_badges_global(db)
db.commit()

db.close()

# ---------------------------------------------------------------------------
# Extended multi-department industrial catalog (30 additional fiches)
# ---------------------------------------------------------------------------
print("\n[6/6] Seeding extended multi-department catalog …")
from seed_catalog import seed_catalog
_cat_res = seed_catalog()
_counts["fiches_created"] += _cat_res["created"]
_counts["fiches_existing"] += _cat_res["skipped"]

# ---------------------------------------------------------------------------
# Summary
# ---------------------------------------------------------------------------
print("\n" + "=" * 60)
print("  SEED COMPLETE — Summary")
print("=" * 60)
print(f"  Users  : {_counts['users_created']} created  / {_counts['users_existing']} already existed")
print(f"  Depts  : {_counts['depts_created']} created")
print(f"  WS     : {_counts['workstations_created']} created")
print(f"  Fiches : {_counts['fiches_created']} created  / {_counts['fiches_existing']} already existed")
print(f"  Versions: {_counts['versions_created']} created")
print(f"  Reviews : {_counts['reviews_created']} created")
print("=" * 60)
print("\n  Credentials:")
print("    Admin:            admin@knowfact.com        / admin123")
print("    Expert:           expert@knowfact.com       / expert123")
print("    Ingénieur:        engineer@knowfact.com     / engineer123")
print("    Technicien:       technician@knowfact.com   / technician123")
print("    Opérateur:        operator@knowfact.com     / operator123")
print("    Nouveau collab:   new_arrival@knowfact.com  / newarrival123")
print("\n  Demo fiches (8):")
print("    F1 [published]  Vibration anormale du moteur M04 – roulement usé")
print("    F2 [published]  Contrôle de début de poste – Convoyeur Ligne A")
print("    F3 [published]  Fuite air comprimé – raccord rapide sertisseuse S2")
print("    F4 [validated]  Surchauffe transformateur T3 – ventilation insuffisante")
print("    F5 [published]  Procédure de changement de format – presse P01")
print("    F6 [submitted]  Bourrage fréquent – alimentateur de vis M12")
print("    F7 [rejected]   Optimisation énergie – variateur VSD03")
print("    F8 [published]  Parcours d'intégration – Opérateur Ligne A")
print("\n  Start the API with:")
print("    uvicorn main:app --reload --port 8000\n")
