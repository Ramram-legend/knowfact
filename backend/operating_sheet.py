"""
operating_sheet.py — Module for generating simplified, visual operating sheets
(fiches opératoires / standard operating procedures) from technical procedures.

Tailored for field operators, shop-floor workers, and maintenance technicians.
Conforms to ISO 9001 / IATF 16949 visual management and 5S standards.
"""
from __future__ import annotations

import json
import re
from datetime import datetime, timezone
from typing import Any, List, Optional
from pydantic import BaseModel, Field


# ---------------------------------------------------------------------------
# Pydantic Schemas for Operating Sheet
# ---------------------------------------------------------------------------

class PPEItem(BaseModel):
    code: str  # glasses, gloves, safety_shoes, ear_protection, helmet, mask, hi_vis
    name: str
    required: bool = True
    description: Optional[str] = None


class OperatingStep(BaseModel):
    order: int
    title: str
    instruction: str
    control_point: str
    warning: Optional[str] = None
    image_url: Optional[str] = None


class SafetySection(BaseModel):
    hazards: List[str] = Field(default_factory=list)
    precautions: List[str] = Field(default_factory=list)
    prohibitions: List[str] = Field(default_factory=list)
    emergency_actions: List[str] = Field(default_factory=list)


class ValidationChecklist(BaseModel):
    items: List[str] = Field(default_factory=list)
    completion_text: str = (
        "L'opérateur certifie avoir réalisé l'ensemble des opérations dans le "
        "respect strict des consignes techniques et de sécurité."
    )
    operator_signature_title: str = "Opérateur / Intervenant terrain"
    supervisor_signature_title: str = "Responsable d'équipe / Superviseur"


class OperatingSheet(BaseModel):
    # A. En-tête
    company_name: str = "KnowFact Industrial Systems"
    title: str
    reference: str
    fiche_id: int
    procedure_version: int
    sheet_version: str = "1.0"
    department_name: str
    department_code: str
    workstation_name: Optional[str] = None
    created_at: str
    generated_at: str
    author_name: str
    validator_name: Optional[str] = None

    # B. Informations essentielles
    objective: str
    tools_and_equipment: List[str] = Field(default_factory=list)
    required_ppe: List[PPEItem] = Field(default_factory=list)
    prerequisites: List[str] = Field(default_factory=list)
    estimated_duration: Optional[str] = None
    difficulty_level: Optional[str] = None

    # C. Étapes de réalisation
    steps: List[OperatingStep] = Field(default_factory=list)

    # D. Sécurité
    safety: SafetySection = Field(default_factory=SafetySection)

    # E. Validation finale
    validation: ValidationChecklist = Field(default_factory=ValidationChecklist)


# ---------------------------------------------------------------------------
# Heuristic & NLP Synthesis Helpers
# ---------------------------------------------------------------------------

def _clean_str(text: Optional[str]) -> str:
    if not text:
        return ""
    return re.sub(r"\s+", " ", text).strip()


def _extract_clean_title(title: str) -> str:
    cleaned = title.strip()
    # Strip common technical prefixes
    patterns = [
        r"^proc[ée]dure\s+(de|d'|d’|pour|relative [àa])\s+",
        r"^fiche\s+(technique|d'intervention|op[ée]ratoire)\s*:\s*",
        r"^instruction\s+(de\s+travail|technique)\s*:\s*",
        r"^checklist\s*:\s*",
    ]
    for pat in patterns:
        cleaned = re.sub(pat, "", cleaned, flags=re.IGNORECASE).strip()
    return cleaned[0].upper() + cleaned[1:] if cleaned else title


def _infer_ppes(text_corpus: str) -> List[PPEItem]:
    """Infer PPE based on keywords present in the procedure text."""
    lower = text_corpus.lower()
    ppes: List[PPEItem] = [
        PPEItem(
            code="safety_shoes",
            name="Chaussures de sécurité (S3 / SRC)",
            required=True,
            description="Obligatoires en zone de production et atelier",
        ),
        PPEItem(
            code="gloves",
            name="Gants de protection adaptés",
            required=True,
            description="Anticoupure ou nitrile selon les produits manipulés",
        ),
    ]

    # Glasses
    if any(k in lower for k in ["lunette", "projection", "copeau", "pression", "acide", "huile", "air comprim", "usinage", "cnc", "meulage", "chimique"]):
        ppes.append(
            PPEItem(
                code="glasses",
                name="Lunettes de sécurité (EN 166)",
                required=True,
                description="Protection contre projections et éclaboussures",
            )
        )

    # Ear protection
    if any(k in lower for k in ["bruit", "antibruit", "décibel", "cnc", "usinage", "presse", "compresseur", "moteur", "concasseur", "scie"]):
        ppes.append(
            PPEItem(
                code="ear_protection",
                name="Protections auditives (Bouchons / Casque)",
                required=True,
                description="Zone à niveau sonore > 80 dB(A)",
            )
        )

    # Safety Helmet
    if any(k in lower for k in ["casque", "hauteur", "pont roulant", "palan", "chute", "levage", "grue", "rack"]):
        ppes.append(
            PPEItem(
                code="helmet",
                name="Casque de protection (EN 397)",
                required=True,
                description="Obligatoire lors de manutentions ou travail sous charge",
            )
        )

    # Respiratory Mask
    if any(k in lower for k in ["masque", "poussière", "vapeur", "solvant", "peinture", "ffp", "aérosol", "respir"]):
        ppes.append(
            PPEItem(
                code="mask",
                name="Masque respiratoire (FFP2 / FFP3)",
                required=True,
                description="Protection contre les aérosols et particules fines",
            )
        )

    # High Visibility
    if any(k in lower for k in ["chariot", "circulation", "quai", "gilet", "haute visibilit"]):
        ppes.append(
            PPEItem(
                code="hi_vis",
                name="Gilet haute visibilité (EN ISO 20471)",
                required=True,
                description="Obligatoire en zone de circulation d'engins",
            )
        )

    return ppes


def _infer_step_title_and_control(step_raw: str, index: int) -> tuple[str, str, str, Optional[str]]:
    """
    Transforms a verbose or technical step string into:
    (short_title, imperative_instruction, control_point, warning_if_any)
    Handles French and English technical instructions.
    """
    text = _clean_str(step_raw)
    lower = text.lower()

    # Default action
    title = f"Étape {index}"
    instruction = text
    control = "✓ Contrôler la bonne exécution et l'absence d'anomalie."
    warning: Optional[str] = None

    # Check for hazards / warnings in step
    if any(w in lower for w in ["attention", "danger", "risqu", "ne pas", "ne jamais", "do not", "never", "haute tension", "brûlure", "haute pression", "high pressure"]):
        if any(w in lower for w in ["ne jamais", "ne pas", "never", "do not"]):
            warning = "Respecter strictement l'interdiction mentionnée."
        elif "tension" in lower or "électr" in lower or "voltage" in lower:
            warning = "Risque d'électrisation ! Vérifier l'absence de tension."
        elif "pression" in lower or "pressure" in lower:
            warning = "Risque de projection sous pression ! Vérifier le manomètre."
        else:
            warning = "Point de vigilance particulier sur cette phase."

    # Heuristic pattern matching for common industrial actions (FR + EN)
    if any(k in lower for k in ["emergency-stop", "emergency stop", "arr[êe]t d'urgence", "e-stop"]):
        title = "Test des arrêts d'urgence (AU)"
        instruction = _to_imperative(text, "Vérifier l'actionnement et le déclenchement immédiat de chaque bouton d'arrêt d'urgence.")
        control = "✓ Arrêt immédiat constaté et réarmement sécurisé vérifié."

    elif any(k in lower for k in ["clean", "nettoy", "copeau", "chip", "dégraiss", "bac", "tray", "vidange"]):
        title = "Nettoyage & Évacuation des copeaux"
        instruction = _to_imperative(text, "Nettoyer les convoyeurs de copeaux et vider les bacs de récupération.")
        control = "✓ Zone et bacs propres, sans accumulation de matière."

    elif any(k in lower for k in ["guard", "interlock", "protecteur", "carter", "grille de protection"]):
        title = "Contrôle des protecteurs & verrouillages"
        instruction = _to_imperative(text, "Inspecter les carters de sécurité et tester les microcontacts d'interverrouillage.")
        control = "✓ Blocage effectif de la machine dès l'ouverture d'un protecteur."

    elif any(k in lower for k in ["coolant", "fluide de coupe", "arrosage", "lubrifi", "graiss", "huile", "oil"]):
        title = "Niveau de fluide & Lubrification"
        instruction = _to_imperative(text, "Vérifier le niveau de fluide et faire l'appoint si nécessaire.")
        control = "✓ Niveau stabilisé entre les repères MIN et MAX du voyant."

    elif any(k in lower for k in ["serr", "dynamométr", "couple", "tighten", "torque"]):
        title = "Serrage & Contrôle du couple"
        instruction = _to_imperative(text, "Serrer au couple préconisé à l'aide d'une clé dynamométrique étalonnée.")
        control = "✓ Couple de serrage atteint et repère visuel (témoin vernis) appliqué."

    elif any(k in lower for k in ["remplac", "remonter", "pose", "installer", "remettre", "assembl", "mount", "install"]):
        title = "Montage & Remplacement des composants"
        instruction = _to_imperative(text, "Positionner la pièce neuve selon le sens de montage prescrit.")
        control = "✓ Assemblage correctement positionné sans contrainte ni déformation."

    elif any(k in lower for k in ["tool holder", "porte-outil", "mandrin", "usure", "wear"]):
        title = "Inspection des outillages & Porte-outils"
        instruction = _to_imperative(text, "Inspecter l'état de surface, l'absence de copeaux coincés et le jeu mécanique.")
        control = "✓ Absence de jeu anormal, de fêlure ou d'usure excessive."

    elif any(k in lower for k in ["clean", "nettoy", "copeau", "chip", "dégraiss", "bac", "tray"]):
        title = "Nettoyage & Évacuation des copeaux"
        instruction = _to_imperative(text, "Nettoyer les convoyeurs de copeaux et vider les bacs de récupération.")
        control = "✓ Zone et convoyeur propres, sans accumulation de matière."

    elif any(k in lower for k in ["extinguisher", "extincteur", "incendie", "fire"]):
        title = "Vérification des moyens d'extinction"
        instruction = _to_imperative(text, "Contrôler la présence, l'accessibilité libre et la date de validité des extincteurs.")
        control = "✓ Aiguille de pression dans la zone verte et accès 100% dégagé."

    elif any(k in lower for k in ["log", "registre", "rapport", "anomal", "signal", "enregistr"]):
        title = "Enregistrement & Traçabilité"
        instruction = _to_imperative(text, "Consigner les résultats et notifier toute anomalie sur le registre de maintenance.")
        control = "✓ Fiche renseignée, signée et archivée au poste."

    elif any(k in lower for k in ["couper", "consign", "isoler", "loto", "cadenas", "disjoncteur", "lock out", "lockout"]):
        title = "Consignation & Mise en sécurité (LOTO)"
        instruction = _to_imperative(text, "Couper l'énergie, apposer le cadenas de consignation et vérifier la coupure.")
        control = "✓ Absence de tension (VAT = 0V) ou dépressurisation totale vérifiée."

    elif any(k in lower for k in ["purge", "dépressuris", "vidange", "pressur"]):
        title = "Purge & Dépressurisation du circuit"
        instruction = _to_imperative(text, "Ouvrir progressivement la vanne de décharge et purger le circuit.")
        control = "✓ Manomètre retombé à 0 bar avant ouverture de la tuyauterie."

    elif any(k in lower for k in ["démonter", "dépose", "dévisser", "desserr", "retirer", "enlever", "loosen"]):
        title = "Dépose & Démontage des éléments"
        instruction = _to_imperative(text, "Dévisser et déposer soigneusement les pièces en repérant leur position.")
        control = "✓ Pièces déposées disposées sur un bac propre sans être choquées."

    elif any(k in lower for k in ["inspect", "contrôl", "vérifi", "check", "mesur", "manomètre", "jauge", "gauge"]):
        title = "Contrôle & Inspection technique"
        instruction = _to_imperative(text, "Vérifier la conformité visuelle et géométrique des éléments.")
        control = "✓ Tous les paramètres mesurés se situent dans la tolérance admise."

    elif any(k in lower for k in ["remplac", "remonter", "pose", "installer", "remettre", "assembl", "mount", "install"]):
        title = "Montage & Remplacement des composants"
        instruction = _to_imperative(text, "Positionner la pièce neuve selon le sens de montage prescrit.")
        control = "✓ Assemblage correctement positionné sans contrainte ni déformation."

    elif any(k in lower for k in ["serr", "dynamométr", "couple", "vis", "boulon", "écrou", "tighten", "torque"]):
        title = "Serrage & Contrôle du couple"
        instruction = _to_imperative(text, "Serrer au couple préconisé à l'aide d'une clé dynamométrique étalonnée.")
        control = "✓ Couple de serrage atteint et repère visuel (témoin vernis) appliqué."

    elif any(k in lower for k in ["essai", "test", "démarr", "marche à vide", "run"]):
        title = "Essai de fonctionnement & Test à vide"
        instruction = _to_imperative(text, "Effectuer un essai à vide puis vérifier l'absence d'anomalie ou de bruit anormal.")
        control = "✓ Cycle complet réalisé sans alerte, vibration anormale ni fuite."

    else:
        # Generic sentence simplification
        words = text.split()
        if len(words) > 1:
            first_few = " ".join(words[:4]).rstrip(",.:;")
            title = first_few[0].upper() + first_few[1:]
        instruction = text

    return title, instruction, control, warning


def _to_imperative(original: str, fallback: str) -> str:
    """Simplifies sentences to direct, actionable instructions."""
    text = original.strip()
    if not text:
        return fallback

    # Strip prefixes like "Il faut", "L'opérateur doit", "Il convient de"
    text = re.sub(r"^(il\s+faut|il\s+convient\s+de|l'op[ée]rateur\s+doit|veuillez)\s+", "", text, flags=re.IGNORECASE)
    # Strip leading bullet points or numbers
    text = re.sub(r"^(\d+[\.\)]|\-|\*)\s*", "", text).strip()
    return text[0].upper() + text[1:] if text else fallback


# ---------------------------------------------------------------------------
# Main Generator Engine
# ---------------------------------------------------------------------------

def generate_operating_sheet(
    fiche_id: int,
    title: str,
    raw_content: Any,
    version: int = 1,
    department_name: str = "Production & Maintenance",
    department_code: str = "IND",
    workstation_name: Optional[str] = None,
    author_name: str = "Équipe Technique",
    validator_name: Optional[str] = None,
    created_at_dt: Optional[datetime] = None,
    attachments: Optional[List[dict]] = None,
) -> OperatingSheet:
    """
    Generates a streamlined, high-clarity Operating Sheet (Fiche Opératoire)
    from a detailed technical procedure.
    """
    # 1. Parse content
    content_dict: dict = {}
    if isinstance(raw_content, str):
        try:
            content_dict = json.loads(raw_content)
        except Exception:
            content_dict = {"description": raw_content}
    elif isinstance(raw_content, dict):
        content_dict = raw_content

    description = _clean_str(content_dict.get("description", ""))
    equipment_str = _clean_str(content_dict.get("equipment", ""))
    safety_notes = _clean_str(content_dict.get("safety_notes", ""))
    tags = content_dict.get("tags", [])
    raw_steps = content_dict.get("steps", [])

    # If this fiche already has a saved operating_sheet custom structure, we can load it or merge it
    saved_sheet = content_dict.get("operating_sheet")
    if isinstance(saved_sheet, dict) and saved_sheet.get("steps"):
        try:
            return OperatingSheet(**saved_sheet)
        except Exception:
            pass  # Fall back to fresh generation if invalid

    # 2. Extract Title & Objective
    clean_title = _extract_clean_title(title)
    ref_code = department_code.upper() if department_code else "IND"
    reference = f"FO-{ref_code}-{fiche_id:04d}-V{version}.0"

    now_iso = datetime.now(timezone.utc).strftime("%d/%m/%Y")
    creation_str = created_at_dt.strftime("%d/%m/%Y") if created_at_dt else now_iso

    # Objective
    if description:
        obj_clean = re.sub(r"^(cette\s+proc[ée]dure\s+(a\s+pour\s+but|permet|d[ée]crit)\s+(de\s+|d'|d’)?|le\s+but\s+est\s+de\s+|procedure\s+for\s+)", "", description, flags=re.IGNORECASE).strip()
        obj_clean = obj_clean[0].upper() + obj_clean[1:].rstrip(".") if obj_clean else ""
        objective = f"{obj_clean}. Assurer la conformité opérationnelle et la sécurité des intervenants."
    else:
        objective = f"Exécuter l'opération de {clean_title.lower()} de manière standardisée, sécurisée et conforme aux exigences qualité."

    # 3. Tools & Equipment
    tools: List[str] = []
    if equipment_str:
        # Strip parenthesized clauses like (PPE: gloves, glasses)
        eq_clean = re.sub(r"\([^)]*\)", "", equipment_str)
        split_items = re.split(r"[,;\n•]+", eq_clean)
        for item in split_items:
            it = _clean_str(item).strip("().,;: ")
            # Filter out generic PPE mentions since they go in required_ppe
            if it and not any(p in it.lower() for p in ["ppe", "epi", "lunette", "gant", "chaussure", "masque", "protective"]):
                tools.append(it[0].upper() + it[1:])
    if not tools:
        tools = [
            "Outillage standard de maintenance / caisse à outils",
            "Chiffons propres d'atelier non pelucheux",
            "Équipements de mesure et de contrôle étalonnés",
        ]

    # 4. PPE Requirements
    full_text = f"{title} {description} {equipment_str} {safety_notes} {' '.join(str(s) for s in raw_steps)}"
    required_ppes = _infer_ppes(full_text)

    # 5. Prerequisites
    prerequisites = [
        "Prendre connaissance de la présente fiche opératoire avant toute intervention.",
        "S'assurer que la machine / l'installation est à l'arrêt complet et en sécurité.",
        "Vérifier la disponibilité et le bon état de tout l'outillage et des consommables.",
        "Revêtir l'ensemble des Équipements de Protection Individuelle (EPI) obligatoires.",
    ]
    if any(k in full_text.lower() for k in ["loto", "consign", "électr", "400v", "pression", "hydraul"]):
        prerequisites.insert(1, "Procéder à la consignation LOTO stricte (cadenassage personnel) de toutes les énergies.")

    # 6. Steps transformation
    steps: List[OperatingStep] = []
    normalized_steps: List[str] = []

    for item in raw_steps:
        if isinstance(item, dict):
            normalized_steps.append(str(item.get("content", "")))
        elif isinstance(item, str):
            normalized_steps.append(item)

    if not normalized_steps:
        # Fallback if no steps were defined
        normalized_steps = [
            "Sécuriser et baliser la zone de travail avant intervention.",
            "Procéder aux opérations techniques prescrites selon les règles de l'art.",
            "Contrôler le bon fonctionnement et nettoyer le poste.",
        ]

    # Find image attachment if any
    available_images: List[str] = []
    if attachments:
        for att in attachments:
            fp = att.get("file_path", "") or att.get("filename", "")
            ft = att.get("file_type", "") or ""
            if any(ext in fp.lower() or ext in ft.lower() for ext in ["png", "jpg", "jpeg", "webp"]):
                available_images.append(fp)

    for idx, raw_text in enumerate(normalized_steps, start=1):
        step_title, instruction, control, warning = _infer_step_title_and_control(raw_text, idx)
        img_url = available_images[idx - 1] if idx - 1 < len(available_images) else None

        steps.append(
            OperatingStep(
                order=idx,
                title=step_title,
                instruction=instruction,
                control_point=control,
                warning=warning,
                image_url=img_url,
            )
        )

    # 7. Safety section
    hazards: List[str] = []
    lower_corpus = full_text.lower()

    if any(k in lower_corpus for k in ["électr", "tension", "400v", "disjoncteur"]):
        hazards.append("Risque électrique / Électrisation (présence de conducteurs nus ou armoires sous tension)")
    if any(k in lower_corpus for k in ["pression", "hydraul", "purge", "vanne", "bar"]):
        hazards.append("Risque d'éjection de fluide sous haute pression ou de coup de fouet")
    if any(k in lower_corpus for k in ["coupure", "tranchant", "copeau", "lame", "foret"]):
        hazards.append("Risque de coupure ou lacération par arêtes vives ou copeaux métalliques")
    if any(k in lower_corpus for k in ["écrasement", "pincement", "engrenage", "rouleau", "tapis", "mouvement"]):
        hazards.append("Risque d'écrasement ou d'entraînement par pièces mécaniques mobiles")
    if any(k in lower_corpus for k in ["chaud", "brûlure", "thermique", "température"]):
        hazards.append("Risque de brûlure thermique au contact de surfaces ou fluides chauds")
    if any(k in lower_corpus for k in ["chute", "glissade", "huile", "sol"]):
        hazards.append("Risque de chute de plain-pied ou glissade (présence possible de liquide au sol)")

    if not hazards:
        hazards = [
            "Risque mécanique : coincement ou choc d'outils",
            "Risque ergonomique : mauvaises postures lors de la manipulation",
        ]

    precautions: List[str] = [
        "Travailler uniquement sur un poste propre, bien éclairé et dégagé.",
        "Respecter rigoureusement la chronologie des étapes et les points de contrôle.",
        "Ne jamais forcer sur les assemblages ni utiliser d'outillage inadapté.",
    ]
    if safety_notes:
        precautions.insert(0, safety_notes)

    prohibitions: List[str] = [
        "🚫 INTERDICTION FORMELLE d'intervenir sur une machine sous tension ou en mouvement.",
        "🚫 NE JAMAIS shunter, bloquer ou désactiver un capteur de sécurité ou arrêt d'urgence.",
        "🚫 INTERDICTION de porter des vêtements amples, bagues, colliers ou cheveux détachés.",
        "🚫 NE JAMAIS diriger de soufflette à air comprimé vers soi ou une autre personne.",
    ]

    emergency_actions: List[str] = [
        "1. Interrompre immédiatement l'opération et dégager le poste.",
        "2. En cas de danger immédiat pour les personnes, ACTIONNER LE COUP DE POING ARRÊT D'URGENCE.",
        "3. Baliser la zone pour interdire tout accès tiers.",
        "4. Alerter immédiatement le chef d'équipe ou le superviseur de ligne.",
        "5. Consigner l'incident et l'heure dans le registre d'atelier.",
    ]

    # 8. Validation section
    validation_items: List[str] = [
        "Toutes les étapes prescrites ont été rigoureusement respectées.",
        "Les points de contrôle ont été vérifiés et sont conformes aux critères d'acceptation.",
        "Tous les carters, capots et protecteurs ont été remontés et verrouillés.",
        "L'outillage a été nettoyé, compté et rangé dans la servante / caisse.",
        "La zone d'intervention est propre, sèche et débarrassée de tout déchet ou chiffon.",
        "La déconsignation a été effectuée dans les règles et le poste est prêt pour la production.",
    ]

    # Estimated duration & difficulty
    estimated_duration = f"{max(10, len(steps) * 5)} min"
    difficulty = "Niveau 1 — Opérateur autonome" if len(steps) <= 5 else "Niveau 2 — Technicien qualifié"

    return OperatingSheet(
        title=clean_title,
        reference=reference,
        fiche_id=fiche_id,
        procedure_version=version,
        sheet_version=f"{version}.0",
        department_name=department_name,
        department_code=department_code,
        workstation_name=workstation_name or "Poste de travail atelier",
        created_at=creation_str,
        generated_at=now_iso,
        author_name=author_name,
        validator_name=validator_name or "Superviseur Qualité / Méthodes",
        objective=objective,
        tools_and_equipment=tools,
        required_ppe=required_ppes,
        prerequisites=prerequisites,
        estimated_duration=estimated_duration,
        difficulty_level=difficulty,
        steps=steps,
        safety=SafetySection(
            hazards=hazards,
            precautions=precautions,
            prohibitions=prohibitions,
            emergency_actions=emergency_actions,
        ),
        validation=ValidationChecklist(
            items=validation_items,
        ),
    )
