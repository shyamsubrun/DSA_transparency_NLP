# =========================
# EXTRACTION DES VALEURS DISTINCTES
# POUR RÉFÉRENTIEL NLP / ML
# =========================
# =========================
# EXTRACTION RÉFÉRENTIEL (VERSION NORMALISÉE)
# =========================

import json
from sqlalchemy import create_engine, text
from pathlib import Path

from config import DB_HOST, DB_PORT, DB_NAME, DB_USER, DB_PASSWORD

# =========================
# CONNEXION DB
# =========================
engine = create_engine(
    f"postgresql://{DB_USER}:{DB_PASSWORD}@{DB_HOST}:{DB_PORT}/{DB_NAME}"
)

# =========================
# TABLES DE RÉFÉRENCE
# =========================
REFERENCE_TABLES = {
    "platforms": "name",
    "categories": "name",
    "content_types": "name",
    "decision_grounds": "name",
    "decision_types": "name"
}

# =========================
# EXTRACTION
# =========================
reference_values = {}

with engine.connect() as conn:
    for table, col in REFERENCE_TABLES.items():
        print(f"🔍 Extraction : {table}.{col}")

        query = text(f"""
            SELECT DISTINCT {col}
            FROM {table}
            WHERE {col} IS NOT NULL
            ORDER BY {col};
        """)

        result = conn.execute(query)
        values = [row[0] for row in result if row[0]]

        reference_values[table] = values
        print(f"   ➜ {len(values)} valeurs")

# =========================
# EXPORT JSON
# =========================
OUTPUT_DIR = Path(__file__).resolve().parent.parent / "data_zip" / "reference_values"
OUTPUT_DIR.mkdir(parents=True, exist_ok=True)

output_path = OUTPUT_DIR / "moderation_reference_values.json"

with open(output_path, "w", encoding="utf-8") as f:
    json.dump(reference_values, f, indent=2, ensure_ascii=False)

print("\n✅ Extraction terminée")
print(f"📁 Fichier généré : {output_path.resolve()}")