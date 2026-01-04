-- Requêtes SQL pour vérifier les données dans PostgreSQL
-- Usage: psql -h localhost -U dsa_admin -d dsa -f database/check_data.sql

-- ============================================
-- 1. Nombre total d'actions (moderation entries)
-- ============================================
SELECT COUNT(*) as total_actions FROM moderation_entries;

-- ============================================
-- 2. Nombre d'actions par plateforme (TOP 10)
-- ============================================
SELECT 
    p.name as platform_name,
    COUNT(*) as action_count,
    ROUND(COUNT(*) * 100.0 / (SELECT COUNT(*) FROM moderation_entries), 2) as percentage
FROM moderation_entries me
JOIN platforms p ON me.platform_id = p.id
GROUP BY p.name
ORDER BY action_count DESC
LIMIT 10;

-- ============================================
-- 3. Nombre d'actions par catégorie
-- ============================================
SELECT 
    c.name as category_name,
    COUNT(*) as action_count,
    ROUND(COUNT(*) * 100.0 / (SELECT COUNT(*) FROM moderation_entries), 2) as percentage
FROM moderation_entries me
JOIN categories c ON me.category_id = c.id
GROUP BY c.name
ORDER BY action_count DESC;

-- ============================================
-- 4. Nombre d'actions par type de décision
-- ============================================
SELECT 
    dt.name as decision_type,
    COUNT(*) as action_count,
    ROUND(COUNT(*) * 100.0 / (SELECT COUNT(*) FROM moderation_entries), 2) as percentage
FROM moderation_entries me
JOIN decision_types dt ON me.decision_type_id = dt.id
GROUP BY dt.name
ORDER BY action_count DESC;

-- ============================================
-- 5. Nombre d'actions par pays (TOP 10)
-- ============================================
SELECT 
    country_code,
    COUNT(*) as action_count,
    ROUND(COUNT(*) * 100.0 / (SELECT COUNT(*) FROM moderation_entries WHERE country_code IS NOT NULL), 2) as percentage
FROM moderation_entries
WHERE country_code IS NOT NULL
GROUP BY country_code
ORDER BY action_count DESC
LIMIT 10;

-- ============================================
-- 6. Statistiques générales (KPIs)
-- ============================================
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

-- ============================================
-- 7. Plage de dates des données
-- ============================================
SELECT 
    MIN(application_date) as earliest_date,
    MAX(application_date) as latest_date,
    COUNT(DISTINCT DATE(application_date)) as unique_dates
FROM moderation_entries;

-- ============================================
-- 8. Actions par mois
-- ============================================
SELECT 
    TO_CHAR(application_date, 'YYYY-MM') as month,
    COUNT(*) as action_count
FROM moderation_entries
GROUP BY TO_CHAR(application_date, 'YYYY-MM')
ORDER BY month DESC;

-- ============================================
-- 9. Top 5 plateformes avec le plus d'actions récentes (derniers 30 jours)
-- ============================================
SELECT 
    p.name as platform_name,
    COUNT(*) as action_count
FROM moderation_entries me
JOIN platforms p ON me.platform_id = p.id
WHERE application_date >= CURRENT_DATE - INTERVAL '30 days'
GROUP BY p.name
ORDER BY action_count DESC
LIMIT 5;

-- ============================================
-- 10. Distribution par type de contenu
-- ============================================
SELECT 
    COALESCE(ct.name, 'NULL') as content_type,
    COUNT(*) as action_count,
    ROUND(COUNT(*) * 100.0 / (SELECT COUNT(*) FROM moderation_entries), 2) as percentage
FROM moderation_entries me
LEFT JOIN content_types ct ON me.content_type_id = ct.id
GROUP BY ct.name
ORDER BY action_count DESC;

-- ============================================
-- 11. Actions par langue (TOP 10)
-- ============================================
SELECT 
    language,
    COUNT(*) as action_count,
    ROUND(COUNT(*) * 100.0 / (SELECT COUNT(*) FROM moderation_entries WHERE language IS NOT NULL), 2) as percentage
FROM moderation_entries
WHERE language IS NOT NULL
GROUP BY language
ORDER BY action_count DESC
LIMIT 10;

-- ============================================
-- 12. Vérification de quelques entrées récentes
-- ============================================
SELECT 
    me.id,
    me.application_date,
    p.name as platform,
    c.name as category,
    dt.name as decision_type,
    me.country_code,
    me.automated_detection,
    me.automated_decision
FROM moderation_entries me
JOIN platforms p ON me.platform_id = p.id
JOIN categories c ON me.category_id = c.id
JOIN decision_types dt ON me.decision_type_id = dt.id
ORDER BY me.application_date DESC
LIMIT 10;

