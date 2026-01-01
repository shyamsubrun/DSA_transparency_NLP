-- ============================================================================
-- Script de vérification de complétude des données pour le dashboard DSA
-- ============================================================================
-- Ce script vérifie que toutes les données nécessaires sont présentes
-- pour alimenter tous les graphiques du dashboard frontend.
-- ============================================================================

\echo '============================================================================'
\echo 'VÉRIFICATION DE COMPLÉTUDE DES DONNÉES POUR LE DASHBOARD DSA'
\echo '============================================================================'
\echo ''

-- ============================================================================
-- 1. VÉRIFICATION DES TABLES DE RÉFÉRENCE
-- ============================================================================
\echo '1. VÉRIFICATION DES TABLES DE RÉFÉRENCE'
\echo '----------------------------------------'

SELECT 'Platforms' AS table_name, COUNT(*) AS count FROM platforms
UNION ALL
SELECT 'Categories', COUNT(*) FROM categories
UNION ALL
SELECT 'Decision Types', COUNT(*) FROM decision_types
UNION ALL
SELECT 'Decision Grounds', COUNT(*) FROM decision_grounds
UNION ALL
SELECT 'Content Types', COUNT(*) FROM content_types
ORDER BY table_name;

\echo ''
\echo 'Détails des valeurs dans les tables de référence:'
\echo ''

\echo 'Platforms:'
SELECT id, name FROM platforms ORDER BY name LIMIT 20;

\echo ''
\echo 'Categories:'
SELECT id, name FROM categories ORDER BY name LIMIT 20;

\echo ''
\echo 'Decision Types:'
SELECT id, name FROM decision_types ORDER BY name LIMIT 20;

\echo ''
\echo 'Decision Grounds:'
SELECT id, name FROM decision_grounds ORDER BY name LIMIT 20;

\echo ''
\echo 'Content Types:'
SELECT id, name FROM content_types ORDER BY name LIMIT 20;

\echo ''
\echo ''

-- ============================================================================
-- 2. VÉRIFICATION DES DONNÉES PRINCIPALES
-- ============================================================================
\echo '2. VÉRIFICATION DES DONNÉES PRINCIPALES'
\echo '--------------------------------------'

-- Total d'entrées
SELECT 
    'Total entries' AS metric,
    COUNT(*)::TEXT AS value
FROM moderation_entries;

-- Couverture temporelle
SELECT 
    'Date range' AS metric,
    MIN(application_date)::TEXT || ' to ' || MAX(application_date)::TEXT AS value
FROM moderation_entries;

-- Distribution par mois
SELECT 
    TO_CHAR(application_date, 'YYYY-MM') AS month,
    COUNT(*) AS count
FROM moderation_entries
GROUP BY TO_CHAR(application_date, 'YYYY-MM')
ORDER BY month
LIMIT 24;

\echo ''
\echo ''

-- ============================================================================
-- 3. VÉRIFICATION DES CHAMPS OBLIGATOIRES (NON NULL)
-- ============================================================================
\echo '3. VÉRIFICATION DES CHAMPS OBLIGATOIRES'
\echo '----------------------------------------'

SELECT 
    'application_date (NULL)' AS field,
    COUNT(*) AS missing_count,
    ROUND(100.0 * COUNT(*) / (SELECT COUNT(*) FROM moderation_entries), 2) AS missing_percent
FROM moderation_entries
WHERE application_date IS NULL

UNION ALL

SELECT 
    'platform_id (NULL)',
    COUNT(*),
    ROUND(100.0 * COUNT(*) / (SELECT COUNT(*) FROM moderation_entries), 2)
FROM moderation_entries
WHERE platform_id IS NULL

UNION ALL

SELECT 
    'category_id (NULL)',
    COUNT(*),
    ROUND(100.0 * COUNT(*) / (SELECT COUNT(*) FROM moderation_entries), 2)
FROM moderation_entries
WHERE category_id IS NULL

UNION ALL

SELECT 
    'decision_type_id (NULL)',
    COUNT(*),
    ROUND(100.0 * COUNT(*) / (SELECT COUNT(*) FROM moderation_entries), 2)
FROM moderation_entries
WHERE decision_type_id IS NULL

UNION ALL

SELECT 
    'decision_ground_id (NULL)',
    COUNT(*),
    ROUND(100.0 * COUNT(*) / (SELECT COUNT(*) FROM moderation_entries), 2)
FROM moderation_entries
WHERE decision_ground_id IS NULL;

\echo ''
\echo ''

-- ============================================================================
-- 4. VÉRIFICATION DES CHAMPS OPTIONNELS (COMPLÉTUDE)
-- ============================================================================
\echo '4. COMPLÉTUDE DES CHAMPS OPTIONNELS'
\echo '-----------------------------------'

SELECT 
    'content_date' AS field,
    COUNT(*) FILTER (WHERE content_date IS NOT NULL) AS present_count,
    COUNT(*) FILTER (WHERE content_date IS NULL) AS missing_count,
    ROUND(100.0 * COUNT(*) FILTER (WHERE content_date IS NOT NULL) / COUNT(*), 2) AS completeness_percent
FROM moderation_entries

UNION ALL

SELECT 
    'content_type_id',
    COUNT(*) FILTER (WHERE content_type_id IS NOT NULL),
    COUNT(*) FILTER (WHERE content_type_id IS NULL),
    ROUND(100.0 * COUNT(*) FILTER (WHERE content_type_id IS NOT NULL) / COUNT(*), 2)
FROM moderation_entries

UNION ALL

SELECT 
    'automated_detection',
    COUNT(*) FILTER (WHERE automated_detection IS NOT NULL),
    COUNT(*) FILTER (WHERE automated_detection IS NULL),
    ROUND(100.0 * COUNT(*) FILTER (WHERE automated_detection IS NOT NULL) / COUNT(*), 2)
FROM moderation_entries

UNION ALL

SELECT 
    'automated_decision',
    COUNT(*) FILTER (WHERE automated_decision IS NOT NULL),
    COUNT(*) FILTER (WHERE automated_decision IS NULL),
    ROUND(100.0 * COUNT(*) FILTER (WHERE automated_decision IS NOT NULL) / COUNT(*), 2)
FROM moderation_entries

UNION ALL

SELECT 
    'country_code',
    COUNT(*) FILTER (WHERE country_code IS NOT NULL),
    COUNT(*) FILTER (WHERE country_code IS NULL),
    ROUND(100.0 * COUNT(*) FILTER (WHERE country_code IS NOT NULL) / COUNT(*), 2)
FROM moderation_entries

UNION ALL

SELECT 
    'language',
    COUNT(*) FILTER (WHERE language IS NOT NULL),
    COUNT(*) FILTER (WHERE language IS NULL),
    ROUND(100.0 * COUNT(*) FILTER (WHERE language IS NOT NULL) / COUNT(*), 2)
FROM moderation_entries

UNION ALL

SELECT 
    'delay_days',
    COUNT(*) FILTER (WHERE delay_days IS NOT NULL),
    COUNT(*) FILTER (WHERE delay_days IS NULL),
    ROUND(100.0 * COUNT(*) FILTER (WHERE delay_days IS NOT NULL) / COUNT(*), 2)
FROM moderation_entries

UNION ALL

SELECT 
    'territorial_scope',
    COUNT(*) FILTER (WHERE territorial_scope IS NOT NULL),
    COUNT(*) FILTER (WHERE territorial_scope IS NULL),
    ROUND(100.0 * COUNT(*) FILTER (WHERE territorial_scope IS NOT NULL) / COUNT(*), 2)
FROM moderation_entries;

\echo ''
\echo ''

-- ============================================================================
-- 5. VÉRIFICATION DES RELATIONS (INTÉGRITÉ RÉFÉRENTIELLE)
-- ============================================================================
\echo '5. VÉRIFICATION DES RELATIONS (INTÉGRITÉ RÉFÉRENTIELLE)'
\echo '--------------------------------------------------------'

-- Vérifier les orphans (IDs qui n'existent pas dans les tables de référence)
SELECT 
    'Orphan platform_id' AS check_type,
    COUNT(*) AS orphan_count
FROM moderation_entries me
LEFT JOIN platforms p ON me.platform_id = p.id
WHERE p.id IS NULL

UNION ALL

SELECT 
    'Orphan category_id',
    COUNT(*)
FROM moderation_entries me
LEFT JOIN categories c ON me.category_id = c.id
WHERE c.id IS NULL

UNION ALL

SELECT 
    'Orphan decision_type_id',
    COUNT(*)
FROM moderation_entries me
LEFT JOIN decision_types dt ON me.decision_type_id = dt.id
WHERE dt.id IS NULL

UNION ALL

SELECT 
    'Orphan decision_ground_id',
    COUNT(*)
FROM moderation_entries me
LEFT JOIN decision_grounds dg ON me.decision_ground_id = dg.id
WHERE dg.id IS NULL

UNION ALL

SELECT 
    'Orphan content_type_id',
    COUNT(*)
FROM moderation_entries me
LEFT JOIN content_types ct ON me.content_type_id = ct.id
WHERE me.content_type_id IS NOT NULL AND ct.id IS NULL;

\echo ''
\echo ''

-- ============================================================================
-- 6. VÉRIFICATION DE LA DISTRIBUTION DES DONNÉES
-- ============================================================================
\echo '6. DISTRIBUTION DES DONNÉES PAR DIMENSION'
\echo '------------------------------------------'

-- Distribution par plateforme
\echo 'Distribution par plateforme:'
SELECT 
    p.name AS platform,
    COUNT(*) AS count,
    ROUND(100.0 * COUNT(*) / (SELECT COUNT(*) FROM moderation_entries), 2) AS percent
FROM moderation_entries me
JOIN platforms p ON me.platform_id = p.id
GROUP BY p.name
ORDER BY count DESC
LIMIT 20;

\echo ''
\echo 'Distribution par catégorie:'
SELECT 
    c.name AS category,
    COUNT(*) AS count,
    ROUND(100.0 * COUNT(*) / (SELECT COUNT(*) FROM moderation_entries), 2) AS percent
FROM moderation_entries me
JOIN categories c ON me.category_id = c.id
GROUP BY c.name
ORDER BY count DESC
LIMIT 20;

\echo ''
\echo 'Distribution par type de décision:'
SELECT 
    dt.name AS decision_type,
    COUNT(*) AS count,
    ROUND(100.0 * COUNT(*) / (SELECT COUNT(*) FROM moderation_entries), 2) AS percent
FROM moderation_entries me
JOIN decision_types dt ON me.decision_type_id = dt.id
GROUP BY dt.name
ORDER BY count DESC
LIMIT 20;

\echo ''
\echo 'Distribution par base légale:'
SELECT 
    dg.name AS decision_ground,
    COUNT(*) AS count,
    ROUND(100.0 * COUNT(*) / (SELECT COUNT(*) FROM moderation_entries), 2) AS percent
FROM moderation_entries me
JOIN decision_grounds dg ON me.decision_ground_id = dg.id
GROUP BY dg.name
ORDER BY count DESC
LIMIT 20;

\echo ''
\echo 'Distribution par type de contenu:'
SELECT 
    COALESCE(ct.name, 'NULL') AS content_type,
    COUNT(*) AS count,
    ROUND(100.0 * COUNT(*) / (SELECT COUNT(*) FROM moderation_entries), 2) AS percent
FROM moderation_entries me
LEFT JOIN content_types ct ON me.content_type_id = ct.id
GROUP BY ct.name
ORDER BY count DESC
LIMIT 20;

\echo ''
\echo ''

-- ============================================================================
-- 7. VÉRIFICATION SPÉCIFIQUE POUR LES GRAPHIQUES
-- ============================================================================
\echo '7. VÉRIFICATION SPÉCIFIQUE POUR LES GRAPHIQUES'
\echo '-----------------------------------------------'

-- Time Series: Vérifier qu'il y a plusieurs mois de données
\echo 'Time Series - Distribution mensuelle (derniers 12 mois):'
SELECT 
    TO_CHAR(application_date, 'YYYY-MM') AS month,
    COUNT(*) AS count
FROM moderation_entries
WHERE application_date >= CURRENT_DATE - INTERVAL '12 months'
GROUP BY TO_CHAR(application_date, 'YYYY-MM')
ORDER BY month DESC
LIMIT 12;

\echo ''
\echo 'Time Series - Actions par plateforme et mois (échantillon):'
SELECT 
    p.name AS platform,
    TO_CHAR(me.application_date, 'YYYY-MM') AS month,
    COUNT(*) AS count
FROM moderation_entries me
JOIN platforms p ON me.platform_id = p.id
WHERE me.application_date >= CURRENT_DATE - INTERVAL '6 months'
GROUP BY p.name, TO_CHAR(me.application_date, 'YYYY-MM')
ORDER BY month DESC, count DESC
LIMIT 30;

\echo ''
\echo 'Time Series - Délai moyen par mois:'
SELECT 
    TO_CHAR(application_date, 'YYYY-MM') AS month,
    COUNT(*) AS total_entries,
    COUNT(delay_days) AS entries_with_delay,
    ROUND(AVG(delay_days), 2) AS avg_delay_days
FROM moderation_entries
WHERE application_date >= CURRENT_DATE - INTERVAL '12 months'
GROUP BY TO_CHAR(application_date, 'YYYY-MM')
ORDER BY month DESC
LIMIT 12;

\echo ''
\echo ''

-- Platforms: Vérifier qu'il y a plusieurs plateformes avec des données
\echo 'Platforms - Nombre de plateformes distinctes:'
SELECT 
    COUNT(DISTINCT platform_id) AS distinct_platforms,
    COUNT(*) AS total_entries
FROM moderation_entries;

\echo ''
\echo 'Platforms - Décisions par plateforme et type:'
SELECT 
    p.name AS platform,
    dt.name AS decision_type,
    COUNT(*) AS count
FROM moderation_entries me
JOIN platforms p ON me.platform_id = p.id
JOIN decision_types dt ON me.decision_type_id = dt.id
GROUP BY p.name, dt.name
ORDER BY p.name, count DESC
LIMIT 30;

\echo ''
\echo 'Platforms - Catégories par plateforme (pour radar chart):'
SELECT 
    p.name AS platform,
    c.name AS category,
    COUNT(*) AS count
FROM moderation_entries me
JOIN platforms p ON me.platform_id = p.id
JOIN categories c ON me.category_id = c.id
GROUP BY p.name, c.name
ORDER BY p.name, count DESC
LIMIT 30;

\echo ''
\echo ''

-- Content Types: Vérifier la distribution
\echo 'Content Types - Distribution:'
SELECT 
    COALESCE(ct.name, 'NULL') AS content_type,
    COUNT(*) AS count,
    ROUND(100.0 * COUNT(*) / (SELECT COUNT(*) FROM moderation_entries), 2) AS percent
FROM moderation_entries me
LEFT JOIN content_types ct ON me.content_type_id = ct.id
GROUP BY ct.name
ORDER BY count DESC;

\echo ''
\echo 'Content Types - Décisions par type de contenu:'
SELECT 
    COALESCE(ct.name, 'NULL') AS content_type,
    dt.name AS decision_type,
    COUNT(*) AS count
FROM moderation_entries me
LEFT JOIN content_types ct ON me.content_type_id = ct.id
JOIN decision_types dt ON me.decision_type_id = dt.id
GROUP BY ct.name, dt.name
ORDER BY content_type, count DESC
LIMIT 30;

\echo ''
\echo 'Content Types - Délai moyen par type de contenu:'
SELECT 
    COALESCE(ct.name, 'NULL') AS content_type,
    COUNT(*) AS total,
    COUNT(delay_days) AS with_delay,
    ROUND(AVG(delay_days), 2) AS avg_delay_days
FROM moderation_entries me
LEFT JOIN content_types ct ON me.content_type_id = ct.id
GROUP BY ct.name
ORDER BY avg_delay_days DESC NULLS LAST;

\echo ''
\echo ''

-- Geography: Vérifier la distribution géographique
\echo 'Geography - Distribution par pays:'
SELECT 
    COALESCE(country_code, 'NULL') AS country_code,
    COUNT(*) AS count,
    ROUND(100.0 * COUNT(*) / (SELECT COUNT(*) FROM moderation_entries), 2) AS percent
FROM moderation_entries
GROUP BY country_code
ORDER BY count DESC
LIMIT 30;

\echo ''
\echo 'Geography - Distribution par langue:'
SELECT 
    COALESCE(language, 'NULL') AS language,
    COUNT(*) AS count,
    ROUND(100.0 * COUNT(*) / (SELECT COUNT(*) FROM moderation_entries), 2) AS percent
FROM moderation_entries
GROUP BY language
ORDER BY count DESC
LIMIT 20;

\echo ''
\echo 'Geography - Entrées avec territorial_scope:'
SELECT 
    COUNT(*) FILTER (WHERE territorial_scope IS NOT NULL) AS with_territorial_scope,
    COUNT(*) FILTER (WHERE territorial_scope IS NULL) AS without_territorial_scope,
    ROUND(100.0 * COUNT(*) FILTER (WHERE territorial_scope IS NOT NULL) / COUNT(*), 2) AS percent_with
FROM moderation_entries;

\echo ''
\echo ''

-- Automation: Vérifier la distribution de l'automatisation
\echo 'Automation - Distribution de automated_detection:'
SELECT 
    CASE 
        WHEN automated_detection IS NULL THEN 'NULL'
        WHEN automated_detection THEN 'TRUE'
        ELSE 'FALSE'
    END AS automated_detection,
    COUNT(*) AS count,
    ROUND(100.0 * COUNT(*) / (SELECT COUNT(*) FROM moderation_entries), 2) AS percent
FROM moderation_entries
GROUP BY automated_detection
ORDER BY count DESC;

\echo ''
\echo 'Automation - Distribution de automated_decision:'
SELECT 
    CASE 
        WHEN automated_decision IS NULL THEN 'NULL'
        WHEN automated_decision THEN 'TRUE'
        ELSE 'FALSE'
    END AS automated_decision,
    COUNT(*) AS count,
    ROUND(100.0 * COUNT(*) / (SELECT COUNT(*) FROM moderation_entries), 2) AS percent
FROM moderation_entries
GROUP BY automated_decision
ORDER BY count DESC;

\echo ''
\echo 'Automation - Par plateforme:'
SELECT 
    p.name AS platform,
    COUNT(*) AS total,
    COUNT(*) FILTER (WHERE automated_detection = TRUE) AS automated_detection_count,
    COUNT(*) FILTER (WHERE automated_decision = TRUE) AS automated_decision_count,
    ROUND(100.0 * COUNT(*) FILTER (WHERE automated_detection = TRUE) / COUNT(*), 2) AS detection_rate,
    ROUND(100.0 * COUNT(*) FILTER (WHERE automated_decision = TRUE) / COUNT(*), 2) AS decision_rate
FROM moderation_entries me
JOIN platforms p ON me.platform_id = p.id
GROUP BY p.name
ORDER BY total DESC
LIMIT 20;

\echo ''
\echo 'Automation - Heatmap (plateforme × catégorie):'
SELECT 
    p.name AS platform,
    c.name AS category,
    COUNT(*) AS total,
    COUNT(*) FILTER (WHERE automated_decision = TRUE) AS automated,
    ROUND(100.0 * COUNT(*) FILTER (WHERE automated_decision = TRUE) / NULLIF(COUNT(*), 0), 2) AS automation_rate
FROM moderation_entries me
JOIN platforms p ON me.platform_id = p.id
JOIN categories c ON me.category_id = c.id
GROUP BY p.name, c.name
HAVING COUNT(*) >= 10  -- Au moins 10 entrées pour être significatif
ORDER BY automation_rate DESC
LIMIT 30;

\echo ''
\echo ''

-- Legal Grounds: Vérifier la distribution des bases légales
\echo 'Legal Grounds - Top 10 bases légales:'
SELECT 
    dg.name AS decision_ground,
    COUNT(*) AS count,
    ROUND(100.0 * COUNT(*) / (SELECT COUNT(*) FROM moderation_entries), 2) AS percent
FROM moderation_entries me
JOIN decision_grounds dg ON me.decision_ground_id = dg.id
GROUP BY dg.name
ORDER BY count DESC
LIMIT 10;

\echo ''
\echo 'Legal Grounds - Catégories par base légale (pour treemap):'
SELECT 
    dg.name AS decision_ground,
    c.name AS category,
    COUNT(*) AS count
FROM moderation_entries me
JOIN decision_grounds dg ON me.decision_ground_id = dg.id
JOIN categories c ON me.category_id = c.id
GROUP BY dg.name, c.name
ORDER BY dg.name, count DESC
LIMIT 50;

\echo ''
\echo ''

-- ============================================================================
-- 8. RAPPORT DE COMPLÉTUDE GLOBAL
-- ============================================================================
\echo '8. RAPPORT DE COMPLÉTUDE GLOBAL'
\echo '-------------------------------'

-- Calculer le score de complétude global
WITH completeness AS (
    SELECT 
        COUNT(*) AS total_entries,
        COUNT(*) FILTER (WHERE application_date IS NOT NULL) AS has_application_date,
        COUNT(*) FILTER (WHERE platform_id IS NOT NULL) AS has_platform,
        COUNT(*) FILTER (WHERE category_id IS NOT NULL) AS has_category,
        COUNT(*) FILTER (WHERE decision_type_id IS NOT NULL) AS has_decision_type,
        COUNT(*) FILTER (WHERE decision_ground_id IS NOT NULL) AS has_decision_ground,
        COUNT(*) FILTER (WHERE content_type_id IS NOT NULL) AS has_content_type,
        COUNT(*) FILTER (WHERE automated_detection IS NOT NULL) AS has_automated_detection,
        COUNT(*) FILTER (WHERE automated_decision IS NOT NULL) AS has_automated_decision,
        COUNT(*) FILTER (WHERE country_code IS NOT NULL) AS has_country,
        COUNT(*) FILTER (WHERE language IS NOT NULL) AS has_language,
        COUNT(*) FILTER (WHERE delay_days IS NOT NULL) AS has_delay_days
    FROM moderation_entries
)
SELECT 
    total_entries,
    ROUND(100.0 * has_application_date / NULLIF(total_entries, 0), 2) AS application_date_completeness,
    ROUND(100.0 * has_platform / NULLIF(total_entries, 0), 2) AS platform_completeness,
    ROUND(100.0 * has_category / NULLIF(total_entries, 0), 2) AS category_completeness,
    ROUND(100.0 * has_decision_type / NULLIF(total_entries, 0), 2) AS decision_type_completeness,
    ROUND(100.0 * has_decision_ground / NULLIF(total_entries, 0), 2) AS decision_ground_completeness,
    ROUND(100.0 * has_content_type / NULLIF(total_entries, 0), 2) AS content_type_completeness,
    ROUND(100.0 * has_automated_detection / NULLIF(total_entries, 0), 2) AS automated_detection_completeness,
    ROUND(100.0 * has_automated_decision / NULLIF(total_entries, 0), 2) AS automated_decision_completeness,
    ROUND(100.0 * has_country / NULLIF(total_entries, 0), 2) AS country_completeness,
    ROUND(100.0 * has_language / NULLIF(total_entries, 0), 2) AS language_completeness,
    ROUND(100.0 * has_delay_days / NULLIF(total_entries, 0), 2) AS delay_days_completeness
FROM completeness;

\echo ''
\echo ''

-- ============================================================================
-- 9. ALERTES ET RECOMMANDATIONS
-- ============================================================================
\echo '9. ALERTES ET RECOMMANDATIONS'
\echo '-----------------------------'

-- Vérifier les problèmes critiques
\echo 'ALERTES CRITIQUES:'
\echo ''

-- Vérifier s'il y a des entrées sans champs obligatoires
SELECT 
    'Entries with missing required fields' AS alert,
    COUNT(*) AS count
FROM moderation_entries
WHERE application_date IS NULL 
   OR platform_id IS NULL 
   OR category_id IS NULL 
   OR decision_type_id IS NULL 
   OR decision_ground_id IS NULL;

-- Vérifier s'il y a des orphans
SELECT 
    'Orphan references found' AS alert,
    COUNT(*) AS count
FROM (
    SELECT COUNT(*) FROM moderation_entries me
    LEFT JOIN platforms p ON me.platform_id = p.id
    WHERE p.id IS NULL
    
    UNION ALL
    
    SELECT COUNT(*) FROM moderation_entries me
    LEFT JOIN categories c ON me.category_id = c.id
    WHERE c.id IS NULL
    
    UNION ALL
    
    SELECT COUNT(*) FROM moderation_entries me
    LEFT JOIN decision_types dt ON me.decision_type_id = dt.id
    WHERE dt.id IS NULL
    
    UNION ALL
    
    SELECT COUNT(*) FROM moderation_entries me
    LEFT JOIN decision_grounds dg ON me.decision_ground_id = dg.id
    WHERE dg.id IS NULL
) AS orphans;

-- Vérifier la couverture temporelle minimale
SELECT 
    CASE 
        WHEN COUNT(DISTINCT TO_CHAR(application_date, 'YYYY-MM')) < 3 
        THEN 'Insufficient temporal coverage (less than 3 months)'
        ELSE 'OK - Sufficient temporal coverage'
    END AS alert,
    COUNT(DISTINCT TO_CHAR(application_date, 'YYYY-MM')) AS distinct_months
FROM moderation_entries;

-- Vérifier la diversité des plateformes
SELECT 
    CASE 
        WHEN COUNT(DISTINCT platform_id) < 2 
        THEN 'Insufficient platform diversity (less than 2 platforms)'
        ELSE 'OK - Sufficient platform diversity'
    END AS alert,
    COUNT(DISTINCT platform_id) AS distinct_platforms
FROM moderation_entries;

\echo ''
\echo '============================================================================'
\echo 'FIN DE LA VÉRIFICATION'
\echo '============================================================================'

