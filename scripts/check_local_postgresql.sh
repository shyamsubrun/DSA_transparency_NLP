#!/bin/bash
# Script pour vérifier PostgreSQL en connexion locale (depuis la VM)

echo "=========================================="
echo "🔍 VÉRIFICATION POSTGRESQL (LOCAL)"
echo "=========================================="
echo ""

# Essayer différentes méthodes de connexion
echo "1. Vérifier si PostgreSQL est installé:"
which psql
psql --version
echo ""

echo "2. Vérifier le service PostgreSQL:"
sudo systemctl status postgresql --no-pager | head -10
echo ""

echo "3. Essayer connexion locale (sans mot de passe):"
psql -U postgres -d postgres -c "SELECT version();" 2>&1 || echo "❌ Connexion postgres échouée"
echo ""

echo "4. Essayer connexion avec utilisateur système:"
psql -U $USER -d postgres -c "SELECT version();" 2>&1 || echo "❌ Connexion utilisateur système échouée"
echo ""

echo "5. Vérifier les bases de données disponibles:"
sudo -u postgres psql -c "\l" 2>&1 || echo "❌ Impossible de lister les bases"
echo ""

echo "6. Vérifier les utilisateurs PostgreSQL:"
sudo -u postgres psql -c "\du" 2>&1 || echo "❌ Impossible de lister les utilisateurs"
echo ""

echo "7. Essayer connexion à la base 'dsa' avec différents utilisateurs:"
echo "   - Avec postgres:"
sudo -u postgres psql -d dsa -c "\dt" 2>&1 || echo "❌ Base 'dsa' n'existe pas ou accès refusé"
echo ""

echo "   - Avec dsa_admin (local):"
export PGPASSWORD="Mohamed2025!"
psql -U dsa_admin -d dsa -c "\dt" 2>&1 || echo "❌ Connexion dsa_admin locale échouée"
unset PGPASSWORD
echo ""

echo "8. Vérifier la configuration PostgreSQL (pg_hba.conf):"
sudo cat /etc/postgresql/*/main/pg_hba.conf 2>/dev/null | grep -v "^#" | grep -v "^$" || echo "❌ Fichier pg_hba.conf non trouvé"
echo ""

echo "=========================================="
echo "✅ Vérification terminée"
echo "=========================================="

