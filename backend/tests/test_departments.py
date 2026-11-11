"""
test_departments.py — Unit and integration tests for factory Departments & Workstations.
"""
import pytest
from fastapi.testclient import TestClient
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from sqlalchemy.pool import StaticPool

from database import Base
from main import app
from models import Department, Fiche, FicheStatus, FicheType, User, UserDepartment, UserRole, Workstation
from auth import create_access_token, hash_password
from tests.conftest import TestingSessionLocal, test_engine

client = TestClient(app)


@pytest.fixture(autouse=True)
def setup_db():
    Base.metadata.create_all(bind=test_engine)
    db = TestingSessionLocal()

    admin = User(
        email="admin@factory.com",
        password_hash=hash_password("pass"),
        full_name="Admin Test",
        role=UserRole.admin,
        is_active=True,
    )
    engineer = User(
        email="engineer@factory.com",
        password_hash=hash_password("pass"),
        full_name="Engineer Test",
        role=UserRole.engineer,
        is_active=True,
    )
    operator = User(
        email="operator@factory.com",
        password_hash=hash_password("pass"),
        full_name="Operator Test",
        role=UserRole.operator,
        is_active=True,
    )
    db.add_all([admin, engineer, operator])
    db.commit()

    # Create a test department
    prod = Department(
        name="Production Test",
        code="PROD-T",
        description="Production testing department",
        color="#2563eb",
        icon="Factory",
        manager_id=admin.id,
        is_active=True,
    )
    db.add(prod)
    db.commit()

    ws = Workstation(
        department_id=prod.id,
        name="Line 1",
        code="L1",
        is_active=True,
    )
    db.add(ws)
    db.commit()

    yield db

    db.close()
    Base.metadata.drop_all(bind=test_engine)


def auth_header(user_id: int):
    token = create_access_token(user_id)
    return {"Authorization": f"Bearer {token}"}


def test_list_departments():
    db = TestingSessionLocal()
    admin = db.query(User).filter(User.email == "admin@factory.com").first()
    res = client.get("/api/departments/", headers=auth_header(admin.id))
    assert res.status_code == 200
    data = res.json()
    assert len(data) >= 1
    assert data[0]["code"] == "PROD-T"
    assert len(data[0]["workstations"]) == 1


def test_admin_can_create_department():
    db = TestingSessionLocal()
    admin = db.query(User).filter(User.email == "admin@factory.com").first()
    payload = {
        "name": "Maintenance Special",
        "code": "MAINT-SPEC",
        "description": "Atelier maintenance",
        "color": "#d97706",
        "icon": "Wrench",
    }
    res = client.post("/api/departments/", json=payload, headers=auth_header(admin.id))
    assert res.status_code == 201
    assert res.json()["name"] == "Maintenance Special"
    assert res.json()["code"] == "MAINT-SPEC"


def test_non_admin_cannot_create_department():
    db = TestingSessionLocal()
    engineer = db.query(User).filter(User.email == "engineer@factory.com").first()
    payload = {
        "name": "Hacking Dept",
        "code": "HACK",
    }
    res = client.post("/api/departments/", json=payload, headers=auth_header(engineer.id))
    assert res.status_code == 403


def test_admin_can_create_workstation_and_assign_member():
    db = TestingSessionLocal()
    admin = db.query(User).filter(User.email == "admin@factory.com").first()
    engineer = db.query(User).filter(User.email == "engineer@factory.com").first()
    dept = db.query(Department).first()

    # Create workstation
    ws_res = client.post(
        f"/api/departments/{dept.id}/workstations",
        json={"name": "Poste Assemblage", "code": "ASS-01"},
        headers=auth_header(admin.id),
    )
    assert ws_res.status_code == 201
    ws_id = ws_res.json()["id"]

    # Assign member
    assign_res = client.post(
        f"/api/departments/{dept.id}/members",
        json={"user_id": engineer.id, "workstation_id": ws_id, "is_primary": True},
        headers=auth_header(admin.id),
    )
    assert assign_res.status_code == 201
    assert assign_res.json()["is_primary"] is True

    # Check detail
    detail_res = client.get(f"/api/departments/{dept.id}", headers=auth_header(engineer.id))
    assert detail_res.status_code == 200
    assert len(detail_res.json()["members"]) == 1
    assert detail_res.json()["members"][0]["full_name"] == "Engineer Test"


def test_filter_fiches_by_department():
    db = TestingSessionLocal()
    admin = db.query(User).filter(User.email == "admin@factory.com").first()
    dept = db.query(Department).first()

    # Create a fiche with department_id
    f1 = Fiche(
        title="Fiche Dept Prod",
        type=FicheType.problem_solution,
        content="{}",
        author_id=admin.id,
        status=FicheStatus.published,
        department_id=dept.id,
    )
    f2 = Fiche(
        title="Fiche Without Dept",
        type=FicheType.problem_solution,
        content="{}",
        author_id=admin.id,
        status=FicheStatus.published,
    )
    db.add_all([f1, f2])
    db.commit()

    # Query with department_id
    res = client.get(f"/api/fiches/?department_id={dept.id}", headers=auth_header(admin.id))
    assert res.status_code == 200
    results = res.json()["results"]
    assert len(results) == 1
    assert results[0]["title"] == "Fiche Dept Prod"
