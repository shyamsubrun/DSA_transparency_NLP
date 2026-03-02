# ⚡ Commandes Rapides - Copier-Coller

## 🚀 Installation Complète (Toutes les Étapes)

### 1. Copier les fichiers sur la VM

```bash
scp database/create_optimized_schema.sql raouf@34.46.198.22:~/
scp database/add_sync_triggers.sql raouf@34.46.198.22:~/
```

### 2. Se connecter à la VM

```bash
ssh raouf@34.46.198.22
```

### 3. Créer le schéma optimisé

```bash
sudo -u postgres psql -d dsa -f ~/create_optimized_schema.sql
```

### 4. Activer les triggers

```bash
sudo -u postgres psql -d dsa -f ~/add_sync_triggers.sql
```

### 5. Migrer les données existantes

```bash
sudo -u postgres psql -d dsa << 'SQL'
SELECT * FROM sync_all_dsa_decisions();
SQL
```

**⏱️ Temps estimé : 10-20 minutes**

### 6. Vérifier que tout fonctionne

```bash
sudo -u postgres psql -d dsa << 'SQL'
-- Vérifier le nombre de lignes
SELECT 
    'dsa_decisions' AS table_name,
    COUNT(*) AS row_count
FROM dsa_decisions
UNION ALL
SELECT 
    'moderation_entries' AS table_name,
    COUNT(*) AS row_count
FROM moderation_entries;

-- Vérifier un échantillon
SELECT 
    m.id,
    p.name AS platform,
    c.name AS category,
    dt.name AS decision_type,
    m.application_date
FROM moderation_entries m
JOIN platforms p ON m.platform_id = p.id
JOIN categories c ON m.category_id = c.id
JOIN decision_types dt ON m.decision_type_id = dt.id
LIMIT 5;
SQL
```

---

## 🔄 Synchronisation Manuelle (Plus Tard)

### Synchroniser les nouvelles données

```bash
sudo -u postgres psql -d dsa << 'SQL'
SELECT * FROM sync_new_dsa_decisions();
SQL
```

### Synchroniser une date spécifique

```bash
sudo -u postgres psql -d dsa << 'SQL'
SELECT * FROM sync_dsa_decisions_by_date('2025-12-12');
SQL
```

---

## ✅ Vérifications

### Vérifier les triggers

```bash
sudo -u postgres psql -d dsa -c "SELECT trigger_name FROM information_schema.triggers WHERE event_object_table = 'dsa_decisions';"
```

### Vérifier l'état de synchronisation

```bash
sudo -u postgres psql -d dsa << 'SQL'
-- Lignes dans chaque table
SELECT 
    'dsa_decisions' AS table_name,
    COUNT(*) AS row_count
FROM dsa_decisions
UNION ALL
SELECT 
    'moderation_entries' AS table_name,
    COUNT(*) AS row_count
FROM moderation_entries;

-- Lignes manquantes
SELECT COUNT(*) AS missing_count
FROM dsa_decisions d
LEFT JOIN moderation_entries m ON m.id = d.uuid::TEXT
WHERE m.id IS NULL;
SQL
```

---

## 🧪 Test de Synchronisation Automatique

```bash
sudo -u postgres psql -d dsa << 'SQL'
-- Insérer une ligne de test
INSERT INTO dsa_decisions (
    uuid, platform_name, category, decision_ground,
    application_date, territorial_scope, automated_detection, automated_decision, decision_visibility
) VALUES (
    gen_random_uuid(), 'Test Platform', 'Test Category', 'DECISION_GROUND_INCOMPATIBLE_CONTENT',
    CURRENT_DATE, '["FR"]'::jsonb, true, 'FULLY', 'DISABLED'
);

-- Vérifier qu'elle est dans moderation_entries
SELECT p.name AS platform FROM moderation_entries m
JOIN platforms p ON m.platform_id = p.id
WHERE p.name = 'Test Platform';

-- Nettoyer
DELETE FROM dsa_decisions WHERE platform_name = 'Test Platform';
SQL
```

