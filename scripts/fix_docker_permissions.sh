#!/bin/bash
# Script pour corriger les permissions Docker
# Usage: bash scripts/fix_docker_permissions.sh

set -e

echo "=========================================="
echo "Correction des permissions Docker"
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

# Vérifier que Docker est installé
if ! command -v docker &> /dev/null; then
    error "Docker n'est pas installé. Veuillez d'abord exécuter scripts/install_docker.sh"
    exit 1
fi

# Obtenir le nom d'utilisateur actuel
CURRENT_USER=$(whoami)
info "Utilisateur actuel: $CURRENT_USER"

# Vérifier si l'utilisateur est déjà dans le groupe docker
if groups | grep -q docker; then
    warn "L'utilisateur $CURRENT_USER est déjà dans le groupe docker"
    warn "Si vous avez toujours des problèmes de permissions, déconnectez-vous et reconnectez-vous"
else
    info "Ajout de l'utilisateur $CURRENT_USER au groupe docker..."
    sudo usermod -aG docker $CURRENT_USER
    info "Utilisateur ajouté au groupe docker"
    warn "IMPORTANT: Vous devez vous déconnecter et vous reconnecter pour que les changements prennent effet"
    warn "Ou utilisez la commande: newgrp docker"
fi

echo ""
info "Pour tester Docker sans sudo, utilisez:"
echo "  newgrp docker"
echo "  docker ps"
echo ""
info "Ou déconnectez-vous et reconnectez-vous à la VM"
