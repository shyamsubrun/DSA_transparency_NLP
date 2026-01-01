#!/bin/bash
# Script d'installation des outils nécessaires sur la VM
# Usage: bash setup_vm.sh

set -e

echo "🚀 Installation des outils pour le déploiement DSA Dashboard"
echo "============================================================"

# Vérifier si on est root ou sudo
if [ "$EUID" -eq 0 ]; then 
   echo "❌ Ne pas exécuter ce script en tant que root. Utilisez sudo pour les commandes nécessaires."
   exit 1
fi

echo ""
echo "📦 Installation de Buildah et Podman..."

# Détecter la distribution
if [ -f /etc/redhat-release ]; then
    # RHEL/CentOS/Fedora
    sudo yum install -y buildah podman podman-compose
elif [ -f /etc/debian_version ]; then
    # Debian/Ubuntu
    sudo apt-get update
    sudo apt-get install -y buildah podman podman-compose
else
    echo "⚠️  Distribution non reconnue. Veuillez installer manuellement buildah, podman et podman-compose"
    exit 1
fi

echo ""
echo "✅ Vérification des installations..."

# Vérifier les versions
echo "Buildah version:"
buildah --version

echo ""
echo "Podman version:"
podman --version

echo ""
echo "Podman-compose version:"
podman-compose --version || echo "⚠️  podman-compose non trouvé. Vous pouvez utiliser 'pip install podman-compose'"

echo ""
echo "🔧 Configuration de Podman..."

# Vérifier la configuration Podman
podman info > /dev/null 2>&1 || {
    echo "⚠️  Podman nécessite une configuration. Exécution de podman info..."
    podman info
}

echo ""
echo "✅ Installation terminée avec succès!"
echo ""
echo "Prochaines étapes:"
echo "1. Cloner le repository: git clone https://github.com/raouf-rak/dsa-dashboard.git"
echo "2. Créer le fichier backend/.env.production avec les credentials PostgreSQL"
echo "3. Exécuter le script de déploiement: bash scripts/deploy_podman.sh"

