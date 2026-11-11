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

## 🏭 Nouvelle fonctionnalité : « Départements d'usine & Postes de travail »

Permet d'organiser toute l'usine par pôles opérationnels (Production, Maintenance, Qualité, Logistique, HSE), d'affecter les utilisateurs à des postes spécifiques, et de filtrer les fiches de connaissances et solutions par département.

### 🏢 Départements & Postes disponibles
- **Production (PROD)** : Ligne de production 1, Poste Conditionnement
- **Maintenance (MAINT)** : Atelier mécanique, Banc d'essais électriques
- **Qualité (QUAL)** : Laboratoire contrôle, Poste contrôle visuel
- **Logistique (LOG)** : Quai réception, Magasin central
- **HSE (HSE)** : Poste de garde & premiers secours, Station traitement effluents

### 🌐 Endpoints API — Départements & Postes

| Méthode | Route | Description | Rôles autorisés |
|---------|-------|-------------|-----------------|
| `GET` | `/api/departments/` | Liste tous les départements actifs avec leurs postes | Tous |
| `POST` | `/api/departments/` | Créer un département (nom, code, couleur, icône) | Admin |
| `GET` | `/api/departments/my` | Liste les affectations de l'utilisateur connecté | Tous |
| `GET` | `/api/departments/{id}` | Détail complet (membres, postes, nombre de fiches) | Tous |
| `PUT` | `/api/departments/{id}` | Modifier un département | Admin |
| `DELETE` | `/api/departments/{id}` | Désactiver un département (soft delete) | Admin |
| `GET` | `/api/departments/{id}/workstations` | Liste les postes d'un département | Tous |
| `POST` | `/api/departments/{id}/workstations` | Créer un poste de travail | Admin |
| `PUT` | `/api/departments/{id}/workstations/{ws_id}` | Modifier un poste de travail | Admin |
| `POST` | `/api/departments/{id}/members` | Affecter un utilisateur à un département/poste | Admin |
| `DELETE` | `/api/departments/{id}/members/{user_id}` | Retirer une affectation | Admin |

---

## 🏗️ Architecture du projet

```
knowfact/
├── backend/
│   ├── main.py                     # Initialisation, CORS, routers
│   ├── database.py                 # SQLite engine, init_db() avec auto-migrations
│   ├── models.py                   # User, Department, Workstation, UserDepartment, Fiche, ...
│   ├── schemas.py                  # Pydantic v2 (DepartmentOut, WorkstationOut, FicheOut...)
│   ├── auth.py                     # JWT + bcrypt + demo login
│   ├── seed.py                     # Données de démo avec fiches et départements
│   ├── tests/
│   │   ├── conftest.py             # Fixtures SQLite in-memory partagées
│   │   ├── test_improvements.py    # 7 tests d'amélioration de solution
│   │   └── test_departments.py     # 5 tests pour les départements et postes
│   └── routes/
│       ├── auth.py                 # /api/auth/*
│       ├── departments.py          # /api/departments/* (CRUD départements + postes + membres)
│       ├── fiches.py               # /api/fiches/* (CRUD + filtres départements)
│       ├── search.py               # /api/search (recherche full-text + filtre département)
│       └── users.py                # /api/users/*
└── frontend/
    └── src/
        ├── api/                    # client.ts, fiches.ts, auth.ts, departments.ts, search.ts
        ├── contexts/               # AuthContext.tsx, DepartmentContext.tsx
        ├── components/
        │   ├── ProposeImprovementModal.tsx
        │   ├── FicheCard.tsx       # Badge département avec couleur personnalisée
        │   ├── Sidebar.tsx         # Navigation structurée avec sous-sections par département
        │   └── StatusBadge.tsx
        ├── pages/
        │   ├── DepartmentDashboard.tsx # Vue département (membres, postes, fiches, vue opérateur)
        │   ├── DepartmentAdmin.tsx     # Gestion complète CRUD départements & postes (admin)
        │   ├── FicheDetail.tsx         # Badge département avec lien direct
        │   ├── FicheCreate.tsx         # Sélecteur département & poste
        │   ├── FicheList.tsx           # Filtre déroulant par département
        │   ├── Search.tsx              # Filtre par département dans la recherche
        │   ├── Dashboard.tsx           # Cartes d'accès rapide aux départements
        │   ├── Admin.tsx
        │   └── ...
        └── types/index.ts          # Types TypeScript complets
```
