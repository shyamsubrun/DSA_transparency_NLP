#!/usr/bin/env python3
"""
Script Python pour exécuter la vérification de complétude des données
Ce script peut être utilisé si psql n'est pas disponible
"""

import os
import sys
import argparse
from pathlib import Path

try:
    import psycopg2
    from psycopg2.extras import RealDictCursor
except ImportError:
    print("Erreur: psycopg2 n'est pas installé.")
    print("Installez-le avec: pip install psycopg2-binary")
    sys.exit(1)


def execute_sql_file(conn, sql_file):
    """Exécute un fichier SQL et retourne les résultats"""
    with open(sql_file, 'r', encoding='utf-8') as f:
        sql_content = f.read()
    
    # Séparer les commandes SQL (en ignorant les \echo)
    commands = []
    current_command = []
    
    for line in sql_content.split('\n'):
        line = line.strip()
        if line.startswith('\\echo'):
            # Ignorer les commandes \echo pour l'instant
            continue
        elif line and not line.startswith('--'):
            current_command.append(line)
            if line.endswith(';'):
                commands.append('\n'.join(current_command))
                current_command = []
    
    if current_command:
        commands.append('\n'.join(current_command))
    
    results = []
    with conn.cursor(cursor_factory=RealDictCursor) as cur:
        for cmd in commands:
            if not cmd.strip():
                continue
            try:
                cur.execute(cmd)
                if cur.description:
                    # C'est une requête SELECT
                    rows = cur.fetchall()
                    if rows:
                        results.append({
                            'command': cmd[:100] + '...' if len(cmd) > 100 else cmd,
                            'rows': rows
                        })
                else:
                    # C'est une commande DDL/DML
                    conn.commit()
            except Exception as e:
                print(f"Erreur lors de l'exécution: {e}")
                print(f"Commande: {cmd[:200]}")
                continue
    
    return results


def print_results(results):
    """Affiche les résultats de manière lisible"""
    for result in results:
        if not result['rows']:
            continue
        
        # Afficher les en-têtes
        if result['rows']:
            headers = list(result['rows'][0].keys())
            print("\n" + " | ".join(headers))
            print("-" * (sum(len(h) for h in headers) + len(headers) * 3))
            
            # Afficher les données
            for row in result['rows'][:50]:  # Limiter à 50 lignes
                values = [str(row[h]) if row[h] is not None else 'NULL' for h in headers]
                print(" | ".join(values))
            
            if len(result['rows']) > 50:
                print(f"... ({len(result['rows']) - 50} lignes supplémentaires)")


def main():
    parser = argparse.ArgumentParser(
        description='Vérifie la complétude des données pour le dashboard DSA'
    )
    parser.add_argument('-H', '--host', default=os.getenv('DB_HOST', '35.223.190.104'),
                        help='Host PostgreSQL')
    parser.add_argument('-p', '--port', type=int, default=int(os.getenv('DB_PORT', '5432')),
                        help='Port PostgreSQL')
    parser.add_argument('-d', '--database', default=os.getenv('DB_NAME', 'dsa'),
                        help='Nom de la base de données')
    parser.add_argument('-U', '--user', default=os.getenv('DB_USER', 'dsa_admin'),
                        help='Utilisateur PostgreSQL')
    parser.add_argument('-f', '--file', default=None,
                        help='Chemin vers le script SQL')
    
    args = parser.parse_args()
    
    # Déterminer le chemin du script SQL
    script_dir = Path(__file__).parent
    project_root = script_dir.parent
    
    if args.file:
        sql_script = Path(args.file)
    else:
        sql_script = project_root / 'database' / 'verify_data_completeness.sql'
    
    if not sql_script.exists():
        print(f"Erreur: Le script SQL n'existe pas: {sql_script}")
        sys.exit(1)
    
    # Récupérer le mot de passe
    password = os.getenv('PGPASSWORD')
    if not password:
        import getpass
        password = getpass.getpass("Mot de passe PostgreSQL: ")
    
    # Afficher la configuration
    print("=" * 76)
    print("VÉRIFICATION DE COMPLÉTUDE DES DONNÉES")
    print("=" * 76)
    print()
    print("Configuration:")
    print(f"  Host:     {args.host}")
    print(f"  Port:     {args.port}")
    print(f"  Database: {args.database}")
    print(f"  User:     {args.user}")
    print(f"  Script:   {sql_script}")
    print()
    
    # Se connecter à la base de données
    try:
        conn = psycopg2.connect(
            host=args.host,
            port=args.port,
            database=args.database,
            user=args.user,
            password=password
        )
        
        print("Exécution de la vérification...")
        print()
        
        # Exécuter le script SQL
        results = execute_sql_file(conn, sql_script)
        
        # Afficher les résultats
        print_results(results)
        
        print()
        print("=" * 76)
        print("Vérification terminée avec succès")
        print("=" * 76)
        
        conn.close()
        
    except psycopg2.Error as e:
        print(f"Erreur de connexion à la base de données: {e}")
        sys.exit(1)
    except Exception as e:
        print(f"Erreur: {e}")
        sys.exit(1)


if __name__ == '__main__':
    main()

