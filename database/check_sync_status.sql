-- Vérification de la synchronisation entre dsa_decisions et moderation_entries
-- Usage: psql -h localhost -U dsa_admin -d dsa -f database/check_sync_status.sql

\echo '========================================'
\echo 'Vérification de la synchronisation'
\echo '========================================'

-- 1. Compter les lignes dans chaque table
\echo ''
\echo '1. Nombre de lignes dans chaque table:'
SELECT 
    'dsa_decisions' as table_name,
    COUNT(*) as row_count
FROM dsa_decisions
UNION ALL
SELECT 
    'moderation_entries' as table_name,
    COUNT(*) as row_count
FROM moderation_entries;

-- 2. Vérifier la structure de dsa_decisions
\echo ''
\echo '2. Structure de la table dsa_decisions:'
SELECT 
    column_name,
    data_type,
    is_nullable
FROM information_schema.columns
WHERE table_schema = 'public'
  AND table_name = 'dsa_decisions'
ORDER BY ordinal_position
LIMIT 20;

-- 3. Vérifier la fonction de synchronisation
\echo ''
\echo '3. Définition de la fonction de synchronisation:'
SELECT pg_get_functiondef(oid) as function_definition
FROM pg_proc
WHERE proname = 'sync_dsa_decision_to_moderation_entry';

-- 4. Vérifier les triggers en détail
\echo ''
\echo '4. Détails des triggers:'
SELECT 
    t.tgname as trigger_name,
    t.tgenabled as enabled,
    pg_get_triggerdef(t.oid) as trigger_definition
FROM pg_trigger t
JOIN pg_class c ON t.tgrelid = c.oid
WHERE c.relname = 'dsa_decisions'
  AND t.tgisinternal = false;

-- 5. Comparer les dernières insertions
\echo ''
\echo '5. Dernières insertions dans dsa_decisions:'
SELECT 
    id,
    application_date,
    created_at,
    (SELECT name FROM platforms WHERE id = platform_id LIMIT 1) as platform_sample
FROM dsa_decisions
ORDER BY created_at DESC
LIMIT 10;

-- 6. Vérifier s'il y a des données dans dsa_decisions qui ne sont pas dans moderation_entries
\echo ''
\echo '6. Données dans dsa_decisions mais pas dans moderation_entries (échantillon):'
SELECT 
    dd.uuid::TEXT as id,
    dd.application_date,
    dd.created_at
FROM dsa_decisions dd
LEFT JOIN moderation_entries me ON dd.uuid::TEXT = me.id
WHERE me.id IS NULL
ORDER BY dd.created_at DESC
LIMIT 10;

-- 7. Compter les données non synchronisées
\echo ''
\echo '7. Nombre de données non synchronisées:'
SELECT 
    COUNT(*) as unsynced_count
FROM dsa_decisions dd
LEFT JOIN moderation_entries me ON dd.uuid::TEXT = me.id
WHERE me.id IS NULL;

-- 8. Vérifier les dates de dernière synchronisation
\echo ''
\echo '8. Dates de dernière modification:'
SELECT 
    'dsa_decisions' as table_name,
    MAX(created_at) as last_created,
    MAX(updated_at) as last_updated
FROM dsa_decisions
UNION ALL
SELECT 
    'moderation_entries' as table_name,
    MAX(created_at) as last_created,
    NULL as last_updated
FROM moderation_entries;

