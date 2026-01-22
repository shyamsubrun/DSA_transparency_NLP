#!/bin/bash
# Script pour installer Docker et Docker Compose sur Ubuntu/Debian
# Usage: bash scripts/install_docker.sh

set -e

echo "=========================================="
echo "Installation de Docker et Docker Compose"
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

# Détecter la distribution
if [ -f /etc/os-release ]; then
    . /etc/os-release
    OS=$ID
    VER=$VERSION_ID
else
    error "Impossible de détecter la distribution Linux"
    exit 1
fi

info "Distribution détectée: $OS $VER"

# Vérifier si Docker est déjà installé
if command -v docker &> /dev/null; then
    warn "Docker est déjà installé"
    docker --version
    read -p "Voulez-vous continuer quand même ? (y/N) " -n 1 -r
    echo
    if [[ ! $REPLY =~ ^[Yy]$ ]]; then
        exit 0
    fi
fi

info "Étape 1: Mise à jour des paquets"
apt-get update

info "Étape 2: Installation des dépendances"
apt-get install -y \
    ca-certificates \
    curl \
    gnupg \
    lsb-release

info "Étape 3: Ajout de la clé GPG officielle de Docker"
install -m 0755 -d /etc/apt/keyrings
curl -fsSL https://download.docker.com/linux/ubuntu/gpg | gpg --dearmor -o /etc/apt/keyrings/docker.gpg
chmod a+r /etc/apt/keyrings/docker.gpg

info "Étape 4: Configuration du dépôt Docker"
echo \
  "deb [arch=$(dpkg --print-architecture) signed-by=/etc/apt/keyrings/docker.gpg] https://download.docker.com/linux/ubuntu \
  $(. /etc/os-release && echo "$VERSION_CODENAME") stable" | \
  tee /etc/apt/sources.list.d/docker.list > /dev/null

info "Étape 5: Mise à jour des paquets avec le nouveau dépôt"
apt-get update

info "Étape 6: Installation de Docker Engine, Docker CLI, et containerd"
apt-get install -y docker-ce docker-ce-cli containerd.io docker-buildx-plugin docker-compose-plugin

info "Étape 7: Démarrage et activation de Docker"
systemctl start docker
systemctl enable docker

info "Étape 8: Vérification de l'installation"
docker --version
docker compose version

info "Étape 9: Ajout de l'utilisateur au groupe docker (pour éviter sudo)"
read -p "Quel est le nom d'utilisateur à ajouter au groupe docker ? (laissez vide pour skip) " username
if [ ! -z "$username" ]; then
    usermod -aG docker $username
    info "Utilisateur $username ajouté au groupe docker"
    warn "L'utilisateur doit se déconnecter et se reconnecter pour que les changements prennent effet"
fi

info "Étape 10: Test de Docker"
docker run hello-world

echo ""
echo "=========================================="
info "Installation terminée avec succès !"
echo "=========================================="
info "Docker version: $(docker --version)"
info "Docker Compose version: $(docker compose version)"
echo ""
warn "Si vous avez ajouté un utilisateur au groupe docker, déconnectez-vous et reconnectez-vous"
warn "ou utilisez 'newgrp docker' pour appliquer les changements immédiatement"
