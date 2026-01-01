#!/usr/bin/env python3
"""
Importe les fichiers CSV transformés dans PostgreSQL.
- Charge les tables de référence
- Importe les données principales
- Gère les conflits (ON CONFLICT)
"""

import pandas as pd
import psycopg2
from psycopg2.extras import execute_batch, execute_values
from pathlib import Path
import argparse
from tqdm import tqdm
from dotenv import load_dotenv
import os
from typing import Dict, Set
import json

# Charger variables d'environnement
load_dotenv()

def get_db_connection():
    """Crée connexion PostgreSQL"""
    return psycopg2.connect(
        host=os.getenv('DB_HOST', 'localhost'),
        port=os.getenv('DB_PORT', '5432'),
        database=os.getenv('DB_NAME', 'dsa_dashboard'),
        user=os.getenv('DB_USER', 'postgres'),
        password=os.getenv('DB_PASSWORD', '')
    )

def load_reference_tables(conn):
    """Charge les tables de référence et retourne mappings"""
    with conn.cursor() as cur:
        # Platforms
        cur.execute("SELECT id, name FROM platforms")
        platform_map = {name: id for id, name in cur.fetchall()}
        
        # Categories
        cur.execute("SELECT id, name FROM categories")
        category_map = {name: id for id, name in cur.fetchall()}
        
        # Decision types
        cur.execute("SELECT id, name FROM decision_types")
        decision_type_map = {name: id for id, name in cur.fetchall()}
        
        # Decision grounds
        cur.execute("SELECT id, name FROM decision_grounds")
        decision_ground_map = {name: id for id, name in cur.fetchall()}
        
        # Content types
        cur.execute("SELECT id, name FROM content_types")
        content_type_map = {name: id for id, name in cur.fetchall()}
    
    return {
        'platforms': platform_map,
        'categories': category_map,
        'decision_types': decision_type_map,
        'decision_grounds': decision_ground_map,
        'content_types': content_type_map
    }

def insert_reference_value(conn, table: str, name: str, mappings: Dict[str, Dict[str, int]]):
    """Insère une valeur dans une table de référence si elle n'existe pas"""
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
            # Récupérer l'ID existant
            cur.execute(f"SELECT id FROM {table} WHERE name = %s", (name,))
            result = cur.fetchone()
            if result:
                mappings[table][name] = result[0]
                return result[0]
    
    return None

def prepare_row_for_insert(row: pd.Series, mappings: Dict, conn):
    """Prépare une ligne pour insertion dans PostgreSQL"""
    # Insérer valeurs de référence si nécessaire
    platform_id = insert_reference_value(conn, 'platforms', row['platform_name'], mappings)
    category_id = insert_reference_value(conn, 'categories', row['category'], mappings)
    decision_type_id = insert_reference_value(conn, 'decision_types', row['decision_type'], mappings)
    decision_ground_id = insert_reference_value(conn, 'decision_grounds', row['decision_ground'], mappings)
    
    content_type_id = None
    if pd.notna(row.get('content_type')) and row['content_type'] != 'Other':
        content_type_id = insert_reference_value(conn, 'content_types', row['content_type'], mappings)
    
    # Convertir territorial_scope en JSONB
    territorial_scope_json = None
    if pd.notna(row.get('territorial_scope')) and isinstance(row['territorial_scope'], list):
        territorial_scope_json = json.dumps(row['territorial_scope'])
    
    return (
        row['id'],
        row['application_date'] if pd.notna(row['application_date']) else None,
        row['content_date'] if pd.notna(row['content_date']) else None,
        platform_id,
        category_id,
        decision_type_id,
        decision_ground_id,
        row.get('incompatible_content_ground') if pd.notna(row.get('incompatible_content_ground')) else None,
        content_type_id,
        row.get('automated_detection'),
        row.get('automated_decision'),
        row.get('country') if pd.notna(row.get('country')) and row['country'] != 'Unknown' else None,
        territorial_scope_json,
        row.get('language') if pd.notna(row.get('language')) else None,
        row.get('delay_days')
    )

def import_csv_file(conn, csv_path: Path, mappings: Dict, batch_size: int = 1000):
    """Importe un fichier CSV dans PostgreSQL"""
    print(f"  📄 Importing {csv_path.name}...")
    
    # Lire CSV par chunks
    chunk_size = 10000
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
    
    for chunk in pd.read_csv(csv_path, chunksize=chunk_size, low_memory=False):
        # Préparer données
        rows_to_insert = []
        for _, row in chunk.iterrows():
            try:
                prepared_row = prepare_row_for_insert(row, mappings, conn)
                rows_to_insert.append(prepared_row)
            except Exception as e:
                print(f"    ⚠️ Erreur sur ligne: {e}")
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
                    print(f"    ❌ Erreur batch: {e}")
                    total_skipped += len(rows_to_insert)
    
    print(f"    ✅ Inserted: {total_inserted:,} | Skipped: {total_skipped:,}")
    return total_inserted, total_skipped

def import_directory(conn, csv_dir: Path):
    """Importe tous les CSV dans un répertoire"""
    csv_files = list(csv_dir.rglob("*.csv"))
    
    if not csv_files:
        print(f"❌ Aucun fichier CSV trouvé dans {csv_dir}")
        return
    
    print(f"📁 Trouvé {len(csv_files)} fichiers CSV à importer")
    
    # Charger mappings de référence
    print("\n📊 Chargement des tables de référence...")
    mappings = load_reference_tables(conn)
    print(f"  • Platforms: {len(mappings['platforms'])}")
    print(f"  • Categories: {len(mappings['categories'])}")
    print(f"  • Decision types: {len(mappings['decision_types'])}")
    print(f"  • Decision grounds: {len(mappings['decision_grounds'])}")
    print(f"  • Content types: {len(mappings['content_types'])}")
    
    total_inserted = 0
    total_skipped = 0
    
    # Importer chaque fichier
    for csv_file in tqdm(csv_files, desc="Importing files"):
        try:
            inserted, skipped = import_csv_file(conn, csv_file, mappings)
            total_inserted += inserted
            total_skipped += skipped
        except Exception as e:
            print(f"❌ Erreur sur {csv_file.name}: {e}")
    
    print(f"\n✅ Import terminé:")
    print(f"  • Total inséré: {total_inserted:,} lignes")
    print(f"  • Total ignoré: {total_skipped:,} lignes")
    
    # Rafraîchir vues matérialisées
    print("\n🔄 Rafraîchissement des vues matérialisées...")
    with conn.cursor() as cur:
        cur.execute("SELECT refresh_materialized_views()")
        conn.commit()
    print("✅ Vues matérialisées rafraîchies")

if __name__ == "__main__":
    parser = argparse.ArgumentParser(description='Importe les CSV transformés dans PostgreSQL')
    parser.add_argument('--input-dir', required=True, help='Répertoire contenant les CSV transformés')
    args = parser.parse_args()
    
    input_dir = Path(args.input_dir)
    if not input_dir.exists():
        print(f"❌ Répertoire introuvable: {input_dir}")
        exit(1)
    
    # Connexion DB
    print("🔌 Connexion à PostgreSQL...")
    conn = get_db_connection()
    print("✅ Connecté")
    
    try:
        import_directory(conn, input_dir)
    finally:
        conn.close()
        print("\n🔌 Connexion fermée")


