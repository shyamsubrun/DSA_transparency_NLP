-- ============================================
-- CORRECTION DE LA FONCTION DE MIGRATION
-- Le problème vient de l'utilisation du trigger dans la boucle
-- ============================================

-- Supprimer l'ancienne fonction
DROP FUNCTION IF EXISTS sync_all_dsa_decisions();

-- Créer une nouvelle fonction de migration qui fait la synchronisation directement
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
    v_record RECORD;
    v_platform_id SMALLINT;
    v_category_id SMALLINT;
    v_decision_type_id SMALLINT;
    v_decision_ground_id SMALLINT;
    v_content_type_id SMALLINT;
    v_decision_type TEXT;
    v_content_type TEXT;
    v_automated_decision BOOLEAN;
    v_country CHAR(2);
    v_language VARCHAR(10);
    v_delay_days INTEGER;
    v_incompatible_ground TEXT;
BEGIN
    FOR v_record IN 
        SELECT * FROM dsa_decisions
    LOOP
        BEGIN
            -- Calculer decision_type
            v_decision_type := map_decision_type(
                v_record.decision_visibility,
                v_record.decision_account,
                v_record.decision_monetary
            );
            
            -- Parser content_type
            v_content_type := parse_content_type(v_record.content_type);
            
            -- Parser automated_decision
            v_automated_decision := parse_automated_decision(v_record.automated_decision);
            
            -- Extraire country
            v_country := extract_country(v_record.territorial_scope);
            
            -- Language
            IF v_record.content_language IS NULL OR v_record.content_language = '' OR v_record.content_language = 'NaN' THEN
                v_language := 'unknown';
            ELSE
                v_language := v_record.content_language;
            END IF;
            
            -- Calculer delay_days
            v_delay_days := calculate_delay_days(v_record.content_date, v_record.application_date);
            
            -- Incompatible content ground
            IF v_record.incompatible_content_ground IS NULL OR v_record.incompatible_content_ground = '' OR v_record.incompatible_content_ground = 'NaN' THEN
                v_incompatible_ground := NULL;
            ELSE
                v_incompatible_ground := v_record.incompatible_content_ground;
            END IF;
            
            -- Insérer/Récupérer IDs des tables de référence
            INSERT INTO platforms (name) VALUES (v_record.platform_name)
            ON CONFLICT (name) DO NOTHING;
            SELECT id INTO v_platform_id FROM platforms WHERE name = v_record.platform_name;
            
            INSERT INTO categories (name) VALUES (v_record.category)
            ON CONFLICT (name) DO NOTHING;
            SELECT id INTO v_category_id FROM categories WHERE name = v_record.category;
            
            INSERT INTO decision_types (name) VALUES (v_decision_type)
            ON CONFLICT (name) DO NOTHING;
            SELECT id INTO v_decision_type_id FROM decision_types WHERE name = v_decision_type;
            
            INSERT INTO decision_grounds (name) VALUES (v_record.decision_ground)
            ON CONFLICT (name) DO NOTHING;
            SELECT id INTO v_decision_ground_id FROM decision_grounds WHERE name = v_record.decision_ground;
            
            IF v_content_type != 'Other' THEN
                INSERT INTO content_types (name) VALUES (v_content_type)
                ON CONFLICT (name) DO NOTHING;
                SELECT id INTO v_content_type_id FROM content_types WHERE name = v_content_type;
            END IF;
            
            -- Vérifier si la ligne existe déjà
            IF EXISTS (SELECT 1 FROM moderation_entries WHERE id = v_record.uuid::TEXT) THEN
                -- Mettre à jour
                UPDATE moderation_entries SET
                    application_date = v_record.application_date,
                    content_date = v_record.content_date,
                    platform_id = v_platform_id,
                    category_id = v_category_id,
                    decision_type_id = v_decision_type_id,
                    decision_ground_id = v_decision_ground_id,
                    incompatible_content_ground = v_incompatible_ground,
                    content_type_id = v_content_type_id,
                    automated_detection = v_record.automated_detection,
                    automated_decision = v_automated_decision,
                    country_code = v_country,
                    territorial_scope = v_record.territorial_scope,
                    language = v_language,
                    delay_days = v_delay_days
                WHERE id = v_record.uuid::TEXT;
                v_updated := v_updated + 1;
            ELSE
                -- Insérer
                INSERT INTO moderation_entries (
                    id, application_date, content_date, platform_id, category_id,
                    decision_type_id, decision_ground_id, incompatible_content_ground,
                    content_type_id, automated_detection, automated_decision,
                    country_code, territorial_scope, language, delay_days
                ) VALUES (
                    v_record.uuid::TEXT,
                    v_record.application_date,
                    v_record.content_date,
                    v_platform_id,
                    v_category_id,
                    v_decision_type_id,
                    v_decision_ground_id,
                    v_incompatible_ground,
                    v_content_type_id,
                    v_record.automated_detection,
                    v_automated_decision,
                    v_country,
                    v_record.territorial_scope,
                    v_language,
                    v_delay_days
                );
                v_inserted := v_inserted + 1;
            END IF;
            
        EXCEPTION WHEN OTHERS THEN
            v_errors := v_errors + 1;
            -- Log l'erreur seulement pour les 10 premières
            IF v_errors <= 10 THEN
                RAISE WARNING 'Erreur sur UUID %: %', v_record.uuid, SQLERRM;
            END IF;
        END;
    END LOOP;
    
    RETURN QUERY SELECT v_inserted, v_updated, v_errors;
END;
$$ LANGUAGE plpgsql;

COMMENT ON FUNCTION sync_all_dsa_decisions() IS 
'Synchronise toutes les données de dsa_decisions vers moderation_entries (version corrigée)';

