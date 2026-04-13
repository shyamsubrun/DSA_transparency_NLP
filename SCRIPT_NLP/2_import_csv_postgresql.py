import subprocess
import os
import pandas as pd
from pathlib import Path
from config import DB_HOST, DB_PORT, DB_NAME, DB_USER, DB_PASSWORD, TABLE_NAME

BASE_DIR = Path(__file__).resolve().parent.parent
CSV_DIR = BASE_DIR / "data_zip" / "data_filtered"
TMP_DIR = CSV_DIR / "_aligned"
TMP_DIR.mkdir(exist_ok=True)

os.environ["PGPASSWORD"] = DB_PASSWORD

# ✅ Colonnes EXACTES de la table PostgreSQL
TABLE_COLUMNS = [
    "uuid",
    "decision_visibility",
    "decision_visibility_other",
    "platform_name",
    "platform_uid",
    "decision_ground",
    "category",
    "application_date",
    "territorial_scope",
    "automated_detection",
    "automated_decision",
    "created_at",
    "source_type",
    "decision_provision",
    "decision_monetary",
    "decision_account",
    "decision_facts",
    "end_date_account_restriction",
    "illegal_content_legal_ground",
    "illegal_content_explanation",
    "incompatible_content_ground",
    "incompatible_content_explanation",
    "incompatible_content_illegal",
    "content_type",
    "content_type_other",
    "content_language",
    "content_date"
]

print(f"📁 CSV source : {CSV_DIR.resolve()}")

csv_files = sorted(CSV_DIR.glob("*.csv"))
if not csv_files:
    print("❌ Aucun fichier CSV trouvé")
    exit(1)

for csv_file in csv_files:
    print(f"\n📄 Lecture : {csv_file.name}")

    # 1️⃣ Lecture CSV DSA complet
    df = pd.read_csv(csv_file, low_memory=False)

    # 2️⃣ On garde UNIQUEMENT les colonnes utiles
    df = df[[c for c in TABLE_COLUMNS if c in df.columns]]

    # 3️⃣ Écriture CSV aligné
    aligned_csv = TMP_DIR / csv_file.name
    df.to_csv(aligned_csv, index=False)

    print(f"📥 Import PostgreSQL : {aligned_csv.name}")

    # 4️⃣ Import PostgreSQL
    cmd = [
        "psql",
        "-h", DB_HOST,
        "-p", str(DB_PORT),
        "-U", DB_USER,
        "-d", DB_NAME,
        "-c",
        f"\\copy {TABLE_NAME} FROM '{aligned_csv}' "
        "WITH (FORMAT csv, HEADER true, QUOTE '\"', ESCAPE '\"');"
    ]

    subprocess.run(cmd, check=True)

print("\n✅ Import terminé avec succès")
