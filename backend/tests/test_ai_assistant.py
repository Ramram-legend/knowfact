"""
test_ai_assistant.py — Integration tests for the KnowFact AI Search Assistant.
"""
import json
import pytest
from fastapi.testclient import TestClient

from auth import create_access_token, hash_password
from database import Base
from main import app
from models import Department, Fiche, FicheStatus, FicheType, User, UserRole
from tests.conftest import TestingSessionLocal, test_engine

client = TestClient(app)


@pytest.fixture(autouse=True)
def setup_db():
    Base.metadata.create_all(bind=test_engine)
    db = TestingSessionLocal()

    engineer = User(
        email="eng_ai@factory.com",
        password_hash=hash_password("pass"),
        full_name="Engineer AI",
        role=UserRole.engineer,
        is_active=True,
    )
    operator = User(
        email="op_ai@factory.com",
        password_hash=hash_password("pass"),
        full_name="Operator AI",
        role=UserRole.operator,
        is_active=True,
    )
    db.add_all([engineer, operator])
    db.commit()

    maint = Department(
        name="Maintenance",
        code="MAINT",
        color="#0d9488",
        icon="Wrench",
        is_active=True,
    )
    prod = Department(
        name="Production",
        code="PROD",
        color="#2563eb",
        icon="Factory",
        is_active=True,
    )
    db.add_all([maint, prod])
    db.commit()

    sol_fiche = Fiche(
        title="Résolution vibration excessive sur pompe centrifuge P-102",
        type=FicheType.problem_solution,
        status=FicheStatus.published,
        version=1,
        author_id=engineer.id,
        department_id=maint.id,
        useful_count=5,
        content=json.dumps({
            "description": "Diagnostic et correction d'un balourd et désalignement sur pompe hydraulique P-102.",
            "steps": [
                {"order": 1, "content": "Consigner le moteur électrique de la pompe P-102."},
                {"order": 2, "content": "Contrôler l'alignement laser arbre-moteur et remplacer le roulement."},
                {"order": 3, "content": "Vérifier l'étanchéité du joint mécanique avant redémarrage."},
            ],
            "equipment": "Pompe P-102, Comparateur laser, Extracteur de roulement",
            "safety_notes": "Port obligatoire des lunettes, gants anti-écrasement et consignation LOTO.",
            "tags": ["pompe", "vibration", "roulement", "p-102"],
        }),
    )

    task_fiche = Fiche(
        title="Tâche hebdomadaire : graissage et inspection convoyeur ligne A",
        type=FicheType.task_post,
        status=FicheStatus.published,
        version=1,
        author_id=engineer.id,
        department_id=maint.id,
        useful_count=3,
        content=json.dumps({
            "description": "Checklist préventive hebdomadaire de lubrification et tension de bande sur convoyeur.",
            "steps": [
                {"order": 1, "content": "Nettoyer les capteurs optiques et rouleaux de renvoi."},
                {"order": 2, "content": "Graisser les paliers avec graisse SKF LGMT 2."},
                {"order": 3, "content": "Vérifier la tension de la courroie."},
            ],
            "equipment": "Pompe à graisse, Chiffon, Convoyeur CONV-A",
            "safety_notes": "Ne jamais graisser un organe en mouvement.",
            "tags": ["convoyeur", "graissage", "maintenance", "preventif"],
        }),
    )

    draft_fiche = Fiche(
        title="Brouillon confidentiel fuite pompe P-102",
        type=FicheType.problem_solution,
        status=FicheStatus.draft,
        version=1,
        author_id=engineer.id,
        department_id=maint.id,
        content=json.dumps({
            "description": "Note interne en cours de rédaction sur pompe.",
            "steps": [],
            "equipment": "Pompe P-102",
            "safety_notes": "",
            "tags": ["brouillon"],
        }),
    )

    db.add_all([sol_fiche, task_fiche, draft_fiche])
    db.commit()

    yield

    db.close()
    Base.metadata.drop_all(bind=test_engine)


def _headers(email: str) -> dict:
    db = TestingSessionLocal()
    u = db.query(User).filter(User.email == email).first()
    db.close()
    return {"Authorization": f"Bearer {create_access_token(u.id)}"}


def test_ai_find_solution_with_synonyms_and_visibility():
    """Operator asks about noise/problem on pump -> finds published solution, hides engineer's draft."""
    res = client.post(
        "/api/ai/ask",
        json={
            "message": "J'ai un problème de bruit anormal sur la pompe hydraulique",
            "mode": "all",
        },
        headers=_headers("op_ai@factory.com"),
    )
    assert res.status_code == 200
    data = res.json()
    assert data["intent_detected"] == "solution"
    assert len(data["recommendations"]) >= 1

    titles = [r["fiche"]["title"] for r in data["recommendations"]]
    assert any("P-102" in t and "Résolution" in t for t in titles)
    assert all("Brouillon confidentiel" not in t for t in titles)
    assert "P-102" in data["answer"]
    assert len(data["suggested_followups"]) >= 1


def test_ai_filter_tasks_mode():
    """Filtering by mode='tasks' returns task_post entries only."""
    res = client.post(
        "/api/ai/ask",
        json={
            "message": "Quelles tâches de maintenance sur le convoyeur ?",
            "mode": "tasks",
        },
        headers=_headers("op_ai@factory.com"),
    )
    assert res.status_code == 200
    data = res.json()
    assert data["intent_detected"] == "task"
    assert len(data["recommendations"]) == 1
    assert data["recommendations"][0]["fiche"]["type"] == "task_post"
    assert "convoyeur" in data["recommendations"][0]["fiche"]["title"].lower()


def test_ai_conversational_followup_safety():
    """Follow-up question about safety keeps topic context from history."""
    res = client.post(
        "/api/ai/ask",
        json={
            "message": "Quelles sont les consignes de sécurité ?",
            "mode": "all",
            "history": [
                {"role": "user", "content": "Comment réparer la vibration de la pompe P-102 ?"},
                {"role": "assistant", "content": "Voici la solution pour la pompe P-102."},
            ],
        },
        headers=_headers("op_ai@factory.com"),
    )
    assert res.status_code == 200
    data = res.json()
    assert len(data["recommendations"]) >= 1
    assert "LOTO" in data["answer"] or "lunettes" in data["answer"].lower()


def test_ai_no_results_graceful_fallback():
    """Unmatched technical term returns helpful empty-state message without crashing."""
    res = client.post(
        "/api/ai/ask",
        json={"message": "zyxwvutsrqponm turbine nucleaire quantique", "mode": "all"},
        headers=_headers("op_ai@factory.com"),
    )
    assert res.status_code == 200
    data = res.json()
    assert data["recommendations"] == []
    assert "aucune fiche" in data["answer"].lower()
    assert len(data["suggested_followups"]) >= 1


def test_ai_suggestions_endpoint():
    """GET /api/ai/suggestions returns contextual starter prompts."""
    res = client.get("/api/ai/suggestions", headers=_headers("op_ai@factory.com"))
    assert res.status_code == 200
    data = res.json()
    assert len(data["suggestions"]) >= 3
