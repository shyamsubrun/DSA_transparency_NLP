# =========================
# GÉNÉRATION PROMPT GPT OPTIMISÉ
# =========================

import json
from pathlib import Path

# =========================
# CHEMINS
# =========================
PROJECT_ROOT = Path(__file__).resolve().parent.parent
REF_DIR = PROJECT_ROOT / "data_zip" / "reference_values"

JSON_PATH = REF_DIR / "moderation_reference_values.json"
PROMPT_PATH = REF_DIR / "gpt_prompt_moderation.txt"

# =========================
# CHARGEMENT JSON
# =========================
with open(JSON_PATH, "r", encoding="utf-8") as f:
    ref = json.load(f)

# =========================
# CLEAN DES VALEURS (IMPORTANT)
# =========================
def clean_values(values):
    return [
        v.strip()
        for v in values
        if v and "test" not in v.lower()
    ]

# =========================
# BUILD INDEX BLOCK
# =========================
def build_index_block(title, values):
    values = clean_values(values)
    lines = [f"{title} :"]
    for i, v in enumerate(values):
        lines.append(f"{i} = {v}")
    return "\n".join(lines)

# =========================
# CONSTRUCTION DU PROMPT
# =========================
prompt = f"""
Tu es un système de classification STRICT pour la modération de contenu.

🎯 OBJECTIF :
Analyser une phrase et associer chaque attribut à la valeur la PLUS PROCHE
dans les listes proposées.

⚠️ RÈGLES OBLIGATOIRES :
- Tu dois TOUJOURS choisir un indice existant
- Tu n’as PAS le droit de répondre -1 sauf si c’est STRICTEMENT impossible
- Même si tu hésites, choisis la meilleure correspondance
- N’invente PAS de nouvelles valeurs

⚠️ FORMAT :
Répond uniquement avec des indices numériques séparés par des virgules.

=====================
ATTRIBUTS DISPONIBLES
=====================

{build_index_block("decision_ground", ref["decision_grounds"])}

{build_index_block("category", ref["categories"])}

{build_index_block("content_type", ref["content_types"])}

{build_index_block("platform", ref["platforms"])}

=====================
AUTRES ATTRIBUTS
=====================

automated_detection :
0 = false
1 = true

automated_decision :
0 = false
1 = true

language :
Utilise le code ISO (ex: "fr", "en")
Si inconnu → "unknown"

=====================
EXEMPLES (IMPORTANT)
=====================

Phrase : "vente d'arme sur TikTok"
Réponse : 0,12,3,45,0,0,fr

Phrase : "arnaque sur Facebook"
Réponse : 0,10,3,15,0,0,fr

Phrase : "vidéo violente sur YouTube"
Réponse : 0,13,4,57,0,0,en

=====================
FORMAT FINAL
=====================

decision_ground_index,category_index,content_type_index,platform_index,automated_detection,automated_decision,language

=====================
PHRASE À ANALYSER
=====================

{{PHRASE_UTILISATEUR}}
""".strip()

# =========================
# ÉCRITURE
# =========================
with open(PROMPT_PATH, "w", encoding="utf-8") as f:
    f.write(prompt)

print("✅ Prompt GPT optimisé généré")
print(f"📁 {PROMPT_PATH.resolve()}")