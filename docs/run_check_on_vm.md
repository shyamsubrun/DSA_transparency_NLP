# 🚀 Instructions pour Exécuter la Vérification

## Méthode 1 : Copier-Coller Direct (RECOMMANDÉ)

1. **Connectez-vous à la VM:**
```bash
ssh raouf@34.46.198.22
```

2. **Copiez-collez ce script complet dans le terminal:**

```bash
#!/bin/bash
# Script complet pour vérifier VM et PostgreSQL

echo "=========================================="
echo "🔍 VÉRIFICATION COMPLÈTE VM + POSTGRESQL"
echo "=========================================="
echo ""

DB_HOST="34.46.198.22"
DB_PORT="5432"
DB_NAME="dsa"
DB_USER="dsa_admin"
DB_PASSWORD="Mohamed2025!"

export PGPASSWORD="$DB_PASSWORD"

echo "📁 1. STRUCTURE VM"
echo "--------------------------------"
df -h
free -h
echo ""

echo "🗄️ 2. BASE DE DONNÉES"
echo "--------------------------------"
psql -h "$DB_HOST" -p "$DB_PORT" -U "$DB_USER" -d "$DB_NAME" -c "\dt" 2>&1
psql -h "$DB_HOST" -p "$DB_PORT" -U "$DB_USER" -d "$DB_NAME" -c "SELECT pg_size_pretty(pg_database_size('$DB_NAME')) AS size;" 2>&1

TABLE_EXISTS=$(psql -h "$DB_HOST" -p "$DB_PORT" -U "$DB_USER" -d "$DB_NAME" -tAc "SELECT EXISTS (SELECT FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'moderation_entries');" 2>&1 | tr -d ' ')

if [ "$TABLE_EXISTS" = "t" ]; then
    echo ""
    echo "✅ Table 'moderation_entries' existe:"
    psql -h "$DB_HOST" -p "$DB_PORT" -U "$DB_USER" -d "$DB_NAME" -c "SELECT COUNT(*) AS total FROM moderation_entries;" 2>&1
    psql -h "$DB_HOST" -p "$DB_PORT" -U "$DB_USER" -d "$DB_NAME" -c "SELECT MIN(application_date) AS min_date, MAX(application_date) AS max_date FROM moderation_entries;" 2>&1
    psql -h "$DB_HOST" -p "$DB_PORT" -U "$DB_USER" -d "$DB_NAME" -c "\d moderation_entries" 2>&1
else
    echo "❌ Table 'moderation_entries' n'existe pas"
fi

unset PGPASSWORD
```

3. **Appuyez sur Entrée** - Le script s'exécutera et affichera tous les résultats

---

## Méthode 2 : Utiliser le Script Créé

1. **Depuis votre machine locale, copiez le script sur la VM:**
```bash
scp scripts/complete_check.sh raouf@34.46.198.22:~/
```

2. **Connectez-vous à la VM:**
```bash
ssh raouf@34.46.198.22
```

3. **Rendez le script exécutable et exécutez-le:**
```bash
chmod +x ~/complete_check.sh
~/complete_check.sh
```

---

## Méthode 3 : Commandes Simples (Si les scripts ne fonctionnent pas)

Connectez-vous à la VM et exécutez ces commandes une par une:

```bash
# 1. Espace disque
df -h

# 2. Se connecter à PostgreSQL
export PGPASSWORD="Mohamed2025!"
psql -h 34.46.198.22 -p 5432 -U dsa_admin -d dsa

# 3. Dans psql, exécutez:
\dt
SELECT pg_size_pretty(pg_database_size('dsa'));
SELECT COUNT(*) FROM moderation_entries;
\d moderation_entries
\q
```

---

## Résultat Attendu

Le script affichera:
- ✅ Espace disque disponible
- ✅ Liste des tables PostgreSQL
- ✅ Taille de la base de données
- ✅ Structure des tables existantes
- ✅ Nombre de lignes de données
- ✅ Dates des données (min/max)

**Copiez-collez simplement la Méthode 1 dans votre terminal SSH et partagez-moi les résultats!** 🚀

