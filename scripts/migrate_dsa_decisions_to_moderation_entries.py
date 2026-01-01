#!/usr/bin/env python3
"""
Migre les données de dsa_decisions vers moderation_entries optimisée.
- Transforme les données
- Normalise dans tables de référence
- Calcule les champs manquants
"""

import psycopg2
from psycopg2.extras import execute_values
from dotenv import load_dotenv
import os
import json
from typing import Dict, Optional
from tqdm import tqdm

load_dotenv()

def get_db_connection():
    """Crée connexion PostgreSQL"""
    return psycopg2.connect(
        host=os.getenv('DB_HOST', 'localhost'),
        port=os.getenv('DB_PORT', '5432'),
        database=os.getenv('DB_NAME', 'dsa'),
        user=os.getenv('DB_USER', 'postgres'),
        password=os.getenv('DB_PASSWORD', '')
    )

def map_decision_type(decision_visibility: Optional[str], decision_account: Optional[str], decision_monetary: Optional[str]) -> str:
    """Mappe vers decision_type"""
    if decision_account and decision_account != 'NaN' and decision_account != '':
        if 'TERMINATED' in decision_account.upper() or 'SUSPENDED' in decision_account.upper():
            return 'Account Suspension'
    
    if decision_visibility and decision_visibility != 'NaN' and decision_visibility != '':
        vis_upper = decision_visibility.upper()
        if 'REMOVED' in vis_upper:
            return 'Removal'
        elif 'DISABLED' in vis_upper or 'RESTRICTED' in vis_upper:
            return 'Visibility Restriction'
    
    if decision_monetary and decision_monetary != 'NaN' and decision_monetary != '':
        return 'Demonetization'
    
    return 'Warning Label'

def parse_content_type(content_type: Optional[str]) -> str:
    """Parse content_type"""
    if not content_type or content_type == 'NaN' or content_type == '':
        return 'Other'
    
    ct_upper = content_type.upper()
    if 'PRODUCT' in ct_upper:
        return 'Product'
    elif 'TEXT' in ct_upper:
        return 'Text'
    elif 'IMAGE' in ct_upper:
        return 'Image'
    elif 'VIDEO' in ct_upper:
        return 'Video'
    elif 'AUDIO' in ct_upper:
        return 'Audio'
    elif 'LIVE' in ct_upper or 'STREAM' in ct_upper:
        return 'Live Stream'
    elif 'STORY' in ct_upper or 'REEL' in ct_upper:
        return 'Story/Reel'
    
    return 'Other'

def parse_automated_decision(automated_decision: Optional[str]) -> Optional[bool]:
    """Parse automated_decision"""
    if not automated_decision or automated_decision == 'NaN' or automated_decision == '':
        return None
    
    ad_upper = automated_decision.upper()
    if 'FULLY' in ad_upper:
        return True
    elif 'NOT' in ad_upper:
        return False
    
    return None

def extract_country(territorial_scope_json) -> Optional[str]:
    """Extrait le premier pays"""
    if not territorial_scope_json:
        return None
    
    try:
        if isinstance(territorial_scope_json, str):
            scope = json.loads(territorial_scope_json)
        else:
            scope = territorial_scope_json
        
        if isinstance(scope, list) and len(scope) > 0:
            return scope[0]
    except:
        pass
    
    return None

def calculate_delay_days(content_date, application_date) -> Optional[int]:
    """Calcule delay_days"""
    if not content_date or not application_date:
        return None
    
    try:
        from datetime import datetime
        if isinstance(content_date, str):
            content = datetime.strptime(content_date.split()[0], '%Y-%m-%d')
        else:
            content = content_date
        
        if isinstance(application_date, str):
            application = datetime.strptime(application_date.split()[0], '%Y-%m-%d')
        else:
            application = application_date
        
        delay = (application - content).days
        
        if delay < 0 or delay > 3650:
            return None
        
        return delay
    except:
        return None

def load_reference_tables(conn):
    """Charge les tables de référence"""
    with conn.cursor() as cur:
        cur.execute("SELECT id, name FROM platforms")
        platform_map = {name: id for id, name in cur.fetchall()}
        
        cur.execute("SELECT id, name FROM categories")
        category_map = {name: id for id, name in cur.fetchall()}
        
        cur.execute("SELECT id, name FROM decision_types")
        decision_type_map = {name: id for id, name in cur.fetchall()}
        
        cur.execute("SELECT id, name FROM decision_grounds")
        decision_ground_map = {name: id for id, name in cur.fetchall()}
        
        cur.execute("SELECT id, name FROM content_types")
        content_type_map = {name: id for id, name in cur.fetchall()}
    
    return {
        'platforms': platform_map,
        'categories': category_map,
        'decision_types': decision_type_map,
        'decision_grounds': decision_ground_map,
        'content_types': content_type_map
    }

def insert_reference_value(conn, table: str, name: str, mappings: Dict):
    """Insère valeur dans table de référence"""
    if name in mappings[table]:
        return mappings[table][name]
    
    with conn.cursor() as cur:
        cur.execute(f"INSERT INTO {table} (name) VALUES (%s) ON CONFLICT (name) DO NOTHING RETURNING id", (name,))
        result = cur.fetchone()
        if result:
            mappings[table][name] = result[0]
            conn.commit()
            return result[0]
        else:
            cur.execute(f"SELECT id FROM {table} WHERE name = %s", (name,))
            result = cur.fetchone()
            if result:
                mappings[table][name] = result[0]
                return result[0]
    
    return None

def migrate_data(conn, batch_size: int = 1000):
    """Migre les données de dsa_decisions vers moderation_entries"""
    print("📊 Chargement des tables de référence...")
    mappings = load_reference_tables(conn)
    
    print(f"  • Platforms: {len(mappings['platforms'])}")
    print(f"  • Categories: {len(mappings['categories'])}")
    print(f"  • Decision types: {len(mappings['decision_types'])}")
    print(f"  • Decision grounds: {len(mappings['decision_grounds'])}")
    print(f"  • Content types: {len(mappings['content_types'])}")
    
    # Compter lignes à migrer
    with conn.cursor() as cur:
        cur.execute("SELECT COUNT(*) FROM dsa_decisions")
        total_rows = cur.fetchone()[0]
    
    print(f"\n📦 Migration de {total_rows:,} lignes...")
    
    # Lire par batches
    offset = 0
    total_inserted = 0
    total_skipped = 0
    
    insert_query = """
        INSERT INTO moderation_entries (
            id, application_date, content_date, platform_id, category_id,
            decision_type_id, decision_ground_id, incompatible_content_ground,
            content_type_id, automated_detection, automated_decision,
            country_code, territorial_scope, language, delay_days
        ) VALUES %s
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
            delay_days = EXCLUDED.delay_days
    """
    
    with tqdm(total=total_rows, desc="Migrating") as pbar:
        while offset < total_rows:
            # Lire batch
            with conn.cursor() as cur:
                cur.execute("""
                    SELECT 
                        uuid::TEXT,
                        application_date,
                        content_date,
                        platform_name,
                        category,
                        decision_visibility,
                        decision_account,
                        decision_monetary,
                        decision_ground,
                        incompatible_content_ground,
                        content_type,
                        automated_detection,
                        automated_decision,
                        territorial_scope,
                        content_language
                    FROM dsa_decisions
                    ORDER BY uuid
                    LIMIT %s OFFSET %s
                """, (batch_size, offset))
                
                rows = cur.fetchall()
            
            if not rows:
                break
            
            # Transformer chaque ligne
            rows_to_insert = []
            for row in rows:
                try:
                    uuid, app_date, content_date, platform_name, category, \
                    decision_vis, decision_acc, decision_mon, decision_ground, \
                    incompatible_ground, content_type, auto_detection, auto_decision, \
                    territorial_scope, content_lang = row
                    
                    # Insérer valeurs de référence
                    platform_id = insert_reference_value(conn, 'platforms', platform_name, mappings)
                    category_id = insert_reference_value(conn, 'categories', category, mappings)
                    decision_type = map_decision_type(decision_vis, decision_acc, decision_mon)
                    decision_type_id = insert_reference_value(conn, 'decision_types', decision_type, mappings)
                    decision_ground_id = insert_reference_value(conn, 'decision_grounds', decision_ground, mappings)
                    
                    content_type_parsed = parse_content_type(content_type)
                    content_type_id = None
                    if content_type_parsed != 'Other':
                        content_type_id = insert_reference_value(conn, 'content_types', content_type_parsed, mappings)
                    
                    # Transformer automated_decision
                    automated_decision_bool = parse_automated_decision(auto_decision)
                    
                    # Extraire country
                    country = extract_country(territorial_scope)
                    
                    # Territorial scope JSONB
                    territorial_scope_json = None
                    if territorial_scope:
                        if isinstance(territorial_scope, str):
                            territorial_scope_json = territorial_scope
                        else:
                            territorial_scope_json = json.dumps(territorial_scope) if territorial_scope else None
                    
                    # Language
                    language = content_lang if content_lang and content_lang != 'NaN' else 'unknown'
                    
                    # Delay days
                    delay_days = calculate_delay_days(content_date, app_date)
                    
                    # Incompatible content ground
                    incompatible_ground_clean = None
                    if incompatible_ground and incompatible_ground != 'NaN' and incompatible_ground != '':
                        incompatible_ground_clean = incompatible_ground
                    
                    rows_to_insert.append((
                        uuid,
                        app_date,
                        content_date,
                        platform_id,
                        category_id,
                        decision_type_id,
                        decision_ground_id,
                        incompatible_ground_clean,
                        content_type_id,
                        auto_detection,
                        automated_decision_bool,
                        country,
                        territorial_scope_json,
                        language,
                        delay_days
                    ))
                except Exception as e:
                    print(f"⚠️ Erreur sur ligne: {e}")
                    total_skipped += 1
                    continue
            
            # Insérer batch
            if rows_to_insert:
                with conn.cursor() as cur:
                    try:
                        execute_values(cur, insert_query, rows_to_insert, page_size=batch_size)
                        conn.commit()
                        total_inserted += len(rows_to_insert)
                    except Exception as e:
                        conn.rollback()
                        print(f"❌ Erreur batch: {e}")
                        total_skipped += len(rows_to_insert)
            
            offset += batch_size
            pbar.update(len(rows))
    
    print(f"\n✅ Migration terminée:")
    print(f"  • Total inséré: {total_inserted:,} lignes")
    print(f"  • Total ignoré: {total_skipped:,} lignes")
    
    # Rafraîchir vues matérialisées
    print("\n🔄 Rafraîchissement des vues matérialisées...")
    with conn.cursor() as cur:
        cur.execute("SELECT refresh_materialized_views()")
        conn.commit()
    print("✅ Vues matérialisées rafraîchies")

if __name__ == "__main__":
    print("🚀 Migration dsa_decisions → moderation_entries")
    print("=" * 60)
    
    conn = get_db_connection()
    print("✅ Connecté à PostgreSQL")
    
    try:
        migrate_data(conn)
    finally:
        conn.close()
        print("\n🔌 Connexion fermée")

