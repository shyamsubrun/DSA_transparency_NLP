#!/bin/bash
# Script complet de test de synchronisation

echo "=========================================="
echo "🧪 TEST COMPLET DE SYNCHRONISATION"
echo "=========================================="
echo ""

DB_NAME="dsa"
DB_USER="postgres"

# 1. Vérifier les triggers
echo "1. Vérification des triggers..."
sudo -u postgres psql -d "$DB_NAME" << 'SQL'
SELECT 
    trigger_name,
    event_manipulation,
    action_timing
FROM information_schema.triggers
WHERE event_object_table = 'dsa_decisions';
SQL

echo ""
echo "2. Compter les lignes AVANT insertion..."
BEFORE_COUNT=$(sudo -u postgres psql -d "$DB_NAME" -tAc "SELECT COUNT(*) FROM moderation_entries;")
echo "Lignes avant: $BEFORE_COUNT"

echo ""
echo "3. Insérer une ligne de test dans dsa_decisions..."
sudo -u postgres psql -d "$DB_NAME" << 'SQL'
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
    'Test Sync Complete',
    'Test Category Complete',
    'DECISION_GROUND_INCOMPATIBLE_CONTENT',
    CURRENT_DATE,
    '["FR"]'::jsonb,
    true,
    'FULLY',
    'DISABLED'
);
SQL

echo "Attente 2 secondes pour que le trigger s'exécute..."
sleep 2

echo ""
echo "4. Compter les lignes APRÈS insertion..."
AFTER_COUNT=$(sudo -u postgres psql -d "$DB_NAME" -tAc "SELECT COUNT(*) FROM moderation_entries;")
echo "Lignes après: $AFTER_COUNT"

echo ""
echo "5. Vérifier que la ligne est synchronisée..."
sudo -u postgres psql -d "$DB_NAME" << 'SQL'
SELECT 
    m.id,
    p.name AS platform,
    c.name AS category,
    dt.name AS decision_type,
    m.application_date,
    m.automated_detection,
    m.automated_decision,
    m.country_code
FROM moderation_entries m
JOIN platforms p ON m.platform_id = p.id
JOIN categories c ON m.category_id = c.id
JOIN decision_types dt ON m.decision_type_id = dt.id
WHERE p.name = 'Test Sync Complete';
SQL

echo ""
echo "6. Résultat du test..."
if [ "$AFTER_COUNT" -gt "$BEFORE_COUNT" ]; then
    echo "✅ SUCCÈS: La synchronisation automatique fonctionne !"
    echo "   Ligne ajoutée: $((AFTER_COUNT - BEFORE_COUNT))"
else
    echo "❌ ÉCHEC: La synchronisation automatique ne fonctionne pas"
    echo "   Avant: $BEFORE_COUNT | Après: $AFTER_COUNT"
fi

echo ""
echo "7. Nettoyage..."
sudo -u postgres psql -d "$DB_NAME" << 'SQL'
DELETE FROM dsa_decisions WHERE platform_name = 'Test Sync Complete';
SQL

echo ""
echo "=========================================="
echo "✅ Test terminé"
echo "=========================================="

