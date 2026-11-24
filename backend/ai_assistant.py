"""
ai_assistant.py — Intelligent local AI search & guidance assistant for KnowFact.

Helps engineers, technicians, and operators quickly find:
  - Technical solutions (problem_solution)
  - Operational tasks & checklists (task_post)
  - Procedures & safety protocols (procedure)

Works 100% locally and offline using:
  - Multilingual (FR/EN) accent-insensitive tokenization & technical code preservation
  - Industrial domain synonym expansion
  - Field-weighted BM25 ranking + intent/type alignment + validation status weighting
  - Conversational follow-up context resolution
  - Grounded natural-language synthesis (steps, equipment, safety warnings)
"""
from __future__ import annotations

import json
import math
import re
import unicodedata
from dataclasses import dataclass
from typing import Any, Literal, Optional

from pydantic import BaseModel, Field
from sqlalchemy.orm import Session, joinedload

from models import Department, Fiche, FicheStatus, FicheType, User, UserRole


# ---------------------------------------------------------------------------
# Pydantic Schemas
# ---------------------------------------------------------------------------

AssistantMode = Literal["all", "solutions", "tasks", "procedures"]


class ChatHistoryMessage(BaseModel):
    role: Literal["user", "assistant"]
    content: str = ""


class AIAssistantRequest(BaseModel):
    message: str = Field(..., min_length=1, max_length=1000)
    mode: AssistantMode = "all"
    department_id: Optional[int] = None
    history: list[ChatHistoryMessage] = Field(default_factory=list)
    limit: int = Field(default=5, ge=1, le=10)


class AIAssistantFicheSummary(BaseModel):
    id: int
    title: str
    type: str
    status: str
    version: int
    author_name: str
    department_id: Optional[int] = None
    department_name: Optional[str] = None
    workstation_name: Optional[str] = None
    equipment: str = ""
    tags: list[str] = Field(default_factory=list)
    useful_count: int = 0
    security_note: Optional[str] = None


class AIAssistantRecommendation(BaseModel):
    fiche: AIAssistantFicheSummary
    relevance_score: int  # 0..100
    match_reasons: list[str] = Field(default_factory=list)
    excerpt: str = ""
    key_steps: list[str] = Field(default_factory=list)
    safety_warning: Optional[str] = None


class AIAssistantResponse(BaseModel):
    answer: str
    intent_detected: str  # "solution" | "task" | "procedure" | "general"
    mode_used: AssistantMode
    detected_department: Optional[str] = None
    keywords_used: list[str] = Field(default_factory=list)
    recommendations: list[AIAssistantRecommendation] = Field(default_factory=list)
    suggested_followups: list[str] = Field(default_factory=list)
    total_candidates_scanned: int = 0


class AISuggestionPrompt(BaseModel):
    label: str
    prompt: str
    mode: AssistantMode = "all"


class AISuggestionsResponse(BaseModel):
    suggestions: list[AISuggestionPrompt]


# ---------------------------------------------------------------------------
# NLP Helpers & Industrial Thesaurus
# ---------------------------------------------------------------------------

_STOPWORDS = {
    # French
    "le", "la", "les", "un", "une", "des", "du", "de", "d", "l", "au", "aux",
    "et", "ou", "mais", "donc", "or", "ni", "car", "que", "qui", "quoi", "dont",
    "ou", "quand", "comment", "pourquoi", "quel", "quelle", "quels", "quelles",
    "est", "sont", "etre", "avoir", "a", "ai", "as", "avons", "avez", "ont",
    "fait", "faire", "peut", "peux", "pouvez", "faut", "il", "elle", "on", "nous",
    "vous", "ils", "elles", "je", "tu", "me", "te", "se", "ce", "cet", "cette",
    "ces", "mon", "ma", "mes", "ton", "ta", "tes", "son", "sa", "ses", "notre",
    "votre", "leur", "leurs", "en", "y", "dans", "sur", "sous", "avec", "sans",
    "pour", "par", "vers", "chez", "entre", "plus", "moins", "tres", "trop",
    "bien", "mal", "tout", "tous", "toute", "toutes", "aucun", "aucune",
    "cherche", "chercher", "trouver", "trouve", "besoin", "aide", "aider",
    "voir", "donne", "donner", "montre", "montrer", "liste", "lister", "dis",
    "svp", "bonjour", "salut", "merci", "existe", "y", "faut", "quoi",
    # English
    "the", "a", "an", "and", "or", "for", "with", "without", "to", "from", "in",
    "on", "at", "by", "of", "is", "are", "was", "were", "be", "how", "what",
    "which", "who", "when", "where", "why", "can", "could", "should", "need",
    "find", "search", "help", "show", "get", "me", "my", "this", "that",
}

# Intent triggers
_SOLUTION_TRIGGERS = {
    "solution", "solutions", "probleme", "problemes", "panne", "pannes",
    "erreur", "erreurs", "defaut", "defauts", "dysfonctionnement", "incident",
    "anomalie", "reparer", "reparation", "resoudre", "resolution", "depannage",
    "depanner", "diagnostic", "diagnostiquer", "corriger", "fix", "issue",
    "troubleshoot", "alarm", "alarme", "blocage", "bloquee", "bloque",
    "fuite", "surchauffe", "vibration", "bruit", "arret", "hs", "casse",
}

_TASK_TRIGGERS = {
    "tache", "taches", "task", "tasks", "mission", "missions", "travail",
    "travailler", "checklist", "nettoyage", "nettoyer", "graissage", "graisser",
    "verification", "verifier", "inspection", "inspecter", "maintenance",
    "entretien", "preventif", "preventive", "operateur", "effectuer", "realiser",
    "quotidien", "hebdomadaire", "mensuel", "journalier", "planning",
}

_PROCEDURE_TRIGGERS = {
    "procedure", "procedures", "etape", "etapes", "protocole", "consigne",
    "consignes", "mode", "operatoire", "gamme", "sop", "instruction",
    "instructions", "marche", "demarrage", "demarrer", "consignation", "loto",
    "reglage", "calibration", "etalonnage", "installation", "montage",
}

# Bidirectional industrial synonym groups
_SYNONYM_GROUPS: list[set[str]] = [
    {"panne", "defaut", "dysfonctionnement", "incident", "probleme", "anomalie", "erreur", "arret"},
    {"solution", "reparation", "depannage", "correctif", "resolution", "remise"},
    {"vibration", "vibrations", "balourd", "roulement", "roulements", "alignement", "bruit", "oscillation"},
    {"fuite", "fuites", "joint", "joints", "etancheite", "suintement", "pression"},
    {"pompe", "pompes", "hydraulique", "debit", "cavitation", "aspiration", "vanne"},
    {"electrique", "electricite", "disjoncteur", "armoire", "tension", "consignation", "loto", "variateur", "cablage"},
    {"convoyeur", "convoyeurs", "bande", "courroie", "rouleau", "rouleaux", "tapis"},
    {"capteur", "capteurs", "detecteur", "sonde", "cellule", "automate", "plc"},
    {"securite", "epi", "risque", "risques", "danger", "hse", "protection", "urgence", "accident"},
    {"maintenance", "entretien", "revision", "graissage", "lubrification", "preventif", "preventive"},
    {"qualite", "controle", "mesure", "tolerance", "conformite", "audit", "metrologie"},
    {"tache", "taches", "checklist", "verification", "inspection", "nettoyage"},
    {"procedure", "protocole", "gamme", "operatoire", "consigne", "instruction"},
    {"moteur", "moteurs", "surchauffe", "temperature", "thermique", "ventilation", "refroidissement"},
    {"usinage", "cnc", "broche", "outil", "outillage", "machine"},
]

_SYNONYM_MAP: dict[str, set[str]] = {}
for _group in _SYNONYM_GROUPS:
    for _term in _group:
        _SYNONYM_MAP.setdefault(_term, set()).update(_group - {_term})


def _strip_accents(text: str) -> str:
    nfkd = unicodedata.normalize("NFKD", text)
    return "".join(ch for ch in nfkd if not unicodedata.combining(ch))


def _normalize_text(text: str) -> str:
    return re.sub(r"\s+", " ", _strip_accents(text or "").lower()).strip()


def _stem_token(tok: str) -> str:
    """Lightweight French/English suffix stemmer for industrial words."""
    if len(tok) <= 4:
        return tok
    for suffix in ("ements", "ement", "ations", "ation", "eurs", "euse", "ages", "age", "ies", "es", "s"):
        if tok.endswith(suffix) and len(tok) - len(suffix) >= 3:
            return tok[: -len(suffix)]
    return tok


def _tokenize(text: str, keep_stopwords: bool = False) -> list[str]:
    norm = _normalize_text(text)
    # Match words and hyphenated technical codes (e.g. cnc-04, conv-a)
    raw_tokens = re.findall(r"[a-z0-9]+(?:-[a-z0-9]+)*", norm)
    tokens: list[str] = []
    for tok in raw_tokens:
        if len(tok) < 2 and not tok.isdigit():
            continue
        if not keep_stopwords and tok in _STOPWORDS:
            continue
        tokens.append(tok)
        if "-" in tok:
            for part in tok.split("-"):
                if len(part) >= 2 and (keep_stopwords or part not in _STOPWORDS):
                    tokens.append(part)
    return tokens


def _expand_tokens(tokens: list[str]) -> tuple[list[str], set[str]]:
    """Return (primary_tokens, synonym_tokens)."""
    syns: set[str] = set()
    for t in tokens:
        if t in _SYNONYM_MAP:
            syns.update(_SYNONYM_MAP[t])
        stem = _stem_token(t)
        for k, group_syns in _SYNONYM_MAP.items():
            if _stem_token(k) == stem:
                syns.update(group_syns)
    syns -= set(tokens)
    return tokens, syns


def can_user_see_fiche(fiche: Fiche, user: User) -> bool:
    """Visibility check matching routes/fiches.py and routes/search.py."""
    s = fiche.status
    role = user.role

    if s == FicheStatus.draft:
        return fiche.author_id == user.id or role == UserRole.admin
    if s in (FicheStatus.submitted, FicheStatus.under_review, FicheStatus.to_correct):
        return fiche.author_id == user.id or role in (UserRole.expert, UserRole.admin)
    if s in (FicheStatus.validated, FicheStatus.published):
        return True
    if s in (FicheStatus.rejected, FicheStatus.archived):
        return fiche.author_id == user.id or role in (UserRole.expert, UserRole.admin)
    return False


def _parse_content(raw: Any) -> dict[str, Any]:
    if isinstance(raw, dict):
        return raw
    if isinstance(raw, str):
        try:
            parsed = json.loads(raw)
            return parsed if isinstance(parsed, dict) else {}
        except (json.JSONDecodeError, TypeError):
            return {}
    return {}


@dataclass
class _IndexedFiche:
    fiche: Fiche
    content: dict[str, Any]
    title_norm: str
    desc_norm: str
    equip_norm: str
    safety_norm: str
    tags_norm: str
    steps_list: list[str]
    steps_norm: str
    dept_name: str
    dept_code: str
    ws_name: str
    field_tokens: dict[str, list[str]]
    all_tokens_set: set[str]
    all_stems_set: set[str]


def _index_fiche(fiche: Fiche) -> _IndexedFiche:
    content = _parse_content(fiche.content)
    title = fiche.title or ""
    desc = str(content.get("description") or "")
    equip = str(content.get("equipment") or "")
    safety = str(content.get("safety_notes") or fiche.security_note or "")
    tags_raw = content.get("tags") or []
    tags = " ".join(str(t) for t in tags_raw) if isinstance(tags_raw, list) else str(tags_raw)

    raw_steps = content.get("steps") or []
    steps_list: list[str] = []
    if isinstance(raw_steps, list):
        sorted_steps = sorted(
            raw_steps,
            key=lambda s: s.get("order", 0) if isinstance(s, dict) else 0,
        )
        for st in sorted_steps:
            if isinstance(st, dict) and st.get("content"):
                steps_list.append(str(st["content"]).strip())
            elif isinstance(st, str) and st.strip():
                steps_list.append(st.strip())
    steps_joined = " ".join(steps_list)

    dept_name = fiche.department.name if fiche.department else ""
    dept_code = fiche.department.code if fiche.department else ""
    ws_name = fiche.workstation.name if fiche.workstation else ""

    field_tokens = {
        "title": _tokenize(title),
        "tags": _tokenize(tags),
        "equipment": _tokenize(equip),
        "description": _tokenize(desc),
        "steps": _tokenize(steps_joined),
        "safety": _tokenize(safety),
        "dept": _tokenize(f"{dept_name} {dept_code} {ws_name}"),
    }

    all_toks = set()
    for toks in field_tokens.values():
        all_toks.update(toks)
    all_stems = {_stem_token(t) for t in all_toks}

    return _IndexedFiche(
        fiche=fiche,
        content=content,
        title_norm=_normalize_text(title),
        desc_norm=_normalize_text(desc),
        equip_norm=_normalize_text(equip),
        safety_norm=_normalize_text(safety),
        tags_norm=_normalize_text(tags),
        steps_list=steps_list,
        steps_norm=_normalize_text(steps_joined),
        dept_name=dept_name,
        dept_code=dept_code,
        ws_name=ws_name,
        field_tokens=field_tokens,
        all_tokens_set=all_toks,
        all_stems_set=all_stems,
    )


def _detect_intent(query_tokens: list[str], mode: AssistantMode) -> str:
    if mode == "solutions":
        return "solution"
    if mode == "tasks":
        return "task"
    if mode == "procedures":
        return "procedure"

    sol_hits = sum(1 for t in query_tokens if t in _SOLUTION_TRIGGERS)
    task_hits = sum(1 for t in query_tokens if t in _TASK_TRIGGERS)
    proc_hits = sum(1 for t in query_tokens if t in _PROCEDURE_TRIGGERS)

    best = max(sol_hits, task_hits, proc_hits)
    if best == 0:
        return "general"
    if sol_hits == best and sol_hits >= task_hits and sol_hits >= proc_hits:
        return "solution"
    if task_hits == best and task_hits >= proc_hits:
        return "task"
    return "procedure"


def _detect_focus(norm_query: str) -> str:
    """Detect whether the user is specifically asking about safety, equipment, or steps."""
    if any(w in norm_query for w in ("securite", "epi", "danger", "risque", "precaution", "protection", "hse")):
        return "safety"
    if any(w in norm_query for w in ("equipement", "outil", "outillage", "materiel", "piece", "machine")):
        return "equipment"
    if any(w in norm_query for w in ("etape", "comment faire", "proceder", "demarche", "checklist")):
        return "steps"
    return "overview"


def _is_followup_query(norm_query: str, content_tokens: list[str]) -> bool:
    """Detect short conversational follow-ups that rely on previous context."""
    followup_markers = (
        "securite", "epi", "precaution", "equipement", "outil", "etape",
        "details", "detail", "premiere", "premier", "deuxieme", "celle-ci",
        "celui-ci", "suite", "autre", "autres", "lies", "liees", "taches",
        "solutions", "procedures",
    )
    if len(content_tokens) <= 3 and any(m in norm_query for m in followup_markers):
        return True
    return False


def _type_label_fr(fiche_type: FicheType | str) -> str:
    val = fiche_type.value if hasattr(fiche_type, "value") else str(fiche_type)
    return {
        "problem_solution": "Solution technique",
        "task_post": "Tâche opérationnelle",
        "procedure": "Procédure",
    }.get(val, val)


def _status_label_fr(status: FicheStatus | str) -> str:
    val = status.value if hasattr(status, "value") else str(status)
    return {
        "published": "Publiée",
        "validated": "Validée",
        "under_review": "En révision",
        "submitted": "Soumise",
        "to_correct": "À corriger",
        "draft": "Brouillon",
        "rejected": "Rejetée",
        "archived": "Archivée",
    }.get(val, val)


# ---------------------------------------------------------------------------
# Main Assistant Engine
# ---------------------------------------------------------------------------

def ask_assistant(
    db: Session,
    current_user: User,
    req: AIAssistantRequest,
) -> AIAssistantResponse:
    """
    Search visible fiches using semantic/BM25 scoring and synthesize
    an actionable, grounded AI response in French.
    """
    raw_query = req.message.strip()
    norm_query = _normalize_text(raw_query)

    # Load all visible fiches (with department, workstation, author)
    query = db.query(Fiche).options(
        joinedload(Fiche.author),
        joinedload(Fiche.department),
        joinedload(Fiche.workstation),
    )
    if req.department_id:
        query = query.filter(Fiche.department_id == req.department_id)

    all_fiches = query.order_by(Fiche.updated_at.desc()).all()
    visible_fiches = [f for f in all_fiches if can_user_see_fiche(f, current_user)]

    # Detect department from query text if not explicitly filtered
    detected_dept_name: Optional[str] = None
    detected_dept_id: Optional[int] = req.department_id
    departments = db.query(Department).filter(Department.is_active == True).all()  # noqa: E712
    if not detected_dept_id:
        for dept in departments:
            d_name_norm = _normalize_text(dept.name)
            d_code_norm = _normalize_text(dept.code)
            if (len(d_name_norm) >= 3 and re.search(rf"\b{re.escape(d_name_norm)}\b", norm_query)) or (
                len(d_code_norm) >= 2 and re.search(rf"\b{re.escape(d_code_norm)}\b", norm_query)
            ):
                detected_dept_name = dept.name
                detected_dept_id = dept.id
                break
    else:
        matched_d = next((d for d in departments if d.id == req.department_id), None)
        if matched_d:
            detected_dept_name = matched_d.name

    # Tokenize query + resolve conversational history if needed
    raw_tokens = _tokenize(raw_query, keep_stopwords=False)
    intent = _detect_intent(raw_tokens, req.mode)
    focus = _detect_focus(norm_query)

    # Remove pure meta-intent words from search keywords if domain terms exist
    meta_intent_words = {"solution", "solutions", "tache", "taches", "procedure", "procedures", "fiche", "fiches"}
    domain_tokens = [t for t in raw_tokens if t not in meta_intent_words]

    # Merge previous user query terms if this is a follow-up question
    if req.history and _is_followup_query(norm_query, domain_tokens):
        prev_user_msgs = [h.content for h in req.history if h.role == "user"][-2:]
        for prev in prev_user_msgs:
            prev_toks = [t for t in _tokenize(prev, keep_stopwords=False) if t not in meta_intent_words]
            for pt in prev_toks:
                if pt not in domain_tokens:
                    domain_tokens.append(pt)

    # If user typed only e.g. "quelles solutions ?" or "lister les tâches", browse mode!
    browse_by_intent_only = len(domain_tokens) == 0

    search_tokens = domain_tokens if domain_tokens else raw_tokens
    primary_tokens, synonym_tokens = _expand_tokens(search_tokens)

    indexed = [_index_fiche(f) for f in visible_fiches]
    total_scanned = len(indexed)

    # Compute document frequency for IDF
    doc_count = max(len(indexed), 1)
    df_counts: dict[str, int] = {}
    for item in indexed:
        for stem in item.all_stems_set:
            df_counts[stem] = df_counts.get(stem, 0) + 1

    def _idf(tok: str) -> float:
        df = df_counts.get(_stem_token(tok), 0)
        return math.log((doc_count + 1.0) / (df + 0.5)) + 0.5

    # Field weights
    field_weights = {
        "title": 3.4,
        "tags": 2.6,
        "equipment": 2.3,
        "description": 1.6,
        "steps": 1.4,
        "safety": 1.1,
        "dept": 1.2,
    }

    scored: list[tuple[float, _IndexedFiche, list[str]]] = []

    # Clean phrase without intent words for substring boost
    clean_phrase = " ".join(domain_tokens)

    for item in indexed:
        fiche = item.fiche
        ftype = fiche.type.value if hasattr(fiche.type, "value") else str(fiche.type)
        fstatus = fiche.status.value if hasattr(fiche.status, "value") else str(fiche.status)

        # Hard filter if explicit mode selected (unless no domain tokens and user asks general)
        if req.mode == "solutions" and ftype != "problem_solution":
            continue
        if req.mode == "tasks" and ftype != "task_post":
            continue
        if req.mode == "procedures" and ftype != "procedure":
            continue

        reasons: list[str] = []
        raw_score = 0.0

        if browse_by_intent_only:
            # User asked e.g. "Quelles sont les tâches ?" or "Montre les solutions"
            raw_score = 1.0
            if fstatus == "published":
                raw_score += 0.6
                reasons.append("Fiche publiée et vérifiée")
            elif fstatus == "validated":
                raw_score += 0.4
                reasons.append("Fiche validée")
            if detected_dept_id and fiche.department_id == detected_dept_id:
                raw_score += 0.8
                reasons.append(f"Département : {item.dept_name}")
        else:
            # BM25-inspired multi-field scoring
            matched_primary: set[str] = set()
            matched_fields: set[str] = set()

            for fname, weight in field_weights.items():
                ftoks = item.field_tokens[fname]
                if not ftoks:
                    continue
                fstems = {_stem_token(t) for t in ftoks}
                f_len_norm = 1.0 / (1.0 + 0.04 * len(ftoks))

                for tok in primary_tokens:
                    stem = _stem_token(tok)
                    exact_hit = tok in ftoks
                    stem_hit = stem in fstems
                    # Substring fallback for technical codes/partials (>=4 chars)
                    substr_hit = (
                        not exact_hit
                        and not stem_hit
                        and len(tok) >= 4
                        and any(tok in ft for ft in ftoks)
                    )
                    if exact_hit or stem_hit or substr_hit:
                        mult = 1.0 if exact_hit else (0.85 if stem_hit else 0.65)
                        raw_score += weight * _idf(tok) * mult * (0.7 + 0.3 * f_len_norm)
                        matched_primary.add(tok)
                        matched_fields.add(fname)

                # Synonym hits (soft weight)
                for syn in synonym_tokens:
                    syn_stem = _stem_token(syn)
                    if syn in ftoks or syn_stem in fstems:
                        raw_score += weight * 0.45

            # Exact multi-word phrase match bonus
            if len(clean_phrase) >= 4:
                if clean_phrase in item.title_norm:
                    raw_score += 4.5
                    matched_fields.add("title")
                elif clean_phrase in item.desc_norm or clean_phrase in item.steps_norm:
                    raw_score += 2.2

            if raw_score <= 0.15:
                continue

            # Coverage bonus (queries matching multiple distinct terms rank much higher)
            if primary_tokens:
                coverage = len(matched_primary) / len(set(primary_tokens))
                raw_score *= 0.65 + 0.7 * coverage

            # Explain why it matched
            if "title" in matched_fields:
                reasons.append("Titre correspondant")
            if "equipment" in matched_fields and item.equip_norm:
                reasons.append(f"Équipement : {item.content.get('equipment')}")
            if "tags" in matched_fields:
                reasons.append("Mots-clés / tags correspondants")
            if "steps" in matched_fields:
                reasons.append("Étapes pertinentes")
            if "safety" in matched_fields:
                reasons.append("Consignes sécurité liées")
            if not reasons:
                reasons.append("Contenu technique pertinent")

            if detected_dept_id and fiche.department_id == detected_dept_id:
                raw_score *= 1.25
                if item.dept_name:
                    reasons.append(f"Département : {item.dept_name}")

        # Intent alignment bonus (when mode=="all" and intent was detected)
        if req.mode == "all":
            if intent == "solution" and ftype == "problem_solution":
                raw_score *= 1.35
                reasons.insert(0, "Solution recommandée")
            elif intent == "task" and ftype == "task_post":
                raw_score *= 1.35
                reasons.insert(0, "Tâche correspondante")
            elif intent == "procedure" and ftype == "procedure":
                raw_score *= 1.35
                reasons.insert(0, "Procédure associée")

        # Trust / validation status & helpfulness boost
        if fstatus == "published":
            raw_score *= 1.25
            if "Fiche publiée et vérifiée" not in reasons:
                reasons.append("Publiée & vérifiée")
        elif fstatus == "validated":
            raw_score *= 1.15
            if "Fiche validée" not in reasons:
                reasons.append("Validée")
        elif fstatus in ("rejected", "archived"):
            raw_score *= 0.65

        useful = getattr(fiche, "useful_count", 0) or 0
        if useful > 0:
            raw_score *= 1.0 + min(useful, 10) * 0.02

        scored.append((raw_score, item, reasons[:4]))

    scored.sort(key=lambda x: (x[0], getattr(x[1].fiche, "useful_count", 0) or 0), reverse=True)
    top_scored = scored[: req.limit]

    # Normalize relevance scores to 0..100
    max_score = top_scored[0][0] if top_scored else 1.0
    recommendations: list[AIAssistantRecommendation] = []
    for s_val, item, reasons in top_scored:
        fiche = item.fiche
        ftype = fiche.type.value if hasattr(fiche.type, "value") else str(fiche.type)
        fstatus = fiche.status.value if hasattr(fiche.status, "value") else str(fiche.status)

        if browse_by_intent_only:
            rel_pct = min(98, max(72, int(round((s_val / max(max_score, 1e-6)) * 96))))
        else:
            rel_pct = min(99, max(45, int(round((s_val / max(max_score, 1e-6)) * 95))))

        raw_desc = str(item.content.get("description") or "").strip()
        excerpt = (raw_desc[:210] + "…") if len(raw_desc) > 210 else raw_desc

        tags_raw = item.content.get("tags") or []
        tags_list = [str(t) for t in tags_raw] if isinstance(tags_raw, list) else []
        safety_warn = (str(item.content.get("safety_notes") or fiche.security_note or "")).strip() or None

        summary = AIAssistantFicheSummary(
            id=fiche.id,
            title=fiche.title,
            type=ftype,
            status=fstatus,
            version=fiche.version,
            author_name=fiche.author.full_name if fiche.author else "",
            department_id=fiche.department_id,
            department_name=item.dept_name or None,
            workstation_name=item.ws_name or None,
            equipment=str(item.content.get("equipment") or ""),
            tags=tags_list,
            useful_count=getattr(fiche, "useful_count", 0) or 0,
            security_note=safety_warn,
        )

        recommendations.append(
            AIAssistantRecommendation(
                fiche=summary,
                relevance_score=rel_pct,
                match_reasons=reasons,
                excerpt=excerpt,
                key_steps=item.steps_list[:4],
                safety_warning=safety_warn,
            )
        )

    answer = _synthesize_answer(
        raw_query=raw_query,
        intent=intent,
        focus=focus,
        browse_mode=browse_by_intent_only,
        detected_dept=detected_dept_name,
        recommendations=recommendations,
    )

    followups = _build_followups(
        intent=intent,
        focus=focus,
        recommendations=recommendations,
        detected_dept=detected_dept_name,
    )

    return AIAssistantResponse(
        answer=answer,
        intent_detected=intent,
        mode_used=req.mode,
        detected_department=detected_dept_name,
        keywords_used=domain_tokens[:8],
        recommendations=recommendations,
        suggested_followups=followups,
        total_candidates_scanned=total_scanned,
    )


def _synthesize_answer(
    raw_query: str,
    intent: str,
    focus: str,
    browse_mode: bool,
    detected_dept: Optional[str],
    recommendations: list[AIAssistantRecommendation],
) -> str:
    if not recommendations:
        dept_msg = f" dans le département **{detected_dept}**" if detected_dept else ""
        return (
            f"Je n'ai trouvé aucune fiche correspondant précisément à « **{raw_query}** »{dept_msg}.\n\n"
            "**Suggestions pour affiner votre recherche :**\n"
            "- Essayez des termes techniques plus généraux (ex. *pompe*, *convoyeur*, *variateur*, *fuite*, *sécurité*).\n"
            "- Passez le filtre sur **Tout** si vous cherchiez uniquement dans les solutions ou les tâches.\n"
            "- Si ce problème ou cette tâche est inédit(e), vous pouvez créer une nouvelle fiche afin de capitaliser le savoir."
        )

    top = recommendations[0]
    f = top.fiche
    type_fr = _type_label_fr(f.type)
    status_fr = _status_label_fr(f.status)
    lines: list[str] = []

    if browse_mode:
        target_label = {
            "solution": "solutions techniques",
            "task": "tâches opérationnelles",
            "procedure": "procédures",
        }.get(intent, "fiches")
        dept_suffix = f" ({detected_dept})" if detected_dept else ""
        lines.append(
            f"Voici les **{len(recommendations)} {target_label}** les plus pertinentes trouvées{dept_suffix} :"
        )
    else:
        lines.append(
            f"J'ai identifié **{len(recommendations)} fiche(s) pertinente(s)** pour votre demande. "
            f"La meilleure correspondance est **{f.title}** ({type_fr} · {status_fr} · pertinence {top.relevance_score}%)."
        )

    if focus == "safety":
        if top.safety_warning:
            lines.append(f"\n⚠️ **Consignes de sécurité ({f.title}) :**\n{top.safety_warning}")
        else:
            lines.append(
                f"\nℹ️ Aucune alerte de sécurité spécifique n'est renseignée sur **{f.title}**. "
                "Appliquez les EPI standards du poste et consignez l'équipement avant toute intervention."
            )
    elif focus == "equipment":
        if f.equipment:
            lines.append(f"\n🔧 **Équipements / Outillage concernés :** {f.equipment}")
        else:
            lines.append(f"\nℹ️ Aucun équipement spécifique listé dans **{f.title}**.")
    else:
        if top.excerpt:
            lines.append(f"\n**Synthèse :** {top.excerpt}")
        if f.equipment:
            lines.append(f"\n🔧 **Équipement concerné :** {f.equipment}")
        if top.key_steps:
            lines.append("\n**Étapes clés recommandées :**")
            for idx, step in enumerate(top.key_steps[:4], start=1):
                short_step = step if len(step) <= 160 else step[:157] + "…"
                lines.append(f"{idx}. {short_step}")
        if top.safety_warning:
            lines.append(f"\n⚠️ **Point de vigilance / Sécurité :** {top.safety_warning}")

    if len(recommendations) > 1:
        others = ", ".join(f"**{r.fiche.title}** ({_type_label_fr(r.fiche.type)})" for r in recommendations[1:3])
        lines.append(f"\n📌 **Autres pistes associées :** {others}.")

    return "\n".join(lines)


def _build_followups(
    intent: str,
    focus: str,
    recommendations: list[AIAssistantRecommendation],
    detected_dept: Optional[str],
) -> list[str]:
    if not recommendations:
        return [
            "Quelles solutions validées existent en Maintenance ?",
            "Lister les tâches opérationnelles disponibles",
            "Afficher les procédures de sécurité",
        ]

    top = recommendations[0]
    followups: list[str] = []

    if focus != "safety" and top.safety_warning:
        followups.append("Quelles sont les consignes de sécurité et EPI requis ?")
    if focus != "steps" and top.key_steps:
        followups.append("Détailler les étapes d'intervention")
    if focus != "equipment" and top.fiche.equipment:
        followups.append("Quels équipements et outils sont nécessaires ?")

    if intent != "task":
        followups.append("Y a-t-il des tâches liées à ce sujet ?")
    if intent != "solution":
        followups.append("Quelles solutions existent pour les pannes similaires ?")
    if detected_dept:
        followups.append(f"Autres fiches du département {detected_dept}")

    # Deduplicate while preserving order, max 3 items
    seen: set[str] = set()
    unique: list[str] = []
    for q in followups:
        if q not in seen:
            seen.add(q)
            unique.append(q)
        if len(unique) == 3:
            break
    return unique


def get_dynamic_suggestions(db: Session, current_user: User) -> AISuggestionsResponse:
    """Build helpful starter prompts grounded in the current knowledge base."""
    fiches = (
        db.query(Fiche)
        .options(joinedload(Fiche.department))
        .order_by(Fiche.useful_count.desc(), Fiche.updated_at.desc())
        .all()
    )
    visible = [f for f in fiches if can_user_see_fiche(f, current_user)]

    suggestions: list[AISuggestionPrompt] = []

    top_sol = next((f for f in visible if f.type == FicheType.problem_solution), None)
    top_task = next((f for f in visible if f.type == FicheType.task_post), None)
    top_proc = next((f for f in visible if f.type == FicheType.procedure), None)

    if top_sol:
        words = [w for w in _tokenize(top_sol.title) if w not in _SOLUTION_TRIGGERS][:3]
        topic = " ".join(words) if words else top_sol.title[:35]
        suggestions.append(
            AISuggestionPrompt(
                label=f"Solution : {top_sol.title[:34]}",
                prompt=f"Comment résoudre le problème lié à {topic} ?",
                mode="solutions",
            )
        )
    else:
        suggestions.append(
            AISuggestionPrompt(
                label="Trouver une solution",
                prompt="Quelles solutions validées sont disponibles pour résoudre une panne ?",
                mode="solutions",
            )
        )

    if top_task:
        suggestions.append(
            AISuggestionPrompt(
                label=f"Tâche : {top_task.title[:34]}",
                prompt=f"Quelles sont les étapes pour la tâche : {top_task.title} ?",
                mode="tasks",
            )
        )
    else:
        suggestions.append(
            AISuggestionPrompt(
                label="Tâches de maintenance",
                prompt="Quelles tâches opérationnelles de maintenance ou contrôle effectuer ?",
                mode="tasks",
            )
        )

    if top_proc:
        suggestions.append(
            AISuggestionPrompt(
                label=f"Procédure : {top_proc.title[:30]}",
                prompt=f"Résume la procédure et les consignes de sécurité pour {top_proc.title}",
                mode="procedures",
            )
        )
    else:
        suggestions.append(
            AISuggestionPrompt(
                label="Procédures & sécurité",
                prompt="Quelles procédures de sécurité et EPI dois-je respecter ?",
                mode="procedures",
            )
        )

    suggestions.append(
        AISuggestionPrompt(
            label="Toutes les fiches Maintenance",
            prompt="Quelles solutions et tâches existent dans le département Maintenance ?",
            mode="all",
        )
    )

    return AISuggestionsResponse(suggestions=suggestions)
