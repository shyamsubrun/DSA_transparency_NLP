import subprocess
from fastapi import FastAPI
from pydantic import BaseModel

app = FastAPI(
    title="DSA NLP API",
    description="API wrapper autour des scripts NLP existants",
    version="1.0.0"
)

# =========================
# MODELS
# =========================

class TextRequest(BaseModel):
    text: str

# =========================
# UTILS
# =========================

def run_script(script_name: str, input_text: str | None = None):
    result = subprocess.run(
        ["python", script_name],
        input=input_text,
        text=True,
        capture_output=True
    )

    if result.returncode != 0:
        raise RuntimeError(result.stderr)

    return result.stdout.strip()

# =========================
# NLP ENDPOINTS
# =========================

@app.post("/nlp/decision")
def decision(req: TextRequest):
    """
    Phrase -> Gemini -> Features -> ML decision
    """
    output = run_script(
        "5_3_npl_phrase_decision.py",
        req.text
    )

    return {
        "status": "ok",
        "raw_output": output
    }


@app.post("/nlp/sql")
def nl_to_sql(req: TextRequest):
    """
    Question NL -> SQL PostgreSQL
    """
    output = run_script(
        "6_2_sql_from_nl_query.py",
        req.text
    )

    return {
        "status": "ok",
        "sql": output
    }

# =========================
# ADMIN ENDPOINTS
# =========================

@app.post("/admin/reference-values")
def refresh_reference_values():
    run_script("5_1_npl_ref_attribut_col.py")
    return {"status": "reference values regenerated"}

@app.post("/admin/prompt")
def regenerate_prompt():
    run_script("5_2_npl_prompt_gpt.py")
    return {"status": "prompt regenerated"}

@app.post("/admin/schema")
def regenerate_schema():
    run_script("6_1_recup_attribut_colonne.py")
    return {"status": "schema regenerated"}
@app.post("/nlp/report")
def report(req: TextRequest):
    """
    Question NL -> SQL -> DB -> Rapport analytique
    """
    output = run_script(
        "6_3_rapport_from_sql.py",
        req.text
    )
    return {
        "status": "ok",
        "raw_output": output
    }