#!/bin/bash
# Script pour installer Git et continuer le déploiement
# À exécuter sur la VM

set -e

echo "📦 Installation de Git..."
sudo apt-get update
sudo apt-get install -y git

echo ""
echo "✅ Git installé!"
echo ""
echo "🚀 Continuation du déploiement..."
echo ""

# Exécuter le script de déploiement complet
curl -fsSL https://raw.githubusercontent.com/raouf-rak/dsa-dashboard/main/scripts/deploy_on_vm.sh | bash

