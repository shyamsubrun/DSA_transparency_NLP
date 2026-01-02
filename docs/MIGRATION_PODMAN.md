# Migration vers Podman/Buildah

Ce guide explique comment migrer le déploiement actuel (installation directe) vers Podman/Buildah.

## État actuel

Actuellement, le site est déployé en **installation directe** :
- Backend : Service systemd (`dsa-backend.service`)
- Frontend : Nginx installé sur la VM servant les fichiers de `/var/www/dsa-dashboard`
- Base de données : PostgreSQL sur la VM

## Migration vers Podman

### Prérequis

- Accès SSH à la VM
- Le swap file doit être configuré (déjà fait : 2GB)

### Étapes de migration

1. **Se connecter à la VM** :
```bash
ssh raouf.abdallah@35.223.190.104
```

2. **Mettre à jour le code** :
```bash
cd ~/dsa-dashboard
git pull origin main
```

3. **Exécuter le script de migration** :
```bash
chmod +x scripts/migrate_to_podman.sh
bash scripts/migrate_to_podman.sh
```

Le script va :
- ✅ Arrêter le service systemd backend
- ✅ Installer Podman/Buildah si nécessaire
- ✅ Créer le réseau Podman
- ✅ Builder les images avec Buildah
- ✅ Démarrer les containers backend et frontend
- ✅ Vérifier que tout fonctionne

### Vérification après migration

```bash
# Vérifier que les containers tournent
podman ps

# Vérifier les logs
podman logs dsa-backend
podman logs dsa-frontend

# Tester l'API
curl http://localhost/api/health
curl http://localhost/api/moderation/stats
```

### Commandes utiles

```bash
# Voir les logs en temps réel
podman logs -f dsa-backend
podman logs -f dsa-frontend

# Redémarrer les containers
podman restart dsa-backend dsa-frontend

# Arrêter les containers
podman stop dsa-backend dsa-frontend

# Voir le statut
podman ps
podman ps -a  # Tous les containers (y compris arrêtés)
```

### Retour en arrière (si nécessaire)

Si vous voulez revenir à l'installation directe :

```bash
# Arrêter les containers Podman
podman stop dsa-backend dsa-frontend
podman rm dsa-backend dsa-frontend

# Redémarrer le service systemd
sudo systemctl enable dsa-backend.service
sudo systemctl start dsa-backend.service

# Redémarrer Nginx
sudo systemctl restart nginx
```

## Avantages de Podman

- ✅ Isolation des applications
- ✅ Facilité de déploiement et mise à jour
- ✅ Reproducibilité
- ✅ Pas besoin de sudo (rootless)
- ✅ Compatible avec les images Docker

## Notes importantes

1. **Firewall GCP** : Assurez-vous que le port 80 est ouvert dans le firewall GCP pour accéder au site depuis l'extérieur.

2. **Connexion PostgreSQL** : Le backend dans le container utilise `host.containers.internal` pour accéder à PostgreSQL sur l'hôte. Si cela ne fonctionne pas, le script essaiera avec l'IP de la VM.

3. **Persistance** : Les containers sont configurés avec `--restart unless-stopped`, donc ils redémarreront automatiquement après un redémarrage de la VM.

4. **Mises à jour futures** : Pour mettre à jour le code :
   ```bash
   cd ~/dsa-dashboard
   git pull origin main
   bash scripts/migrate_to_podman.sh  # Rebuild et redémarre automatiquement
   ```

