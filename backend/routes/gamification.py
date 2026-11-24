"""
routes/gamification.py — Gamification API endpoints for KnowFact.

Prefix: /api/gamification
"""
from __future__ import annotations

from datetime import datetime, timezone, timedelta
from typing import Optional

from fastapi import APIRouter, Depends, HTTPException, Query, status
from pydantic import BaseModel
from sqlalchemy import func
from sqlalchemy.orm import Session

from gamification import award_points, compute_level, BADGE_DEFINITIONS, LEVELS, check_top_contributor_badges_global
from models import (
    UserPoints, PointsTransaction, UserBadge, PointConfig,
    GamificationNotification, User, UserRole, Fiche, FicheStatus, FicheType,
)
from auth import get_current_active_user, require_roles
from database import get_db

router = APIRouter(prefix="/api/gamification", tags=["gamification"])


# ---------------------------------------------------------------------------
# Helpers
# ---------------------------------------------------------------------------

def _badge_def(badge_id: str) -> dict:
    return next((b for b in BADGE_DEFINITIONS if b["id"] == badge_id), {})


def _tx_to_dict(tx: PointsTransaction) -> dict:
    return {
        "id": tx.id,
        "action": tx.action,
        "points": tx.points,
        "reason": tx.reason,
        "reference_id": tx.reference_id,
        "reference_type": tx.reference_type,
        "created_at": tx.created_at,
    }


def _user_initials(full_name: str) -> str:
    parts = (full_name or "").split()
    if len(parts) >= 2:
        return (parts[0][0] + parts[-1][0]).upper()
    if parts:
        return parts[0][:2].upper()
    return "??"


def _get_user_stats(user_id: int, db: Session) -> dict:
    published = (
        db.query(Fiche)
        .filter(Fiche.author_id == user_id, Fiche.status == FicheStatus.published)
        .all()
    )
    solutions_shared = sum(1 for f in published if f.type == FicheType.problem_solution)
    procedures_created = sum(1 for f in published if f.type == FicheType.procedure)
    tasks_contributed = sum(1 for f in published if f.type == FicheType.task_post)
    helpful_contributions = (
        db.query(PointsTransaction)
        .filter(
            PointsTransaction.user_id == user_id,
            PointsTransaction.action.in_([
                "provide_useful_answer",
                "receive_positive_evaluation",
                "improvement_validated",
                "solution_approved_by_expert",
            ]),
        )
        .count()
    )
    total_contributions = len(published) + helpful_contributions
    return {
        "solutions_shared": solutions_shared,
        "procedures_created": procedures_created,
        "tasks_contributed": tasks_contributed,
        "helpful_contributions": helpful_contributions,
        "total_contributions": total_contributions,
    }


# ---------------------------------------------------------------------------
# GET /me
# ---------------------------------------------------------------------------

@router.get("/me")
def get_my_gamification(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user),
):
    """Current user's full gamification profile."""
    user_pts = db.query(UserPoints).filter(UserPoints.user_id == current_user.id).first()
    total_points = user_pts.total_points if user_pts else 0

    level_info = compute_level(total_points)

    # Badges
    earned = db.query(UserBadge).filter(UserBadge.user_id == current_user.id).all()
    badges = []
    for ub in earned:
        bd = _badge_def(ub.badge_id)
        badges.append({
            "badge_id": ub.badge_id,
            "name": bd.get("name", ub.badge_id),
            "description": bd.get("description", ""),
            "icon": bd.get("icon", "🏅"),
            "color": bd.get("color", "#6b7280"),
            "earned_at": ub.earned_at,
        })

    # Recent transactions (last 5)
    recent_txs = (
        db.query(PointsTransaction)
        .filter(PointsTransaction.user_id == current_user.id)
        .order_by(PointsTransaction.created_at.desc())
        .limit(5)
        .all()
    )

    stats = _get_user_stats(current_user.id, db)

    return {
        "user_id": current_user.id,
        "total_points": total_points,
        "level": level_info["level"],
        "level_name": level_info["level_name"],
        "level_icon": level_info["level_icon"],
        "progress_pct": level_info["progress_pct"],
        "points_to_next": level_info["points_to_next"],
        "next_level_name": level_info["next_level_name"],
        **stats,
        "badges": badges,
        "recent_transactions": [_tx_to_dict(tx) for tx in recent_txs],
    }


# ---------------------------------------------------------------------------
# GET /me/transactions
# ---------------------------------------------------------------------------

@router.get("/me/transactions")
def get_my_transactions(
    page: int = Query(1, ge=1),
    limit: int = Query(20, ge=1, le=100),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user),
):
    """Paginated points history for current user."""
    offset = (page - 1) * limit
    total = db.query(PointsTransaction).filter(PointsTransaction.user_id == current_user.id).count()
    txs = (
        db.query(PointsTransaction)
        .filter(PointsTransaction.user_id == current_user.id)
        .order_by(PointsTransaction.created_at.desc())
        .offset(offset)
        .limit(limit)
        .all()
    )
    return {
        "total": total,
        "page": page,
        "limit": limit,
        "transactions": [_tx_to_dict(tx) for tx in txs],
    }


# ---------------------------------------------------------------------------
# GET /me/notifications
# ---------------------------------------------------------------------------

@router.get("/me/notifications")
def get_my_notifications(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user),
):
    """Unread notification count + last 20 notifications."""
    unread_count = (
        db.query(GamificationNotification)
        .filter(
            GamificationNotification.user_id == current_user.id,
            GamificationNotification.is_read == False,
        )
        .count()
    )
    notifs = (
        db.query(GamificationNotification)
        .filter(GamificationNotification.user_id == current_user.id)
        .order_by(GamificationNotification.created_at.desc())
        .limit(20)
        .all()
    )
    return {
        "unread_count": unread_count,
        "notifications": [
            {
                "id": n.id,
                "type": n.type,
                "message": n.message,
                "reference_id": n.reference_id,
                "is_read": n.is_read,
                "created_at": n.created_at,
            }
            for n in notifs
        ],
    }


# ---------------------------------------------------------------------------
# POST /me/notifications/read
# ---------------------------------------------------------------------------

@router.post("/me/notifications/read")
def mark_notifications_read(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user),
):
    """Mark all current user's notifications as read."""
    db.query(GamificationNotification).filter(
        GamificationNotification.user_id == current_user.id,
        GamificationNotification.is_read == False,
    ).update({"is_read": True})
    db.commit()
    return {"detail": "All notifications marked as read."}


# ---------------------------------------------------------------------------
# GET /leaderboard
# ---------------------------------------------------------------------------

@router.get("/leaderboard")
def get_leaderboard(
    period: str = Query("all", pattern="^(all|weekly|monthly)$"),
    role: Optional[str] = Query(None),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user),
):
    """Top 50 leaderboard. period=all|weekly|monthly, optional role filter."""
    if period == "all":
        # Join user_points with users
        q = (
            db.query(UserPoints, User)
            .join(User, UserPoints.user_id == User.id)
            .filter(User.is_active == True)
        )
        if role and role != "all":
            q = q.filter(User.role == role)
            
        rows = q.order_by(UserPoints.total_points.desc()).limit(50).all()
        entries = []
        for idx, (up, user) in enumerate(rows, 1):
            li = compute_level(up.total_points)
            badge_count = db.query(UserBadge).filter(UserBadge.user_id == user.id).count()
            entries.append({
                "rank": idx,
                "user_id": user.id,
                "full_name": user.full_name,
                "role": user.role.value if hasattr(user.role, "value") else str(user.role),
                "level": li["level"],
                "level_name": li["level_name"],
                "level_icon": li["level_icon"],
                "total_points": up.total_points,
                "badges_count": badge_count,
                "initials": _user_initials(user.full_name),
            })

        # Current user rank
        current_user_rank = next(
            (e["rank"] for e in entries if e["user_id"] == current_user.id), None
        )
        if current_user_rank is None:
            user_pts_row = db.query(UserPoints).filter(UserPoints.user_id == current_user.id).first()
            if user_pts_row:
                rank_q = db.query(UserPoints).join(User, UserPoints.user_id == User.id).filter(
                    User.is_active == True,
                    UserPoints.total_points > user_pts_row.total_points,
                )
                if role and role != "all":
                    rank_q = rank_q.filter(User.role == role)
                rank_above = rank_q.count()
                current_user_rank = rank_above + 1
            else:
                current_user_rank = None

    else:
        # Weekly / monthly: sum transactions in period
        now = datetime.now(timezone.utc)
        if period == "weekly":
            since = now - timedelta(days=7)
        else:
            since = now - timedelta(days=30)

        subq = (
            db.query(
                PointsTransaction.user_id,
                func.sum(PointsTransaction.points).label("period_points"),
            )
            .filter(PointsTransaction.created_at >= since)
            .group_by(PointsTransaction.user_id)
            .subquery()
        )

        q = (
            db.query(subq.c.user_id, subq.c.period_points, User, UserPoints)
            .join(User, subq.c.user_id == User.id)
            .outerjoin(UserPoints, subq.c.user_id == UserPoints.user_id)
            .filter(User.is_active == True)
        )
        if role and role != "all":
            q = q.filter(User.role == role)

        rows = q.order_by(subq.c.period_points.desc()).limit(50).all()

        entries = []
        for idx, (uid, period_points, user, up) in enumerate(rows, 1):
            total = up.total_points if up else 0
            li = compute_level(total)
            badge_count = db.query(UserBadge).filter(UserBadge.user_id == uid).count()
            entries.append({
                "rank": idx,
                "user_id": uid,
                "full_name": user.full_name,
                "role": user.role.value if hasattr(user.role, "value") else str(user.role),
                "level": li["level"],
                "level_name": li["level_name"],
                "level_icon": li["level_icon"],
                "total_points": period_points or 0,
                "badges_count": badge_count,
                "initials": _user_initials(user.full_name),
            })

        current_user_rank = next(
            (e["rank"] for e in entries if e["user_id"] == current_user.id), None
        )

    return {"period": period, "role": role or "all", "current_user_rank": current_user_rank, "leaderboard": entries}


# ---------------------------------------------------------------------------
# GET /users/{user_id}/profile
# ---------------------------------------------------------------------------

@router.get("/users/{user_id}/profile")
def get_user_profile(
    user_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user),
):
    """Public gamification profile for any user."""
    user = db.get(User, user_id)
    if not user or not user.is_active:
        raise HTTPException(status_code=404, detail="User not found.")

    user_pts = db.query(UserPoints).filter(UserPoints.user_id == user_id).first()
    total_points = user_pts.total_points if user_pts else 0
    level_info = compute_level(total_points)

    earned = db.query(UserBadge).filter(UserBadge.user_id == user_id).all()
    badges = []
    for ub in earned:
        bd = _badge_def(ub.badge_id)
        badges.append({
            "badge_id": ub.badge_id,
            "name": bd.get("name", ub.badge_id),
            "description": bd.get("description", ""),
            "icon": bd.get("icon", "🏅"),
            "color": bd.get("color", "#6b7280"),
            "earned_at": ub.earned_at,
        })

    stats = _get_user_stats(user_id, db)

    # Leaderboard rank
    rank_above = (
        db.query(UserPoints)
        .filter(UserPoints.total_points > total_points)
        .count()
    )
    leaderboard_rank = rank_above + 1 if total_points > 0 else None

    return {
        "user_id": user.id,
        "full_name": user.full_name,
        "role": user.role.value if hasattr(user.role, "value") else str(user.role),
        "initials": _user_initials(user.full_name),
        "total_points": total_points,
        "level": level_info["level"],
        "level_name": level_info["level_name"],
        "level_icon": level_info["level_icon"],
        "progress_pct": level_info["progress_pct"],
        "points_to_next": level_info["points_to_next"],
        "next_level_name": level_info["next_level_name"],
        "leaderboard_rank": leaderboard_rank,
        **stats,
        "badges": badges,
    }


# ---------------------------------------------------------------------------
# GET /config  (admin)
# ---------------------------------------------------------------------------

@router.get("/config")
def list_point_configs(
    db: Session = Depends(get_db),
    current_user: User = Depends(require_roles(UserRole.admin)),
):
    """Admin: list all point configurations."""
    configs = db.query(PointConfig).order_by(PointConfig.action_key).all()
    return [
        {
            "id": c.id,
            "action_key": c.action_key,
            "points": c.points,
            "label": c.label,
            "description": c.description,
            "is_active": c.is_active,
            "updated_at": c.updated_at,
        }
        for c in configs
    ]


# ---------------------------------------------------------------------------
# PUT /config/{action_key}  (admin)
# ---------------------------------------------------------------------------

class PointConfigUpdate(BaseModel):
    points: int
    label: Optional[str] = None
    description: Optional[str] = None
    is_active: Optional[bool] = None


@router.put("/config/{action_key}")
def update_point_config(
    action_key: str,
    payload: PointConfigUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_roles(UserRole.admin)),
):
    """Admin: update point value for an action key."""
    cfg = db.query(PointConfig).filter(PointConfig.action_key == action_key).first()
    if not cfg:
        raise HTTPException(status_code=404, detail=f"No config found for action_key='{action_key}'.")

    cfg.points = payload.points
    if payload.label is not None:
        cfg.label = payload.label
    if payload.description is not None:
        cfg.description = payload.description
    if payload.is_active is not None:
        cfg.is_active = payload.is_active
    cfg.updated_at = datetime.now(timezone.utc)
    cfg.updated_by_id = current_user.id
    db.commit()
    db.refresh(cfg)
    return {
        "id": cfg.id,
        "action_key": cfg.action_key,
        "points": cfg.points,
        "label": cfg.label,
        "description": cfg.description,
        "is_active": cfg.is_active,
        "updated_at": cfg.updated_at,
    }


# ---------------------------------------------------------------------------
# GET /admin/stats
# ---------------------------------------------------------------------------

@router.get("/admin/stats")
def get_admin_stats(
    db: Session = Depends(get_db),
    current_user: User = Depends(require_roles(UserRole.admin)),
):
    """Admin: global gamification stats."""
    total_users_with_points = db.query(UserPoints).count()
    total_points_awarded = db.query(func.sum(PointsTransaction.points)).scalar() or 0
    total_transactions = db.query(PointsTransaction).count()
    avg_points_per_user = (
        round(total_points_awarded / total_users_with_points, 2)
        if total_users_with_points > 0 else 0
    )

    # Top 5 earners
    top5_rows = (
        db.query(UserPoints, User)
        .join(User, UserPoints.user_id == User.id)
        .order_by(UserPoints.total_points.desc())
        .limit(5)
        .all()
    )
    top_earners = [
        {
            "rank": idx,
            "user_id": user.id,
            "full_name": user.full_name,
            "role": user.role.value if hasattr(user.role, "value") else str(user.role),
            "total_points": up.total_points,
            "level": up.level,
            "initials": _user_initials(user.full_name),
        }
        for idx, (up, user) in enumerate(top5_rows, 1)
    ]

    # Last 10 transactions
    recent_txs = (
        db.query(PointsTransaction)
        .order_by(PointsTransaction.created_at.desc())
        .limit(10)
        .all()
    )

    # Suspicious: > 5 transactions in the last hour with the same action, per user
    one_hour_ago = datetime.now(timezone.utc) - timedelta(hours=1)
    suspicious_subq = (
        db.query(
            PointsTransaction.user_id,
            PointsTransaction.action,
            func.count(PointsTransaction.id).label("tx_count"),
        )
        .filter(PointsTransaction.created_at >= one_hour_ago)
        .group_by(PointsTransaction.user_id, PointsTransaction.action)
        .having(func.count(PointsTransaction.id) > 5)
        .all()
    )
    suspicious_user_ids = {row.user_id for row in suspicious_subq}
    suspicious_users = []
    for uid in suspicious_user_ids:
        user = db.get(User, uid)
        if user:
            suspicious_users.append({
                "user_id": uid,
                "full_name": user.full_name,
                "flagged_actions": [
                    {"action": row.action, "count": row.tx_count}
                    for row in suspicious_subq
                    if row.user_id == uid
                ],
            })

    return {
        "total_users_with_points": total_users_with_points,
        "total_points_awarded": total_points_awarded,
        "total_transactions": total_transactions,
        "avg_points_per_user": avg_points_per_user,
        "top_earners": top_earners,
        "recent_transactions": [_tx_to_dict(tx) for tx in recent_txs],
        "suspicious_users": suspicious_users,
    }


# ---------------------------------------------------------------------------
# GET /admin/transactions
# ---------------------------------------------------------------------------

@router.get("/admin/transactions")
def get_admin_transactions(
    user_id: Optional[int] = Query(None),
    page: int = Query(1, ge=1),
    limit: int = Query(50, ge=1, le=200),
    db: Session = Depends(get_db),
    current_user: User = Depends(require_roles(UserRole.admin)),
):
    """Admin: all transactions with optional user_id filter."""
    q = db.query(PointsTransaction)
    if user_id is not None:
        q = q.filter(PointsTransaction.user_id == user_id)
    total = q.count()
    txs = q.order_by(PointsTransaction.created_at.desc()).offset((page - 1) * limit).limit(limit).all()
    return {
        "total": total,
        "page": page,
        "limit": limit,
        "transactions": [_tx_to_dict(tx) for tx in txs],
    }


# ---------------------------------------------------------------------------
# POST /admin/adjust
# ---------------------------------------------------------------------------

class AdminAdjustPayload(BaseModel):
    user_id: int
    points: int
    reason: str


@router.post("/admin/adjust")
def admin_adjust_points(
    payload: AdminAdjustPayload,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_roles(UserRole.admin)),
):
    """Admin: manually award or deduct points with a reason."""
    target_user = db.get(User, payload.user_id)
    if not target_user:
        raise HTTPException(status_code=404, detail="User not found.")

    result = award_points(
        user_id=payload.user_id,
        action="admin_adjustment",
        db=db,
        override_points=payload.points,
        reason=payload.reason,
        awarded_by_id=current_user.id,
    )
    db.commit()

    # Re-evaluate top-contributor badges globally after a manual adjustment
    check_top_contributor_badges_global(db)
    db.commit()

    return {
        "detail": "Points adjusted successfully.",
        "transaction": result,
    }
