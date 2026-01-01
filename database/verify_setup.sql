-- ============================================
-- SCRIPT DE VÉRIFICATION COMPLÈTE
-- Vérifie que tout est bien configuré
-- ============================================

\echo '=========================================='
\echo '🔍 VÉRIFICATION COMPLÈTE DE LA CONFIGURATION'
\echo '=========================================='
\echo ''

-- ============================================
-- 1. VÉRIFICATION DES TABLES
-- ============================================
\echo '📊 1. VÉRIFICATION DES TABLES'
\echo '--------------------------------'

SELECT 
    'dsa_decisions' AS table_name,
    COUNT(*) AS row_count,
    pg_size_pretty(pg_total_relation_size('dsa_decisions')) AS size
FROM dsa_decisions
UNION ALL
SELECT 
    'moderation_entries' AS table_name,
    COUNT(*) AS row_count,
    pg_size_pretty(pg_total_relation_size('moderation_entries')) AS size
FROM moderation_entries;

\echo ''
\echo '📋 Tables de référence:'
SELECT 'platforms' AS table_name, COUNT(*) AS count FROM platforms
UNION ALL
SELECT 'categories', COUNT(*) FROM categories
UNION ALL
SELECT 'decision_types', COUNT(*) FROM decision_types
UNION ALL
SELECT 'decision_grounds', COUNT(*) FROM decision_grounds
UNION ALL
SELECT 'content_types', COUNT(*) FROM content_types;

-- ============================================
-- 2. VÉRIFICATION DES TRIGGERS
-- ============================================
\echo ''
\echo '🔧 2. VÉRIFICATION DES TRIGGERS'
\echo '--------------------------------'

SELECT 
    trigger_name,
    event_manipulation AS event,
    action_timing AS timing,
    action_statement AS function
FROM information_schema.triggers
WHERE event_object_table = 'dsa_decisions'
ORDER BY trigger_name;

-- Vérifier que les triggers sont actifs
SELECT 
    CASE 
        WHEN COUNT(*) = 2 THEN '✅ Les 2 triggers sont actifs'
        ELSE '❌ Problème: ' || COUNT(*) || ' trigger(s) trouvé(s)'
    END AS trigger_status
FROM information_schema.triggers
WHERE event_object_table = 'dsa_decisions';

-- ============================================
-- 3. TEST DE SYNCHRONISATION AUTOMATIQUE
-- ============================================
\echo ''
\echo '🧪 3. TEST DE SYNCHRONISATION AUTOMATIQUE'
\echo '--------------------------------'

-- Compter avant
SELECT COUNT(*) AS count_before_insert FROM moderation_entries;

-- Insérer une ligne de test
INSERT INTO dsa_decisions (
    uuid,
    platform_name,
    category,
    decision_ground,
    application_date,
    territorial_scope,
    automated_detection,
    automated_decision,
    decision_visibility
) VALUES (
    gen_random_uuid(),
    'Test Sync Verification',
    'Test Category Sync',
    'DECISION_GROUND_INCOMPATIBLE_CONTENT',
    CURRENT_DATE,
    '["FR", "DE"]'::jsonb,
    true,
    'FULLY',
    'DISABLED'
);

-- Attendre un peu pour que le trigger s'exécute
SELECT pg_sleep(1);

-- Compter après
SELECT COUNT(*) AS count_after_insert FROM moderation_entries;

-- Vérifier que la ligne est dans moderation_entries
SELECT 
    CASE 
        WHEN COUNT(*) > 0 THEN '✅ Synchronisation automatique FONCTIONNE'
        ELSE '❌ ERREUR: La ligne n''a pas été synchronisée'
    END AS sync_test_result,
    COUNT(*) AS synchronized_rows
FROM moderation_entries m
JOIN platforms p ON m.platform_id = p.id
WHERE p.name = 'Test Sync Verification';

-- Vérifier les données transformées
SELECT 
    m.id,
    p.name AS platform,
    c.name AS category,
    dt.name AS decision_type,
    m.application_date,
    m.delay_days,
    m.automated_detection,
    m.automated_decision,
    m.country_code,
    m.territorial_scope
FROM moderation_entries m
JOIN platforms p ON m.platform_id = p.id
JOIN categories c ON m.category_id = c.id
JOIN decision_types dt ON m.decision_type_id = dt.id
WHERE p.name = 'Test Sync Verification';

-- Nettoyer
DELETE FROM dsa_decisions WHERE platform_name = 'Test Sync Verification';

-- ============================================
-- 4. VÉRIFICATION DES DONNÉES TRANSFORMÉES
-- ============================================
\echo ''
\echo '📈 4. VÉRIFICATION DES DONNÉES TRANSFORMÉES'
\echo '--------------------------------'

-- Vérifier que decision_type est bien calculé
SELECT 
    dt.name AS decision_type,
    COUNT(*) AS count,
    ROUND(100.0 * COUNT(*) / (SELECT COUNT(*) FROM moderation_entries), 2) AS percentage
FROM moderation_entries m
JOIN decision_types dt ON m.decision_type_id = dt.id
GROUP BY dt.name
ORDER BY count DESC;

-- Vérifier que delay_days est calculé
SELECT 
    CASE 
        WHEN delay_days IS NULL THEN 'NULL'
        WHEN delay_days < 0 THEN 'Négatif (erreur)'
        WHEN delay_days = 0 THEN '0 jours'
        WHEN delay_days <= 30 THEN '1-30 jours'
        WHEN delay_days <= 90 THEN '31-90 jours'
        WHEN delay_days <= 365 THEN '91-365 jours'
        ELSE 'Plus de 1 an'
    END AS delay_range,
    COUNT(*) AS count
FROM moderation_entries
GROUP BY 
    CASE 
        WHEN delay_days IS NULL THEN 'NULL'
        WHEN delay_days < 0 THEN 'Négatif (erreur)'
        WHEN delay_days = 0 THEN '0 jours'
        WHEN delay_days <= 30 THEN '1-30 jours'
        WHEN delay_days <= 90 THEN '31-90 jours'
        WHEN delay_days <= 365 THEN '91-365 jours'
        ELSE 'Plus de 1 an'
    END
ORDER BY count DESC;

-- Vérifier que country_code est extrait
SELECT 
    CASE 
        WHEN country_code IS NULL THEN 'NULL'
        ELSE country_code
    END AS country,
    COUNT(*) AS count
FROM moderation_entries
GROUP BY country_code
ORDER BY count DESC
LIMIT 10;

-- Vérifier automated_decision (doit être boolean)
SELECT 
    CASE 
        WHEN automated_decision IS NULL THEN 'NULL'
        WHEN automated_decision = TRUE THEN 'TRUE (Fully Automated)'
        WHEN automated_decision = FALSE THEN 'FALSE (Not Automated)'
        ELSE 'Autre'
    END AS automated_status,
    COUNT(*) AS count
FROM moderation_entries
GROUP BY automated_decision
ORDER BY count DESC;

-- ============================================
-- 5. VÉRIFICATION DES INTÉGRITÉS
-- ============================================
\echo ''
\echo '🔍 5. VÉRIFICATION DES INTÉGRITÉS'
\echo '--------------------------------'

-- Vérifier qu'il n'y a pas de lignes orphelines
SELECT 
    'Lignes dans dsa_decisions sans correspondance dans moderation_entries' AS check_name,
    COUNT(*) AS count
FROM dsa_decisions d
LEFT JOIN moderation_entries m ON m.id = d.uuid::TEXT
WHERE m.id IS NULL;

-- Vérifier les dates
SELECT 
    'Dates disponibles' AS check_name,
    MIN(application_date) AS min_date,
    MAX(application_date) AS max_date,
    COUNT(DISTINCT application_date) AS unique_dates
FROM moderation_entries;

-- Vérifier les plateformes
SELECT 
    'Plateformes uniques' AS check_name,
    COUNT(DISTINCT platform_id) AS platform_count
FROM moderation_entries;

-- ============================================
-- 6. STATISTIQUES GÉNÉRALES
-- ============================================
\echo ''
\echo '📊 6. STATISTIQUES GÉNÉRALES'
\echo '--------------------------------'

SELECT 
    'Total actions' AS metric,
    COUNT(*)::TEXT AS value
FROM moderation_entries
UNION ALL
SELECT 
    'Plateformes uniques',
    COUNT(DISTINCT platform_id)::TEXT
FROM moderation_entries
UNION ALL
SELECT 
    'Catégories uniques',
    COUNT(DISTINCT category_id)::TEXT
FROM moderation_entries
UNION ALL
SELECT 
    'Types de décision uniques',
    COUNT(DISTINCT decision_type_id)::TEXT
FROM moderation_entries
UNION ALL
SELECT 
    'Pays uniques',
    COUNT(DISTINCT country_code)::TEXT
FROM moderation_entries
UNION ALL
SELECT 
    'Délai moyen (jours)',
    ROUND(AVG(delay_days), 2)::TEXT
FROM moderation_entries
WHERE delay_days IS NOT NULL
UNION ALL
SELECT 
    'Taux détection automatisée (%)',
    ROUND(100.0 * COUNT(CASE WHEN automated_detection = TRUE THEN 1 END) / COUNT(*), 2)::TEXT
FROM moderation_entries
UNION ALL
SELECT 
    'Taux décision automatisée (%)',
    ROUND(100.0 * COUNT(CASE WHEN automated_decision = TRUE THEN 1 END) / COUNT(*), 2)::TEXT
FROM moderation_entries;

\echo ''
\echo '=========================================='
\echo '✅ Vérification terminée'
\echo '=========================================='

