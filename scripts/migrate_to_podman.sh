#!/bin/bash
# Migration vers Podman/Buildah
# À exécuter sur la VM après connexion SSH
# Usage: bash scripts/migrate_to_podman.sh

set -e

echo "🔄 Migration vers Podman/Buildah"
echo "=================================="

# Couleurs
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m'

# 1. Arrêter les services actuels
echo ""
echo "1️⃣  Arrêt des services actuels..."
if systemctl is-active --quiet dsa-backend.service; then
    echo "Arrêt du service systemd backend..."
    sudo systemctl stop dsa-backend.service
    sudo systemctl disable dsa-backend.service
    echo -e "${GREEN}✅ Service backend arrêté${NC}"
else
    echo -e "${YELLOW}⚠️  Service backend déjà arrêté${NC}"
fi

# 2. Installer Podman/Buildah si nécessaire
echo ""
echo "2️⃣  Vérification de Podman/Buildah..."
if ! command -v podman &> /dev/null; then
    echo -e "${YELLOW}Installation de Podman et Buildah...${NC}"
    sudo apt-get update
    sudo apt-get install -y buildah podman podman-compose
    echo -e "${GREEN}✅ Podman et Buildah installés${NC}"
else
    echo -e "${GREEN}✅ Podman déjà installé: $(podman --version)${NC}"
fi

if ! command -v buildah &> /dev/null; then
    echo -e "${RED}❌ Buildah non trouvé après installation${NC}"
    exit 1
fi

# 3. Aller dans le répertoire du projet
cd ~/dsa-dashboard || {
    echo -e "${RED}❌ Répertoire ~/dsa-dashboard non trouvé${NC}"
    exit 1
}

# 4. Créer le réseau Podman
echo ""
echo "3️⃣  Création du réseau Podman..."
if podman network exists dsa-network; then
    echo -e "${YELLOW}⚠️  Réseau dsa-network existe déjà${NC}"
else
    podman network create dsa-network
    echo -e "${GREEN}✅ Réseau dsa-network créé${NC}"
fi

# 5. Arrêter et supprimer les containers existants s'ils existent
echo ""
echo "4️⃣  Nettoyage des containers existants..."
podman stop dsa-backend dsa-frontend 2>/dev/null || true
podman rm dsa-backend dsa-frontend 2>/dev/null || true
echo -e "${GREEN}✅ Containers nettoyés${NC}"

# 6. Build local des applications (hors container pour éviter les timeouts)
echo ""
echo "5️⃣  Build local des applications..."
echo ""

# Backend
echo "Building backend localement..."
cd backend
if [ ! -d "node_modules" ]; then
    echo "Installation des dépendances backend..."
    npm install --fetch-timeout=600000 --fetch-retries=10
fi
echo "Génération Prisma Client..."
npx prisma generate
echo "Build TypeScript..."
npm run build
if [ ! -d "dist" ]; then
    echo -e "${RED}❌ Erreur: dist/ non trouvé après le build backend${NC}"
    exit 1
fi
echo -e "${GREEN}✅ Backend buildé localement${NC}"
cd ..

# Frontend
echo ""
echo "Building frontend localement..."
if [ ! -d "node_modules" ]; then
    echo "Installation des dépendances frontend..."
    npm install --fetch-timeout=600000 --fetch-retries=10
fi
export VITE_API_BASE_URL=/api
echo "Build frontend..."
npm run build
if [ ! -d "dist" ]; then
    echo -e "${RED}❌ Erreur: dist/ non trouvé après le build frontend${NC}"
    exit 1
fi
echo -e "${GREEN}✅ Frontend buildé localement${NC}"

# 7. Build des images avec Buildah (utilisant les builds locaux)
echo ""
echo "6️⃣  Build des images avec Buildah (utilisant les builds locaux)..."
echo ""

# Sauvegarder et modifier temporairement .dockerignore pour permettre node_modules et dist
if [ -f .dockerignore ]; then
    cp .dockerignore .dockerignore.backup
    # Créer un .dockerignore qui n'exclut pas backend/node_modules et backend/dist
    cat > .dockerignore << 'EOF'
# Node modules (mais pas backend/node_modules pour les builds locaux)
node_modules
# Build artifacts (mais pas backend/dist pour les builds locaux)
dist
build

# Logs
*.log
npm-debug.log*

# Environment files
.env.local
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

# Cursor
.cursor/
EOF
fi

# Backend
echo "Building backend image..."
if buildah bud -f Dockerfile.backend.local -t dsa-backend:latest .; then
    echo -e "${GREEN}✅ Image backend buildée${NC}"
else
    echo -e "${RED}❌ Erreur lors du build de l'image backend${NC}"
    # Restaurer .dockerignore
    if [ -f .dockerignore.backup ]; then
        mv .dockerignore.backup .dockerignore
    fi
    exit 1
fi

# Frontend
echo ""
echo "Building frontend image..."
if buildah bud -f Dockerfile.frontend.local -t dsa-frontend:latest .; then
    echo -e "${GREEN}✅ Image frontend buildée${NC}"
else
    echo -e "${RED}❌ Erreur lors du build de l'image frontend${NC}"
    # Restaurer .dockerignore
    if [ -f .dockerignore.backup ]; then
        mv .dockerignore.backup .dockerignore
    fi
    exit 1
fi

# Restaurer .dockerignore
if [ -f .dockerignore.backup ]; then
    mv .dockerignore.backup .dockerignore
    echo -e "${GREEN}✅ .dockerignore restauré${NC}"
fi

# 8. Démarrer les containers
echo ""
echo "7️⃣  Démarrage des containers..."

# Backend avec connexion à PostgreSQL sur l'hôte
echo "Démarrage du backend..."
podman run -d \
  --name dsa-backend \
  --network dsa-network \
  -p 3001:3001 \
  -e DATABASE_URL="postgresql://dsa_admin:Mohamed2025!@host.containers.internal:5432/dsa?connection_limit=20&pool_timeout=20" \
  -e NODE_ENV=production \
  -e PORT=3001 \
  -e FRONTEND_URL="http://35.223.190.104" \
  --add-host=host.containers.internal:host-gateway \
  --restart unless-stopped \
  dsa-backend:latest

if [ $? -eq 0 ]; then
    echo -e "${GREEN}✅ Container backend démarré${NC}"
else
    echo -e "${RED}❌ Erreur lors du démarrage du backend${NC}"
    echo "Tentative avec l'IP de la VM..."
    podman rm dsa-backend 2>/dev/null || true
    podman run -d \
      --name dsa-backend \
      --network dsa-network \
      -p 3001:3001 \
      -e DATABASE_URL="postgresql://dsa_admin:Mohamed2025!@35.223.190.104:5432/dsa?connection_limit=20&pool_timeout=20" \
      -e NODE_ENV=production \
      -e PORT=3001 \
      -e FRONTEND_URL="http://35.223.190.104" \
      --restart unless-stopped \
      dsa-backend:latest
fi

# Frontend
echo ""
echo "Démarrage du frontend..."
podman run -d \
  --name dsa-frontend \
  --network dsa-network \
  -p 80:80 \
  --restart unless-stopped \
  dsa-frontend:latest

if [ $? -eq 0 ]; then
    echo -e "${GREEN}✅ Container frontend démarré${NC}"
else
    echo -e "${RED}❌ Erreur lors du démarrage du frontend${NC}"
    exit 1
fi

# 9. Attendre le démarrage
echo ""
echo "⏳ Attente du démarrage (15 secondes)..."
sleep 15

# 10. Vérification
echo ""
echo "🔍 Vérification..."
echo ""

echo "Containers en cours d'exécution:"
podman ps --filter "name=dsa-"

echo ""
echo "Test backend (direct):"
BACKEND_HEALTH=$(curl -s http://localhost:3001/health 2>/dev/null || echo "")
if [ -n "$BACKEND_HEALTH" ]; then
    echo -e "${GREEN}✅ Backend accessible: $BACKEND_HEALTH${NC}"
else
    echo -e "${YELLOW}⚠️  Backend non accessible directement, vérifiez les logs${NC}"
    echo "Logs backend:"
    podman logs --tail 20 dsa-backend
fi

echo ""
echo "Test frontend:"
FRONTEND_STATUS=$(curl -I http://localhost/ 2>/dev/null | head -1 || echo "")
if [ -n "$FRONTEND_STATUS" ]; then
    echo -e "${GREEN}✅ Frontend accessible: $FRONTEND_STATUS${NC}"
else
    echo -e "${YELLOW}⚠️  Frontend non accessible, vérifiez les logs${NC}"
    echo "Logs frontend:"
    podman logs --tail 20 dsa-frontend
fi

echo ""
echo "=============================================="
echo -e "${GREEN}✅ Migration terminée!${NC}"
echo ""
echo "📋 Commandes utiles:"
echo "  - Logs backend: podman logs -f dsa-backend"
echo "  - Logs frontend: podman logs -f dsa-frontend"
echo "  - Arrêter: podman stop dsa-backend dsa-frontend"
echo "  - Redémarrer: podman start dsa-backend dsa-frontend"
echo "  - Statut: podman ps"
echo "  - Voir tous les containers: podman ps -a"
echo ""
echo "🌐 Accès:"
echo "  - Frontend: http://35.223.190.104"
echo "  - Backend health: http://35.223.190.104/api/health"
echo ""
echo "⚠️  Note: Assurez-vous que le port 80 est ouvert dans le firewall GCP"

