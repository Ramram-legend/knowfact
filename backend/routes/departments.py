"""
routes/departments.py — CRUD endpoints for factory Departments and Workstations.

GET    /api/departments/                          → list active departments
POST   /api/departments/                          → create department (admin)
GET    /api/departments/my                        → current user's departments
GET    /api/departments/{dept_id}                 → department detail
PUT    /api/departments/{dept_id}                 → update department (admin)
DELETE /api/departments/{dept_id}                 → soft-delete department (admin)
GET    /api/departments/{dept_id}/workstations    → list workstations
POST   /api/departments/{dept_id}/workstations    → create workstation (admin)
PUT    /api/departments/{dept_id}/workstations/{ws_id} → update workstation (admin)
DELETE /api/departments/{dept_id}/workstations/{ws_id} → soft-delete workstation (admin)
POST   /api/departments/{dept_id}/members         → assign user to department (admin)
DELETE /api/departments/{dept_id}/members/{user_id} → remove user assignment (admin)
"""
from typing import Optional

from fastapi import APIRouter, Body, Depends, HTTPException, status
from sqlalchemy.orm import Session, joinedload

from auth import get_current_active_user, require_roles
from database import get_db
from models import Department, Fiche, User, UserDepartment, UserRole, Workstation
from schemas import (
    DepartmentCreate,
    DepartmentDetail,
    DepartmentMember,
    DepartmentOut,
    DepartmentUpdate,
    MessageOut,
    UserDepartmentCreate,
    UserDepartmentOut,
    UserOut,
    WorkstationCreate,
    WorkstationOut,
    WorkstationUpdate,
)

router = APIRouter(prefix="/api/departments", tags=["departments"])


# ---------------------------------------------------------------------------
# Helpers
# ---------------------------------------------------------------------------


def _get_dept_or_404(dept_id: int, db: Session) -> Department:
    """Fetch a department by id or raise HTTP 404."""
    dept = (
        db.query(Department)
        .options(
            joinedload(Department.manager),
            joinedload(Department.workstations),
        )
        .filter(Department.id == dept_id)
        .first()
    )
    if not dept:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Département introuvable.")
    return dept


def _get_ws_or_404(dept_id: int, ws_id: int, db: Session) -> Workstation:
    """Fetch a workstation belonging to a specific department or raise HTTP 404."""
    ws = db.query(Workstation).filter(
        Workstation.id == ws_id,
        Workstation.department_id == dept_id,
    ).first()
    if not ws:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Poste de travail introuvable dans ce département.",
        )
    return ws


def _build_dept_out(dept: Department, db: Session) -> DepartmentOut:
    """Build a DepartmentOut with computed member_count."""
    member_count = (
        db.query(UserDepartment)
        .filter(UserDepartment.department_id == dept.id)
        .count()
    )
    out = DepartmentOut.model_validate(dept)
    out.member_count = member_count
    return out


# ---------------------------------------------------------------------------
# GET /  — list all active departments
# ---------------------------------------------------------------------------


@router.get("/", response_model=list[DepartmentOut])
def list_departments(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user),
):
    """Retourne la liste de tous les départements actifs (avec postes et nb membres)."""
    depts = (
        db.query(Department)
        .options(
            joinedload(Department.manager),
            joinedload(Department.workstations),
        )
        .filter(Department.is_active.is_(True))
        .order_by(Department.display_order, Department.name)
        .all()
    )
    return [_build_dept_out(d, db) for d in depts]


# ---------------------------------------------------------------------------
# POST /  — create a department (admin only)
# ---------------------------------------------------------------------------


@router.post("/", response_model=DepartmentOut, status_code=status.HTTP_201_CREATED)
def create_department(
    payload: DepartmentCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_roles(UserRole.admin)),
):
    """Créer un nouveau département (admin uniquement)."""
    # Vérifier l'unicité du nom et du code
    if db.query(Department).filter(Department.name == payload.name).first():
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Un département avec le nom '{payload.name}' existe déjà.",
        )
    if db.query(Department).filter(Department.code == payload.code).first():
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Un département avec le code '{payload.code}' existe déjà.",
        )

    dept = Department(
        name=payload.name,
        code=payload.code,
        description=payload.description,
        color=payload.color,
        icon=payload.icon,
        manager_id=payload.manager_id,
        display_order=payload.display_order,
        is_active=True,
    )
    db.add(dept)
    db.commit()
    db.refresh(dept)
    return _build_dept_out(_get_dept_or_404(dept.id, db), db)


# ---------------------------------------------------------------------------
# GET /my  — current user's departments
# ---------------------------------------------------------------------------


@router.get("/my", response_model=list[UserDepartmentOut])
def list_my_departments(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user),
):
    """Retourne les affectations de département de l'utilisateur connecté."""
    assignments = (
        db.query(UserDepartment)
        .options(
            joinedload(UserDepartment.department).joinedload(Department.workstations),
            joinedload(UserDepartment.workstation),
            joinedload(UserDepartment.user),
        )
        .filter(UserDepartment.user_id == current_user.id)
        .all()
    )
    return [UserDepartmentOut.model_validate(a) for a in assignments]


# ---------------------------------------------------------------------------
# GET /{dept_id}  — department detail (members, workstations, fiche count)
# ---------------------------------------------------------------------------


@router.get("/{dept_id}", response_model=DepartmentDetail)
def get_department(
    dept_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user),
):
    """Retourne le détail complet d'un département (membres, postes, nb fiches)."""
    dept = _get_dept_or_404(dept_id, db)

    # Charger les affectations avec users et workstations
    assignments = (
        db.query(UserDepartment)
        .options(
            joinedload(UserDepartment.user),
            joinedload(UserDepartment.workstation),
        )
        .filter(UserDepartment.department_id == dept_id)
        .all()
    )

    fiche_count = db.query(Fiche).filter(Fiche.department_id == dept_id).count()

    members = [
        DepartmentMember(
            user_id=a.user_id,
            user=UserOut.model_validate(a.user) if a.user else None,
            workstation=a.workstation,
            is_primary=a.is_primary,
        )
        for a in assignments
    ]

    detail = DepartmentDetail(
        id=dept.id,
        name=dept.name,
        code=dept.code,
        description=dept.description,
        color=dept.color,
        icon=dept.icon,
        manager_id=dept.manager_id,
        is_active=dept.is_active,
        display_order=dept.display_order,
        created_at=dept.created_at,
        manager=UserOut.model_validate(dept.manager) if dept.manager else None,
        workstations=dept.workstations,
        members=members,
        fiche_count=fiche_count,
    )
    return detail


# ---------------------------------------------------------------------------
# PUT /{dept_id}  — update department (admin only)
# ---------------------------------------------------------------------------


@router.put("/{dept_id}", response_model=DepartmentOut)
def update_department(
    dept_id: int,
    payload: DepartmentUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_roles(UserRole.admin)),
):
    """Mettre à jour un département (admin uniquement)."""
    dept = _get_dept_or_404(dept_id, db)

    if payload.name is not None:
        existing = db.query(Department).filter(
            Department.name == payload.name, Department.id != dept_id
        ).first()
        if existing:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Un département avec le nom '{payload.name}' existe déjà.",
            )
        dept.name = payload.name
    if payload.code is not None:
        existing = db.query(Department).filter(
            Department.code == payload.code, Department.id != dept_id
        ).first()
        if existing:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Un département avec le code '{payload.code}' existe déjà.",
            )
        dept.code = payload.code
    if payload.description is not None:
        dept.description = payload.description
    if payload.color is not None:
        dept.color = payload.color
    if payload.icon is not None:
        dept.icon = payload.icon
    if payload.manager_id is not None:
        dept.manager_id = payload.manager_id
    if payload.is_active is not None:
        dept.is_active = payload.is_active
    if payload.display_order is not None:
        dept.display_order = payload.display_order

    db.commit()
    db.refresh(dept)
    return _build_dept_out(_get_dept_or_404(dept_id, db), db)


# ---------------------------------------------------------------------------
# DELETE /{dept_id}  — soft-delete department (admin only)
# ---------------------------------------------------------------------------


@router.delete("/{dept_id}", response_model=MessageOut)
def deactivate_department(
    dept_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_roles(UserRole.admin)),
):
    """Désactiver (soft delete) un département (admin uniquement)."""
    dept = _get_dept_or_404(dept_id, db)
    dept.is_active = False
    db.commit()
    return MessageOut(message=f"Département '{dept.name}' désactivé.")


# ---------------------------------------------------------------------------
# GET /{dept_id}/workstations  — list workstations
# ---------------------------------------------------------------------------


@router.get("/{dept_id}/workstations", response_model=list[WorkstationOut])
def list_workstations(
    dept_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user),
):
    """Liste les postes de travail d'un département."""
    _get_dept_or_404(dept_id, db)
    wss = (
        db.query(Workstation)
        .filter(Workstation.department_id == dept_id)
        .order_by(Workstation.display_order, Workstation.name)
        .all()
    )
    return [WorkstationOut.model_validate(ws) for ws in wss]


# ---------------------------------------------------------------------------
# POST /{dept_id}/workstations  — create workstation (admin only)
# ---------------------------------------------------------------------------


@router.post(
    "/{dept_id}/workstations",
    response_model=WorkstationOut,
    status_code=status.HTTP_201_CREATED,
)
def create_workstation(
    dept_id: int,
    payload: WorkstationCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_roles(UserRole.admin)),
):
    """Créer un poste de travail dans un département (admin uniquement)."""
    _get_dept_or_404(dept_id, db)
    ws = Workstation(
        department_id=dept_id,
        name=payload.name,
        code=payload.code,
        description=payload.description,
        display_order=payload.display_order,
        is_active=True,
    )
    db.add(ws)
    db.commit()
    db.refresh(ws)
    return WorkstationOut.model_validate(ws)


# ---------------------------------------------------------------------------
# PUT /{dept_id}/workstations/{ws_id}  — update workstation (admin only)
# ---------------------------------------------------------------------------


@router.put("/{dept_id}/workstations/{ws_id}", response_model=WorkstationOut)
def update_workstation(
    dept_id: int,
    ws_id: int,
    payload: WorkstationUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_roles(UserRole.admin)),
):
    """Mettre à jour un poste de travail (admin uniquement)."""
    ws = _get_ws_or_404(dept_id, ws_id, db)

    if payload.name is not None:
        ws.name = payload.name
    if payload.code is not None:
        ws.code = payload.code
    if payload.description is not None:
        ws.description = payload.description
    if payload.is_active is not None:
        ws.is_active = payload.is_active
    if payload.display_order is not None:
        ws.display_order = payload.display_order

    db.commit()
    db.refresh(ws)
    return WorkstationOut.model_validate(ws)


# ---------------------------------------------------------------------------
# DELETE /{dept_id}/workstations/{ws_id}  — soft-delete workstation (admin only)
# ---------------------------------------------------------------------------


@router.delete("/{dept_id}/workstations/{ws_id}", response_model=MessageOut)
def deactivate_workstation(
    dept_id: int,
    ws_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_roles(UserRole.admin)),
):
    """Désactiver (soft delete) un poste de travail (admin uniquement)."""
    ws = _get_ws_or_404(dept_id, ws_id, db)
    ws.is_active = False
    db.commit()
    return MessageOut(message=f"Poste '{ws.name}' désactivé.")


# ---------------------------------------------------------------------------
# POST /{dept_id}/members  — assign user to department (admin only)
# ---------------------------------------------------------------------------


@router.post(
    "/{dept_id}/members",
    response_model=UserDepartmentOut,
    status_code=status.HTTP_201_CREATED,
)
def add_member(
    dept_id: int,
    user_id: int = Body(...),
    workstation_id: Optional[int] = Body(None),
    is_primary: bool = Body(False),
    db: Session = Depends(get_db),
    current_user: User = Depends(require_roles(UserRole.admin)),
):
    """Affecter un utilisateur à un département (admin uniquement)."""
    _get_dept_or_404(dept_id, db)

    # Vérifier que l'utilisateur existe
    user = db.query(User).filter(User.id == user_id).first()
    if not user:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Utilisateur introuvable.")

    # Vérifier si une affectation existe déjà
    existing = db.query(UserDepartment).filter(
        UserDepartment.user_id == user_id,
        UserDepartment.department_id == dept_id,
    ).first()
    if existing:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Cet utilisateur est déjà affecté à ce département.",
        )

    assignment = UserDepartment(
        user_id=user_id,
        department_id=dept_id,
        workstation_id=workstation_id,
        is_primary=is_primary,
    )
    db.add(assignment)

    # Mettre à jour les champs primaires sur l'utilisateur si is_primary
    if is_primary:
        user.primary_department_id = dept_id
        if workstation_id:
            user.primary_workstation_id = workstation_id

    db.commit()
    db.refresh(assignment)

    # Recharger avec joinedload pour la réponse
    result = (
        db.query(UserDepartment)
        .options(
            joinedload(UserDepartment.department).joinedload(Department.workstations),
            joinedload(UserDepartment.workstation),
            joinedload(UserDepartment.user),
        )
        .filter(UserDepartment.id == assignment.id)
        .first()
    )
    return UserDepartmentOut.model_validate(result)


# ---------------------------------------------------------------------------
# DELETE /{dept_id}/members/{user_id}  — remove user assignment (admin only)
# ---------------------------------------------------------------------------


@router.delete("/{dept_id}/members/{user_id}", response_model=MessageOut)
def remove_member(
    dept_id: int,
    user_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_roles(UserRole.admin)),
):
    """Retirer l'affectation d'un utilisateur d'un département (admin uniquement)."""
    _get_dept_or_404(dept_id, db)

    assignment = db.query(UserDepartment).filter(
        UserDepartment.user_id == user_id,
        UserDepartment.department_id == dept_id,
    ).first()
    if not assignment:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Aucune affectation trouvée pour cet utilisateur dans ce département.",
        )

    # Nettoyer les champs primaires si nécessaire
    user = db.query(User).filter(User.id == user_id).first()
    if user and user.primary_department_id == dept_id:
        user.primary_department_id = None
        user.primary_workstation_id = None

    db.delete(assignment)
    db.commit()
    return MessageOut(message="Affectation supprimée avec succès.")
