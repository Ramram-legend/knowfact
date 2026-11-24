# Manuel Utilisateur — KnowFact v1.0.0

## 1. Rôles et gouvernance du savoir

KnowFact structure la validation des connaissances industrielles autour de 5 profils :

- **Opérateur (`operator`)** : consulte les fiches publiées/validées, utilise l'Assistant IA et les fiches opératoires terrain, signale l'utilité des fiches.
- **Technicien (`technician`)** : crée et soumet des fiches d'expérience, propose des améliorations sur les fiches existantes.
- **Ingénieur (`engineer`)** : rédige des procédures, solutions et fiches opératoires simplifiées, ajuste les gammes.
- **Expert (`expert`)** : relit, valide, demande des corrections ou publie officiellement les fiches et propositions d'amélioration.
- **Administrateur (`admin`)** : gère les utilisateurs, les départements, les postes de travail et les règles de gamification.

---

## 2. Les 3 types de fiches

1. **Solution technique (`problem_solution`)** : diagnostic, symptômes, cause racine, résolution étape par étape et équipements associés.
2. **Tâche opérationnelle (`task_post`)** : contrôles début de poste, maintenance préventive, audits, checklists récurrentes.
3. **Procédure (`procedure`)** : mode opératoire officiel et consignes de sécurité structurées.

---

## 3. Génération de Fiches Opératoires Simplifiées

Disponible depuis toute fiche de type **Procédure** :

1. Ouvrez une procédure et cliquez sur **« Générer une fiche opératoire »**.
2. La plateforme génère automatiquement une fiche visuelle destinée au terrain comprenant :
   - **A. En-tête** : entreprise, titre de l'opération, référence (`FO-...`), département, poste, version.
   - **B. Informations essentielles** : objectif, équipements/outils, **EPI obligatoires** avec badges visuels, prérequis.
   - **C. Étapes de réalisation** : blocs numérotés avec titre court, instruction claire et point de contrôle (`✓`).
   - **D. Sécurité** : risques principaux, précautions, interdictions, conduite en cas d'anomalie.
   - **E. Validation finale** : checklist de fin d'opération et zones de signature opérateur / responsable.
3. Utilisez le **Mode Terrain** (affichage grand format atelier), modifiez/enregistrez les champs si besoin, ou cliquez sur **Imprimer / Exporter PDF** (mise en page A4 dédiée).

---

## 4. Assistant IA de Recherche (Solutions, Tâches & Procédures)

Accessible partout via le bouton flottant **« Assistant IA »** (en bas à droite) ou via le menu **Assistant IA** :

- Posez une question en langage naturel (ex. *« Vibration anormale pompe P-102 »*, *« Quelles tâches en Maintenance ? »*, *« Procédure déversement chimique HSE »*).
- Filtrez par catégorie (**Tout / Solutions / Tâches / Procédures**) et par **Département**.
- L'assistant comprend les synonymes techniques industriels, résume les étapes clés et les consignes de sécurité, affiche un score de pertinence et propose des questions de suivi cliquables.

---

## 5. Départements, Propositions d'amélioration & Gamification

- **Départements & Postes** : tableaux de bord dédiés (*Production, Maintenance, Qualité, Logistique, HSE*) avec filtrage par poste de travail.
- **Amélioration continue** : depuis une fiche publiée, proposez une version améliorée qui passe par un diff comparatif avant validation par l'Expert.
- **Gamification** : points, niveaux, badges et classement récompensent le partage de solutions utiles et de procédures validées.
