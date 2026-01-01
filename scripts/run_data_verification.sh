#!/bin/bash

# ============================================================================
# Script pour exécuter la vérification de complétude des données
# ============================================================================
# Ce script exécute le script SQL de vérification sur la base de données
# PostgreSQL et affiche les résultats.
# ============================================================================

set -e  # Arrêter en cas d'erreur

# Couleurs pour l'affichage
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Configuration par défaut
DB_HOST="${DB_HOST:-35.223.190.104}"
DB_PORT="${DB_PORT:-5432}"
DB_NAME="${DB_NAME:-dsa}"
DB_USER="${DB_USER:-dsa_admin}"
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(cd "$SCRIPT_DIR/.." && pwd)"
SQL_SCRIPT="$PROJECT_ROOT/database/verify_data_completeness.sql"

# Fonction d'aide
show_help() {
    cat << EOF
Usage: $0 [OPTIONS]

Exécute la vérification de complétude des données pour le dashboard DSA.

OPTIONS:
    -h, --host HOST          Host PostgreSQL (défaut: $DB_HOST)
    -p, --port PORT         Port PostgreSQL (défaut: $DB_PORT)
    -d, --database DB       Nom de la base de données (défaut: $DB_NAME)
    -U, --user USER         Utilisateur PostgreSQL (défaut: $DB_USER)
    -f, --file FILE         Chemin vers le script SQL (défaut: $SQL_SCRIPT)
    --help                  Afficher cette aide

VARIABLES D'ENVIRONNEMENT:
    DB_HOST                 Host PostgreSQL
    DB_PORT                 Port PostgreSQL
    DB_NAME                 Nom de la base de données
    DB_USER                 Utilisateur PostgreSQL
    PGPASSWORD              Mot de passe PostgreSQL (si non fourni, psql demandera)

EXEMPLES:
    # Utiliser les valeurs par défaut
    $0

    # Spécifier le host et l'utilisateur
    $0 -h localhost -U postgres

    # Utiliser une variable d'environnement pour le mot de passe
    PGPASSWORD=mon_mot_de_passe $0

    # Spécifier un script SQL personnalisé
    $0 -f /chemin/vers/mon_script.sql
EOF
}

# Parser les arguments
while [[ $# -gt 0 ]]; do
    case $1 in
        -h|--host)
            DB_HOST="$2"
            shift 2
            ;;
        -p|--port)
            DB_PORT="$2"
            shift 2
            ;;
        -d|--database)
            DB_NAME="$2"
            shift 2
            ;;
        -U|--user)
            DB_USER="$2"
            shift 2
            ;;
        -f|--file)
            SQL_SCRIPT="$2"
            shift 2
            ;;
        --help)
            show_help
            exit 0
            ;;
        *)
            echo -e "${RED}Erreur: Option inconnue: $1${NC}" >&2
            echo ""
            show_help
            exit 1
            ;;
    esac
done

# Vérifier que le script SQL existe
if [[ ! -f "$SQL_SCRIPT" ]]; then
    echo -e "${RED}Erreur: Le script SQL n'existe pas: $SQL_SCRIPT${NC}" >&2
    exit 1
fi

# Vérifier que psql est disponible
if ! command -v psql &> /dev/null; then
    echo -e "${RED}Erreur: psql n'est pas installé ou n'est pas dans le PATH${NC}" >&2
    echo "Installez PostgreSQL client pour utiliser ce script."
    exit 1
fi

# Afficher les informations de connexion (sans le mot de passe)
echo -e "${BLUE}============================================================================${NC}"
echo -e "${BLUE}VÉRIFICATION DE COMPLÉTUDE DES DONNÉES${NC}"
echo -e "${BLUE}============================================================================${NC}"
echo ""
echo -e "${YELLOW}Configuration:${NC}"
echo "  Host:     $DB_HOST"
echo "  Port:     $DB_PORT"
echo "  Database: $DB_NAME"
echo "  User:     $DB_USER"
echo "  Script:   $SQL_SCRIPT"
echo ""

# Demander confirmation si le mot de passe n'est pas fourni
if [[ -z "$PGPASSWORD" ]]; then
    echo -e "${YELLOW}Note: Le mot de passe sera demandé par psql${NC}"
    echo ""
fi

# Exécuter le script SQL
echo -e "${GREEN}Exécution de la vérification...${NC}"
echo ""

# Exécuter psql avec le script SQL
# Utiliser PAGER=cat pour éviter la pagination interactive
export PAGER=cat

if psql \
    -h "$DB_HOST" \
    -p "$DB_PORT" \
    -d "$DB_NAME" \
    -U "$DB_USER" \
    -f "$SQL_SCRIPT" \
    --set ON_ERROR_STOP=off \
    --quiet \
    --tuples-only \
    --no-align \
    --field-separator='|'; then
    echo ""
    echo -e "${GREEN}============================================================================${NC}"
    echo -e "${GREEN}Vérification terminée avec succès${NC}"
    echo -e "${GREEN}============================================================================${NC}"
else
    EXIT_CODE=$?
    echo ""
    echo -e "${RED}============================================================================${NC}"
    echo -e "${RED}Erreur lors de l'exécution de la vérification${NC}"
    echo -e "${RED}Code de sortie: $EXIT_CODE${NC}"
    echo -e "${RED}============================================================================${NC}"
    exit $EXIT_CODE
fi

