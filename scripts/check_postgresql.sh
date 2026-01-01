#!/bin/bash
# Script pour vérifier la base de données PostgreSQL

# Variables de connexion
DB_HOST="35.223.190.104"
DB_PORT="5432"
DB_NAME="dsa"
DB_USER="dsa_admin"
DB_PASSWORD="Mohamed2025!"

export PGPASSWORD="$DB_PASSWORD"

echo "=========================================="
echo "🗄️ VÉRIFICATION BASE DE DONNÉES POSTGRESQL"
echo "=========================================="

echo ""
echo "📊 1. CONNEXION ET VERSIONS"
echo "--------------------------------"
psql -h "$DB_HOST" -p "$DB_PORT" -U "$DB_USER" -d "$DB_NAME" -c "
SELECT 
    version() AS postgresql_version,
    current_database() AS current_db,
    current_user AS current_user;
"

echo ""
echo "📈 2. TAILLE DE LA BASE DE DONNÉES"
echo "--------------------------------"
psql -h "$DB_HOST" -p "$DB_PORT" -U "$DB_USER" -d "$DB_NAME" -c "
SELECT 
    pg_size_pretty(pg_database_size('$DB_NAME')) AS database_size;
"

echo ""
echo "📋 3. LISTE DES TABLES"
echo "--------------------------------"
psql -h "$DB_HOST" -p "$DB_PORT" -U "$DB_USER" -d "$DB_NAME" -c "
SELECT 
    schemaname,
    tablename,
    pg_size_pretty(pg_total_relation_size(schemaname||'.'||tablename)) AS size
FROM pg_tables
WHERE schemaname NOT IN ('pg_catalog', 'information_schema')
ORDER BY pg_total_relation_size(schemaname||'.'||tablename) DESC;
"

echo ""
echo "📊 4. NOMBRE DE LIGNES PAR TABLE"
echo "--------------------------------"
psql -h "$DB_HOST" -p "$DB_PORT" -U "$DB_USER" -d "$DB_NAME" -c "
SELECT 
    schemaname,
    tablename,
    (xpath('/row/c/text()', query_to_xml(format('select count(*) as c from %I.%I', schemaname, tablename), false, true, '')))[1]::text::int AS row_count
FROM pg_tables
WHERE schemaname NOT IN ('pg_catalog', 'information_schema')
ORDER BY row_count DESC;
"

echo ""
echo "🔍 5. STRUCTURE DES TABLES (si existent)"
echo "--------------------------------"

# Vérifier si table moderation_entries existe
if psql -h "$DB_HOST" -p "$DB_PORT" -U "$DB_USER" -d "$DB_NAME" -tAc "SELECT EXISTS (SELECT FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'moderation_entries');" | grep -q t; then
    echo "Table 'moderation_entries' existe:"
    psql -h "$DB_HOST" -p "$DB_PORT" -U "$DB_USER" -d "$DB_NAME" -c "\d moderation_entries"
    
    echo ""
    echo "Échantillon de données (5 premières lignes):"
    psql -h "$DB_HOST" -p "$DB_PORT" -U "$DB_USER" -d "$DB_NAME" -c "SELECT * FROM moderation_entries LIMIT 5;"
    
    echo ""
    echo "Statistiques:"
    psql -h "$DB_HOST" -p "$DB_PORT" -U "$DB_USER" -d "$DB_NAME" -c "
    SELECT 
        COUNT(*) AS total_rows,
        MIN(application_date) AS earliest_date,
        MAX(application_date) AS latest_date,
        COUNT(DISTINCT application_date) AS unique_dates
    FROM moderation_entries;
    "
else
    echo "❌ Table 'moderation_entries' n'existe pas encore"
fi

# Vérifier tables de référence
echo ""
echo "📋 6. TABLES DE RÉFÉRENCE"
echo "--------------------------------"
for table in platforms categories decision_types decision_grounds content_types; do
    if psql -h "$DB_HOST" -p "$DB_PORT" -U "$DB_USER" -d "$DB_NAME" -tAc "SELECT EXISTS (SELECT FROM information_schema.tables WHERE table_schema = 'public' AND table_name = '$table');" | grep -q t; then
        echo "Table '$table' existe:"
        psql -h "$DB_HOST" -p "$DB_PORT" -U "$DB_USER" -d "$DB_NAME" -c "SELECT COUNT(*) AS count FROM $table;"
        psql -h "$DB_HOST" -p "$DB_PORT" -U "$DB_USER" -d "$DB_NAME" -c "SELECT * FROM $table LIMIT 10;"
        echo ""
    else
        echo "❌ Table '$table' n'existe pas"
    fi
done

echo ""
echo "📊 7. INDEXES"
echo "--------------------------------"
psql -h "$DB_HOST" -p "$DB_PORT" -U "$DB_USER" -d "$DB_NAME" -c "
SELECT 
    tablename,
    indexname,
    pg_size_pretty(pg_relation_size(indexname::regclass)) AS index_size
FROM pg_indexes
WHERE schemaname = 'public'
ORDER BY pg_relation_size(indexname::regclass) DESC
LIMIT 20;
"

echo ""
echo "=========================================="
echo "✅ Vérification PostgreSQL terminée"
echo "=========================================="

unset PGPASSWORD

