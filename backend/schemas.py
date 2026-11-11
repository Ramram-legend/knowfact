"""
schemas.py — Pydantic v2 schemas for request / response validation.
"""
import json
from datetime import datetime
from typing import Any, Optional

from pydantic import BaseModel, ConfigDict, EmailStr, field_validator, model_validator

from models import FicheStatus, FicheType, ReviewDecision, UserRole, VersionStatus


# ---------------------------------------------------------------------------
# Helpers
# ---------------------------------------------------------------------------


class OrmBase(BaseModel):
    model_config = ConfigDict(from_attributes=True)


# ---------------------------------------------------------------------------
# Content schema (JSON stored inside Fiche.content TEXT field)
# ---------------------------------------------------------------------------


class StepSchema(BaseModel):
    order: int
    content: str

class FicheContent(BaseModel):
    description: str = ""
    steps: list[StepSchema] = []
    tags: list[str] = []
    equipment: str = ""
    safety_notes: str = ""


# ---------------------------------------------------------------------------
# User schemas
# ---------------------------------------------------------------------------


class UserCreate(BaseModel):
    email: EmailStr
    password: str
    full_name: str
    role: UserRole = UserRole.engineer


class UserLogin(BaseModel):
    email: EmailStr
    password: str


class UserOut(OrmBase):
    id: int
    email: str
    full_name: str
    role: UserRole
    is_active: bool
    created_at: datetime
    primary_department_id: Optional[int] = None
    primary_workstation_id: Optional[int] = None


class UserRoleUpdate(BaseModel):
    role: UserRole


# ---------------------------------------------------------------------------
# Token schemas
# ---------------------------------------------------------------------------


class Token(BaseModel):
    access_token: str
    access: Optional[str] = None
    refresh: Optional[str] = None
    token_type: str = "bearer"
    user: Optional[UserOut] = None


class TokenData(BaseModel):
    user_id: Optional[int] = None


# ---------------------------------------------------------------------------
# Fiche schemas
# ---------------------------------------------------------------------------


class FicheCreate(BaseModel):
    title: str
    type: FicheType
    content: FicheContent
    review_due_date: Optional[datetime] = None
    department_id: Optional[int] = None
    workstation_id: Optional[int] = None


class FicheUpdate(BaseModel):
    title: Optional[str] = None
    type: Optional[FicheType] = None
    content: Optional[FicheContent] = None
    review_due_date: Optional[datetime] = None
    change_reason: Optional[str] = None


class ReviewAction(BaseModel):
    action: str  # 'validate' | 'reject' | 'request_correction'
    comment: str = ""

    @field_validator("action")
    @classmethod
    def validate_action(cls, v: str) -> str:
        allowed = {"validate", "reject", "request_correction"}
        if v not in allowed:
            raise ValueError(f"action must be one of {allowed}")
        return v


class NewVersionRequest(BaseModel):
    change_reason: str = "New version"


class AttachmentOut(OrmBase):
    id: int
    fiche_id: int
    filename: str
    file_path: str
    file_type: str
    uploaded_by: int
    created_at: datetime


class VersionReviewOut(OrmBase):
    id: int
    version_id: int
    reviewer_id: int
    decision: ReviewDecision
    comment: str
    created_at: datetime
    reviewer: Optional[UserOut] = None
    reviewer_name: str = ""

    @model_validator(mode="after")
    def populate_reviewer_name(self) -> "VersionReviewOut":
        if self.reviewer:
            self.reviewer_name = self.reviewer.full_name
        return self


class FicheVersionOut(OrmBase):
    id: int
    fiche_id: int
    version_number: int
    title: Optional[str] = None
    content: Any
    changed_by: int
    status: VersionStatus = VersionStatus.active
    improvement_reason: Optional[str] = None
    change_reason: Optional[str] = None
    parent_version_id: Optional[int] = None
    created_at: datetime
    updated_at: Optional[datetime] = None
    changed_by_user: Optional[UserOut] = None
    author_name: str = ""
    reviews: list[VersionReviewOut] = []

    @model_validator(mode="after")
    def parse_content(self) -> "FicheVersionOut":
        if isinstance(self.content, str):
            try:
                self.content = json.loads(self.content)
            except (json.JSONDecodeError, TypeError):
                pass
        if self.changed_by_user:
            self.author_name = self.changed_by_user.full_name
        return self


class FicheOut(OrmBase):
    id: int
    title: str
    type: FicheType
    content: Any
    author_id: int
    status: FicheStatus
    version: int
    review_comment: Optional[str]
    reviewed_by: Optional[int]
    validated_at: Optional[datetime]
    published_at: Optional[datetime]
    review_due_date: Optional[datetime]
    created_at: datetime
    updated_at: datetime
    department_id: Optional[int] = None
    workstation_id: Optional[int] = None
    author: Optional[UserOut] = None
    versions: list[FicheVersionOut] = []
    attachments: list[AttachmentOut] = []
    # Convenience fields for frontend
    author_name: str = ""
    reviewer_name: Optional[str] = None
    has_pending_improvement: bool = False
    pending_improvement_id: Optional[int] = None

    @model_validator(mode="after")
    def parse_content_and_names(self) -> "FicheOut":
        if isinstance(self.content, str):
            try:
                self.content = json.loads(self.content)
            except (json.JSONDecodeError, TypeError):
                pass
        if self.author:
            self.author_name = self.author.full_name
        return self


class FicheListOut(OrmBase):
    """Lighter schema used in list endpoints — no versions or attachments."""

    id: int
    title: str
    type: FicheType
    content: Any
    author_id: int
    status: FicheStatus
    version: int
    review_comment: Optional[str]
    reviewed_by: Optional[int]
    validated_at: Optional[datetime]
    published_at: Optional[datetime]
    review_due_date: Optional[datetime]
    created_at: datetime
    updated_at: datetime
    department_id: Optional[int] = None
    workstation_id: Optional[int] = None
    author: Optional[UserOut] = None
    author_name: str = ""
    reviewer_name: Optional[str] = None

    @model_validator(mode="after")
    def parse_content_and_names(self) -> "FicheListOut":
        if isinstance(self.content, str):
            try:
                self.content = json.loads(self.content)
            except (json.JSONDecodeError, TypeError):
                pass
        if self.author:
            self.author_name = self.author.full_name
        return self


# ---------------------------------------------------------------------------
# Search schemas
# ---------------------------------------------------------------------------


class PaginatedFiches(BaseModel):
    count: int
    next: Optional[str] = None
    previous: Optional[str] = None
    results: list[FicheListOut]


class SearchResult(BaseModel):
    total: int
    results: list[FicheListOut]


# ---------------------------------------------------------------------------
# Dashboard stats
# ---------------------------------------------------------------------------


class DashboardStats(BaseModel):
    total_fiches: int
    published_fiches: int
    pending_review: int
    my_drafts: int
    recent_fiches: list[FicheListOut]


# ---------------------------------------------------------------------------
# Improvement schemas
# ---------------------------------------------------------------------------


class ImprovementProposalCreate(BaseModel):
    title: Optional[str] = None
    content: FicheContent
    improvement_reason: str = ""
    submit: bool = True  # True to submit for validation immediately, False for draft


class ImprovementProposalUpdate(BaseModel):
    title: Optional[str] = None
    content: Optional[FicheContent] = None
    improvement_reason: Optional[str] = None
    submit: Optional[bool] = None


class ImprovementReviewAction(BaseModel):
    action: str  # 'validate' | 'request_correction' | 'reject'
    comment: str = ""

    @field_validator("action")
    @classmethod
    def validate_action(cls, v: str) -> str:
        allowed = {"validate", "request_correction", "reject"}
        if v not in allowed:
            raise ValueError(f"action must be one of {allowed}")
        return v


class VersionDiffOut(BaseModel):
    version_id: int
    parent_version_id: Optional[int]
    fiche_id: int
    fiche_title: str
    proposed_title: str
    proposer_id: int
    proposer_name: str
    proposer_role: str
    improvement_reason: str
    status: VersionStatus
    created_at: datetime
    updated_at: datetime
    old_content: Any
    new_content: Any
    diff_summary: dict[str, Any]
    reviews: list[VersionReviewOut] = []


class ImprovementProposalOut(OrmBase):
    id: int
    fiche_id: int
    fiche_title: str
    version_number: int
    title: Optional[str] = None
    status: VersionStatus
    improvement_reason: Optional[str] = None
    changed_by: int
    author_name: str = ""
    created_at: datetime
    updated_at: datetime
    latest_review_comment: Optional[str] = None
    reviews: list[VersionReviewOut] = []


# ---------------------------------------------------------------------------
# Generic message
# ---------------------------------------------------------------------------


# ---------------------------------------------------------------------------
# Department / Workstation / UserDepartment schemas
# ---------------------------------------------------------------------------


class WorkstationOut(OrmBase):
    id: int
    department_id: int
    name: str
    code: Optional[str] = None
    description: Optional[str] = None
    is_active: bool
    display_order: int
    created_at: datetime


class WorkstationCreate(BaseModel):
    name: str
    code: Optional[str] = None
    description: Optional[str] = None
    display_order: int = 0


class WorkstationUpdate(BaseModel):
    name: Optional[str] = None
    code: Optional[str] = None
    description: Optional[str] = None
    is_active: Optional[bool] = None
    display_order: Optional[int] = None


class DepartmentOut(OrmBase):
    id: int
    name: str
    code: str
    description: Optional[str] = None
    color: str
    icon: str
    manager_id: Optional[int] = None
    is_active: bool
    display_order: int
    created_at: datetime
    manager: Optional[UserOut] = None
    workstations: list[WorkstationOut] = []
    member_count: int = 0


class DepartmentCreate(BaseModel):
    name: str
    code: str
    description: Optional[str] = None
    color: str = "#0d9488"
    icon: str = "Factory"
    manager_id: Optional[int] = None
    display_order: int = 0


class DepartmentUpdate(BaseModel):
    name: Optional[str] = None
    code: Optional[str] = None
    description: Optional[str] = None
    color: Optional[str] = None
    icon: Optional[str] = None
    manager_id: Optional[int] = None
    is_active: Optional[bool] = None
    display_order: Optional[int] = None


class UserDepartmentOut(OrmBase):
    id: int
    user_id: int
    department_id: int
    workstation_id: Optional[int] = None
    is_primary: bool
    created_at: datetime
    department: Optional[DepartmentOut] = None
    workstation: Optional[WorkstationOut] = None
    user: Optional[UserOut] = None


class UserDepartmentCreate(BaseModel):
    department_id: int
    workstation_id: Optional[int] = None
    is_primary: bool = False


class DepartmentMember(OrmBase):
    user_id: int
    user: Optional[UserOut] = None
    workstation: Optional[WorkstationOut] = None
    is_primary: bool
    full_name: str = ""
    role: str = ""

    @model_validator(mode="after")
    def populate_names(self) -> "DepartmentMember":
        if self.user:
            self.full_name = self.user.full_name
            self.role = self.user.role.value if hasattr(self.user.role, "value") else str(self.user.role)
        return self


class DepartmentDetail(OrmBase):
    id: int
    name: str
    code: str
    description: Optional[str] = None
    color: str
    icon: str
    manager_id: Optional[int] = None
    is_active: bool
    display_order: int
    created_at: datetime
    manager: Optional[UserOut] = None
    workstations: list[WorkstationOut] = []
    members: list[DepartmentMember] = []
    fiche_count: int = 0


# ---------------------------------------------------------------------------
# Generic message
# ---------------------------------------------------------------------------


class MessageOut(BaseModel):
    message: str
