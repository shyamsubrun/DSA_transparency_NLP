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

echo ""
echo "📊 Définition de la fonction (premiers 500 caractères)"
echo "----------------------------------------"
PGPASSWORD="${PGPASSWORD:-Mohamed2025!}" psql -h "$DB_HOST" -p "$DB_PORT" -U "$DB_USER" -d "$DB_NAME" -c "
SELECT LEFT(pg_get_functiondef(oid), 500) as function_preview
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

# 4. Vérifier la colonne de jointure (uuid dans dsa_decisions, id dans moderation_entries)
echo ""
echo "📊 Vérification de la colonne de jointure"
echo "----------------------------------------"
PGPASSWORD="${PGPASSWORD:-Mohamed2025!}" psql -h "$DB_HOST" -p "$DB_PORT" -U "$DB_USER" -d "$DB_NAME" -c "
SELECT 
    column_name,
    data_type
FROM information_schema.columns
WHERE table_schema = 'public'
  AND table_name = 'dsa_decisions'
  AND column_name IN ('uuid', 'id')
ORDER BY column_name;
" 2>/dev/null

# 5. Compter les données non synchronisées (en utilisant uuid)
run_query "
SELECT 
    COUNT(*) as unsynced_count,
    ROUND(COUNT(*) * 100.0 / NULLIF((SELECT COUNT(*) FROM dsa_decisions), 0), 2) as percentage_unsynced
FROM dsa_decisions dd
LEFT JOIN moderation_entries me ON dd.uuid::text = me.id
WHERE me.id IS NULL;
" "Données dans dsa_decisions non synchronisées vers moderation_entries"

# 6. Compter les données dans moderation_entries qui ne sont pas dans dsa_decisions
run_query "
SELECT 
    COUNT(*) as extra_count
FROM moderation_entries me
LEFT JOIN dsa_decisions dd ON me.id = dd.uuid::text
WHERE dd.uuid IS NULL;
" "Données dans moderation_entries qui ne sont pas dans dsa_decisions"

# 7. Échantillon de données non synchronisées
run_query "
SELECT 
    dd.uuid::text as uuid,
    dd.application_date,
    dd.platform_name
FROM dsa_decisions dd
LEFT JOIN moderation_entries me ON dd.uuid::text = me.id
WHERE me.id IS NULL
ORDER BY dd.application_date DESC
LIMIT 5;
" "Échantillon de données dans dsa_decisions non synchronisées (5 premières)"

# 8. Dates de dernière modification
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

# 9. Vérifier la structure de dsa_decisions
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

