# 🔧 Solution au Problème de Permissions

## Problème
```
psql: error: /home/raouf/create_optimized_schema.sql: Permission denied
```

## Solution 1 : Lire le fichier et l'exécuter via stdin (RECOMMANDÉ)

```bash
# Sur la VM, exécutez :
sudo -u postgres psql -d dsa < ~/create_optimized_schema.sql
```

## Solution 2 : Changer les permissions du fichier

```bash
# Rendre le fichier lisible par tous
chmod 644 ~/create_optimized_schema.sql
chmod 644 ~/add_sync_triggers.sql

# Puis exécuter
sudo -u postgres psql -d dsa -f ~/create_optimized_schema.sql
```

## Solution 3 : Copier dans /tmp

```bash
# Copier dans /tmp (accessible par tous)
cp ~/create_optimized_schema.sql /tmp/
cp ~/add_sync_triggers.sql /tmp/

# Exécuter depuis /tmp
sudo -u postgres psql -d dsa -f /tmp/create_optimized_schema.sql
```

