# 🔍 Vérification Rapide VM et PostgreSQL

## Commandes à Exécuter sur la VM

### 1. Explorer la Structure de la VM

```bash
# Voir le répertoire home
ls -lah ~

# Voir les répertoires dans /home
ls -lah /home/

# Voir l'espace disque disponible
df -h

# Voir la mémoire
free -h

# Vérifier si PostgreSQL est installé et actif
systemctl status postgresql

# Voir les processus PostgreSQL
ps aux | grep postgres
```

### 2. Vérifier la Base de Données PostgreSQL

```bash
# Se connecter à PostgreSQL
psql -h 34.46.198.22 -p 5432 -U dsa_admin -d dsa

# Mot de passe: Mohamed2025!
```

**Une fois connecté, exécuter ces commandes SQL:**

```sql
-- Voir la version PostgreSQL
SELECT version();

-- Voir la taille de la base de données
SELECT pg_size_pretty(pg_database_size('dsa')) AS database_size;

-- Lister toutes les tables
\dt

-- Voir la structure d'une table (si elle existe)
\d moderation_entries

-- Compter les lignes dans chaque table
SELECT 
    schemaname,
    tablename,
    (xpath('/row/c/text()', query_to_xml(format('select count(*) as c from %I.%I', schemaname, tablename), false, true, '')))[1]::text::int AS row_count
FROM pg_tables
WHERE schemaname = 'public'
ORDER BY row_count DESC;

-- Voir un échantillon de données (si table existe)
SELECT * FROM moderation_entries LIMIT 5;

-- Voir les dates disponibles
SELECT 
    MIN(application_date) AS earliest_date,
    MAX(application_date) AS latest_date,
    COUNT(DISTINCT application_date) AS unique_dates
FROM moderation_entries;

-- Voir les plateformes (si table existe)
SELECT * FROM platforms LIMIT 10;

-- Voir les catégories (si table existe)
SELECT * FROM categories LIMIT 10;
```

### 3. Vérifier les Fichiers de Données

```bash
# Chercher des fichiers CSV ou scripts Python
find ~ -name "*.csv" -type f 2>/dev/null | head -10
find ~ -name "*.py" -type f 2>/dev/null | head -10
find ~ -name "*.sql" -type f 2>/dev/null | head -10

# Voir les répertoires de données
ls -lah ~/data 2>/dev/null
ls -lah ~/dsa* 2>/dev/null
```

### 4. Vérifier les Cron Jobs (si automatisation configurée)

```bash
# Voir les cron jobs de l'utilisateur
crontab -l

# Voir les logs récents
tail -50 /var/log/syslog | grep -i postgres
```

## Scripts Automatisés

J'ai créé deux scripts pour vous faciliter la tâche:

### Script 1: Vérifier la VM
```bash
# Copier le script sur la VM
# Puis exécuter:
bash scripts/check_vm_status.sh
```

### Script 2: Vérifier PostgreSQL
```bash
# Copier le script sur la VM
# Puis exécuter:
bash scripts/check_postgresql.sh
```

## Questions à Répondre

Après avoir exécuté ces commandes, notez:

1. ✅ **PostgreSQL est-il installé et actif?**
2. ✅ **Quelle est la taille actuelle de la base de données?**
3. ✅ **Quelles tables existent déjà?**
4. ✅ **Combien de lignes de données sont déjà présentes?**
5. ✅ **Quelles sont les dates des données (du ... au ...)?**
6. ✅ **Y a-t-il des scripts Python ou SQL sur la VM?**
7. ✅ **Y a-t-il des fichiers CSV de données?**
8. ✅ **Combien d'espace disque reste-t-il?**

Ces informations nous aideront à décider:
- Si on doit créer de nouvelles tables ou utiliser les existantes
- Si on doit importer de nouvelles données ou compléter les existantes
- Quelle stratégie d'import adopter

