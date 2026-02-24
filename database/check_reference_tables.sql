-- Vérifier le nombre d'entrées dans les tables de référence
-- Pour identifier quelle table dépasse la limite SMALLINT (32767)

\echo '=== Nombre d\'entrées dans les tables de référence ==='
\echo ''

\echo 'Platforms:'
SELECT COUNT(*) as count, MAX(id) as max_id FROM platforms;

\echo ''
\echo 'Categories:'
SELECT COUNT(*) as count, MAX(id) as max_id FROM categories;

\echo ''
\echo 'Decision Types:'
SELECT COUNT(*) as count, MAX(id) as max_id FROM decision_types;

\echo ''
\echo 'Decision Grounds:'
SELECT COUNT(*) as count, MAX(id) as max_id FROM decision_grounds;

\echo ''
\echo 'Content Types:'
SELECT COUNT(*) as count, MAX(id) as max_id FROM content_types;

\echo ''
\echo '=== Limite SMALLINT: 32767 ==='
\echo 'Si max_id > 32767, la table doit être modifiée pour utiliser INTEGER.'
