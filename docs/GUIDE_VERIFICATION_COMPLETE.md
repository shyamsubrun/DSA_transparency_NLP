# ✅ Guide de Vérification Complète

## 🎯 Objectif

Vérifier que :
1. ✅ Les triggers sont bien implémentés et actifs
2. ✅ La synchronisation automatique fonctionne
3. ✅ Les données sont bien transformées dans `moderation_entries`
4. ✅ Tout est prêt pour votre dashboard

---

## 🔍 VÉRIFICATION 1 : Les Triggers sont-ils Actifs ?

### Commande à exécuter :

```bash
sudo -u postgres psql -d dsa << 'SQL'
SELECT 
    trigger_name,
    event_manipulation AS event,
    action_timing AS timing
FROM information_schema.triggers
WHERE event_object_table = 'dsa_decisions';
SQL
```

### Résultat attendu :

Vous devriez voir **2 triggers** :
- `trigger_sync_dsa_decision_insert` (AFTER INSERT)
- `trigger_sync_dsa_decision_update` (AFTER UPDATE)

**Si vous voyez ces 2 triggers → ✅ Les triggers sont actifs !**

---

## 🧪 VÉRIFICATION 2 : Test de Synchronisation Automatique

### Test Complet :

```bash
sudo -u postgres psql -d dsa << 'SQL'
-- 1. Compter AVANT
SELECT COUNT(*) AS count_before FROM moderation_entries;

-- 2. Insérer une ligne de test dans dsa_decisions
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
    'Test Sync Auto',
    'Test Category',
    'DECISION_GROUND_INCOMPATIBLE_CONTENT',
    CURRENT_DATE,
    '["FR"]'::jsonb,
    true,
    'FULLY',
    'DISABLED'
);

-- 3. Attendre 1 seconde
SELECT pg_sleep(1);

-- 4. Compter APRÈS
SELECT COUNT(*) AS count_after FROM moderation_entries;

-- 5. Vérifier que la ligne est dans moderation_entries
SELECT 
    m.id,
    p.name AS platform,
    dt.name AS decision_type,
    m.automated_detection,
    m.automated_decision,
    m.country_code
FROM moderation_entries m
JOIN platforms p ON m.platform_id = p.id
JOIN decision_types dt ON m.decision_type_id = dt.id
WHERE p.name = 'Test Sync Auto';

-- 6. Nettoyer
DELETE FROM dsa_decisions WHERE platform_name = 'Test Sync Auto';
SQL
```

### Résultat attendu :

- ✅ `count_after` = `count_before + 1`
- ✅ La ligne apparaît dans `moderation_entries` avec données transformées
- ✅ `decision_type` = "Visibility Restriction" (calculé automatiquement)
- ✅ `country_code` = "FR" (extrait de territorial_scope)
- ✅ `automated_decision` = `true` (transformé depuis 'FULLY')

**Si tout ça fonctionne → ✅ La synchronisation automatique fonctionne !**

---

## 📊 VÉRIFICATION 3 : Les Données sont-elles Bien Transformées ?

### Vérifier les Transformations :

```bash
sudo -u postgres psql -d dsa << 'SQL'
-- 1. Vérifier que decision_type est calculé
SELECT 
    dt.name AS decision_type,
    COUNT(*) AS count,
    ROUND(100.0 * COUNT(*) / (SELECT COUNT(*) FROM moderation_entries), 2) AS percentage
FROM moderation_entries m
JOIN decision_types dt ON m.decision_type_id = dt.id
GROUP BY dt.name
ORDER BY count DESC;

-- 2. Vérifier que delay_days est calculé
SELECT 
    CASE 
        WHEN delay_days IS NULL THEN 'NULL'
        WHEN delay_days <= 30 THEN '0-30 jours'
        WHEN delay_days <= 90 THEN '31-90 jours'
        ELSE 'Plus de 90 jours'
    END AS delay_range,
    COUNT(*) AS count
FROM moderation_entries
GROUP BY 
    CASE 
        WHEN delay_days IS NULL THEN 'NULL'
        WHEN delay_days <= 30 THEN '0-30 jours'
        WHEN delay_days <= 90 THEN '31-90 jours'
        ELSE 'Plus de 90 jours'
    END
ORDER BY count DESC;

-- 3. Vérifier que country_code est extrait
SELECT 
    country_code,
    COUNT(*) AS count
FROM moderation_entries
WHERE country_code IS NOT NULL
GROUP BY country_code
ORDER BY count DESC
LIMIT 10;

-- 4. Vérifier automated_decision (doit être boolean)
SELECT 
    CASE 
        WHEN automated_decision IS NULL THEN 'NULL'
        WHEN automated_decision = TRUE THEN 'TRUE (Fully Automated)'
        WHEN automated_decision = FALSE THEN 'FALSE (Not Automated)'
    END AS automated_status,
    COUNT(*) AS count
FROM moderation_entries
GROUP BY automated_decision
ORDER BY count DESC;
SQL
```

### Résultats attendus :

- ✅ `decision_type` : Distribution de "Visibility Restriction", "Removal", etc.
- ✅ `delay_days` : Valeurs calculées (pas tous NULL)
- ✅ `country_code` : Codes pays extraits (FR, DE, etc.)
- ✅ `automated_decision` : TRUE/FALSE/NULL (pas de texte)

**Si tout ça est correct → ✅ Les données sont bien transformées !**

---

## 🔍 VÉRIFICATION 4 : Intégrité des Données

### Vérifier qu'il n'y a pas de lignes manquantes :

```bash
sudo -u postgres psql -d dsa << 'SQL'
-- Vérifier qu'il n'y a pas de lignes dans dsa_decisions sans correspondance
SELECT 
    COUNT(*) AS missing_rows
FROM dsa_decisions d
LEFT JOIN moderation_entries m ON m.id = d.uuid::TEXT
WHERE m.id IS NULL;

-- Vérifier les dates disponibles
SELECT 
    MIN(application_date) AS min_date,
    MAX(application_date) AS max_date,
    COUNT(DISTINCT application_date) AS unique_dates
FROM moderation_entries;
SQL
```

### Résultat attendu :

- ✅ `missing_rows` = 0 (toutes les lignes sont synchronisées)
- ✅ Dates cohérentes (du 2024-06-07 au 2025-11-25)

---

## 🚀 SCRIPT DE VÉRIFICATION COMPLÈTE

J'ai créé un script SQL complet qui fait toutes les vérifications d'un coup :

### Utilisation :

```bash
# Copier le script sur la VM
scp database/verify_setup.sql raouf@34.46.198.22:~/

# Sur la VM, exécuter
sudo -u postgres psql -d dsa < ~/verify_setup.sql
```

Ce script vérifie :
- ✅ Toutes les tables
- ✅ Les triggers
- ✅ Test de synchronisation automatique
- ✅ Les données transformées
- ✅ L'intégrité des données
- ✅ Les statistiques générales

---

## 📋 CHECKLIST FINALE

- [ ] **Triggers actifs** : 2 triggers visibles sur `dsa_decisions`
- [ ] **Synchronisation automatique** : Test réussi (ligne ajoutée automatiquement)
- [ ] **Données transformées** : decision_type, delay_days, country_code calculés
- [ ] **Intégrité** : Pas de lignes manquantes
- [ ] **Statistiques** : Données cohérentes

---

## ✅ Si Tout est Vert

**Félicitations !** Votre configuration est complète :

✅ **Triggers actifs** → Synchronisation automatique fonctionnelle  
✅ **Données migrées** → 399,995 lignes dans `moderation_entries`  
✅ **Données transformées** → Prêtes pour votre dashboard  
✅ **Synchronisation future** → Votre collègue peut continuer à ajouter des données  

**Vous pouvez maintenant connecter votre dashboard React à PostgreSQL !** 🎉

