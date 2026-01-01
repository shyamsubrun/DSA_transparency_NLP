#!/bin/bash
# Script de déploiement avec correction npm timeout
# À exécuter sur la VM

set -e

echo "🚀 Déploiement avec correction npm timeout"
echo "==========================================="

# Aller dans le répertoire
cd ~/dsa-dashboard || {
    echo "Clonage du repository..."
    cd ~
    git clone https://github.com/raouf-rak/dsa-dashboard.git
    cd dsa-dashboard
}

# Mettre à jour le code
echo ""
echo "📥 Mise à jour du code..."
git pull origin main

# Vérifier que les Dockerfiles sont à jour
if grep -q "fetch-timeout 600000" Dockerfile.backend; then
    echo "✅ Dockerfiles à jour avec configuration npm"
else
    echo "⚠️  Dockerfiles pas à jour. Mise à jour manuelle nécessaire."
fi

# Nettoyer
echo ""
echo "🧹 Nettoyage..."
podman-compose down 2>/dev/null || true
podman system prune -f || true

# Build avec retry
echo ""
echo "🔨 Build des images (peut prendre 15-20 minutes avec connexion lente)..."
echo ""

MAX_RETRIES=3
RETRY=0

while [ $RETRY -lt $MAX_RETRIES ]; do
    echo "Tentative $((RETRY + 1))/$MAX_RETRIES..."
    
    if podman-compose build --no-cache 2>&1 | tee /tmp/build.log; then
        echo ""
        echo "✅ Build réussi!"
        break
    else
        RETRY=$((RETRY + 1))
        if [ $RETRY -lt $MAX_RETRIES ]; then
            echo ""
            echo "⚠️  Build échoué. Nouvelle tentative dans 30 secondes..."
            sleep 30
        else
            echo ""
            echo "❌ Build échoué après $MAX_RETRIES tentatives"
            echo ""
            echo "Solutions alternatives:"
            echo "1. Vérifier la connexion internet: curl -v https://registry.npmjs.org"
            echo "2. Utiliser un miroir npm (voir documentation)"
            echo "3. Build localement et pousser les images"
            exit 1
        fi
    fi
done

# Démarrer
echo ""
echo "🚀 Démarrage des containers..."
podman-compose up -d

# Attendre
echo ""
echo "⏳ Attente du démarrage (30 secondes)..."
sleep 30

# Vérifier
echo ""
echo "🔍 Vérification..."
if [ -f "scripts/check_deployment.sh" ]; then
    bash scripts/check_deployment.sh
else
    podman ps --filter "name=dsa-"
    echo ""
    echo "Backend health:"
    curl -s http://localhost:3001/health || echo "❌ Backend non accessible"
fi

echo ""
echo "✅ Déploiement terminé!"

