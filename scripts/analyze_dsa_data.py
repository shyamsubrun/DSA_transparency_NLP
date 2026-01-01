#!/usr/bin/env python3
"""
Analyse les fichiers CSV DSA pour identifier:
- Colonnes NULL/vides
- Taille des données
- Structure des données
"""

import pandas as pd
import json
from pathlib import Path
import argparse
from tqdm import tqdm

def analyze_csv_file(csv_path: Path, sample_size: int = 10000):
    """Analyse un fichier CSV et retourne statistiques"""
    print(f"\n📊 Analyzing {csv_path.name}...")
    
    # Lire échantillon pour analyse rapide
    df = pd.read_csv(csv_path, low_memory=False, nrows=sample_size)
    
    total_rows_sample = len(df)
    
    # Compter lignes totales (sans charger tout en mémoire)
    with open(csv_path, 'r', encoding='utf-8') as f:
        total_lines = sum(1 for _ in f) - 1  # -1 pour header
    
    results = {
        'file': str(csv_path),
        'total_rows': total_lines,
        'sample_rows': total_rows_sample,
        'columns': {}
    }
    
    # Analyser chaque colonne
    for col in df.columns:
        null_count = df[col].isna().sum()
        empty_count = (df[col] == '').sum()
        total_null_empty = null_count + empty_count
        
        # Échantillon de valeurs non-null
        sample_values = []
        if total_null_empty < total_rows_sample:
            non_null = df[col].dropna()
            non_null = non_null[non_null != '']
            if len(non_null) > 0:
                sample_values = non_null.head(3).tolist()
        
        results['columns'][col] = {
            'null_count': int(null_count),
            'empty_count': int(empty_count),
            'null_percentage': round((null_count / total_rows_sample) * 100, 2),
            'empty_percentage': round((empty_count / total_rows_sample) * 100, 2),
            'total_null_empty_percentage': round((total_null_empty / total_rows_sample) * 100, 2),
            'non_null_count': int(total_rows_sample - total_null_empty),
            'sample_values': sample_values
        }
    
    return results

def analyze_directory(csv_dir: Path, output_file: Path = None):
    """Analyse tous les CSV dans un répertoire"""
    csv_files = list(csv_dir.rglob("*.csv"))
    
    if not csv_files:
        print(f"❌ Aucun fichier CSV trouvé dans {csv_dir}")
        return
    
    print(f"📁 Trouvé {len(csv_files)} fichiers CSV")
    
    all_results = []
    
    # Analyser chaque fichier
    for csv_file in tqdm(csv_files[:5], desc="Analyzing files"):  # Limiter à 5 pour test
        try:
            result = analyze_csv_file(csv_file)
            all_results.append(result)
        except Exception as e:
            print(f"❌ Erreur sur {csv_file.name}: {e}")
    
    # Résumé global
    print("\n" + "="*80)
    print("📊 RÉSUMÉ GLOBAL")
    print("="*80)
    
    # Colonnes >70% NULL
    print("\n🔴 Colonnes >70% NULL (à supprimer probablement):")
    column_stats = {}
    
    for result in all_results:
        for col, stats in result['columns'].items():
            if col not in column_stats:
                column_stats[col] = {
                    'null_percentages': [],
                    'total_rows': 0
                }
            column_stats[col]['null_percentages'].append(stats['null_percentage'])
            column_stats[col]['total_rows'] += result['sample_rows']
    
    for col, stats in sorted(column_stats.items(), 
                            key=lambda x: sum(x[1]['null_percentages'])/len(x[1]['null_percentages']), 
                            reverse=True):
        avg_null = sum(stats['null_percentages']) / len(stats['null_percentages'])
        if avg_null > 70:
            print(f"  • {col}: {avg_null:.1f}% NULL en moyenne")
    
    # Colonnes toujours présentes
    print("\n🟢 Colonnes toujours présentes (<10% NULL):")
    for col, stats in sorted(column_stats.items(), 
                            key=lambda x: sum(x[1]['null_percentages'])/len(x[1]['null_percentages'])):
        avg_null = sum(stats['null_percentages']) / len(stats['null_percentages'])
        if avg_null < 10:
            print(f"  • {col}: {avg_null:.1f}% NULL en moyenne")
    
    # Sauvegarder résultats JSON
    if output_file:
        with open(output_file, 'w', encoding='utf-8') as f:
            json.dump(all_results, f, indent=2, ensure_ascii=False)
        print(f"\n💾 Résultats sauvegardés dans {output_file}")

if __name__ == "__main__":
    parser = argparse.ArgumentParser(description='Analyse les fichiers CSV DSA')
    parser.add_argument('--input-dir', required=True, help='Répertoire contenant les CSV DSA')
    parser.add_argument('--output', help='Fichier JSON de sortie (optionnel)')
    args = parser.parse_args()
    
    input_dir = Path(args.input_dir)
    if not input_dir.exists():
        print(f"❌ Répertoire introuvable: {input_dir}")
        exit(1)
    
    output_file = Path(args.output) if args.output else None
    analyze_directory(input_dir, output_file)


