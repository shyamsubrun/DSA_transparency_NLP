# 🎯 Stratégie de Migration et Import

## 📊 Situation Actuelle

### Ce qui Existe
- ✅ **Table `dsa_decisions`** : 399,995 lignes
- ✅ **Dates** : 2024-06-07 à 2025-11-25 (30 jours)
- ✅ **Format** : Données brutes DSA (non transformées)
- ✅ **Espace** : 131 GB disponibles

### Problèmes Identifiés
- ❌ Pas de normalisation (pas de tables de référence)
- ❌ Pas de colonne `decision_type` (doit être calculé)
- ❌ Pas de colonne `delay_days` (doit être calculé)
- ❌ Pas de colonne `country` (doit être extrait)
- ❌ `automated_decision` est TEXT au lieu de BOOLEAN
- ❌ `content_type` est format brut au lieu de normalisé

## 🎯 Stratégie Recommandée

### Option 1: Créer Table Optimisée + Migrer (RECOMMANDÉ)

**Avantages:**
- ✅ Schéma optimisé pour votre dashboard
- ✅ Normalisation complète (tables de référence)
- ✅ Meilleures performances
- ✅ Compatible avec vos scripts d'import futurs

**Étapes:**
1. Créer schéma optimisé (`moderation_entries` + tables de référence)
2. Migrer données existantes de `dsa_decisions` → `moderation_entries`
3. Compléter avec nouvelles données (12 décembre, etc.)
4. Garder `dsa_decisions` pour référence (ou supprimer après migration)

### Option 2: Utiliser Vue de Transformation

**Avantages:**
- ✅ Pas besoin de migrer
- ✅ Vue transforme automatiquement

**Inconvénients:**
- ❌ Pas de normalisation
- ❌ Performances moins bonnes
- ❌ Pas compatible avec scripts d'import

## 🚀 Plan d'Action

### Étape 1: Créer le Schéma Optimisé

```bash
# Sur la VM, exécuter:
sudo -u postgres psql -d dsa -f database/create_optimized_schema.sql
```

**Ce que ça fait:**
- Crée tables de référence (platforms, categories, etc.)
- Crée table `moderation_entries` optimisée
- Crée fonctions de transformation
- Crée vue `moderation_entries_view` pour transformation

### Étape 2: Migrer les Données Existantes

```bash
# Depuis votre machine locale (avec .env configuré):
python scripts/migrate_dsa_decisions_to_moderation_entries.py
```

**Ce que ça fait:**
- Lit toutes les lignes de `dsa_decisions`
- Transforme chaque ligne (decision_type, delay_days, etc.)
- Normalise dans tables de référence
- Insère dans `moderation_entries`

### Étape 3: Compléter avec Nouvelles Données

Une fois la migration terminée, vous pouvez:
- Transformer vos nouveaux CSV (12 décembre, etc.)
- Les importer dans `moderation_entries` avec le script d'import existant

## 📋 Commandes Complètes

### 1. Créer le Schéma (sur VM)

```bash
# Copier le fichier SQL sur la VM
scp database/create_optimized_schema.sql raouf@34.46.198.22:~/

# Se connecter à la VM
ssh raouf@34.46.198.22

# Exécuter le schéma
sudo -u postgres psql -d dsa -f ~/create_optimized_schema.sql
```

### 2. Configurer .env (sur machine locale)

Créer fichier `.env`:
```env
DB_HOST=34.46.198.22
DB_PORT=5432
DB_NAME=dsa
DB_USER=dsa_admin
DB_PASSWORD=Mohamed2025!
```

**⚠️ ATTENTION**: Le mot de passe ne fonctionne pas en connexion distante. Il faut soit:
- Utiliser `sudo -u postgres` sur la VM
- OU configurer l'authentification PostgreSQL pour accepter connexions distantes

### 3. Migrer les Données

```bash
# Installer dépendances
pip install -r requirements.txt

# Exécuter migration
python scripts/migrate_dsa_decisions_to_moderation_entries.py
```

## 🔧 Alternative: Migration Directe sur VM

Si la connexion distante ne fonctionne pas, on peut faire la migration directement sur la VM:

```bash
# Sur la VM, créer script Python
# (Je peux créer un script qui utilise psycopg2 localement)
```

## ✅ Résultat Attendu

Après migration:
- ✅ Table `moderation_entries` avec ~400K lignes transformées
- ✅ Tables de référence remplies (platforms, categories, etc.)
- ✅ Données normalisées et optimisées
- ✅ Prêt pour compléter avec nouvelles données

## 📊 Vérification Après Migration

```bash
# Sur la VM
sudo -u postgres psql -d dsa << 'SQL'
-- Vérifier nombre de lignes
SELECT COUNT(*) FROM moderation_entries;

-- Vérifier tables de référence
SELECT COUNT(*) FROM platforms;
SELECT COUNT(*) FROM categories;
SELECT COUNT(*) FROM decision_types;

-- Vérifier échantillon
SELECT * FROM moderation_entries LIMIT 5;

-- Vérifier taille
SELECT pg_size_pretty(pg_total_relation_size('moderation_entries')) AS table_size;
SQL
```

## 🎯 Prochaines Étapes

1. **Créer le schéma** sur la VM
2. **Migrer les données** existantes
3. **Vérifier** que tout fonctionne
4. **Compléter** avec nouvelles données (12 décembre, etc.)

**Voulez-vous que je crée un script de migration qui fonctionne directement sur la VM (sans connexion distante) ?** 🚀

