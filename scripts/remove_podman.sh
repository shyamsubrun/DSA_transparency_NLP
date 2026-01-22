#!/bin/bash
# Script pour supprimer Podman et Buildah de la VM
# Usage: bash scripts/remove_podman.sh

set -e

echo "=========================================="
echo "Suppression de Podman et Buildah"
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

# Vérifier que le script est exécuté en tant que root ou avec sudo
if [ "$EUID" -ne 0 ]; then 
    error "Ce script doit être exécuté avec sudo"
    exit 1
fi

info "Étape 1: Arrêt de tous les containers Podman"
if command -v podman &> /dev/null; then
    info "Arrêt de tous les containers Podman..."
    sudo podman stop -a 2>/dev/null || true
    sudo podman rm -a 2>/dev/null || true
    info "Tous les containers Podman arrêtés"
else
    warn "Podman n'est pas installé"
fi

info "Étape 2: Suppression des images Podman"
if command -v podman &> /dev/null; then
    info "Suppression de toutes les images Podman..."
    sudo podman rmi -a 2>/dev/null || true
    info "Images Podman supprimées"
fi

info "Étape 3: Arrêt des services systemd liés à Podman"
if systemctl list-units --type=service | grep -q dsa-dashboard; then
    info "Arrêt et désactivation du service systemd..."
    systemctl stop dsa-dashboard.service 2>/dev/null || true
    systemctl disable dsa-dashboard.service 2>/dev/null || true
    rm -f /etc/systemd/system/dsa-dashboard.service
    systemctl daemon-reload
    info "Service systemd supprimé"
fi

info "Étape 4: Suppression de Podman"
if command -v podman &> /dev/null; then
    info "Désinstallation de Podman..."
    apt-get remove -y podman podman-compose 2>/dev/null || true
    apt-get purge -y podman podman-compose 2>/dev/null || true
    info "Podman désinstallé"
else
    info "Podman n'est pas installé"
fi

info "Étape 5: Suppression de Buildah"
if command -v buildah &> /dev/null; then
    info "Désinstallation de Buildah..."
    apt-get remove -y buildah 2>/dev/null || true
    apt-get purge -y buildah 2>/dev/null || true
    info "Buildah désinstallé"
else
    info "Buildah n'est pas installé"
fi

info "Étape 6: Nettoyage des fichiers de configuration Podman"
rm -rf ~/.local/share/containers 2>/dev/null || true
rm -rf ~/.config/containers 2>/dev/null || true
rm -rf /var/lib/containers 2>/dev/null || true
info "Fichiers de configuration Podman supprimés"

info "Étape 7: Nettoyage des dépendances inutilisées"
apt-get autoremove -y
apt-get autoclean -y

echo ""
echo "=========================================="
info "Suppression terminée !"
echo "=========================================="
info "Podman et Buildah ont été supprimés de la VM"
warn "Assurez-vous d'avoir Docker installé avant de continuer"
warn "Exécutez: bash scripts/install_docker.sh"
