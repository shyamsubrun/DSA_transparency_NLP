# Guide de Démo Buildah/Podman

## 🎯 Objectif de la démo

Démontrer le déploiement d'une application web (frontend + backend) avec **Buildah** et **Podman** sur une VM.

## 📋 Préparation avant la démo

### 1. Vérifier que tout fonctionne

```bash
# Se connecter à la VM
ssh raouf.abdallah@35.223.190.104

# Aller dans le répertoire du projet
cd ~/dsa-dashboard

# Exécuter le script de vérification
chmod +x scripts/verify_buildah_deployment.sh
bash scripts/verify_buildah_deployment.sh
```

### 2. Préparer les commandes à montrer

Avoir un terminal ouvert avec les commandes suivantes prêtes :

```bash
# Voir les images Buildah
sudo podman images

# Voir les containers en cours d'exécution
sudo podman ps

# Voir les logs en temps réel
sudo podman logs -f dsa-backend
sudo podman logs -f dsa-frontend

# Inspecter le réseau
sudo podman network inspect dsa-network

# Voir les informations d'un container
sudo podman inspect dsa-backend
```

## 🎬 Script de démo (5-10 minutes)

### Introduction (30 secondes)

"Bonjour, je vais vous présenter comment j'ai déployé mon application web avec **Buildah** et **Podman**.

Buildah est un outil pour construire des images de containers OCI, et Podman est un runtime de containers compatible avec Docker mais qui fonctionne en rootless."

---

### 1. Présentation de l'application (1 minute)

"Mon application est un dashboard DSA (Digital Services Act) composé de :
- **Frontend** : Application React avec Nginx
- **Backend** : API Node.js/Express avec Prisma ORM
- **Base de données** : PostgreSQL (sur la VM, pas containerisée)

L'application est accessible à l'adresse : **http://35.223.190.104**"

*[Ouvrir le navigateur et montrer l'application qui fonctionne]*

---

### 2. Architecture du déploiement (1 minute)

"J'ai utilisé une approche hybride :
- **Build local** : Les applications sont buildées directement sur la VM (pour éviter les timeouts npm)
- **Buildah** : Construction des images OCI à partir des builds locaux
- **Podman** : Exécution des containers en rootless (avec sudo pour les ports privilégiés)

Les deux containers communiquent via un réseau Podman (`dsa-network`)."

---

### 3. Vérification de l'état actuel (2 minutes)

#### 3.1 Vérifier Buildah et Podman

```bash
# Vérifier que Buildah est installé
buildah --version

# Vérifier que Podman est installé
podman --version
```

*[Expliquer] : "Buildah permet de construire des images sans daemon, et Podman est compatible avec Docker mais plus sécurisé car il peut fonctionner en rootless."*

#### 3.2 Voir les images Buildah

```bash
# Lister les images construites avec Buildah
sudo podman images
```

*[Montrer] : "On voit deux images : `localhost/dsa-backend:latest` et `localhost/dsa-frontend:latest`. Ces images ont été construites avec Buildah à partir de Dockerfiles."*

#### 3.3 Voir les containers en cours d'exécution

```bash
# Lister les containers actifs
sudo podman ps
```

*[Expliquer] : "On voit deux containers :
- `dsa-backend` : API Node.js sur le port 3001
- `dsa-frontend` : Nginx servant le frontend React sur le port 80

Les deux sont en cours d'exécution et utilisent le réseau `dsa-network`."*

---

### 4. Détails techniques Buildah (2-3 minutes)

#### 4.1 Processus de build avec Buildah

*[Montrer le Dockerfile.backend.local]*

```bash
# Montrer le Dockerfile utilisé
cat Dockerfile.backend.local
```

*[Expliquer] : "Le Dockerfile copie les fichiers pré-buildés (`node_modules` et `dist`) depuis la VM. Buildah construit l'image en utilisant ce Dockerfile."*

#### 4.2 Construction d'une image avec Buildah

*[Optionnel : Si vous voulez montrer le build en direct]*

```bash
# Construire l'image backend avec Buildah
buildah bud -f Dockerfile.backend.local -t dsa-backend:latest .

# Construire l'image frontend avec Buildah
buildah bud -f Dockerfile.frontend.local -t dsa-frontend:latest .
```

*[Expliquer] : "Buildah construit l'image couche par couche, comme Docker, mais sans daemon. C'est plus léger et plus sécurisé."*

#### 4.3 Transfert des images vers le contexte root

*[Expliquer] : "Comme j'utilise `sudo podman` pour les ports privilégiés, j'ai dû transférer les images du contexte rootless vers le contexte root :"*

```bash
# Exporter l'image vers une archive OCI
buildah push localhost/dsa-backend:latest oci-archive:/tmp/dsa-backend.tar

# Charger dans le contexte root
sudo podman load -i /tmp/dsa-backend.tar

# Tagger correctement
sudo podman tag <IMAGE_ID> localhost/dsa-backend:latest
```

---

### 5. Réseau Podman (1 minute)

#### 5.1 Inspecter le réseau

```bash
# Voir les détails du réseau
sudo podman network inspect dsa-network
```

*[Expliquer] : "Le réseau `dsa-network` permet aux containers de communiquer entre eux. Le frontend peut accéder au backend via le nom `dsa-backend` grâce à la résolution DNS intégrée."*

#### 5.2 Vérifier la connectivité

```bash
# Tester la connexion depuis le frontend vers le backend
sudo podman exec dsa-frontend ping -c 2 dsa-backend
```

*[Expliquer] : "Les containers peuvent se ping entre eux grâce au réseau Podman."*

---

### 6. Gestion des containers (1-2 minutes)

#### 6.1 Voir les logs

```bash
# Logs du backend
sudo podman logs --tail 20 dsa-backend

# Logs du frontend
sudo podman logs --tail 20 dsa-frontend
```

*[Expliquer] : "Podman permet de voir les logs facilement, comme Docker."*

#### 6.2 Redémarrer un container

```bash
# Redémarrer le backend
sudo podman restart dsa-backend

# Vérifier qu'il redémarre correctement
sudo podman ps
```

#### 6.3 Inspecter un container

```bash
# Voir toutes les informations d'un container
sudo podman inspect dsa-backend | less
```

*[Expliquer] : "On peut voir toutes les configurations : variables d'environnement, réseau, volumes, etc."*

---

### 7. Test de l'application (1 minute)

#### 7.1 Test du backend

```bash
# Health check direct
curl http://localhost:3001/health

# API stats
curl http://localhost:3001/api/moderation/stats
```

#### 7.2 Test du frontend via proxy

```bash
# Frontend
curl -I http://localhost/

# API via proxy Nginx
curl http://localhost/api/health
```

*[Expliquer] : "Le frontend sert les fichiers statiques et proxy les requêtes `/api/*` vers le backend."*

---

### 8. Avantages de Buildah/Podman (1 minute)

*[Résumer les avantages] :*

1. **Rootless** : Fonctionne sans privilèges root (sauf pour les ports privilégiés)
2. **Pas de daemon** : Buildah n'a pas besoin d'un daemon comme Docker
3. **Compatibilité** : Compatible avec les images Docker/OCI
4. **Sécurité** : Plus sécurisé que Docker (pas de daemon root)
5. **Léger** : Moins de dépendances que Docker

---

### 9. Script de vérification automatique (1 minute)

*[Montrer le script de vérification] :*

```bash
# Exécuter le script de vérification complet
bash scripts/verify_buildah_deployment.sh
```

*[Expliquer] : "Ce script vérifie automatiquement tous les aspects du déploiement : images, containers, réseau, ports, santé des services, etc."*

---

## 🎯 Points clés à retenir pour la démo

1. **Buildah** : Construction d'images OCI sans daemon
2. **Podman** : Runtime de containers rootless compatible Docker
3. **Approche hybride** : Build local + containerisation avec Buildah
4. **Réseau Podman** : Communication inter-containers via DNS
5. **Sécurité** : Rootless par défaut, sudo uniquement pour ports privilégiés

## 📝 Commandes rapides pour la démo

```bash
# Vérification complète
bash scripts/verify_buildah_deployment.sh

# Voir l'état
sudo podman ps
sudo podman images

# Logs
sudo podman logs -f dsa-backend

# Réseau
sudo podman network inspect dsa-network

# Test API
curl http://localhost/api/health
```

## ⚠️ En cas de problème pendant la démo

### Si un container ne démarre pas :

```bash
# Voir les logs d'erreur
sudo podman logs dsa-backend

# Redémarrer
sudo podman restart dsa-backend dsa-frontend
```

### Si le réseau ne fonctionne pas :

```bash
# Recréer le réseau
sudo podman network rm dsa-network
sudo podman network create dsa-network

# Redémarrer les containers
sudo podman restart dsa-backend dsa-frontend
```

### Si les images ne sont pas trouvées :

```bash
# Rebuild avec le script de migration
bash scripts/migrate_to_podman.sh
```

## 🎬 Conclusion

"Pour conclure, j'ai réussi à déployer mon application web avec Buildah et Podman. Cette approche offre plus de sécurité et de flexibilité que Docker, tout en restant compatible avec l'écosystème OCI.

L'application est maintenant accessible et fonctionnelle sur la VM."

---

**Durée totale estimée : 8-12 minutes**
