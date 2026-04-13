import os
from dotenv import load_dotenv
from pathlib import Path

load_dotenv()

# =========================
# DATABASE
# =========================
DB_HOST = os.getenv("DB_HOST")
DB_PORT = int(os.getenv("DB_PORT"))
DB_NAME = os.getenv("DB_NAME")
DB_USER = os.getenv("DB_USER")
DB_PASSWORD = os.getenv("DB_PASSWORD")
TABLE_NAME=os.getenv("TABLE_NAME")

# =========================
# CSV
# =========================
CSV_INPUT_DIR = Path(os.getenv("CSV_INPUT_DIR", "."))
CSV_OUTPUT_DIR = Path(os.getenv("CSV_OUTPUT_DIR", "data_filtered"))
CSV_OUTPUT_DIR.mkdir(exist_ok=True)

CSV_CHUNK_SIZE = int(os.getenv("CSV_CHUNK_SIZE", 200000))
CSV_MAX_ROWS = int(os.getenv("CSV_MAX_ROWS", 800000))

# =========================
# PLATFORMS
# =========================
PLATFORMS = [
    p.strip() for p in os.getenv("PLATFORMS", "").split(",") if p.strip()
]

# =========================
# ML
# =========================
ML_LIMIT = int(os.getenv("ML_LIMIT", 500000))
ML_TEST_SIZE = float(os.getenv("ML_TEST_SIZE", 0.2))
ML_RANDOM_STATE = int(os.getenv("ML_RANDOM_STATE", 42))
MIN_CLASS_SAMPLES = int(os.getenv("MIN_CLASS_SAMPLES", 10))
# =========================


#openai api key
OPENAI_API_KEY = os.getenv("OPENAI_API_KEY")
GEMINI_API_KEY = os.getenv("GEMINI_API_KEY")

GOOGLE_CLOUD_PROJECT = os.getenv("GOOGLE_CLOUD_PROJECT")
GOOGLE_CLOUD_LOCATION = os.getenv("GOOGLE_CLOUD_LOCATION")