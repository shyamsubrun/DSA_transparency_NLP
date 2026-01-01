-- ============================================
-- CRÉATION SCHÉMA OPTIMISÉ + MIGRATION
-- Basé sur la table dsa_decisions existante
-- ============================================

-- ============================================
-- 1. TABLES DE RÉFÉRENCE (Normalisation)
-- ============================================

CREATE TABLE IF NOT EXISTS platforms (
    id SMALLSERIAL PRIMARY KEY,
    name VARCHAR(100) NOT NULL UNIQUE,
    created_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_platforms_name ON platforms(name);

CREATE TABLE IF NOT EXISTS categories (
    id SMALLSERIAL PRIMARY KEY,
    name VARCHAR(100) NOT NULL UNIQUE,
    created_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_categories_name ON categories(name);

CREATE TABLE IF NOT EXISTS decision_types (
    id SMALLSERIAL PRIMARY KEY,
    name VARCHAR(100) NOT NULL UNIQUE,
    created_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_decision_types_name ON decision_types(name);

CREATE TABLE IF NOT EXISTS decision_grounds (
    id SMALLSERIAL PRIMARY KEY,
    name TEXT NOT NULL UNIQUE,
    created_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_decision_grounds_name ON decision_grounds(name);

CREATE TABLE IF NOT EXISTS content_types (
    id SMALLSERIAL PRIMARY KEY,
    name VARCHAR(50) NOT NULL UNIQUE,
    created_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_content_types_name ON content_types(name);

-- ============================================
-- 2. TABLE PRINCIPALE OPTIMISÉE
-- ============================================

CREATE TABLE IF NOT EXISTS moderation_entries (
    id VARCHAR(50) PRIMARY KEY,
    application_date DATE NOT NULL,
    content_date DATE,
    platform_id SMALLINT NOT NULL REFERENCES platforms(id),
    category_id SMALLINT NOT NULL REFERENCES categories(id),
    decision_type_id SMALLINT NOT NULL REFERENCES decision_types(id),
    decision_ground_id SMALLINT NOT NULL REFERENCES decision_grounds(id),
    incompatible_content_ground TEXT,
    content_type_id SMALLINT REFERENCES content_types(id),
    automated_detection BOOLEAN,
    automated_decision BOOLEAN,
    country_code CHAR(2),
    territorial_scope JSONB,
    language VARCHAR(10),
    delay_days INTEGER,
    created_at TIMESTAMP DEFAULT NOW()
);

-- ============================================
-- 3. INDEXES POUR PERFORMANCE
-- ============================================

CREATE INDEX IF NOT EXISTS idx_moderation_app_date ON moderation_entries(application_date DESC);
CREATE INDEX IF NOT EXISTS idx_moderation_content_date ON moderation_entries(content_date DESC);
CREATE INDEX IF NOT EXISTS idx_moderation_platform ON moderation_entries(platform_id);
CREATE INDEX IF NOT EXISTS idx_moderation_category ON moderation_entries(category_id);
CREATE INDEX IF NOT EXISTS idx_moderation_decision_type ON moderation_entries(decision_type_id);
CREATE INDEX IF NOT EXISTS idx_moderation_decision_ground ON moderation_entries(decision_ground_id);
CREATE INDEX IF NOT EXISTS idx_moderation_country ON moderation_entries(country_code);
CREATE INDEX IF NOT EXISTS idx_moderation_content_type ON moderation_entries(content_type_id);
CREATE INDEX IF NOT EXISTS idx_moderation_platform_date ON moderation_entries(platform_id, application_date DESC);
CREATE INDEX IF NOT EXISTS idx_moderation_category_date ON moderation_entries(category_id, application_date DESC);
CREATE INDEX IF NOT EXISTS idx_moderation_territorial_scope ON moderation_entries USING GIN(territorial_scope);

-- ============================================
-- 4. FONCTIONS DE TRANSFORMATION
-- ============================================

-- Fonction pour mapper decision_type depuis dsa_decisions
CREATE OR REPLACE FUNCTION map_decision_type(
    decision_visibility TEXT,
    decision_account TEXT,
    decision_monetary TEXT
) RETURNS TEXT AS $$
BEGIN
    -- Vérifier decision_account d'abord
    IF decision_account IS NOT NULL AND decision_account != '' AND decision_account != 'NaN' THEN
        IF UPPER(decision_account) LIKE '%TERMINATED%' OR UPPER(decision_account) LIKE '%SUSPENDED%' THEN
            RETURN 'Account Suspension';
        END IF;
    END IF;
    
    -- Vérifier decision_visibility
    IF decision_visibility IS NOT NULL AND decision_visibility != '' AND decision_visibility != 'NaN' THEN
        IF UPPER(decision_visibility) LIKE '%REMOVED%' THEN
            RETURN 'Removal';
        ELSIF UPPER(decision_visibility) LIKE '%DISABLED%' OR UPPER(decision_visibility) LIKE '%RESTRICTED%' THEN
            RETURN 'Visibility Restriction';
        END IF;
    END IF;
    
    -- Vérifier decision_monetary
    IF decision_monetary IS NOT NULL AND decision_monetary != '' AND decision_monetary != 'NaN' THEN
        RETURN 'Demonetization';
    END IF;
    
    -- Default
    RETURN 'Warning Label';
END;
$$ LANGUAGE plpgsql IMMUTABLE;

-- Fonction pour parser content_type
CREATE OR REPLACE FUNCTION parse_content_type(content_type_text TEXT) RETURNS TEXT AS $$
BEGIN
    IF content_type_text IS NULL OR content_type_text = '' OR content_type_text = 'NaN' THEN
        RETURN 'Other';
    END IF;
    
    IF UPPER(content_type_text) LIKE '%PRODUCT%' THEN
        RETURN 'Product';
    ELSIF UPPER(content_type_text) LIKE '%TEXT%' THEN
        RETURN 'Text';
    ELSIF UPPER(content_type_text) LIKE '%IMAGE%' THEN
        RETURN 'Image';
    ELSIF UPPER(content_type_text) LIKE '%VIDEO%' THEN
        RETURN 'Video';
    ELSIF UPPER(content_type_text) LIKE '%AUDIO%' THEN
        RETURN 'Audio';
    ELSIF UPPER(content_type_text) LIKE '%LIVE%' OR UPPER(content_type_text) LIKE '%STREAM%' THEN
        RETURN 'Live Stream';
    ELSIF UPPER(content_type_text) LIKE '%STORY%' OR UPPER(content_type_text) LIKE '%REEL%' THEN
        RETURN 'Story/Reel';
    END IF;
    
    RETURN 'Other';
END;
$$ LANGUAGE plpgsql IMMUTABLE;

-- Fonction pour parser automated_decision
CREATE OR REPLACE FUNCTION parse_automated_decision(automated_decision_text TEXT) RETURNS BOOLEAN AS $$
BEGIN
    IF automated_decision_text IS NULL OR automated_decision_text = '' OR automated_decision_text = 'NaN' THEN
        RETURN NULL;
    END IF;
    
    IF UPPER(automated_decision_text) LIKE '%FULLY%' THEN
        RETURN TRUE;
    ELSIF UPPER(automated_decision_text) LIKE '%NOT%' THEN
        RETURN FALSE;
    END IF;
    
    RETURN NULL; -- PARTIALLY ou autres
END;
$$ LANGUAGE plpgsql IMMUTABLE;

-- Fonction pour extraire le premier pays de territorial_scope
CREATE OR REPLACE FUNCTION extract_country(territorial_scope_json JSONB) RETURNS CHAR(2) AS $$
BEGIN
    IF territorial_scope_json IS NULL OR jsonb_array_length(territorial_scope_json) = 0 THEN
        RETURN NULL;
    END IF;
    
    RETURN territorial_scope_json->>0;
END;
$$ LANGUAGE plpgsql IMMUTABLE;

-- Fonction pour calculer delay_days
CREATE OR REPLACE FUNCTION calculate_delay_days(content_date_val DATE, application_date_val DATE) RETURNS INTEGER AS $$
BEGIN
    IF content_date_val IS NULL OR application_date_val IS NULL THEN
        RETURN NULL;
    END IF;
    
    IF application_date_val < content_date_val THEN
        RETURN NULL; -- Date invalide
    END IF;
    
    IF (application_date_val - content_date_val) > 3650 THEN
        RETURN NULL; -- Plus de 10 ans, probablement erreur
    END IF;
    
    RETURN (application_date_val - content_date_val);
END;
$$ LANGUAGE plpgsql IMMUTABLE;

-- ============================================
-- 5. VUE POUR TRANSFORMER dsa_decisions
-- ============================================

CREATE OR REPLACE VIEW moderation_entries_view AS
SELECT 
    uuid::TEXT AS id,
    application_date,
    content_date,
    platform_name,
    category,
    map_decision_type(decision_visibility, decision_account, decision_monetary) AS decision_type,
    decision_ground,
    CASE 
        WHEN incompatible_content_ground IS NULL OR incompatible_content_ground = '' OR incompatible_content_ground = 'NaN' 
        THEN NULL 
        ELSE incompatible_content_ground 
    END AS incompatible_content_ground,
    parse_content_type(content_type) AS content_type,
    automated_detection,
    parse_automated_decision(automated_decision) AS automated_decision,
    extract_country(territorial_scope) AS country,
    territorial_scope,
    CASE 
        WHEN content_language IS NULL OR content_language = '' OR content_language = 'NaN' 
        THEN 'unknown' 
        ELSE content_language 
    END AS language,
    calculate_delay_days(content_date, application_date) AS delay_days
FROM dsa_decisions;

-- ============================================
-- 6. VUES MATÉRIALISÉES (pour agrégations)
-- ============================================

CREATE MATERIALIZED VIEW IF NOT EXISTS platform_stats AS
SELECT 
    p.name AS platform_name,
    COUNT(*) AS total_actions,
    COUNT(DISTINCT DATE(me.application_date)) AS days_active,
    AVG(me.delay_days) AS avg_delay_days,
    COUNT(CASE WHEN me.automated_detection = TRUE THEN 1 END) AS automated_detection_count,
    COUNT(CASE WHEN me.automated_decision = TRUE THEN 1 END) AS automated_decision_count
FROM moderation_entries me
JOIN platforms p ON me.platform_id = p.id
GROUP BY p.id, p.name;

CREATE UNIQUE INDEX IF NOT EXISTS idx_platform_stats_name ON platform_stats(platform_name);

CREATE MATERIALIZED VIEW IF NOT EXISTS category_stats AS
SELECT 
    c.name AS category_name,
    COUNT(*) AS total_actions,
    COUNT(DISTINCT me.platform_id) AS platform_count
FROM moderation_entries me
JOIN categories c ON me.category_id = c.id
GROUP BY c.id, c.name;

CREATE UNIQUE INDEX IF NOT EXISTS idx_category_stats_name ON category_stats(category_name);

-- Fonction pour rafraîchir les vues matérialisées
CREATE OR REPLACE FUNCTION refresh_materialized_views()
RETURNS void AS $$
BEGIN
    REFRESH MATERIALIZED VIEW CONCURRENTLY platform_stats;
    REFRESH MATERIALIZED VIEW CONCURRENTLY category_stats;
END;
$$ LANGUAGE plpgsql;

