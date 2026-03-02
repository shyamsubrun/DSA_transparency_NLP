# Guide de Déploiement sur VM Cloud

Ce guide détaille les étapes pour déployer le dashboard DSA sur la VM cloud où se trouve PostgreSQL.

## Vue d'ensemble

- **VM**: 34.46.198.22
- **Utilisateur**: raouf
- **Base de données**: PostgreSQL (localhost:5432)
- **Container runtime**: Buildah/Podman
- **Repository**: https://github.com/raouf-rak/dsa-dashboard.git

## Prérequis

- Accès SSH à la VM
- PostgreSQL installé et configuré sur la VM
- Permissions sudo pour installer des packages

## Phase 1 : Connexion et préparation de la VM

### 1.1 Connexion SSH

```bash
# Se connecter à la VM
ssh raouf@34.46.198.22

# Ou avec une clé SSH
ssh -i ~/.ssh/votre_cle_privée raouf@34.46.198.22
```

### 1.2 Vérifier PostgreSQL

```bash
# Vérifier que PostgreSQL est accessible
psql -h localhost -U dsa_admin -d dsa

# Si la commande fonctionne, vous pouvez quitter avec \q
```

### 1.3 Installer les outils nécessaires

Exécutez le script d'installation :

```bash
# Cloner le repo d'abord (si pas encore fait)
cd ~
git clone https://github.com/raouf-rak/dsa-dashboard.git
cd dsa-dashboard

# Rendre le script exécutable
chmod +x scripts/setup_vm.sh

# Exécuter l'installation
bash scripts/setup_vm.sh
```

Ou manuellement :

```bash
# Installer Buildah et Podman
sudo yum install -y buildah podman podman-compose

# Vérifier les versions
buildah --version
podman --version
podman-compose --version
```

### 1.4 Configurer le firewall

```bash
# Vérifier que le port 80 est ouvert
sudo firewall-cmd --list-ports

# Ouvrir le port 80 si nécessaire
sudo firewall-cmd --permanent --add-port=80/tcp
sudo firewall-cmd --reload

# Ou avec ufw (sur Ubuntu/Debian)
sudo ufw allow 80/tcp
sudo ufw reload
```

## Phase 2 : Clonage et configuration

### 2.1 Cloner le repository

```bash
cd ~
git clone https://github.com/raouf-rak/dsa-dashboard.git dsa-dashboard
cd dsa-dashboard

# Vérifier la structure
ls -la
# Doit contenir : backend/, src/, Dockerfile.backend, Dockerfile.frontend, docker-compose.yml
```

### 2.2 Créer le fichier d'environnement

```bash
cd ~/dsa-dashboard/backend

# Créer le fichier .env.production
cat > .env.production << EOF
DATABASE_URL=postgresql://dsa_admin:Mohamed2025!@localhost:5432/dsa
NODE_ENV=production
PORT=3001
FRONTEND_URL=http://34.46.198.22
EOF

# Vérifier le contenu
cat .env.production
```

**Important**: Ce fichier ne sera pas versionné dans Git (déjà dans `.gitignore`).

## Phase 3 : Build des images

### 3.1 Option A : Avec podman-compose (recommandé)

```bash
cd ~/dsa-dashboard

# Build et démarrer tous les services
podman-compose up -d --build

# Voir les logs
podman-compose logs -f
```

### 3.2 Option B : Avec Buildah directement

```bash
cd ~/dsa-dashboard

# Build backend
buildah bud -f Dockerfile.backend -t dsa-backend:latest .

# Build frontend
buildah bud -f Dockerfile.frontend --build-arg VITE_API_BASE_URL=/api -t dsa-frontend:latest .

# Vérifier les images
buildah images | grep dsa-
```

Puis utilisez le script de déploiement :

```bash
bash scripts/deploy_podman.sh
```

## Phase 4 : Vérification

### 4.1 Vérifier les containers

```bash
# Voir les containers en cours d'exécution
podman ps

# Voir les logs
podman-compose logs -f

# Ou pour un service spécifique
podman logs -f dsa-backend
podman logs -f dsa-frontend
```

### 4.2 Vérifier la santé du backend

```bash
# Depuis la VM
curl http://localhost:3001/health

# Devrait retourner: {"status":"ok","timestamp":"..."}
```

### 4.3 Vérifier le frontend

```bash
# Depuis la VM
curl http://localhost

# Devrait retourner le HTML de la page d'accueil
```

### 4.4 Utiliser le script de vérification

```bash
cd ~/dsa-dashboard
bash scripts/check_deployment.sh
```

Ce script vérifie automatiquement :
- Statut des containers
- Santé du backend
- Accès frontend
- API via proxy Nginx
- Logs récents
- Connexion PostgreSQL

## Phase 5 : Accès depuis l'extérieur

### 5.1 Tester depuis votre machine locale

```bash
# Vérifier le backend
curl http://34.46.198.22/api/health

# Vérifier le frontend
curl http://34.46.198.22

# Ouvrir dans le navigateur
# http://34.46.198.22
```

### 5.2 Vérifier les règles firewall GCP

Si vous utilisez Google Cloud Platform, vérifiez les règles firewall :

```bash
# Depuis votre machine locale
gcloud compute firewall-rules list

# Vérifier qu'une règle autorise le trafic HTTP (port 80)
gcloud compute firewall-rules describe default-allow-http
```

Si nécessaire, créer une règle :

```bash
gcloud compute firewall-rules create allow-http \
  --allow tcp:80 \
  --source-ranges 0.0.0.0/0 \
  --target-tags http-server \
  --description "Allow HTTP traffic"
```

## Phase 6 : Configuration du redémarrage automatique (optionnel)

### 6.1 Créer le service systemd

```bash
cd ~/dsa-dashboard

# Copier le fichier de service
sudo cp scripts/dsa-dashboard.service /etc/systemd/system/

# Recharger systemd
sudo systemctl daemon-reload

# Activer le service (démarrage automatique au boot)
sudo systemctl enable dsa-dashboard.service

# Démarrer le service
sudo systemctl start dsa-dashboard.service

# Vérifier le statut
sudo systemctl status dsa-dashboard.service
```

### 6.2 Commandes de gestion du service

```bash
# Démarrer
sudo systemctl start dsa-dashboard.service

# Arrêter
sudo systemctl stop dsa-dashboard.service

# Redémarrer
sudo systemctl restart dsa-dashboard.service

# Voir les logs
sudo journalctl -u dsa-dashboard.service -f
```

## Mises à jour

### Workflow de mise à jour

```bash
# Sur la VM
cd ~/dsa-dashboard

# Récupérer les dernières modifications
git pull origin main

# Rebuild et redémarrer
podman-compose down
podman-compose up -d --build

# Ou si vous utilisez le service systemd
sudo systemctl restart dsa-dashboard.service
```

### Depuis votre machine locale

Utilisez le script `deploy.sh` :

```bash
# Depuis la racine du projet
bash deploy.sh raouf 34.46.198.22
```

Ce script :
1. Pousse le code vers GitHub
2. Se connecte à la VM
3. Met à jour le code
4. Rebuild et redémarre les containers
5. Vérifie le déploiement

## Commandes utiles

### Gestion des containers

```bash
# Voir les containers
podman ps

# Voir tous les containers (y compris arrêtés)
podman ps -a

# Arrêter tous les services
podman-compose down

# Redémarrer un service
podman-compose restart backend

# Rebuild un service
podman-compose up -d --build backend
```

### Logs

```bash
# Tous les logs
podman-compose logs -f

# Logs d'un service spécifique
podman logs -f dsa-backend
podman logs -f dsa-frontend

# Dernières 50 lignes
podman logs --tail 50 dsa-backend
```

### Debugging

```bash
# Accéder au shell d'un container
podman exec -it dsa-backend sh

# Vérifier les variables d'environnement
podman exec dsa-backend env

# Tester la connexion PostgreSQL depuis le container
podman exec dsa-backend sh -c "node -e \"require('@prisma/client').PrismaClient().\$connect().then(() => console.log('OK')).catch(e => console.error(e))\""
```

## Troubleshooting

### Backend ne démarre pas

1. **Vérifier les logs** :
   ```bash
   podman logs dsa-backend
   ```

2. **Vérifier la connexion PostgreSQL** :
   ```bash
   psql -h localhost -U dsa_admin -d dsa
   ```

3. **Vérifier les variables d'environnement** :
   ```bash
   podman exec dsa-backend env | grep DATABASE_URL
   ```

4. **Problème de connexion depuis le container** :
   - Si `host.docker.internal` ne fonctionne pas, utiliser l'IP de la VM dans `DATABASE_URL`
   - Ou utiliser `--network host` (moins sécurisé)

### Frontend ne charge pas les données

1. **Vérifier que le backend est accessible** :
   ```bash
   curl http://localhost:3001/health
   ```

2. **Vérifier les logs Nginx** :
   ```bash
   podman logs dsa-frontend
   ```

3. **Vérifier la configuration du proxy** :
   ```bash
   podman exec dsa-frontend cat /etc/nginx/conf.d/default.conf
   ```

4. **Tester l'API via le proxy** :
   ```bash
   curl http://localhost/api/health
   ```

### Erreur de connexion PostgreSQL

1. **Vérifier que PostgreSQL écoute sur toutes les interfaces** :
   ```bash
   sudo netstat -tlnp | grep 5432
   # Ou
   sudo ss -tlnp | grep 5432
   ```

2. **Vérifier pg_hba.conf** :
   ```bash
   sudo cat /var/lib/pgsql/data/pg_hba.conf | grep -v "^#"
   ```

3. **Autoriser les connexions depuis les containers** :
   - Ajouter une ligne dans `pg_hba.conf` pour autoriser les connexions depuis le réseau Docker/Podman

4. **Utiliser l'IP de la VM** :
   - Modifier `DATABASE_URL` pour utiliser `34.46.198.22` au lieu de `localhost` ou `host.docker.internal`

### Port 80 déjà utilisé

```bash
# Vérifier quel processus utilise le port 80
sudo lsof -i :80
# Ou
sudo netstat -tlnp | grep :80

# Arrêter le processus ou changer le port dans docker-compose.yml
```

## Sécurité

### Bonnes pratiques

1. **Ne jamais commiter les mots de passe** :
   - Le fichier `.env.production` est dans `.gitignore`
   - Utiliser des secrets management en production

2. **Restreindre l'accès PostgreSQL** :
   - Configurer `pg_hba.conf` pour limiter les connexions
   - Utiliser des mots de passe forts

3. **Mettre à jour régulièrement** :
   - Mettre à jour les images de base
   - Appliquer les correctifs de sécurité

4. **Surveiller les logs** :
   - Configurer la rotation des logs
   - Surveiller les erreurs

## Support

Pour plus d'informations :
- Repository GitHub : https://github.com/raouf-rak/dsa-dashboard
- Documentation : Voir le dossier `docs/`
- Issues : Créer une issue sur GitHub

