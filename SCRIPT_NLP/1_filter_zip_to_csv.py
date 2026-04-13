import zipfile
import pandas as pd
from io import TextIOWrapper
from pathlib import Path

# =========================
#genere un fichier csv filtrer sur les plateformeprécises dans le tableau PLATFORMS
# dans le but de reduire la taille des fichiers csv
#pour les injecter dans une base de données
#en entreant les zip principaux contenant des zip secondaires contenant des csv
#zip placer au meme niveau que ce script
#genere des fichiers csv dans un dossier data_filtered
# =========================
# CONFIGURATION
# =========================

INPUT_DIR = Path(".")              # dossier courant
OUTPUT_DIR = Path("data_filtered")
OUTPUT_DIR.mkdir(exist_ok=True)

PLATFORMS = [
  "TikTok",
  "Instagram",
  "Facebook",
  "YouTube",
  "X",
  "Pornhub",
  "XNXX",
  "XVideos",
  "Snapchat",
  "Reddit",
  "LinkedIn",
  "Amazon Store",
  "AliExpress",
  "Temu",
  "Shein"
]


CHUNK_SIZE = 200_000
MAX_ROWS_PER_FILE = 800_000        # ~700–900 Mo par CSV
file_index = 1
current_rows = 0
current_df = []

# =========================
# FONCTIONS UTILITAIRES
# =========================

def save_current_file():
    global file_index, current_rows, current_df
    if not current_df:
        return

    output_path = OUTPUT_DIR / f"filtered_part_{file_index:02d}.csv"
    pd.concat(current_df).to_csv(output_path, index=False)
    print(f"✅ Fichier écrit : {output_path} ({current_rows} lignes)")

    file_index += 1
    current_rows = 0
    current_df = []

# =========================
# TRAITEMENT
# =========================

zip_files = sorted(INPUT_DIR.glob("*.zip"))

for main_zip_path in zip_files:
    print(f"\n📦 ZIP principal : {main_zip_path.name}")

    with zipfile.ZipFile(main_zip_path) as main_zip:

        for sub_zip_name in main_zip.namelist():

            if not sub_zip_name.endswith(".zip"):
                continue

            print(f"  └─ 📦 Sous-ZIP : {sub_zip_name}")

            with main_zip.open(sub_zip_name) as sub_zip_file:
                with zipfile.ZipFile(sub_zip_file) as sub_zip:

                    for csv_name in sub_zip.namelist():

                        if not csv_name.endswith(".csv"):
                            continue

                        print(f"     └─ 📄 CSV : {csv_name}")

                        with sub_zip.open(csv_name) as csv_file:
                            reader = pd.read_csv(
                                TextIOWrapper(csv_file, encoding="utf-8"),
                                chunksize=CHUNK_SIZE
                            )

                            for chunk in reader:
                                # FILTRE PAR PLATEFORME
                                chunk = chunk[
                                    chunk["platform_name"].isin(PLATFORMS)
                                ]

                                if chunk.empty:
                                    continue

                                current_df.append(chunk)
                                current_rows += len(chunk)

                                # SI LE FICHIER DEVIENT TROP GROS
                                if current_rows >= MAX_ROWS_PER_FILE:
                                    save_current_file()

# SAUVEGARDE DU DERNIER FICHIER
save_current_file()

print("\n🎉 Traitement terminé")
