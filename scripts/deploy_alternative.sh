#!/bin/bash
# Solution alternative : Build local puis transfert, ou utilisation d'un miroir npm
# À exécuter sur la VM

set -e

echo "🔧 Solution alternative pour le déploiement"
echo "============================================"

cd ~/dsa-dashboard || {
    git clone https://github.com/raouf-rak/dsa-dashboard.git ~/dsa-dashboard
    cd ~/dsa-dashboard
}

git pull origin main

echo ""
echo "Option 1: Utiliser un miroir npm (recommandé)"
echo "---------------------------------------------"

# Créer des Dockerfiles avec miroir npm chinois (plus rapide depuis certaines régions)
cat > Dockerfile.backend.mirror << 'EOF'
# Stage 1: Build
FROM node:20-alpine AS builder

# Utiliser un miroir npm plus rapide
RUN npm config set registry https://registry.npmmirror.com && \
    npm config set fetch-timeout 600000 && \
    npm config set fetch-retries 10

WORKDIR /app/backend

COPY backend/package*.json ./
COPY backend/prisma ./prisma/

RUN npm ci

COPY backend/src ./src
COPY backend/tsconfig.json ./

RUN npx prisma generate
RUN npm run build

# Stage 2: Production
FROM node:20-alpine

RUN npm config set registry https://registry.npmmirror.com && \
    npm config set fetch-timeout 600000 && \
    npm config set fetch-retries 10

WORKDIR /app

COPY backend/package*.json ./
RUN npm ci --only=production

COPY backend/prisma ./prisma
RUN npx prisma generate

COPY --from=builder /app/backend/dist ./dist

ENV NODE_ENV=production
ENV PORT=3001

EXPOSE 3001

HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
  CMD node -e "require('http').get('http://localhost:3001/health', (r) => {process.exit(r.statusCode === 200 ? 0 : 1)})"

CMD ["node", "dist/index.js"]
EOF

cat > Dockerfile.frontend.mirror << 'EOF'
# Stage 1: Build React app
FROM node:20-alpine AS builder

# Utiliser un miroir npm plus rapide
RUN npm config set registry https://registry.npmmirror.com && \
    npm config set fetch-timeout 600000 && \
    npm config set fetch-retries 10

WORKDIR /app

COPY package*.json ./
RUN npm ci

COPY src ./src
COPY public ./public
COPY index.html ./
COPY vite.config.ts ./
COPY tsconfig*.json ./

ARG VITE_API_BASE_URL=/api
ENV VITE_API_BASE_URL=$VITE_API_BASE_URL
RUN npm run build

# Stage 2: Serve with Nginx
FROM nginx:alpine

COPY nginx.conf /etc/nginx/conf.d/default.conf
COPY --from=builder /app/dist /usr/share/nginx/html

EXPOSE 80

CMD ["nginx", "-g", "daemon off;"]
EOF

echo ""
echo "🔨 Build avec miroir npm..."
echo ""

# Utiliser les Dockerfiles avec miroir
cp Dockerfile.backend.mirror Dockerfile.backend
cp Dockerfile.frontend.mirror Dockerfile.frontend

# Build
podman-compose down 2>/dev/null || true
podman-compose build --no-cache

if [ $? -eq 0 ]; then
    echo ""
    echo "✅ Build réussi avec miroir npm!"
    echo ""
    echo "🚀 Démarrage des containers..."
    podman-compose up -d
    
    echo ""
    echo "⏳ Attente du démarrage (30 secondes)..."
    sleep 30
    
    echo ""
    echo "🔍 Vérification..."
    podman ps --filter "name=dsa-"
    echo ""
    echo "Backend health:"
    curl -s http://localhost:3001/health || echo "❌ Backend non accessible"
else
    echo ""
    echo "❌ Build échoué même avec miroir npm"
    echo ""
    echo "Option 2: Build sur votre machine locale puis transfert"
    echo "--------------------------------------------------------"
    echo "1. Build localement: docker build -t dsa-backend:latest -f Dockerfile.backend ."
    echo "2. Sauvegarder: docker save dsa-backend:latest | gzip > dsa-backend.tar.gz"
    echo "3. Transférer vers VM: scp dsa-backend.tar.gz user@vm:/tmp/"
    echo "4. Charger sur VM: podman load < dsa-backend.tar.gz"
fi

