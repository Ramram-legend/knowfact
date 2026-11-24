# Fiche Produit Commerciale — KnowFact v1.0.0

## Capitalisez le savoir technique de votre usine, du bureau méthodes jusqu'au terrain

**KnowFact** est une plateforme logicielle industrielle de gestion des connaissances (Industrial Knowledge Management) conçue pour supprimer la perte de savoir-faire, accélérer les dépannages et fiabiliser l'exécution sur le terrain.

---

### Problématiques résolues

- **Départs à la retraite / turnover** : les diagnostics et astuces des techniciens seniors restent capturés, validés et accessibles.
- **Procédures trop longues ou illisibles en atelier** : transformation en 1 clic d'une procédure technique en **Fiche Opératoire Simplifiée** imprimable A4 avec EPI et points de contrôle.
- **Temps d'arrêt machine prolongés** : l'**Assistant IA intégré** retrouve immédiatement la bonne solution ou tâche à partir de symptômes en langage naturel.
- **Contraintes de confidentialité industrielle** : fonctionnement **100 % local / hors ligne** sur poste Windows, sans dépendance à un cloud externe.

---

### Piliers fonctionnels inclus dans KnowFact v1.0.0

1. **Base de connaissances structurée & validée** : Solutions techniques, Tâches opérationnelles et Procédures avec workflow Brouillon → Soumission → Validation Expert → Publication.
2. **Générateur de Fiches Opératoires Simplifiées** : Structuration automatique en 5 blocs (En-tête, Infos & EPI, Étapes visuelles avec points de contrôle, Sécurité, Validation & signatures) + Mode Terrain + Export PDF / Impression A4.
3. **Assistant IA Recherche Solutions & Tâches** : Compréhension sémantique locale avec synonymes industriels, synthèse des étapes et alertes sécurité, disponible en widget flottant et plein écran.
4. **Organisation multi-départements** : Production, Maintenance, Qualité, Logistique, HSE et gestion des postes de travail.
5. **Amélioration continue versionnée** : Proposition de révisions avec comparaison avant/après et revue par les experts.
6. **Gamification & Engagement équipes** : Points, niveaux, badges et classement pour stimuler la contribution terrain.

---

### Spécifications techniques

- **Déploiement** : Logiciel Windows autonome (`KnowFact-Setup-1.0.0.exe` ou version portable)
- **Base de données** : SQLite locale chiffrable / sauvegardable par simple copie
- **Sécurité d'accès** : Authentification JWT, mots de passe hachés bcrypt, séparation stricte par rôles (RBAC)
- **Données préchargées (démo)** : 5 départements, 11 postes de travail, 44 fiches industrielles réalistes prêtes pour démonstration client.
