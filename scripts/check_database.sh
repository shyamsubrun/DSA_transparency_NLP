#!/bin/bash
# Script pour vérifier les données dans PostgreSQL
# Usage: bash scripts/check_database.sh

# Configuration par défaut (peut être surchargée par variables d'environnement)
DB_HOST="${DB_HOST:-localhost}"
DB_PORT="${DB_PORT:-5432}"
DB_NAME="${DB_NAME:-dsa}"
DB_USER="${DB_USER:-dsa_admin}"

echo "🔍 Vérification des données dans PostgreSQL"
echo "=========================================="
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
    psql -h "$DB_HOST" -p "$DB_PORT" -U "$DB_USER" -d "$DB_NAME" -c "$query"
}

# 1. Nombre total d'actions
run_query "SELECT COUNT(*) as total_actions FROM moderation_entries;" "Nombre total d'actions"

# 2. Actions par plateforme (TOP 10)
run_query "
SELECT 
    p.name as platform_name,
    COUNT(*) as action_count,
    ROUND(COUNT(*) * 100.0 / (SELECT COUNT(*) FROM moderation_entries), 2) as percentage
FROM moderation_entries me
JOIN platforms p ON me.platform_id = p.id
GROUP BY p.name
ORDER BY action_count DESC
LIMIT 10;
" "Actions par plateforme (TOP 10)"

# 3. Statistiques générales (KPIs)
run_query "
SELECT 
    COUNT(*) as total_actions,
    COUNT(DISTINCT platform_id) as platform_count,
    COUNT(DISTINCT country_code) as country_count,
    ROUND(AVG(delay_days), 2) as average_delay_days,
    COUNT(CASE WHEN automated_detection = true THEN 1 END) as automated_detection_count,
    ROUND(COUNT(CASE WHEN automated_detection = true THEN 1 END) * 100.0 / COUNT(*), 2) as automated_detection_rate,
    COUNT(CASE WHEN automated_decision = true THEN 1 END) as automated_decision_count,
    ROUND(COUNT(CASE WHEN automated_decision = true THEN 1 END) * 100.0 / COUNT(*), 2) as automated_decision_rate
FROM moderation_entries;
" "Statistiques générales (KPIs)"

# 4. Plage de dates
run_query "
SELECT 
    MIN(application_date) as earliest_date,
    MAX(application_date) as latest_date,
    COUNT(DISTINCT DATE(application_date)) as unique_dates
FROM moderation_entries;
" "Plage de dates des données"

# 5. Actions par catégorie
run_query "
SELECT 
    c.name as category_name,
    COUNT(*) as action_count,
    ROUND(COUNT(*) * 100.0 / (SELECT COUNT(*) FROM moderation_entries), 2) as percentage
FROM moderation_entries me
JOIN categories c ON me.category_id = c.id
GROUP BY c.name
ORDER BY action_count DESC
LIMIT 10;
" "Actions par catégorie (TOP 10)"

echo ""
echo "✅ Vérification terminée!"
echo ""
echo "💡 Pour voir toutes les requêtes disponibles, exécutez:"
echo "   psql -h $DB_HOST -p $DB_PORT -U $DB_USER -d $DB_NAME -f database/check_data.sql"

