# Guide d'Installation et de Démarrage — KnowFact v1.0.0

## 1. Prérequis système

- **Système d'exploitation** : Windows 10 ou Windows 11 (64 bits)
- **Processeur** : Dual-Core x64 (Intel / AMD)
- **Mémoire vive (RAM)** : 4 Go minimum (8 Go recommandés)
- **Espace disque** : 700 Mo disponibles
- **Réseau** : Aucun accès Internet requis (application 100 % autonome)
- **Port local** : `8000` (utilisé uniquement en local sur `127.0.0.1`)

---

## 2. Méthode A — Installation classique (recommandée)

1. Ouvrez le dossier `01_Installateur_Windows\`.
2. Double-cliquez sur **`KnowFact-Setup-1.0.0.exe`**.
3. Si Windows Defender SmartScreen s'affiche, cliquez sur **« Informations complémentaires »** puis **« Exécuter quand même »**.
4. Choisissez le dossier d'installation et terminez l'assistant.
5. Lancez **KnowFact** depuis le raccourci créé sur le **Bureau** ou dans le **Menu Démarrer**.

---

## 3. Méthode B — Version portable (sans installation)

Utile pour une démonstration sur clé USB ou sur un poste sans droits administrateur :

1. Copiez le dossier `02_Version_Portable\` sur le poste ou la clé.
2. Double-cliquez sur **`Lancer_KnowFact.bat`** (ou directement `KnowFact\KnowFact.exe`).

---

## 4. Stockage des données & Sauvegarde

Au premier lancement, KnowFact initialise automatiquement un espace de données local dans le profil utilisateur Windows :

- **Dossier des données** : `%APPDATA%\knowfact-frontend\`
  - `knowfact.db` : base de données SQLite (utilisateurs, fiches, historiques, gamification)
  - `uploads\` : pièces jointes et documents associés aux fiches

### Sauvegarde / Restauration
Pour sauvegarder toutes les données de la plateforme :
1. Fermez complètement l'application KnowFact.
2. Copiez le fichier `knowfact.db` et le dossier `uploads\` situés dans `%APPDATA%\knowfact-frontend\` vers un emplacement sûr.

---

## 5. Résolution des incidents courants

| Symptôme | Cause probable | Solution |
|---|---|---|
| Message « Le serveur backend n'a pas pu démarrer » | Le port `8000` est déjà occupé par un autre programme | Fermez le programme utilisant le port `8000` ou redémarrez le PC, puis relancez KnowFact. |
| Blocage par l'antivirus au premier lancement | Le serveur local `knowfact-server.exe` est exécuté localement | Ajoutez une exception pour le dossier d'installation de KnowFact dans votre antivirus / pare-feu local. |
| Désinstallation | — | Utilisez *Paramètres Windows → Applications → KnowFact → Désinstaller*. (Les données utilisateur dans `%APPDATA%\knowfact-frontend` peuvent être conservées ou supprimées manuellement). |
