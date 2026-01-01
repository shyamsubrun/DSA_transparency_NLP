# Structure du Projet DSA Dashboard

## Vue d'ensemble

Ce document décrit la structure complète du projet après nettoyage.

## Structure des dossiers

### `/backend` - Backend Node.js/Express

```
backend/
├── src/
│   ├── config/
│   │   └── database.ts          # Configuration Prisma Client
│   ├── controllers/
│   │   ├── filters.controller.ts
│   │   ├── moderation.controller.ts
│   │   └── verification.controller.ts
│   ├── routes/
│   │   ├── filters.routes.ts
│   │   ├── moderation.routes.ts
│   │   └── verification.routes.ts
│   ├── services/
│   │   ├── moderation.service.ts
│   │   └── verification.service.ts
│   ├── types/
│   │   └── api.types.ts         # Types TypeScript pour l'API
│   └── index.ts                 # Point d'entrée Express
├── prisma/
│   └── schema.prisma            # Schéma Prisma (modèles DB)
├── .env                         # Variables d'environnement (non versionné)
├── .gitignore                   # Règles Git pour backend
├── package.json                 # Dépendances backend
├── tsconfig.json                # Configuration TypeScript
└── node_modules/                # Dépendances npm (non versionné)
```

**Responsabilités** :
- API REST pour le frontend
- Gestion de la base de données via Prisma
- Logique métier et validation
- Endpoints de vérification des données

### `/src` - Frontend React

```
src/
├── components/
│   ├── KPICards/
│   │   ├── KPICard.tsx
│   │   └── KPICard.module.css
│   ├── Layout/
│   │   ├── Dashboard.tsx
│   │   ├── Dashboard.module.css
│   │   ├── FilterPanel.tsx
│   │   ├── FilterPanel.module.css
│   │   ├── Header.tsx
│   │   └── Header.module.css
│   └── Sections/
│       ├── OverviewSection.tsx
│       ├── TimeSeriesSection.tsx
│       ├── PlatformsSection.tsx
│       ├── ContentTypeSection.tsx
│       ├── GeographySection.tsx
│       ├── LegalGroundsSection.tsx
│       ├── AutomationSection.tsx
│       ├── DataQualitySection.tsx
│       └── Section.module.css
├── config/
│   └── queryClient.ts           # Configuration TanStack Query
├── context/
│   └── FilterContext.tsx        # Context React pour les filtres
├── data/
│   ├── dataService.ts           # Service API (appels backend)
│   ├── filterTypes.ts          # Types pour les filtres
│   └── types.ts                # Types TypeScript généraux
├── hooks/
│   ├── useFilteredData.ts      # Hook pour données filtrées
│   ├── useModeration.ts        # Hooks TanStack Query
│   └── useScreenSize.ts        # Hook pour responsive
├── styles/
│   ├── global.css              # Styles globaux
│   └── variables.css           # Variables CSS
├── utils/
│   └── chartConfig.ts          # Configuration ECharts
├── App.tsx                     # Composant racine
└── main.tsx                    # Point d'entrée React
```

**Responsabilités** :
- Interface utilisateur React
- Visualisations avec ECharts
- Gestion d'état avec React Query
- Filtres et interactions utilisateur

### `/database` - Scripts SQL

```
database/
├── create_optimized_schema.sql      # Création du schéma optimisé
├── add_sync_triggers.sql           # Triggers de synchronisation
├── migrate_batch_optimized.sql     # Migration batch optimisée
├── migrate_direct.sql              # Migration directe
├── fix_migration_function.sql      # Correctif fonction migration
├── fix_sequence_limits.sql         # Correctif limites séquences
├── verify_data_completeness.sql     # Vérification complétude données
├── verify_setup.sql                # Vérification setup
├── schema.sql                      # Schéma initial (obsolète)
└── test_sync_complete.sh           # Test synchronisation
```

**Responsabilités** :
- Scripts de migration de données
- Scripts de vérification
- Maintenance de la base de données

### `/scripts` - Scripts Utilitaires

```
scripts/
├── Python/
│   ├── analyze_dsa_data.py                    # Analyse données DSA
│   ├── transform_dsa_to_dashboard.py         # Transformation données
│   ├── import_to_postgresql.py                # Import PostgreSQL
│   └── migrate_dsa_decisions_to_moderation_entries.py
├── Shell (Linux/Mac)/
│   ├── check_postgresql.sh                    # Vérification PostgreSQL
│   ├── check_vm_status.sh                    # Vérification VM
│   ├── complete_check.sh                     # Vérification complète
│   ├── check_local_postgresql.sh             # Vérification locale
│   └── analyze_existing_table.sh             # Analyse table existante
├── PowerShell (Windows)/
│   └── run_data_verification.ps1              # Vérification données
└── Cross-platform/
    ├── run_data_verification.sh               # Vérification (shell)
    └── run_data_verification.py                # Vérification (Python)
```

**Responsabilités** :
- Scripts d'analyse et transformation
- Scripts de migration
- Scripts de vérification
- Utilitaires de maintenance

### `/docs` - Documentation

```
docs/
├── Guides/
│   ├── GUIDE_IMPORT_POSTGRESQL.md
│   ├── GUIDE_COMPLET_ETAPE_PAR_ETAPE.md
│   ├── GUIDE_VERIFICATION_COMPLETE.md
│   ├── DEPLOIEMENT_DOCKER_BUILDAH.md
│   └── VERIFICATION_GUIDE.md
├── Plans/
│   ├── BACKEND_PLAN.md
│   ├── DSA_BACKEND_PLAN_COMPLET.md
│   └── STRATEGIE_MIGRATION.md
├── Rapports/
│   ├── RAPPORT_VERIFICATION_FINALE.md
│   ├── ANALYSE_STOCKAGE_DSA.md
│   ├── ANALYSE_SITUATION_ACTUELLE.md
│   └── IMPLEMENTATION_COMPLETE.md
├── Solutions/
│   ├── SOLUTION_PROBLEME_SEQUENCE.md
│   ├── FIX_PERMISSIONS.md
│   └── fix_postgresql_connection.md
└── Utilitaires/
    ├── COMMANDES_RAPIDES.md
    ├── VERIFICATION_API.md
    ├── quick_check.md
    └── run_check_on_vm.md
```

**Responsabilités** :
- Documentation complète du projet
- Guides d'utilisation
- Rapports d'analyse
- Solutions aux problèmes

## Fichiers racine

### Configuration
- `package.json` - Dépendances frontend et scripts
- `vite.config.ts` - Configuration Vite
- `tsconfig.json` - Configuration TypeScript (racine)
- `tsconfig.app.json` - Configuration TypeScript (app)
- `tsconfig.node.json` - Configuration TypeScript (Node)
- `eslint.config.js` - Configuration ESLint
- `.gitignore` - Règles Git

### Docker
- `Dockerfile.backend` - Image Docker backend
- `Dockerfile.frontend` - Image Docker frontend
- `docker-compose.yml` - Orchestration Docker
- `nginx.conf` - Configuration Nginx

### Autres
- `index.html` - HTML racine
- `README.md` - Documentation principale
- `requirements.txt` - Dépendances Python (pour scripts)

## Fichiers exclus de Git

Les fichiers suivants sont exclus via `.gitignore` :

- `node_modules/` - Dépendances npm
- `dist/` - Build de production
- `.env` - Variables d'environnement
- `backend/.env` - Variables d'environnement backend
- `src/data/dsa-download/**/*.csv` - Données téléchargées
- `src/data/dsa-download/**/*.zip` - Archives téléchargées
- `__pycache__/` - Cache Python
- `*.log` - Fichiers de log

## Conventions de nommage

### Fichiers TypeScript/React
- Composants : `PascalCase.tsx` (ex: `Dashboard.tsx`)
- Hooks : `camelCase.ts` avec préfixe `use` (ex: `useModeration.ts`)
- Services : `camelCase.ts` (ex: `dataService.ts`)
- Types : `camelCase.ts` (ex: `api.types.ts`)
- Styles : `ComponentName.module.css`

### Fichiers SQL
- Migration : `migrate_*.sql`
- Vérification : `verify_*.sql`
- Correctif : `fix_*.sql`
- Création : `create_*.sql`

### Fichiers Scripts
- Python : `snake_case.py`
- Shell : `snake_case.sh`
- PowerShell : `PascalCase.ps1`

## Fichiers supprimés lors du nettoyage

- `src/App.debug.tsx` - Fichier de debug
- `src/App.simple.tsx` - Fichier de test simple
- `src/App.test.tsx` - Fichier de test
- `src/data/mockData.ts` - Données mockées (remplacées par API)
- `src/assets/react.svg` - Asset non utilisé
- `src/components/Charts/` - Dossier vide

## Maintenance

### Ajouter un nouveau composant
1. Créer dans `src/components/[Category]/`
2. Ajouter les styles `.module.css`
3. Exporter depuis le composant parent si nécessaire

### Ajouter un nouvel endpoint API
1. Créer le service dans `backend/src/services/`
2. Créer le contrôleur dans `backend/src/controllers/`
3. Créer la route dans `backend/src/routes/`
4. Enregistrer la route dans `backend/src/index.ts`

### Ajouter un nouveau script SQL
1. Créer dans `database/`
2. Nommer selon la convention (migrate_, verify_, fix_)
3. Documenter dans `docs/` si nécessaire

