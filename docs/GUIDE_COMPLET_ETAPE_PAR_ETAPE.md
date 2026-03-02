# 📘 Guide Complet - Étape par Étape

## 🎯 Objectif

Créer une table optimisée `moderation_entries` à partir de `dsa_decisions`, avec **synchronisation automatique** pour que quand votre collègue ajoute des données, elles soient automatiquement synchronisées.

---

## 📋 Vue d'Ensemble

### Ce qui va se passer :

1. ✅ Créer des tables optimisées (`moderation_entries` + tables de référence)
2. ✅ Migrer les 400K lignes existantes de `dsa_decisions` → `moderation_entries`
3. ✅ Activer des triggers pour synchronisation automatique
4. ✅ Vérifier que tout fonctionne

### Résultat Final :

- ✅ Table `moderation_entries` avec données transformées et optimisées
- ✅ Synchronisation automatique : nouvelles données dans `dsa_decisions` → automatiquement dans `moderation_entries`
- ✅ Table `dsa_decisions` reste intacte (votre collègue peut continuer à l'utiliser)

---

## 🚀 ÉTAPE 1 : Préparer les Fichiers

### Sur votre machine locale :

1. **Vérifier que vous avez les fichiers nécessaires :**
   - `database/create_optimized_schema.sql` ✅
   - `database/add_sync_triggers.sql` (à créer)

2. **Si les fichiers n'existent pas, créez-les** (voir sections suivantes)

---

## 🚀 ÉTAPE 2 : Copier les Fichiers sur la VM

### Depuis votre machine locale :

```bash
# Copier le fichier de schéma
scp database/create_optimized_schema.sql raouf@34.46.198.22:~/

# Copier le fichier de triggers (après l'avoir créé)
scp database/add_sync_triggers.sql raouf@34.46.198.22:~/
```

---

## 🚀 ÉTAPE 3 : Se Connecter à la VM

```bash
ssh raouf@34.46.198.22
```

---

## 🚀 ÉTAPE 4 : Créer le Schéma Optimisé

### Sur la VM, exécutez :

```bash
# Créer les tables optimisées
sudo -u postgres psql -d dsa -f ~/create_optimized_schema.sql
```

**Ce que ça fait :**
- ✅ Crée les tables de référence (`platforms`, `categories`, etc.)
- ✅ Crée la table `moderation_entries` optimisée
- ✅ Crée les fonctions de transformation
- ✅ Crée les indexes pour performance

**Temps estimé :** 1-2 minutes

**Vérification :**
```bash
# Vérifier que les tables sont créées
sudo -u postgres psql -d dsa -c "\dt"
```

Vous devriez voir :
- `dsa_decisions` (table existante)
- `moderation_entries` (nouvelle table)
- `platforms`, `categories`, `decision_types`, `decision_grounds`, `content_types` (nouvelles tables)

---

## 🚀 ÉTAPE 5 : Activer les Triggers de Synchronisation

### Sur la VM, exécutez :

```bash
# Activer les triggers pour synchronisation automatique
sudo -u postgres psql -d dsa -f ~/add_sync_triggers.sql
```

**Ce que ça fait :**
- ✅ Crée les triggers qui synchronisent automatiquement
- ✅ Quand votre collègue ajoute une ligne dans `dsa_decisions`, elle est automatiquement ajoutée dans `moderation_entries`

**Temps estimé :** 30 secondes

**Vérification :**
```bash
# Vérifier que les triggers sont actifs
sudo -u postgres psql -d dsa -c "SELECT trigger_name FROM information_schema.triggers WHERE event_object_table = 'dsa_decisions';"
```

Vous devriez voir :
- `trigger_sync_dsa_decision_insert`
- `trigger_sync_dsa_decision_update`

---

## 🚀 ÉTAPE 6 : Migrer les Données Existantes

### Option A : Migration avec Fonction SQL (RECOMMANDÉ)

**Sur la VM, exécutez :**

```bash
sudo -u postgres psql -d dsa << 'SQL'
-- Synchroniser toutes les données existantes
SELECT * FROM sync_all_dsa_decisions();
SQL
```

**Ce que ça fait :**
- ✅ Lit toutes les 400K lignes de `dsa_decisions`
- ✅ Les transforme (calcule decision_type, delay_days, etc.)
- ✅ Les insère dans `moderation_entries`
- ✅ Normalise dans les tables de référence

**Temps estimé :** 10-20 minutes (pour 400K lignes)

**Vérification pendant la migration :**
```bash
# Dans un autre terminal, vérifier la progression
sudo -u postgres psql -d dsa -c "SELECT COUNT(*) FROM moderation_entries;"
```

### Option B : Migration avec Script Python (Alternative)

Si la fonction SQL ne fonctionne pas, utilisez le script Python :

```bash
# Depuis votre machine locale
python scripts/migrate_dsa_decisions_to_moderation_entries.py
```

---

## 🚀 ÉTAPE 7 : Vérifier que Tout Fonctionne

### Vérifications à faire :

```bash
# 1. Vérifier le nombre de lignes
sudo -u postgres psql -d dsa << 'SQL'
SELECT 
    'dsa_decisions' AS table_name,
    COUNT(*) AS row_count
FROM dsa_decisions
UNION ALL
SELECT 
    'moderation_entries' AS table_name,
    COUNT(*) AS row_count
FROM moderation_entries;
SQL

# 2. Vérifier un échantillon de données
sudo -u postgres psql -d dsa << 'SQL'
SELECT 
    m.id,
    p.name AS platform,
    c.name AS category,
    dt.name AS decision_type,
    m.application_date,
    m.delay_days
FROM moderation_entries m
JOIN platforms p ON m.platform_id = p.id
JOIN categories c ON m.category_id = c.id
JOIN decision_types dt ON m.decision_type_id = dt.id
LIMIT 5;
SQL

# 3. Vérifier les tables de référence
sudo -u postgres psql -d dsa << 'SQL'
SELECT 'platforms' AS table_name, COUNT(*) AS count FROM platforms
UNION ALL
SELECT 'categories', COUNT(*) FROM categories
UNION ALL
SELECT 'decision_types', COUNT(*) FROM decision_types
UNION ALL
SELECT 'decision_grounds', COUNT(*) FROM decision_grounds
UNION ALL
SELECT 'content_types', COUNT(*) FROM content_types;
SQL
```

**Résultats attendus :**
- ✅ `moderation_entries` : ~400K lignes (même nombre que `dsa_decisions`)
- ✅ Échantillon de données visible avec données transformées
- ✅ Tables de référence remplies

---

## 🚀 ÉTAPE 8 : Tester la Synchronisation Automatique

### Test : Ajouter une ligne de test

```bash
sudo -u postgres psql -d dsa << 'SQL'
-- Insérer une ligne de test dans dsa_decisions
INSERT INTO dsa_decisions (
    uuid,
    platform_name,
    category,
    decision_ground,
    application_date,
    territorial_scope,
    automated_detection,
    automated_decision,
    decision_visibility
) VALUES (
    gen_random_uuid(),
    'Test Platform Sync',
    'Test Category',
    'DECISION_GROUND_INCOMPATIBLE_CONTENT',
    CURRENT_DATE,
    '["FR"]'::jsonb,
    true,
    'FULLY',
    'DISABLED'
);

-- Vérifier qu'elle est automatiquement dans moderation_entries
SELECT 
    m.id,
    p.name AS platform,
    dt.name AS decision_type
FROM moderation_entries m
JOIN platforms p ON m.platform_id = p.id
JOIN decision_types dt ON m.decision_type_id = dt.id
WHERE p.name = 'Test Platform Sync';

-- Nettoyer (supprimer la ligne de test)
DELETE FROM dsa_decisions WHERE platform_name = 'Test Platform Sync';
SQL
```

**Résultat attendu :**
- ✅ La ligne apparaît automatiquement dans `moderation_entries`
- ✅ Les données sont transformées (decision_type calculé, etc.)

---

## 🚀 ÉTAPE 9 : Synchroniser les Nouvelles Données (Si Besoin)

### Si votre collègue a ajouté des données pendant la migration :

```bash
sudo -u postgres psql -d dsa << 'SQL'
-- Synchroniser seulement les nouvelles données
SELECT * FROM sync_new_dsa_decisions();
SQL
```

**Ce que ça fait :**
- ✅ Trouve les lignes dans `dsa_decisions` qui ne sont pas dans `moderation_entries`
- ✅ Les synchronise

---

## ✅ Résumé : Checklist Complète

- [ ] **Étape 1** : Préparer les fichiers SQL
- [ ] **Étape 2** : Copier les fichiers sur la VM
- [ ] **Étape 3** : Se connecter à la VM
- [ ] **Étape 4** : Créer le schéma optimisé (`create_optimized_schema.sql`)
- [ ] **Étape 5** : Activer les triggers (`add_sync_triggers.sql`)
- [ ] **Étape 6** : Migrer les données existantes (`sync_all_dsa_decisions()`)
- [ ] **Étape 7** : Vérifier que tout fonctionne
- [ ] **Étape 8** : Tester la synchronisation automatique
- [ ] **Étape 9** : Synchroniser les nouvelles données si besoin

---

## 🆘 En Cas de Problème

### Problème 1 : Erreur lors de la création du schéma

```bash
# Vérifier les erreurs
sudo -u postgres psql -d dsa -f ~/create_optimized_schema.sql 2>&1 | grep -i error

# Si certaines tables existent déjà, supprimer et recréer (ATTENTION: supprime les données!)
# sudo -u postgres psql -d dsa -c "DROP TABLE IF EXISTS moderation_entries CASCADE;"
```

### Problème 2 : Migration lente ou bloquée

```bash
# Vérifier la progression
sudo -u postgres psql -d dsa -c "SELECT COUNT(*) FROM moderation_entries;"

# Si bloqué, annuler (Ctrl+C) et relancer
```

### Problème 3 : Triggers ne fonctionnent pas

```bash
# Vérifier que les triggers existent
sudo -u postgres psql -d dsa -c "SELECT trigger_name FROM information_schema.triggers WHERE event_object_table = 'dsa_decisions';"

# Si pas de triggers, réexécuter
sudo -u postgres psql -d dsa -f ~/add_sync_triggers.sql
```

---

## 📊 Commandes Utiles pour Plus Tard

### Synchroniser les nouvelles données manuellement :

```bash
sudo -u postgres psql -d dsa << 'SQL'
SELECT * FROM sync_new_dsa_decisions();
SQL
```

### Synchroniser une date spécifique :

```bash
sudo -u postgres psql -d dsa << 'SQL'
SELECT * FROM sync_dsa_decisions_by_date('2025-12-12');
SQL
```

### Voir l'état de synchronisation :

```bash
sudo -u postgres psql -d dsa << 'SQL'
-- Voir combien de lignes dans chaque table
SELECT 
    'dsa_decisions' AS table_name,
    COUNT(*) AS row_count
FROM dsa_decisions
UNION ALL
SELECT 
    'moderation_entries' AS table_name,
    COUNT(*) AS row_count
FROM moderation_entries;

-- Voir les lignes manquantes
SELECT COUNT(*) AS missing_count
FROM dsa_decisions d
LEFT JOIN moderation_entries m ON m.id = d.uuid::TEXT
WHERE m.id IS NULL;
SQL
```

---

## 🎉 C'est Terminé !

Une fois toutes les étapes complétées :

✅ **Table `moderation_entries` créée et remplie**  
✅ **Synchronisation automatique activée**  
✅ **Votre collègue peut continuer à ajouter des données dans `dsa_decisions`**  
✅ **Les nouvelles données seront automatiquement synchronisées**  

**Vous pouvez maintenant utiliser `moderation_entries` dans votre dashboard !** 🚀

