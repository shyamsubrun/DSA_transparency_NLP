# Guide de Vérification des Tables et Triggers

Ce guide vous permet de vérifier quelle table est utilisée par le backend et s'il y a des problèmes de synchronisation.

## Étape 1: Récupérer les scripts

```bash
cd ~/dsa-dashboard
git pull origin main
chmod +x scripts/verify_table_usage.sh
```

## Étape 2: Exécuter le script de vérification complet

```bash
bash scripts/verify_table_usage.sh
```

Ce script va :
1. Lister toutes les tables dans la base de données
2. Identifier les tables contenant "moderation" ou "entry"
3. Compter les lignes dans chaque table trouvée
4. Lister tous les triggers
5. Vérifier les triggers sur les tables de moderation
6. Afficher la structure de la table `moderation_entries`
7. Lister les fonctions utilisées par les triggers
8. Vérifier les vues (views)
9. Afficher les dernières insertions
10. Vérifier la synchronisation des données

## Étape 3: Vérification manuelle détaillée (optionnel)

Si vous voulez plus de détails, exécutez le fichier SQL complet :

```bash
PGPASSWORD="Mohamed2025!" psql -h localhost -U dsa_admin -d dsa -f database/verify_tables_and_triggers.sql
```

## Étape 4: Commandes SQL individuelles

### 4.1. Lister toutes les tables

```bash
PGPASSWORD="Mohamed2025!" psql -h localhost -U dsa_admin -d dsa -c "
SELECT tablename 
FROM pg_tables 
WHERE schemaname = 'public' 
ORDER BY tablename;
"
```

### 4.2. Chercher les tables de moderation

```bash
PGPASSWORD="Mohamed2025!" psql -h localhost -U dsa_admin -d dsa -c "
SELECT tablename, 
       pg_size_pretty(pg_total_relation_size('public.'||tablename)) as size
FROM pg_tables
WHERE schemaname = 'public'
  AND (tablename ILIKE '%moderation%' OR tablename ILIKE '%entry%')
ORDER BY tablename;
"
```

### 4.3. Compter les lignes dans chaque table trouvée

Pour `moderation_entries` :
```bash
PGPASSWORD="Mohamed2025!" psql -h localhost -U dsa_admin -d dsa -c "
SELECT COUNT(*) as row_count FROM moderation_entries;
"
```

Si vous trouvez d'autres tables (par exemple `moderation_entries_raw`), comptez leurs lignes :
```bash
PGPASSWORD="Mohamed2025!" psql -h localhost -U dsa_admin -d dsa -c "
SELECT COUNT(*) as row_count FROM moderation_entries_raw;
"
```

### 4.4. Lister tous les triggers

```bash
PGPASSWORD="Mohamed2025!" psql -h localhost -U dsa_admin -d dsa -c "
SELECT 
    trigger_name,
    event_object_table as table_name,
    event_manipulation as event,
    action_timing as timing,
    action_statement as definition
FROM information_schema.triggers
WHERE trigger_schema = 'public'
ORDER BY event_object_table, trigger_name;
"
```

### 4.5. Vérifier les triggers sur les tables de moderation

```bash
PGPASSWORD="Mohamed2025!" psql -h localhost -U dsa_admin -d dsa -c "
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
"
```

### 4.6. Comparer les données entre tables (si plusieurs tables existent)

Si vous avez trouvé plusieurs tables (par exemple `moderation_entries_raw` et `moderation_entries`), comparez-les :

```bash
PGPASSWORD="Mohamed2025!" psql -h localhost -U dsa_admin -d dsa -c "
-- Compter les lignes dans chaque table
SELECT 'moderation_entries' as table_name, COUNT(*) as row_count FROM moderation_entries
UNION ALL
SELECT 'moderation_entries_raw' as table_name, COUNT(*) as row_count FROM moderation_entries_raw;
"
```

### 4.7. Vérifier les dernières insertions

```bash
PGPASSWORD="Mohamed2025!" psql -h localhost -U dsa_admin -d dsa -c "
SELECT 
    id,
    application_date,
    created_at,
    (SELECT name FROM platforms WHERE id = platform_id) as platform
FROM moderation_entries
ORDER BY created_at DESC
LIMIT 10;
"
```

### 4.8. Vérifier la synchronisation

```bash
PGPASSWORD="Mohamed2025!" psql -h localhost -U dsa_admin -d dsa -c "
SELECT 
    COUNT(*) as total_rows,
    COUNT(CASE WHEN created_at::date = CURRENT_DATE THEN 1 END) as inserted_today,
    MAX(created_at) as last_insert_time,
    MAX(application_date) as latest_application_date
FROM moderation_entries;
"
```

## Étape 5: Vérifier quelle table le backend utilise

Le backend utilise **toujours** la table `moderation_entries` (définie dans `backend/prisma/schema.prisma` ligne 86).

Pour vérifier :
```bash
grep -A 2 "@@map" backend/prisma/schema.prisma | grep moderation
```

Vous devriez voir : `@@map("moderation_entries")`

## Interprétation des résultats

### Si vous trouvez plusieurs tables :

1. **`moderation_entries_raw`** ou similaire : Table avec les données brutes
2. **`moderation_entries`** : Table utilisée par le backend (filtrée/traitée)

### Si vous trouvez des triggers :

Les triggers devraient synchroniser automatiquement les données de la table raw vers `moderation_entries`.

### Si les données ne sont pas synchronisées :

1. Vérifiez que les triggers sont actifs
2. Vérifiez les logs PostgreSQL pour les erreurs de triggers
3. Vérifiez que les fonctions des triggers fonctionnent correctement

## Commandes utiles supplémentaires

### Voir la définition complète d'un trigger :

```bash
PGPASSWORD="Mohamed2025!" psql -h localhost -U dsa_admin -d dsa -c "
SELECT pg_get_triggerdef(oid) 
FROM pg_trigger 
WHERE tgname = 'nom_du_trigger';
"
```

### Voir les logs PostgreSQL (si activés) :

```bash
sudo tail -f /var/log/postgresql/postgresql-*.log
```

### Tester manuellement un trigger :

Si vous avez un trigger `sync_moderation_entries`, vous pouvez tester en insérant une ligne dans la table raw et voir si elle apparaît dans `moderation_entries`.

