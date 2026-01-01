#!/bin/bash
# Script de déploiement avec Podman
# Usage: bash scripts/deploy_podman.sh

set -e

echo "🚀 Déploiement DSA Dashboard avec Podman"
echo "========================================"

# Vérifier que nous sommes dans le bon répertoire
if [ ! -f "docker-compose.yml" ]; then
    echo "❌ Erreur: docker-compose.yml non trouvé. Exécutez ce script depuis la racine du projet."
    exit 1
fi

# Vérifier que podman-compose est disponible
if ! command -v podman-compose &> /dev/null; then
    echo "⚠️  podman-compose non trouvé. Utilisation de podman directement..."
    USE_PODMAN_DIRECT=true
else
    USE_PODMAN_DIRECT=false
fi

echo ""
echo "📦 Build et démarrage des containers..."

if [ "$USE_PODMAN_DIRECT" = true ]; then
    echo "Utilisation de podman directement..."
    
    # Créer le réseau si nécessaire
    podman network exists dsa-network || podman network create dsa-network
    
    # Arrêter les containers existants s'ils existent
    podman stop dsa-backend dsa-frontend 2>/dev/null || true
    podman rm dsa-backend dsa-frontend 2>/dev/null || true
    
    # Build des images
    echo "Building backend image..."
    buildah bud -f Dockerfile.backend -t dsa-backend:latest .
    
    echo "Building frontend image..."
    buildah bud -f Dockerfile.frontend --build-arg VITE_API_BASE_URL=/api -t dsa-frontend:latest .
    
    # Démarrer le backend
    echo "Starting backend container..."
    podman run -d \
      --name dsa-backend \
      --network dsa-network \
      -p 3001:3001 \
      -e DATABASE_URL="postgresql://dsa_admin:Mohamed2025!@host.docker.internal:5432/dsa" \
      -e NODE_ENV=production \
      -e PORT=3001 \
      --restart unless-stopped \
      dsa-backend:latest
    
    # Démarrer le frontend
    echo "Starting frontend container..."
    podman run -d \
      --name dsa-frontend \
      --network dsa-network \
      -p 80:80 \
      --restart unless-stopped \
      dsa-frontend:latest
else
    echo "Utilisation de podman-compose..."
    
    # Arrêter les containers existants
    podman-compose down 2>/dev/null || true
    
    # Build et démarrer
    podman-compose up -d --build
fi

echo ""
echo "⏳ Attente du démarrage des containers (10 secondes)..."
sleep 10

echo ""
echo "✅ Déploiement terminé!"
echo ""
echo "Vérification du statut:"
podman ps --filter "name=dsa-"

echo ""
echo "📋 Commandes utiles:"
echo "  - Voir les logs: podman-compose logs -f"
echo "  - Vérifier le statut: podman-compose ps"
echo "  - Arrêter: podman-compose down"
echo ""
echo "🌐 Accès:"
echo "  - Frontend: http://35.223.190.104"
echo "  - Backend health: http://35.223.190.104/api/health"

