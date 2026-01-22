# Scripts Utiles

Ce dossier contient les scripts pour la gestion de la base de données et la vérification du déploiement.

## Scripts de Base de Données

### `check_database.sh`
Vérifie les données dans la base de données PostgreSQL.

**Usage :**
```bash
bash scripts/check_database.sh
```

### `check_sync_status.sh`
Vérifie le statut de synchronisation entre les tables.

**Usage :**
```bash
bash scripts/check_sync_status.sh
```

### `verify_table_usage.sh`
Vérifie l'utilisation des tables et des triggers.

**Usage :**
```bash
bash scripts/verify_table_usage.sh
```

### `check_postgresql.sh`
Vérifie la connexion PostgreSQL.

**Usage :**
```bash
bash scripts/check_postgresql.sh
```

### `check_local_postgresql.sh`
Vérifie la connexion PostgreSQL locale.

**Usage :**
```bash
bash scripts/check_local_postgresql.sh
```

## Scripts de Vérification

### `check_deployment.sh`
Vérifie le statut du déploiement Docker.

**Usage :**
```bash
bash scripts/check_deployment.sh
```

**Vérifications :**
- Statut des containers Docker
- Santé du backend (health check)
- Accès frontend
- API via proxy Nginx
- Logs récents

### `check_vm_status.sh`
Vérifie le statut de la VM.

**Usage :**
```bash
bash scripts/check_vm_status.sh
```

### `complete_check.sh`
Vérification complète du système.

**Usage :**
```bash
bash scripts/complete_check.sh
```

## Scripts Python

### `import_to_postgresql.py`
Importe les données dans PostgreSQL.

**Usage :**
```bash
python scripts/import_to_postgresql.py
```

### `migrate_dsa_decisions_to_moderation_entries.py`
Migre les données DSA vers les entrées de modération.

**Usage :**
```bash
python scripts/migrate_dsa_decisions_to_moderation_entries.py
```

### `transform_dsa_to_dashboard.py`
Transforme les données DSA pour le dashboard.

**Usage :**
```bash
python scripts/transform_dsa_to_dashboard.py
```

### `analyze_dsa_data.py`
Analyse les données DSA.

**Usage :**
```bash
python scripts/analyze_dsa_data.py
```

### `run_data_verification.py`
Exécute la vérification des données.

**Usage :**
```bash
python scripts/run_data_verification.py
```

## Scripts PowerShell (Windows)

### `run_data_verification.ps1`
Version PowerShell du script de vérification.

**Usage :**
```powershell
.\scripts\run_data_verification.ps1
```

## Permissions

Sur Linux, rendre les scripts exécutables :

```bash
chmod +x scripts/*.sh
```

## Notes

- Les scripts utilisent `set -e` pour arrêter en cas d'erreur
- Les scripts vérifient les prérequis avant d'exécuter
- Les logs sont affichés pour faciliter le debugging
