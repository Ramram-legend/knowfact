"""
test_operating_sheet.py — Unit and integration tests for simplified operating sheet generation.
"""
import json
import pytest
from fastapi.testclient import TestClient

from auth import create_access_token, hash_password
from database import Base
from main import app
from models import Department, Fiche, FicheStatus, FicheType, User, UserRole, Workstation
from operating_sheet import generate_operating_sheet
from tests.conftest import TestingSessionLocal, test_engine

client = TestClient(app)


@pytest.fixture(autouse=True)
def setup_db():
    Base.metadata.create_all(bind=test_engine)
    db = TestingSessionLocal()

    admin = User(
        email="admin_os@factory.com",
        password_hash=hash_password("pass"),
        full_name="Admin OS",
        role=UserRole.admin,
        is_active=True,
    )
    engineer = User(
        email="engineer_os@factory.com",
        password_hash=hash_password("pass"),
        full_name="Engineer OS",
        role=UserRole.engineer,
        is_active=True,
    )
    operator = User(
        email="operator_os@factory.com",
        password_hash=hash_password("pass"),
        full_name="Operator OS",
        role=UserRole.operator,
        is_active=True,
    )
    db.add_all([admin, engineer, operator])
    db.commit()

    dept = Department(
        name="Usinage & Fraisage",
        code="USIN",
        color="#0284c7",
        icon="Cog",
        is_active=True,
    )
    db.add(dept)
    db.commit()

    ws = Workstation(
        name="Centre d'usinage 5 axes CNC",
        code="CNC-01",
        department_id=dept.id,
        is_active=True,
    )
    db.add(ws)
    db.commit()

    fiche = Fiche(
        title="Procédure de remplacement de broche d'usinage haute vitesse",
        type=FicheType.procedure,
        status=FicheStatus.published,
        version=1,
        author_id=engineer.id,
        department_id=dept.id,
        workstation_id=ws.id,
        content=json.dumps({
            "description": "Procédure technique complète de remplacement et alignement de la broche.",
            "steps": [
                "Arrêter la machine et procéder à la consignation électrique LOTO.",
                "Purger le circuit pneumatique de blocage de cône et vérifier 0 bar.",
                "Déposer le capot supérieur et déconnecter les flexibles de lubrification.",
                "Dévisser les vis de fixation de broche avec une clé Torx T30.",
                "Nettoyer la portée avec un chiffon propre non pelucheux.",
                "Installer la nouvelle broche et serrer en croix au couple de 25 Nm.",
                "Effectuer un essai à vide de 10 minutes et vérifier l'absence de vibration.",
            ],
            "equipment": "Clé dynamométrique 25 Nm, Clé Torx T30, Chiffon propre d'atelier, Broche de rechange neuve",
            "safety_notes": "Port impératif des gants anticoupure et des lunettes de protection. Risque de pincement.",
            "tags": ["broche", "cnc", "maintenance"],
        }),
    )
    db.add(fiche)
    db.commit()

    yield

    db.close()
    Base.metadata.drop_all(bind=test_engine)


def _token(user_id: int) -> dict:
    return {"Authorization": f"Bearer {create_access_token(user_id)}"}


def test_operating_sheet_generation_logic():
    """Verify that the operating sheet synthesizer creates all required sections A, B, C, D, E."""
    db = TestingSessionLocal()
    fiche = db.query(Fiche).first()

    sheet = generate_operating_sheet(
        fiche_id=fiche.id,
        title=fiche.title,
        raw_content=fiche.content,
        version=fiche.version,
        department_name="Usinage & Fraisage",
        department_code="USIN",
        workstation_name="CNC-01",
        author_name="Engineer OS",
    )

    # Section A: Header
    assert sheet.reference.startswith("FO-USIN-")
    assert sheet.title == "Remplacement de broche d'usinage haute vitesse"
    assert sheet.procedure_version == 1
    assert sheet.department_code == "USIN"

    # Section B: Essential info
    assert len(sheet.objective) > 10
    assert len(sheet.tools_and_equipment) >= 1
    assert any("dynamométrique" in t.lower() for t in sheet.tools_and_equipment)
    assert len(sheet.required_ppe) >= 2
    assert len(sheet.prerequisites) >= 3

    # Section C: Realization steps
    assert len(sheet.steps) == 7
    step1 = sheet.steps[0]
    assert step1.order == 1
    assert "consign" in step1.title.lower() or "sécurité" in step1.title.lower()
    assert step1.control_point.startswith("✓")

    # Section D: Safety
    assert len(sheet.safety.hazards) >= 1
    assert len(sheet.safety.precautions) >= 1
    assert len(sheet.safety.prohibitions) >= 1
    assert len(sheet.safety.emergency_actions) >= 1

    # Section E: Final validation
    assert len(sheet.validation.items) >= 4
    assert "opérateur" in sheet.validation.completion_text.lower()
    assert sheet.validation.operator_signature_title
    assert sheet.validation.supervisor_signature_title


def test_get_operating_sheet_endpoint():
    """Test GET /api/fiches/{id}/operating-sheet."""
    db = TestingSessionLocal()
    fiche = db.query(Fiche).first()
    operator = db.query(User).filter(User.email == "operator_os@factory.com").first()

    res = client.get(f"/api/fiches/{fiche.id}/operating-sheet", headers=_token(operator.id))
    assert res.status_code == 200
    data = res.json()

    assert data["fiche_id"] == fiche.id
    assert data["reference"].startswith("FO-USIN-")
    assert len(data["steps"]) == 7
    assert len(data["required_ppe"]) >= 2
    assert "safety" in data
    assert "validation" in data


def test_generate_operating_sheet_endpoint():
    """Test POST /api/fiches/{id}/generate-operating-sheet."""
    db = TestingSessionLocal()
    fiche = db.query(Fiche).first()
    engineer = db.query(User).filter(User.email == "engineer_os@factory.com").first()

    res = client.post(
        f"/api/fiches/{fiche.id}/generate-operating-sheet?force=true",
        headers=_token(engineer.id),
    )
    assert res.status_code == 200
    data = res.json()
    assert data["fiche_id"] == fiche.id
    assert data["title"] == "Remplacement de broche d'usinage haute vitesse"


def test_save_operating_sheet_endpoint():
    """Test PUT /api/fiches/{id}/operating-sheet for saving custom edits."""
    db = TestingSessionLocal()
    fiche = db.query(Fiche).first()
    engineer = db.query(User).filter(User.email == "engineer_os@factory.com").first()
    operator = db.query(User).filter(User.email == "operator_os@factory.com").first()

    # First get generated sheet
    res_get = client.get(f"/api/fiches/{fiche.id}/operating-sheet", headers=_token(engineer.id))
    assert res_get.status_code == 200
    sheet_data = res_get.json()

    # Modify objective
    sheet_data["objective"] = "Objectif personnalisé par l'ingénieur méthodes terrain."
    sheet_data["steps"][0]["instruction"] = "Instruction sur-mesure étape 1."

    res_put = client.put(
        f"/api/fiches/{fiche.id}/operating-sheet",
        json=sheet_data,
        headers=_token(engineer.id),
    )
    assert res_put.status_code == 200
    updated = res_put.json()
    assert updated["objective"] == "Objectif personnalisé par l'ingénieur méthodes terrain."

    # Verify that subsequent GET returns the saved custom version
    res_get2 = client.get(f"/api/fiches/{fiche.id}/operating-sheet", headers=_token(operator.id))
    assert res_get2.status_code == 200
    assert res_get2.json()["objective"] == "Objectif personnalisé par l'ingénieur méthodes terrain."
    assert res_get2.json()["steps"][0]["instruction"] == "Instruction sur-mesure étape 1."
