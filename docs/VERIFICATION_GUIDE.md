# Guide d'exécution de la vérification des données

## Options pour exécuter la vérification

### Option 1 : Utiliser psql (recommandé)

Si vous avez accès à `psql` (client PostgreSQL), vous pouvez exécuter directement le script SQL :

```bash
# Sur Linux/Mac
psql -h 34.46.198.22 -p 5432 -U dsa_admin -d dsa -f database/verify_data_completeness.sql

# Sur Windows (si psql est installé)
psql -h 34.46.198.22 -p 5432 -U dsa_admin -d dsa -f database\verify_data_completeness.sql
```

**Installer psql :**
- **Windows** : Téléchargez depuis [postgresql.org/download/windows](https://www.postgresql.org/download/windows/)
- **Linux (Ubuntu/Debian)** : `sudo apt-get install postgresql-client`
- **Mac** : `brew install postgresql`

### Option 2 : Utiliser le script PowerShell (Windows)

```powershell
$env:PGPASSWORD="Mohamed2025!"
.\scripts\run_data_verification.ps1 -DbHost 34.46.198.22 -Port 5432 -Database dsa -User dsa_admin
```

**Note** : Nécessite que `psql` soit installé et dans le PATH.

### Option 3 : Utiliser le script Python

Si vous avez Python et psycopg2 installés :

```bash
# Installer psycopg2
pip install psycopg2-binary

# Exécuter le script
python scripts/run_data_verification.py -H 34.46.198.22 -p 5432 -d dsa -U dsa_admin
```

### Option 4 : Exécuter via SSH sur la VM

Si vous avez accès SSH à la VM où se trouve PostgreSQL :

```bash
# Se connecter à la VM
ssh utilisateur@34.46.198.22

# Sur la VM, exécuter
sudo -u postgres psql -d dsa -f /chemin/vers/verify_data_completeness.sql
```

### Option 5 : Utiliser un outil GUI

Vous pouvez utiliser un outil graphique comme :
- **pgAdmin** : [pgadmin.org](https://www.pgadmin.org/)
- **DBeaver** : [dbeaver.io](https://dbeaver.io/)
- **DataGrip** : [jetbrains.com/datagrip](https://www.jetbrains.com/datagrip/)

Ouvrez le fichier `database/verify_data_completeness.sql` et exécutez-le dans l'éditeur SQL.

## Vérifications rapides via le backend

Vous pouvez aussi vérifier rapidement les données en utilisant le backend Node.js qui est déjà configuré. Créez un endpoint temporaire dans le backend pour exécuter quelques requêtes de vérification.

## Résultats attendus

Le script affichera :
1. **Tables de référence** : Nombre d'enregistrements dans chaque table
2. **Données principales** : Total d'entrées et couverture temporelle
3. **Champs obligatoires** : Vérification que tous les champs requis sont présents
4. **Complétude** : Pourcentage de complétude pour chaque champ optionnel
5. **Intégrité** : Vérification des relations (détection d'orphans)
6. **Distribution** : Répartition des données par dimension
7. **Vérifications spécifiques** : Pour chaque type de graphique
8. **Alertes** : Problèmes détectés

## Interprétation

- **Champs obligatoires** doivent être à 100% de complétude
- **Champs optionnels** devraient être > 50-80% selon leur importance
- **Alertes critiques** indiquent des problèmes à corriger

## Prochaines étapes

Après avoir exécuté la vérification :
1. Analyser les résultats pour identifier les lacunes
2. Si nécessaire, compléter les données manquantes
3. Réexécuter la vérification pour confirmer que tout est OK

