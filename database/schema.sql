-- ============================================
-- SCHÉMA POSTGRESQL OPTIMISÉ POUR DSA DASHBOARD
-- Optimisé pour VM 150GB - Données essentielles uniquement
-- ============================================

-- Supprimer tables existantes (ATTENTION: supprime toutes les données!)
-- DROP TABLE IF EXISTS moderation_entries CASCADE;
-- DROP TABLE IF EXISTS platforms CASCADE;
-- DROP TABLE IF EXISTS categories CASCADE;
-- DROP TABLE IF EXISTS decision_types CASCADE;
-- DROP TABLE IF EXISTS decision_grounds CASCADE;
-- DROP TABLE IF EXISTS content_types CASCADE;

-- ============================================
-- TABLES DE RÉFÉRENCE (Normalisation)
-- ============================================

-- Table des plateformes
CREATE TABLE IF NOT EXISTS platforms (
    id SMALLSERIAL PRIMARY KEY,
    name VARCHAR(100) NOT NULL UNIQUE,
    created_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_platforms_name ON platforms(name);

-- Table des catégories
CREATE TABLE IF NOT EXISTS categories (
    id SMALLSERIAL PRIMARY KEY,
    name VARCHAR(100) NOT NULL UNIQUE,
    created_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_categories_name ON categories(name);

-- Table des types de décision
CREATE TABLE IF NOT EXISTS decision_types (
    id SMALLSERIAL PRIMARY KEY,
    name VARCHAR(100) NOT NULL UNIQUE,
    created_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_decision_types_name ON decision_types(name);

-- Table des bases légales (decision_grounds)
CREATE TABLE IF NOT EXISTS decision_grounds (
    id SMALLSERIAL PRIMARY KEY,
    name TEXT NOT NULL UNIQUE,
    created_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_decision_grounds_name ON decision_grounds(name);

-- Table des types de contenu
CREATE TABLE IF NOT EXISTS content_types (
    id SMALLSERIAL PRIMARY KEY,
    name VARCHAR(50) NOT NULL UNIQUE,
    created_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_content_types_name ON content_types(name);

-- ============================================
-- TABLE PRINCIPALE: moderation_entries
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
-- INDEXES POUR PERFORMANCE
-- ============================================

-- Index sur dates (pour requêtes temporelles)
CREATE INDEX IF NOT EXISTS idx_moderation_app_date ON moderation_entries(application_date DESC);
CREATE INDEX IF NOT EXISTS idx_moderation_content_date ON moderation_entries(content_date DESC);

-- Index sur plateforme
CREATE INDEX IF NOT EXISTS idx_moderation_platform ON moderation_entries(platform_id);

-- Index sur catégorie
CREATE INDEX IF NOT EXISTS idx_moderation_category ON moderation_entries(category_id);

-- Index sur type de décision
CREATE INDEX IF NOT EXISTS idx_moderation_decision_type ON moderation_entries(decision_type_id);

-- Index sur base légale
CREATE INDEX IF NOT EXISTS idx_moderation_decision_ground ON moderation_entries(decision_ground_id);

-- Index sur pays
CREATE INDEX IF NOT EXISTS idx_moderation_country ON moderation_entries(country_code);

-- Index sur type de contenu
CREATE INDEX IF NOT EXISTS idx_moderation_content_type ON moderation_entries(content_type_id);

-- Index composite pour requêtes fréquentes
CREATE INDEX IF NOT EXISTS idx_moderation_platform_date ON moderation_entries(platform_id, application_date DESC);
CREATE INDEX IF NOT EXISTS idx_moderation_category_date ON moderation_entries(category_id, application_date DESC);

-- Index GIN pour JSONB (territorial_scope)
CREATE INDEX IF NOT EXISTS idx_moderation_territorial_scope ON moderation_entries USING GIN(territorial_scope);

-- ============================================
-- VUES MATÉRIALISÉES (pour agrégations rapides)
-- ============================================

-- Vue pour statistiques par plateforme
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

-- Vue pour statistiques par catégorie
CREATE MATERIALIZED VIEW IF NOT EXISTS category_stats AS
SELECT 
    c.name AS category_name,
    COUNT(*) AS total_actions,
    COUNT(DISTINCT me.platform_id) AS platform_count
FROM moderation_entries me
JOIN categories c ON me.category_id = c.id
GROUP BY c.id, c.name;

CREATE UNIQUE INDEX IF NOT EXISTS idx_category_stats_name ON category_stats(category_name);

-- ============================================
-- FONCTIONS UTILES
-- ============================================

-- Fonction pour rafraîchir les vues matérialisées
CREATE OR REPLACE FUNCTION refresh_materialized_views()
RETURNS void AS $$
BEGIN
    REFRESH MATERIALIZED VIEW CONCURRENTLY platform_stats;
    REFRESH MATERIALIZED VIEW CONCURRENTLY category_stats;
END;
$$ LANGUAGE plpgsql;

-- ============================================
-- COMMENTAIRES
-- ============================================

COMMENT ON TABLE moderation_entries IS 'Table principale contenant les entrées de modération DSA optimisées';
COMMENT ON COLUMN moderation_entries.territorial_scope IS 'Array JSONB des codes pays (ex: ["FR", "DE", "IT"])';
COMMENT ON COLUMN moderation_entries.delay_days IS 'Nombre de jours entre content_date et application_date';


