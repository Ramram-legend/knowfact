"""
test_gamification.py — Full test suite for the Gamification & Contribution Points System.
"""
import pytest
from fastapi.testclient import TestClient
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from sqlalchemy.pool import StaticPool

from database import Base
from main import app
from models import (
    Fiche, FicheStatus, FicheType, FicheVersion, User, UserRole, VersionStatus,
    UserPoints, PointsTransaction, UserBadge, PointConfig, GamificationNotification
)
from auth import create_access_token, hash_password
from gamification import compute_level, award_points, check_top_contributor_badges_global
from tests.conftest import TestingSessionLocal, test_engine

client = TestClient(app)


@pytest.fixture(autouse=True)
def setup_gamification_db():
    Base.metadata.create_all(bind=test_engine)
    db = TestingSessionLocal()

    # Clear existing gamification & test data
    db.query(GamificationNotification).delete()
    db.query(PointsTransaction).delete()
    db.query(UserBadge).delete()
    db.query(UserPoints).delete()
    db.query(PointConfig).delete()
    db.query(FicheVersion).delete()
    db.query(Fiche).delete()
    db.query(User).delete()
    db.commit()

    # Seed default point configs
    default_configs = [
        PointConfig(action_key="publish_problem_solution", points=20, label="Technical Solution", is_active=True),
        PointConfig(action_key="publish_procedure", points=25, label="Maintenance Procedure", is_active=True),
        PointConfig(action_key="publish_task_post", points=15, label="Technical Task", is_active=True),
        PointConfig(action_key="share_best_practice", points=15, label="Best Practice", is_active=True),
        PointConfig(action_key="provide_useful_answer", points=10, label="Useful Answer", is_active=True),
        PointConfig(action_key="receive_positive_evaluation", points=5, label="Positive Evaluation", is_active=True),
        PointConfig(action_key="solution_approved_by_expert", points=10, label="Expert Approval Bonus", is_active=True),
        PointConfig(action_key="improvement_validated", points=10, label="Improvement Validated", is_active=True),
        PointConfig(action_key="admin_adjustment", points=0, label="Admin Manual Adjustment", is_active=True),
    ]
    for cfg in default_configs:
        db.add(cfg)

    # Seed test users
    admin = User(
        id=1,
        email="admin_gam@test.com",
        password_hash=hash_password("admin123"),
        full_name="Admin Director",
        role=UserRole.admin,
        is_active=True,
    )
    expert = User(
        id=2,
        email="expert_gam@test.com",
        password_hash=hash_password("expert123"),
        full_name="Expert Thomas",
        role=UserRole.expert,
        is_active=True,
    )
    engineer = User(
        id=3,
        email="engineer_gam@test.com",
        password_hash=hash_password("eng123"),
        full_name="Engineer Sarah",
        role=UserRole.engineer,
        is_active=True,
    )
    technician = User(
        id=4,
        email="technician_gam@test.com",
        password_hash=hash_password("tech123"),
        full_name="Technician Marc",
        role=UserRole.technician,
        is_active=True,
    )

    db.add_all([admin, expert, engineer, technician])
    db.commit()
    db.close()


def auth_header(user_id: int):
    token = create_access_token(user_id)
    return {"Authorization": f"Bearer {token}"}


def test_level_computation():
    """Verify level calculation thresholds and progress percentage."""
    lvl1 = compute_level(0)
    assert lvl1["level"] == 1
    assert lvl1["level_name"] == "Beginner"
    assert lvl1["progress_pct"] == 0
    assert lvl1["points_to_next"] == 100

    lvl2 = compute_level(150)
    assert lvl2["level"] == 2
    assert lvl2["level_name"] == "Contributor"
    assert lvl2["points_in_level"] == 50

    lvl3 = compute_level(300)
    assert lvl3["level"] == 3
    assert lvl3["level_name"] == "Skilled Technician"

    lvl4 = compute_level(650)
    assert lvl4["level"] == 4
    assert lvl4["level_name"] == "Professional Engineer"

    lvl5 = compute_level(1200)
    assert lvl5["level"] == 5
    assert lvl5["level_name"] == "Technical Expert"

    lvl6 = compute_level(2500)
    assert lvl6["level"] == 6
    assert lvl6["level_name"] == "Master Expert"
    assert lvl6["is_max_level"] is True


def test_points_awarded_on_solution_publish():
    """Verify that publishing a problem_solution awards +20 points to the author and unlocks First Contribution badge."""
    db = TestingSessionLocal()
    # Create draft fiche by engineer (id=3)
    fiche = Fiche(
        title="Vibration on Pump Motor",
        type=FicheType.problem_solution,
        content='{"description": "Fix bearing alignment", "steps": []}',
        author_id=3,
        status=FicheStatus.validated,
        version=1,
    )
    db.add(fiche)
    db.commit()
    fiche_id = fiche.id
    db.close()

    # Expert publishes the fiche
    resp = client.post(f"/api/fiches/{fiche_id}/publish", headers=auth_header(2))
    assert resp.status_code == 200

    # Check engineer profile points
    prof_resp = client.get("/api/gamification/me", headers=auth_header(3))
    assert prof_resp.status_code == 200
    data = prof_resp.json()
    assert data["total_points"] == 20
    assert data["solutions_shared"] == 1
    # Check First Contribution badge unlocked
    badge_ids = [b["badge_id"] for b in data["badges"]]
    assert "first_contribution" in badge_ids


def test_points_awarded_on_procedure_publish():
    """Verify that publishing a maintenance procedure awards +25 points."""
    db = TestingSessionLocal()
    fiche = Fiche(
        title="Annual Compressor Inspection",
        type=FicheType.procedure,
        content='{"description": "Full procedure", "steps": []}',
        author_id=4,
        status=FicheStatus.validated,
        version=1,
    )
    db.add(fiche)
    db.commit()
    fiche_id = fiche.id
    db.close()

    resp = client.post(f"/api/fiches/{fiche_id}/publish", headers=auth_header(1))
    assert resp.status_code == 200

    prof_resp = client.get("/api/gamification/me", headers=auth_header(4))
    data = prof_resp.json()
    assert data["total_points"] == 25
    assert data["procedures_created"] == 1


def test_expert_validation_bonus():
    """Verify +10 bonus points are awarded when an expert validates a submitted solution."""
    db = TestingSessionLocal()
    fiche = Fiche(
        title="Thermal Calibration Routine",
        type=FicheType.task_post,
        content='{"description": "Task routine", "steps": []}',
        author_id=3,
        status=FicheStatus.submitted,
        version=1,
    )
    db.add(fiche)
    db.commit()
    fiche_id = fiche.id
    db.close()

    # Expert validates the fiche
    resp = client.post(f"/api/fiches/{fiche_id}/validate", json={"action": "validate", "comment": "Great"}, headers=auth_header(2))
    assert resp.status_code == 200

    prof_resp = client.get("/api/gamification/me", headers=auth_header(3))
    data = prof_resp.json()
    assert data["total_points"] == 10  # solution_approved_by_expert bonus


def test_positive_evaluation_and_duplicate_prevention():
    """Verify peer positive evaluation awards +5 points and prevents duplicate evaluation & self-evaluation."""
    db = TestingSessionLocal()
    fiche = Fiche(
        title="Conveyor Belt Lubrication",
        type=FicheType.procedure,
        content='{"description": "Step by step", "steps": []}',
        author_id=4, # technician
        status=FicheStatus.published,
        version=1,
    )
    db.add(fiche)
    db.commit()
    fiche_id = fiche.id
    db.close()

    # Technician cannot evaluate their own fiche
    self_eval = client.post(f"/api/fiches/{fiche_id}/evaluate", headers=auth_header(4))
    assert self_eval.status_code == 400

    # Engineer evaluates technician's fiche
    eval1 = client.post(f"/api/fiches/{fiche_id}/evaluate", headers=auth_header(3))
    assert eval1.status_code == 200
    assert eval1.json()["evaluations_count"] == 1
    assert eval1.json()["has_evaluated"] is True

    # Same engineer cannot evaluate again (duplicate prevention)
    eval2 = client.post(f"/api/fiches/{fiche_id}/evaluate", headers=auth_header(3))
    assert eval2.status_code == 400

    # Author (technician) received +5 points
    prof_resp = client.get("/api/gamification/me", headers=auth_header(4))
    assert prof_resp.json()["total_points"] == 5


def test_admin_manual_adjustment():
    """Verify admin can manually adjust points with recorded reason, and non-admin cannot."""
    # Engineer attempts admin adjust -> 403
    forbidden = client.post("/api/gamification/admin/adjust", json={"user_id": 4, "points": 100, "reason": "Bonus"}, headers=auth_header(3))
    assert forbidden.status_code == 403

    # Admin awards 150 points
    adj_resp = client.post("/api/gamification/admin/adjust", json={"user_id": 4, "points": 150, "reason": "Outstanding initiative on line 3"}, headers=auth_header(1))
    assert adj_resp.status_code == 200

    # User 4 has reached Level 2 (Contributor >= 100 pts)
    prof_resp = client.get("/api/gamification/me", headers=auth_header(4))
    data = prof_resp.json()
    assert data["total_points"] == 150
    assert data["level"] == 2
    assert data["level_name"] == "Contributor"


def test_notifications_lifecycle():
    """Verify notifications are created on points/level changes and can be marked as read."""
    # Trigger an adjustment for user 3
    client.post("/api/gamification/admin/adjust", json={"user_id": 3, "points": 120, "reason": "Safety audit completion"}, headers=auth_header(1))

    # Fetch notifications for user 3
    notif_resp = client.get("/api/gamification/me/notifications", headers=auth_header(3))
    assert notif_resp.status_code == 200
    notif_data = notif_resp.json()
    assert notif_data["unread_count"] > 0
    assert len(notif_data["notifications"]) > 0

    # Mark as read
    read_resp = client.post("/api/gamification/me/notifications/read", headers=auth_header(3))
    assert read_resp.status_code == 200

    # Confirm unread_count is 0
    notif_resp_after = client.get("/api/gamification/me/notifications", headers=auth_header(3))
    assert notif_resp_after.json()["unread_count"] == 0


def test_leaderboard_all_and_role_filters():
    """Verify leaderboard ranking and role filtering (overall, engineer, technician, expert)."""
    # Give user 3 (engineer) 200 pts and user 4 (technician) 500 pts
    client.post("/api/gamification/admin/adjust", json={"user_id": 3, "points": 200, "reason": "Eng pts"}, headers=auth_header(1))
    client.post("/api/gamification/admin/adjust", json={"user_id": 4, "points": 500, "reason": "Tech pts"}, headers=auth_header(1))

    # All-time overall leaderboard
    resp_all = client.get("/api/gamification/leaderboard?period=all", headers=auth_header(3))
    assert resp_all.status_code == 200
    entries = resp_all.json()["leaderboard"]
    assert len(entries) >= 2
    # Technician (500 pts) should be higher than Engineer (200 pts)
    assert entries[0]["user_id"] == 4
    assert entries[0]["total_points"] >= 500

    # Filter by technician role
    resp_tech = client.get("/api/gamification/leaderboard?period=all&role=technician", headers=auth_header(3))
    assert resp_tech.status_code == 200
    for e in resp_tech.json()["leaderboard"]:
        assert e["role"] == "technician"

    # Filter by engineer role
    resp_eng = client.get("/api/gamification/leaderboard?period=all&role=engineer", headers=auth_header(3))
    assert resp_eng.status_code == 200
    for e in resp_eng.json()["leaderboard"]:
        assert e["role"] == "engineer"


def test_admin_config_management():
    """Verify admin can view and update point configurations."""
    # List configs
    get_cfg = client.get("/api/gamification/config", headers=auth_header(1))
    assert get_cfg.status_code == 200
    configs = get_cfg.json()
    assert any(c["action_key"] == "publish_problem_solution" for c in configs)

    # Update points for technical solution from 20 to 30
    put_cfg = client.put(
        "/api/gamification/config/publish_problem_solution",
        json={"points": 30},
        headers=auth_header(1),
    )
    assert put_cfg.status_code == 200
    assert put_cfg.json()["points"] == 30

