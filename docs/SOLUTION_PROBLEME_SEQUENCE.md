# 🔧 Solution au Problème de Séquence

## Problème Identifié

```
WARNING: nextval: reached maximum value of sequence "platforms_id_seq" (32767)
```

**Cause :** `SMALLSERIAL` ne peut aller que jusqu'à 32767. Il y a probablement plus de plateformes uniques (ou des problèmes de normalisation).

## Solution

### Étape 1 : Corriger le Schéma

```bash
# Copier le fichier de correction sur la VM
scp database/fix_sequence_limits.sql raouf@34.46.198.22:~/

# Sur la VM, appliquer la correction
sudo -u postgres psql -d dsa < ~/fix_sequence_limits.sql
```

**Ce que ça fait :**
- ✅ Change `SMALLSERIAL` → `SERIAL` (INTEGER, jusqu'à 2 milliards)
- ✅ Sauvegarde les données existantes
- ✅ Recrée les tables avec le bon type
- ✅ Restaure les données
- ✅ Réinitialise les séquences

### Étape 2 : Vider moderation_entries et Recommencer

```bash
sudo -u postgres psql -d dsa << 'SQL'
-- Vider la table pour recommencer proprement
TRUNCATE TABLE moderation_entries CASCADE;

-- Relancer la migration
SELECT * FROM sync_all_dsa_decisions();
SQL
```

## Alternative : Migration par Batch (Plus Rapide)

Si la migration ligne par ligne est trop lente, je peux créer une version qui utilise `INSERT ... SELECT` pour migrer par batch. Cela sera beaucoup plus rapide.

Voulez-vous que je crée cette version optimisée ?

