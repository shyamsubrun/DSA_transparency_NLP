# 🗄️ Guide Complet: Importer les Données DSA dans PostgreSQL
## Optimisé pour VM 150GB - Données Essentielles Uniquement

---

## 📋 TABLE DES MATIÈRES

1. [Vue d'Ensemble](#1-vue-densemble)
2. [Prérequis](#2-prérequis)
3. [Étape 1: Analyser les Données](#3-étape-1-analyser-les-données)
4. [Étape 2: Transformer les Données](#4-étape-2-transformer-les-données)
5. [Étape 3: Créer le Schéma PostgreSQL](#5-étape-3-créer-le-schéma-postgresql)
6. [Étape 4: Importer dans PostgreSQL](#6-étape-4-importer-dans-postgresql)
7. [Étape 5: Vérifier et Optimiser](#7-étape-5-vérifier-et-optimiser)
8. [Automatisation](#8-automatisation)

---

## 1. VUE D'ENSEMBLE

### 🎯 Objectif

Transformer les fichiers CSV DSA téléchargés et les importer dans PostgreSQL de manière optimisée pour:
- ✅ Réduire la taille de stockage (de ~7GB/jour à ~3GB/jour)
- ✅ Garder uniquement les données nécessaires pour votre dashboard
- ✅ Normaliser les données pour meilleures performances
- ✅ Créer des indexes pour requêtes rapides

### 📊 Pipeline Complet

```
CSV DSA Bruts
    ↓
[Étape 1] Analyser les données
    ↓
[Étape 2] Transformer DSA → Format Dashboard
    ↓
[Étape 3] Créer schéma PostgreSQL optimisé
    ↓
[Étape 4] Importer dans PostgreSQL
    ↓
[Étape 5] Vérifier et optimiser
    ↓
PostgreSQL avec données optimisées ✅
```

### 💾 Estimation de Stockage

**Données brutes (CSV DSA):**
- 1 jour = ~7-8 GB décompressé
- 30 jours = ~210-240 GB ❌ (trop pour 150GB)

**Données optimisées (PostgreSQL):**
- 1 jour = ~2-3 GB après traitement
- 30 jours = ~60-90 GB ✅ (fits dans 150GB)
- **Économie: 60-70% d'espace**

---

## 2. PRÉREQUIS

### 📦 Installer les Dépendances Python

```bash
# Créer environnement virtuel (recommandé)
python -m venv venv
source venv/bin/activate  # Linux/Mac
# ou
venv\Scripts\activate  # Windows

# Installer dépendances
pip install pandas psycopg2-binary python-dotenv tqdm
```

**Ou créer `requirements.txt`:**
```txt
pandas>=2.0.0
psycopg2-binary>=2.9.0
python-dotenv>=1.0.0
tqdm>=4.65.0
```

```bash
pip install -r requirements.txt
```

### 🗄️ Configuration PostgreSQL

**Sur votre VM, créer la base de données:**

```bash
# Se connecter à PostgreSQL
sudo -u postgres psql

# Créer base de données
CREATE DATABASE dsa_dashboard;

# Créer utilisateur (optionnel)
CREATE USER dsa_user WITH PASSWORD 'votre_mot_de_passe';
GRANT ALL PRIVILEGES ON DATABASE dsa_dashboard TO dsa_user;

# Quitter
\q
```

**Créer fichier `.env` pour connexion:**
```env
DB_HOST=localhost
DB_PORT=5432
DB_NAME=dsa_dashboard
DB_USER=dsa_user
DB_PASSWORD=votre_mot_de_passe
```

---

## 3. ÉTAPE 1: ANALYSER LES DONNÉES

### 📝 Créer le Script d'Analyse

**Créer:** `scripts/analyze_dsa_data.py`

```python
#!/usr/bin/env python3
"""
Analyse les fichiers CSV DSA pour identifier:
- Colonnes NULL/vides
- Taille des données
- Structure des données
"""

import pandas as pd
import json
from pathlib import Path
import argparse
from tqdm import tqdm

def analyze_csv_file(csv_path: Path, sample_size: int = 10000):
    """Analyse un fichier CSV et retourne statistiques"""
    print(f"\n📊 Analyzing {csv_path.name}...")
    
    # Lire échantillon pour analyse rapide
    df = pd.read_csv(csv_path, low_memory=False, nrows=sample_size)
    
    total_rows_sample = len(df)
    
    # Compter lignes totales (sans charger tout en mémoire)
    with open(csv_path, 'r', encoding='utf-8') as f:
        total_lines = sum(1 for _ in f) - 1  # -1 pour header
    
    results = {
        'file': str(csv_path),
        'total_rows': total_lines,
        'sample_rows': total_rows_sample,
        'columns': {}
    }
    
    # Analyser chaque colonne
    for col in df.columns:
        null_count = df[col].isna().sum()
        empty_count = (df[col] == '').sum()
        total_null_empty = null_count + empty_count
        
        # Échantillon de valeurs non-null
        sample_values = []
        if total_null_empty < total_rows_sample:
            non_null = df[col].dropna()
            non_null = non_null[non_null != '']
            if len(non_null) > 0:
                sample_values = non_null.head(3).tolist()
        
        results['columns'][col] = {
            'null_count': int(null_count),
            'empty_count': int(empty_count),
            'null_percentage': round((null_count / total_rows_sample) * 100, 2),
            'empty_percentage': round((empty_count / total_rows_sample) * 100, 2),
            'total_null_empty_percentage': round((total_null_empty / total_rows_sample) * 100, 2),
            'non_null_count': int(total_rows_sample - total_null_empty),
            'sample_values': sample_values
        }
    
    return results

def analyze_directory(csv_dir: Path, output_file: Path = None):
    """Analyse tous les CSV dans un répertoire"""
    csv_files = list(csv_dir.rglob("*.csv"))
    
    if not csv_files:
        print(f"❌ Aucun fichier CSV trouvé dans {csv_dir}")
        return
    
    print(f"📁 Trouvé {len(csv_files)} fichiers CSV")
    
    all_results = []
    
    # Analyser chaque fichier
    for csv_file in tqdm(csv_files[:5], desc="Analyzing files"):  # Limiter à 5 pour test
        try:
            result = analyze_csv_file(csv_file)
            all_results.append(result)
        except Exception as e:
            print(f"❌ Erreur sur {csv_file.name}: {e}")
    
    # Résumé global
    print("\n" + "="*80)
    print("📊 RÉSUMÉ GLOBAL")
    print("="*80)
    
    # Colonnes >70% NULL
    print("\n🔴 Colonnes >70% NULL (à supprimer probablement):")
    column_stats = {}
    
    for result in all_results:
        for col, stats in result['columns'].items():
            if col not in column_stats:
                column_stats[col] = {
                    'null_percentages': [],
                    'total_rows': 0
                }
            column_stats[col]['null_percentages'].append(stats['null_percentage'])
            column_stats[col]['total_rows'] += result['sample_rows']
    
    for col, stats in sorted(column_stats.items(), 
                            key=lambda x: sum(x[1]['null_percentages'])/len(x[1]['null_percentages']), 
                            reverse=True):
        avg_null = sum(stats['null_percentages']) / len(stats['null_percentages'])
        if avg_null > 70:
            print(f"  • {col}: {avg_null:.1f}% NULL en moyenne")
    
    # Colonnes toujours présentes
    print("\n🟢 Colonnes toujours présentes (<10% NULL):")
    for col, stats in sorted(column_stats.items(), 
                            key=lambda x: sum(x[1]['null_percentages'])/len(x[1]['null_percentages'])):
        avg_null = sum(stats['null_percentages']) / len(stats['null_percentages'])
        if avg_null < 10:
            print(f"  • {col}: {avg_null:.1f}% NULL en moyenne")
    
    # Sauvegarder résultats JSON
    if output_file:
        with open(output_file, 'w', encoding='utf-8') as f:
            json.dump(all_results, f, indent=2, ensure_ascii=False)
        print(f"\n💾 Résultats sauvegardés dans {output_file}")

if __name__ == "__main__":
    parser = argparse.ArgumentParser(description='Analyse les fichiers CSV DSA')
    parser.add_argument('--input-dir', required=True, help='Répertoire contenant les CSV DSA')
    parser.add_argument('--output', help='Fichier JSON de sortie (optionnel)')
    args = parser.parse_args()
    
    input_dir = Path(args.input_dir)
    if not input_dir.exists():
        print(f"❌ Répertoire introuvable: {input_dir}")
        exit(1)
    
    output_file = Path(args.output) if args.output else None
    analyze_directory(input_dir, output_file)
```

### 🚀 Exécuter l'Analyse

```bash
# Analyser les données du 12 décembre
python scripts/analyze_dsa_data.py \
    --input-dir "src/data/dsa-download/sor-global-2025-12-12-full" \
    --output "analysis_report.json"
```

**Résultat attendu:**
- Identification des colonnes >70% NULL
- Identification des colonnes toujours présentes
- Rapport JSON avec statistiques détaillées

---

## 4. ÉTAPE 2: TRANSFORMER LES DONNÉES

### 📝 Créer le Script de Transformation

**Créer:** `scripts/transform_dsa_to_dashboard.py`

```python
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
```

### 🚀 Exécuter la Transformation

```bash
# Transformer les données du 12 décembre
python scripts/transform_dsa_to_dashboard.py \
    --input-dir "src/data/dsa-download/sor-global-2025-12-12-full" \
    --output-dir "src/data/dsa-transformed/sor-global-2025-12-12-transformed"
```

**Résultat:**
- Fichiers CSV transformés dans `output-dir`
- Format correspondant à `ModerationEntry` de votre dashboard
- Taille réduite de ~50-60%

---

## 5. ÉTAPE 3: CRÉER LE SCHÉMA POSTGRESQL

### 📝 Créer le Script SQL

**Créer:** `database/schema.sql`

```sql
-- ============================================
-- SCHÉMA POSTGRESQL OPTIMISÉ POUR DSA DASHBOARD
-- Optimisé pour VM 150GB - Données essentielles uniquement
-- ============================================

-- Supprimer tables existantes (ATTENTION: supprime toutes les données!)
-- DROP TABLE IF EXISTS moderation_entries CASCADE;
-- DROP TABLE IF EXISTS platforms CASCADE;
-- DROP TABLE IF EXISTS categories CASCADE;
-- DROP TABLE IF EXISTS decision_types CASCADE;
-- DROP TABLE IF EXISTS decision_grounds CASCADE;
-- DROP TABLE IF EXISTS content_types CASCADE;

-- ============================================
-- TABLES DE RÉFÉRENCE (Normalisation)
-- ============================================

-- Table des plateformes
CREATE TABLE IF NOT EXISTS platforms (
    id SMALLSERIAL PRIMARY KEY,
    name VARCHAR(100) NOT NULL UNIQUE,
    created_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_platforms_name ON platforms(name);

-- Table des catégories
CREATE TABLE IF NOT EXISTS categories (
    id SMALLSERIAL PRIMARY KEY,
    name VARCHAR(100) NOT NULL UNIQUE,
    created_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_categories_name ON categories(name);

-- Table des types de décision
CREATE TABLE IF NOT EXISTS decision_types (
    id SMALLSERIAL PRIMARY KEY,
    name VARCHAR(100) NOT NULL UNIQUE,
    created_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_decision_types_name ON decision_types(name);

-- Table des bases légales (decision_grounds)
CREATE TABLE IF NOT EXISTS decision_grounds (
    id SMALLSERIAL PRIMARY KEY,
    name TEXT NOT NULL UNIQUE,
    created_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_decision_grounds_name ON decision_grounds(name);

-- Table des types de contenu
CREATE TABLE IF NOT EXISTS content_types (
    id SMALLSERIAL PRIMARY KEY,
    name VARCHAR(50) NOT NULL UNIQUE,
    created_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_content_types_name ON content_types(name);

-- ============================================
-- TABLE PRINCIPALE: moderation_entries
-- ============================================

CREATE TABLE IF NOT EXISTS moderation_entries (
    id VARCHAR(50) PRIMARY KEY,
    application_date DATE NOT NULL,
    content_date DATE,
    platform_id SMALLINT NOT NULL REFERENCES platforms(id),
    category_id SMALLINT NOT NULL REFERENCES categories(id),
    decision_type_id SMALLINT NOT NULL REFERENCES decision_types(id),
    decision_ground_id SMALLINT NOT NULL REFERENCES decision_grounds(id),
    incompatible_content_ground TEXT,
    content_type_id SMALLINT REFERENCES content_types(id),
    automated_detection BOOLEAN,
    automated_decision BOOLEAN,
    country_code CHAR(2),
    territorial_scope JSONB,
    language VARCHAR(10),
    delay_days INTEGER,
    created_at TIMESTAMP DEFAULT NOW()
);

-- ============================================
-- INDEXES POUR PERFORMANCE
-- ============================================

-- Index sur dates (pour requêtes temporelles)
CREATE INDEX IF NOT EXISTS idx_moderation_app_date ON moderation_entries(application_date DESC);
CREATE INDEX IF NOT EXISTS idx_moderation_content_date ON moderation_entries(content_date DESC);

-- Index sur plateforme
CREATE INDEX IF NOT EXISTS idx_moderation_platform ON moderation_entries(platform_id);

-- Index sur catégorie
CREATE INDEX IF NOT EXISTS idx_moderation_category ON moderation_entries(category_id);

-- Index sur type de décision
CREATE INDEX IF NOT EXISTS idx_moderation_decision_type ON moderation_entries(decision_type_id);

-- Index sur base légale
CREATE INDEX IF NOT EXISTS idx_moderation_decision_ground ON moderation_entries(decision_ground_id);

-- Index sur pays
CREATE INDEX IF NOT EXISTS idx_moderation_country ON moderation_entries(country_code);

-- Index sur type de contenu
CREATE INDEX IF NOT EXISTS idx_moderation_content_type ON moderation_entries(content_type_id);

-- Index composite pour requêtes fréquentes
CREATE INDEX IF NOT EXISTS idx_moderation_platform_date ON moderation_entries(platform_id, application_date DESC);
CREATE INDEX IF NOT EXISTS idx_moderation_category_date ON moderation_entries(category_id, application_date DESC);

-- Index GIN pour JSONB (territorial_scope)
CREATE INDEX IF NOT EXISTS idx_moderation_territorial_scope ON moderation_entries USING GIN(territorial_scope);

-- ============================================
-- VUES MATÉRIALISÉES (pour agrégations rapides)
-- ============================================

-- Vue pour statistiques par plateforme
CREATE MATERIALIZED VIEW IF NOT EXISTS platform_stats AS
SELECT 
    p.name AS platform_name,
    COUNT(*) AS total_actions,
    COUNT(DISTINCT DATE(me.application_date)) AS days_active,
    AVG(me.delay_days) AS avg_delay_days,
    COUNT(CASE WHEN me.automated_detection = TRUE THEN 1 END) AS automated_detection_count,
    COUNT(CASE WHEN me.automated_decision = TRUE THEN 1 END) AS automated_decision_count
FROM moderation_entries me
JOIN platforms p ON me.platform_id = p.id
GROUP BY p.id, p.name;

CREATE UNIQUE INDEX IF NOT EXISTS idx_platform_stats_name ON platform_stats(platform_name);

-- Vue pour statistiques par catégorie
CREATE MATERIALIZED VIEW IF NOT EXISTS category_stats AS
SELECT 
    c.name AS category_name,
    COUNT(*) AS total_actions,
    COUNT(DISTINCT me.platform_id) AS platform_count
FROM moderation_entries me
JOIN categories c ON me.category_id = c.id
GROUP BY c.id, c.name;

CREATE UNIQUE INDEX IF NOT EXISTS idx_category_stats_name ON category_stats(category_name);

-- ============================================
-- FONCTIONS UTILES
-- ============================================

-- Fonction pour rafraîchir les vues matérialisées
CREATE OR REPLACE FUNCTION refresh_materialized_views()
RETURNS void AS $$
BEGIN
    REFRESH MATERIALIZED VIEW CONCURRENTLY platform_stats;
    REFRESH MATERIALIZED VIEW CONCURRENTLY category_stats;
END;
$$ LANGUAGE plpgsql;

-- ============================================
-- COMMENTAIRES
-- ============================================

COMMENT ON TABLE moderation_entries IS 'Table principale contenant les entrées de modération DSA optimisées';
COMMENT ON COLUMN moderation_entries.territorial_scope IS 'Array JSONB des codes pays (ex: ["FR", "DE", "IT"])';
COMMENT ON COLUMN moderation_entries.delay_days IS 'Nombre de jours entre content_date et application_date';
```

### 🚀 Exécuter le Schéma

```bash
# Sur votre VM PostgreSQL
psql -U dsa_user -d dsa_dashboard -f database/schema.sql
```

**Ou depuis votre machine locale:**
```bash
psql -h votre_vm_ip -U dsa_user -d dsa_dashboard -f database/schema.sql
```

---

## 6. ÉTAPE 4: IMPORTER DANS POSTGRESQL

### 📝 Créer le Script d'Import

**Créer:** `scripts/import_to_postgresql.py`

```python
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

def prepare_row_for_insert(row: pd.Series, mappings: Dict) -> tuple:
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
                prepared_row = prepare_row_for_insert(row, mappings)
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
    import json
    
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
```

### 🚀 Exécuter l'Import

```bash
# Importer les données transformées
python scripts/import_to_postgresql.py \
    --input-dir "src/data/dsa-transformed/sor-global-2025-12-12-transformed"
```

**Résultat:**
- Données importées dans PostgreSQL
- Tables de référence remplies automatiquement
- Vues matérialisées rafraîchies

---

## 7. ÉTAPE 5: VÉRIFIER ET OPTIMISER

### 📊 Vérifier les Données

```sql
-- Compter total d'entrées
SELECT COUNT(*) FROM moderation_entries;

-- Vérifier par date
SELECT application_date, COUNT(*) 
FROM moderation_entries 
GROUP BY application_date 
ORDER BY application_date DESC 
LIMIT 10;

-- Vérifier par plateforme
SELECT p.name, COUNT(*) 
FROM moderation_entries me
JOIN platforms p ON me.platform_id = p.id
GROUP BY p.name
ORDER BY COUNT(*) DESC;

-- Vérifier taille de la base
SELECT 
    pg_size_pretty(pg_database_size('dsa_dashboard')) AS database_size,
    pg_size_pretty(pg_total_relation_size('moderation_entries')) AS table_size;
```

### 🔧 Optimiser PostgreSQL

```sql
-- Analyser les tables
ANALYZE moderation_entries;
ANALYZE platforms;
ANALYZE categories;
ANALYZE decision_types;
ANALYZE decision_grounds;
ANALYZE content_types;

-- Vérifier les indexes
SELECT 
    tablename,
    indexname,
    pg_size_pretty(pg_relation_size(indexname::regclass)) AS index_size
FROM pg_indexes
WHERE schemaname = 'public'
ORDER BY pg_relation_size(indexname::regclass) DESC;
```

---

## 8. AUTOMATISATION

### 📝 Créer Script de Pipeline Complet

**Créer:** `scripts/full_pipeline.py`

```python
#!/usr/bin/env python3
"""
Pipeline complet: Téléchargement → Transformation → Import
"""

import subprocess
import sys
from pathlib import Path
from datetime import datetime, timedelta

def run_command(cmd: list, description: str):
    """Exécute une commande et gère les erreurs"""
    print(f"\n{'='*80}")
    print(f"🔄 {description}")
    print(f"{'='*80}")
    
    result = subprocess.run(cmd, capture_output=True, text=True)
    
    if result.returncode != 0:
        print(f"❌ Erreur: {result.stderr}")
        sys.exit(1)
    
    print(result.stdout)
    return result

def main():
    # Date d'aujourd'hui
    today = datetime.now()
    date_str = today.strftime("%Y-%m-%d")
    
    # Chemins
    download_dir = Path("src/data/dsa-download")
    transformed_dir = Path("src/data/dsa-transformed")
    
    print(f"📅 Traitement des données pour: {date_str}")
    
    # Étape 1: Télécharger (si nécessaire)
    # python download_data.py --start-date {date_str} --days 1
    
    # Étape 2: Transformer
    input_dir = download_dir / f"sor-global-{date_str}-full"
    output_dir = transformed_dir / f"sor-global-{date_str}-transformed"
    
    if not input_dir.exists():
        print(f"❌ Répertoire introuvable: {input_dir}")
        print("   Téléchargez d'abord les données avec download_data.py")
        sys.exit(1)
    
    run_command(
        [
            "python", "scripts/transform_dsa_to_dashboard.py",
            "--input-dir", str(input_dir),
            "--output-dir", str(output_dir)
        ],
        "Transformation des données DSA"
    )
    
    # Étape 3: Importer
    run_command(
        [
            "python", "scripts/import_to_postgresql.py",
            "--input-dir", str(output_dir)
        ],
        "Import dans PostgreSQL"
    )
    
    print("\n✅ Pipeline terminé avec succès!")

if __name__ == "__main__":
    main()
```

### 🕐 Créer Cron Job (sur VM)

**Créer:** `scripts/daily_sync.sh`

```bash
#!/bin/bash
# Cron job quotidien pour synchroniser données DSA

DATE=$(date +%Y-%m-%d)
LOG_FILE="/var/log/dsa_sync_${DATE}.log"

echo "==========================================" >> $LOG_FILE
echo "DSA Sync - $(date)" >> $LOG_FILE
echo "==========================================" >> $LOG_FILE

# Activer environnement virtuel
source /path/to/venv/bin/activate

# Exécuter pipeline
cd /path/to/dsa-dashboard
python scripts/full_pipeline.py >> $LOG_FILE 2>&1

echo "Sync terminé - $(date)" >> $LOG_FILE
```

**Configurer cron:**
```bash
# Éditer crontab
crontab -e

# Ajouter ligne (exécute chaque jour à 2h du matin)
0 2 * * * /path/to/scripts/daily_sync.sh
```

---

## 📊 RÉSUMÉ DES COMMANDES

### Workflow Complet

```bash
# 1. Analyser les données
python scripts/analyze_dsa_data.py \
    --input-dir "src/data/dsa-download/sor-global-2025-12-12-full" \
    --output "analysis.json"

# 2. Transformer les données
python scripts/transform_dsa_to_dashboard.py \
    --input-dir "src/data/dsa-download/sor-global-2025-12-12-full" \
    --output-dir "src/data/dsa-transformed/sor-global-2025-12-12-transformed"

# 3. Créer schéma PostgreSQL (une seule fois)
psql -U dsa_user -d dsa_dashboard -f database/schema.sql

# 4. Importer dans PostgreSQL
python scripts/import_to_postgresql.py \
    --input-dir "src/data/dsa-transformed/sor-global-2025-12-12-transformed"

# 5. Vérifier
psql -U dsa_user -d dsa_dashboard -c "SELECT COUNT(*) FROM moderation_entries;"
```

---

## ✅ CHECKLIST FINALE

- [ ] Installer dépendances Python (`pip install -r requirements.txt`)
- [ ] Configurer `.env` avec credentials PostgreSQL
- [ ] Créer base de données PostgreSQL
- [ ] Exécuter `schema.sql` pour créer tables
- [ ] Analyser données avec `analyze_dsa_data.py`
- [ ] Transformer données avec `transform_dsa_to_dashboard.py`
- [ ] Importer données avec `import_to_postgresql.py`
- [ ] Vérifier données dans PostgreSQL
- [ ] Configurer cron job pour automatisation (optionnel)

---

**Document créé le**: 2024-12-12
**Optimisé pour**: VM 150GB, PostgreSQL, Données DSA essentielles uniquement


