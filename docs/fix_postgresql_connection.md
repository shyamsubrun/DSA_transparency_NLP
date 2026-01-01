# 🔧 Résolution Problème Connexion PostgreSQL

## Problème Identifié

L'authentification échoue avec:
```
FATAL: password authentication failed for user "dsa_admin"
```

## Solutions à Essayer

### Solution 1: Connexion Locale (RECOMMANDÉ)

Puisque vous êtes **déjà sur la VM**, essayez de vous connecter **localement** (sans IP):

```bash
# Essayer avec l'utilisateur postgres (superuser)
sudo -u postgres psql

# Ou essayer directement à la base dsa
sudo -u postgres psql -d dsa

# Une fois connecté, exécutez:
\dt
SELECT pg_size_pretty(pg_database_size('dsa'));
SELECT COUNT(*) FROM moderation_entries;
\d moderation_entries
\q
```

### Solution 2: Vérifier les Utilisateurs

```bash
# Voir tous les utilisateurs PostgreSQL
sudo -u postgres psql -c "\du"

# Voir toutes les bases de données
sudo -u postgres psql -c "\l"
```

### Solution 3: Réinitialiser le Mot de Passe

Si le mot de passe est incorrect, vous pouvez le réinitialiser:

```bash
# Se connecter en tant que postgres
sudo -u postgres psql

# Dans psql, exécutez:
ALTER USER dsa_admin WITH PASSWORD 'Mohamed2025!';
\q
```

### Solution 4: Vérifier la Configuration

PostgreSQL peut être configuré pour accepter seulement les connexions locales:

```bash
# Voir la configuration d'authentification
sudo cat /etc/postgresql/*/main/pg_hba.conf | grep -v "^#" | grep -v "^$"
```

### Solution 5: Connexion Directe (Sans IP)

Essayez sans spécifier l'IP (connexion locale):

```bash
export PGPASSWORD="Mohamed2025!"
psql -U dsa_admin -d dsa
# (sans -h 35.223.190.104)
```

## Commandes à Exécuter Maintenant

**Copiez-collez ces commandes dans votre terminal SSH:**

```bash
# 1. Vérifier les bases de données
sudo -u postgres psql -c "\l"

# 2. Vérifier les utilisateurs
sudo -u postgres psql -c "\du"

# 3. Essayer connexion locale à la base dsa
sudo -u postgres psql -d dsa -c "\dt"

# 4. Si ça marche, voir les tables
sudo -u postgres psql -d dsa << 'SQL'
\dt
SELECT pg_size_pretty(pg_database_size('dsa')) AS size;
SELECT tablename FROM pg_tables WHERE schemaname = 'public';
SQL

# 5. Si table moderation_entries existe
sudo -u postgres psql -d dsa << 'SQL'
SELECT COUNT(*) FROM moderation_entries;
SELECT MIN(application_date), MAX(application_date) FROM moderation_entries;
\d moderation_entries
SQL
```

## Résultat Attendu

Ces commandes devraient fonctionner car vous utilisez `sudo -u postgres` qui vous donne les droits superuser.

**Exécutez ces commandes et partagez-moi les résultats!** 🚀

