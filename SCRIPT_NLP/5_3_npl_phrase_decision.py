# =========================
# TEST END-TO-END (VERSION MODERNISÉE)
# =========================

import os
import json
import pandas as pd
from pathlib import Path
import joblib
from dotenv import load_dotenv
from google import genai

# =========================
# INIT
# =========================
load_dotenv()

client = genai.Client(api_key=os.getenv("GEMINI_API_KEY"))

PROJECT_ROOT = Path(__file__).resolve().parent.parent

REF_DIR = PROJECT_ROOT / "data_zip" / "reference_values"
MODEL_DIR = PROJECT_ROOT / "data_zip" / "ml_outputs"

JSON_PATH = REF_DIR / "moderation_reference_values.json"
PROMPT_PATH = REF_DIR / "gpt_prompt_moderation.txt"
MODEL_PATH = MODEL_DIR / "dsa_pipeline.joblib"

# =========================
# LOAD
# =========================
with open(JSON_PATH, "r", encoding="utf-8") as f:
    ref = json.load(f)

with open(PROMPT_PATH, "r", encoding="utf-8") as f:
    base_prompt = f.read()

pipeline = joblib.load(MODEL_PATH)

# =========================
# INPUT
# =========================
phrase = input("📝 Entrez votre situation :\n> ")

# =========================
# GEMINI
# =========================
response = client.models.generate_content(
    model="models/gemini-flash-latest",
    contents=f"{base_prompt}\n\n{phrase}"
)

gpt_response = response.text.strip()
print("🤖 Gemini :", gpt_response)

# =========================
# PARSE
# =========================
try:
    (
        decision_ground_i,
        category_i,
        content_type_i,
        platform_i,
        automated_detection,
        automated_decision,
        language
    ) = gpt_response.split(",")
except:
    raise ValueError("❌ Mauvaise réponse GPT")

# =========================
# CONVERSION → IDs
# =========================
features = {
    "decision_ground": ref["decision_grounds"][int(decision_ground_i)],
    "category": ref["categories"][int(category_i)],
    "content_type": ref["content_types"][int(content_type_i)],
    "platform_name": ref["platforms"][int(platform_i)],
    "automated_detection": "true" if int(automated_detection) == 1 else "false",
    "source_type": "unknown",
    "content_language": language.strip(),
}

print("\n🧩 Features envoyées au modèle :")
for k, v in features.items():
    print(f"{k}: {v}")

# =========================
# PREDICTION
# =========================
df = pd.DataFrame([features])

prediction = pipeline.predict(df)[0]

proba = pipeline.predict_proba(df)[0]
confidence = max(proba)

print("\n🎯 DÉCISION ML :")
print(prediction)
print(f"Confiance : {confidence*100:.1f}%")