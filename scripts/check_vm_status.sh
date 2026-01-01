#!/bin/bash
# Script pour vérifier l'état de la VM et de PostgreSQL

echo "=========================================="
echo "🔍 VÉRIFICATION VM ET POSTGRESQL"
echo "=========================================="

echo ""
echo "📁 1. STRUCTURE DES RÉPERTOIRES"
echo "--------------------------------"
echo "Répertoire home:"
ls -lah ~

echo ""
echo "Répertoires dans /home:"
ls -lah /home/

echo ""
echo "Répertoires dans /opt (si existent):"
if [ -d "/opt" ]; then
    ls -lah /opt/
else
    echo "  /opt n'existe pas"
fi

echo ""
echo "📊 2. ESPACE DISQUE"
echo "--------------------------------"
df -h

echo ""
echo "💾 3. MÉMOIRE"
echo "--------------------------------"
free -h

echo ""
echo "🗄️ 4. POSTGRESQL - VÉRIFICATION SERVICE"
echo "--------------------------------"
if systemctl is-active --quiet postgresql; then
    echo "✅ PostgreSQL est actif"
    systemctl status postgresql --no-pager | head -10
else
    echo "❌ PostgreSQL n'est pas actif"
fi

echo ""
echo "📦 5. VERSIONS INSTALLÉES"
echo "--------------------------------"
echo "PostgreSQL version:"
psql --version 2>/dev/null || echo "  psql non trouvé"

echo "Python version:"
python3 --version 2>/dev/null || echo "  Python3 non trouvé"

echo ""
echo "=========================================="
echo "✅ Vérification terminée"
echo "=========================================="

