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

info "Étape 5: Nettoyage des images Podman (optionnel)"
read -p "Voulez-vous supprimer les images Podman existantes ? (y/N) " -n 1 -r
echo
if [[ $REPLY =~ ^[Yy]$ ]]; then
    info "Suppression des images Podman..."
    sudo podman rmi -a 2>/dev/null || true
    info "Images Podman supprimées"
fi

info "Étape 6: Mise à jour du code depuis GitHub"
cd ~/dsa-dashboard || exit 1
git pull origin main || git pull origin master || warn "Impossible de faire git pull"

info "Étape 7: Construction et démarrage avec Docker Compose"
info "Construction des images Docker..."
docker compose build

info "Démarrage des services..."
docker compose up -d

info "Attente du démarrage des services..."
sleep 10

info "Étape 8: Vérification du statut"
docker compose ps

info "Étape 9: Test de santé"
if curl -f http://localhost:3001/health > /dev/null 2>&1; then
    info "✅ Backend est healthy"
else
    warn "⚠️  Backend ne répond pas encore, vérifiez les logs avec: docker compose logs backend"
fi

if curl -f http://localhost/health > /dev/null 2>&1; then
    info "✅ Frontend est accessible"
else
    warn "⚠️  Frontend ne répond pas encore, vérifiez les logs avec: docker compose logs frontend"
fi

echo ""
echo "=========================================="
info "Migration terminée !"
echo "=========================================="
info "Commandes utiles:"
echo "  - Voir les logs: docker compose logs -f"
echo "  - Arrêter: docker compose down"
echo "  - Redémarrer: docker compose restart"
echo "  - Statut: docker compose ps"
echo ""
info "Dashboard disponible sur: http://$(hostname -I | awk '{print $1}')"
info "Ou localement: http://localhost"
