# Guide de Déploiement avec Docker/Buildah

## Vue d'ensemble

Ce document complète le plan principal en ajoutant :
- Dockerfiles pour frontend et backend
- docker-compose.yml pour orchestration
- Guide de déploiement avec Buildah sur la VM

---

## Partie 4 : Containerisation et Déploiement

### 4.1 Dockerfile Backend

**[Dockerfile.backend](Dockerfile.backend)** - Build multi-stage optimisé :

```dockerfile
# Stage 1: Build
FROM node:20-alpine AS builder

WORKDIR /app/backend

# Copier les fichiers de dépendances
COPY backend/package*.json ./
COPY backend/prisma ./prisma/

# Installer les dépendances
RUN npm ci

# Copier le code source
COPY backend/src ./src
COPY backend/tsconfig.json ./

# Générer Prisma Client
RUN npx prisma generate

# Build TypeScript
RUN npm run build

# Stage 2: Production
FROM node:20-alpine

WORKDIR /app

# Installer seulement les dépendances de production
COPY backend/package*.json ./
RUN npm ci --only=production

# Copier Prisma schema et générer client
COPY backend/prisma ./prisma
RUN npx prisma generate

# Copier le code compilé depuis le stage builder
COPY --from=builder /app/backend/dist ./dist

# Variables d'environnement par défaut
ENV NODE_ENV=production
ENV PORT=3001

EXPOSE 3001

# Health check
HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
  CMD node -e "require('http').get('http://localhost:3001/health', (r) => {process.exit(r.statusCode === 200 ? 0 : 1)})"

CMD ["node", "dist/index.js"]
```

### 4.2 Dockerfile Frontend

**[Dockerfile.frontend](Dockerfile.frontend)** - Build avec Nginx :

```dockerfile
# Stage 1: Build React app
FROM node:20-alpine AS builder

WORKDIR /app

# Copier les fichiers de dépendances
COPY package*.json ./
RUN npm ci

# Copier le code source
COPY src ./src
COPY public ./public
COPY index.html ./
COPY vite.config.ts ./
COPY tsconfig*.json ./

# Build pour production
ARG VITE_API_BASE_URL=http://localhost:3001/api
ENV VITE_API_BASE_URL=$VITE_API_BASE_URL
RUN npm run build

# Stage 2: Serve with Nginx
FROM nginx:alpine

# Copier la configuration Nginx personnalisée
COPY nginx.conf /etc/nginx/conf.d/default.conf

# Copier les fichiers build depuis le stage builder
COPY --from=builder /app/dist /usr/share/nginx/html

EXPOSE 80

CMD ["nginx", "-g", "daemon off;"]
```

### 4.3 Configuration Nginx

**[nginx.conf](nginx.conf)** - Reverse proxy pour l'API :

```nginx
server {
    listen 80;
    server_name localhost;

    root /usr/share/nginx/html;
    index index.html;

    # Gzip compression
    gzip on;
    gzip_types text/plain text/css application/json application/javascript text/xml application/xml application/xml+rss text/javascript;

    # Frontend (React SPA)
    location / {
        try_files $uri $uri/ /index.html;
        
        # Cache des assets
        location ~* \.(js|css|png|jpg|jpeg|gif|ico|svg|woff|woff2|ttf|eot)$ {
            expires 1y;
            add_header Cache-Control "public, immutable";
        }
    }

    # Proxy vers le backend API
    location /api/ {
        proxy_pass http://backend:3001/api/;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_cache_bypass $http_upgrade;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }
}
```

### 4.4 Docker Compose

**[docker-compose.yml](docker-compose.yml)** - Orchestration complète :

```yaml
version: '3.8'

services:
  backend:
    build:
      context: .
      dockerfile: Dockerfile.backend
    container_name: dsa-backend
    ports:
      - "3001:3001"
    environment:
      - DATABASE_URL=postgresql://dsa_admin:Mohamed2025!@34.46.198.22:5432/dsa
      - NODE_ENV=production
      - PORT=3001
    networks:
      - dsa-network
    restart: unless-stopped
    healthcheck:
      test: ["CMD", "node", "-e", "require('http').get('http://localhost:3001/health', (r) => {process.exit(r.statusCode === 200 ? 0 : 1)})"]
      interval: 30s
      timeout: 3s
      retries: 3
      start_period: 40s

  frontend:
    build:
      context: .
      dockerfile: Dockerfile.frontend
      args:
        - VITE_API_BASE_URL=/api
    container_name: dsa-frontend
    ports:
      - "80:80"
    depends_on:
      backend:
        condition: service_healthy
    networks:
      - dsa-network
    restart: unless-stopped

networks:
  dsa-network:
    driver: bridge
```

### 4.5 .dockerignore

**[.dockerignore](.dockerignore)** - Exclure fichiers inutiles :

```
# Node modules
node_modules
backend/node_modules

# Build artifacts
dist
build
backend/dist

# Logs
*.log
npm-debug.log*

# Environment files (seront passés via docker-compose)
.env
.env.local
.env.production
backend/.env

# Git
.git
.gitignore

# IDE
.vscode
.idea
*.swp
*.swo

# Tests
coverage

# Documentation
*.md
!README.md

# Database files
database/
scripts/

# Source data
src/data/dsa-download/
```

---

## Partie 5 : Déploiement avec Buildah sur VM

### 5.1 Prérequis sur la VM

```bash
# Se connecter à la VM
ssh raouf@34.46.198.22

# Installer Buildah et Podman (si pas déjà installé)
sudo yum install -y buildah podman podman-compose

# Vérifier l'installation
buildah --version
podman --version
podman-compose --version
```

### 5.2 Cloner le Repo sur la VM

```bash
# Cloner le repo
cd ~
git clone <URL_DE_VOTRE_REPO> dsa-dashboard
cd dsa-dashboard

# Vérifier la structure
ls -la
# Doit montrer : backend/, src/, Dockerfile.backend, Dockerfile.frontend, docker-compose.yml
```

### 5.3 Build avec Buildah

**Option A : Build images séparément avec Buildah**

```bash
# Build backend
buildah bud -f Dockerfile.backend -t dsa-backend:latest .

# Build frontend
buildah bud -f Dockerfile.frontend --build-arg VITE_API_BASE_URL=/api -t dsa-frontend:latest .

# Lister les images
buildah images
```

**Option B : Utiliser podman-compose (plus simple)**

```bash
# Build et démarrer tous les services
podman-compose up -d --build

# Voir les logs
podman-compose logs -f

# Vérifier le statut
podman-compose ps
```

### 5.4 Configuration Production

**[.env.production](.env.production)** - Variables pour production :

```env
# Backend
DATABASE_URL=postgresql://dsa_admin:Mohamed2025!@34.46.198.22:5432/dsa
NODE_ENV=production
PORT=3001

# Frontend (utilisé au build)
VITE_API_BASE_URL=/api
```

### 5.5 Commandes de Gestion

**Démarrage :**

```bash
# Avec podman-compose
podman-compose up -d

# Ou avec podman directement
podman run -d --name dsa-backend -p 3001:3001 \
  -e DATABASE_URL="postgresql://dsa_admin:Mohamed2025!@34.46.198.22:5432/dsa" \
  dsa-backend:latest

podman run -d --name dsa-frontend -p 80:80 dsa-frontend:latest
```

**Arrêt :**

```bash
podman-compose down

# Ou
podman stop dsa-backend dsa-frontend
podman rm dsa-backend dsa-frontend
```

**Logs :**

```bash
# Tous les services
podman-compose logs -f

# Service spécifique
podman logs -f dsa-backend
podman logs -f dsa-frontend
```

**Rebuild après modification :**

```bash
# Rebuild un service spécifique
podman-compose up -d --build backend

# Rebuild tout
podman-compose down
podman-compose up -d --build
```

### 5.6 Vérification du Déploiement

```bash
# Vérifier que les containers tournent
podman ps

# Tester le backend
curl http://localhost:3001/api/filters

# Tester le frontend (depuis votre machine locale)
curl http://34.46.198.22

# Vérifier les logs pour erreurs
podman-compose logs backend | grep -i error
podman-compose logs frontend | grep -i error
```

### 5.7 Health Check Backend

Ajouter un endpoint health dans le backend :

**[backend/src/index.ts](backend/src/index.ts)** - Ajouter :

```typescript
// Health check endpoint
app.get('/health', (req, res) => {
  res.status(200).json({ status: 'ok', timestamp: new Date().toISOString() });
});
```

---

## Partie 6 : Déploiement Continu (Optionnel)

### 6.1 Script de Déploiement

**[deploy.sh](deploy.sh)** - Script pour automatiser le déploiement :

```bash
#!/bin/bash
set -e

echo "🚀 Déploiement DSA Dashboard sur VM"

# Variables
VM_USER="raouf"
VM_HOST="34.46.198.22"
REPO_DIR="~/dsa-dashboard"

echo "📦 Build et push des images..."
# Build local (optionnel)
# docker build -f Dockerfile.backend -t dsa-backend:latest .
# docker build -f Dockerfile.frontend -t dsa-frontend:latest .

echo "📤 Copie des fichiers sur la VM..."
rsync -avz --exclude 'node_modules' --exclude 'dist' \
  . ${VM_USER}@${VM_HOST}:${REPO_DIR}/

echo "🔧 Déploiement sur la VM..."
ssh ${VM_USER}@${VM_HOST} << 'ENDSSH'
cd ~/dsa-dashboard

# Pull dernières modifications (si repo git)
git pull origin main

# Rebuild et redémarrer
podman-compose down
podman-compose up -d --build

# Afficher le statut
echo "✅ Déploiement terminé !"
podman-compose ps

ENDSSH

echo "🎉 Dashboard déployé avec succès !"
echo "📊 Accéder au dashboard : http://34.46.198.22"
```

### 6.2 Utilisation

```bash
# Rendre le script exécutable
chmod +x deploy.sh

# Exécuter
./deploy.sh
```

---

## Résumé des Commandes Importantes

### Développement Local

```bash
# Démarrer frontend + backend
npm run dev:all

# Ou séparément
npm run dev          # Frontend (Vite)
cd backend && npm run dev   # Backend (tsx watch)
```

### Docker Local (Test)

```bash
# Build et run avec Docker
docker-compose up --build

# Arrêter
docker-compose down
```

### Production VM (Buildah/Podman)

```bash
# Sur la VM
cd ~/dsa-dashboard
git pull
podman-compose up -d --build

# Vérifier
podman-compose ps
podman-compose logs -f
```

---

## Checklist de Déploiement

- [ ] Backend fonctionne en local
- [ ] Frontend connecté au backend en local
- [ ] Dockerfiles créés et testés avec `docker-compose up`
- [ ] Repo Git poussé avec tous les fichiers (Dockerfiles, docker-compose.yml)
- [ ] Buildah/Podman installés sur la VM
- [ ] Repo cloné sur la VM
- [ ] Images buildées avec Buildah : `buildah bud`
- [ ] Services démarrés avec `podman-compose up -d`
- [ ] Dashboard accessible depuis http://34.46.198.22
- [ ] Backend répond aux requêtes API
- [ ] PostgreSQL accessible depuis les containers

