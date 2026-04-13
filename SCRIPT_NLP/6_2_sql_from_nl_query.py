# =========================
# NL → SQL (GRAPH)
# AVEC SCHÉMA + RÉFÉRENTIEL DSA
# =========================

import os
import json
from pathlib import Path
from dotenv import load_dotenv
from google import genai

# =========================
# INIT ENV
# =========================
load_dotenv()

GEMINI_API_KEY = os.getenv("GEMINI_API_KEY")
if not GEMINI_API_KEY:
    raise RuntimeError("❌ GEMINI_API_KEY manquant")

client = genai.Client(api_key=GEMINI_API_KEY)

# =========================
# CHEMINS
# =========================
PROJECT_ROOT = Path(__file__).resolve().parent.parent

SCHEMA_PATH = PROJECT_ROOT / "data_zip" / "reference_values" / "dsa_table_schema.json"
REF_VALUES_PATH = PROJECT_ROOT / "data_zip" / "reference_values" / "dsa_reference_values.json"

# =========================
# CHARGEMENT DES FICHIERS
# =========================
with open(SCHEMA_PATH, "r", encoding="utf-8") as f:
    schema = json.load(f)

with open(REF_VALUES_PATH, "r", encoding="utf-8") as f:
    ref_values = json.load(f)

# =========================
# FORMATAGE SCHÉMA
# =========================
schema_block = "\n".join(
    f"- {c['column']} ({c['type']})"
    for c in schema
)

# =========================
# FORMATAGE RÉFÉRENTIEL
# =========================
def format_ref_block(name, values):
    if not values:
        return f"{name} : (libre)"
    return name + " :\n" + "\n".join(f"- {v}" for v in values)

ref_block = "\n\n".join(
    format_ref_block(k, v)
    for k, v in ref_values.items()
)

# =========================
# PROMPT GEMINI STRICT
# =========================
BASE_PROMPT = f"""
Tu es un générateur de requêtes SQL PostgreSQL pour des graphiques analytiques.

⚠️ RÈGLES ABSOLUES :
- Réponds UNIQUEMENT avec une requête SQL valide
- Table unique : dsa_decisions
- PostgreSQL uniquement
- Aucun texte, aucun commentaire
- Requête simple, efficace et exploitable pour un graphique

⚠️ RÈGLES MÉTIER IMPORTANTES :
- territorial_scope contient une LISTE de codes pays ISO (ex: "FR", "DE", "IT")
- Pour la France, utiliser le code 'FR'
- Utiliser LIKE ou une recherche adaptée sur les listes stockées en texte
- Si un pourcentage est demandé, retourner des catégories claires (ex: France / Autres)

⚠️ RÈGLES GRAPHIQUES :
- Le résultat doit pouvoir être affiché directement en graphique

=====================
SCHÉMA SQL
=====================
{schema_block}

=====================
RÉFÉRENTIEL MÉTIER
=====================
{ref_block}

=====================
QUESTION UTILISATEUR
=====================
{{QUESTION}}
""".strip()

# =========================
# INPUT UTILISATEUR
# =========================
question = input("📝 Question analytique :\n> ").strip()

full_prompt = BASE_PROMPT.replace("{QUESTION}", question)

# =========================
# APPEL GEMINI
# =========================
response = client.models.generate_content(
    model="models/gemini-flash-latest",
    contents=full_prompt
)

sql_query = response.text.strip()

print("\n🧠 Requête SQL générée :\n")
print(sql_query)
