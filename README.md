# DSA Dashboard

Dashboard pour visualiser les données de modération DSA (Digital Services Act).

## Structure du projet

```
dsa-dashboard/
├── backend/          # API Node.js/Express avec Prisma
├── frontend/         # Application React/Vite
├── database/         # Scripts SQL et migrations
├── scripts/          # Scripts utilitaires
├── docs/             # Documentation
├── docker-compose.yml # Configuration Docker Compose
└── README.md
```

Pour plus de détails sur la structure, voir [PROJECT_STRUCTURE.md](PROJECT_STRUCTURE.md).

## Prérequis

- Docker et Docker Compose installés
- PostgreSQL (peut être dans un container ou sur l'hôte)

## Démarrage rapide

### Avec Docker Compose

```bash
# Construire et démarrer tous les services
docker-compose up -d --build

# Voir les logs
docker-compose logs -f

# Arrêter les services
docker-compose down
```

### Accès

- Frontend : http://localhost
- Backend API : http://localhost:3001
- Health check : http://localhost/health

## Configuration

### Variables d'environnement

Le fichier `docker-compose.yml` contient les variables d'environnement. Pour modifier la connexion à la base de données, éditez la variable `DATABASE_URL` dans le service `backend`.

### Base de données

Si PostgreSQL est sur l'hôte (pas dans Docker), utilisez `host.docker.internal` dans `DATABASE_URL` :

```yaml
DATABASE_URL=postgresql://user:password@host.docker.internal:5432/dbname
```

Si PostgreSQL est dans un container Docker, utilisez le nom du service :

```yaml
DATABASE_URL=postgresql://user:password@postgres:5432/dbname
```

## Développement

### Backend

```bash
cd backend
npm install
npm run dev
```

### Frontend

```bash
cd frontend
npm install
npm run dev
```

## Production

Les Dockerfiles utilisent un build multi-stage pour optimiser la taille des images. Les images de production ne contiennent que les dépendances nécessaires.

## Scripts utiles

- `docker-compose up -d` : Démarrer en arrière-plan
- `docker-compose logs -f backend` : Voir les logs du backend
- `docker-compose logs -f frontend` : Voir les logs du frontend
- `docker-compose restart backend` : Redémarrer le backend
- `docker-compose down -v` : Arrêter et supprimer les volumes
