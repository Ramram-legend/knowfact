"""
routes/users.py — User management endpoints (admin only).

GET /api/users           — list all users
PUT /api/users/{id}/role — change a user's role
"""
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from auth import get_current_active_user, require_roles
from database import get_db
from models import User, UserRole
from schemas import UserOut, UserRoleUpdate

router = APIRouter(prefix="/api/users", tags=["users"])


@router.get("/", response_model=list[UserOut])
def list_users(
    db: Session = Depends(get_db),
    _: User = Depends(require_roles(UserRole.admin)),
):
    """Return all registered users. Admin only."""
    return db.query(User).order_by(User.created_at.desc()).all()


@router.put("/{user_id}/role", response_model=UserOut)
def update_user_role(
    user_id: int,
    payload: UserRoleUpdate,
    db: Session = Depends(get_db),
    _: User = Depends(require_roles(UserRole.admin)),
):
    """Change a user's role. Admin only."""
    user = db.get(User, user_id)
    if not user:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="User not found.")
    user.role = payload.role
    db.commit()
    db.refresh(user)
    return user
