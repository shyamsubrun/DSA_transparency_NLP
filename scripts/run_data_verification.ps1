# ============================================================================
# Script PowerShell pour exécuter la vérification de complétude des données
# ============================================================================
# Ce script exécute le script SQL de vérification sur la base de données
# PostgreSQL et affiche les résultats.
# ============================================================================

param(
    [string]$DbHost = $(if ($env:DB_HOST) { $env:DB_HOST } else { "34.46.198.22" }),
    [int]$Port = $(if ($env:DB_PORT) { [int]$env:DB_PORT } else { 5432 }),
    [string]$Database = $(if ($env:DB_NAME) { $env:DB_NAME } else { "dsa" }),
    [string]$User = $(if ($env:DB_USER) { $env:DB_USER } else { "dsa_admin" }),
    [string]$File = "",
    [switch]$Help
)

# Fonction d'aide
function Show-Help {
    Write-Host @"
Usage: .\run_data_verification.ps1 [OPTIONS]

Exécute la vérification de complétude des données pour le dashboard DSA.

OPTIONS:
    -DbHost HOST        Host PostgreSQL (défaut: $DbHost)
    -Port PORT         Port PostgreSQL (défaut: $Port)
    -Database DB       Nom de la base de données (défaut: $Database)
    -User USER         Utilisateur PostgreSQL (défaut: $User)
    -File FILE         Chemin vers le script SQL
    -Help              Afficher cette aide

VARIABLES D'ENVIRONNEMENT:
    DB_HOST                 Host PostgreSQL
    DB_PORT                 Port PostgreSQL
    DB_NAME                 Nom de la base de données
    DB_USER                 Utilisateur PostgreSQL
    PGPASSWORD              Mot de passe PostgreSQL (si non fourni, psql demandera)

EXEMPLES:
    # Utiliser les valeurs par défaut
    .\run_data_verification.ps1

    # Spécifier le host et l'utilisateur
    .\run_data_verification.ps1 -DbHost localhost -User postgres

    # Utiliser une variable d'environnement pour le mot de passe
    `$env:PGPASSWORD="mon_mot_de_passe"; .\run_data_verification.ps1
"@
}

if ($Help) {
    Show-Help
    exit 0
}

# Déterminer le chemin du script SQL
$ScriptDir = Split-Path -Parent $MyInvocation.MyCommand.Path
$ProjectRoot = Split-Path -Parent $ScriptDir

if ([string]::IsNullOrEmpty($File)) {
    $SqlScript = Join-Path $ProjectRoot "database\verify_data_completeness.sql"
} else {
    $SqlScript = $File
}

# Vérifier que le script SQL existe
if (-not (Test-Path $SqlScript)) {
    Write-Host "Erreur: Le script SQL n'existe pas: $SqlScript" -ForegroundColor Red
    exit 1
}

# Vérifier que psql est disponible
try {
    $null = Get-Command psql -ErrorAction Stop
} catch {
    Write-Host "Erreur: psql n'est pas installé ou n'est pas dans le PATH" -ForegroundColor Red
    Write-Host "Installez PostgreSQL client pour utiliser ce script."
    exit 1
}

# Afficher les informations de connexion
Write-Host "============================================================================" -ForegroundColor Cyan
Write-Host "VÉRIFICATION DE COMPLÉTUDE DES DONNÉES" -ForegroundColor Cyan
Write-Host "============================================================================" -ForegroundColor Cyan
Write-Host ""
Write-Host "Configuration:" -ForegroundColor Yellow
Write-Host "  Host:     $DbHost"
Write-Host "  Port:     $Port"
Write-Host "  Database: $Database"
Write-Host "  User:     $User"
Write-Host "  Script:   $SqlScript"
Write-Host ""

# Demander confirmation si le mot de passe n'est pas fourni
if ([string]::IsNullOrEmpty($env:PGPASSWORD)) {
    Write-Host "Note: Le mot de passe sera demandé par psql" -ForegroundColor Yellow
    Write-Host ""
}

# Exécuter le script SQL
Write-Host "Exécution de la vérification..." -ForegroundColor Green
Write-Host ""

# Construire la commande psql
if (-not $env:PGPASSWORD) {
    $env:PGPASSWORD = ""
}

$psqlArgs = @(
    "-h", $DbHost
    "-p", $Port.ToString()
    "-d", $Database
    "-U", $User
    "-f", $SqlScript
    "--set", "ON_ERROR_STOP=off"
)

try {
    # Exécuter psql
    & psql @psqlArgs
    
    if ($LASTEXITCODE -eq 0) {
        Write-Host ""
        Write-Host "============================================================================" -ForegroundColor Green
        Write-Host "Vérification terminée avec succès" -ForegroundColor Green
        Write-Host "============================================================================" -ForegroundColor Green
        exit 0
    } else {
        Write-Host ""
        Write-Host "============================================================================" -ForegroundColor Red
        Write-Host "Erreur lors de l'exécution de la vérification" -ForegroundColor Red
        Write-Host "Code de sortie: $LASTEXITCODE" -ForegroundColor Red
        Write-Host "============================================================================" -ForegroundColor Red
        exit $LASTEXITCODE
    }
} catch {
    Write-Host ""
    Write-Host "Erreur lors de l'exécution: $_" -ForegroundColor Red
    exit 1
}

