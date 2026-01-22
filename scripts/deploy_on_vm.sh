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

# Vérifier que Docker est installé
if ! command -v docker &> /dev/null; then
    error "Docker n'est pas installé. Veuillez d'abord exécuter scripts/install_docker.sh"
    exit 1
fi

# Vérifier que Docker Compose est disponible
if ! command -v docker-compose &> /dev/null && ! docker compose version &> /dev/null; then
    error "Docker Compose n'est pas installé"
    exit 1
fi

# Aller dans le dossier du projet
cd ~/dsa-dashboard || {
    error "Le dossier ~/dsa-dashboard n'existe pas"
    exit 1
}

info "Étape 1: Mise à jour du code depuis GitHub"
git pull origin main || git pull origin master || warn "Impossible de faire git pull"

info "Étape 2: Arrêt des containers existants"
docker compose down 2>/dev/null || true

info "Étape 3: Construction des images Docker"
docker compose build

info "Étape 4: Démarrage des services"
docker compose up -d

info "Étape 5: Attente du démarrage des services..."
sleep 15

info "Étape 6: Vérification du statut"
docker compose ps

info "Étape 7: Test de santé"
echo ""
info "Test du backend..."
if curl -f http://localhost:3001/health > /dev/null 2>&1; then
    info "✅ Backend est healthy"
else
    warn "⚠️  Backend ne répond pas encore"
    warn "Vérifiez les logs avec: docker compose logs backend"
fi

echo ""
info "Test du frontend..."
if curl -f http://localhost/health > /dev/null 2>&1; then
    info "✅ Frontend est accessible"
else
    warn "⚠️  Frontend ne répond pas encore"
    warn "Vérifiez les logs avec: docker compose logs frontend"
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
echo "  - Voir les logs: docker compose logs -f"
echo "  - Arrêter: docker compose down"
echo "  - Redémarrer: docker compose restart"
echo "  - Statut: docker compose ps"
