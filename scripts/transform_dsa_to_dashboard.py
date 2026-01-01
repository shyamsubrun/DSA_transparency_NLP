#!/usr/bin/env python3
"""
Transforme les fichiers CSV DSA vers le format Dashboard optimisé.
- Supprime colonnes inutiles
- Parse colonnes JSON
- Calcule delay_days
- Normalise les valeurs
"""

import pandas as pd
import json
from pathlib import Path
import argparse
from tqdm import tqdm
from typing import Dict, Optional, List

def parse_json_field(value: str) -> List[str]:
    """Parse un champ JSON array"""
    if pd.isna(value) or value == '':
        return []
    try:
        parsed = json.loads(value)
        if isinstance(parsed, list):
            return parsed
        return [parsed]
    except:
        return []

def map_decision_type(row: pd.Series) -> str:
    """Mappe decision_visibility/decision_account vers decision_type"""
    # Vérifier decision_account d'abord
    if pd.notna(row.get('decision_account')) and row['decision_account'] != '':
        account = str(row['decision_account']).upper()
        if 'TERMINATED' in account:
            return 'Account Suspension'
        elif 'SUSPENDED' in account:
            return 'Account Suspension'
    
    # Vérifier decision_visibility
    if pd.notna(row.get('decision_visibility')) and row['decision_visibility'] != '':
        try:
            vis = parse_json_field(row['decision_visibility'])
            vis_str = ' '.join(vis).upper()
            if 'CONTENT_REMOVED' in vis_str:
                return 'Removal'
            elif 'CONTENT_DISABLED' in vis_str:
                return 'Visibility Restriction'
            elif 'CONTENT_INTERACTION_RESTRICTED' in vis_str:
                return 'Visibility Restriction'
        except:
            pass
    
    # Vérifier decision_monetary
    if pd.notna(row.get('decision_monetary')) and row['decision_monetary'] != '':
        return 'Demonetization'
    
    # Default
    return 'Warning Label'

def parse_content_type(content_type_str: Optional[str]) -> str:
    """Parse content_type JSON array vers string simple"""
    if pd.isna(content_type_str) or content_type_str == '':
        return 'Other'
    
    types = parse_json_field(content_type_str)
    if not types:
        return 'Other'
    
    # Mapper les types DSA vers types dashboard
    type_mapping = {
        'CONTENT_TYPE_PRODUCT': 'Product',
        'CONTENT_TYPE_TEXT': 'Text',
        'CONTENT_TYPE_IMAGE': 'Image',
        'CONTENT_TYPE_VIDEO': 'Video',
        'CONTENT_TYPE_AUDIO': 'Audio',
        'CONTENT_TYPE_LIVE_STREAM': 'Live Stream',
        'CONTENT_TYPE_STORY': 'Story/Reel',
        'CONTENT_TYPE_REEL': 'Story/Reel',
    }
    
    for t in types:
        if t in type_mapping:
            return type_mapping[t]
    
    return 'Other'

def parse_automated_detection(value: Optional[str]) -> Optional[bool]:
    """Parse automated_detection Yes/No vers boolean"""
    if pd.isna(value) or value == '':
        return None
    return str(value).upper() == 'YES'

def parse_automated_decision(value: Optional[str]) -> Optional[bool]:
    """Parse automated_decision vers boolean"""
    if pd.isna(value) or value == '':
        return None
    
    value_str = str(value).upper()
    if 'FULLY' in value_str:
        return True
    elif 'NOT_AUTOMATED' in value_str:
        return False
    # PARTIALLY ou autres = None
    return None

def extract_country(territorial_scope_str: Optional[str]) -> Optional[str]:
    """Extrait le premier pays de territorial_scope"""
    if pd.isna(territorial_scope_str) or territorial_scope_str == '':
        return None
    
    scope = parse_json_field(territorial_scope_str)
    if scope and len(scope) > 0:
        return scope[0]  # Premier pays
    
    return None

def calculate_delay_days(row: pd.Series) -> Optional[int]:
    """Calcule delay_days entre content_date et application_date"""
    content_date = row.get('content_date')
    application_date = row.get('application_date')
    
    if pd.isna(content_date) or content_date == '':
        return None
    if pd.isna(application_date) or application_date == '':
        return None
    
    try:
        # Parser dates (format: "2025-12-11 00:00:00")
        content = pd.to_datetime(str(content_date).split()[0])
        application = pd.to_datetime(str(application_date).split()[0])
        delay = (application - content).days
        
        # Filtrer valeurs aberrantes (négatives ou >10 ans)
        if delay < 0 or delay > 3650:
            return None
        
        return int(delay)
    except:
        return None

def transform_row(row: pd.Series) -> Dict:
    """Transforme une ligne DSA vers format Dashboard"""
    # Parser territorial_scope
    territorial_scope = []
    if pd.notna(row.get('territorial_scope')) and row['territorial_scope'] != '':
        territorial_scope = parse_json_field(row['territorial_scope'])
    
    # Extraire country (premier pays)
    country = extract_country(row.get('territorial_scope'))
    
    # Parser dates (garder seulement date, pas heure)
    application_date = None
    if pd.notna(row.get('application_date')) and row['application_date'] != '':
        try:
            application_date = str(row['application_date']).split()[0]
        except:
            pass
    
    content_date = None
    if pd.notna(row.get('content_date')) and row['content_date'] != '':
        try:
            content_date = str(row['content_date']).split()[0]
        except:
            pass
    
    return {
        'id': row['uuid'],
        'application_date': application_date,
        'content_date': content_date,
        'platform_name': row['platform_name'],
        'category': row['category'],
        'decision_type': map_decision_type(row),
        'decision_ground': row['decision_ground'],
        'incompatible_content_ground': row.get('incompatible_content_ground') if pd.notna(row.get('incompatible_content_ground')) else None,
        'content_type': parse_content_type(row.get('content_type')),
        'automated_detection': parse_automated_detection(row.get('automated_detection')),
        'automated_decision': parse_automated_decision(row.get('automated_decision')),
        'country': country if country else 'Unknown',
        'territorial_scope': territorial_scope,
        'language': row.get('content_language', 'unknown') if pd.notna(row.get('content_language')) else 'unknown',
        'delay_days': calculate_delay_days(row)
    }

def process_csv_file(input_path: Path, output_path: Path):
    """Traite un fichier CSV"""
    print(f"  📄 Processing {input_path.name}...")
    
    chunks = []
    chunk_size = 10000
    
    # Lire par chunks pour économiser mémoire
    for chunk in pd.read_csv(input_path, chunksize=chunk_size, low_memory=False):
        # Transformer chaque chunk
        transformed = chunk.apply(transform_row, axis=1)
        chunks.append(pd.DataFrame(list(transformed)))
    
    # Concaténer tous les chunks
    if chunks:
        result = pd.concat(chunks, ignore_index=True)
        
        # Créer répertoire de sortie si nécessaire
        output_path.parent.mkdir(parents=True, exist_ok=True)
        
        # Sauvegarder
        result.to_csv(output_path, index=False)
        print(f"    ✅ Saved {len(result):,} rows to {output_path.name}")
        return len(result)
    
    return 0

def process_directory(input_dir: Path, output_dir: Path):
    """Traite tous les CSV dans un répertoire"""
    csv_files = list(input_dir.rglob("*.csv"))
    
    if not csv_files:
        print(f"❌ Aucun fichier CSV trouvé dans {input_dir}")
        return
    
    print(f"📁 Trouvé {len(csv_files)} fichiers CSV à transformer")
    
    total_rows = 0
    
    for csv_file in tqdm(csv_files, desc="Transforming files"):
        # Créer chemin de sortie relatif
        relative_path = csv_file.relative_to(input_dir)
        output_path = output_dir / relative_path
        
        try:
            rows = process_csv_file(csv_file, output_path)
            total_rows += rows
        except Exception as e:
            print(f"❌ Erreur sur {csv_file.name}: {e}")
    
    print(f"\n✅ Transformation terminée: {total_rows:,} lignes au total")

if __name__ == "__main__":
    parser = argparse.ArgumentParser(description='Transforme les CSV DSA vers format Dashboard')
    parser.add_argument('--input-dir', required=True, help='Répertoire contenant les CSV DSA bruts')
    parser.add_argument('--output-dir', required=True, help='Répertoire de sortie pour CSV transformés')
    args = parser.parse_args()
    
    input_dir = Path(args.input_dir)
    output_dir = Path(args.output_dir)
    
    if not input_dir.exists():
        print(f"❌ Répertoire introuvable: {input_dir}")
        exit(1)
    
    process_directory(input_dir, output_dir)


