"""
routes/search.py — Full-text search across fiches.

GET /api/search?q=keyword&type=...&status=...
"""
import json
from typing import Optional

from fastapi import APIRouter, Depends, Query
from sqlalchemy.orm import Session, joinedload

from auth import get_current_active_user
from database import get_db
from models import Fiche, FicheStatus, User
from schemas import FicheListOut, SearchResult

router = APIRouter(prefix="/api/search", tags=["search"])


def _can_see(fiche: Fiche, user: User) -> bool:
    """Visibility check (mirrors the one in fiches.py)."""
    from models import UserRole

    s = fiche.status
    role = user.role

    if s == FicheStatus.draft:
        return fiche.author_id == user.id or role == UserRole.admin

    if s in (FicheStatus.submitted, FicheStatus.under_review, FicheStatus.to_correct):
        return (
            fiche.author_id == user.id
            or role in (UserRole.expert, UserRole.admin)
        )

    if s in (FicheStatus.validated, FicheStatus.published):
        return True

    if s in (FicheStatus.rejected, FicheStatus.archived):
        return (
            fiche.author_id == user.id
            or role in (UserRole.expert, UserRole.admin)
        )

    return False


@router.get("/", response_model=SearchResult)
def search(
    q: Optional[str] = Query(None, description="Keyword to search in title and content"),
    type: Optional[str] = Query(None, description="Fiche type filter"),
    status: Optional[FicheStatus] = Query(None, description="Status filter"),
    department_id: Optional[int] = Query(None, description="Department filter"),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user),
):
    """
    Full-text search on fiche title and JSON content fields.
    Results are filtered by the current user's visibility rules.
    """
    query = db.query(Fiche).options(joinedload(Fiche.author))

    if type:
        query = query.filter(Fiche.type == type)

    if status:
        query = query.filter(Fiche.status == status)

    if department_id:
        query = query.filter(Fiche.department_id == department_id)

    fiches = query.order_by(Fiche.updated_at.desc()).all()

    # Apply visibility
    visible = [f for f in fiches if _can_see(f, current_user)]

    # Keyword search (SQLite does not support native FTS without an extension;
    # we perform Python-side substring matching on title + raw content JSON).
    if q and q.strip():
        keyword = q.strip().lower()

        def _matches(fiche: Fiche) -> bool:
            if keyword in fiche.title.lower():
                return True
            # Search inside the serialised JSON content
            try:
                content_dict = json.loads(fiche.content) if isinstance(fiche.content, str) else {}
                content_str = json.dumps(content_dict).lower()
                return keyword in content_str
            except (json.JSONDecodeError, TypeError):
                return False

        visible = [f for f in visible if _matches(f)]

    return SearchResult(total=len(visible), results=visible)
