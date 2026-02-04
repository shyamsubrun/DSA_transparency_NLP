#!/bin/bash
# Script pour migrer de Podman/Buildah vers Docker sur la VM
# Usage: bash scripts/migrate_to_docker.sh

set -e

echo "=========================================="
echo "Migration de Podman/Buildah vers Docker"
echo "=========================================="

# Couleurs pour les messages
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Fonction pour afficher les messages
info() {
    echo -e "${GREEN}[INFO]${NC} $1"
}

warn() {
    echo -e "${YELLOW}[WARN]${NC} $1"
}

error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

# Vérifier que le script est exécuté en tant que root ou avec sudo
if [ "$EUID" -ne 0 ]; then 
    error "Ce script doit être exécuté avec sudo"
    exit 1
fi

info "Étape 1: Arrêt des containers Podman existants"
if command -v podman &> /dev/null; then
    info "Arrêt des containers Podman..."
    sudo podman stop dsa-backend dsa-frontend 2>/dev/null || true
    sudo podman rm dsa-backend dsa-frontend 2>/dev/null || true
    info "Containers Podman arrêtés"
else
    warn "Podman n'est pas installé"
fi

info "Étape 2: Arrêt des services systemd liés à Podman"
if systemctl list-units --type=service | grep -q dsa-dashboard; then
    info "Arrêt du service systemd..."
    systemctl stop dsa-dashboard.service 2>/dev/null || true
    systemctl disable dsa-dashboard.service 2>/dev/null || true
    rm -f /etc/systemd/system/dsa-dashboard.service
    systemctl daemon-reload
    info "Service systemd arrêté"
else
    info "Aucun service systemd trouvé"
fi

info "Étape 3: Vérification de Docker"
if command -v docker &> /dev/null; then
    info "Docker est déjà installé"
    docker --version
else
    error "Docker n'est pas installé. Veuillez d'abord exécuter scripts/install_docker.sh"
    exit 1
fi

info "Étape 4: Vérification de Docker Compose"
if command -v docker-compose &> /dev/null || docker compose version &> /dev/null; then
    info "Docker Compose est disponible"
    docker compose version || docker-compose --version
else
    error "Docker Compose n'est pas installé"
    exit 1
fi

# Détecter si sudo est nécessaire pour Docker
DOCKER_CMD="docker"
if ! docker ps &> /dev/null 2>&1; then
    if sudo docker ps &> /dev/null 2>&1; then
        warn "Docker nécessite sudo. Utilisation de 'sudo docker'..."
        DOCKER_CMD="sudo docker"
    else
        error "Impossible d'accéder à Docker. Vérifiez l'installation."
        exit 1
    fi
fi

# Déterminer la commande docker compose
if command -v docker-compose &> /dev/null; then
    COMPOSE_CMD="$DOCKER_CMD-compose"
elif $DOCKER_CMD compose version &> /dev/null 2>&1; then
    COMPOSE_CMD="$DOCKER_CMD compose"
else
    error "Docker Compose n'est pas disponible"
    exit 1
fi

info "Étape 5: Nettoyage des images Podman (optionnel)"
read -p "Voulez-vous supprimer les images Podman existantes ? (y/N) " -n 1 -r
echo
if [[ $REPLY =~ ^[Yy]$ ]]; then
    info "Suppression des images Podman..."
    sudo podman rmi -a 2>/dev/null || true
    info "Images Podman supprimées"
fi

info "Étape 6: Mise à jour du code depuis GitHub"
# Détecter l'utilisateur réel (même si exécuté avec sudo)
REAL_USER="${SUDO_USER:-$USER}"
REAL_HOME=$(getent passwd "$REAL_USER" | cut -d: -f6)
PROJECT_DIR="$REAL_HOME/dsa-dashboard"

if [ ! -d "$PROJECT_DIR" ]; then
    error "Le dossier $PROJECT_DIR n'existe pas"
    exit 1
fi

cd "$PROJECT_DIR" || exit 1
info "Répertoire du projet: $PROJECT_DIR"
git pull origin main || git pull origin master || warn "Impossible de faire git pull"

info "Étape 7: Construction et démarrage avec Docker Compose"
info "Construction des images Docker..."
$COMPOSE_CMD build

info "Démarrage des services..."
$COMPOSE_CMD up -d

info "Attente du démarrage des services..."
sleep 10

info "Étape 8: Vérification du statut"
$COMPOSE_CMD ps

info "Étape 9: Test de santé"
if curl -f http://localhost:3001/health > /dev/null 2>&1; then
    info "✅ Backend est healthy"
else
    warn "⚠️  Backend ne répond pas encore, vérifiez les logs avec: $COMPOSE_CMD logs backend"
fi

if curl -f http://localhost/health > /dev/null 2>&1; then
    info "✅ Frontend est accessible"
else
    warn "⚠️  Frontend ne répond pas encore, vérifiez les logs avec: $COMPOSE_CMD logs frontend"
fi

echo ""
echo "=========================================="
info "Migration terminée !"
echo "=========================================="
info "Commandes utiles:"
echo "  - Voir les logs: $COMPOSE_CMD logs -f"
echo "  - Arrêter: $COMPOSE_CMD down"
echo "  - Redémarrer: $COMPOSE_CMD restart"
echo "  - Statut: $COMPOSE_CMD ps"
echo ""
info "Dashboard disponible sur: http://$(hostname -I | awk '{print $1}')"
info "Ou localement: http://localhost"
