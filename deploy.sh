#!/bin/bash
# Script de déploiement automatisé depuis la machine locale
# Usage: bash deploy.sh [VM_USER] [VM_HOST]

set -e

VM_USER=${1:-raouf.abdallah}
VM_HOST=${2:-35.223.190.104}
VM_PATH="~/dsa-dashboard"

echo "🚀 Déploiement automatisé DSA Dashboard"
echo "=========================================="
echo "VM: $VM_USER@$VM_HOST"
echo ""

# Vérifier que nous sommes dans le bon répertoire
if [ ! -f "docker-compose.yml" ]; then
    echo "❌ Erreur: docker-compose.yml non trouvé. Exécutez ce script depuis la racine du projet."
    exit 1
fi

# Vérifier que git est configuré
if ! git remote get-url origin &> /dev/null; then
    echo "❌ Erreur: Aucun remote Git configuré. Configurez d'abord le remote origin."
    exit 1
fi

echo "📦 Poussage du code vers GitHub..."
git push origin main

echo ""
echo "🔌 Connexion à la VM et déploiement..."

# Commande SSH pour déployer sur la VM
ssh "$VM_USER@$VM_HOST" << 'ENDSSH'
set -e

echo "📥 Mise à jour du code sur la VM..."
cd ~/dsa-dashboard || {
    echo "Clonage du repository..."
    git clone https://github.com/raouf-rak/dsa-dashboard.git ~/dsa-dashboard
    cd ~/dsa-dashboard
}

git pull origin main

echo ""
echo "🚀 Déploiement avec podman-compose..."
cd ~/dsa-dashboard

# Vérifier si podman-compose est disponible
if command -v podman-compose &> /dev/null; then
    podman-compose down 2>/dev/null || true
    podman-compose up -d --build
else
    echo "⚠️  podman-compose non trouvé. Utilisation du script de déploiement..."
    bash scripts/deploy_podman.sh
fi

echo ""
echo "⏳ Attente du démarrage (15 secondes)..."
sleep 15

echo ""
echo "🔍 Vérification du déploiement..."
bash scripts/check_deployment.sh || true

ENDSSH

echo ""
echo "✅ Déploiement terminé!"
echo ""
echo "🌐 Accès:"
echo "  - Frontend: http://$VM_HOST"
echo "  - Backend health: http://$VM_HOST/api/health"
echo ""
echo "Pour vérifier manuellement:"
echo "  ssh $VM_USER@$VM_HOST"
echo "  cd ~/dsa-dashboard"
echo "  bash scripts/check_deployment.sh"

