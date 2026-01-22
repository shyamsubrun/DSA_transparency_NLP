# Guide de Migration vers Docker

Ce guide vous explique comment migrer de Podman/Buildah vers Docker sur la VM.

## 📋 Étapes sur votre Machine Locale

### 1. Préparer le commit Git

```bash
# Ajouter tous les changements
git add .

# Créer un commit
git commit -m "Refactor: Migration vers Docker Compose

- Réorganisation en dossiers frontend/ et backend/
- Suppression de Podman/Buildah
- Ajout de Docker Compose
- Nettoyage des fichiers obsolètes
- Ajout de scripts de migration"

# Pousser vers GitHub
git push origin main
```

## 📋 Étapes sur la VM

### Option A : Migration Automatique (Recommandé)

Connectez-vous à la VM et exécutez ces commandes dans l'ordre :

```bash
# 1. Aller dans le dossier du projet
cd ~/dsa-dashboard

# 2. Rendre les scripts exécutables
chmod +x scripts/*.sh

# 3. Installer Docker (si pas déjà installé)
sudo bash scripts/install_docker.sh

# 4. Supprimer Podman et Buildah
sudo bash scripts/remove_podman.sh

# 5. Migrer vers Docker
sudo bash scripts/migrate_to_docker.sh
```

### Option B : Migration Manuelle

Si vous préférez faire étape par étape :

#### Étape 1 : Installer Docker

```bash
sudo bash scripts/install_docker.sh
```

#### Étape 2 : Supprimer Podman/Buildah

```bash
sudo bash scripts/remove_podman.sh
```

#### Étape 3 : Mettre à jour le code

```bash
cd ~/dsa-dashboard
git pull origin main
```

#### Étape 4 : Arrêter les containers Podman

```bash
sudo podman stop dsa-backend dsa-frontend
sudo podman rm dsa-backend dsa-frontend
```

#### Étape 5 : Démarrer avec Docker Compose

```bash
cd ~/dsa-dashboard
docker compose build
docker compose up -d
```

#### Étape 6 : Vérifier

```bash
docker compose ps
curl http://localhost:3001/health
curl http://localhost/health
```

## 🔧 Scripts Disponibles

### `scripts/install_docker.sh`
Installe Docker et Docker Compose sur Ubuntu/Debian.

**Usage :**
```bash
sudo bash scripts/install_docker.sh
```

### `scripts/remove_podman.sh`
Supprime Podman et Buildah de la VM.

**Usage :**
```bash
sudo bash scripts/remove_podman.sh
```

### `scripts/migrate_to_docker.sh`
Migration complète de Podman vers Docker.

**Usage :**
```bash
sudo bash scripts/migrate_to_docker.sh
```

### `scripts/deploy_on_vm.sh`
Déploie le dashboard avec Docker Compose.

**Usage :**
```bash
bash scripts/deploy_on_vm.sh
```

## ✅ Vérifications Post-Migration

1. **Vérifier que Docker fonctionne :**
   ```bash
   docker --version
   docker compose version
   ```

2. **Vérifier que les containers sont démarrés :**
   ```bash
   docker compose ps
   ```

3. **Vérifier les logs :**
   ```bash
   docker compose logs -f
   ```

4. **Tester le dashboard :**
   - Backend : http://VM_IP:3001/health
   - Frontend : http://VM_IP

## 🚨 Résolution de Problèmes

### Problème : Docker n'est pas installé

**Solution :**
```bash
sudo bash scripts/install_docker.sh
```

### Problème : Permission denied avec Docker

**Solution :**
```bash
# Ajouter l'utilisateur au groupe docker
sudo usermod -aG docker $USER
# Se déconnecter et reconnecter
# Ou utiliser: newgrp docker
```

### Problème : Port 80 déjà utilisé

**Solution :**
Modifier `docker-compose.yml` :
```yaml
ports:
  - "8080:80"  # Utiliser un autre port
```

### Problème : Erreur de connexion à la base de données

**Solution :**
Vérifier `DATABASE_URL` dans `docker-compose.yml`. Si PostgreSQL est sur l'hôte :
```yaml
DATABASE_URL=postgresql://user:password@host.docker.internal:5432/dbname
```

## 📝 Notes Importantes

1. **Sauvegarde** : Avant de supprimer Podman, assurez-vous que Docker fonctionne correctement.

2. **Données** : Les données dans PostgreSQL ne sont pas affectées par cette migration.

3. **Images** : Les images Podman seront supprimées. Elles seront reconstruites avec Docker.

4. **Services systemd** : Le service `dsa-dashboard.service` sera supprimé. Docker Compose gère maintenant le démarrage automatique.

## 🎯 Commandes Utiles Après Migration

```bash
# Voir les logs
docker compose logs -f

# Redémarrer un service
docker compose restart backend

# Arrêter tous les services
docker compose down

# Reconstruire les images
docker compose build --no-cache

# Voir l'utilisation des ressources
docker stats
```

---

**Migration terminée ?** Vérifiez que le dashboard fonctionne sur http://VM_IP ! 🎉
