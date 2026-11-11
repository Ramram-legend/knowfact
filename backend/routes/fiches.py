"""
routes/fiches.py — Full CRUD + workflow endpoints for Fiches.

GET    /api/fiches/                    list (filtered, role-based)
POST   /api/fiches/                    create (starts as draft)
GET    /api/fiches/{id}                detail with versions + attachments
PUT    /api/fiches/{id}                update (author, only in draft/to_correct)
POST   /api/fiches/{id}/submit         author submits for review
POST   /api/fiches/{id}/review         expert/admin: validate|reject|request_correction
POST   /api/fiches/{id}/publish        admin/expert: publish a validated fiche
POST   /api/fiches/{id}/archive        admin: archive
POST   /api/fiches/{id}/new_version    start a new version from a published fiche
GET    /api/fiches/{id}/versions       list all historical versions
POST   /api/fiches/{id}/upload         upload attachment
"""
import json
import os
import shutil
from datetime import datetime, timezone
from pathlib import Path
from typing import Optional

from fastapi import (
    APIRouter,
    Depends,
    File,
    HTTPException,
    Query,
    UploadFile,
    status,
)
from sqlalchemy.orm import Session, joinedload

from auth import get_current_active_user
from database import get_db
from models import (
    Attachment,
    Fiche,
    FicheStatus,
    FicheVersion,
    ReviewDecision,
    User,
    UserRole,
    VersionReview,
    VersionStatus,
)
from schemas import (
    AttachmentOut,
    DashboardStats,
    FicheCreate,
    FicheListOut,
    FicheOut,
    FicheUpdate,
    FicheVersionOut,
    ImprovementProposalCreate,
    ImprovementProposalOut,
    ImprovementProposalUpdate,
    ImprovementReviewAction,
    MessageOut,
    NewVersionRequest,
    PaginatedFiches,
    ReviewAction,
    VersionDiffOut,
    VersionReviewOut,
)

router = APIRouter(prefix="/api/fiches", tags=["fiches"])

UPLOAD_DIR = Path("uploads")
UPLOAD_DIR.mkdir(exist_ok=True)


# ---------------------------------------------------------------------------
# Helpers
# ---------------------------------------------------------------------------


def _can_see(fiche: Fiche, user: User) -> bool:
    """Return True if `user` is allowed to see this fiche based on status."""
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
        return True  # all authenticated users

    if s in (FicheStatus.rejected, FicheStatus.archived):
        return (
            fiche.author_id == user.id
            or role in (UserRole.expert, UserRole.admin)
        )

    return False


def _get_fiche_or_404(fiche_id: int, db: Session) -> Fiche:
    fiche = (
        db.query(Fiche)
        .options(
            joinedload(Fiche.author),
            joinedload(Fiche.reviewer),
            joinedload(Fiche.versions).joinedload(FicheVersion.changed_by_user),
            joinedload(Fiche.versions).joinedload(FicheVersion.reviews).joinedload(VersionReview.reviewer),
            joinedload(Fiche.attachments),
        )
        .filter(Fiche.id == fiche_id)
        .first()
    )
    if not fiche:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Fiche not found.")
    return fiche


def _snapshot_version(fiche: Fiche, user: User, db: Session, reason: str = "") -> None:
    """Save the current fiche content as a FicheVersion snapshot."""
    version_entry = FicheVersion(
        fiche_id=fiche.id,
        version_number=fiche.version,
        title=fiche.title,
        content=fiche.content,
        changed_by=user.id,
        status=VersionStatus.active,
        change_reason=reason or f"Version {fiche.version}",
        improvement_reason=reason or None,
    )
    db.add(version_entry)


# ---------------------------------------------------------------------------
# List fiches
# ---------------------------------------------------------------------------


@router.get("/", response_model=PaginatedFiches)
def list_fiches(
    status_filter: Optional[FicheStatus] = Query(None, alias="status"),
    type_filter: Optional[str] = Query(None, alias="type"),
    author_id: Optional[int] = Query(None),
    search: Optional[str] = Query(None),
    page: int = Query(1, ge=1),
    page_size: int = Query(12, ge=1, le=100),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user),
):
    """List fiches visible to the current user, with optional filters and pagination."""
    import json as _json
    query = db.query(Fiche).options(joinedload(Fiche.author))

    if status_filter:
        query = query.filter(Fiche.status == status_filter)
    if type_filter:
        query = query.filter(Fiche.type == type_filter)
    if author_id:
        query = query.filter(Fiche.author_id == author_id)

    fiches = query.order_by(Fiche.updated_at.desc()).all()
    visible = [f for f in fiches if _can_see(f, current_user)]

    # Keyword search
    if search and search.strip():
        keyword = search.strip().lower()
        def _matches(fiche: Fiche) -> bool:
            if keyword in fiche.title.lower():
                return True
            try:
                content_dict = _json.loads(fiche.content) if isinstance(fiche.content, str) else {}
                return keyword in _json.dumps(content_dict).lower()
            except Exception:
                return False
        visible = [f for f in visible if _matches(f)]

    total = len(visible)
    start = (page - 1) * page_size
    end = start + page_size
    page_items = visible[start:end]

    return PaginatedFiches(count=total, results=page_items)


# ---------------------------------------------------------------------------
# Create fiche
# ---------------------------------------------------------------------------


@router.post("/", response_model=FicheOut, status_code=status.HTTP_201_CREATED)
def create_fiche(
    payload: FicheCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user),
):
    """Create a new fiche (starts as draft). Any authenticated user can create."""
    content_json = json.dumps(payload.content.model_dump())
    fiche = Fiche(
        title=payload.title,
        type=payload.type,
        content=content_json,
        author_id=current_user.id,
        status=FicheStatus.draft,
        version=1,
        review_due_date=payload.review_due_date,
    )
    db.add(fiche)
    db.flush()  # get fiche.id before snapshot
    _snapshot_version(fiche, current_user, db, reason="Initial draft")
    db.commit()
    db.refresh(fiche)
    return _get_fiche_or_404(fiche.id, db)


# ---------------------------------------------------------------------------
# Dashboard stats
# ---------------------------------------------------------------------------


@router.get("/dashboard/", response_model=DashboardStats)
def get_dashboard_stats(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user),
):
    """Return dashboard statistics for the current user."""
    all_fiches = db.query(Fiche).options(joinedload(Fiche.author)).all()
    visible = [f for f in all_fiches if _can_see(f, current_user)]

    total = len(visible)
    published = sum(1 for f in visible if f.status == FicheStatus.published)
    pending = sum(1 for f in visible if f.status in (FicheStatus.submitted, FicheStatus.under_review))
    my_drafts = sum(1 for f in visible if f.author_id == current_user.id and f.status == FicheStatus.draft)
    recent = sorted(visible, key=lambda f: f.updated_at, reverse=True)[:6]

    return DashboardStats(
        total_fiches=total,
        published_fiches=published,
        pending_review=pending,
        my_drafts=my_drafts,
        recent_fiches=recent,
    )


# ---------------------------------------------------------------------------
# Improvement proposals (Améliorer une solution existante)
# ---------------------------------------------------------------------------


@router.post("/{fiche_id}/propose-improvement", response_model=FicheVersionOut, status_code=status.HTTP_201_CREATED)
def propose_improvement(
    fiche_id: int,
    payload: ImprovementProposalCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user),
):
    """
    Ingénieur ou technicien propose une amélioration pour une fiche validée.
    La version active reste visible et inchangée.
    """
    if current_user.role not in (UserRole.engineer, UserRole.technician):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Seuls les ingénieurs et techniciens peuvent proposer une amélioration.",
        )

    fiche = _get_fiche_or_404(fiche_id, db)
    if fiche.status not in (FicheStatus.validated, FicheStatus.published):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Une amélioration ne peut être proposée que sur une fiche validée ou publiée.",
        )

    # Règle : Une seule proposition d'amélioration en cours par fiche
    existing_pending = (
        db.query(FicheVersion)
        .filter(
            FicheVersion.fiche_id == fiche_id,
            FicheVersion.status.in_([VersionStatus.pending_review, VersionStatus.to_correct]),
        )
        .first()
    )
    if existing_pending:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Une proposition d'amélioration est déjà en cours de validation pour cette fiche.",
        )

    # Motif obligatoire à la soumission
    reason = payload.improvement_reason.strip() if payload.improvement_reason else ""
    if payload.submit and not reason:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Le motif de l'amélioration est obligatoire pour soumettre la proposition.",
        )

    # Déterminer la version parente active
    parent_version = (
        db.query(FicheVersion)
        .filter(FicheVersion.fiche_id == fiche_id, FicheVersion.version_number == fiche.version)
        .order_by(FicheVersion.created_at.desc())
        .first()
    )
    parent_version_id = parent_version.id if parent_version else None

    # Création de la version
    content_json = json.dumps(payload.content.model_dump())
    new_version = FicheVersion(
        fiche_id=fiche_id,
        version_number=fiche.version + 1,
        title=payload.title.strip() if payload.title else fiche.title,
        content=content_json,
        changed_by=current_user.id,
        status=VersionStatus.pending_review if payload.submit else VersionStatus.draft,
        improvement_reason=reason,
        change_reason=reason or "Amélioration proposée",
        parent_version_id=parent_version_id,
    )
    db.add(new_version)
    db.commit()
    db.refresh(new_version)
    return new_version


@router.get("/improvements/mine", response_model=list[ImprovementProposalOut])
def list_my_improvements(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user),
):
    """Lister toutes les propositions d'amélioration de l'utilisateur connecté."""
    proposals = (
        db.query(FicheVersion)
        .options(
            joinedload(FicheVersion.fiche),
            joinedload(FicheVersion.changed_by_user),
            joinedload(FicheVersion.reviews).joinedload(VersionReview.reviewer),
        )
        .filter(FicheVersion.changed_by == current_user.id)
        .filter(FicheVersion.improvement_reason.isnot(None))
        .order_by(FicheVersion.updated_at.desc())
        .all()
    )
    results = []
    for p in proposals:
        latest_comment = p.reviews[0].comment if p.reviews else None
        results.append(
            ImprovementProposalOut(
                id=p.id,
                fiche_id=p.fiche_id,
                fiche_title=p.fiche.title if p.fiche else (p.title or ""),
                version_number=p.version_number,
                title=p.title,
                status=p.status,
                improvement_reason=p.improvement_reason or p.change_reason,
                changed_by=p.changed_by,
                author_name=p.changed_by_user.full_name if p.changed_by_user else "",
                created_at=p.created_at,
                updated_at=p.updated_at or p.created_at,
                latest_review_comment=latest_comment,
                reviews=[VersionReviewOut.model_validate(r) for r in p.reviews],
            )
        )
    return results


@router.get("/improvements/pending", response_model=list[ImprovementProposalOut])
def list_pending_improvements(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user),
):
    """Lister les propositions en attente de validation (pour experts et admins)."""
    if current_user.role not in (UserRole.expert, UserRole.admin):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Accès réservé aux experts et administrateurs.",
        )
    proposals = (
        db.query(FicheVersion)
        .options(
            joinedload(FicheVersion.fiche),
            joinedload(FicheVersion.changed_by_user),
            joinedload(FicheVersion.reviews).joinedload(VersionReview.reviewer),
        )
        .filter(FicheVersion.status == VersionStatus.pending_review)
        .order_by(FicheVersion.created_at.desc())
        .all()
    )
    results = []
    for p in proposals:
        latest_comment = p.reviews[0].comment if p.reviews else None
        results.append(
            ImprovementProposalOut(
                id=p.id,
                fiche_id=p.fiche_id,
                fiche_title=p.fiche.title if p.fiche else (p.title or ""),
                version_number=p.version_number,
                title=p.title,
                status=p.status,
                improvement_reason=p.improvement_reason or p.change_reason,
                changed_by=p.changed_by,
                author_name=p.changed_by_user.full_name if p.changed_by_user else "",
                created_at=p.created_at,
                updated_at=p.updated_at or p.created_at,
                latest_review_comment=latest_comment,
                reviews=[VersionReviewOut.model_validate(r) for r in p.reviews],
            )
        )
    return results


@router.get("/improvements/{version_id}/diff", response_model=VersionDiffOut)
def get_improvement_diff(
    version_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user),
):
    """
    Retourne la comparaison côte-à-côte (diff) entre la version proposée et la version parente/active.
    """
    version = (
        db.query(FicheVersion)
        .options(
            joinedload(FicheVersion.fiche),
            joinedload(FicheVersion.changed_by_user),
            joinedload(FicheVersion.parent_version),
            joinedload(FicheVersion.reviews).joinedload(VersionReview.reviewer),
        )
        .filter(FicheVersion.id == version_id)
        .first()
    )
    if not version:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Proposition introuvable.")

    fiche = version.fiche
    if not fiche:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Fiche parente introuvable.")

    # Permissions : l'auteur, experts et admins peuvent voir le diff
    if version.changed_by != current_user.id and current_user.role not in (UserRole.expert, UserRole.admin):
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Accès non autorisé.")

    # Récupération de l'ancien contenu (soit parent_version, soit fiche active)
    old_content_raw = version.parent_version.content if version.parent_version else fiche.content
    try:
        old_content = json.loads(old_content_raw) if isinstance(old_content_raw, str) else old_content_raw
    except Exception:
        old_content = {}

    try:
        new_content = json.loads(version.content) if isinstance(version.content, str) else version.content
    except Exception:
        new_content = {}

    old_title = version.parent_version.title if (version.parent_version and version.parent_version.title) else fiche.title
    proposed_title = version.title or fiche.title

    # Construction du résumé des deltas
    diff_summary = {
        "title_changed": old_title != proposed_title,
        "description_changed": old_content.get("description", "") != new_content.get("description", ""),
        "equipment_changed": old_content.get("equipment", "") != new_content.get("equipment", ""),
        "safety_notes_changed": old_content.get("safety_notes", "") != new_content.get("safety_notes", ""),
        "tags_changed": old_content.get("tags", []) != new_content.get("tags", []),
        "steps_changed": old_content.get("steps", []) != new_content.get("steps", []),
    }

    return VersionDiffOut(
        version_id=version.id,
        parent_version_id=version.parent_version_id,
        fiche_id=fiche.id,
        fiche_title=fiche.title,
        proposed_title=proposed_title,
        proposer_id=version.changed_by,
        proposer_name=version.changed_by_user.full_name if version.changed_by_user else "",
        proposer_role=version.changed_by_user.role.value if version.changed_by_user else "",
        improvement_reason=version.improvement_reason or version.change_reason or "",
        status=version.status,
        created_at=version.created_at,
        updated_at=version.updated_at or version.created_at,
        old_content=old_content,
        new_content=new_content,
        diff_summary=diff_summary,
        reviews=[VersionReviewOut.model_validate(r) for r in version.reviews],
    )


@router.put("/improvements/{version_id}", response_model=FicheVersionOut)
def update_improvement_proposal(
    version_id: int,
    payload: ImprovementProposalUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user),
):
    """Mettre à jour un brouillon d'amélioration ou re-soumettre après correction."""
    version = (
        db.query(FicheVersion)
        .options(
            joinedload(FicheVersion.fiche),
            joinedload(FicheVersion.changed_by_user),
        )
        .filter(FicheVersion.id == version_id)
        .first()
    )
    if not version:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Proposition introuvable.")

    if version.changed_by != current_user.id and current_user.role != UserRole.admin:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Seul l'auteur peut modifier cette proposition.")

    if version.status not in (VersionStatus.draft, VersionStatus.to_correct):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Impossible de modifier une proposition avec le statut '{version.status.value}'.",
        )

    if payload.title is not None:
        version.title = payload.title
    if payload.content is not None:
        version.content = json.dumps(payload.content.model_dump())
    if payload.improvement_reason is not None:
        version.improvement_reason = payload.improvement_reason
        version.change_reason = payload.improvement_reason

    if payload.submit is True:
        reason = (version.improvement_reason or "").strip()
        if not reason:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Le motif de l'amélioration est obligatoire pour soumettre la proposition.",
            )
        version.status = VersionStatus.pending_review

    version.updated_at = datetime.now(timezone.utc)
    db.commit()
    db.refresh(version)
    return version


@router.post("/improvements/{version_id}/submit", response_model=FicheVersionOut)
def submit_improvement_proposal(
    version_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user),
):
    """Soumettre une proposition en attente de validation."""
    version = (
        db.query(FicheVersion)
        .options(
            joinedload(FicheVersion.fiche),
            joinedload(FicheVersion.changed_by_user),
        )
        .filter(FicheVersion.id == version_id)
        .first()
    )
    if not version:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Proposition introuvable.")

    if version.changed_by != current_user.id and current_user.role != UserRole.admin:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Seul l'auteur peut soumettre cette proposition.")

    if version.status not in (VersionStatus.draft, VersionStatus.to_correct):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Impossible de soumettre une proposition avec le statut '{version.status.value}'.",
        )

    reason = (version.improvement_reason or "").strip()
    if not reason:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Le motif de l'amélioration est obligatoire pour soumettre la proposition.",
        )

    version.status = VersionStatus.pending_review
    version.updated_at = datetime.now(timezone.utc)
    db.commit()
    db.refresh(version)
    return version


@router.post("/improvements/{version_id}/review", response_model=VersionDiffOut)
def review_improvement_proposal(
    version_id: int,
    payload: ImprovementReviewAction,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user),
):
    """
    Expert ou admin examine et statue sur une proposition d'amélioration.
    Règles métier :
    - Rôle expert ou admin requis
    - Un utilisateur ne peut jamais valider sa propre proposition
    - Si validée : transaction atomique (l'ancienne passe en superseded, la nouvelle en active, la fiche est mise à jour)
    - Si correction ou rejet : motif obligatoire et la fiche active reste inchangée
    """
    if current_user.role not in (UserRole.expert, UserRole.admin):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Seuls les experts et administrateurs peuvent valider ou rejeter une proposition.",
        )

    version = (
        db.query(FicheVersion)
        .options(
            joinedload(FicheVersion.fiche),
            joinedload(FicheVersion.changed_by_user),
            joinedload(FicheVersion.parent_version),
        )
        .filter(FicheVersion.id == version_id)
        .first()
    )
    if not version:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Proposition introuvable.")

    # RÈGLE ABSOLUE ANTI-AUTO-VALIDATION
    if version.changed_by == current_user.id:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Vous ne pouvez pas valider ou évaluer votre propre proposition d'amélioration.",
        )

    if version.status != VersionStatus.pending_review:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"La proposition doit être au statut 'En attente' (actuel : {version.status.value}).",
        )

    comment = payload.comment.strip() if payload.comment else ""
    now = datetime.now(timezone.utc)
    fiche = version.fiche

    if payload.action == "validate":
        # TRANSACTION ATOMIQUE :
        # 1. Archiver / remplacer toutes les versions actives précédentes de cette fiche
        db.query(FicheVersion).filter(
            FicheVersion.fiche_id == fiche.id,
            FicheVersion.status == VersionStatus.active,
            FicheVersion.id != version.id,
        ).update({"status": VersionStatus.superseded, "updated_at": now})

        # 2. Activer la nouvelle version
        version.status = VersionStatus.active
        version.updated_at = now

        # 3. Mettre à jour la fiche parente
        fiche.version = version.version_number
        if version.title:
            fiche.title = version.title
        fiche.content = version.content
        fiche.status = FicheStatus.published
        fiche.updated_at = now
        fiche.validated_at = now
        fiche.reviewed_by = current_user.id
        fiche.review_comment = comment or f"Amélioration v{version.version_number} validée par {current_user.full_name}"

        # 4. Tracer la décision dans VersionReview
        review_entry = VersionReview(
            version_id=version.id,
            reviewer_id=current_user.id,
            decision=ReviewDecision.validate,
            comment=comment or "Validée et activée",
            created_at=now,
        )
        db.add(review_entry)

    elif payload.action == "request_correction":
        if not comment:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Un commentaire explicatif est obligatoire pour demander une correction.",
            )
        version.status = VersionStatus.to_correct
        version.updated_at = now

        review_entry = VersionReview(
            version_id=version.id,
            reviewer_id=current_user.id,
            decision=ReviewDecision.request_correction,
            comment=comment,
            created_at=now,
        )
        db.add(review_entry)

    elif payload.action == "reject":
        if not comment:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Un motif de rejet est obligatoire.",
            )
        version.status = VersionStatus.rejected
        version.updated_at = now

        review_entry = VersionReview(
            version_id=version.id,
            reviewer_id=current_user.id,
            decision=ReviewDecision.reject,
            comment=comment,
            created_at=now,
        )
        db.add(review_entry)

    db.commit()
    db.refresh(version)
    return get_improvement_diff(version_id=version.id, db=db, current_user=current_user)


# ---------------------------------------------------------------------------
# Get fiche detail
# ---------------------------------------------------------------------------


@router.get("/{fiche_id}", response_model=FicheOut)
def get_fiche(
    fiche_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user),
):
    """Get a single fiche with its versions and attachments."""
    fiche = _get_fiche_or_404(fiche_id, db)
    if not _can_see(fiche, current_user):
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Access denied.")
    
    out = FicheOut.model_validate(fiche)
    
    # Check if there is an active pending improvement
    pending = next(
        (v for v in fiche.versions if v.status == VersionStatus.pending_review),
        None
    )
    if not pending:
        # Check if current user has a proposal in to_correct or draft
        pending = next(
            (v for v in fiche.versions if v.status in (VersionStatus.to_correct, VersionStatus.draft) and (v.changed_by == current_user.id or current_user.role in (UserRole.expert, UserRole.admin))),
            None
        )
    if pending:
        out.has_pending_improvement = True
        out.pending_improvement_id = pending.id

    return out


# ---------------------------------------------------------------------------
# Update fiche
# ---------------------------------------------------------------------------


@router.put("/{fiche_id}", response_model=FicheOut)
def update_fiche(
    fiche_id: int,
    payload: FicheUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user),
):
    """Update a fiche. Only the author can edit, and only when draft or to_correct."""
    fiche = _get_fiche_or_404(fiche_id, db)

    if fiche.author_id != current_user.id and current_user.role != UserRole.admin:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Only the author can edit this fiche.")

    if fiche.status not in (FicheStatus.draft, FicheStatus.to_correct):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Cannot edit a fiche with status '{fiche.status.value}'. Only draft or to_correct fiches can be edited.",
        )

    if payload.title is not None:
        fiche.title = payload.title
    if payload.type is not None:
        fiche.type = payload.type
    if payload.content is not None:
        fiche.content = json.dumps(payload.content.model_dump())
    if payload.review_due_date is not None:
        fiche.review_due_date = payload.review_due_date

    fiche.updated_at = datetime.now(timezone.utc)
    _snapshot_version(fiche, current_user, db, reason=payload.change_reason or "Content updated")
    db.commit()
    db.refresh(fiche)
    return _get_fiche_or_404(fiche_id, db)


@router.patch("/{fiche_id}", response_model=FicheOut)
def patch_fiche(
    fiche_id: int,
    payload: FicheUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user),
):
    """PATCH alias for update_fiche (same logic)."""
    return update_fiche(fiche_id, payload, db, current_user)


@router.delete("/{fiche_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_fiche(
    fiche_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user),
):
    """Delete a fiche. Only the author (in draft) or admin can delete."""
    fiche = _get_fiche_or_404(fiche_id, db)
    if fiche.author_id != current_user.id and current_user.role != UserRole.admin:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Only the author or admin can delete this fiche.")
    if fiche.status not in (FicheStatus.draft, FicheStatus.to_correct) and current_user.role != UserRole.admin:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Only draft or to_correct fiches can be deleted (unless you are admin).",
        )
    db.delete(fiche)
    db.commit()


# ---------------------------------------------------------------------------
# Submit for review
# ---------------------------------------------------------------------------


@router.post("/{fiche_id}/submit", response_model=FicheOut)
def submit_fiche(
    fiche_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user),
):
    """Author submits the fiche for expert review."""
    fiche = _get_fiche_or_404(fiche_id, db)

    if fiche.author_id != current_user.id:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Only the author can submit this fiche.")

    if fiche.status not in (FicheStatus.draft, FicheStatus.to_correct):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Cannot submit a fiche with status '{fiche.status.value}'.",
        )

    fiche.status = FicheStatus.submitted
    fiche.updated_at = datetime.now(timezone.utc)
    db.commit()
    db.refresh(fiche)
    return _get_fiche_or_404(fiche_id, db)


# ---------------------------------------------------------------------------
# Review (validate / reject / request_correction)
# ---------------------------------------------------------------------------


@router.post("/{fiche_id}/start_review", response_model=FicheOut)
def start_review_fiche(
    fiche_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user),
):
    """Expert or admin starts the review (submitted → under_review)."""
    if current_user.role not in (UserRole.expert, UserRole.admin):
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Only experts or admins can start a review.")
    fiche = _get_fiche_or_404(fiche_id, db)
    if fiche.status != FicheStatus.submitted:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Can only start review on a submitted fiche. Current status: '{fiche.status.value}'.",
        )
    fiche.status = FicheStatus.under_review
    fiche.reviewed_by = current_user.id
    fiche.updated_at = datetime.now(timezone.utc)
    db.commit()
    db.refresh(fiche)
    return _get_fiche_or_404(fiche_id, db)


@router.post("/{fiche_id}/validate", response_model=FicheOut)
def validate_fiche(
    fiche_id: int,
    payload: ReviewAction = ReviewAction(action="validate"),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user),
):
    """Expert or admin validates a fiche under review."""
    if current_user.role not in (UserRole.expert, UserRole.admin):
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Only experts or admins can validate fiches.")
    fiche = _get_fiche_or_404(fiche_id, db)
    if fiche.status not in (FicheStatus.submitted, FicheStatus.under_review):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Cannot validate a fiche with status '{fiche.status.value}'.",
        )
    fiche.status = FicheStatus.validated
    fiche.reviewed_by = current_user.id
    fiche.review_comment = payload.comment if hasattr(payload, 'comment') else ""
    fiche.validated_at = datetime.now(timezone.utc)
    fiche.updated_at = datetime.now(timezone.utc)
    db.commit()
    db.refresh(fiche)
    return _get_fiche_or_404(fiche_id, db)


@router.post("/{fiche_id}/reject", response_model=FicheOut)
def reject_fiche(
    fiche_id: int,
    payload: ReviewAction = ReviewAction(action="reject"),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user),
):
    """Expert or admin rejects a fiche."""
    if current_user.role not in (UserRole.expert, UserRole.admin):
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Only experts or admins can reject fiches.")
    fiche = _get_fiche_or_404(fiche_id, db)
    if fiche.status not in (FicheStatus.submitted, FicheStatus.under_review):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Cannot reject a fiche with status '{fiche.status.value}'.",
        )
    fiche.status = FicheStatus.rejected
    fiche.reviewed_by = current_user.id
    fiche.review_comment = payload.comment if hasattr(payload, 'comment') else ""
    fiche.updated_at = datetime.now(timezone.utc)
    db.commit()
    db.refresh(fiche)
    return _get_fiche_or_404(fiche_id, db)


@router.post("/{fiche_id}/request_correction", response_model=FicheOut)
def request_correction_fiche(
    fiche_id: int,
    payload: ReviewAction = ReviewAction(action="request_correction"),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user),
):
    """Expert or admin requests correction on a fiche."""
    if current_user.role not in (UserRole.expert, UserRole.admin):
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Only experts or admins can request corrections.")
    fiche = _get_fiche_or_404(fiche_id, db)
    if fiche.status not in (FicheStatus.submitted, FicheStatus.under_review):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Cannot request correction on a fiche with status '{fiche.status.value}'.",
        )
    fiche.status = FicheStatus.to_correct
    fiche.reviewed_by = current_user.id
    fiche.review_comment = payload.comment if hasattr(payload, 'comment') else ""
    fiche.updated_at = datetime.now(timezone.utc)
    db.commit()
    db.refresh(fiche)
    return _get_fiche_or_404(fiche_id, db)


@router.post("/{fiche_id}/review", response_model=FicheOut)
def review_fiche(
    fiche_id: int,
    payload: ReviewAction,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user),
):
    """Expert or admin reviews a submitted fiche."""
    if current_user.role not in (UserRole.expert, UserRole.admin):
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Only experts or admins can review fiches.")

    fiche = _get_fiche_or_404(fiche_id, db)

    if fiche.status not in (FicheStatus.submitted, FicheStatus.under_review):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Cannot review a fiche with status '{fiche.status.value}'.",
        )

    fiche.reviewed_by = current_user.id
    fiche.review_comment = payload.comment
    fiche.updated_at = datetime.now(timezone.utc)

    if payload.action == "validate":
        fiche.status = FicheStatus.validated
        fiche.validated_at = datetime.now(timezone.utc)
    elif payload.action == "reject":
        fiche.status = FicheStatus.rejected
    elif payload.action == "request_correction":
        fiche.status = FicheStatus.to_correct

    db.commit()
    db.refresh(fiche)
    return _get_fiche_or_404(fiche_id, db)


# ---------------------------------------------------------------------------
# Publish
# ---------------------------------------------------------------------------


@router.post("/{fiche_id}/publish", response_model=FicheOut)
def publish_fiche(
    fiche_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user),
):
    """Admin or expert publishes a validated fiche."""
    if current_user.role not in (UserRole.expert, UserRole.admin):
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Only experts or admins can publish fiches.")

    fiche = _get_fiche_or_404(fiche_id, db)

    if fiche.status != FicheStatus.validated:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Cannot publish a fiche with status '{fiche.status.value}'. Only validated fiches can be published.",
        )

    fiche.status = FicheStatus.published
    fiche.published_at = datetime.now(timezone.utc)
    fiche.updated_at = datetime.now(timezone.utc)
    db.commit()
    db.refresh(fiche)
    return _get_fiche_or_404(fiche_id, db)


# ---------------------------------------------------------------------------
# Archive
# ---------------------------------------------------------------------------


@router.post("/{fiche_id}/archive", response_model=FicheOut)
def archive_fiche(
    fiche_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user),
):
    """Admin archives a fiche."""
    if current_user.role != UserRole.admin:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Only admins can archive fiches.")

    fiche = _get_fiche_or_404(fiche_id, db)
    fiche.status = FicheStatus.archived
    fiche.updated_at = datetime.now(timezone.utc)
    db.commit()
    db.refresh(fiche)
    return _get_fiche_or_404(fiche_id, db)


# ---------------------------------------------------------------------------
# Start a new version from a published fiche
# ---------------------------------------------------------------------------


@router.post("/{fiche_id}/new_version", response_model=FicheOut)
def new_version(
    fiche_id: int,
    payload: NewVersionRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user),
):
    """
    Create a new editable version from a published fiche.
    The original fiche is archived and a new draft is created with version+1.
    Only the original author, experts, or admins may trigger this.
    """
    fiche = _get_fiche_or_404(fiche_id, db)

    if fiche.status != FicheStatus.published:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Only published fiches can spawn a new version.",
        )

    is_author = fiche.author_id == current_user.id
    is_privileged = current_user.role in (UserRole.expert, UserRole.admin)

    if not (is_author or is_privileged):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Only the original author, experts, or admins can create a new version.",
        )

    # Archive old fiche
    fiche.status = FicheStatus.archived
    fiche.updated_at = datetime.now(timezone.utc)
    db.flush()

    # Create new fiche as draft
    new_fiche = Fiche(
        title=fiche.title,
        type=fiche.type,
        content=fiche.content,
        author_id=current_user.id,
        status=FicheStatus.draft,
        version=fiche.version + 1,
        review_due_date=fiche.review_due_date,
    )
    db.add(new_fiche)
    db.flush()

    _snapshot_version(
        new_fiche,
        current_user,
        db,
        reason=payload.change_reason or f"New version from fiche #{fiche_id}",
    )

    db.commit()
    db.refresh(new_fiche)
    return _get_fiche_or_404(new_fiche.id, db)


# ---------------------------------------------------------------------------
# Get versions
# ---------------------------------------------------------------------------


@router.get("/{fiche_id}/versions", response_model=list[FicheVersionOut])
def get_versions(
    fiche_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user),
):
    """List all historical content versions for a fiche."""
    fiche = _get_fiche_or_404(fiche_id, db)
    if not _can_see(fiche, current_user):
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Access denied.")
    return (
        db.query(FicheVersion)
        .filter(FicheVersion.fiche_id == fiche_id)
        .order_by(FicheVersion.version_number.desc())
        .all()
    )


# ---------------------------------------------------------------------------
# Upload attachment
# ---------------------------------------------------------------------------


@router.post("/{fiche_id}/upload", response_model=AttachmentOut, status_code=status.HTTP_201_CREATED)
def upload_attachment(
    fiche_id: int,
    file: UploadFile = File(...),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user),
):
    """Upload a file attachment to a fiche."""
    fiche = _get_fiche_or_404(fiche_id, db)
    if not _can_see(fiche, current_user):
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Access denied.")

    dest_dir = UPLOAD_DIR / str(fiche_id)
    dest_dir.mkdir(parents=True, exist_ok=True)
    safe_name = Path(file.filename).name if file.filename else "upload"
    dest = dest_dir / safe_name

    with dest.open("wb") as out:
        shutil.copyfileobj(file.file, out)

    attachment = Attachment(
        fiche_id=fiche_id,
        filename=safe_name,
        file_path=str(dest),
        file_type=file.content_type or "application/octet-stream",
        uploaded_by=current_user.id,
    )
    db.add(attachment)
    db.commit()
    db.refresh(attachment)
    return attachment
