#!/bin/bash
# Script de déploiement complet sur la VM
# À exécuter directement sur la VM après connexion SSH
# Usage: bash scripts/deploy_on_vm.sh

set -e

echo "🚀 Déploiement complet DSA Dashboard sur la VM"
echo "=============================================="

# Couleurs
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m'

# Variables
REPO_URL="https://github.com/raouf-rak/dsa-dashboard.git"
PROJECT_DIR="$HOME/dsa-dashboard"
DB_USER="dsa_admin"
DB_PASS="Mohamed2025!"
DB_HOST="localhost"
DB_PORT="5432"
DB_NAME="dsa"
VM_IP="35.223.190.104"

echo ""
echo "📋 Configuration:"
echo "  Repository: $REPO_URL"
echo "  Directory: $PROJECT_DIR"
echo "  Database: $DB_USER@$DB_HOST:$DB_PORT/$DB_NAME"
echo ""

# Étape 1: Vérifier/Installer les outils
echo "1️⃣  Installation des outils nécessaires..."
if ! command -v buildah &> /dev/null || ! command -v podman &> /dev/null; then
    echo -e "${YELLOW}Installation de Buildah et Podman...${NC}"
    if [ -f /etc/redhat-release ]; then
        sudo yum install -y buildah podman podman-compose
    elif [ -f /etc/debian_version ]; then
        sudo apt-get update
        sudo apt-get install -y buildah podman podman-compose
    else
        echo -e "${RED}❌ Distribution non supportée. Installez manuellement buildah et podman.${NC}"
        exit 1
    fi
else
    echo -e "${GREEN}✅ Buildah et Podman déjà installés${NC}"
fi

# Vérifier podman-compose
if ! command -v podman-compose &> /dev/null; then
    echo -e "${YELLOW}⚠️  podman-compose non trouvé. Installation via pip...${NC}"
    pip3 install podman-compose || {
        echo -e "${YELLOW}pip3 non disponible. Vous devrez utiliser podman directement.${NC}"
    }
fi

# Étape 2: Cloner/Mettre à jour le repository
echo ""
echo "2️⃣  Clonage/Mise à jour du repository..."
if [ -d "$PROJECT_DIR" ]; then
    echo -e "${YELLOW}Le dossier existe déjà. Mise à jour...${NC}"
    cd "$PROJECT_DIR"
    git pull origin main || {
        echo -e "${YELLOW}Erreur lors du pull. Tentative de reset...${NC}"
        git fetch origin
        git reset --hard origin/main
    }
else
    echo "Clonage du repository..."
    cd ~
    git clone "$REPO_URL" "$PROJECT_DIR"
    cd "$PROJECT_DIR"
fi

# Rendre les scripts exécutables
chmod +x scripts/*.sh deploy.sh 2>/dev/null || true

# Étape 3: Configurer le firewall
echo ""
echo "3️⃣  Configuration du firewall..."
if command -v firewall-cmd &> /dev/null; then
    if ! sudo firewall-cmd --list-ports | grep -q "80/tcp"; then
        echo "Ouverture du port 80..."
        sudo firewall-cmd --permanent --add-port=80/tcp
        sudo firewall-cmd --reload
        echo -e "${GREEN}✅ Port 80 ouvert${NC}"
    else
        echo -e "${GREEN}✅ Port 80 déjà ouvert${NC}"
    fi
elif command -v ufw &> /dev/null; then
    if ! sudo ufw status | grep -q "80/tcp"; then
        echo "Ouverture du port 80..."
        sudo ufw allow 80/tcp
        sudo ufw reload
        echo -e "${GREEN}✅ Port 80 ouvert${NC}"
    else
        echo -e "${GREEN}✅ Port 80 déjà ouvert${NC}"
    fi
else
    echo -e "${YELLOW}⚠️  Aucun firewall détecté. Assurez-vous que le port 80 est accessible.${NC}"
fi

# Étape 4: Créer le fichier .env.production
echo ""
echo "4️⃣  Configuration des variables d'environnement..."
cd "$PROJECT_DIR/backend"
if [ ! -f ".env.production" ]; then
    echo "Création du fichier .env.production..."
    cat > .env.production << EOF
DATABASE_URL=postgresql://${DB_USER}:${DB_PASS}@${DB_HOST}:${DB_PORT}/${DB_NAME}
NODE_ENV=production
PORT=3001
FRONTEND_URL=http://${VM_IP}
EOF
    echo -e "${GREEN}✅ Fichier .env.production créé${NC}"
else
    echo -e "${GREEN}✅ Fichier .env.production existe déjà${NC}"
fi

# Étape 5: Vérifier PostgreSQL
echo ""
echo "5️⃣  Vérification de PostgreSQL..."
if command -v psql &> /dev/null; then
    if PGPASSWORD="$DB_PASS" psql -h "$DB_HOST" -U "$DB_USER" -d "$DB_NAME" -c "SELECT 1;" &> /dev/null; then
        echo -e "${GREEN}✅ Connexion PostgreSQL OK${NC}"
    else
        echo -e "${RED}❌ Impossible de se connecter à PostgreSQL${NC}"
        echo "Vérifiez que PostgreSQL est démarré et que les credentials sont corrects."
    fi
else
    echo -e "${YELLOW}⚠️  psql non trouvé. Impossible de vérifier PostgreSQL.${NC}"
fi

# Étape 6: Arrêter les containers existants
echo ""
echo "6️⃣  Arrêt des containers existants (si présents)..."
cd "$PROJECT_DIR"
if command -v podman-compose &> /dev/null; then
    podman-compose down 2>/dev/null || true
else
    podman stop dsa-backend dsa-frontend 2>/dev/null || true
    podman rm dsa-backend dsa-frontend 2>/dev/null || true
fi

# Étape 7: Build et démarrage
echo ""
echo "7️⃣  Build et démarrage des containers..."
if command -v podman-compose &> /dev/null; then
    echo "Utilisation de podman-compose..."
    podman-compose up -d --build
else
    echo "Utilisation de podman directement..."
    bash scripts/deploy_podman.sh
fi

# Étape 8: Attendre le démarrage
echo ""
echo "8️⃣  Attente du démarrage des containers (20 secondes)..."
sleep 20

# Étape 9: Vérification
echo ""
echo "9️⃣  Vérification du déploiement..."
if [ -f "scripts/check_deployment.sh" ]; then
    bash scripts/check_deployment.sh
else
    echo "Vérification manuelle..."
    echo ""
    echo "Containers:"
    podman ps --filter "name=dsa-"
    echo ""
    echo "Backend health:"
    curl -s http://localhost:3001/health || echo "❌ Backend non accessible"
    echo ""
    echo "Frontend:"
    curl -s -o /dev/null -w "HTTP %{http_code}\n" http://localhost/ || echo "❌ Frontend non accessible"
fi

echo ""
echo "=============================================="
echo -e "${GREEN}✅ Déploiement terminé!${NC}"
echo ""
echo "🌐 Accès:"
echo "  - Frontend: http://${VM_IP}"
echo "  - Backend health: http://${VM_IP}/api/health"
echo ""
echo "📋 Commandes utiles:"
echo "  - Logs: podman-compose logs -f"
echo "  - Statut: podman-compose ps"
echo "  - Arrêter: podman-compose down"
echo "  - Redémarrer: podman-compose restart"

