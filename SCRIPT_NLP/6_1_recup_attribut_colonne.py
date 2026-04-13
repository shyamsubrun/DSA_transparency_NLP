# =========================
# EXTRACTION DU SCHÉMA SQL
# TABLE DSA
# =========================

import json
from sqlalchemy import create_engine, text
from pathlib import Path
from config import DB_HOST, DB_PORT, DB_NAME, DB_USER, DB_PASSWORD, TABLE_NAME

# =========================
# CONNEXION DB
# =========================
engine = create_engine(
    f"postgresql://{DB_USER}:{DB_PASSWORD}@{DB_HOST}:{DB_PORT}/{DB_NAME}"
)

SCHEMA_NAME = "public"

# =========================
# REQUÊTE SCHÉMA
# =========================
query = text("""
SELECT
    column_name,
    data_type
FROM information_schema.columns
WHERE table_schema = :schema
  AND table_name = :table
ORDER BY ordinal_position;
""")

schema_info = []

with engine.connect() as conn:
    result = conn.execute(
        query,
        {"schema": SCHEMA_NAME, "table": TABLE_NAME}
    )
    for row in result:
        schema_info.append({
            "column": row.column_name,
            "type": row.data_type
        })

# =========================
# EXPORT JSON
# =========================
OUTPUT_DIR = Path(__file__).resolve().parent.parent / "data_zip" / "reference_values"
OUTPUT_DIR.mkdir(parents=True, exist_ok=True)

OUTPUT_PATH = OUTPUT_DIR / "dsa_table_schema.json"

with open(OUTPUT_PATH, "w", encoding="utf-8") as f:
    json.dump(schema_info, f, indent=2, ensure_ascii=False)

print("✅ Schéma SQL extrait")
print(f"📁 {OUTPUT_PATH.resolve()}")
