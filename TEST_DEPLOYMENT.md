# Guide de Test du Déploiement

## Prérequis

1. **Docker et Docker Compose installés**
   ```bash
   docker --version
   docker-compose --version
   ```

2. **PostgreSQL accessible**
   - Soit sur l'hôte (localhost:5432)
   - Soit dans un container Docker
   - La variable `DATABASE_URL` dans `docker-compose.yml` doit être correcte

## Étapes de Test

### 1. Vérifier la Structure

Vérifiez que tous les fichiers nécessaires sont présents :

```bash
# Vérifier les Dockerfiles
ls backend/Dockerfile
ls frontend/Dockerfile

# Vérifier docker-compose.yml
ls docker-compose.yml

# Vérifier les fichiers essentiels
ls backend/package.json
ls frontend/package.json
ls backend/prisma/schema.prisma
ls frontend/nginx.conf
```

### 2. Arrêter les Containers Existants (si nécessaire)

Si vous avez des containers en cours d'exécution :

```bash
docker-compose down
```

### 3. Construire les Images

Construire les images Docker pour le backend et le frontend :

```bash
docker-compose build
```

**Note** : Cette étape peut prendre plusieurs minutes la première fois car elle télécharge les dépendances.

### 4. Démarrer les Services

Démarrer tous les services en arrière-plan :

```bash
docker-compose up -d
```

### 5. Vérifier le Statut des Containers

Vérifier que les containers sont bien démarrés :

```bash
docker-compose ps
```

Vous devriez voir :
- `dsa-backend` : Status `Up` et Health `healthy`
- `dsa-frontend` : Status `Up`

### 6. Voir les Logs

Vérifier les logs pour détecter d'éventuelles erreurs :

```bash
# Logs du backend
docker-compose logs backend

# Logs du frontend
docker-compose logs frontend

# Logs en temps réel
docker-compose logs -f
```

### 7. Tester le Backend

Tester l'endpoint de santé du backend :

```bash
# Depuis Windows PowerShell
curl http://localhost:3001/health

# Ou depuis un navigateur
# http://localhost:3001/health
```

Vous devriez recevoir :
```json
{"status":"ok","timestamp":"...","service":"dsa-dashboard-backend"}
```

### 8. Tester le Frontend

Ouvrir le navigateur et accéder à :
- **Frontend** : http://localhost
- **Health check via frontend** : http://localhost/health

### 9. Tester l'API via le Frontend

Le frontend devrait pouvoir accéder au backend via le proxy Nginx :

```bash
# Tester l'API via le proxy
curl http://localhost/api/health
```

### 10. Vérifier la Connexion à la Base de Données

Vérifier que le backend peut se connecter à PostgreSQL :

```bash
# Voir les logs du backend pour les erreurs de connexion
docker-compose logs backend | grep -i "database\|prisma\|error"
```

## Résolution de Problèmes

### Problème : Le backend ne démarre pas

**Vérifications** :
1. Vérifier les logs : `docker-compose logs backend`
2. Vérifier la connexion PostgreSQL : `DATABASE_URL` dans `docker-compose.yml`
3. Vérifier que PostgreSQL est accessible depuis Docker

**Solution** :
- Si PostgreSQL est sur l'hôte Windows, utilisez `host.docker.internal` dans `DATABASE_URL`
- Si PostgreSQL est dans Docker, utilisez le nom du service

### Problème : Le frontend affiche "Bad Gateway"

**Vérifications** :
1. Vérifier que le backend est démarré : `docker-compose ps`
2. Vérifier que le backend est healthy : `docker-compose ps backend`
3. Vérifier les logs du frontend : `docker-compose logs frontend`

**Solution** :
- Attendre que le backend soit healthy avant que le frontend démarre
- Vérifier que `nginx.conf` utilise le bon nom de service (`backend`)

### Problème : Erreur de build

**Vérifications** :
1. Vérifier les logs de build : `docker-compose build --no-cache`
2. Vérifier que tous les fichiers nécessaires sont présents

**Solution** :
- Reconstruire sans cache : `docker-compose build --no-cache`
- Vérifier la structure des dossiers

### Problème : Port 80 déjà utilisé

**Solution** :
- Changer le port dans `docker-compose.yml` :
  ```yaml
  ports:
    - "8080:80"  # Utiliser le port 8080 au lieu de 80
  ```

## Commandes Utiles

```bash
# Redémarrer un service
docker-compose restart backend
docker-compose restart frontend

# Redémarrer tous les services
docker-compose restart

# Arrêter tous les services
docker-compose down

# Arrêter et supprimer les volumes
docker-compose down -v

# Reconstruire sans cache
docker-compose build --no-cache

# Voir l'utilisation des ressources
docker stats

# Entrer dans un container
docker-compose exec backend sh
docker-compose exec frontend sh
```

## Checklist de Vérification

- [ ] Docker et Docker Compose installés
- [ ] Structure des fichiers correcte
- [ ] Images Docker construites sans erreur
- [ ] Containers démarrés (`docker-compose ps`)
- [ ] Backend healthy (`docker-compose ps backend`)
- [ ] Backend répond sur http://localhost:3001/health
- [ ] Frontend accessible sur http://localhost
- [ ] API accessible via http://localhost/api/health
- [ ] Pas d'erreurs dans les logs
- [ ] Dashboard affiche les données correctement

## Test Complet

Une fois que tout fonctionne, testez le dashboard complet :

1. Ouvrir http://localhost dans le navigateur
2. Vérifier que le dashboard se charge
3. Tester les filtres
4. Vérifier que les graphiques s'affichent
5. Vérifier que les données sont récupérées depuis la base de données

---

**Si tout fonctionne, votre déploiement est prêt ! 🎉**
