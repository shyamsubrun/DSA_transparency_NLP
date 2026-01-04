#!/bin/bash
# Script pour vérifier la synchronisation entre dsa_decisions et moderation_entries
# Usage: bash scripts/check_sync_status.sh

DB_HOST="${DB_HOST:-localhost}"
DB_PORT="${DB_PORT:-5432}"
DB_NAME="${DB_NAME:-dsa}"
DB_USER="${DB_USER:-dsa_admin}"

echo "🔍 Vérification de la synchronisation"
echo "======================================"
echo "Host: $DB_HOST:$DB_PORT"
echo "Database: $DB_NAME"
echo "User: $DB_USER"
echo ""

# Fonction pour exécuter une requête
run_query() {
    local query="$1"
    local description="$2"
    
    echo ""
    echo "📊 $description"
    echo "----------------------------------------"
    PGPASSWORD="${PGPASSWORD:-Mohamed2025!}" psql -h "$DB_HOST" -p "$DB_PORT" -U "$DB_USER" -d "$DB_NAME" -c "$query" 2>/dev/null || echo "❌ Erreur"
}

# 1. Compter les lignes dans chaque table
run_query "
SELECT 
    'dsa_decisions' as table_name,
    COUNT(*) as row_count
FROM dsa_decisions
UNION ALL
SELECT 
    'moderation_entries' as table_name,
    COUNT(*) as row_count
FROM moderation_entries;
" "Nombre de lignes dans chaque table"

# 2. Vérifier la fonction de synchronisation
echo ""
echo "📊 Fonction de synchronisation"
echo "----------------------------------------"
PGPASSWORD="${PGPASSWORD:-Mohamed2025!}" psql -h "$DB_HOST" -p "$DB_PORT" -U "$DB_USER" -d "$DB_NAME" -c "
SELECT proname as function_name
FROM pg_proc
WHERE proname = 'sync_dsa_decision_to_moderation_entry';
" 2>/dev/null

# 3. Vérifier les triggers
run_query "
SELECT 
    t.tgname as trigger_name,
    CASE WHEN t.tgenabled = 'O' THEN 'ENABLED' ELSE 'DISABLED' END as status,
    c.relname as table_name
FROM pg_trigger t
JOIN pg_class c ON t.tgrelid = c.oid
WHERE c.relname = 'dsa_decisions'
  AND t.tgisinternal = false;
" "Statut des triggers sur dsa_decisions"

# 4. Compter les données non synchronisées
run_query "
SELECT 
    COUNT(*) as unsynced_count,
    ROUND(COUNT(*) * 100.0 / (SELECT COUNT(*) FROM dsa_decisions), 2) as percentage_unsynced
FROM dsa_decisions dd
LEFT JOIN moderation_entries me ON dd.id = me.id
WHERE me.id IS NULL;
" "Données non synchronisées"

# 5. Échantillon de données non synchronisées
run_query "
SELECT 
    dd.id,
    dd.application_date,
    dd.created_at
FROM dsa_decisions dd
LEFT JOIN moderation_entries me ON dd.id = me.id
WHERE me.id IS NULL
ORDER BY dd.created_at DESC
LIMIT 5;
" "Échantillon de données non synchronisées (5 premières)"

# 6. Dates de dernière modification
run_query "
SELECT 
    'dsa_decisions' as table_name,
    MAX(created_at) as last_created
FROM dsa_decisions
UNION ALL
SELECT 
    'moderation_entries' as table_name,
    MAX(created_at) as last_created
FROM moderation_entries;
" "Dates de dernière modification"

# 7. Vérifier la structure de dsa_decisions
echo ""
echo "📊 Structure de dsa_decisions (premières colonnes)"
echo "----------------------------------------"
PGPASSWORD="${PGPASSWORD:-Mohamed2025!}" psql -h "$DB_HOST" -p "$DB_PORT" -U "$DB_USER" -d "$DB_NAME" -c "
SELECT 
    column_name,
    data_type
FROM information_schema.columns
WHERE table_schema = 'public'
  AND table_name = 'dsa_decisions'
ORDER BY ordinal_position
LIMIT 10;
" 2>/dev/null

echo ""
echo "=========================================="
echo "✅ Vérification terminée!"
echo "=========================================="
echo ""
echo "💡 Analyse:"
echo "   - Si 'unsynced_count' > 0, les triggers ne synchronisent pas toutes les données"
echo "   - Vérifiez que les triggers sont ENABLED"
echo "   - Vérifiez la fonction sync_dsa_decision_to_moderation_entry"
echo ""

