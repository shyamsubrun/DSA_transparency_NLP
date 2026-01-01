#!/bin/bash
# Déploiement sans Docker : Installation directe sur la VM
# Plus rapide et évite les problèmes de timeout npm dans les containers

set -e

echo "🚀 Déploiement sans Docker (installation directe)"
echo "=================================================="

cd ~/dsa-dashboard || {
    git clone https://github.com/raouf-rak/dsa-dashboard.git ~/dsa-dashboard
    cd ~/dsa-dashboard
}

git pull origin main

# 1. Installer Node.js si nécessaire
echo ""
echo "1️⃣  Installation de Node.js..."
if ! command -v node &> /dev/null; then
    echo "Installation de Node.js 20..."
    curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
    sudo apt-get install -y nodejs
else
    echo "✅ Node.js déjà installé: $(node --version)"
fi

# 2. Installer les dépendances backend
echo ""
echo "2️⃣  Installation des dépendances backend..."
cd ~/dsa-dashboard/backend

# Créer .env.production si nécessaire
if [ ! -f ".env.production" ]; then
    cat > .env.production << EOF
DATABASE_URL=postgresql://dsa_admin:Mohamed2025!@localhost:5432/dsa
NODE_ENV=production
PORT=3001
FRONTEND_URL=http://35.223.190.104
EOF
fi

# Installer avec retry
MAX_RETRIES=5
RETRY=0
while [ $RETRY -lt $MAX_RETRIES ]; do
    echo "Tentative $((RETRY + 1))/$MAX_RETRIES..."
    if npm install --fetch-timeout=600000 --fetch-retries=10; then
        echo "✅ Dépendances backend installées"
        break
    else
        RETRY=$((RETRY + 1))
        if [ $RETRY -lt $MAX_RETRIES ]; then
            echo "⚠️  Échec. Nouvelle tentative dans 30 secondes..."
            sleep 30
        else
            echo "❌ Impossible d'installer les dépendances après $MAX_RETRIES tentatives"
            exit 1
        fi
    fi
done

# Générer Prisma Client
echo ""
echo "3️⃣  Génération Prisma Client..."
npx prisma generate

# Build backend
echo ""
echo "4️⃣  Build backend..."
npm run build

# 3. Installer les dépendances frontend
echo ""
echo "5️⃣  Installation des dépendances frontend..."
cd ~/dsa-dashboard

MAX_RETRIES=5
RETRY=0
while [ $RETRY -lt $MAX_RETRIES ]; do
    echo "Tentative $((RETRY + 1))/$MAX_RETRIES..."
    if npm install --fetch-timeout=600000 --fetch-retries=10; then
        echo "✅ Dépendances frontend installées"
        break
    else
        RETRY=$((RETRY + 1))
        if [ $RETRY -lt $MAX_RETRIES ]; then
            echo "⚠️  Échec. Nouvelle tentative dans 30 secondes..."
            sleep 30
        else
            echo "❌ Impossible d'installer les dépendances après $MAX_RETRIES tentatives"
            exit 1
        fi
    fi
done

# Build frontend
echo ""
echo "6️⃣  Build frontend..."
export VITE_API_BASE_URL=/api
npm run build

# 4. Installer Nginx si nécessaire
echo ""
echo "7️⃣  Installation de Nginx..."
if ! command -v nginx &> /dev/null; then
    sudo apt-get update
    sudo apt-get install -y nginx
else
    echo "✅ Nginx déjà installé"
fi

# Configurer Nginx
echo ""
echo "8️⃣  Configuration de Nginx..."
sudo tee /etc/nginx/sites-available/dsa-dashboard > /dev/null << 'EOF'
server {
    listen 80;
    server_name _;

    root /home/raouf.abdallah/dsa-dashboard/dist;
    index index.html;

    # Frontend
    location / {
        try_files $uri $uri/ /index.html;
        
        location ~* \.(js|css|png|jpg|jpeg|gif|ico|svg|woff|woff2|ttf|eot)$ {
            expires 1y;
            add_header Cache-Control "public, immutable";
        }
    }

    # Proxy vers backend
    location /api/ {
        proxy_pass http://localhost:3001/api/;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_cache_bypass $http_upgrade;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }
}
EOF

# Activer le site
sudo ln -sf /etc/nginx/sites-available/dsa-dashboard /etc/nginx/sites-enabled/
sudo rm -f /etc/nginx/sites-enabled/default
sudo nginx -t && sudo systemctl reload nginx

# 5. Créer un service systemd pour le backend
echo ""
echo "9️⃣  Création du service systemd pour le backend..."
sudo tee /etc/systemd/system/dsa-backend.service > /dev/null << EOF
[Unit]
Description=DSA Dashboard Backend
After=network.target postgresql.service

[Service]
Type=simple
User=raouf.abdallah
WorkingDirectory=/home/raouf.abdallah/dsa-dashboard/backend
Environment="NODE_ENV=production"
EnvironmentFile=/home/raouf.abdallah/dsa-dashboard/backend/.env.production
ExecStart=/usr/bin/node dist/index.js
Restart=always
RestartSec=10

[Install]
WantedBy=multi-user.target
EOF

# Démarrer le service
sudo systemctl daemon-reload
sudo systemctl enable dsa-backend.service
sudo systemctl restart dsa-backend.service

# Attendre le démarrage
echo ""
echo "⏳ Attente du démarrage (10 secondes)..."
sleep 10

# Vérification
echo ""
echo "🔍 Vérification..."
echo ""
echo "Statut du service backend:"
sudo systemctl status dsa-backend.service --no-pager -l || true

echo ""
echo "Statut Nginx:"
sudo systemctl status nginx --no-pager -l || true

echo ""
echo "Test backend:"
curl -s http://localhost:3001/health || echo "❌ Backend non accessible"

echo ""
echo "Test frontend:"
curl -s -o /dev/null -w "HTTP %{http_code}\n" http://localhost/ || echo "❌ Frontend non accessible"

echo ""
echo "=============================================="
echo "✅ Déploiement terminé!"
echo ""
echo "🌐 Accès:"
echo "  - Frontend: http://35.223.190.104"
echo "  - Backend health: http://35.223.190.104/api/health"
echo ""
echo "📋 Commandes utiles:"
echo "  - Logs backend: sudo journalctl -u dsa-backend.service -f"
echo "  - Redémarrer backend: sudo systemctl restart dsa-backend.service"
echo "  - Redémarrer Nginx: sudo systemctl restart nginx"
echo "  - Statut: sudo systemctl status dsa-backend.service"

