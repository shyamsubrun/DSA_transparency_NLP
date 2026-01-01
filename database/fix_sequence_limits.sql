-- ============================================
-- CORRECTION DES LIMITES DE SÉQUENCES
-- Changer SMALLSERIAL en SERIAL (INTEGER) pour supporter plus de valeurs
-- ============================================

-- Sauvegarder les données existantes
CREATE TABLE IF NOT EXISTS platforms_backup AS SELECT * FROM platforms;
CREATE TABLE IF NOT EXISTS categories_backup AS SELECT * FROM categories;
CREATE TABLE IF NOT EXISTS decision_types_backup AS SELECT * FROM decision_types;
CREATE TABLE IF NOT EXISTS decision_grounds_backup AS SELECT * FROM decision_grounds;
CREATE TABLE IF NOT EXISTS content_types_backup AS SELECT * FROM content_types;

-- Supprimer les contraintes de clé étrangère temporairement
ALTER TABLE moderation_entries DROP CONSTRAINT IF EXISTS moderation_entries_platform_id_fkey;
ALTER TABLE moderation_entries DROP CONSTRAINT IF EXISTS moderation_entries_category_id_fkey;
ALTER TABLE moderation_entries DROP CONSTRAINT IF EXISTS moderation_entries_decision_type_id_fkey;
ALTER TABLE moderation_entries DROP CONSTRAINT IF EXISTS moderation_entries_decision_ground_id_fkey;
ALTER TABLE moderation_entries DROP CONSTRAINT IF EXISTS moderation_entries_content_type_id_fkey;

-- Recréer les tables avec SERIAL au lieu de SMALLSERIAL
DROP TABLE IF EXISTS platforms CASCADE;
CREATE TABLE platforms (
    id SERIAL PRIMARY KEY,
    name VARCHAR(100) NOT NULL UNIQUE,
    created_at TIMESTAMP DEFAULT NOW()
);
CREATE INDEX idx_platforms_name ON platforms(name);

DROP TABLE IF EXISTS categories CASCADE;
CREATE TABLE categories (
    id SERIAL PRIMARY KEY,
    name VARCHAR(100) NOT NULL UNIQUE,
    created_at TIMESTAMP DEFAULT NOW()
);
CREATE INDEX idx_categories_name ON categories(name);

DROP TABLE IF EXISTS decision_types CASCADE;
CREATE TABLE decision_types (
    id SERIAL PRIMARY KEY,
    name VARCHAR(100) NOT NULL UNIQUE,
    created_at TIMESTAMP DEFAULT NOW()
);
CREATE INDEX idx_decision_types_name ON decision_types(name);

DROP TABLE IF EXISTS decision_grounds CASCADE;
CREATE TABLE decision_grounds (
    id SERIAL PRIMARY KEY,
    name TEXT NOT NULL UNIQUE,
    created_at TIMESTAMP DEFAULT NOW()
);
CREATE INDEX idx_decision_grounds_name ON decision_grounds(name);

DROP TABLE IF EXISTS content_types CASCADE;
CREATE TABLE content_types (
    id SERIAL PRIMARY KEY,
    name VARCHAR(50) NOT NULL UNIQUE,
    created_at TIMESTAMP DEFAULT NOW()
);
CREATE INDEX idx_content_types_name ON content_types(name);

-- Restaurer les données sauvegardées
INSERT INTO platforms (id, name, created_at)
SELECT id, name, created_at FROM platforms_backup
ON CONFLICT (id) DO NOTHING;

INSERT INTO categories (id, name, created_at)
SELECT id, name, created_at FROM categories_backup
ON CONFLICT (id) DO NOTHING;

INSERT INTO decision_types (id, name, created_at)
SELECT id, name, created_at FROM decision_types_backup
ON CONFLICT (id) DO NOTHING;

INSERT INTO decision_grounds (id, name, created_at)
SELECT id, name, created_at FROM decision_grounds_backup
ON CONFLICT (id) DO NOTHING;

INSERT INTO content_types (id, name, created_at)
SELECT id, name, created_at FROM content_types_backup
ON CONFLICT (id) DO NOTHING;

-- Réinitialiser les séquences au bon endroit
SELECT setval('platforms_id_seq', COALESCE((SELECT MAX(id) FROM platforms), 1), true);
SELECT setval('categories_id_seq', COALESCE((SELECT MAX(id) FROM categories), 1), true);
SELECT setval('decision_types_id_seq', COALESCE((SELECT MAX(id) FROM decision_types), 1), true);
SELECT setval('decision_grounds_id_seq', COALESCE((SELECT MAX(id) FROM decision_grounds), 1), true);
SELECT setval('content_types_id_seq', COALESCE((SELECT MAX(id) FROM content_types), 1), true);

-- Recréer les contraintes de clé étrangère
ALTER TABLE moderation_entries 
    ADD CONSTRAINT moderation_entries_platform_id_fkey 
    FOREIGN KEY (platform_id) REFERENCES platforms(id);

ALTER TABLE moderation_entries 
    ADD CONSTRAINT moderation_entries_category_id_fkey 
    FOREIGN KEY (category_id) REFERENCES categories(id);

ALTER TABLE moderation_entries 
    ADD CONSTRAINT moderation_entries_decision_type_id_fkey 
    FOREIGN KEY (decision_type_id) REFERENCES decision_types(id);

ALTER TABLE moderation_entries 
    ADD CONSTRAINT moderation_entries_decision_ground_id_fkey 
    FOREIGN KEY (decision_ground_id) REFERENCES decision_grounds(id);

ALTER TABLE moderation_entries 
    ADD CONSTRAINT moderation_entries_content_type_id_fkey 
    FOREIGN KEY (content_type_id) REFERENCES content_types(id);

-- Changer le type des colonnes dans moderation_entries de SMALLINT à INTEGER
ALTER TABLE moderation_entries ALTER COLUMN platform_id TYPE INTEGER;
ALTER TABLE moderation_entries ALTER COLUMN category_id TYPE INTEGER;
ALTER TABLE moderation_entries ALTER COLUMN decision_type_id TYPE INTEGER;
ALTER TABLE moderation_entries ALTER COLUMN decision_ground_id TYPE INTEGER;
ALTER TABLE moderation_entries ALTER COLUMN content_type_id TYPE INTEGER;

-- Recréer les indexes
CREATE INDEX IF NOT EXISTS idx_moderation_platform ON moderation_entries(platform_id);
CREATE INDEX IF NOT EXISTS idx_moderation_category ON moderation_entries(category_id);
CREATE INDEX IF NOT EXISTS idx_moderation_decision_type ON moderation_entries(decision_type_id);
CREATE INDEX IF NOT EXISTS idx_moderation_decision_ground ON moderation_entries(decision_ground_id);
CREATE INDEX IF NOT EXISTS idx_moderation_content_type ON moderation_entries(content_type_id);

-- Nettoyer les tables de sauvegarde (optionnel)
-- DROP TABLE IF EXISTS platforms_backup;
-- DROP TABLE IF EXISTS categories_backup;
-- DROP TABLE IF EXISTS decision_types_backup;
-- DROP TABLE IF EXISTS decision_grounds_backup;
-- DROP TABLE IF EXISTS content_types_backup;

