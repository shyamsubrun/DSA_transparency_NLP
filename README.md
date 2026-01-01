# DSA Transparency Dashboard

Dashboard interactif pour visualiser et analyser les données du DSA Transparency Database de l'Union Européenne.

## 🎯 Fonctionnalités

- 📊 Visualisation interactive des données de modération
- 🔍 Filtres avancés (plateformes, catégories, dates, pays, etc.)
- 📈 Graphiques ECharts (time series, radar, heatmaps, etc.)
- 🎨 Interface responsive (mobile, tablette, desktop)
- ⚡ Performance optimisée avec React Query
- 🐳 Déploiement avec Docker/Buildah

## 🏗️ Architecture

### Frontend (`src/`)
- **React 19** + **TypeScript**
- **Vite** - Build tool
- **TanStack Query** - Gestion des données et cache
- **ECharts** - Visualisations
- **Lucide React** - Icônes
- Structure : `components/`, `hooks/`, `data/`, `styles/`, `utils/`

### Backend (`backend/`)
- **Node.js** + **Express**
- **Prisma** - ORM PostgreSQL
- **TypeScript**
- Structure : `controllers/`, `routes/`, `services/`, `config/`, `types/`

### Database (`database/`)
- **PostgreSQL** (35.223.190.104:5432)
- 399K+ entrées de modération
- Tables normalisées avec indexes optimisés
- Scripts SQL pour migration et vérification

### Documentation (`docs/`)
- Tous les fichiers de documentation sont organisés dans `docs/`
- Guides, plans, rapports et vérifications

## 📁 Structure du Projet

```
dsa-dashboard/
├── backend/          # Backend Node.js/Express/Prisma
├── database/        # Scripts SQL (migrations, vérifications)
├── docs/            # Documentation complète
├── scripts/         # Scripts utilitaires (Python, Shell, PowerShell)
├── src/             # Frontend React
├── public/          # Assets publics
└── README.md        # Ce fichier
```

## 🚀 Démarrage Rapide

### Prérequis
- Node.js 20+
- npm ou yarn
- Docker (optionnel, pour le déploiement)
- PostgreSQL (distant ou local)

### Installation

```bash
# Cloner le repo
git clone <url>
cd dsa-dashboard

# Installer les dépendances frontend
npm install

# Installer les dépendances backend
cd backend
npm install
cd ..
cd backend
npm install

# Générer Prisma Client
npm run prisma:generate
```

### Configuration

Créer un fichier `.env.local` à la racine :
```env
VITE_API_BASE_URL=http://localhost:3001/api
```

Créer un fichier `backend/.env` :
```env
DATABASE_URL="postgresql://dsa_admin:PASSWORD@35.223.190.104:5432/dsa"
PORT=3001
NODE_ENV=development
FRONTEND_URL=http://localhost:5173
```

### Développement

```bash
# Terminal 1 : Démarrer le backend
cd backend
npm run dev

# Terminal 2 : Démarrer le frontend
npm run dev
```

Accéder au dashboard : http://localhost:5173

## 🐳 Déploiement avec Docker

### En local (Docker)

```bash
# Build et run
docker-compose up --build

# Accéder au dashboard
# http://localhost
```

### Sur VM avec Buildah/Podman

```bash
# Sur la VM
cd ~/dsa-dashboard

# Build avec Buildah
buildah bud -f Dockerfile.backend -t dsa-backend:latest .
buildah bud -f Dockerfile.frontend --build-arg VITE_API_BASE_URL=/api -t dsa-frontend:latest .

# Ou utiliser podman-compose
podman-compose up -d --build

# Vérifier les logs
podman-compose logs -f

# Vérifier le statut
podman-compose ps
```

### Commandes utiles

```bash
# Arrêter les containers
podman-compose down

# Rebuild un service
podman-compose up -d --build backend

# Voir les logs d'un service
podman logs -f dsa-backend

# Accéder au shell d'un container
podman exec -it dsa-backend sh
```

## 📁 Structure du Projet

```
dsa-dashboard/
├── backend/                    # Backend Node.js/Express/Prisma
│   ├── src/
│   │   ├── index.ts            # Point d'entrée Express
│   │   ├── config/             # Configuration (Prisma)
│   │   ├── routes/             # Routes API
│   │   ├── controllers/        # Contrôleurs
│   │   ├── services/           # Logique métier
│   │   └── types/              # Types TypeScript
│   ├── prisma/
│   │   └── schema.prisma       # Schéma database
│   └── package.json
├── database/                   # Scripts SQL
│   ├── *.sql                   # Scripts de migration et vérification
│   └── *.sh                    # Scripts shell
├── docs/                       # Documentation complète
│   └── *.md                    # Guides, plans, rapports
├── scripts/                     # Scripts utilitaires
│   ├── *.py                    # Scripts Python
│   ├── *.sh                    # Scripts shell
│   └── *.ps1                   # Scripts PowerShell
├── src/                        # Frontend React
│   ├── components/             # Composants React
│   ├── data/                   # Services data et types
│   ├── hooks/                  # Custom hooks
│   ├── context/                # React Context
│   ├── styles/                 # CSS modules
│   └── utils/                  # Utilitaires (chartConfig)
├── public/                     # Assets publics
├── Dockerfile.backend          # Docker backend
├── Dockerfile.frontend         # Docker frontend
├── docker-compose.yml          # Orchestration
├── nginx.conf                  # Config Nginx
└── package.json
```

## 🔌 API Endpoints

### Backend API

- `GET /health` - Health check
- `GET /api/moderation` - Liste des entrées (avec filtres et pagination)
- `GET /api/moderation/stats` - KPI statistiques
- `GET /api/filters` - Options de filtres
- `GET /api/verification` - Rapport de vérification des données

### Exemples de requêtes

```bash
# Health check
curl http://localhost:3001/health

# Récupérer les filtres
curl http://localhost:3001/api/filters

# Récupérer les données (paginé)
curl "http://localhost:3001/api/moderation?page=1&limit=100"

# Filtrer par plateforme
curl "http://localhost:3001/api/moderation?platforms=Meta&platforms=TikTok"

# Filtrer par dates
curl "http://localhost:3001/api/moderation?startDate=2024-01-01&endDate=2024-12-31"

# Statistiques
curl http://localhost:3001/api/moderation/stats
```

## 📊 Base de Données

### Tables Principales

- `moderation_entries` - Données de modération (399K+ lignes)
- `platforms` - Plateformes (56)
- `categories` - Catégories (15)
- `decision_types` - Types de décision (5)
- `decision_grounds` - Fondements légaux (3)
- `content_types` - Types de contenu (5)

### Synchronisation

La table `moderation_entries` est automatiquement synchronisée depuis `dsa_decisions` via des triggers PostgreSQL.

## 🔧 Développement

### Scripts disponibles

#### Frontend
```bash
npm run dev          # Démarrer Vite dev server
npm run build        # Build production
npm run preview      # Preview build
npm run lint         # Linter
```

#### Backend
```bash
npm run dev                # Démarrer avec tsx watch
npm run build              # Compiler TypeScript
npm run start              # Démarrer build
npm run prisma:generate    # Générer Prisma Client
npm run prisma:studio      # Ouvrir Prisma Studio
```

## 🚀 Déploiement en Production

### Checklist

- [ ] Variables d'environnement configurées
- [ ] Backend testé localement
- [ ] Frontend build testé
- [ ] Docker images buildées et testées
- [ ] Accès SSH à la VM configuré
- [ ] PostgreSQL accessible depuis la VM

### Étapes

1. **Push le code sur Git**
   ```bash
   git add .
   git commit -m "feat: complete dashboard with backend"
   git push origin main
   ```

2. **Sur la VM**
   ```bash
   # Cloner le repo
   git clone <url> ~/dsa-dashboard
   cd ~/dsa-dashboard
   
   # Build et démarrer
   podman-compose up -d --build
   
   # Vérifier
   podman-compose ps
   podman-compose logs -f
   ```

3. **Accéder au dashboard**
   - http://35.223.190.104

## 📝 Notes

- Le backend nécessite une connexion à PostgreSQL sur `35.223.190.104:5432`
- Les données sont mises à jour automatiquement via les triggers PostgreSQL
- Le cache React Query est configuré pour 5 minutes
- Nginx sert le frontend et reverse-proxy le backend

## 🐛 Troubleshooting

### Backend ne démarre pas
```bash
# Vérifier les logs
podman logs dsa-backend

# Vérifier la connexion DB
podman exec -it dsa-backend sh
node -e "require('@prisma/client').PrismaClient().then(p => p.$connect())"
```

### Frontend ne charge pas les données
- Vérifier que le backend est démarré (`podman ps`)
- Vérifier l'URL de l'API dans `.env.local`
- Ouvrir la console navigateur pour voir les erreurs

### Erreur de connexion PostgreSQL
- Vérifier que la VM peut accéder à `35.223.190.104:5432`
- Vérifier les credentials dans `backend/.env`
- Tester la connexion : `telnet 35.223.190.104 5432`

## 📚 Documentation Supplémentaire

Toute la documentation est disponible dans le dossier [`docs/`](./docs/) :

- [DEPLOIEMENT_DOCKER_BUILDAH.md](./docs/DEPLOIEMENT_DOCKER_BUILDAH.md) - Guide complet Docker/Buildah
- [GUIDE_IMPORT_POSTGRESQL.md](./docs/GUIDE_IMPORT_POSTGRESQL.md) - Guide d'import des données
- [VERIFICATION_API.md](./docs/VERIFICATION_API.md) - Guide de vérification des données via API
- [CLEANUP_SUMMARY.md](./docs/CLEANUP_SUMMARY.md) - Résumé du nettoyage du projet
- [ADAPTATION_DONNEES_REELLES.md](./docs/ADAPTATION_DONNEES_REELLES.md) - Adaptation aux données réelles

## 👥 Auteurs

- Dashboard Frontend & Backend
- Base de données PostgreSQL configurée par équipe

## 📄 Licence

MIT
