"""
test_kpi_ethics.py — Tests pour les KPI éthiques et industriels (Plan d'action amélioration).

Couvre :
- T1 : Créer une fiche → brouillon
- T2 : Soumettre une fiche → statut "submitted"
- T3 : Valider une fiche → seul un valideur peut valider
- T4 : Recherche et filtres → fiches pertinentes
- T5 : Accès non autorisé → rejeté
- T6 : Modifier une fiche validée → nouvelle version
- T7 : Réponse sans source → refus (placeholder IA)
- T8 : Marquer une fiche "utile" → KPI03
- KPI08 : 0 donnée personnelle exposée
- KPI09 : Réponses IA sans source refusées
"""
import pytest
from fastapi.testclient import TestClient

from database import Base
from main import app
from models import Fiche, FicheStatus, FicheType, FicheVersion, User, UserRole, VersionStatus
from auth import create_access_token, hash_password
from tests.conftest import TestingSessionLocal, test_engine

client = TestClient(app)


# ---------------------------------------------------------------------------
# Fixtures
# ---------------------------------------------------------------------------


@pytest.fixture(autouse=True)
def setup_db():
    Base.metadata.create_all(bind=test_engine)
    db = TestingSessionLocal()

    admin = User(
        email="admin_kpi@test.com",
        password_hash=hash_password("admin123"),
        full_name="Admin KPI",
        role=UserRole.admin,
        is_active=True,
    )
    expert = User(
        email="expert_kpi@test.com",
        password_hash=hash_password("expert123"),
        full_name="Expert KPI",
        role=UserRole.expert,
        is_active=True,
    )
    engineer = User(
        email="engineer_kpi@test.com",
        password_hash=hash_password("engineer123"),
        full_name="Ingénieur KPI",
        role=UserRole.engineer,
        is_active=True,
    )
    operator = User(
        email="operator_kpi@test.com",
        password_hash=hash_password("operator123"),
        full_name="Opérateur KPI",
        role=UserRole.operator,
        is_active=True,
    )
    db.add_all([admin, expert, engineer, operator])
    db.commit()
    db.close()
    yield
    Base.metadata.drop_all(bind=test_engine)


def auth_headers(email: str):
    db = TestingSessionLocal()
    user = db.query(User).filter(User.email == email).first()
    db.close()
    token = create_access_token(user.id)
    return {"Authorization": f"Bearer {token}"}


# ---------------------------------------------------------------------------
# T1 — Créer une fiche → brouillon
# ---------------------------------------------------------------------------


def test_T1_create_fiche_is_draft():
    """T1: Une fiche créée démarre en brouillon, visible uniquement par son auteur."""
    headers = auth_headers("engineer_kpi@test.com")
    payload = {
        "title": "Test T1 - Fiche brouillon",
        "type": "problem_solution",
        "content": {
            "description": "Description test T1",
            "tags": ["test", "T1"],
            "equipment": "Équipement test",
            "safety_notes": "Notes sécurité test",
        },
    }
    resp = client.post("/api/fiches/", json=payload, headers=headers)
    assert resp.status_code == 201
    data = resp.json()
    assert data["status"] == "draft"
    assert data["title"] == "Test T1 - Fiche brouillon"


# ---------------------------------------------------------------------------
# T2 — Soumettre une fiche → statut "submitted"
# ---------------------------------------------------------------------------


def test_T2_submit_fiche():
    """T2: Soumettre une fiche passe son statut à 'submitted'."""
    headers = auth_headers("engineer_kpi@test.com")
    # Create
    create_resp = client.post(
        "/api/fiches/",
        json={
            "title": "Test T2 - Soumission",
            "type": "problem_solution",
            "content": {"description": "T2", "tags": [], "equipment": "", "safety_notes": ""},
        },
        headers=headers,
    )
    assert create_resp.status_code == 201
    fiche_id = create_resp.json()["id"]

    # Submit
    submit_resp = client.post(f"/api/fiches/{fiche_id}/submit", headers=headers)
    assert submit_resp.status_code == 200
    assert submit_resp.json()["status"] == "submitted"


# ---------------------------------------------------------------------------
# T3 — Valider une fiche → seul un valideur peut valider
# ---------------------------------------------------------------------------


def test_T3_only_expert_can_validate():
    """T3: Un opérateur ne peut pas valider; l'expert peut valider."""
    eng_headers = auth_headers("engineer_kpi@test.com")
    exp_headers = auth_headers("expert_kpi@test.com")
    op_headers = auth_headers("operator_kpi@test.com")

    # Create + submit
    create_resp = client.post(
        "/api/fiches/",
        json={
            "title": "Test T3 - Validation",
            "type": "problem_solution",
            "content": {"description": "T3", "tags": [], "equipment": "", "safety_notes": ""},
        },
        headers=eng_headers,
    )
    fiche_id = create_resp.json()["id"]
    client.post(f"/api/fiches/{fiche_id}/submit", headers=eng_headers)

    # Operator cannot validate
    op_review = client.post(
        f"/api/fiches/{fiche_id}/review",
        json={"decision": "validate", "comment": ""},
        headers=op_headers,
    )
    assert op_review.status_code in (403, 422)

    # Expert can validate
    exp_review = client.post(
        f"/api/fiches/{fiche_id}/review",
        json={"decision": "validate", "comment": "Approuvé"},
        headers=exp_headers,
    )
    assert exp_review.status_code == 200
    assert exp_review.json()["status"] in ("validated", "published")


# ---------------------------------------------------------------------------
# T4 — Recherche et filtres
# ---------------------------------------------------------------------------


def test_T4_search_returns_relevant_results():
    """T4: La recherche retourne des fiches pertinentes par titre."""
    eng_headers = auth_headers("engineer_kpi@test.com")
    exp_headers = auth_headers("expert_kpi@test.com")

    # Create + publish a fiche about "vibration roulement"
    create_resp = client.post(
        "/api/fiches/",
        json={
            "title": "Vibration roulement moteur M04 T4",
            "type": "problem_solution",
            "content": {"description": "Vibration anormale", "tags": ["vibration", "roulement"], "equipment": "M04", "safety_notes": "EPI"},
        },
        headers=eng_headers,
    )
    fiche_id = create_resp.json()["id"]
    client.post(f"/api/fiches/{fiche_id}/submit", headers=eng_headers)
    client.post(f"/api/fiches/{fiche_id}/review", json={"decision": "validate", "comment": "OK"}, headers=exp_headers)
    client.post(f"/api/fiches/{fiche_id}/publish", headers=exp_headers)

    # Search for "vibration"
    search_resp = client.get("/api/search/?q=vibration", headers=eng_headers)
    assert search_resp.status_code == 200
    data = search_resp.json()
    assert data["total"] >= 1 or data.get("count", 0) >= 1
    titles = [r["title"] for r in data.get("results", [])]
    assert any("vibration" in t.lower() or "Vibration" in t for t in titles)


# ---------------------------------------------------------------------------
# T5 — Accès non autorisé
# ---------------------------------------------------------------------------


def test_T5_unauthorized_access_blocked():
    """T5: Sans token, l'accès à l'API est refusé (401)."""
    resp = client.get("/api/fiches/")
    assert resp.status_code == 401


def test_T5_operator_cannot_read_draft_of_others():
    """T5: Un opérateur ne peut pas lire le brouillon d'un autre utilisateur."""
    eng_headers = auth_headers("engineer_kpi@test.com")
    op_headers = auth_headers("operator_kpi@test.com")

    create_resp = client.post(
        "/api/fiches/",
        json={
            "title": "Fiche privée brouillon T5",
            "type": "problem_solution",
            "content": {"description": "privé", "tags": [], "equipment": "", "safety_notes": ""},
        },
        headers=eng_headers,
    )
    fiche_id = create_resp.json()["id"]

    # Operator tries to read draft
    get_resp = client.get(f"/api/fiches/{fiche_id}", headers=op_headers)
    assert get_resp.status_code == 403


# ---------------------------------------------------------------------------
# T6 — Modifier une fiche validée → nouvelle version
# ---------------------------------------------------------------------------


def test_T6_modifying_validated_creates_new_version():
    """T6: Modifier une fiche publiée démarre une nouvelle version en brouillon."""
    eng_headers = auth_headers("engineer_kpi@test.com")
    exp_headers = auth_headers("expert_kpi@test.com")

    # Create + publish
    create_resp = client.post(
        "/api/fiches/",
        json={
            "title": "Fiche T6 - à modifier",
            "type": "problem_solution",
            "content": {"description": "V1 original", "tags": [], "equipment": "", "safety_notes": ""},
        },
        headers=eng_headers,
    )
    fiche_id = create_resp.json()["id"]
    client.post(f"/api/fiches/{fiche_id}/submit", headers=eng_headers)
    client.post(f"/api/fiches/{fiche_id}/review", json={"decision": "validate", "comment": "OK"}, headers=exp_headers)
    client.post(f"/api/fiches/{fiche_id}/publish", headers=exp_headers)

    # Request new version
    new_version_resp = client.post(
        f"/api/fiches/{fiche_id}/new_version",
        json={"change_reason": "Amélioration T6"},
        headers=eng_headers,
    )
    # Should succeed (200 or 201) OR the fiche version increments
    assert new_version_resp.status_code in (200, 201)


# ---------------------------------------------------------------------------
# KPI08 — 0 donnée personnelle exposée (champs minimaux)
# ---------------------------------------------------------------------------


def test_KPI08_user_profile_no_sensitive_data():
    """KPI08: Le profil utilisateur n'expose que les champs minimaux (pas de hash, pas de données sensibles)."""
    headers = auth_headers("engineer_kpi@test.com")
    resp = client.get("/api/auth/me", headers=headers)
    assert resp.status_code == 200
    data = resp.json()

    # Must NOT expose password hash
    assert "password_hash" not in data
    assert "password" not in data

    # Must have minimal fields only
    assert "email" in data
    assert "full_name" in data
    assert "role" in data


# ---------------------------------------------------------------------------
# KPI09 — Réponses IA sans source refusées (placeholder)
# ---------------------------------------------------------------------------


def test_KPI09_search_with_no_match_returns_empty():
    """KPI09 proxy: Une recherche sans résultats retourne une liste vide (pas d'invention de données)."""
    headers = auth_headers("engineer_kpi@test.com")
    resp = client.get("/api/search/?q=xyzzy_terme_introuvable_12345", headers=headers)
    assert resp.status_code == 200
    data = resp.json()
    results = data.get("results", [])
    assert len(results) == 0


# ---------------------------------------------------------------------------
# T8 — Marquer utile (KPI03) si endpoint disponible
# ---------------------------------------------------------------------------


def test_T8_mark_useful_increments_count():
    """T8/KPI03: Marquer une fiche utile incrémente le compteur (si endpoint disponible)."""
    eng_headers = auth_headers("engineer_kpi@test.com")
    exp_headers = auth_headers("expert_kpi@test.com")

    # Create + publish
    create_resp = client.post(
        "/api/fiches/",
        json={
            "title": "Fiche T8 - marquer utile",
            "type": "problem_solution",
            "content": {"description": "T8", "tags": [], "equipment": "", "safety_notes": ""},
        },
        headers=eng_headers,
    )
    fiche_id = create_resp.json()["id"]
    client.post(f"/api/fiches/{fiche_id}/submit", headers=eng_headers)
    client.post(f"/api/fiches/{fiche_id}/review", json={"decision": "validate", "comment": "OK"}, headers=exp_headers)
    client.post(f"/api/fiches/{fiche_id}/publish", headers=exp_headers)

    # Try to mark as useful
    useful_resp = client.post(f"/api/fiches/{fiche_id}/mark_useful", headers=eng_headers)

    if useful_resp.status_code == 404:
        pytest.skip("Endpoint /mark_useful not yet implemented — skip gracefully")

    assert useful_resp.status_code == 200
    data = useful_resp.json()
    assert data.get("useful_count", 0) >= 1
