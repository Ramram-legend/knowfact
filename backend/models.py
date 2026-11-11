"""
models.py — SQLAlchemy ORM models for KnowFact.

Tables:
  - users
  - departments
  - workstations
  - user_departments
  - fiches
  - fiche_versions
  - attachments
"""
import enum
from datetime import datetime, timezone
from typing import Optional

from sqlalchemy import (
    Boolean,
    DateTime,
    Enum,
    ForeignKey,
    Integer,
    String,
    Text,
    func,
)
from sqlalchemy.orm import Mapped, mapped_column, relationship

from database import Base


# ---------------------------------------------------------------------------
# Enumerations
# ---------------------------------------------------------------------------


class UserRole(str, enum.Enum):
    engineer = "engineer"
    technician = "technician"
    operator = "operator"
    expert = "expert"
    admin = "admin"


class FicheType(str, enum.Enum):
    problem_solution = "problem_solution"
    task_post = "task_post"
    procedure = "procedure"


class FicheStatus(str, enum.Enum):
    draft = "draft"
    submitted = "submitted"
    under_review = "under_review"
    to_correct = "to_correct"
    validated = "validated"
    published = "published"
    rejected = "rejected"
    archived = "archived"


class VersionStatus(str, enum.Enum):
    draft = "draft"
    pending_review = "pending_review"
    active = "active"
    superseded = "superseded"
    to_correct = "to_correct"
    rejected = "rejected"


class ReviewDecision(str, enum.Enum):
    validate = "validate"
    request_correction = "request_correction"
    reject = "reject"


# ---------------------------------------------------------------------------
# User
# ---------------------------------------------------------------------------


class User(Base):
    __tablename__ = "users"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, index=True)
    email: Mapped[str] = mapped_column(String(255), unique=True, index=True, nullable=False)
    password_hash: Mapped[str] = mapped_column(String(255), nullable=False)
    full_name: Mapped[str] = mapped_column(String(255), nullable=False)
    role: Mapped[UserRole] = mapped_column(
        Enum(UserRole, native_enum=False), nullable=False, default=UserRole.engineer
    )
    is_active: Mapped[bool] = mapped_column(Boolean, default=True, nullable=False)
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), nullable=False
    )
    # Department affectation principale (nullable pour compatibilité ascendante)
    primary_department_id: Mapped[Optional[int]] = mapped_column(
        Integer, ForeignKey("departments.id", use_alter=True), nullable=True
    )
    primary_workstation_id: Mapped[Optional[int]] = mapped_column(
        Integer, ForeignKey("workstations.id", use_alter=True), nullable=True
    )

    # Relationships
    authored_fiches: Mapped[list["Fiche"]] = relationship(
        "Fiche", foreign_keys="Fiche.author_id", back_populates="author"
    )
    reviewed_fiches: Mapped[list["Fiche"]] = relationship(
        "Fiche", foreign_keys="Fiche.reviewed_by", back_populates="reviewer"
    )
    fiche_versions: Mapped[list["FicheVersion"]] = relationship(
        "FicheVersion", back_populates="changed_by_user"
    )
    attachments: Mapped[list["Attachment"]] = relationship(
        "Attachment", back_populates="uploader"
    )
    department_assignments: Mapped[list["UserDepartment"]] = relationship(
        "UserDepartment", back_populates="user", cascade="all, delete-orphan"
    )
    primary_department: Mapped[Optional["Department"]] = relationship(
        "Department", foreign_keys=[primary_department_id]
    )
    primary_workstation: Mapped[Optional["Workstation"]] = relationship(
        "Workstation", foreign_keys=[primary_workstation_id]
    )


# ---------------------------------------------------------------------------
# Department
# ---------------------------------------------------------------------------


class Department(Base):
    __tablename__ = "departments"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, index=True)
    name: Mapped[str] = mapped_column(String(100), nullable=False, unique=True)
    code: Mapped[str] = mapped_column(String(20), nullable=False, unique=True)
    description: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    color: Mapped[str] = mapped_column(String(7), nullable=False, default="#0d9488")
    icon: Mapped[str] = mapped_column(String(50), nullable=False, default="Factory")
    manager_id: Mapped[Optional[int]] = mapped_column(
        Integer, ForeignKey("users.id"), nullable=True
    )
    is_active: Mapped[bool] = mapped_column(Boolean, default=True, nullable=False)
    display_order: Mapped[int] = mapped_column(Integer, default=0, nullable=False)
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), nullable=False
    )

    # Relationships
    manager: Mapped[Optional["User"]] = relationship(
        "User", foreign_keys=[manager_id]
    )
    workstations: Mapped[list["Workstation"]] = relationship(
        "Workstation", back_populates="department", cascade="all, delete-orphan"
    )
    user_assignments: Mapped[list["UserDepartment"]] = relationship(
        "UserDepartment", back_populates="department", cascade="all, delete-orphan"
    )
    fiches: Mapped[list["Fiche"]] = relationship(
        "Fiche", back_populates="department"
    )


# ---------------------------------------------------------------------------
# Workstation
# ---------------------------------------------------------------------------


class Workstation(Base):
    __tablename__ = "workstations"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, index=True)
    department_id: Mapped[int] = mapped_column(
        Integer, ForeignKey("departments.id"), nullable=False, index=True
    )
    name: Mapped[str] = mapped_column(String(200), nullable=False)
    code: Mapped[Optional[str]] = mapped_column(String(30), nullable=True)
    description: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    is_active: Mapped[bool] = mapped_column(Boolean, default=True, nullable=False)
    display_order: Mapped[int] = mapped_column(Integer, default=0, nullable=False)
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), nullable=False
    )

    # Relationships
    department: Mapped["Department"] = relationship(
        "Department", back_populates="workstations"
    )
    user_assignments: Mapped[list["UserDepartment"]] = relationship(
        "UserDepartment", back_populates="workstation"
    )


# ---------------------------------------------------------------------------
# UserDepartment (table d'affectation utilisateur ↔ département)
# ---------------------------------------------------------------------------


class UserDepartment(Base):
    __tablename__ = "user_departments"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, index=True)
    user_id: Mapped[int] = mapped_column(
        Integer, ForeignKey("users.id"), nullable=False, index=True
    )
    department_id: Mapped[int] = mapped_column(
        Integer, ForeignKey("departments.id"), nullable=False, index=True
    )
    workstation_id: Mapped[Optional[int]] = mapped_column(
        Integer, ForeignKey("workstations.id"), nullable=True
    )
    is_primary: Mapped[bool] = mapped_column(Boolean, default=False, nullable=False)
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), nullable=False
    )

    # Relationships
    user: Mapped["User"] = relationship("User", back_populates="department_assignments")
    department: Mapped["Department"] = relationship(
        "Department", back_populates="user_assignments"
    )
    workstation: Mapped[Optional["Workstation"]] = relationship(
        "Workstation", back_populates="user_assignments"
    )


# ---------------------------------------------------------------------------
# Fiche
# ---------------------------------------------------------------------------


class Fiche(Base):
    __tablename__ = "fiches"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, index=True)
    title: Mapped[str] = mapped_column(String(500), nullable=False, index=True)
    type: Mapped[FicheType] = mapped_column(
        Enum(FicheType, native_enum=False), nullable=False
    )
    # JSON stored as TEXT: {description, steps[], tags[], equipment, safety_notes}
    content: Mapped[str] = mapped_column(Text, nullable=False, default="{}")
    author_id: Mapped[int] = mapped_column(
        Integer, ForeignKey("users.id"), nullable=False, index=True
    )
    status: Mapped[FicheStatus] = mapped_column(
        Enum(FicheStatus, native_enum=False),
        nullable=False,
        default=FicheStatus.draft,
        index=True,
    )
    version: Mapped[int] = mapped_column(Integer, nullable=False, default=1)
    review_comment: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    reviewed_by: Mapped[Optional[int]] = mapped_column(
        Integer, ForeignKey("users.id"), nullable=True
    )
    validated_at: Mapped[Optional[datetime]] = mapped_column(
        DateTime(timezone=True), nullable=True
    )
    published_at: Mapped[Optional[datetime]] = mapped_column(
        DateTime(timezone=True), nullable=True
    )
    review_due_date: Mapped[Optional[datetime]] = mapped_column(
        DateTime(timezone=True), nullable=True
    )
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), nullable=False
    )
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        server_default=func.now(),
        onupdate=func.now(),
        nullable=False,
    )
    # Département et poste de travail associés (nullable pour compatibilité ascendante)
    department_id: Mapped[Optional[int]] = mapped_column(
        Integer, ForeignKey("departments.id"), nullable=True, index=True
    )
    workstation_id: Mapped[Optional[int]] = mapped_column(
        Integer, ForeignKey("workstations.id"), nullable=True
    )

    # Relationships
    author: Mapped["User"] = relationship(
        "User", foreign_keys=[author_id], back_populates="authored_fiches"
    )
    reviewer: Mapped[Optional["User"]] = relationship(
        "User", foreign_keys=[reviewed_by], back_populates="reviewed_fiches"
    )
    versions: Mapped[list["FicheVersion"]] = relationship(
        "FicheVersion", back_populates="fiche", cascade="all, delete-orphan"
    )
    attachments: Mapped[list["Attachment"]] = relationship(
        "Attachment", back_populates="fiche", cascade="all, delete-orphan"
    )
    department: Mapped[Optional["Department"]] = relationship(
        "Department", back_populates="fiches"
    )
    workstation: Mapped[Optional["Workstation"]] = relationship(
        "Workstation", foreign_keys=[workstation_id]
    )


# ---------------------------------------------------------------------------
# FicheVersion
# ---------------------------------------------------------------------------


class FicheVersion(Base):
    __tablename__ = "fiche_versions"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, index=True)
    fiche_id: Mapped[int] = mapped_column(
        Integer, ForeignKey("fiches.id"), nullable=False, index=True
    )
    version_number: Mapped[int] = mapped_column(Integer, nullable=False)
    title: Mapped[Optional[str]] = mapped_column(String(500), nullable=True)
    content: Mapped[str] = mapped_column(Text, nullable=False)
    changed_by: Mapped[int] = mapped_column(
        Integer, ForeignKey("users.id"), nullable=False
    )
    status: Mapped[VersionStatus] = mapped_column(
        Enum(VersionStatus, native_enum=False),
        nullable=False,
        default=VersionStatus.active,
        index=True,
    )
    improvement_reason: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    change_reason: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    parent_version_id: Mapped[Optional[int]] = mapped_column(
        Integer, ForeignKey("fiche_versions.id"), nullable=True
    )
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), nullable=False
    )
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        server_default=func.now(),
        onupdate=func.now(),
        nullable=False,
    )

    # Relationships
    fiche: Mapped["Fiche"] = relationship("Fiche", back_populates="versions")
    changed_by_user: Mapped["User"] = relationship(
        "User", back_populates="fiche_versions"
    )
    parent_version: Mapped[Optional["FicheVersion"]] = relationship(
        "FicheVersion", remote_side=[id], foreign_keys=[parent_version_id]
    )
    reviews: Mapped[list["VersionReview"]] = relationship(
        "VersionReview", back_populates="version", cascade="all, delete-orphan", order_by="VersionReview.created_at.desc()"
    )


# ---------------------------------------------------------------------------
# VersionReview
# ---------------------------------------------------------------------------


class VersionReview(Base):
    __tablename__ = "version_reviews"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, index=True)
    version_id: Mapped[int] = mapped_column(
        Integer, ForeignKey("fiche_versions.id"), nullable=False, index=True
    )
    reviewer_id: Mapped[int] = mapped_column(
        Integer, ForeignKey("users.id"), nullable=False
    )
    decision: Mapped[ReviewDecision] = mapped_column(
        Enum(ReviewDecision, native_enum=False), nullable=False
    )
    comment: Mapped[str] = mapped_column(Text, nullable=False, default="")
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), nullable=False
    )

    # Relationships
    version: Mapped["FicheVersion"] = relationship("FicheVersion", back_populates="reviews")
    reviewer: Mapped["User"] = relationship("User")


# ---------------------------------------------------------------------------
# Attachment
# ---------------------------------------------------------------------------


class Attachment(Base):
    __tablename__ = "attachments"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, index=True)
    fiche_id: Mapped[int] = mapped_column(
        Integer, ForeignKey("fiches.id"), nullable=False, index=True
    )
    filename: Mapped[str] = mapped_column(String(500), nullable=False)
    file_path: Mapped[str] = mapped_column(String(1000), nullable=False)
    file_type: Mapped[str] = mapped_column(String(100), nullable=False)
    uploaded_by: Mapped[int] = mapped_column(
        Integer, ForeignKey("users.id"), nullable=False
    )
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), nullable=False
    )

    # Relationships
    fiche: Mapped["Fiche"] = relationship("Fiche", back_populates="attachments")
    uploader: Mapped["User"] = relationship("User", back_populates="attachments")
