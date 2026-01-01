#!/bin/bash
# Script pour corriger les problèmes et relancer le déploiement
# À exécuter sur la VM

set -e

echo "🔧 Correction des problèmes de déploiement"
echo "==========================================="

# 1. Configurer Podman pour utiliser docker.io comme registry par défaut
echo ""
echo "1️⃣  Configuration de Podman..."
if [ ! -f /etc/containers/registries.conf.d/999-docker.conf ]; then
    echo "Création de la configuration Podman..."
    sudo mkdir -p /etc/containers/registries.conf.d
    sudo tee /etc/containers/registries.conf.d/999-docker.conf > /dev/null << 'EOF'
[[registry]]
location = "docker.io"
insecure = false
blocked = false

[[registry]]
location = "quay.io"
insecure = false
blocked = false
EOF
    echo "✅ Configuration Podman créée"
else
    echo "✅ Configuration Podman existe déjà"
fi

# 2. Vérifier la connexion internet
echo ""
echo "2️⃣  Vérification de la connexion internet..."
if curl -s --max-time 10 https://registry.npmjs.org > /dev/null; then
    echo "✅ Connexion à npmjs.org OK"
else
    echo "⚠️  Connexion lente à npmjs.org. Le build peut prendre plus de temps."
fi

# 3. Aller dans le répertoire du projet
cd ~/dsa-dashboard || {
    echo "❌ Répertoire dsa-dashboard non trouvé. Clonage..."
    cd ~
    git clone https://github.com/raouf-rak/dsa-dashboard.git
    cd dsa-dashboard
}

# 4. Mettre à jour les Dockerfiles avec timeout npm
echo ""
echo "3️⃣  Mise à jour des Dockerfiles..."
if grep -q "fetch-timeout" Dockerfile.backend; then
    echo "✅ Dockerfiles déjà mis à jour"
else
    echo "⚠️  Les Dockerfiles doivent être mis à jour sur GitHub. Continuons..."
fi

# 5. Nettoyer les images et containers existants
echo ""
echo "4️⃣  Nettoyage des images et containers existants..."
podman-compose down 2>/dev/null || true
podman rmi dsa-backend dsa-frontend 2>/dev/null || true
podman system prune -f || true

# 6. Rebuild avec retry et timeout
echo ""
echo "5️⃣  Rebuild des images avec configuration améliorée..."

# Créer un fichier temporaire pour augmenter le timeout npm dans les containers
export BUILDKIT_PROGRESS=plain

# Rebuild avec podman-compose
echo "Build en cours (cela peut prendre 10-15 minutes)..."
podman-compose build --no-cache || {
    echo ""
    echo "⚠️  Build échoué. Tentative avec Buildah directement..."
    
    # Alternative: Build avec Buildah directement
    echo "Build backend avec Buildah..."
    buildah bud \
        --build-arg NPM_CONFIG_FETCH_TIMEOUT=300000 \
        --build-arg NPM_CONFIG_FETCH_RETRIES=5 \
        -f Dockerfile.backend \
        -t dsa-backend:latest \
        . || {
        echo "❌ Erreur lors du build backend"
        exit 1
    }
    
    echo "Build frontend avec Buildah..."
    buildah bud \
        --build-arg VITE_API_BASE_URL=/api \
        --build-arg NPM_CONFIG_FETCH_TIMEOUT=300000 \
        --build-arg NPM_CONFIG_FETCH_RETRIES=5 \
        -f Dockerfile.frontend \
        -t dsa-frontend:latest \
        . || {
        echo "❌ Erreur lors du build frontend"
        exit 1
    }
    
    # Démarrer avec podman directement
    echo "Démarrage des containers..."
    podman network create dsa-network 2>/dev/null || true
    
    podman run -d \
      --name dsa-backend \
      --network dsa-network \
      -p 3001:3001 \
      -e DATABASE_URL="postgresql://dsa_admin:Mohamed2025!@host.docker.internal:5432/dsa" \
      -e NODE_ENV=production \
      -e PORT=3001 \
      --restart unless-stopped \
      dsa-backend:latest
    
    podman run -d \
      --name dsa-frontend \
      --network dsa-network \
      -p 80:80 \
      --restart unless-stopped \
      dsa-frontend:latest
}

# 7. Attendre le démarrage
echo ""
echo "6️⃣  Attente du démarrage (20 secondes)..."
sleep 20

# 8. Vérification
echo ""
echo "7️⃣  Vérification du déploiement..."
if [ -f "scripts/check_deployment.sh" ]; then
    bash scripts/check_deployment.sh
else
    echo "Vérification manuelle..."
    podman ps --filter "name=dsa-"
    echo ""
    echo "Backend health:"
    curl -s http://localhost:3001/health || echo "❌ Backend non accessible"
fi

echo ""
echo "=============================================="
echo "✅ Correction terminée!"
echo ""
echo "Si le build échoue encore, essayez:"
echo "  cd ~/dsa-dashboard"
echo "  podman-compose build --no-cache"
echo "  podman-compose up -d"

