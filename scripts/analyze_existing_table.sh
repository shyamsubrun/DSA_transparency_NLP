#!/bin/bash
# Script pour analyser la table dsa_decisions existante

echo "=========================================="
echo "🔍 ANALYSE TABLE dsa_decisions"
echo "=========================================="
echo ""

sudo -u postgres psql -d dsa << 'SQL'
-- 1. Structure de la table
\d dsa_decisions

-- 2. Nombre total de lignes
SELECT COUNT(*) AS total_rows FROM dsa_decisions;

-- 3. Dates disponibles
SELECT 
    MIN(application_date) AS min_date,
    MAX(application_date) AS max_date,
    COUNT(DISTINCT application_date) AS unique_dates
FROM dsa_decisions;

-- 4. Échantillon de données (5 premières lignes)
SELECT * FROM dsa_decisions LIMIT 5;

-- 5. Colonnes et types
SELECT 
    column_name,
    data_type,
    character_maximum_length,
    is_nullable
FROM information_schema.columns
WHERE table_schema = 'public' 
  AND table_name = 'dsa_decisions'
ORDER BY ordinal_position;

-- 6. Statistiques par colonne (NULL count)
SELECT 
    'uuid' AS column_name,
    COUNT(*) AS total,
    COUNT(uuid) AS non_null,
    COUNT(*) - COUNT(uuid) AS null_count,
    ROUND(100.0 * (COUNT(*) - COUNT(uuid)) / COUNT(*), 2) AS null_percentage
FROM dsa_decisions;

-- 7. Plateformes uniques
SELECT 
    COUNT(DISTINCT platform_name) AS unique_platforms,
    platform_name,
    COUNT(*) AS count
FROM dsa_decisions
GROUP BY platform_name
ORDER BY count DESC
LIMIT 10;

-- 8. Catégories uniques
SELECT 
    COUNT(DISTINCT category) AS unique_categories,
    category,
    COUNT(*) AS count
FROM dsa_decisions
GROUP BY category
ORDER BY count DESC
LIMIT 10;
SQL

echo ""
echo "=========================================="
echo "✅ Analyse terminée"
echo "=========================================="

