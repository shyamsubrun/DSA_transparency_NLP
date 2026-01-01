# Déploiement - Prêt pour la VM

## ✅ Fichiers créés et modifiés

### Scripts de déploiement

- ✅ `scripts/setup_vm.sh` - Installation des outils sur la VM
- ✅ `scripts/deploy_podman.sh` - Déploiement avec Podman
- ✅ `scripts/check_deployment.sh` - Vérification du déploiement
- ✅ `scripts/dsa-dashboard.service` - Service systemd pour auto-start
- ✅ `scripts/README.md` - Documentation des scripts
- ✅ `deploy.sh` - Script de déploiement automatisé depuis local

### Documentation

- ✅ `docs/DEPLOYMENT_VM.md` - Guide complet de déploiement sur la VM

### Configuration

- ✅ `docker-compose.yml` - Mis à jour pour production (DATABASE_URL avec host.docker.internal)
- ✅ `.gitignore` - Mis à jour pour exclure `.env.production`

## 📋 Prochaines étapes sur la VM

### 1. Connexion à la VM

```bash
ssh raouf.abdallah@35.223.190.104
```

### 2. Installation des outils

```bash
cd ~
git clone https://github.com/raouf-rak/dsa-dashboard.git
cd dsa-dashboard
bash scripts/setup_vm.sh
```

### 3. Configuration

```bash
# Créer le fichier .env.production
cd backend
cat > .env.production << EOF
DATABASE_URL=postgresql://dsa_admin:Mohamed2025!@localhost:5432/dsa
NODE_ENV=production
PORT=3001
FRONTEND_URL=http://35.223.190.104
EOF
```

### 4. Déploiement

```bash
cd ~/dsa-dashboard
bash scripts/deploy_podman.sh
```

### 5. Vérification

```bash
bash scripts/check_deployment.sh
```

## 🔍 Vérifications à faire

### Sur la VM

- [ ] Buildah et Podman installés
- [ ] Port 80 ouvert dans le firewall
- [ ] Repository cloné
- [ ] Fichier `.env.production` créé
- [ ] Images buildées
- [ ] Containers démarrés
- [ ] Backend répond sur `/health`
- [ ] Frontend accessible

### Depuis l'extérieur

- [ ] `curl http://35.223.190.104/api/health` retourne OK
- [ ] `curl http://35.223.190.104` retourne le HTML
- [ ] Dashboard accessible dans le navigateur

## 🚀 Déploiement automatisé depuis local

Vous pouvez aussi utiliser le script `deploy.sh` depuis votre machine locale :

```bash
bash deploy.sh raouf.abdallah 35.223.190.104
```

Ce script :
1. Pousse le code vers GitHub
2. Se connecte à la VM
3. Met à jour le code
4. Rebuild et redémarre les containers
5. Vérifie le déploiement

## 📝 Notes importantes

### Connexion PostgreSQL

Le `docker-compose.yml` utilise `host.docker.internal` pour accéder à PostgreSQL. Si cela ne fonctionne pas sur la VM :

1. Utiliser l'IP de la VM dans `DATABASE_URL` :
   ```yaml
   DATABASE_URL=postgresql://dsa_admin:Mohamed2025!@35.223.190.104:5432/dsa
   ```

2. Ou utiliser `--network host` (moins sécurisé)

### Permissions des scripts

Sur la VM Linux, rendre les scripts exécutables :

```bash
chmod +x scripts/*.sh
chmod +x deploy.sh
```

### Service systemd (optionnel)

Pour le démarrage automatique au boot :

```bash
sudo cp scripts/dsa-dashboard.service /etc/systemd/system/
sudo systemctl daemon-reload
sudo systemctl enable dsa-dashboard.service
sudo systemctl start dsa-dashboard.service
```

## 🐛 Troubleshooting

Voir `docs/DEPLOYMENT_VM.md` pour le guide complet de troubleshooting.

## 📚 Documentation

- Guide complet : `docs/DEPLOYMENT_VM.md`
- Scripts : `scripts/README.md`
- Plan de déploiement : Voir le plan dans `.cursor/plans/`

