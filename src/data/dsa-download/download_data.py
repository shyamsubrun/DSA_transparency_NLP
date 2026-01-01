#!/usr/bin/env python3
"""
Script pour télécharger les données DSA pour plusieurs jours consécutifs.
Permet de spécifier une date de début et un nombre de jours à télécharger.
"""

import argparse
import os
import sys
from datetime import datetime, timedelta
from pathlib import Path
import requests
from tqdm import tqdm
import time


def download_file(url: str, output_path: Path, chunk_size: int = 8192) -> bool:
    """
    Télécharge un fichier depuis une URL avec une barre de progression.

    Args:
        url: URL du fichier à télécharger
        output_path: Chemin où sauvegarder le fichier
        chunk_size: Taille des chunks pour le téléchargement (en octets)

    Returns:
        True si le téléchargement a réussi, False sinon
    """
    try:
        response = requests.get(url, stream=True, timeout=30)
        response.raise_for_status()

        # Récupère la taille totale du fichier
        total_size = int(response.headers.get('content-length', 0))

        # Crée le dossier parent si nécessaire
        output_path.parent.mkdir(parents=True, exist_ok=True)

        # Télécharge le fichier avec barre de progression
        with open(output_path, 'wb') as file:
            with tqdm(total=total_size, unit='B', unit_scale=True, desc=output_path.name) as pbar:
                for chunk in response.iter_content(chunk_size=chunk_size):
                    if chunk:
                        file.write(chunk)
                        pbar.update(len(chunk))

        return True

    except requests.exceptions.RequestException as e:
        print(f"✗ Erreur lors du téléchargement: {e}", file=sys.stderr)
        # Supprime le fichier partiel si le téléchargement a échoué
        if output_path.exists():
            output_path.unlink()
        return False


def build_url(date: str, dataset_type: str = "global", version: str = "full") -> str:
    """
    Construit l'URL de téléchargement pour une date donnée.

    Args:
        date: Date au format YYYY-MM-DD
        dataset_type: Type de dataset (ex: "global", "dailymotion", etc.)
        version: Version du dataset ("full" ou "light")

    Returns:
        URL complète pour le téléchargement
    """
    base_url = "https://dsa-sor-data-dumps.s3.eu-central-1.amazonaws.com"
    filename = f"sor-{dataset_type}-{date}-{version}.zip"
    return f"{base_url}/{filename}"


def parse_date(date_str: str) -> datetime:
    """
    Valide et parse une date au format YYYY-MM-DD.

    Args:
        date_str: Date à valider (format YYYY-MM-DD)

    Returns:
        Objet datetime

    Raises:
        ValueError: Si le format de date est invalide
    """
    try:
        return datetime.strptime(date_str, "%Y-%m-%d")
    except ValueError:
        raise ValueError(f"Format de date invalide: {date_str}. Utilisez le format YYYY-MM-DD")


def download_multiple_days(
    start_date: datetime,
    num_days: int,
    dataset_type: str,
    version: str,
    output_dir: Path,
    skip_existing: bool = True,
    delay: int = 0
) -> tuple[int, int]:
    """
    Télécharge les données pour plusieurs jours consécutifs.

    Args:
        start_date: Date de début
        num_days: Nombre de jours à télécharger
        dataset_type: Type de dataset
        version: Version du dataset
        output_dir: Dossier de destination
        skip_existing: Si True, ignore les fichiers déjà existants
        delay: Délai en secondes entre chaque téléchargement

    Returns:
        Tuple (nombre de succès, nombre d'échecs)
    """
    success_count = 0
    failure_count = 0

    print(f"\n{'='*70}")
    print(f"Téléchargement de {num_days} jour(s) à partir du {start_date.strftime('%Y-%m-%d')}")
    print(f"Type: {dataset_type} | Version: {version}")
    print(f"Destination: {output_dir}")
    print(f"{'='*70}\n")

    for i in range(num_days):
        current_date = start_date + timedelta(days=i)
        date_str = current_date.strftime("%Y-%m-%d")

        print(f"\n[{i+1}/{num_days}] Jour: {date_str}")
        print("-" * 70)

        # Construit l'URL et le chemin de sortie
        url = build_url(date_str, dataset_type, version)
        filename = f"sor-{dataset_type}-{date_str}-{version}.zip"
        output_path = output_dir / filename

        # Vérifie si le fichier existe déjà
        if output_path.exists():
            if skip_existing:
                file_size = output_path.stat().st_size / (1024 * 1024)
                print(f"✓ Fichier déjà existant ({file_size:.2f} MB): {filename}")
                success_count += 1
                continue
            else:
                print(f"⚠ Le fichier existe déjà, téléchargement forcé: {filename}")

        # Télécharge le fichier
        print(f"URL: {url}")
        if download_file(url, output_path):
            file_size = output_path.stat().st_size / (1024 * 1024)
            print(f"✓ Téléchargement réussi ({file_size:.2f} MB)")
            success_count += 1
        else:
            print(f"✗ Échec du téléchargement pour {date_str}")
            failure_count += 1

        # Délai entre les téléchargements (sauf pour le dernier)
        if delay > 0 and i < num_days - 1:
            print(f"⏱ Attente de {delay} seconde(s)...")
            time.sleep(delay)

    return success_count, failure_count


def main():
    """Fonction principale du script."""
    parser = argparse.ArgumentParser(
        description="Télécharge les données DSA pour plusieurs jours consécutifs.",
        formatter_class=argparse.RawDescriptionHelpFormatter,
        epilog="""
Exemples d'utilisation:
  # Télécharger 7 jours à partir du 2025-12-01
  %(prog)s --start-date 2025-12-01 --days 7

  # Télécharger 30 jours avec version light
  %(prog)s --start-date 2025-11-01 --days 30 --version light

  # Télécharger avec un délai de 2 secondes entre chaque fichier
  %(prog)s --start-date 2025-12-01 --days 5 --delay 2

  # Forcer le re-téléchargement des fichiers existants
  %(prog)s --start-date 2025-12-01 --days 3 --force
        """
    )

    parser.add_argument(
        '--start-date', '-s',
        type=str,
        required=True,
        help='Date de début (format: YYYY-MM-DD, ex: 2025-12-01)'
    )

    parser.add_argument(
        '--days', '-n',
        type=int,
        required=True,
        help='Nombre de jours consécutifs à télécharger'
    )

    parser.add_argument(
        '--type', '-t',
        type=str,
        default='global',
        choices=['global', 'dailymotion'],
        help='Type de dataset à télécharger (défaut: global)'
    )

    parser.add_argument(
        '--version', '-v',
        type=str,
        default='full',
        choices=['full', 'light'],
        help='Version du dataset (full ou light, défaut: full)'
    )

    parser.add_argument(
        '--output', '-o',
        type=str,
        default='.',
        help='Dossier de destination pour les téléchargements (défaut: répertoire courant)'
    )

    parser.add_argument(
        '--delay', '-d',
        type=int,
        default=0,
        help='Délai en secondes entre chaque téléchargement (défaut: 0)'
    )

    parser.add_argument(
        '--force', '-f',
        action='store_true',
        help='Forcer le re-téléchargement des fichiers existants'
    )

    args = parser.parse_args()

    try:
        # Valide les paramètres
        if args.days <= 0:
            raise ValueError("Le nombre de jours doit être supérieur à 0")

        if args.delay < 0:
            raise ValueError("Le délai doit être >= 0")

        # Parse la date de début
        start_date = parse_date(args.start_date)

        # Détermine le dossier de sortie
        output_dir = Path(args.output)

        # Lance les téléchargements
        success_count, failure_count = download_multiple_days(
            start_date=start_date,
            num_days=args.days,
            dataset_type=args.type,
            version=args.version,
            output_dir=output_dir,
            skip_existing=not args.force,
            delay=args.delay
        )

        # Affiche le résumé
        print(f"\n{'='*70}")
        print(f"RÉSUMÉ")
        print(f"{'='*70}")
        print(f"✓ Réussis: {success_count}/{args.days}")
        print(f"✗ Échecs: {failure_count}/{args.days}")
        print(f"Dossier: {output_dir.absolute()}")
        print(f"{'='*70}\n")

        # Code de sortie
        if failure_count == 0:
            print("✓ Tous les téléchargements sont terminés avec succès!")
            return 0
        elif success_count > 0:
            print("⚠ Certains téléchargements ont échoué.")
            return 1
        else:
            print("✗ Tous les téléchargements ont échoué.")
            return 1

    except ValueError as e:
        print(f"Erreur: {e}", file=sys.stderr)
        return 1
    except KeyboardInterrupt:
        print("\n\n⚠ Téléchargements interrompus par l'utilisateur.")
        return 1
    except Exception as e:
        print(f"Erreur inattendue: {e}", file=sys.stderr)
        return 1


if __name__ == "__main__":
    sys.exit(main())

 