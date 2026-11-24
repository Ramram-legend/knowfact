"""
seed_catalog.py — Populate KnowFact with 30 rich industrial fiches across all 5 departments:
  - Production (PROD)
  - Maintenance (MAINT)
  - Qualité (QUAL)
  - Logistique (LOG)
  - HSE (HSE)

Covers problem_solution, task_post, and procedure with structured steps,
equipment, safety_notes, tags, workstations, and useful_count.

Idempotent: safe to run multiple times without creating duplicates.
Run directly:
    python seed_catalog.py
"""
from __future__ import annotations

import json
import sys
from datetime import datetime, timedelta, timezone

sys.path.insert(0, ".")

from database import SessionLocal, init_db
from models import (
    Department,
    Fiche,
    FicheStatus,
    FicheType,
    FicheVersion,
    User,
    VersionStatus,
    Workstation,
)


def _make_content(
    description: str,
    steps: list[str],
    tags: list[str],
    equipment: str,
    safety_notes: str,
) -> str:
    return json.dumps(
        {
            "description": description,
            "steps": [{"order": i + 1, "content": s} for i, s in enumerate(steps)],
            "tags": tags,
            "equipment": equipment,
            "safety_notes": safety_notes,
        },
        ensure_ascii=False,
    )


CATALOG_FICHES = [
    # =========================================================================
    # PRODUCTION (PROD) — 6 fiches
    # =========================================================================
    {
        "title": "Défaut d'alignement étiquettes sur poste conditionnement COND-01",
        "type": FicheType.problem_solution,
        "status": FicheStatus.published,
        "dept_code": "PROD",
        "ws_code": "COND-01",
        "author_email": "technician@knowfact.com",
        "useful_count": 12,
        "days_ago": 8,
        "description": "Décalage progressif supérieur à 3 mm lors de la pose d'étiquettes code-barres sur cartons en sortie ligne.",
        "steps": [
            "Mettre la ligne en pause et vérifier la propreté du capteur optique de détection produit.",
            "Nettoyer le galet presseur en caoutchouc avec un chiffon non pelucheux et de l'alcool isopropylique.",
            "Contrôler la tension du film support d'étiquettes et ajuster le frein de bobine.",
            "Recalibrer le décalage d'avance sur l'IHM (paramètre Offset = 14 mm).",
            "Passer 5 cartons tests et vérifier le centrage et la lisibilité du code-barres au scanner.",
        ],
        "equipment": "Étiqueteuse automatique ETIQ-02, Chiffon non pelucheux, Alcool isopropylique, Scanner code-barres",
        "safety_notes": "Couper l'avance automatique avant d'intervenir près des rouleaux d'entraînement. Port des gants légers.",
        "tags": ["étiquetage", "conditionnement", "capteur", "alignement", "cond-01"],
    },
    {
        "title": "Perte de couple broche centre d'usinage CNC – alarme surcharge axe Z",
        "type": FicheType.problem_solution,
        "status": FicheStatus.published,
        "dept_code": "PROD",
        "ws_code": "L1",
        "author_email": "engineer@knowfact.com",
        "useful_count": 16,
        "days_ago": 5,
        "description": "Déclenchement de l'alarme surcharge axe Z lors des passes d'ébauche sur alliage aluminium.",
        "steps": [
            "Arrêter le cycle en cours et noter le code alarme affiché sur la commande numérique.",
            "Inspecter l'arête de coupe de la fraise carbure (recherche d'écaillage ou collage copeaux).",
            "Contrôler la pression et le débit de l'arrosage centre-broche (minimum 18 bar requis).",
            "Remplacer l'outil usé par un outil neuf et mesurer la jauge outil au banc de préréglage.",
            "Relancer le programme avec avance réduite à 80 % sur la première pièce puis contrôler la cote.",
        ],
        "equipment": "Centre CNC Ligne 1, Fraise carbure Ø16, Banc de préréglage outil, Pied à coulisse digital",
        "safety_notes": "Attendre l'arrêt complet de la broche et l'ouverture autorisée du carter. Lunettes et chaussures de sécurité obligatoires.",
        "tags": ["cnc", "usinage", "broche", "alarme", "surcharge", "outil"],
    },
    {
        "title": "Micro-arrêts répétés sur filmeuse automatique palette",
        "type": FicheType.problem_solution,
        "status": FicheStatus.validated,
        "dept_code": "PROD",
        "ws_code": "COND-01",
        "author_email": "engineer@knowfact.com",
        "useful_count": 7,
        "days_ago": 3,
        "description": "Ruptures fréquentes du film étirable pendant le cycle de banderolage haute vitesse.",
        "steps": [
            "Vérifier l'absence d'angles vifs ou de clous dépassant des palettes bois en entrée.",
            "Inspecter les rouleaux de pré-étirage pour détecter tout dépôt de colle ou entaille.",
            "Réduire le taux de pré-étirage de 250 % à 210 % sur le pupitre opérateur.",
            "Tester un cycle complet sur une palette chargée et vérifier la tenue de charge.",
        ],
        "equipment": "Filmeuse automatique, Film étirable 23 µm, Cutter de sécurité",
        "safety_notes": "Rester hors de la zone de rotation du bras pendant le cycle. Arrêt d'urgence testé.",
        "tags": ["filmeuse", "palette", "conditionnement", "film", "micro-arret"],
    },
    {
        "title": "Tâche opérateur : changement de bobine film et nettoyage têtes d'impression",
        "type": FicheType.task_post,
        "status": FicheStatus.published,
        "dept_code": "PROD",
        "ws_code": "COND-01",
        "author_email": "technician@knowfact.com",
        "useful_count": 9,
        "days_ago": 11,
        "description": "Tâche régulière de changement de consommables et entretien préventif de l'imprimante-poseuse.",
        "steps": [
            "Mettre l'imprimante hors ligne via le bouton Pause du pupitre.",
            "Retirer le mandrin vide et installer la nouvelle bobine en respectant le schéma de passage.",
            "Nettoyer la tête thermique d'impression avec un bâtonnet imbibé d'alcool isopropylique.",
            "Fermer le capot, remettre en ligne et imprimer une étiquette test.",
            "Consigner le changement de lot dans le cahier de poste.",
        ],
        "equipment": "Bobine étiquettes, Ruban transfert thermique, Bâtonnet nettoyage tête thermique",
        "safety_notes": "Laisser refroidir la tête thermique 2 minutes avant nettoyage pour éviter toute brûlure.",
        "tags": ["tache", "bobine", "impression", "conditionnement", "operateur"],
    },
    {
        "title": "Procédure de démarrage et mise en cadence Ligne de production 1",
        "type": FicheType.procedure,
        "status": FicheStatus.published,
        "dept_code": "PROD",
        "ws_code": "L1",
        "author_email": "engineer@knowfact.com",
        "useful_count": 15,
        "days_ago": 14,
        "description": "Gamme standardisée de mise en route sécurisée de la ligne d'usinage grande cadence en début d'équipe.",
        "steps": [
            "Vérifier le port complet des EPI (lunettes de protection, chaussures de sécurité, bouchons d'oreilles).",
            "Contrôler la propreté de la zone et l'absence d'outils oubliés dans les carters machines.",
            "Mettre sous tension l'armoire générale et réarmer les barrières immatérielles de sécurité.",
            "Vérifier le niveau d'huile de coupe (minimum 75 %) et la pression d'air réseau (6,5 bar).",
            "Exécuter le cycle de préchauffage broche pendant 10 minutes à vide.",
            "Produire 2 pièces prototypes et valider les cotes critiques au poste de contrôle.",
            "Passer en mode automatique cadence nominale.",
        ],
        "equipment": "Pupitre IHM Ligne 1, Réfractomètre huile de coupe, Pied à coulisse",
        "safety_notes": "Ne jamais shunter les sécurités portes ou barrières immatérielles. EPI auditifs obligatoires (>82 dB).",
        "tags": ["demarrage", "ligne-1", "production", "procedure", "prechauffage"],
    },
    {
        "title": "Procédure de nettoyage et contrôle inter-lots poste conditionnement",
        "type": FicheType.procedure,
        "status": FicheStatus.published,
        "dept_code": "PROD",
        "ws_code": "COND-01",
        "author_email": "expert@knowfact.com",
        "useful_count": 10,
        "days_ago": 12,
        "description": "Procédure obligatoire de vide de ligne entre deux références clients pour éviter tout mélange de lots.",
        "steps": [
            "Stopper l'alimentation de la ligne et évacuer les derniers cartons du lot terminé.",
            "Retirer toutes les étiquettes et notices restantes du lot précédent sur le poste.",
            "Nettoyer la table d'accumulation et les guides latéraux.",
            "Vérifier le nouveau numéro de lot et la conformité de l'ordre de fabrication.",
            "Faire viser la checklist de vide de ligne par le chef d'équipe avant redémarrage.",
        ],
        "equipment": "Checklist vide de ligne, Chiffons atelier, Bac de rebuts",
        "safety_notes": "Port des gants anti-coupure lors de la manipulation des cartons et feuillards.",
        "tags": ["inter-lot", "vide-de-ligne", "conditionnement", "qualite", "procedure"],
    },

    # =========================================================================
    # MAINTENANCE (MAINT) — 6 fiches
    # =========================================================================
    {
        "title": "Défaut variateur de fréquence F0022 sur banc d'essais électriques",
        "type": FicheType.problem_solution,
        "status": FicheStatus.published,
        "dept_code": "MAINT",
        "ws_code": "ELEC-01",
        "author_email": "technician@knowfact.com",
        "useful_count": 14,
        "days_ago": 6,
        "description": "Déclenchement du code défaut F0022 (surintensité matérielle) lors des rampes d'accélération rapides.",
        "steps": [
            "Consigner l'alimentation amont du variateur et attendre 5 minutes la décharge complète des condensateurs du bus DC.",
            "Vérifier l'isolement des phases moteur U/V/W au mégohmmètre (> 100 MΩ attendu).",
            "Contrôler le serrage des bornes de puissance moteur et l'absence de point chaud.",
            "Vérifier le temps de rampe d'accélération (paramètre P1120) et le porter de 1,5 s à 3,0 s si charge inertielle.",
            "Réarmer le variateur et effectuer un test en charge progressive avec mesure à la pince ampèremétrique.",
        ],
        "equipment": "Multimètre True-RMS, Mégohmmètre 500V, Pince ampèremétrique, Tournevis isolé 1000V",
        "safety_notes": "Habilitation électrique BR/B2V exigée. Attendre la décharge complète du bus continu et vérifier l'absence de tension (VAT).",
        "tags": ["variateur", "f0022", "surintensite", "electrique", "diagnostic"],
    },
    {
        "title": "Échauffement réducteur mécanique convoyeur et fuite joint spi",
        "type": FicheType.problem_solution,
        "status": FicheStatus.published,
        "dept_code": "MAINT",
        "ws_code": "MEC-01",
        "author_email": "technician@knowfact.com",
        "useful_count": 11,
        "days_ago": 9,
        "description": "Température carter réducteur supérieure à 80°C avec suintement d'huile au niveau de l'arbre de sortie.",
        "steps": [
            "Arrêter le convoyeur, consigner le moteur et laisser refroidir le réducteur sous 45°C.",
            "Vidanger l'huile du réducteur et vérifier la présence éventuelle de limaille métallique.",
            "Extraire l'arbre de sortie et remplacer le joint à lèvre (joint spi) endommagé.",
            "Nettoyer le reniflard d'évent bouché par les poussières.",
            "Remplir avec de l'huile synthétique ISO VG 220 jusqu'au niveau hublot et surveiller la température pendant 1 heure.",
        ],
        "equipment": "Jeu de clés mixtes, Extracteur de joint, Bac de vidange, Huile ISO VG 220, Thermomètre IR",
        "safety_notes": "Port des gants résistants aux hydrocarbures et lunettes de protection. Risque de brûlure sur carter chaud.",
        "tags": ["reducteur", "echauffement", "joint", "fuite", "mecanique"],
    },
    {
        "title": "Tâche mensuelle : contrôle armoire électrique et resserrage borniers",
        "type": FicheType.task_post,
        "status": FicheStatus.published,
        "dept_code": "MAINT",
        "ws_code": "ELEC-01",
        "author_email": "engineer@knowfact.com",
        "useful_count": 13,
        "days_ago": 15,
        "description": "Inspection thermographique et maintenance préventive mensuelle des armoires de puissance.",
        "steps": [
            "Réaliser un scan thermographique en fonctionnement pour repérer tout échauffement anormal (> 65°C).",
            "Couper et consigner le sectionneur général puis effectuer la VAT (Vérification d'Absence de Tension).",
            "Aspirer les poussières et remplacer les filtres des ventilateurs d'armoire.",
            "Contrôler et resserrer au couple les borniers de puissance et contacteurs.",
            "Vérifier le bon fonctionnement des voyants, arrêts d'urgence et relais de sécurité.",
        ],
        "equipment": "Caméra thermique, Vérificateur d'absence de tension (VAT), Tournevis dynamométrique isolé, Aspirateur antistatique",
        "safety_notes": "EPI arc-flash, gants isolants classe 00 et visière de protection obligatoires pour toute mesure sous tension.",
        "tags": ["armoire", "electrique", "thermographie", "preventif", "mensuel"],
    },
    {
        "title": "Tâche : contrôle et calibration des capteurs inductifs de fin de course",
        "type": FicheType.task_post,
        "status": FicheStatus.validated,
        "dept_code": "MAINT",
        "ws_code": "CONV-A",
        "author_email": "technician@knowfact.com",
        "useful_count": 6,
        "days_ago": 4,
        "description": "Vérification de la distance de détection et du serrage des capteurs inductifs M12 sur convoyeur.",
        "steps": [
            "Nettoyer la face active de chaque capteur inductif sur la ligne.",
            "Mesurer l'entrefer avec une cale d'épaisseur (distance cible : 1,5 à 2,5 mm).",
            "Contrôler l'allumage net de la LED témoin lors du passage de la came métallique.",
            "Vérifier l'intégrité des câbles M12 et resserrer les écrous de maintien.",
        ],
        "equipment": "Jeu de cales d'épaisseur, Clé plate 17 mm, Chiffon sec",
        "safety_notes": "Consigner l'entraînement du convoyeur avant toute manipulation mécanique sur les supports capteurs.",
        "tags": ["capteur", "inductif", "calibration", "convoyeur", "tache"],
    },
    {
        "title": "Procédure de consignation électrique et mécanique LOTO (PRO-MNT-012)",
        "type": FicheType.procedure,
        "status": FicheStatus.published,
        "dept_code": "MAINT",
        "ws_code": "ELEC-01",
        "author_email": "expert@knowfact.com",
        "useful_count": 21,
        "days_ago": 22,
        "description": "Procédure obligatoire de mise en sécurité multi-énergies avant toute intervention de maintenance.",
        "steps": [
            "Informer le responsable de ligne et arrêter l'équipement via l'arrêt normal de cycle.",
            "Identifier toutes les sources d'énergie (électrique, pneumatique, hydraulique, gravitaire).",
            "Ouvrir le sectionneur général, fermer la vanne d'air comprimé et purger les circuits résiduels.",
            "Poser un cadenas personnel et une étiquette nominative sur chaque organe de séparation.",
            "Effectuer la Vérification d'Absence de Tension (VAT) et vérifier le manomètre à 0 bar.",
            "Tenter une commande de démarrage pour confirmer l'impossibilité de mise en mouvement.",
        ],
        "equipment": "Kit LOTO personnel, Cadenas consignation, Mâchoire multi-cadenas, Vérificateur d'absence de tension (VAT)",
        "safety_notes": "Un intervenant = un cadenas personnel unique. Ne jamais retirer le cadenas d'un collègue.",
        "tags": ["loto", "consignation", "securite", "maintenance", "vat", "procedure"],
    },
    {
        "title": "Procédure de remplacement et alignement laser d'accouplement moteur",
        "type": FicheType.procedure,
        "status": FicheStatus.published,
        "dept_code": "MAINT",
        "ws_code": "MEC-01",
        "author_email": "engineer@knowfact.com",
        "useful_count": 11,
        "days_ago": 17,
        "description": "Méthode précise de remplacement des étoiles élastiques et alignement d'arbre au comparateur laser.",
        "steps": [
            "Consigner le moteur (procédure LOTO) et déposer le carter de protection d'accouplement.",
            "Desserrer les boulons de fixation moteur et inspecter l'état des moyeux et de l'étoile élastique.",
            "Monter l'étoile neuve et fixer les capteurs laser sur les deux arbres.",
            "Corriger le désalignement vertical par cales calibrées en inox sous les pattes du moteur.",
            "Corriger le désalignement horizontal jusqu'à rester sous 0,05 mm et 0,05°.",
            "Serrer au couple les vis de fixation, reposer le carter et réaliser un contrôle vibratoire après 15 min.",
        ],
        "equipment": "Kit d'alignement laser, Jeu de cales inox calibrées, Clé dynamométrique, Étoile élastique neuve",
        "safety_notes": "Port des gants de manutention, lunettes et chaussures de sécurité. Remettre le carter tournant avant essai.",
        "tags": ["alignement", "laser", "accouplement", "moteur", "procedure"],
    },

    # =========================================================================
    # QUALITÉ (QUAL) — 6 fiches
    # =========================================================================
    {
        "title": "Dérive dimensionnelle hors tolérance sur diamètre alésage ±0,02 mm",
        "type": FicheType.problem_solution,
        "status": FicheStatus.published,
        "dept_code": "QUAL",
        "ws_code": "LAB-01",
        "author_email": "expert@knowfact.com",
        "useful_count": 14,
        "days_ago": 7,
        "description": "Dérive progressive de +0,025 mm observée sur la carte de contrôle SPC après 120 pièces usinées.",
        "steps": [
            "Bloquer immédiatement le lot en cours depuis le dernier contrôle conforme (traçabilité bac rouge).",
            "Contrôler la température du fluide d'arrosage (cible 20°C ± 2°C) et la dérive thermique broche.",
            "Vérifier l'usure en dépouille de la plaquette d'alésage à la loupe binoculaire.",
            "Appliquer une correction d'usure de -0,020 mm sur le correcteur géométrique CNC.",
            "Mesurer 3 pièces consécutives au micromètre d'intérieur 3 touches avant libération du poste.",
        ],
        "equipment": "Micromètre d'intérieur 3 touches, Bague étalon certifiée, Loupe binoculaire, Bac rouge non-conforme",
        "safety_notes": "Manipuler les pièces usinées avec gants anti-coupure (bavures possibles). Respecter les règles de zone métrologie.",
        "tags": ["derive", "alesage", "tolerance", "spc", "qualite", "metrologie"],
    },
    {
        "title": "Rayures superficielles détectées au contrôle visuel en fin de ligne",
        "type": FicheType.problem_solution,
        "status": FicheStatus.published,
        "dept_code": "QUAL",
        "ws_code": "CTRL-01",
        "author_email": "engineer@knowfact.com",
        "useful_count": 8,
        "days_ago": 10,
        "description": "Apparition de micro-rayures linéaires sur faces polies lors du transfert vers le poste CTRL-01.",
        "steps": [
            "Isoler les pièces impactées et évaluer la profondeur selon la panoplies de défauts acceptables.",
            "Inspecter les goulottes de transfert et bandes de guidage pour détecter un copeau coincé.",
            "Nettoyer ou remplacer les patins en téflon (PTFE) usés sur la glissière d'évacuation.",
            "Valider 10 pièces sans défaut sous rampe d'éclairage 1000 lux avant reprise normale.",
        ],
        "equipment": "Rampe éclairage contrôle 1000 lux, Panoplies défauts limites, Patins PTFE neufs",
        "safety_notes": "Veiller à l'ergonomie du poste et au port des gants coton propres pour ne pas marquer les pièces.",
        "tags": ["rayure", "controle-visuel", "defaut", "aspect", "qualite"],
    },
    {
        "title": "Tâche quotidienne : vérification des calibres et micromètres avant prise de poste",
        "type": FicheType.task_post,
        "status": FicheStatus.published,
        "dept_code": "QUAL",
        "ws_code": "LAB-01",
        "author_email": "expert@knowfact.com",
        "useful_count": 11,
        "days_ago": 13,
        "description": "Contrôle rapide de validité métrologique et mise à zéro des instruments de mesure en début de poste.",
        "steps": [
            "Vérifier la date de validité sur l'étiquette d'étalonnage de chaque instrument.",
            "Nettoyer les touches de mesure avec un papier optique sec.",
            "Contrôler le zéro sur cale étalon de référence (tolérance ±0,002 mm).",
            "Écarter immédiatement tout instrument présentant un jeu mécanique ou une étiquette périmée.",
        ],
        "equipment": "Micromètres, Tampons lisses Entre/N'entre pas, Cales étalons, Papier optique",
        "safety_notes": "Manipuler les cales étalons avec gants fins pour éviter l'oxydation et la dilatation thermique.",
        "tags": ["metrologie", "calibre", "micrometre", "quotidien", "qualite"],
    },
    {
        "title": "Tâche hebdomadaire : audit 5S laboratoire et revue des bacs non conformes",
        "type": FicheType.task_post,
        "status": FicheStatus.published,
        "dept_code": "QUAL",
        "ws_code": "CTRL-01",
        "author_email": "expert@knowfact.com",
        "useful_count": 7,
        "days_ago": 16,
        "description": "Revue hebdomadaire de la zone de quarantaine qualité et contrôle du rangement 5S.",
        "steps": [
            "Inventorier toutes les pièces présentes dans les bacs rouges de quarantaine.",
            "Vérifier que chaque pièce bloquée possède une fiche de non-conformité (FNC) renseignée.",
            "Planifier les décisions de tri, retouche ou mise au rebut avec le responsable production.",
            "Renseigner la grille de score 5S et afficher le résultat sur le panneau qualité.",
        ],
        "equipment": "Grille audit 5S, Étiquettes FNC rouges, Registre quarantaine",
        "safety_notes": "Port des chaussures de sécurité et gants lors de la manipulation des bacs métalliques.",
        "tags": ["5s", "audit", "quarantaine", "non-conforme", "qualite"],
    },
    {
        "title": "Procédure de traitement d'une non-conformité produit et blocage de lot",
        "type": FicheType.procedure,
        "status": FicheStatus.published,
        "dept_code": "QUAL",
        "ws_code": "LAB-01",
        "author_email": "expert@knowfact.com",
        "useful_count": 17,
        "days_ago": 20,
        "description": "Protocole complet d'isolement, d'analyse cause racine (8D/5 Pourquoi) et de dérogation éventuelle.",
        "steps": [
            "Stopper immédiatement la fabrication ou l'expédition dès détection d'un écart critique.",
            "Identifier physiquement le lot suspect avec une étiquette rouge « PRODUIT BLOQUÉ » et le transférer en zone quarantaine.",
            "Remonter au dernier contrôle conforme pour délimiter l'étendue exacte du lot impacté.",
            "Ouvrir une Fiche de Non-Conformité (FNC) avec photos, cotes mesurées et numéro d'OF.",
            "Réaliser un tri à 100 % et lancer l'analyse des causes racines (5 Pourquoi).",
            "Valider l'action corrective et l'efficacité sur les 3 lots suivants avant clôture.",
        ],
        "equipment": "Étiquettes rouges PRODUIT BLOQUÉ, Zone quarantaine fermée, Pied à coulisse, Formulaire FNC",
        "safety_notes": "Aucune pièce non identifiée ne doit quitter la zone quarantaine sans signature du Responsable Qualité.",
        "tags": ["non-conformite", "fnc", "quarantaine", "blocage", "8d", "procedure"],
    },
    {
        "title": "Procédure d'étalonnage spectromètre et validation échantillon témoin",
        "type": FicheType.procedure,
        "status": FicheStatus.validated,
        "dept_code": "QUAL",
        "ws_code": "LAB-01",
        "author_email": "engineer@knowfact.com",
        "useful_count": 6,
        "days_ago": 4,
        "description": "Mode opératoire de standardisation quotidienne du spectromètre d'émission optique avant analyse alliages.",
        "steps": [
            "Vérifier la pression de la bouteille d'argon haute pureté (> 30 bar) et la purge optique.",
            "Préparer la surface de l'échantillon témoin certifié sur la meuleuse à bande.",
            "Nettoyer l'électrode tungstène avec la brosse laiton dédiée.",
            "Effectuer 3 étincelages sur l'échantillon de recalibration et vérifier un écart-type < 1,5 %.",
            "Enregistrer le certificat de conformité journalier dans le logiciel laboratoire.",
        ],
        "equipment": "Spectromètre OES, Échantillon témoin certifié, Bouteille Argon 5.0, Brosse électrode",
        "safety_notes": "Port des lunettes filtrantes UV et protection auditive lors du meulage de préparation. Ventilation locale active.",
        "tags": ["spectrometre", "etalonnage", "laboratoire", "argon", "qualite"],
    },

    # =========================================================================
    # LOGISTIQUE (LOG) — 6 fiches
    # =========================================================================
    {
        "title": "Écart d'inventaire récurrent sur références critiques kitting",
        "type": FicheType.problem_solution,
        "status": FicheStatus.published,
        "dept_code": "LOG",
        "ws_code": "MAG-01",
        "author_email": "admin@knowfact.com",
        "useful_count": 10,
        "days_ago": 9,
        "description": "Différences de stock physique vs ERP constatées lors de la préparation des kits d'assemblage.",
        "steps": [
            "Bloquer les mouvements informatiques sur la référence concernée le temps du comptage tournant.",
            "Recompter physiquement les bacs de picking et les emplacements de réserve haute.",
            "Analyser l'historique des 15 derniers mouvements (rechercher les prélèvements non scannés ou doubles scans).",
            "Vérifier l'étiquetage des bacs voisins (risque de confusion entre codes proches).",
            "Effectuer la régularisation ERP validée par le responsable magasin et apposer un détrompeur visuel.",
        ],
        "equipment": "Terminal RF portable (douchette code-barres), Balance compteuse de précision, Terminal ERP",
        "safety_notes": "Utiliser un escabeau sécurisé ou une nacelle pour tout contrôle sur les niveaux supérieurs de rayonnage.",
        "tags": ["inventaire", "stock", "kitting", "erp", "magasin", "logistique"],
    },
    {
        "title": "Blocage niveleur de quai hydraulique lors du déchargement",
        "type": FicheType.problem_solution,
        "status": FicheStatus.published,
        "dept_code": "LOG",
        "ws_code": "QUAI-REC",
        "author_email": "technician@knowfact.com",
        "useful_count": 12,
        "days_ago": 6,
        "description": "Le tablier du niveleur reste bloqué en position haute ou la lèvre refuse de se déployer.",
        "steps": [
            "Interrompre le déchargement et sécuriser le quai avec les cônes et barrière de quai.",
            "Vérifier que la porte sectionnelle est bien ouverte en fin de course haute (contact de sécurité).",
            "Inspecter l'articulation de la lèvre pour retirer tout débris de palette bois ou film plastique.",
            "Vérifier le niveau d'huile du groupe hydraulique et appuyer sur le bouton Reset du coffret de commande.",
            "Si le blocage persiste, consigner le quai et appeler la maintenance (ne jamais forcer mécaniquement).",
        ],
        "equipment": "Coffret commande quai, Cônes de signalisation, Barre de calage sécurité",
        "safety_notes": "Ne jamais passer sous un niveleur de quai sans avoir engagé la béquille mécanique de maintenance.",
        "tags": ["quai", "niveleur", "hydraulique", "dechargement", "logistique"],
    },
    {
        "title": "Tâche quotidienne : contrôle sécurité des chariots élévateurs avant prise de poste",
        "type": FicheType.task_post,
        "status": FicheStatus.published,
        "dept_code": "LOG",
        "ws_code": "QUAI-REC",
        "author_email": "admin@knowfact.com",
        "useful_count": 15,
        "days_ago": 11,
        "description": "Vérification réglementaire journalière avant toute utilisation d'un chariot frontal ou rétractable.",
        "steps": [
            "Contrôler l'état des fourches, du tablier porte-fourches et des chaînes de levage (absence de fissure).",
            "Vérifier l'état des bandages / pneus et l'absence de fuite hydraulique sous le chariot.",
            "Tester les freins de service, le frein de parking, le klaxon, le gyrophare et le feu bleu (Blue Spot).",
            "Contrôler le niveau de charge batterie (> 30 %) ou l'état des raccords gaz.",
            "Valider la checklist embarquée et signaler tout défaut avant de rouler.",
        ],
        "equipment": "Chariot élévateur CACES 3/5, Fiche contrôle journalier, Chiffon",
        "safety_notes": "CACES valide et ceinture de sécurité obligatoires. Interdiction formelle d'utiliser un chariot ayant un défaut de frein ou de direction.",
        "tags": ["chariot", "caces", "securite", "quotidien", "logistique"],
    },
    {
        "title": "Tâche : préparation et contrôle kit composants pour lancement production",
        "type": FicheType.task_post,
        "status": FicheStatus.published,
        "dept_code": "LOG",
        "ws_code": "MAG-01",
        "author_email": "technician@knowfact.com",
        "useful_count": 8,
        "days_ago": 13,
        "description": "Préparation physique des composants en bacs normalisés selon la liste à servir de l'OF.",
        "steps": [
            "Éditer la liste à servir (picking list) correspondant à l'ordre de fabrication prioritaire.",
            "Prélever chaque référence en respectant strictement la règle FIFO (First In, First Out).",
            "Scanner chaque bac et vérifier la quantité exacte par pesée ou comptage.",
            "Déposer le chariot de kitting sur la zone tampon ligne et valider le transfert dans l'ERP.",
        ],
        "equipment": "Douchette RF, Chariot kitting, Balance compteuse, Liste à servir",
        "safety_notes": "Respecter les limites de port de charge (< 20 kg) et charger les bacs lourds en partie basse du chariot.",
        "tags": ["kitting", "picking", "fifo", "magasin", "logistique"],
    },
    {
        "title": "Procédure de réception marchandises, contrôle BL et mise en quarantaine",
        "type": FicheType.procedure,
        "status": FicheStatus.published,
        "dept_code": "LOG",
        "ws_code": "QUAI-REC",
        "author_email": "admin@knowfact.com",
        "useful_count": 13,
        "days_ago": 18,
        "description": "Processus standardisé de contrôle physique et documentaire des livraisons fournisseurs au quai.",
        "steps": [
            "Vérifier l'intégrité des scellés, des emballages et noter toute réserve précise sur le récépissé transporteur.",
            "Comparer les quantités reçues et références avec le Bon de Livraison (BL) et la commande d'achat.",
            "Vérifier la présence du certificat matière 3.1 pour les lots soumis à contrôle d'entrée.",
            "Apposer l'étiquette traçabilité interne avec date de réception et numéro de lot.",
            "Placer les lots nécessitant contrôle métrologie en zone « Attente Contrôle Qualité ».",
            "Valider l'entrée en stock informatique sous 2 heures maximum.",
        ],
        "equipment": "Douchette RF, Étiqueteuse réception, Transpalette électrique, Tampon réserves",
        "safety_notes": "Gilet haute visibilité et chaussures coquées obligatoires en zone quai. Vérifier le calage des roues camion avant entrée.",
        "tags": ["reception", "bl", "tracabilite", "quarantaine", "quai", "procedure"],
    },
    {
        "title": "Procédure de chargement sécurisé et calage remorque au quai",
        "type": FicheType.procedure,
        "status": FicheStatus.published,
        "dept_code": "LOG",
        "ws_code": "QUAI-REC",
        "author_email": "admin@knowfact.com",
        "useful_count": 9,
        "days_ago": 19,
        "description": "Consignes impératives de sécurité et d'arrimage avant le départ d'un poids lourd.",
        "steps": [
            "Confirmer la mise en place des cales de roue et le blocage du frein de parc auprès du chauffeur.",
            "Consigner les clés du tracteur au poste quai et basculer le feu de signalisation quai au rouge.",
            "Déployer le niveleur de quai et vérifier la portance du plancher de la remorque.",
            "Répartir les palettes en équilibrant les masses par essieu et poser les sangles/barres d'arrimage.",
            "Relever le niveleur, fermer la porte de quai, puis restituer les clés et passer le feu au vert.",
        ],
        "equipment": "Cales de roue caoutchouc, Sangles d'arrimage, Cadenas/boîtier clés chauffeur, Transpalette",
        "safety_notes": "Aucun chariot ne doit entrer dans la remorque tant que les cales ne sont pas posées et le feu de quai rouge actif.",
        "tags": ["chargement", "arrimage", "quai", "camion", "securite", "procedure"],
    },

    # =========================================================================
    # HSE — Hygiène, Sécurité, Environnement (HSE) — 6 fiches
    # =========================================================================
    {
        "title": "Déclenchement alarme pH haut à la station de traitement des effluents",
        "type": FicheType.problem_solution,
        "status": FicheStatus.published,
        "dept_code": "HSE",
        "ws_code": "HSE-ENV",
        "author_email": "expert@knowfact.com",
        "useful_count": 13,
        "days_ago": 5,
        "description": "Alarme pH > 9,2 sur le bassin de neutralisation final avant rejet réseau.",
        "steps": [
            "Fermer immédiatement la vanne de rejet vers le réseau extérieur (mise en recirculation interne).",
            "Contrôler la sonde pH en plongeant une électrode portable étalonnée dans le bassin.",
            "Si le pH élevé est confirmé, vérifier l'amorçage de la pompe doseuse d'acide sulfurique dilué et le niveau du bac réactif.",
            "Nettoyer et recalibrer la sonde pH fixe dans les solutions tampons pH 7 et pH 10.",
            "Ne rouvrir le rejet qu'après stabilisation durable entre pH 6,5 et 8,5 pendant 20 minutes.",
        ],
        "equipment": "pH-mètre portable étalonné, Solutions tampons pH 7 / 10, Kit EPI chimie",
        "safety_notes": "Port obligatoire de la visière anti-projection, tablier chimique, gants nitrile longs et lunettes-masque près des bacs acide/base.",
        "tags": ["effluents", "ph", "alarme", "station", "environnement", "hse"],
    },
    {
        "title": "Fuite mineure d'huile de coupe dans zone stockage fûts",
        "type": FicheType.problem_solution,
        "status": FicheStatus.published,
        "dept_code": "HSE",
        "ws_code": "HSE-ENV",
        "author_email": "technician@knowfact.com",
        "useful_count": 9,
        "days_ago": 8,
        "description": "Écoulement d'huile soluble détecté autour d'un robinet de soutirage sur palette de rétention.",
        "steps": [
            "Équiper les EPI (gants nitrile, lunettes, chaussures antidérapantes) et baliser la flaque au sol.",
            "Déployer les boudins absorbants du kit antipollution le plus proche pour contenir l'écoulement vers les grilles d'eaux pluviales.",
            "Refermer ou remplacer le robinet défectueux et transférer le fût si nécessaire.",
            "Épandre le granulé absorbant minéral, balayer et jeter les souillures dans le fût déchets dangereux (DID).",
        ],
        "equipment": "Kit antipollution (boudins + feuilles absorbantes), Granulés absorbants, Pelle anti-étincelle, Fût DID",
        "safety_notes": "Ne jamais rincer une fuite d'huile à l'eau vers les égouts. Risque de glissade : signaler tant que le sol n'est pas sec.",
        "tags": ["fuite", "huile", "antipollution", "retention", "did", "hse"],
    },
    {
        "title": "Tâche mensuelle : inspection des douches de sécurité, rince-œil et extincteurs",
        "type": FicheType.task_post,
        "status": FicheStatus.published,
        "dept_code": "HSE",
        "ws_code": "HSE-01",
        "author_email": "admin@knowfact.com",
        "useful_count": 18,
        "days_ago": 10,
        "description": "Vérification mensuelle du bon fonctionnement des dispositifs de premiers secours et moyens de lutte incendie.",
        "steps": [
            "Vérifier l'accessibilité libre (rayon de 1 m dégagé) autour de chaque extincteur, RIA et douche de sécurité.",
            "Contrôler la présence du plomb de sécurité et l'aiguille du manomètre dans la zone verte des extincteurs.",
            "Actionner les rince-œil pendant 30 secondes pour vérifier le débit, la clarté de l'eau et purger la conduite.",
            "Contrôler les dates de péremption des flacons rince-œil portatifs et du contenu des trousses de secours.",
            "Signer la fiche de contrôle accrochée à chaque équipement et déclarer toute anomalie le jour même.",
        ],
        "equipment": "Seau gradué de test, Fiche d'inspection mensuelle, Plombs de rechange, Trousse secours",
        "safety_notes": "Remplacer immédiatement tout flacon rince-œil entamé ou périmé. Signaler sans délai un extincteur dépressurisé.",
        "tags": ["extincteur", "rince-oeil", "douche-securite", "incendie", "mensuel", "hse"],
    },
    {
        "title": "Tâche hebdomadaire : vérification des bacs de rétention et tri sélectif déchets",
        "type": FicheType.task_post,
        "status": FicheStatus.validated,
        "dept_code": "HSE",
        "ws_code": "HSE-ENV",
        "author_email": "expert@knowfact.com",
        "useful_count": 7,
        "days_ago": 3,
        "description": "Contrôle hebdomadaire de l'étanchéité des bacs de rétention et du respect des filières de tri.",
        "steps": [
            "Inspecter visuellement les caillebotis et fonds de bacs de rétention (absence de liquide accumulé).",
            "Vérifier le taux de remplissage des bennes DIB, métaux, cartons et fûts DID.",
            "Contrôler l'étiquetage réglementaire (pictogrammes CLP) sur tous les contenants chimiques transvasés.",
            "Déclencher une demande d'enlèvement prestataire dès qu'un contenant atteint 80 % de capacité.",
        ],
        "equipment": "Lampe torche, Étiquettes CLP, Bordereaux suivi déchets (BSD)",
        "safety_notes": "Respecter strictement la séparation produits acides / bases / inflammables dans les zones de rétention.",
        "tags": ["dechets", "tri", "retention", "clp", "environnement", "hse"],
    },
    {
        "title": "Procédure d'intervention d'urgence en cas de déversement chimique",
        "type": FicheType.procedure,
        "status": FicheStatus.published,
        "dept_code": "HSE",
        "ws_code": "HSE-ENV",
        "author_email": "admin@knowfact.com",
        "useful_count": 19,
        "days_ago": 21,
        "description": "Conduite à tenir immédiatement face à un renversement accidentel de produit chimique dangereux.",
        "steps": [
            "Alerter les personnes à proximité, évacuer la zone immédiate et consulter la FDS (Fiche de Données de Sécurité) du produit.",
            "En cas de projection sur une personne : utiliser immédiatement la douche de sécurité / rince-œil pendant 15 minutes et alerter le SST.",
            "S'équiper des EPI chimiques adaptés (combinaison type 4, masque cartouche ABEK, gants nitrile, bottes).",
            "Barrer les regards d'évacuation avec les plaques d'obturation en caoutchouc et entourer la nappe avec les boudins absorbants.",
            "Absorber de l'extérieur vers le centre avec l'absorbant neutre adapté (jamais de sciure sur comburant/acide).",
            "Collecter les déchets souillés en fût étiqueté et rédiger le rapport d'incident HSE.",
        ],
        "equipment": "Kit déversement chimique complet, Plaques obturation regard, EPI chimiques ABEK, Classeur FDS",
        "safety_notes": "Ne jamais intervenir seul sur une nappe inconnue ou dégageant des vapeurs toxiques : appeler les pompiers (18 / 112).",
        "tags": ["urgence", "chimique", "deversement", "fds", "securite", "hse", "procedure"],
    },
    {
        "title": "Procédure d'évacuation incendie et point de rassemblement usine",
        "type": FicheType.procedure,
        "status": FicheStatus.published,
        "dept_code": "HSE",
        "ws_code": "HSE-01",
        "author_email": "admin@knowfact.com",
        "useful_count": 22,
        "days_ago": 25,
        "description": "Consignes d'évacuation générale du site industriel au déclenchement de la sirène incendie.",
        "steps": [
            "Dès le signal sonore d'alarme, mettre en sécurité rapide son poste (appui arrêt cycle machine si sans risque).",
            "Couper si possible les arrivées gaz/oxygène de proximité sans perdre de temps.",
            "Rejoindre calmement l'issue de secours balisée la plus proche sans courir ni revenir en arrière.",
            "Les guide-files conduisent les équipes au Point de Rassemblement Nord (Parking Visiteurs).",
            "Les serre-files vérifient l'évacuation complète des vestiaires, sanitaires et locaux techniques.",
            "Réaliser l'appel nominatif avec le registre des présences et attendre le feu vert officiel du responsable HSE.",
        ],
        "equipment": "Gilet jaune Guide-file / Serre-file, Registre des présences et visiteurs, Mégaphone",
        "safety_notes": "Interdiction absolue d'utiliser les ascenseurs ou monte-charges et de retourner chercher des effets personnels.",
        "tags": ["incendie", "evacuation", "alarme", "rassemblement", "urgence", "hse", "procedure"],
    },
]


def seed_catalog() -> dict[str, int]:
    init_db()
    db = SessionLocal()
    now = datetime.now(timezone.utc)

    users_by_email = {u.email: u for u in db.query(User).all()}
    depts_by_code = {d.code: d for d in db.query(Department).all()}
    ws_by_code = {w.code: w for w in db.query(Workstation).all() if w.code}

    expert = users_by_email.get("expert@knowfact.com") or next(iter(users_by_email.values()), None)

    created = 0
    skipped = 0

    for item in CATALOG_FICHES:
        existing = db.query(Fiche).filter(Fiche.title == item["title"]).first()
        if existing:
            skipped += 1
            continue

        author = users_by_email.get(item["author_email"]) or expert
        dept = depts_by_code.get(item["dept_code"])
        ws = ws_by_code.get(item["ws_code"])

        days_ago = item.get("days_ago", 5)
        status = item["status"]
        is_validated = status in (FicheStatus.validated, FicheStatus.published)
        is_published = status == FicheStatus.published

        fiche = Fiche(
            title=item["title"],
            type=item["type"],
            content=_make_content(
                description=item["description"],
                steps=item["steps"],
                tags=item["tags"],
                equipment=item["equipment"],
                safety_notes=item["safety_notes"],
            ),
            author_id=author.id,
            status=status,
            version=1,
            reviewed_by=expert.id if (is_validated and expert) else None,
            review_comment="Fiche technique vérifiée et validée." if is_validated else None,
            validated_at=(now - timedelta(days=days_ago)) if is_validated else None,
            published_at=(now - timedelta(days=max(days_ago - 1, 0))) if is_published else None,
            security_note=item["safety_notes"],
            useful_count=item.get("useful_count", 0),
            department_id=dept.id if dept else None,
            workstation_id=ws.id if ws else None,
        )
        db.add(fiche)
        db.flush()

        ver = FicheVersion(
            fiche_id=fiche.id,
            version_number=1,
            title=fiche.title,
            content=fiche.content,
            changed_by=author.id,
            status=VersionStatus.active,
            change_reason="Catalogue industriel initial",
        )
        db.add(ver)
        created += 1

    db.commit()
    db.close()
    print(f"seed_catalog complete: {created} created, {skipped} already existed.")
    return {"created": created, "skipped": skipped}


if __name__ == "__main__":
    seed_catalog()
