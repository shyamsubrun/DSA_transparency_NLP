-- ============================================
-- SYSTÈME DE SYNCHRONISATION AUTOMATIQUE
-- Synchronise automatiquement dsa_decisions → moderation_entries
-- ============================================

-- Fonction de synchronisation d'une ligne (helper)
CREATE OR REPLACE FUNCTION sync_dsa_decision_row(p_row dsa_decisions)
RETURNS void AS $$
DECLARE
    v_platform_id INTEGER;
    v_category_id INTEGER;
    v_decision_type_id INTEGER;
    v_decision_ground_id INTEGER;
    v_content_type_id INTEGER;
    v_decision_type TEXT;
    v_content_type TEXT;
    v_automated_decision BOOLEAN;
    v_country CHAR(2);
    v_language VARCHAR(10);
    v_delay_days INTEGER;
    v_incompatible_ground TEXT;
BEGIN
    v_content_type_id := NULL;

    -- Calculer decision_type
    v_decision_type := map_decision_type(
        p_row.decision_visibility,
        p_row.decision_account,
        p_row.decision_monetary
    );
    
    -- Parser content_type
    v_content_type := parse_content_type(p_row.content_type);
    
    -- Parser automated_decision
    v_automated_decision := parse_automated_decision(p_row.automated_decision);
    
    -- Extraire country
    v_country := extract_country(p_row.territorial_scope);
    
    -- Language
    IF p_row.content_language IS NULL OR p_row.content_language = '' OR p_row.content_language = 'NaN' THEN
        v_language := 'unknown';
    ELSE
        v_language := p_row.content_language;
    END IF;
    
    -- Calculer delay_days
    v_delay_days := calculate_delay_days(p_row.content_date, p_row.application_date);
    
    -- Incompatible content ground
    IF p_row.incompatible_content_ground IS NULL OR p_row.incompatible_content_ground = '' OR p_row.incompatible_content_ground = 'NaN' THEN
        v_incompatible_ground := NULL;
    ELSE
        v_incompatible_ground := p_row.incompatible_content_ground;
    END IF;
    
    -- Insérer/Récupérer IDs des tables de référence
    INSERT INTO platforms (name) VALUES (p_row.platform_name)
    ON CONFLICT (name) DO NOTHING;
    SELECT id INTO v_platform_id FROM platforms WHERE name = p_row.platform_name;
    
    INSERT INTO categories (name) VALUES (p_row.category)
    ON CONFLICT (name) DO NOTHING;
    SELECT id INTO v_category_id FROM categories WHERE name = p_row.category;
    
    INSERT INTO decision_types (name) VALUES (v_decision_type)
    ON CONFLICT (name) DO NOTHING;
    SELECT id INTO v_decision_type_id FROM decision_types WHERE name = v_decision_type;
    
    INSERT INTO decision_grounds (name) VALUES (p_row.decision_ground)
    ON CONFLICT (name) DO NOTHING;
    SELECT id INTO v_decision_ground_id FROM decision_grounds WHERE name = p_row.decision_ground;
    
    IF v_content_type != 'Other' THEN
        INSERT INTO content_types (name) VALUES (v_content_type)
        ON CONFLICT (name) DO NOTHING;
        SELECT id INTO v_content_type_id FROM content_types WHERE name = v_content_type;
    END IF;
    
    -- Insérer ou mettre à jour dans moderation_entries
    INSERT INTO moderation_entries (
        id, application_date, content_date, platform_id, category_id,
        decision_type_id, decision_ground_id, incompatible_content_ground,
        content_type_id, automated_detection, automated_decision,
        country_code, territorial_scope, language, delay_days
    ) VALUES (
        p_row.uuid::TEXT,
        p_row.application_date,
        p_row.content_date,
        v_platform_id,
        v_category_id,
        v_decision_type_id,
        v_decision_ground_id,
        v_incompatible_ground,
        v_content_type_id,
        p_row.automated_detection,
        v_automated_decision,
        v_country,
        p_row.territorial_scope,
        v_language,
        v_delay_days
    )
    ON CONFLICT (id) DO UPDATE SET
        application_date = EXCLUDED.application_date,
        content_date = EXCLUDED.content_date,
        platform_id = EXCLUDED.platform_id,
        category_id = EXCLUDED.category_id,
        decision_type_id = EXCLUDED.decision_type_id,
        decision_ground_id = EXCLUDED.decision_ground_id,
        incompatible_content_ground = EXCLUDED.incompatible_content_ground,
        content_type_id = EXCLUDED.content_type_id,
        automated_detection = EXCLUDED.automated_detection,
        automated_decision = EXCLUDED.automated_decision,
        country_code = EXCLUDED.country_code,
        territorial_scope = EXCLUDED.territorial_scope,
        language = EXCLUDED.language,
        delay_days = EXCLUDED.delay_days;
END;
$$ LANGUAGE plpgsql;

-- Trigger wrapper
CREATE OR REPLACE FUNCTION sync_dsa_decision_to_moderation_entry()
RETURNS TRIGGER AS $$
BEGIN
    PERFORM sync_dsa_decision_row(NEW);
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger après INSERT
DROP TRIGGER IF EXISTS trigger_sync_dsa_decision_insert ON dsa_decisions;
CREATE TRIGGER trigger_sync_dsa_decision_insert
    AFTER INSERT ON dsa_decisions
    FOR EACH ROW
    EXECUTE FUNCTION sync_dsa_decision_to_moderation_entry();

-- Trigger après UPDATE
DROP TRIGGER IF EXISTS trigger_sync_dsa_decision_update ON dsa_decisions;
CREATE TRIGGER trigger_sync_dsa_decision_update
    AFTER UPDATE ON dsa_decisions
    FOR EACH ROW
    WHEN (OLD.* IS DISTINCT FROM NEW.*)
    EXECUTE FUNCTION sync_dsa_decision_to_moderation_entry();

-- Fonction de synchronisation incrémentale (nouvelles données seulement)
CREATE OR REPLACE FUNCTION sync_new_dsa_decisions()
RETURNS TABLE(
    inserted_count BIGINT,
    updated_count BIGINT
) AS $$
DECLARE
    v_inserted BIGINT := 0;
    v_updated BIGINT := 0;
    v_record dsa_decisions%ROWTYPE;
BEGIN
    FOR v_record IN 
        SELECT d.* 
        FROM dsa_decisions d
        LEFT JOIN moderation_entries m ON m.id = d.uuid::TEXT
        WHERE m.id IS NULL
    LOOP
        BEGIN
            PERFORM sync_dsa_decision_row(v_record);
            v_inserted := v_inserted + 1;
        EXCEPTION WHEN OTHERS THEN
            RAISE WARNING 'Erreur sur UUID %: %', v_record.uuid, SQLERRM;
        END;
    END LOOP;
    
    RETURN QUERY SELECT v_inserted, v_updated;
END;
$$ LANGUAGE plpgsql;

-- Fonction pour synchroniser toutes les données (migration initiale)
CREATE OR REPLACE FUNCTION sync_all_dsa_decisions()
RETURNS TABLE(
    inserted_count BIGINT,
    updated_count BIGINT,
    error_count BIGINT
) AS $$
DECLARE
    v_inserted BIGINT := 0;
    v_updated BIGINT := 0;
    v_errors BIGINT := 0;
    v_record dsa_decisions%ROWTYPE;
BEGIN
    FOR v_record IN 
        SELECT * FROM dsa_decisions
    LOOP
        BEGIN
            IF EXISTS (SELECT 1 FROM moderation_entries WHERE id = v_record.uuid::TEXT) THEN
                v_updated := v_updated + 1;
            ELSE
                v_inserted := v_inserted + 1;
            END IF;
            PERFORM sync_dsa_decision_row(v_record);
        EXCEPTION WHEN OTHERS THEN
            v_errors := v_errors + 1;
            RAISE WARNING 'Erreur sur UUID %: %', v_record.uuid, SQLERRM;
        END;
    END LOOP;
    
    RETURN QUERY SELECT v_inserted, v_updated, v_errors;
END;
$$ LANGUAGE plpgsql;

-- Fonction pour synchroniser par date
CREATE OR REPLACE FUNCTION sync_dsa_decisions_by_date(sync_date DATE)
RETURNS TABLE(
    inserted_count BIGINT,
    updated_count BIGINT
) AS $$
DECLARE
    v_inserted BIGINT := 0;
    v_updated BIGINT := 0;
    v_record dsa_decisions%ROWTYPE;
BEGIN
    FOR v_record IN 
        SELECT * FROM dsa_decisions
        WHERE application_date = sync_date
    LOOP
        BEGIN
            IF EXISTS (SELECT 1 FROM moderation_entries WHERE id = v_record.uuid::TEXT) THEN
                v_updated := v_updated + 1;
            ELSE
                v_inserted := v_inserted + 1;
            END IF;
            PERFORM sync_dsa_decision_row(v_record);
        EXCEPTION WHEN OTHERS THEN
            RAISE WARNING 'Erreur sur UUID %: %', v_record.uuid, SQLERRM;
        END;
    END LOOP;
    
    RETURN QUERY SELECT v_inserted, v_updated;
END;
$$ LANGUAGE plpgsql;

COMMENT ON FUNCTION sync_dsa_decision_row(dsa_decisions) IS 
'Synchronise une ligne dsa_decisions vers moderation_entries (helper)';

COMMENT ON FUNCTION sync_dsa_decision_to_moderation_entry() IS 
'Fonction trigger qui appelle sync_dsa_decision_row()';

COMMENT ON FUNCTION sync_all_dsa_decisions() IS 
'Synchronise toutes les données de dsa_decisions vers moderation_entries (pour migration initiale)';

COMMENT ON FUNCTION sync_new_dsa_decisions() IS 
'Synchronise seulement les nouvelles données ou données modifiées (pour synchronisation incrémentale)';

COMMENT ON FUNCTION sync_dsa_decisions_by_date(DATE) IS 
'Synchronise les données d''une date spécifique';

