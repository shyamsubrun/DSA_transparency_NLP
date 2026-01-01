-- ============================================
-- MIGRATION OPTIMISÉE PAR BATCH
-- Utilise INSERT ... SELECT au lieu d'une boucle
-- ============================================

-- D'abord, s'assurer que les tables de référence sont remplies
INSERT INTO platforms (name)
SELECT DISTINCT platform_name 
FROM dsa_decisions 
WHERE platform_name IS NOT NULL AND platform_name != '' AND platform_name != 'NaN'
ON CONFLICT (name) DO NOTHING;

INSERT INTO categories (name)
SELECT DISTINCT category 
FROM dsa_decisions 
WHERE category IS NOT NULL AND category != '' AND category != 'NaN'
ON CONFLICT (name) DO NOTHING;

INSERT INTO decision_types (name)
SELECT DISTINCT map_decision_type(decision_visibility, decision_account, decision_monetary)
FROM dsa_decisions
ON CONFLICT (name) DO NOTHING;

INSERT INTO decision_grounds (name)
SELECT DISTINCT decision_ground 
FROM dsa_decisions 
WHERE decision_ground IS NOT NULL AND decision_ground != '' AND decision_ground != 'NaN'
ON CONFLICT (name) DO NOTHING;

INSERT INTO content_types (name)
SELECT DISTINCT parse_content_type(content_type)
FROM dsa_decisions
WHERE parse_content_type(content_type) != 'Other'
ON CONFLICT (name) DO NOTHING;

-- Maintenant, migrer toutes les données en une seule requête INSERT ... SELECT
INSERT INTO moderation_entries (
    id,
    application_date,
    content_date,
    platform_id,
    category_id,
    decision_type_id,
    decision_ground_id,
    incompatible_content_ground,
    content_type_id,
    automated_detection,
    automated_decision,
    country_code,
    territorial_scope,
    language,
    delay_days
)
SELECT 
    d.uuid::TEXT AS id,
    d.application_date,
    d.content_date,
    p.id AS platform_id,
    c.id AS category_id,
    dt.id AS decision_type_id,
    dg.id AS decision_ground_id,
    CASE 
        WHEN d.incompatible_content_ground IS NULL OR d.incompatible_content_ground = '' OR d.incompatible_content_ground = 'NaN' 
        THEN NULL 
        ELSE d.incompatible_content_ground 
    END AS incompatible_content_ground,
    ct.id AS content_type_id,
    d.automated_detection,
    parse_automated_decision(d.automated_decision) AS automated_decision,
    extract_country(d.territorial_scope) AS country_code,
    d.territorial_scope,
    CASE 
        WHEN d.content_language IS NULL OR d.content_language = '' OR d.content_language = 'NaN' 
        THEN 'unknown' 
        ELSE d.content_language 
    END AS language,
    calculate_delay_days(d.content_date, d.application_date) AS delay_days
FROM dsa_decisions d
JOIN platforms p ON p.name = d.platform_name
JOIN categories c ON c.name = d.category
JOIN decision_types dt ON dt.name = map_decision_type(d.decision_visibility, d.decision_account, d.decision_monetary)
JOIN decision_grounds dg ON dg.name = d.decision_ground
LEFT JOIN content_types ct ON ct.name = parse_content_type(d.content_type) AND parse_content_type(d.content_type) != 'Other'
ON CONFLICT (id) DO UPDATE SET
    application_date = EXCLUDED.application_date,
    content_date = EXCLUDED.content_date,
    platform_id = EXCLUDED.platform_id,
    category_id = EXCLUDED.category_id,
    decision_type_id = EXCLUDED.decision_type_id,
    decision_ground_id = EXCLUDED.decision_ground_id,
    incompatible_content_ground = EXCLUDED.incompatible_content_ground,
    content_type_id = EXCLUDED.content_type_id,
    automated_detection = EXCLUDED.automated_detection,
    automated_decision = EXCLUDED.automated_decision,
    country_code = EXCLUDED.country_code,
    territorial_scope = EXCLUDED.territorial_scope,
    language = EXCLUDED.language,
    delay_days = EXCLUDED.delay_days;

