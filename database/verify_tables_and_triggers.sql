-- Script de vérification complète des tables et triggers
-- Usage: psql -h localhost -U dsa_admin -d dsa -f database/verify_tables_and_triggers.sql

-- ============================================
-- ÉTAPE 1: Lister TOUTES les tables dans la base de données
-- ============================================
\echo '========================================'
\echo 'ÉTAPE 1: Liste de TOUTES les tables'
\echo '========================================'
SELECT 
    schemaname,
    tablename,
    tableowner
FROM pg_tables
WHERE schemaname NOT IN ('pg_catalog', 'information_schema')
ORDER BY schemaname, tablename;

-- ============================================
-- ÉTAPE 2: Chercher toutes les tables contenant "moderation" ou "entry"
-- ============================================
\echo ''
\echo '========================================'
\echo 'ÉTAPE 2: Tables contenant "moderation" ou "entry"'
\echo '========================================'
SELECT 
    schemaname,
    tablename,
    tableowner,
    pg_size_pretty(pg_total_relation_size(schemaname||'.'||tablename)) as size
FROM pg_tables
WHERE schemaname NOT IN ('pg_catalog', 'information_schema')
  AND (tablename ILIKE '%moderation%' OR tablename ILIKE '%entry%')
ORDER BY tablename;

-- ============================================
-- ÉTAPE 3: Compter les lignes dans chaque table de moderation trouvée
-- ============================================
\echo ''
\echo '========================================'
\echo 'ÉTAPE 3: Nombre de lignes par table'
\echo '========================================'

-- Table moderation_entries (utilisée par le backend)
SELECT 
    'moderation_entries' as table_name,
    COUNT(*) as row_count
FROM moderation_entries;

-- Chercher d'autres tables possibles
DO $$
DECLARE
    table_record RECORD;
    row_count BIGINT;
BEGIN
    FOR table_record IN 
        SELECT tablename 
        FROM pg_tables 
        WHERE schemaname = 'public' 
          AND (tablename ILIKE '%moderation%' OR tablename ILIKE '%entry%')
          AND tablename != 'moderation_entries'
    LOOP
        EXECUTE format('SELECT COUNT(*) FROM %I', table_record.tablename) INTO row_count;
        RAISE NOTICE 'Table: % | Rows: %', table_record.tablename, row_count;
    END LOOP;
END $$;

-- ============================================
-- ÉTAPE 4: Lister TOUS les triggers dans la base de données
-- ============================================
\echo ''
\echo '========================================'
\echo 'ÉTAPE 4: Liste de TOUS les triggers'
\echo '========================================'
SELECT 
    trigger_schema,
    trigger_name,
    event_object_table as table_name,
    event_manipulation as event,
    action_timing as timing,
    action_statement as definition
FROM information_schema.triggers
WHERE trigger_schema NOT IN ('pg_catalog', 'information_schema')
ORDER BY event_object_table, trigger_name;

-- ============================================
-- ÉTAPE 5: Vérifier les triggers sur les tables de moderation
-- ============================================
\echo ''
\echo '========================================'
\echo 'ÉTAPE 5: Triggers sur les tables de moderation'
\echo '========================================'
SELECT 
    trigger_name,
    event_object_table as table_name,
    event_manipulation as event,
    action_timing as timing,
    action_statement as definition
FROM information_schema.triggers
WHERE trigger_schema = 'public'
  AND (event_object_table ILIKE '%moderation%' OR event_object_table ILIKE '%entry%')
ORDER BY event_object_table, trigger_name;

-- ============================================
-- ÉTAPE 6: Vérifier la structure de la table moderation_entries
-- ============================================
\echo ''
\echo '========================================'
\echo 'ÉTAPE 6: Structure de la table moderation_entries'
\echo '========================================'
SELECT 
    column_name,
    data_type,
    is_nullable,
    column_default
FROM information_schema.columns
WHERE table_schema = 'public'
  AND table_name = 'moderation_entries'
ORDER BY ordinal_position;

-- ============================================
-- ÉTAPE 7: Comparer les données entre tables (si d'autres tables existent)
-- ============================================
\echo ''
\echo '========================================'
\echo 'ÉTAPE 7: Comparaison des données (si plusieurs tables)'
\echo '========================================'

-- Vérifier s'il y a une table "raw" ou similaire
DO $$
DECLARE
    table_record RECORD;
    raw_table_name TEXT;
    filtered_table_name TEXT;
BEGIN
    -- Chercher une table "raw"
    SELECT tablename INTO raw_table_name
    FROM pg_tables
    WHERE schemaname = 'public'
      AND (tablename ILIKE '%raw%' OR tablename ILIKE '%original%' OR tablename ILIKE '%source%')
      AND tablename ILIKE '%moderation%'
    LIMIT 1;
    
    -- Chercher une table "filtered" ou "processed"
    SELECT tablename INTO filtered_table_name
    FROM pg_tables
    WHERE schemaname = 'public'
      AND (tablename ILIKE '%filter%' OR tablename ILIKE '%process%' OR tablename ILIKE '%clean%')
      AND tablename ILIKE '%moderation%'
    LIMIT 1;
    
    IF raw_table_name IS NOT NULL THEN
        RAISE NOTICE 'Table RAW trouvée: %', raw_table_name;
        EXECUTE format('SELECT COUNT(*) as count FROM %I', raw_table_name);
    END IF;
    
    IF filtered_table_name IS NOT NULL THEN
        RAISE NOTICE 'Table FILTERED trouvée: %', filtered_table_name;
        EXECUTE format('SELECT COUNT(*) as count FROM %I', filtered_table_name);
    END IF;
    
    IF raw_table_name IS NULL AND filtered_table_name IS NULL THEN
        RAISE NOTICE 'Aucune table RAW ou FILTERED trouvée. Seule moderation_entries existe.';
    END IF;
END $$;

-- ============================================
-- ÉTAPE 8: Vérifier les fonctions liées aux triggers
-- ============================================
\echo ''
\echo '========================================'
\echo 'ÉTAPE 8: Fonctions utilisées par les triggers'
\echo '========================================'
SELECT 
    p.proname as function_name,
    pg_get_functiondef(p.oid) as function_definition
FROM pg_proc p
JOIN pg_namespace n ON p.pronamespace = n.oid
WHERE n.nspname = 'public'
  AND p.proname ILIKE '%moderation%'
ORDER BY p.proname;

-- ============================================
-- ÉTAPE 9: Vérifier les vues (views) qui pourraient être utilisées
-- ============================================
\echo ''
\echo '========================================'
\echo 'ÉTAPE 9: Vues (views) dans la base de données'
\echo '========================================'
SELECT 
    schemaname,
    viewname,
    viewowner,
    definition
FROM pg_views
WHERE schemaname NOT IN ('pg_catalog', 'information_schema')
ORDER BY viewname;

-- ============================================
-- ÉTAPE 10: Vérifier les dernières insertions dans moderation_entries
-- ============================================
\echo ''
\echo '========================================'
\echo 'ÉTAPE 10: Dernières insertions dans moderation_entries'
\echo '========================================'
SELECT 
    id,
    application_date,
    created_at,
    platform_id
FROM moderation_entries
ORDER BY created_at DESC
LIMIT 10;

-- ============================================
-- ÉTAPE 11: Vérifier si created_at correspond à application_date
-- (pour détecter si les données sont synchronisées)
-- ============================================
\echo ''
\echo '========================================'
\echo 'ÉTAPE 11: Vérification de la synchronisation'
\echo '========================================'
SELECT 
    COUNT(*) as total_rows,
    COUNT(CASE WHEN created_at::date = CURRENT_DATE THEN 1 END) as inserted_today,
    COUNT(CASE WHEN created_at::date = CURRENT_DATE - INTERVAL '1 day' THEN 1 END) as inserted_yesterday,
    MAX(created_at) as last_insert_time,
    MAX(application_date) as latest_application_date
FROM moderation_entries;

