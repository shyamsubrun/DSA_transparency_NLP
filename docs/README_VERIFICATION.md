# Vérification de Complétude des Données

Ce dossier contient les scripts pour vérifier que toutes les données nécessaires sont présentes dans la base de données PostgreSQL pour alimenter tous les graphiques du dashboard frontend.

## Fichiers

- `verify_data_completeness.sql` : Script SQL principal qui effectue toutes les vérifications
- `../scripts/run_data_verification.sh` : Script shell pour exécuter la vérification (Linux/Mac)
- `../scripts/run_data_verification.ps1` : Script PowerShell pour exécuter la vérification (Windows)

## Utilisation

### Sur Linux/Mac

```bash
# Utiliser les valeurs par défaut
./scripts/run_data_verification.sh

# Spécifier des paramètres personnalisés
./scripts/run_data_verification.sh -h localhost -U postgres -d dsa

# Avec mot de passe dans variable d'environnement
PGPASSWORD=mon_mot_de_passe ./scripts/run_data_verification.sh
```

### Sur Windows (PowerShell)

```powershell
# Utiliser les valeurs par défaut
.\scripts\run_data_verification.ps1

# Spécifier des paramètres personnalisés
.\scripts\run_data_verification.ps1 -Host localhost -User postgres -Database dsa

# Avec mot de passe dans variable d'environnement
$env:PGPASSWORD="mon_mot_de_passe"; .\scripts\run_data_verification.ps1
```

### Exécution directe avec psql

```bash
psql -h 34.46.198.22 -p 5432 -U dsa_admin -d dsa -f database/verify_data_completeness.sql
```

## Ce que le script vérifie

### 1. Tables de référence
- Compte les enregistrements dans chaque table de référence (platforms, categories, decision_types, decision_grounds, content_types)
- Affiche les valeurs disponibles dans chaque table

### 2. Données principales
- Total d'entrées dans `moderation_entries`
- Couverture temporelle (dates min/max, distribution par mois)
- Vérification des champs obligatoires (non NULL)

### 3. Complétude des champs optionnels
- Pourcentage de complétude pour chaque champ optionnel :
  - `content_date`
  - `content_type_id`
  - `automated_detection`
  - `automated_decision`
  - `country_code`
  - `language`
  - `delay_days`
  - `territorial_scope`

### 4. Intégrité référentielle
- Vérifie qu'il n'y a pas d'orphans (IDs de référence qui n'existent pas)
- Vérifie que toutes les relations sont valides

### 5. Distribution des données
- Distribution par plateforme
- Distribution par catégorie
- Distribution par type de décision
- Distribution par base légale
- Distribution par type de contenu

### 6. Vérifications spécifiques par graphique

#### Time Series
- Distribution mensuelle des données
- Actions par plateforme et mois
- Délai moyen par mois

#### Platforms
- Nombre de plateformes distinctes
- Décisions par plateforme et type
- Catégories par plateforme (pour radar chart)

#### Content Types
- Distribution des types de contenu
- Décisions par type de contenu
- Délai moyen par type de contenu

#### Geography
- Distribution par pays
- Distribution par langue
- Entrées avec territorial_scope

#### Automation
- Distribution de `automated_detection`
- Distribution de `automated_decision`
- Taux d'automatisation par plateforme
- Heatmap automation (plateforme × catégorie)

#### Legal Grounds
- Top 10 bases légales
- Catégories par base légale (pour treemap)

### 7. Rapport de complétude global
- Score de complétude pour chaque champ
- Pourcentage de complétude global

### 8. Alertes et recommandations
- Entrées avec champs obligatoires manquants
- Orphans détectés
- Couverture temporelle insuffisante
- Diversité des plateformes insuffisante

## Interprétation des résultats

### Champs obligatoires
Ces champs doivent avoir un taux de complétude de **100%** :
- `application_date`
- `platform_id`
- `category_id`
- `decision_type_id`
- `decision_ground_id`

### Champs optionnels recommandés
Pour que tous les graphiques fonctionnent correctement, ces champs devraient avoir un taux de complétude élevé :
- `content_type_id` : Recommandé > 50% pour les graphiques de types de contenu
- `automated_detection` : Recommandé > 80% pour les graphiques d'automatisation
- `automated_decision` : Recommandé > 80% pour les graphiques d'automatisation
- `country_code` : Recommandé > 50% pour les graphiques géographiques
- `language` : Recommandé > 50% pour les graphiques géographiques
- `delay_days` : Recommandé > 70% pour les graphiques de délais

### Alertes critiques
Le script génère des alertes si :
- Des entrées ont des champs obligatoires manquants
- Des orphans sont détectés (relations invalides)
- La couverture temporelle est insuffisante (< 3 mois)
- La diversité des plateformes est insuffisante (< 2 plateformes)

## Exemple de sortie

```
============================================================================
VÉRIFICATION DE COMPLÉTUDE DES DONNÉES POUR LE DASHBOARD DSA
============================================================================

1. VÉRIFICATION DES TABLES DE RÉFÉRENCE
----------------------------------------
table_name        | count
------------------+-------
Categories        | 12
Content Types     | 6
Decision Grounds  | 10
Decision Types    | 7
Platforms         | 8

2. VÉRIFICATION DES DONNÉES PRINCIPALES
--------------------------------------
Total entries: 150000
Date range: 2024-01-01 to 2024-12-31

3. VÉRIFICATION DES CHAMPS OBLIGATOIRES
----------------------------------------
field                    | missing_count | missing_percent
------------------------+---------------+----------------
application_date (NULL) | 0             | 0.00
platform_id (NULL)      | 0             | 0.00
...

4. COMPLÉTUDE DES CHAMPS OPTIONNELS
-----------------------------------
field                | present_count | missing_count | completeness_percent
---------------------+----------------+---------------+---------------------
content_date         | 120000         | 30000         | 80.00
content_type_id      | 90000          | 60000         | 60.00
...
```

## Dépannage

### Erreur de connexion
Si vous obtenez une erreur de connexion, vérifiez :
- Que PostgreSQL est accessible depuis votre machine
- Que les credentials sont corrects
- Que le firewall autorise les connexions sur le port PostgreSQL (5432)

### Erreur "psql: command not found"
Installez le client PostgreSQL :
- **Linux (Ubuntu/Debian)** : `sudo apt-get install postgresql-client`
- **Mac** : `brew install postgresql`
- **Windows** : Téléchargez depuis [postgresql.org](https://www.postgresql.org/download/windows/)

### Erreur de permissions
Assurez-vous que l'utilisateur PostgreSQL a les permissions de lecture sur toutes les tables nécessaires.

## Notes

- Le script utilise `ON_ERROR_STOP=off` pour continuer même en cas d'erreurs mineures
- Les résultats sont affichés directement dans la console
- Pour sauvegarder les résultats dans un fichier, utilisez la redirection : `./scripts/run_data_verification.sh > verification_report.txt`

