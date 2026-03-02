#!/bin/bash
# Script complet pour vérifier VM et PostgreSQL
# À exécuter directement sur la VM après connexion SSH

echo "=========================================="
echo "🔍 VÉRIFICATION COMPLÈTE VM + POSTGRESQL"
echo "=========================================="
echo ""

# Variables PostgreSQL
DB_HOST="34.46.198.22"
DB_PORT="5432"
DB_NAME="dsa"
DB_USER="dsa_admin"
DB_PASSWORD="Mohamed2025!"

export PGPASSWORD="$DB_PASSWORD"

# ==========================================
# 1. VÉRIFICATION VM
# ==========================================
echo "📁 1. STRUCTURE VM"
echo "--------------------------------"
echo "Répertoire home:"
ls -lah ~ | head -20
echo ""

echo "Espace disque:"
df -h
echo ""

echo "Mémoire:"
free -h
echo ""

echo "PostgreSQL service:"
if systemctl is-active --quiet postgresql; then
    echo "✅ PostgreSQL est actif"
    systemctl status postgresql --no-pager | head -5
else
    echo "⚠️ PostgreSQL service status:"
    systemctl status postgresql --no-pager | head -5
fi
echo ""

# ==========================================
# 2. VÉRIFICATION POSTGRESQL
# ==========================================
echo "🗄️ 2. BASE DE DONNÉES POSTGRESQL"
echo "--------------------------------"

echo "Connexion et version:"
psql -h "$DB_HOST" -p "$DB_PORT" -U "$DB_USER" -d "$DB_NAME" -c "
SELECT 
    version() AS postgresql_version,
    current_database() AS current_db,
    current_user AS current_user;
" 2>&1

echo ""
echo "Taille de la base de données:"
psql -h "$DB_HOST" -p "$DB_PORT" -U "$DB_USER" -d "$DB_NAME" -c "
SELECT 
    pg_size_pretty(pg_database_size('$DB_NAME')) AS database_size;
" 2>&1

echo ""
echo "Liste des tables:"
psql -h "$DB_HOST" -p "$DB_PORT" -U "$DB_USER" -d "$DB_NAME" -c "
SELECT 
    schemaname,
    tablename,
    pg_size_pretty(pg_total_relation_size(schemaname||'.'||tablename)) AS size
FROM pg_tables
WHERE schemaname NOT IN ('pg_catalog', 'information_schema')
ORDER BY pg_total_relation_size(schemaname||'.'||tablename) DESC;
" 2>&1

echo ""
echo "Nombre de lignes par table:"
psql -h "$DB_HOST" -p "$DB_PORT" -U "$DB_USER" -d "$DB_NAME" -c "
SELECT 
    tablename,
    (xpath('/row/c/text()', query_to_xml(format('select count(*) as c from %I.%I', 'public', tablename), false, true, '')))[1]::text::int AS row_count
FROM pg_tables
WHERE schemaname = 'public'
ORDER BY row_count DESC;
" 2>&1

# Vérifier si table moderation_entries existe
echo ""
echo "Vérification table 'moderation_entries':"
TABLE_EXISTS=$(psql -h "$DB_HOST" -p "$DB_PORT" -U "$DB_USER" -d "$DB_NAME" -tAc "SELECT EXISTS (SELECT FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'moderation_entries');" 2>&1 | tr -d ' ')

if [ "$TABLE_EXISTS" = "t" ]; then
    echo "✅ Table 'moderation_entries' existe"
    echo ""
    echo "Structure de la table:"
    psql -h "$DB_HOST" -p "$DB_PORT" -U "$DB_USER" -d "$DB_NAME" -c "\d moderation_entries" 2>&1
    
    echo ""
    echo "Statistiques:"
    psql -h "$DB_HOST" -p "$DB_PORT" -U "$DB_USER" -d "$DB_NAME" -c "
    SELECT 
        COUNT(*) AS total_rows,
        MIN(application_date) AS earliest_date,
        MAX(application_date) AS latest_date,
        COUNT(DISTINCT application_date) AS unique_dates
    FROM moderation_entries;
    " 2>&1
    
    echo ""
    echo "Échantillon (5 premières lignes):"
    psql -h "$DB_HOST" -p "$DB_PORT" -U "$DB_USER" -d "$DB_NAME" -c "SELECT * FROM moderation_entries LIMIT 5;" 2>&1
else
    echo "❌ Table 'moderation_entries' n'existe pas encore"
fi

# Vérifier tables de référence
echo ""
echo "Tables de référence:"
for table in platforms categories decision_types decision_grounds content_types; do
    TABLE_EXISTS=$(psql -h "$DB_HOST" -p "$DB_PORT" -U "$DB_USER" -d "$DB_NAME" -tAc "SELECT EXISTS (SELECT FROM information_schema.tables WHERE table_schema = 'public' AND table_name = '$table');" 2>&1 | tr -d ' ')
    if [ "$TABLE_EXISTS" = "t" ]; then
        echo "✅ Table '$table' existe:"
        psql -h "$DB_HOST" -p "$DB_PORT" -U "$DB_USER" -d "$DB_NAME" -c "SELECT COUNT(*) AS count FROM $table;" 2>&1
        psql -h "$DB_HOST" -p "$DB_PORT" -U "$DB_USER" -d "$DB_NAME" -c "SELECT * FROM $table LIMIT 5;" 2>&1
    else
        echo "❌ Table '$table' n'existe pas"
    fi
done

echo ""
echo "Indexes:"
psql -h "$DB_HOST" -p "$DB_PORT" -U "$DB_USER" -d "$DB_NAME" -c "
SELECT 
    tablename,
    indexname,
    pg_size_pretty(pg_relation_size(indexname::regclass)) AS index_size
FROM pg_indexes
WHERE schemaname = 'public'
ORDER BY pg_relation_size(indexname::regclass) DESC
LIMIT 10;
" 2>&1

# ==========================================
# 3. FICHIERS SUR LA VM
# ==========================================
echo ""
echo "📂 3. FICHIERS SUR LA VM"
echo "--------------------------------"
echo "Fichiers CSV:"
find ~ -name "*.csv" -type f 2>/dev/null | head -5
echo ""
echo "Scripts Python:"
find ~ -name "*.py" -type f 2>/dev/null | head -5
echo ""
echo "Fichiers SQL:"
find ~ -name "*.sql" -type f 2>/dev/null | head -5

echo ""
echo "=========================================="
echo "✅ Vérification terminée"
echo "=========================================="

unset PGPASSWORD

