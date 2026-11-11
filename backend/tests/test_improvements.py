"""
test_improvements.py — Comprehensive tests for the "Améliorer une solution existante" feature.
"""
import pytest
from fastapi.testclient import TestClient
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from sqlalchemy.pool import StaticPool

from database import Base, get_db
from main import app
from models import Fiche, FicheStatus, FicheType, FicheVersion, User, UserRole, VersionStatus
from auth import create_access_token, hash_password

# In-memory SQLite with StaticPool for testing
SQLALCHEMY_DATABASE_URL = "sqlite:///:memory:"
engine = create_engine(
    SQLALCHEMY_DATABASE_URL,
    connect_args={"check_same_thread": False},
    poolclass=StaticPool,
)
TestingSessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)


def override_get_db():
    db = TestingSessionLocal()
    try:
        yield db
    finally:
        db.close()


app.dependency_overrides[get_db] = override_get_db

client = TestClient(app)


@pytest.fixture(autouse=True)
def setup_db():
    Base.metadata.create_all(bind=engine)
    db = TestingSessionLocal()

    # Seed users
    admin = User(
        email="admin@test.com",
        password_hash=hash_password("admin123"),
        full_name="Admin Boss",
        role=UserRole.admin,
        is_active=True,
    )
    expert = User(
        email="expert@test.com",
        password_hash=hash_password("expert123"),
        full_name="Expert Pierre",
        role=UserRole.expert,
        is_active=True,
    )
    engineer1 = User(
        email="engineer1@test.com",
        password_hash=hash_password("engineer123"),
        full_name="Ingénieur Alice",
        role=UserRole.engineer,
        is_active=True,
    )
    engineer2 = User(
        email="engineer2@test.com",
        password_hash=hash_password("engineer123"),
        full_name="Ingénieur Bob",
        role=UserRole.engineer,
        is_active=True,
    )
    operator = User(
        email="operator@test.com",
        password_hash=hash_password("operator123"),
        full_name="Opérateur Charlie",
        role=UserRole.operator,
        is_active=True,
    )

    db.add_all([admin, expert, engineer1, engineer2, operator])
    db.commit()

    # Seed an initial published/validated fiche (v1)
    fiche = Fiche(
        title="Pompe hydraulique - Diagnostic initial",
        type=FicheType.problem_solution,
        content='{"description": "Méthode standard 45 minutes", "steps": [{"order": 1, "content": "Arrêt"}], "tags": ["pompe"], "equipment": "Clé 12", "safety_notes": "Lunettes"}',
        author_id=engineer1.id,
        status=FicheStatus.published,
        version=1,
    )
    db.add(fiche)
    db.flush()

    v1 = FicheVersion(
        fiche_id=fiche.id,
        version_number=1,
        title=fiche.title,
        content=fiche.content,
        changed_by=engineer1.id,
        status=VersionStatus.active,
        change_reason="Version initiale",
    )
    db.add(v1)
    db.commit()
    db.close()

    yield

    Base.metadata.drop_all(bind=engine)


def auth_headers(email: str):
    db = TestingSessionLocal()
    user = db.query(User).filter(User.email == email).first()
    db.close()
    token = create_access_token(user.id)
    return {"Authorization": f"Bearer {token}"}


def test_engineer_can_propose_improvement_with_reason():
    """Un ingénieur peut proposer une amélioration avec motif obligatoire."""
    headers = auth_headers("engineer2@test.com")
    payload = {
        "title": "Pompe hydraulique - Diagnostic optimisé",
        "content": {
            "description": "Méthode rapide 15 minutes",
            "steps": [{"order": 1, "content": "Arrêt d'urgence"}, {"order": 2, "content": "Purge rapide"}],
            "tags": ["pompe", "rapide"],
            "equipment": "Clé 12, Manomètre",
            "safety_notes": "Lunettes et gants obligatoires",
        },
        "improvement_reason": "Réduction du temps d'arrêt de 45 à 15 min grâce à la nouvelle purge",
        "submit": True,
    }
    resp = client.post("/api/fiches/1/propose-improvement", json=payload, headers=headers)
    assert resp.status_code == 201
    data = resp.json()
    assert data["version_number"] == 2
    assert data["status"] == "pending_review"
    assert data["improvement_reason"] == payload["improvement_reason"]

    # Vérifier que la fiche originale v1 reste inchangée et active
    fiche_resp = client.get("/api/fiches/1", headers=headers)
    fiche_data = fiche_resp.json()
    assert fiche_data["version"] == 1
    assert fiche_data["has_pending_improvement"] is True
    assert fiche_data["content"]["description"] == "Méthode standard 45 minutes"


def test_proposal_fails_without_improvement_reason_when_submitted():
    """Sans motif, la soumission est refusée."""
    headers = auth_headers("engineer2@test.com")
    payload = {
        "title": "Titre sans motif",
        "content": {"description": "Test", "steps": [], "tags": [], "equipment": "", "safety_notes": ""},
        "improvement_reason": "   ",  # vide
        "submit": True,
    }
    resp = client.post("/api/fiches/1/propose-improvement", json=payload, headers=headers)
    assert resp.status_code == 400
    assert "motif" in resp.json()["detail"].lower()


def test_cannot_have_multiple_pending_proposals_on_same_fiche():
    """Une seule proposition d'amélioration en cours par fiche."""
    headers2 = auth_headers("engineer2@test.com")
    payload = {
        "content": {"description": "Amélioration 1", "steps": [], "tags": [], "equipment": "", "safety_notes": ""},
        "improvement_reason": "Motif 1",
        "submit": True,
    }
    resp1 = client.post("/api/fiches/1/propose-improvement", json=payload, headers=headers2)
    assert resp1.status_code == 201

    # Deuxième proposition concurrente par un autre ingénieur -> bloquée
    headers1 = auth_headers("engineer1@test.com")
    payload2 = {
        "content": {"description": "Amélioration 2", "steps": [], "tags": [], "equipment": "", "safety_notes": ""},
        "improvement_reason": "Motif 2",
        "submit": True,
    }
    resp2 = client.post("/api/fiches/1/propose-improvement", json=payload2, headers=headers1)
    assert resp2.status_code == 400
    assert "déjà en cours" in resp2.json()["detail"].lower()


def test_author_cannot_validate_own_proposal():
    """Règle anti-auto-validation : un utilisateur ne peut jamais valider sa propre proposition."""
    # Créons une proposition soumise par expert@test.com ou faisons en sorte que l'auteur tente de la valider
    headers_eng2 = auth_headers("engineer2@test.com")
    payload = {
        "content": {"description": "Amélioration par Bob", "steps": [], "tags": [], "equipment": "", "safety_notes": ""},
        "improvement_reason": "Bob veut s'auto-valider",
        "submit": True,
    }
    resp = client.post("/api/fiches/1/propose-improvement", json=payload, headers=headers_eng2)
    assert resp.status_code == 201
    version_id = resp.json()["id"]

    # Tentative par l'auteur (non-valideur)
    review_payload = {"action": "validate", "comment": "Je valide mon code"}
    resp_review = client.post(f"/api/fiches/improvements/{version_id}/review", json=review_payload, headers=headers_eng2)
    assert resp_review.status_code == 403

    # Même si l'auteur était un admin ou expert, il ne peut pas valider sa propre proposition !
    # Testons avec un compte expert qui crée un brouillon et tente de se valider
    # Donnons à l'expert le rôle temporaire ou créons une proposition par expert
    db = TestingSessionLocal()
    expert_user = db.query(User).filter(User.email == "expert@test.com").first()
    expert_proposal = FicheVersion(
        fiche_id=1,
        version_number=2,
        title="Amélioration par Expert",
        content='{"description": "Expert edit"}',
        changed_by=expert_user.id,
        status=VersionStatus.pending_review,
        improvement_reason="Test auto validation",
    )
    db.add(expert_proposal)
    db.commit()
    prop_id = expert_proposal.id
    db.close()

    headers_expert = auth_headers("expert@test.com")
    resp_self_validate = client.post(f"/api/fiches/improvements/{prop_id}/review", json={"action": "validate"}, headers=headers_expert)
    assert resp_self_validate.status_code == 403
    assert "propre proposition" in resp_self_validate.json()["detail"].lower()


def test_atomic_validation_promotes_version_and_archives_old():
    """Validation atomique : v2 devient active, v1 passe superseded, fiche.version passe à 2."""
    headers_eng = auth_headers("engineer2@test.com")
    payload = {
        "title": "Pompe hydraulique - Solution v2 validée",
        "content": {
            "description": "Nouvelle solution validée",
            "steps": [{"order": 1, "content": "Action 1"}],
            "tags": ["pompe", "validé"],
            "equipment": "Kit complet",
            "safety_notes": "Port du masque",
        },
        "improvement_reason": "Gain de sécurité et de productivité",
        "submit": True,
    }
    resp = client.post("/api/fiches/1/propose-improvement", json=payload, headers=headers_eng)
    assert resp.status_code == 201
    version_id = resp.json()["id"]

    # Expert valide
    headers_expert = auth_headers("expert@test.com")
    review_resp = client.post(
        f"/api/fiches/improvements/{version_id}/review",
        json={"action": "validate", "comment": "Excellente idée, approuvé immédiatement."},
        headers=headers_expert,
    )
    assert review_resp.status_code == 200
    review_data = review_resp.json()
    assert review_data["status"] == "active"
    assert len(review_data["reviews"]) == 1
    assert review_data["reviews"][0]["decision"] == "validate"

    # Vérification de la fiche : version 2 active, contenu mis à jour
    fiche_resp = client.get("/api/fiches/1", headers=headers_expert)
    fiche = fiche_resp.json()
    assert fiche["version"] == 2
    assert fiche["title"] == "Pompe hydraulique - Solution v2 validée"
    assert fiche["content"]["description"] == "Nouvelle solution validée"

    # Vérification des versions dans la DB
    db = TestingSessionLocal()
    versions = db.query(FicheVersion).filter(FicheVersion.fiche_id == 1).order_by(FicheVersion.version_number.asc()).all()
    assert len(versions) == 2
    assert versions[0].version_number == 1
    assert versions[0].status == VersionStatus.superseded
    assert versions[1].version_number == 2
    assert versions[1].status == VersionStatus.active
    db.close()


def test_rejection_leaves_active_version_untouched():
    """Après rejet, la version active ne change pas."""
    headers_eng = auth_headers("engineer2@test.com")
    payload = {
        "content": {"description": "Idée risquée", "steps": [], "tags": [], "equipment": "", "safety_notes": ""},
        "improvement_reason": "Suppression d'une étape de sécurité",
        "submit": True,
    }
    resp = client.post("/api/fiches/1/propose-improvement", json=payload, headers=headers_eng)
    version_id = resp.json()["id"]

    # Expert rejette avec motif obligatoire
    headers_expert = auth_headers("expert@test.com")
    review_resp = client.post(
        f"/api/fiches/improvements/{version_id}/review",
        json={"action": "reject", "comment": "Refusé car non conforme aux normes de sécurité."},
        headers=headers_expert,
    )
    assert review_resp.status_code == 200
    assert review_resp.json()["status"] == "rejected"

    # La fiche reste v1 active
    fiche_resp = client.get("/api/fiches/1", headers=headers_expert)
    fiche = fiche_resp.json()
    assert fiche["version"] == 1
    assert fiche["content"]["description"] == "Méthode standard 45 minutes"


def test_request_correction_requires_comment():
    """Demande de correction : commentaire obligatoire et retour à l'auteur (statut to_correct)."""
    headers_eng = auth_headers("engineer2@test.com")
    payload = {
        "content": {"description": "Procédure incomplète", "steps": [], "tags": [], "equipment": "", "safety_notes": ""},
        "improvement_reason": "Mise à jour partielle",
        "submit": True,
    }
    resp = client.post("/api/fiches/1/propose-improvement", json=payload, headers=headers_eng)
    version_id = resp.json()["id"]

    headers_expert = auth_headers("expert@test.com")
    # Sans commentaire -> refusé
    bad_review = client.post(
        f"/api/fiches/improvements/{version_id}/review",
        json={"action": "request_correction", "comment": "  "},
        headers=headers_expert,
    )
    assert bad_review.status_code == 400

    # Avec commentaire
    good_review = client.post(
        f"/api/fiches/improvements/{version_id}/review",
        json={"action": "request_correction", "comment": "Merci de préciser le couple de serrage."},
        headers=headers_expert,
    )
    assert good_review.status_code == 200
    assert good_review.json()["status"] == "to_correct"

    # L'auteur peut maintenant modifier et resoumettre
    update_resp = client.put(
        f"/api/fiches/improvements/{version_id}",
        json={
            "content": {"description": "Procédure complétée (couple 45 Nm)", "steps": [], "tags": [], "equipment": "", "safety_notes": ""},
            "improvement_reason": "Ajout du couple de serrage suite à remarque expert",
            "submit": True,
        },
        headers=headers_eng,
    )
    assert update_resp.status_code == 200
    assert update_resp.json()["status"] == "pending_review"
