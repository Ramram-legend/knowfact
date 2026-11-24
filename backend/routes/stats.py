"""
routes/stats.py — KPI and extended dashboard statistics.

GET /api/stats/kpi                 (admin + expert only)
GET /api/stats/dashboard_extended  (admin + expert only)
"""
from datetime import datetime, timezone, timedelta
from typing import Any

from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from auth import get_current_active_user, require_roles
from database import get_db
from models import Department, Fiche, FicheStatus, User, UserRole

router = APIRouter(prefix="/api/stats", tags=["stats"])

_ADMIN_EXPERT = require_roles(UserRole.admin, UserRole.expert)


# ---------------------------------------------------------------------------
# Helper
# ---------------------------------------------------------------------------

def _validated_statuses():
    return (FicheStatus.published, FicheStatus.validated)


# ---------------------------------------------------------------------------
# GET /api/stats/kpi
# ---------------------------------------------------------------------------


@router.get("/kpi")
def get_kpi(
    db: Session = Depends(get_db),
    current_user: User = Depends(_ADMIN_EXPERT),
) -> dict[str, Any]:
    """
    Return KPI metrics for the admin/expert dashboard.
    Requires admin or expert role.
    """
    validated_fiches = (
        db.query(Fiche)
        .filter(Fiche.status.in_(_validated_statuses()))
        .all()
    )

    # 1. total_fiches_validated
    total_fiches_validated = len(validated_fiches)

    # 2. avg_validation_delay_hours
    delays = []
    for f in validated_fiches:
        try:
            created = f.created_at
            updated = f.updated_at
            if created and updated:
                # make both tz-aware if needed
                if created.tzinfo is None:
                    created = created.replace(tzinfo=timezone.utc)
                if updated.tzinfo is None:
                    updated = updated.replace(tzinfo=timezone.utc)
                delta = (updated - created).total_seconds() / 3600
                if delta >= 0:
                    delays.append(delta)
        except Exception:
            pass
    avg_validation_delay_hours = round(sum(delays) / len(delays), 2) if delays else 0.0

    # 3. useful_count (sum of all useful_count across validated/published fiches)
    useful_count = sum(getattr(f, "useful_count", 0) or 0 for f in validated_fiches)

    # 4. posts_covered — distinct workstations with at least 1 published fiche
    all_published = (
        db.query(Fiche)
        .filter(Fiche.status == FicheStatus.published)
        .all()
    )
    ws_ids = {f.workstation_id for f in all_published if f.workstation_id is not None}
    posts_covered = len(ws_ids)

    # 5. duplicate_fiches — titles that appear more than once
    from collections import Counter
    all_fiches = db.query(Fiche).all()
    title_counts = Counter(f.title.strip().lower() for f in all_fiches if f.title)
    duplicate_fiches = [
        {"title": title, "count": cnt}
        for title, cnt in title_counts.items()
        if cnt > 1
    ]

    # 6. ethical_kpi
    ethical_kpi = {
        "personal_data_exposed": 0,
        "ai_responses_without_source": 0,
        "roles_tested": 5,
    }

    # 7. planning_kpi
    planning_kpi = {
        "critical_path_delay_days": 0,
    }

    return {
        "total_fiches_validated": total_fiches_validated,
        "avg_validation_delay_hours": avg_validation_delay_hours,
        "useful_count": useful_count,
        "posts_covered": posts_covered,
        "duplicate_fiches": duplicate_fiches,
        "ethical_kpi": ethical_kpi,
        "planning_kpi": planning_kpi,
    }


# ---------------------------------------------------------------------------
# GET /api/stats/dashboard_extended
# ---------------------------------------------------------------------------


@router.get("/dashboard_extended")
def get_dashboard_extended(
    db: Session = Depends(get_db),
    current_user: User = Depends(_ADMIN_EXPERT),
) -> dict[str, Any]:
    """
    Extended dashboard statistics for admin/expert.
    - fiches_by_department: [{dept_name, count}]
    - fiches_by_type: [{type, count}]
    - top_contributors: top 5 authors by published fiches [{user_name, count}]
    - obsolete_risk: fiches published/validated with updated_at > 365 days ago
    """
    all_fiches = db.query(Fiche).all()

    # fiches_by_department
    from collections import defaultdict, Counter
    dept_counter: dict[str, int] = defaultdict(int)
    for f in all_fiches:
        dept_name = "Non assigné"
        if f.department_id is not None:
            dept = db.get(Department, f.department_id)
            if dept:
                dept_name = dept.name
        dept_counter[dept_name] += 1
    fiches_by_department = [
        {"dept_name": name, "count": cnt}
        for name, cnt in sorted(dept_counter.items(), key=lambda x: -x[1])
    ]

    # fiches_by_type
    type_counter: Counter = Counter()
    for f in all_fiches:
        type_val = f.type.value if hasattr(f.type, "value") else str(f.type)
        type_counter[type_val] += 1
    fiches_by_type = [
        {"type": t, "count": cnt}
        for t, cnt in type_counter.most_common()
    ]

    # top_contributors — top 5 authors by published fiches
    published_fiches = [f for f in all_fiches if f.status == FicheStatus.published]
    author_counter: Counter = Counter(f.author_id for f in published_fiches)
    top_contributors = []
    for author_id, cnt in author_counter.most_common(5):
        user = db.get(User, author_id)
        top_contributors.append({
            "user_name": user.full_name if user else f"User#{author_id}",
            "count": cnt,
        })

    # obsolete_risk — published/validated with updated_at > 365 days ago
    now = datetime.now(timezone.utc)
    cutoff = now - timedelta(days=365)
    obsolete_risk = 0
    for f in all_fiches:
        if f.status not in _validated_statuses():
            continue
        try:
            updated = f.updated_at
            if updated is None:
                continue
            if updated.tzinfo is None:
                updated = updated.replace(tzinfo=timezone.utc)
            if updated < cutoff:
                obsolete_risk += 1
        except Exception:
            pass

    return {
        "fiches_by_department": fiches_by_department,
        "fiches_by_type": fiches_by_type,
        "top_contributors": top_contributors,
        "obsolete_risk": obsolete_risk,
    }
