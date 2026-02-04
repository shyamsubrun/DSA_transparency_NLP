#!/bin/bash
# Script pour déployer le dashboard sur la VM avec Docker
# Usage: bash scripts/deploy_on_vm.sh

set -e

echo "=========================================="
echo "Déploiement du Dashboard DSA avec Docker"
echo "=========================================="

# Couleurs pour les messages
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

info() {
    echo -e "${GREEN}[INFO]${NC} $1"
}

warn() {
    echo -e "${YELLOW}[WARN]${NC} $1"
}

error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

# Détecter l'utilisateur réel (même si exécuté avec sudo)
REAL_USER="${SUDO_USER:-$USER}"
REAL_HOME=$(getent passwd "$REAL_USER" | cut -d: -f6)
PROJECT_DIR="$REAL_HOME/dsa-dashboard"

# Vérifier que Docker est installé
if ! command -v docker &> /dev/null; then
    error "Docker n'est pas installé. Veuillez d'abord exécuter scripts/install_docker.sh"
    exit 1
fi

# Détecter si sudo est nécessaire pour Docker
DOCKER_CMD="docker"
if ! docker ps &> /dev/null 2>&1; then
    if sudo docker ps &> /dev/null 2>&1; then
        warn "Docker nécessite sudo. Utilisation de 'sudo docker'..."
        DOCKER_CMD="sudo docker"
        warn "Pour éviter sudo, exécutez: bash scripts/fix_docker_permissions.sh"
    else
        error "Impossible d'accéder à Docker. Vérifiez l'installation."
        exit 1
    fi
fi

# Vérifier que Docker Compose est disponible (avec la bonne commande)
if command -v docker-compose &> /dev/null; then
    COMPOSE_CMD="$DOCKER_CMD-compose"
elif $DOCKER_CMD compose version &> /dev/null 2>&1; then
    COMPOSE_CMD="$DOCKER_CMD compose"
else
    error "Docker Compose n'est pas installé"
    exit 1
fi

# Aller dans le dossier du projet
if [ ! -d "$PROJECT_DIR" ]; then
    error "Le dossier $PROJECT_DIR n'existe pas"
    exit 1
fi

cd "$PROJECT_DIR" || {
    error "Impossible d'accéder au dossier $PROJECT_DIR"
    exit 1
}

info "Répertoire du projet: $PROJECT_DIR"

info "Étape 1: Mise à jour du code depuis GitHub"
git pull origin main || git pull origin master || warn "Impossible de faire git pull"

info "Étape 2: Arrêt des containers existants"
$COMPOSE_CMD down 2>/dev/null || true

info "Étape 3: Construction des images Docker"
$COMPOSE_CMD build

info "Étape 4: Démarrage des services"
$COMPOSE_CMD up -d

info "Étape 5: Attente du démarrage des services..."
sleep 15

info "Étape 6: Vérification du statut"
$COMPOSE_CMD ps

info "Étape 7: Test de santé"
echo ""
info "Test du backend..."
if curl -f http://localhost:3001/health > /dev/null 2>&1; then
    info "✅ Backend est healthy"
else
    warn "⚠️  Backend ne répond pas encore"
    warn "Vérifiez les logs avec: $COMPOSE_CMD logs backend"
fi

echo ""
info "Test du frontend..."
if curl -f http://localhost/health > /dev/null 2>&1; then
    info "✅ Frontend est accessible"
else
    warn "⚠️  Frontend ne répond pas encore"
    warn "Vérifiez les logs avec: $COMPOSE_CMD logs frontend"
fi

echo ""
echo "=========================================="
info "Déploiement terminé !"
echo "=========================================="
info "Dashboard disponible sur:"
info "  - Local: http://localhost"
info "  - Réseau: http://$(hostname -I | awk '{print $1}')"
echo ""
info "Commandes utiles:"
echo "  - Voir les logs: $COMPOSE_CMD logs -f"
echo "  - Arrêter: $COMPOSE_CMD down"
echo "  - Redémarrer: $COMPOSE_CMD restart"
echo "  - Statut: $COMPOSE_CMD ps"
