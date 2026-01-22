# Structure du Projet

## Organisation

```
dsa-dashboard/
├── backend/                 # API Backend (Node.js/Express/Prisma)
│   ├── Dockerfile          # Image Docker pour le backend
│   ├── src/                # Code source TypeScript
│   │   ├── config/         # Configuration (database, etc.)
│   │   ├── controllers/   # Contrôleurs Express
│   │   ├── routes/         # Routes API
│   │   ├── services/       # Services métier
│   │   └── types/          # Types TypeScript
│   ├── prisma/             # Schéma Prisma et migrations
│   ├── package.json        # Dépendances Node.js
│   └── tsconfig.json       # Configuration TypeScript
│
├── frontend/               # Application Frontend (React/Vite)
│   ├── Dockerfile          # Image Docker pour le frontend
│   ├── nginx.conf          # Configuration Nginx
│   ├── src/                # Code source React
│   │   ├── components/     # Composants React
│   │   ├── data/           # Services de données et mock data
│   │   ├── hooks/          # Hooks React personnalisés
│   │   ├── styles/         # Styles CSS
│   │   └── utils/          # Utilitaires
│   ├── public/             # Fichiers statiques
│   ├── docs/               # Documentation frontend
│   ├── package.json        # Dépendances Node.js
│   └── vite.config.ts      # Configuration Vite
│
├── database/               # Scripts SQL et migrations
│   ├── schema.sql          # Schéma de base de données
│   ├── *.sql               # Scripts SQL divers
│   └── VERIFICATION_GUIDE.md
│
├── scripts/                 # Scripts utilitaires
│   ├── *.sh                # Scripts bash
│   ├── *.py                # Scripts Python
│   └── README.md           # Documentation des scripts
│
├── docs/                    # Documentation générale
│
├── docker-compose.yml       # Configuration Docker Compose
├── .dockerignore           # Fichiers ignorés par Docker
├── .gitignore              # Fichiers ignorés par Git
└── README.md               # Documentation principale
```

## Technologies

### Backend
- **Node.js** 20
- **Express** - Framework web
- **Prisma** - ORM pour PostgreSQL
- **TypeScript** - Langage de programmation

### Frontend
- **React** 19
- **Vite** - Build tool
- **TypeScript** - Langage de programmation
- **ECharts** - Graphiques
- **TanStack Query** - Gestion des données
- **Nginx** - Serveur web (production)

### Infrastructure
- **Docker** - Conteneurisation
- **Docker Compose** - Orchestration
- **PostgreSQL** - Base de données

## Commandes Utiles

### Développement

```bash
# Backend
cd backend
npm install
npm run dev

# Frontend
cd frontend
npm install
npm run dev
```

### Production avec Docker

```bash
# Construire et démarrer
docker-compose up -d --build

# Voir les logs
docker-compose logs -f

# Arrêter
docker-compose down
```

### Base de Données

```bash
# Vérifier les données
bash scripts/check_database.sh

# Vérifier la synchronisation
bash scripts/check_sync_status.sh
```

## Variables d'Environnement

### Backend
- `DATABASE_URL` - URL de connexion PostgreSQL
- `NODE_ENV` - Environnement (production/development)
- `PORT` - Port du serveur (défaut: 3001)

### Frontend
- `VITE_API_BASE_URL` - URL de l'API backend (défaut: /api)

## Ports

- **Frontend**: 80 (HTTP)
- **Backend**: 3001
- **PostgreSQL**: 5432 (si dans Docker)
