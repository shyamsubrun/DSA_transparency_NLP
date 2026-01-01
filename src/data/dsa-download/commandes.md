# Télécharger 7 jours à partir du 2025-12-01
python download_dsa_multiple_days.py --start-date 2025-12-01 --days 7

# Télécharger 30 jours avec version light
python download_dsa_multiple_days.py --start-date 2025-11-01 --days 30 --version light

# Télécharger 5 jours avec un délai de 2 secondes entre chaque
python download_dsa_multiple_days.py --start-date 2025-12-01 --days 5 --delay 2

# Forcer le re-téléchargement des fichiers existants
python download_dsa_multiple_days.py --start-date 2025-12-01 --days 3 --force