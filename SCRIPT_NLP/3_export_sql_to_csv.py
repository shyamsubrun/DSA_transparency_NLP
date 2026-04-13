import psycopg2
import pandas as pd
from pathlib import Path
from config import DB_HOST, DB_PORT, DB_NAME, DB_USER, DB_PASSWORD

# =========================
# CHEMINS (STABLES)
# =========================

# Racine du projet : Module_m2_megadonnee/
BASE_DIR = Path(__file__).resolve().parent.parent

# Dossier de sortie souhaité
OUT_DIR = BASE_DIR / "data_zip" / "data_filtered"/ "export_requete_3"
OUT_DIR.mkdir(parents=True, exist_ok=True)

OUT_FILE = OUT_DIR / "sample.csv"

# =========================
# REQUÊTE SQL
# =========================

QUERY = """
SELECT *
FROM dsa_decisions
LIMIT 1000;
"""

# =========================
# CONNEXION POSTGRESQL
# =========================

conn = psycopg2.connect(
    host=DB_HOST,
    port=DB_PORT,
    dbname=DB_NAME,
    user=DB_USER,
    password=DB_PASSWORD
)

print("✅ Connecté à PostgreSQL")

# =========================
# EXPORT CSV
# =========================

df = pd.read_sql(QUERY, conn)
df.to_csv(OUT_FILE, index=False)

print(f"📁 Fichier écrit : {OUT_FILE}")

conn.close()
print("🔒 Connexion fermée")
