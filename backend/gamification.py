"""
gamification.py — Core Gamification Engine for KnowFact.

This module handles:
  - Points award logic (backend-side, tamper-proof)
  - Duplicate-award prevention via transaction log
  - Level computation
  - Badge unlocking
  - Notification creation
  - Admin-configurable point values
"""
from __future__ import annotations

import enum
from datetime import datetime, timezone
from typing import Optional

from sqlalchemy.orm import Session

# ---------------------------------------------------------------------------
# Point values (defaults — overridden by PointConfig in DB)
# ---------------------------------------------------------------------------

DEFAULT_POINT_VALUES: dict[str, int] = {
    "publish_problem_solution": 20,
    "publish_procedure": 25,
    "publish_task_post": 15,
    "share_best_practice": 15,
    "provide_useful_answer": 10,
    "receive_positive_evaluation": 5,
    "solution_approved_by_expert": 10,
    "improvement_validated": 10,
    "admin_adjustment": 0,  # variable — stored in metadata
}

# ---------------------------------------------------------------------------
# Level thresholds
# ---------------------------------------------------------------------------

LEVELS = [
    (0,    1, "Beginner",             "🌱"),
    (100,  2, "Contributor",          "⭐"),
    (300,  3, "Skilled Technician",   "🔧"),
    (600,  4, "Professional Engineer","🏗️"),
    (1000, 5, "Technical Expert",     "💡"),
    (2000, 6, "Master Expert",        "🏆"),
]


def compute_level(total_points: int) -> dict:
    """Return level info for a given total_points."""
    current_level = LEVELS[0]
    for threshold, lvl, name, icon in LEVELS:
        if total_points >= threshold:
            current_level = (threshold, lvl, name, icon)

    idx = LEVELS.index(current_level)
    next_level = LEVELS[idx + 1] if idx + 1 < len(LEVELS) else None

    points_in_level = total_points - current_level[0]
    points_needed = (next_level[0] - current_level[0]) if next_level else 0
    progress_pct = int((points_in_level / points_needed * 100)) if points_needed > 0 else 100

    return {
        "level": current_level[1],
        "level_name": current_level[2],
        "level_icon": current_level[3],
        "points_in_level": points_in_level,
        "points_to_next": max(0, next_level[0] - total_points) if next_level else 0,
        "next_level_threshold": next_level[0] if next_level else None,
        "next_level_name": next_level[2] if next_level else None,
        "progress_pct": progress_pct,
        "is_max_level": next_level is None,
    }


# ---------------------------------------------------------------------------
# Badge definitions
# ---------------------------------------------------------------------------

BADGE_DEFINITIONS = [
    {
        "id": "first_contribution",
        "name": "First Contribution",
        "description": "Published your first contribution to the platform.",
        "icon": "🎯",
        "color": "#0d9488",
    },
    {
        "id": "problem_solver",
        "name": "Problem Solver",
        "description": "Published 10 technical solutions.",
        "icon": "🔑",
        "color": "#3b82f6",
    },
    {
        "id": "knowledge_sharer",
        "name": "Knowledge Sharer",
        "description": "Made 20 total contributions to the platform.",
        "icon": "📚",
        "color": "#8b5cf6",
    },
    {
        "id": "maintenance_specialist",
        "name": "Maintenance Specialist",
        "description": "Published 10 maintenance procedures.",
        "icon": "🔧",
        "color": "#f59e0b",
    },
    {
        "id": "active_expert",
        "name": "Active Expert",
        "description": "Made 50 helpful contributions.",
        "icon": "💡",
        "color": "#10b981",
    },
    {
        "id": "top_contributor",
        "name": "Top Contributor",
        "description": "Reached the Top 10 leaderboard.",
        "icon": "🏆",
        "color": "#ef4444",
    },
]


def get_config_value(action: str, db: Session) -> int:
    """Fetch the configured point value for an action, falling back to defaults."""
    from models import PointConfig
    cfg = db.query(PointConfig).filter(PointConfig.action_key == action).first()
    if cfg and cfg.is_active:
        return cfg.points
    return DEFAULT_POINT_VALUES.get(action, 0)


def award_points(
    user_id: int,
    action: str,
    db: Session,
    reference_id: Optional[int] = None,
    reference_type: Optional[str] = None,
    metadata: Optional[dict] = None,
    override_points: Optional[int] = None,
    awarded_by_id: Optional[int] = None,
    reason: Optional[str] = None,
) -> Optional[dict]:
    """
    Award points to a user for a given action.

    - Prevents duplicate awards for the same (user_id, action, reference_id).
    - Updates UserPoints total and level.
    - Checks for new badge unlocks.
    - Creates a notification.

    Returns the created transaction dict, or None if duplicate.
    """
    from models import PointsTransaction, UserPoints, GamificationNotification

    points = override_points if override_points is not None else get_config_value(action, db)

    # Duplicate prevention (skip for admin_adjustment which can repeat)
    if action != "admin_adjustment" and reference_id is not None:
        existing = (
            db.query(PointsTransaction)
            .filter(
                PointsTransaction.user_id == user_id,
                PointsTransaction.action == action,
                PointsTransaction.reference_id == reference_id,
            )
            .first()
        )
        if existing:
            return None  # Already awarded, no duplicate

    # --- Create transaction ---
    tx = PointsTransaction(
        user_id=user_id,
        action=action,
        points=points,
        reference_id=reference_id,
        reference_type=reference_type or "fiche",
        awarded_by_id=awarded_by_id,
        reason=reason or action,
        created_at=datetime.now(timezone.utc),
    )
    db.add(tx)
    db.flush()

    # --- Update UserPoints aggregate ---
    user_pts = db.query(UserPoints).filter(UserPoints.user_id == user_id).first()
    if not user_pts:
        user_pts = UserPoints(user_id=user_id, total_points=0, level=1)
        db.add(user_pts)
        db.flush()

    old_level = user_pts.level
    user_pts.total_points += points
    user_pts.total_points = max(0, user_pts.total_points)  # never negative
    level_info = compute_level(user_pts.total_points)
    user_pts.level = level_info["level"]
    user_pts.updated_at = datetime.now(timezone.utc)

    # --- Notification: points earned ---
    if points != 0:
        notif_msg = f"+{points} points" if points > 0 else f"{points} points"
        _create_notification(
            user_id=user_id,
            type="points_earned",
            message=f"You earned {notif_msg} for: {reason or action}",
            reference_id=reference_id,
            db=db,
        )

    # --- Notification: level up ---
    if user_pts.level > old_level:
        _create_notification(
            user_id=user_id,
            type="level_up",
            message=f"🎉 You reached Level {user_pts.level} — {level_info['level_name']}!",
            db=db,
        )

    db.flush()

    # --- Check badge unlocks ---
    _check_and_award_badges(user_id=user_id, db=db)

    return {
        "id": tx.id,
        "user_id": user_id,
        "action": action,
        "points": points,
        "reference_id": reference_id,
        "created_at": tx.created_at,
    }


def _create_notification(
    user_id: int,
    type: str,
    message: str,
    db: Session,
    reference_id: Optional[int] = None,
):
    from models import GamificationNotification
    notif = GamificationNotification(
        user_id=user_id,
        type=type,
        message=message,
        reference_id=reference_id,
        is_read=False,
        created_at=datetime.now(timezone.utc),
    )
    db.add(notif)


def _check_and_award_badges(user_id: int, db: Session):
    """Check all badge conditions and unlock any newly earned badges."""
    from models import UserBadge, PointsTransaction, Fiche, FicheStatus, FicheType

    already_earned = {ub.badge_id for ub in db.query(UserBadge).filter(UserBadge.user_id == user_id).all()}

    def _earn(badge_id: str):
        if badge_id in already_earned:
            return
        badge_def = next((b for b in BADGE_DEFINITIONS if b["id"] == badge_id), None)
        if not badge_def:
            return
        ub = UserBadge(
            user_id=user_id,
            badge_id=badge_id,
            earned_at=datetime.now(timezone.utc),
        )
        db.add(ub)
        _create_notification(
            user_id=user_id,
            type="badge_earned",
            message=f"{badge_def['icon']} You unlocked the badge: {badge_def['name']}!",
            db=db,
        )
        already_earned.add(badge_id)

    # Count published fiches by type for this user
    published_fiches = (
        db.query(Fiche)
        .filter(Fiche.author_id == user_id, Fiche.status == FicheStatus.published)
        .all()
    )
    total_published = len(published_fiches)
    problem_solutions = sum(1 for f in published_fiches if f.type == FicheType.problem_solution)
    procedures = sum(1 for f in published_fiches if f.type == FicheType.procedure)

    # Total helpful contributions: transactions for answers/evaluations/improvements
    helpful_count = (
        db.query(PointsTransaction)
        .filter(
            PointsTransaction.user_id == user_id,
            PointsTransaction.action.in_([
                "provide_useful_answer",
                "receive_positive_evaluation",
                "improvement_validated",
            ]),
        )
        .count()
    )

    # First Contribution
    if total_published >= 1:
        _earn("first_contribution")

    # Problem Solver — 10 problem_solution published
    if problem_solutions >= 10:
        _earn("problem_solver")

    # Knowledge Sharer — 20 total contributions
    if total_published >= 20:
        _earn("knowledge_sharer")

    # Maintenance Specialist — 10 procedures
    if procedures >= 10:
        _earn("maintenance_specialist")

    # Active Expert — 50 helpful contributions
    if helpful_count >= 50:
        _earn("active_expert")

    # Top Contributor — check leaderboard rank (top 10)
    _check_top_contributor_badge(user_id=user_id, db=db, earn_fn=_earn)


def _check_top_contributor_badge(user_id: int, db: Session, earn_fn):
    """Check if user is in top 10 leaderboard and award badge."""
    from models import UserPoints
    top10 = (
        db.query(UserPoints)
        .order_by(UserPoints.total_points.desc())
        .limit(10)
        .all()
    )
    if any(up.user_id == user_id for up in top10):
        earn_fn("top_contributor")


def check_top_contributor_badges_global(db: Session):
    """Re-evaluate top contributor badges for all users (call after any big point change)."""
    from models import UserPoints, UserBadge
    top10_ids = {
        up.user_id
        for up in db.query(UserPoints).order_by(UserPoints.total_points.desc()).limit(10).all()
    }

    # Remove badge from users who dropped out
    all_badge_holders = db.query(UserBadge).filter(UserBadge.badge_id == "top_contributor").all()
    for ub in all_badge_holders:
        if ub.user_id not in top10_ids:
            db.delete(ub)

    # Award to users now in top 10 who don't have it
    for uid in top10_ids:
        existing = db.query(UserBadge).filter(
            UserBadge.user_id == uid,
            UserBadge.badge_id == "top_contributor",
        ).first()
        if not existing:
            ub = UserBadge(user_id=uid, badge_id="top_contributor", earned_at=datetime.now(timezone.utc))
            db.add(ub)
            _create_notification(
                user_id=uid,
                type="badge_earned",
                message="🏆 You unlocked the badge: Top Contributor! You're in the Top 10!",
                db=db,
            )

