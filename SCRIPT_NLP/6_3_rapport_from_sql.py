import os
import json
import requests
import psycopg2
from dotenv import load_dotenv
from google import genai

# =========================
# LOAD ENV
# =========================
load_dotenv()

GEMINI_API_KEY = os.getenv("GEMINI_API_KEY")
DB_HOST = os.getenv("DB_HOST")
DB_PORT = os.getenv("DB_PORT", 5432)
DB_NAME = os.getenv("DB_NAME")
DB_USER = os.getenv("DB_USER")
DB_PASSWORD = os.getenv("DB_PASSWORD")
TABLE_NAME = os.getenv("TABLE_NAME", "dsa_decisions")

if not GEMINI_API_KEY:
    raise RuntimeError("❌ GEMINI_API_KEY manquant")
if not DB_HOST or not DB_NAME or not DB_USER:
    raise RuntimeError("❌ Informations de connexion à la DB manquantes")

client = genai.Client(api_key=GEMINI_API_KEY)

# =========================
# UTILS
# =========================
def get_sql_from_api(question: str) -> str:
    """Appelle l'API FastAPI pour générer le SQL depuis la question"""
    url = "http://127.0.0.1:8000/nlp/sql"
    payload = {"text": question}
    response = requests.post(url, json=payload)
    response.raise_for_status()
    data = response.json()
    
    # On récupère la partie SQL uniquement
    sql = data.get("sql", "")
    # Extraire la requête SQL après "SELECT" si le texte contient du commentaire
    if "SELECT" in sql.upper():
        idx = sql.upper().index("SELECT")
        sql = sql[idx:]
    return sql.strip()

def execute_sql(sql: str):
    """Exécute la requête SQL sur la base PostgreSQL et renvoie les résultats"""
    conn = psycopg2.connect(
        host=DB_HOST,
        port=DB_PORT,
        dbname=DB_NAME,
        user=DB_USER,
        password=DB_PASSWORD
    )
    cur = conn.cursor()
    cur.execute(sql)
    columns = [desc[0] for desc in cur.description]
    rows = cur.fetchall()
    cur.close()
    conn.close()
    return columns, rows

def generate_report_with_gemini(question: str, columns, rows) -> str:
    """Génère un rapport analytique avec Gemini à partir des données"""
    data_json = json.dumps([dict(zip(columns, r)) for r in rows], indent=2, ensure_ascii=False)
    
    prompt = f"""
Tu es un assistant analytique. Voici la question initiale :
{question}

Et voici les données récupérées depuis la base de données ({TABLE_NAME}) :
{data_json}

Fais un rapport synthétique clair et exploitable pour un humain, avec insights pertinents.
"""
    response = client.models.generate_content(
        model="models/gemini-flash-latest",
        contents=prompt
    )
    return response.text.strip()

# =========================
# SCRIPT PRINCIPAL
# =========================
if __name__ == "__main__":
    question = input("📝 Question analytique :\n> ").strip()

    print("\n🔹 Étape 1 : génération du SQL depuis l'API...")
    sql_query = get_sql_from_api(question)
    print(f"✅ SQL généré :\n{sql_query}")

    print("\n🔹 Étape 2 : exécution du SQL sur la base de données...")
    columns, rows = execute_sql(sql_query)
    print(f"✅ {len(rows)} lignes récupérées")

    print("\n🔹 Étape 3 : génération du rapport avec Gemini...")
    report = generate_report_with_gemini(question, columns, rows)
    print("\n📝 Rapport analytique :\n")
    print(report)
