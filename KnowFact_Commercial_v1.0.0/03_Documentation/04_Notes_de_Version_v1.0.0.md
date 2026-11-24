# Notes de Version — KnowFact v1.0.0

**Date :** 24 novembre 2026  
**Statut :** Version commerciale initiale (Windows x64)

---

## Nouveautés majeures de la version 1.0.0

### 1. Logiciel Desktop Windows autonome
- Packaging complet sous **Electron** avec serveur backend Python/FastAPI compilé (`knowfact-server.exe`).
- Installateur Windows NSIS (`KnowFact-Setup-1.0.0.exe`) et édition portable sans installation.
- Persistance automatique des données dans `%APPDATA%\knowfact-frontend\`.

### 2. Génération & Exportation de Fiches Opératoires Simplifiées
- Bouton dédié **« Générer une fiche opératoire »** sur chaque procédure.
- Synthèse automatique en sections A à E (En-tête, EPI & outillage, Étapes numérotées + points de contrôle, Sécurité, Checklist & signatures).
- Édition directe, **Mode Terrain** haute lisibilité et mise en page d'impression A4 professionnelle.

### 3. Assistant IA de Recherche (Solutions, Tâches & Procédures)
- Moteur local hors ligne (BM25 + thesaurus de synonymes industriels FR/EN + détection d'intention + suivi conversationnel).
- Widget flottant global accessible sur toutes les pages + page dédiée `/assistant` + passerelle depuis la page Recherche.

### 4. Base industrielle de démonstration enrichie (44 fiches)
- Couverture complète des 5 départements (**Maintenance, Production, Qualité, Logistique, HSE**) et de 11 postes de travail.
- Inclusion de solutions techniques, tâches récurrentes et procédures prêtes à imprimer en fiches opératoires.

### 5. Socle plateforme complet
- Gestion des départements & postes, propositions d'amélioration avec diff de versions, notifications et gamification.
