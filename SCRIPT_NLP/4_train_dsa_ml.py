# =========================
# TRAIN + TEST ML (MODERATION_ENTRIES)
# =========================

import time
import joblib
import pandas as pd
from pathlib import Path
from sqlalchemy import create_engine

from sklearn.model_selection import train_test_split
from sklearn.preprocessing import OneHotEncoder
from sklearn.compose import ColumnTransformer
from sklearn.pipeline import Pipeline
from sklearn.linear_model import LogisticRegression
from sklearn.metrics import classification_report, accuracy_score, precision_score

from config import (
    DB_HOST, DB_PORT, DB_NAME, DB_USER, DB_PASSWORD,TABLE_NAME,
    ML_LIMIT, ML_TEST_SIZE, ML_RANDOM_STATE, MIN_CLASS_SAMPLES
)

# =========================
# 0. TIMER
# =========================
start_total = time.time()

# =========================
# 1. CONNEXION DB
# =========================
print("🔌 Connexion PostgreSQL...")
engine = create_engine(
    f"postgresql://{DB_USER}:{DB_PASSWORD}@{DB_HOST}:{DB_PORT}/{DB_NAME}"
)
print("✅ Connexion OK\n")

# =========================
# 2. EXTRACTION DONNÉES
# =========================
print(f"📥 Chargement données moderation_entries (LIMIT {ML_LIMIT})...")

query = f"""
SELECT
    id,
    platform_id,
    category_id,
    content_type_id,
    decision_ground_id,
    decision_type_id,
    automated_detection,
    automated_decision,
    country_code,
    language,
    delay_days
FROM {TABLE_NAME} 
WHERE decision_type_id IS NOT NULL
LIMIT {ML_LIMIT}
"""

df = pd.read_sql(query, engine)
print(f"✅ {df.shape[0]} lignes chargées\n")

# =========================
# 3. NETTOYAGE
# =========================

def clean_text(col):
    return col.fillna("unknown").astype(str).str.lower().str.strip()

df["country_code"] = clean_text(df["country_code"])
df["language"] = clean_text(df["language"])

# 🔥 FIX NaN IMPORTANT
df["delay_days"] = df["delay_days"].fillna(0)

df["automated_detection"] = df["automated_detection"].fillna(False)
df["automated_decision"] = df["automated_decision"].fillna(False)

# 🔥 SUPPRESSION DES LIGNES CRITIQUES AVEC NaN
df = df.dropna(subset=[
    "platform_id",
    "category_id",
    "content_type_id",
    "decision_ground_id",
    "decision_type_id"
])

# =========================
# 4. FEATURES / TARGET
# =========================
FEATURE_COLS = [
    "platform_id",
    "category_id",
    "content_type_id",
    "decision_ground_id",
    "automated_detection",
    "automated_decision",
    "country_code",
    "language",
    "delay_days"
]

X = df[FEATURE_COLS]
y = df["decision_type_id"]

# =========================
# 5. FILTRAGE CLASSES RARES
# =========================
counts = y.value_counts()
valid_classes = counts[counts >= MIN_CLASS_SAMPLES].index

df = df[df["decision_type_id"].isin(valid_classes)]
X = X.loc[df.index]
y = y.loc[df.index]

print(f"✅ Classes conservées : {len(valid_classes)}\n")

# =========================
# 6. SPLIT
# =========================
X_train, X_test, y_train, y_test = train_test_split(
    X,
    y,
    test_size=ML_TEST_SIZE,
    random_state=ML_RANDOM_STATE,
    stratify=y
)

print(f"📚 Train : {len(X_train)}")
print(f"📚 Test  : {len(X_test)}\n")

# =========================
# 7. PIPELINE ML
# =========================

categorical_cols = ["country_code", "language"]

preprocessor = ColumnTransformer(
    [
        ("cat", OneHotEncoder(handle_unknown="ignore"), categorical_cols)
    ],
    remainder="passthrough"
)

classifier = LogisticRegression(
    max_iter=1000
)

pipeline = Pipeline([
    ("preprocessor", preprocessor),
    ("classifier", classifier)
])

# =========================
# 8. TRAIN
# =========================
print("🏋️ Entraînement du modèle...")
pipeline.fit(X_train, y_train)
print("✅ Entraînement terminé\n")

# =========================
# 9. PRÉDICTIONS
# =========================
y_pred = pipeline.predict(X_test)
y_proba = pipeline.predict_proba(X_test).max(axis=1)

# =========================
# 10. MÉTRIQUES
# =========================
accuracy = accuracy_score(y_test, y_pred)
precision = precision_score(y_test, y_pred, average="weighted", zero_division=0)

print("📊 RAPPORT ML\n")
print(classification_report(y_test, y_pred))
print(f"Accuracy  : {accuracy*100:.2f}%")
print(f"Precision : {precision*100:.2f}%\n")

# =========================
# 11. DATASET TEST
# =========================
test_df = df.loc[X_test.index].copy()

test_df["ml_split"] = "test"
test_df["true_decision"] = y_test.values
test_df["predicted_decision"] = y_pred
test_df["prediction_confidence"] = y_proba
test_df["correct_prediction"] = y_test.values == y_pred
test_df["ml_model_version"] = "logreg_v2"

# =========================
# 12. SAVE DB
# =========================
print("🗄️ Insertion dans moderation_ml_results...")

test_df.to_sql(
    "moderation_ml_results",
    engine,
    if_exists="replace",
    index=False
)

print("✅ Données ML stockées en base\n")

# =========================
# 13. SAVE MODEL
# =========================
OUTPUT_DIR = Path(__file__).resolve().parent.parent / "data_zip" / "ml_outputs"
OUTPUT_DIR.mkdir(parents=True, exist_ok=True)

model_path = OUTPUT_DIR / "moderation_pipeline.joblib"
joblib.dump(pipeline, model_path)

print(f"💾 Modèle sauvegardé : {model_path}\n")

# =========================
# FIN
# =========================
print(f"⏱️ Temps total : {time.time() - start_total:.1f}s")
print("🎉 PIPELINE ML TERMINÉ")