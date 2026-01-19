# Branche Mock Data

Cette branche (`mockdata`) utilise des données mockées au lieu de récupérer les données depuis le backend/BDD.

## Fonctionnalités

- ✅ **5000 entrées de modération mockées** générées aléatoirement
- ✅ **Filtrage côté client** : tous les filtres fonctionnent (dates, plateformes, catégories, etc.)
- ✅ **Pagination** : support complet de la pagination
- ✅ **KPIs calculés** : statistiques calculées dynamiquement depuis les données mockées
- ✅ **Options de filtres** : extraites automatiquement des données mockées
- ✅ **Aucun backend requis** : fonctionne complètement en mode standalone

## Comment utiliser

### Activer/Désactiver les mock data

Dans `src/data/dataService.ts`, modifiez la constante :

```typescript
// Set to true to use mock data, false to use real API
const USE_MOCK_DATA = true;  // ← Changez ici
```

### Données mockées

Les données sont générées dans `src/data/mockData.ts` avec :
- **5000 entrées** de modération
- **Dates** : entre 2023-01-01 et 2025-12-31
- **Plateformes** : Meta, TikTok, X, YouTube, LinkedIn, Snapchat, Pinterest, Amazon
- **Catégories** : Hate Speech, Harassment, Misleading Information, etc.
- **Types de décision** : Removal, Visibility Restriction, Account Suspension, etc.
- **Pays** : tous les pays de l'UE
- **Détection/Decision automatisées** : valeurs booléennes aléatoires

### Filtrage

Le filtrage est effectué côté client sur les données mockées. Tous les filtres sont supportés :
- Date range
- Plateformes
- Catégories
- Types de décision
- Bases légales
- Pays
- Types de contenu
- Détection/Decision automatisées

### Performance

- **Délai simulé** : 200-300ms pour simuler les appels API
- **Filtrage** : instantané sur les données en mémoire
- **Pagination** : efficace avec slice sur les données filtrées

## Avantages

1. **Développement frontend** : Pas besoin de backend/BDD pour développer
2. **Tests** : Facile de tester différentes configurations de données
3. **Démo** : Parfait pour des démonstrations sans dépendances
4. **Performance** : Pas de latence réseau, filtrage instantané

## Structure des fichiers

```
src/data/
├── mockData.ts          # Génération et gestion des mock data
├── dataService.ts       # Service qui bascule entre mock/API
└── types.ts            # Types TypeScript partagés
```

## Retour à l'API réelle

Pour revenir à l'API réelle, changez simplement :

```typescript
const USE_MOCK_DATA = false;
```

Tout le reste du code reste identique, les hooks et composants fonctionnent de la même manière.

