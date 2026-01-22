# Message de Commit pour GitHub

Voici le message de commit recommandé :

```
Refactor: Migration vers Docker Compose et réorganisation du projet

- Réorganisation en dossiers frontend/ et backend/ séparés
- Migration de Podman/Buildah vers Docker Compose
- Suppression de tous les fichiers et scripts liés à Podman/Buildah
- Ajout de Dockerfiles optimisés pour chaque service
- Mise à jour de docker-compose.yml pour la nouvelle structure
- Ajout de scripts de migration et d'installation Docker
- Exclusion des fichiers de données locales du repo Git
- Nettoyage complet des fichiers obsolètes
- Documentation mise à jour (README, guides de migration)

Changements majeurs:
- Structure: frontend/ et backend/ séparés
- Build: Docker Compose au lieu de Podman/Buildah
- Scripts: Nouveaux scripts pour migration et déploiement
- Gitignore: Exclusion des fichiers de données volumineux
```

## Commandes pour pousser vers GitHub

```bash
# Vérifier les changements
git status

# Ajouter tous les fichiers (les fichiers de données seront automatiquement exclus)
git add .

# Créer le commit
git commit -m "Refactor: Migration vers Docker Compose et réorganisation du projet

- Réorganisation en dossiers frontend/ et backend/ séparés
- Migration de Podman/Buildah vers Docker Compose
- Suppression de tous les fichiers et scripts liés à Podman/Buildah
- Ajout de Dockerfiles optimisés pour chaque service
- Mise à jour de docker-compose.yml pour la nouvelle structure
- Ajout de scripts de migration et d'installation Docker
- Exclusion des fichiers de données locales du repo Git
- Nettoyage complet des fichiers obsolètes
- Documentation mise à jour (README, guides de migration)"

# Pousser vers GitHub
git push origin main
```
