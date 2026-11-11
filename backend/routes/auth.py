"""
routes/auth.py — Authentication endpoints.

POST /api/auth/register  — public, create new user
POST /api/auth/login     — public, returns JWT
GET  /api/auth/me        — protected, returns current user
"""
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from auth import (
    create_access_token,
    get_current_active_user,
    hash_password,
    verify_password,
)
from database import get_db
from models import User
from schemas import MessageOut, Token, UserCreate, UserLogin, UserOut

router = APIRouter(prefix="/api/auth", tags=["auth"])


@router.post("/register", response_model=UserOut, status_code=status.HTTP_201_CREATED)
def register(payload: UserCreate, db: Session = Depends(get_db)):
    """Register a new user. Email must be unique."""
    existing = db.query(User).filter(User.email == payload.email).first()
    if existing:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="A user with this email already exists.",
        )
    user = User(
        email=payload.email,
        password_hash=hash_password(payload.password),
        full_name=payload.full_name,
        role=payload.role,
        is_active=True,
    )
    db.add(user)
    db.commit()
    db.refresh(user)
    return user


@router.post("/login", response_model=Token)
def login(payload: UserLogin, db: Session = Depends(get_db)):
    """Authenticate a user and return a JWT access token."""
    user = db.query(User).filter(User.email == payload.email).first()
    if not user or not verify_password(payload.password, user.password_hash):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid email or password.",
            headers={"WWW-Authenticate": "Bearer"},
        )
    if not user.is_active:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Account is deactivated.",
        )
    token = create_access_token(user.id)
    return Token(
        access_token=token,
        access=token,
        refresh=token,
        user=UserOut.model_validate(user),
    )


@router.post("/demo-login/{role}", response_model=Token)
def demo_login(role: str = "admin", db: Session = Depends(get_db)):
    """Direct login for MVP demo without requiring password entry."""
    email_map = {
        "admin": "admin@knowfact.com",
        "expert": "expert@knowfact.com",
        "engineer": "engineer@knowfact.com",
        "technician": "technician@knowfact.com",
    }
    target_email = email_map.get(role.lower(), "admin@knowfact.com")
    user = db.query(User).filter(User.email == target_email).first()
    if not user:
        user = db.query(User).first()
    if not user:
        raise HTTPException(status_code=404, detail="No demo user found")
    token = create_access_token(user.id)
    return Token(
        access_token=token,
        access=token,
        refresh=token,
        user=UserOut.model_validate(user),
    )


@router.get("/me", response_model=UserOut)
def me(current_user: User = Depends(get_current_active_user)):
    """Return the currently authenticated user's profile."""
    return current_user


@router.post("/refresh", response_model=Token)
def refresh_token(
    db: Session = Depends(get_db),
):
    """Placeholder refresh endpoint. In production use a real refresh token."""
    # For this MVP we return an error; the frontend will redirect to login
    raise HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="Token expired. Please log in again.",
    )
