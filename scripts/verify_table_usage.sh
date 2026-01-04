#!/bin/bash
# Script complet pour vérifier quelle table est utilisée et s'il y a des problèmes de synchronisation
# Usage: bash scripts/verify_table_usage.sh

# Configuration
DB_HOST="${DB_HOST:-localhost}"
DB_PORT="${DB_PORT:-5432}"
DB_NAME="${DB_NAME:-dsa}"
DB_USER="${DB_USER:-dsa_admin}"

echo "🔍 Vérification complète des tables et triggers"
echo "================================================"
echo "Host: $DB_HOST:$DB_PORT"
echo "Database: $DB_NAME"
echo "User: $DB_USER"
echo ""

# Fonction pour exécuter une requête et afficher le résultat
run_query() {
    local query="$1"
    local description="$2"
    
    echo ""
    echo "📊 $description"
    echo "----------------------------------------"
    PGPASSWORD="${PGPASSWORD:-Mohamed2025!}" psql -h "$DB_HOST" -p "$DB_PORT" -U "$DB_USER" -d "$DB_NAME" -c "$query" 2>/dev/null || echo "❌ Erreur lors de l'exécution"
}

# ÉTAPE 1: Lister toutes les tables
echo ""
echo "=========================================="
echo "ÉTAPE 1: Liste de TOUTES les tables"
echo "=========================================="
PGPASSWORD="${PGPASSWORD:-Mohamed2025!}" psql -h "$DB_HOST" -p "$DB_PORT" -U "$DB_USER" -d "$DB_NAME" -c "
SELECT 
    tablename,
    pg_size_pretty(pg_total_relation_size('public.'||tablename)) as size
FROM pg_tables
WHERE schemaname = 'public'
ORDER BY tablename;
"

# ÉTAPE 2: Chercher les tables de moderation
echo ""
echo "=========================================="
echo "ÉTAPE 2: Tables contenant 'moderation' ou 'entry'"
echo "=========================================="
run_query "
SELECT 
    tablename,
    pg_size_pretty(pg_total_relation_size('public.'||tablename)) as size
FROM pg_tables
WHERE schemaname = 'public'
  AND (tablename ILIKE '%moderation%' OR tablename ILIKE '%entry%')
ORDER BY tablename;
" "Tables de moderation trouvées"

# ÉTAPE 3: Compter les lignes dans chaque table de moderation
echo ""
echo "=========================================="
echo "ÉTAPE 3: Nombre de lignes par table"
echo "=========================================="

# Table moderation_entries (utilisée par le backend)
run_query "
SELECT 
    'moderation_entries' as table_name,
    COUNT(*) as row_count
FROM moderation_entries;
" "Nombre de lignes dans moderation_entries"

# Chercher d'autres tables et compter leurs lignes
echo ""
echo "Recherche d'autres tables de moderation..."
PGPASSWORD="${PGPASSWORD:-Mohamed2025!}" psql -h "$DB_HOST" -p "$DB_PORT" -U "$DB_USER" -d "$DB_NAME" -t -c "
SELECT tablename 
FROM pg_tables 
WHERE schemaname = 'public' 
  AND (tablename ILIKE '%moderation%' OR tablename ILIKE '%entry%')
  AND tablename != 'moderation_entries';
" | while read table_name; do
    if [ ! -z "$table_name" ]; then
        table_name=$(echo "$table_name" | xargs) # trim whitespace
        echo ""
        echo "Table trouvée: $table_name"
        run_query "SELECT COUNT(*) as row_count FROM $table_name;" "Nombre de lignes dans $table_name"
    fi
done

# ÉTAPE 4: Lister tous les triggers
echo ""
echo "=========================================="
echo "ÉTAPE 4: Liste de TOUS les triggers"
echo "=========================================="
run_query "
SELECT 
    trigger_name,
    event_object_table as table_name,
    event_manipulation as event,
    action_timing as timing
FROM information_schema.triggers
WHERE trigger_schema = 'public'
ORDER BY event_object_table, trigger_name;
" "Triggers dans la base de données"

# ÉTAPE 5: Triggers sur les tables de moderation
echo ""
echo "=========================================="
echo "ÉTAPE 5: Triggers sur les tables de moderation"
echo "=========================================="
run_query "
SELECT 
    trigger_name,
    event_object_table as table_name,
    event_manipulation as event,
    action_timing as timing,
    LEFT(action_statement, 100) as action_preview
FROM information_schema.triggers
WHERE trigger_schema = 'public'
  AND (event_object_table ILIKE '%moderation%' OR event_object_table ILIKE '%entry%')
ORDER BY event_object_table, trigger_name;
" "Triggers sur les tables de moderation"

# ÉTAPE 6: Structure de la table moderation_entries
echo ""
echo "=========================================="
echo "ÉTAPE 6: Structure de moderation_entries"
echo "=========================================="
run_query "
SELECT 
    column_name,
    data_type,
    is_nullable
FROM information_schema.columns
WHERE table_schema = 'public'
  AND table_name = 'moderation_entries'
ORDER BY ordinal_position;
" "Colonnes de moderation_entries"

# ÉTAPE 7: Vérifier les fonctions liées aux triggers
echo ""
echo "=========================================="
echo "ÉTAPE 7: Fonctions utilisées par les triggers"
echo "=========================================="
run_query "
SELECT 
    p.proname as function_name
FROM pg_proc p
JOIN pg_namespace n ON p.pronamespace = n.oid
WHERE n.nspname = 'public'
  AND p.proname ILIKE '%moderation%'
ORDER BY p.proname;
" "Fonctions liées à moderation"

# ÉTAPE 8: Vérifier les vues
echo ""
echo "=========================================="
echo "ÉTAPE 8: Vues (views) dans la base de données"
echo "=========================================="
run_query "
SELECT 
    viewname
FROM pg_views
WHERE schemaname = 'public'
ORDER BY viewname;
" "Vues dans la base de données"

# ÉTAPE 9: Dernières insertions
echo ""
echo "=========================================="
echo "ÉTAPE 9: Dernières insertions dans moderation_entries"
echo "=========================================="
run_query "
SELECT 
    id,
    application_date,
    created_at,
    (SELECT name FROM platforms WHERE id = platform_id) as platform
FROM moderation_entries
ORDER BY created_at DESC
LIMIT 10;
" "10 dernières entrées par created_at"

# ÉTAPE 10: Vérification de la synchronisation
echo ""
echo "=========================================="
echo "ÉTAPE 10: Vérification de la synchronisation"
echo "=========================================="
run_query "
SELECT 
    COUNT(*) as total_rows,
    COUNT(CASE WHEN created_at::date = CURRENT_DATE THEN 1 END) as inserted_today,
    COUNT(CASE WHEN created_at::date = CURRENT_DATE - INTERVAL '1 day' THEN 1 END) as inserted_yesterday,
    MAX(created_at) as last_insert_time,
    MAX(application_date) as latest_application_date,
    MIN(application_date) as earliest_application_date
FROM moderation_entries;
" "Statistiques de synchronisation"

# ÉTAPE 11: Comparer avec les données affichées par le backend
echo ""
echo "=========================================="
echo "ÉTAPE 11: Vérification - Table utilisée par le backend"
echo "=========================================="
echo ""
echo "✅ Le backend utilise la table: moderation_entries"
echo ""
echo "Vérification des données dans cette table:"
run_query "
SELECT 
    p.name as platform_name,
    COUNT(*) as action_count
FROM moderation_entries me
JOIN platforms p ON me.platform_id = p.id
GROUP BY p.name
ORDER BY action_count DESC
LIMIT 5;
" "Top 5 plateformes dans moderation_entries"

echo ""
echo "=========================================="
echo "✅ Vérification terminée!"
echo "=========================================="
echo ""
echo "💡 Résumé:"
echo "   - Le backend utilise: moderation_entries"
echo "   - Vérifiez s'il y a d'autres tables listées ci-dessus"
echo "   - Vérifiez les triggers pour voir s'ils synchronisent les données"
echo ""

