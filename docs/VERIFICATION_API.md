# Vérification des données via l'API Backend

Une nouvelle route API a été ajoutée au backend pour vérifier la complétude des données sans avoir besoin d'installer `psql` ou d'autres outils.

## Utilisation

### 1. Démarrer le backend

Assurez-vous que le backend est en cours d'exécution :

```bash
cd backend
npm run dev
```

### 2. Appeler l'endpoint de vérification

#### Avec curl (Linux/Mac/Git Bash)

```bash
curl http://localhost:3001/api/verification
```

#### Avec PowerShell (Windows)

```powershell
Invoke-RestMethod -Uri http://localhost:3001/api/verification -Method Get | ConvertTo-Json -Depth 10
```

#### Avec le navigateur

Ouvrez simplement : `http://localhost:3001/api/verification`

#### Avec JavaScript/Fetch

```javascript
fetch('http://localhost:3001/api/verification')
  .then(res => res.json())
  .then(data => console.log(data));
```

## Format de la réponse

La réponse JSON contient :

```json
{
  "referenceTables": {
    "platforms": 8,
    "categories": 12,
    "decisionTypes": 7,
    "decisionGrounds": 10,
    "contentTypes": 6
  },
  "mainData": {
    "totalEntries": 150000,
    "dateRange": {
      "min": "2024-01-01",
      "max": "2024-12-31"
    },
    "monthsCoverage": 12
  },
  "requiredFields": {
    "applicationDate": { "missing": 0, "percent": 0 },
    "platformId": { "missing": 0, "percent": 0 },
    "categoryId": { "missing": 0, "percent": 0 },
    "decisionTypeId": { "missing": 0, "percent": 0 },
    "decisionGroundId": { "missing": 0, "percent": 0 }
  },
  "optionalFields": {
    "contentDate": { "present": 120000, "missing": 30000, "percent": 80 },
    "contentTypeId": { "present": 90000, "missing": 60000, "percent": 60 },
    "automatedDetection": { "present": 135000, "missing": 15000, "percent": 90 },
    "automatedDecision": { "present": 120000, "missing": 30000, "percent": 80 },
    "countryCode": { "present": 100000, "missing": 50000, "percent": 66.67 },
    "language": { "present": 110000, "missing": 40000, "percent": 73.33 },
    "delayDays": { "present": 105000, "missing": 45000, "percent": 70 },
    "territorialScope": { "present": 80000, "missing": 70000, "percent": 53.33 }
  },
  "integrity": {
    "orphanPlatforms": 0,
    "orphanCategories": 0,
    "orphanDecisionTypes": 0,
    "orphanDecisionGrounds": 0,
    "orphanContentTypes": 0
  },
  "distribution": {
    "platforms": [
      { "name": "Meta", "count": 50000, "percent": 33.33 },
      { "name": "TikTok", "count": 30000, "percent": 20 }
    ],
    "categories": [...],
    "decisionTypes": [...],
    "decisionGrounds": [...],
    "contentTypes": [...]
  },
  "alerts": [
    "Couverture temporelle insuffisante: seulement 2 mois de données"
  ]
}
```

## Interprétation

### Champs obligatoires
- Doivent être à **0%** de valeurs manquantes
- Si > 0%, c'est un problème critique

### Champs optionnels
- **> 80%** : Excellent
- **50-80%** : Acceptable
- **< 50%** : À améliorer pour certains graphiques

### Alertes
Les alertes indiquent des problèmes à corriger :
- Champs obligatoires manquants
- Orphans détectés (relations invalides)
- Couverture temporelle insuffisante (< 3 mois)
- Diversité des plateformes insuffisante (< 2 plateformes)

## Exemple d'utilisation avec jq (pour formater la sortie)

```bash
curl http://localhost:3001/api/verification | jq '.'
```

## Sauvegarder le rapport

```bash
curl http://localhost:3001/api/verification > verification_report.json
```

## Intégration dans le frontend

Vous pouvez aussi créer une page dans le dashboard pour afficher ces résultats de vérification en temps réel.

