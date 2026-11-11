# KnowFact 5.0 — Plateforme de gestion des connaissances industrielles

Plateforme web de capitalisation des connaissances industrielles : fiches problème/solution, fiches de poste, procédures, validation humaine, recherche full-text, historique des versions et **système d'amélioration collaborative des solutions existantes**.

---

## 🚀 Démarrage rapide

### 1. Backend (FastAPI + SQLite)

```powershell
cd backend
pip install -r requirements.txt
python seed.py          # Crée les utilisateurs, fiches et propositions d'amélioration de démo
uvicorn main:app --reload --port 8000
```

- API disponible sur → `http://localhost:8000`  
- Documentation Swagger interactive → `http://localhost:8000/docs`

#### Exécution des tests automatisés
```powershell
cd backend
python -m pytest tests/test_improvements.py -v
```

### 2. Frontend (React 18 + Vite + Tailwind + TypeScript)

```powershell
cd frontend
npm install
npm run dev
```

App disponible sur → `http://localhost:5173`

---

## 👤 Comptes de démonstration

Le sélecteur de rôle dans la barre latérale permet de basculer instantanément d'un profil à l'autre :

| Rôle | Email | Mot de passe | Permissions clés |
|------|-------|-------------|------------------|
| **Admin** | admin@knowfact.com | admin123 | Gestion utilisateurs, publication, archivage, validation |
| **Expert** | expert@knowfact.com | expert123 | Revue, comparaison (diff), validation/rejet des améliorations |
| **Ingénieur** | engineer@knowfact.com | engineer123 | Création, soumission, proposition d'amélioration de solutions |
| **Technicien** | technician@knowfact.com | technician123 | Création, proposition d'amélioration terrain |

---

## 💡 Nouvelle fonctionnalité : « Améliorer une solution existante »

Permet aux ingénieurs et techniciens d'optimiser les solutions déjà validées en production lorsque les méthodes sont obsolètes, incomplètes ou perfectibles.

### 🔄 Parcours utilisateur
1. **Découverte** : L'ingénieur/technicien consulte une fiche validée.
2. **Proposition** : Il clique sur **« Proposer une amélioration »** (formulaire pré-rempli avec le contenu actuel).
3. **Motif obligatoire** : Saisie obligatoire de la justification métier (gain de temps, correction d'erreur, sécurité accrue).
4. **Validation ou Brouillon** : Enregistrement en brouillon ou soumission en validation (`pending_review`).
5. **Continuité de service** : La version active reste en ligne avec un bandeau discret *« Une amélioration est en cours de validation par un expert »*.
6. **Revue experte & Diff côte-à-côte** : L'expert compare les versions avec mise en évidence des changements, consulte le motif et choisit :
   - **Valider** : Transaction atomique → la proposition devient v(N+1) active, l'ancienne passe en `superseded` (archivée consultable).
   - **Demander une correction** : Commentaire obligatoire retourné à l'auteur pour mise à jour (`to_correct`).
   - **Rejeter** : Motif obligatoire de rejet (`rejected`), la version active reste inchangée.
7. **Règle absolue d'anti-auto-validation** : Un auteur ne peut jamais valider sa propre proposition d'amélioration.

---

## 🌐 Endpoints API — Améliorations de solutions

| Méthode | Route | Description | Rôles autorisés |
|---------|-------|-------------|-----------------|
| `POST` | `/api/fiches/{id}/propose-improvement` | Crée une proposition d'amélioration (motif obligatoire si soumission) | Ingénieur, Technicien |
| `GET`  | `/api/fiches/improvements/mine` | Liste les améliorations proposées par l'utilisateur connecté | Tous (Auteur) |
| `GET`  | `/api/fiches/improvements/pending` | File des propositions en attente de validation | Expert, Admin |
| `GET`  | `/api/fiches/improvements/{version_id}/diff` | Comparaison détaillée côte à côte (diff) | Auteur, Expert, Admin |
| `PUT`  | `/api/fiches/improvements/{version_id}` | Mise à jour du brouillon ou re-soumission après correction | Auteur |
| `POST` | `/api/fiches/improvements/{version_id}/submit` | Soumission pour validation | Auteur |
| `POST` | `/api/fiches/improvements/{version_id}/review` | Valider / Demander correction / Rejeter (avec contrôle anti-auto-validation) | Expert, Admin (sauf auteur) |

---

## 🏗️ Architecture du projet

```
knowfact/
├── backend/
│   ├── main.py                     # Initialisation, CORS, routers
│   ├── database.py                 # SQLite engine, init_db() avec auto-migrations
│   ├── models.py                   # User, Fiche, FicheVersion, VersionReview, Attachment
│   ├── schemas.py                  # Pydantic v2 (FicheOut, VersionDiffOut, ImprovementProposalOut...)
│   ├── auth.py                     # JWT + bcrypt + demo login
│   ├── seed.py                     # Données de démo avec v1 active et v2 pending
│   ├── tests/
│   │   └── test_improvements.py    # Suite de tests Pytest (7 tests d'intégration complets)
│   └── routes/
│       ├── auth.py                 # /api/auth/*
│       ├── fiches.py               # /api/fiches/* (CRUD + workflow fiches + workflow améliorations)
│       ├── search.py               # /api/search
│       └── users.py                # /api/users/*
└── frontend/
    └── src/
        ├── api/                    # client.ts, fiches.ts, auth.ts
        ├── components/
        │   ├── ProposeImprovementModal.tsx  # Formulaire pré-rempli avec motif obligatoire
        │   ├── FicheCard.tsx
        │   ├── Sidebar.tsx                  # Navigation + switcher de rôle en un clic
        │   └── StatusBadge.tsx
        ├── pages/
        │   ├── FicheDetail.tsx              # Bandeau, bouton amélioration, historique versions
        │   ├── ImprovementReview.tsx        # Écran de revue côte à côte (Diff visuel)
        │   ├── MyPropositions.tsx           # Page "Mes propositions" pour l'ingénieur/technicien
        │   ├── PendingReviews.tsx           # File d'attente "À valider" pour les experts
        │   ├── Dashboard.tsx
        │   ├── FicheList.tsx
        │   └── Search.tsx
        └── types/index.ts          # Types TypeScript complets (VersionStatus, VersionDiff...)
```
