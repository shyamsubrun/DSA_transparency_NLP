# Guide de Déploiement sur la VM

Ce guide explique comment déployer le dashboard DSA sur la VM après la migration vers Docker.

## État actuel

Docker est installé sur la VM mais nécessite `sudo` pour l'utilisateur `raouf.abdallah`.

## Option 1 : Corriger les permissions Docker (recommandé)

Pour éviter d'utiliser `sudo` à chaque fois :

```bash
# Sur la VM
bash scripts/fix_docker_permissions.sh

# Puis déconnectez-vous et reconnectez-vous, ou utilisez :
newgrp docker

# Testez sans sudo
docker ps
```

## Option 2 : Utiliser sudo (temporaire)

Si vous préférez utiliser `sudo` pour l'instant :

```bash
# Toutes les commandes docker nécessiteront sudo
sudo docker ps
sudo docker compose up -d
```

## Déploiement sur la VM

### Étape 1 : Se connecter à la VM

```bash
ssh raouf.abdallah@35.223.190.104
```

### Étape 2 : Aller dans le dossier du projet

```bash
cd ~/dsa-dashboard
```

### Étape 3 : Mettre à jour le code depuis GitHub

```bash
git pull origin main
```

### Étape 4 : Déployer avec Docker Compose

**Si vous avez corrigé les permissions (Option 1) :**

```bash
bash scripts/deploy_on_vm.sh
```

**Si vous utilisez sudo (Option 2) :**

```bash
sudo bash scripts/deploy_on_vm.sh
```

Le script va :
1. Mettre à jour le code depuis GitHub
2. Arrêter les containers existants
3. Construire les images Docker
4. Démarrer les services
5. Vérifier le statut et la santé des services

### Étape 5 : Vérifier le déploiement

```bash
# Voir les containers en cours d'exécution
docker ps  # ou sudo docker ps

# Voir les logs
docker compose logs -f  # ou sudo docker compose logs -f

# Vérifier le statut
docker compose ps  # ou sudo docker compose ps
```

### Étape 6 : Tester l'accès

- **Backend** : http://35.223.190.104:3001/health
- **Frontend** : http://35.223.190.104

## Commandes utiles

### Voir les logs

```bash
# Tous les services
docker compose logs -f

# Un service spécifique
docker compose logs -f backend
docker compose logs -f frontend
```

### Arrêter les services

```bash
docker compose down
```

### Redémarrer les services

```bash
docker compose restart
# ou
docker compose up -d
```

### Reconstruire les images

```bash
docker compose build
docker compose up -d
```

### Vérifier le statut

```bash
docker compose ps
```

## Migration complète depuis Podman/Buildah

Si vous avez encore Podman/Buildah sur la VM et voulez migrer complètement :

### 1. Supprimer Podman/Buildah

```bash
sudo bash scripts/remove_podman.sh
```

### 2. Installer Docker (si pas déjà fait)

```bash
sudo bash scripts/install_docker.sh
```

### 3. Migrer vers Docker

```bash
sudo bash scripts/migrate_to_docker.sh
```

Ce script va :
- Arrêter les containers Podman
- Supprimer les services systemd
- Construire et démarrer avec Docker Compose

## Dépannage

### Problème : "permission denied" avec Docker

**Solution :** Exécutez `bash scripts/fix_docker_permissions.sh` puis déconnectez-vous/reconnectez-vous.

### Problème : Le backend ne répond pas

```bash
# Vérifier les logs
docker compose logs backend

# Vérifier que le container est en cours d'exécution
docker compose ps

# Vérifier la connexion à la base de données
docker compose exec backend node -e "console.log(process.env.DATABASE_URL)"
```

### Problème : Le frontend affiche "502 Bad Gateway"

```bash
# Vérifier les logs du frontend
docker compose logs frontend

# Vérifier que le backend est accessible depuis le frontend
docker compose exec frontend curl http://backend:3001/health
```

### Problème : Les images ne se construisent pas

```bash
# Nettoyer et reconstruire
docker compose down
docker compose build --no-cache
docker compose up -d
```

## Vérification finale

Une fois le déploiement terminé, vérifiez :

1. **Containers en cours d'exécution :**
   ```bash
   docker compose ps
   ```
   Les deux services (backend et frontend) doivent être "Up".

2. **Santé du backend :**
   ```bash
   curl http://localhost:3001/health
   ```
   Doit retourner `{"status":"ok"}`.

3. **Accès au frontend :**
   ```bash
   curl http://localhost
   ```
   Doit retourner du HTML.

4. **Accès depuis l'extérieur :**
   - Ouvrez http://35.223.190.104 dans votre navigateur
   - Le dashboard doit s'afficher avec les données de la base PostgreSQL

## Notes importantes

- Les données sont stockées dans PostgreSQL sur la VM
- Les containers Docker sont éphémères (les données ne sont pas perdues car elles sont dans PostgreSQL)
- Pour mettre à jour le code, faites `git pull` puis `docker compose up -d --build`
- Les logs sont disponibles avec `docker compose logs -f`
