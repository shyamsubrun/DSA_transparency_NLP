# Scripts de Déploiement

Ce dossier contient les scripts nécessaires pour déployer le dashboard DSA sur la VM.

## Scripts disponibles

### `setup_vm.sh`

Script d'installation des outils nécessaires sur la VM (Buildah, Podman, podman-compose).

**Usage :**
```bash
bash scripts/setup_vm.sh
```

**Fonctions :**
- Installe Buildah, Podman et podman-compose
- Vérifie les versions installées
- Configure Podman pour l'utilisateur

### `deploy_podman.sh`

Script de déploiement avec Podman. Build les images et démarre les containers.

**Usage :**
```bash
bash scripts/deploy_podman.sh
```

**Fonctions :**
- Build les images backend et frontend avec Buildah
- Crée le réseau Podman si nécessaire
- Démarre les containers backend et frontend
- Vérifie le statut des containers

### `check_deployment.sh`

Script de vérification complète du déploiement.

**Usage :**
```bash
bash scripts/check_deployment.sh
```

**Vérifications :**
- Statut des containers (backend et frontend)
- Santé du backend (health check)
- Accès frontend
- API via proxy Nginx
- Logs récents
- Connexion PostgreSQL

### `dsa-dashboard.service`

Fichier de service systemd pour le démarrage automatique au boot.

**Installation :**
```bash
sudo cp scripts/dsa-dashboard.service /etc/systemd/system/
sudo systemctl daemon-reload
sudo systemctl enable dsa-dashboard.service
sudo systemctl start dsa-dashboard.service
```

## Utilisation sur la VM

### Première installation

1. Cloner le repository :
   ```bash
   cd ~
   git clone https://github.com/raouf-rak/dsa-dashboard.git
   cd dsa-dashboard
   ```

2. Installer les outils :
   ```bash
   bash scripts/setup_vm.sh
   ```

3. Créer le fichier `.env.production` :
   ```bash
   cd backend
   nano .env.production
   # Ajouter les variables d'environnement
   ```

4. Déployer :
   ```bash
   cd ~/dsa-dashboard
   bash scripts/deploy_podman.sh
   ```

5. Vérifier :
   ```bash
   bash scripts/check_deployment.sh
   ```

### Mise à jour

```bash
cd ~/dsa-dashboard
git pull origin main
bash scripts/deploy_podman.sh
bash scripts/check_deployment.sh
```

## Permissions

Sur Linux, rendre les scripts exécutables :

```bash
chmod +x scripts/*.sh
```

## Notes

- Les scripts utilisent `set -e` pour arrêter en cas d'erreur
- Les scripts vérifient les prérequis avant d'exécuter
- Les logs sont affichés pour faciliter le debugging

