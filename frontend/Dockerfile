# Stage 1: Build React app
FROM node:20-alpine AS builder

# Configurer npm avec timeout et retries augmentés
RUN npm config set fetch-timeout 600000 && \
    npm config set fetch-retries 10 && \
    npm config set fetch-retry-mintimeout 20000 && \
    npm config set fetch-retry-maxtimeout 120000

WORKDIR /app

# Copier les fichiers de dépendances
COPY package*.json ./
RUN npm ci

# Copier le code source
COPY src ./src
COPY public ./public
COPY index.html ./
COPY vite.config.ts ./
COPY tsconfig*.json ./

# Build pour production — Vite bake les variables VITE_* ici (les .env locaux ne sont pas lus sauf si copiés avant ce RUN).
# Par défaut: mock data + API relative /api (nginx → backend). Surcharger au build: docker compose build --build-arg VITE_USE_MOCK_DATA=false
ARG VITE_API_BASE_URL=/api
ARG VITE_USE_MOCK_DATA=true
ARG VITE_MOCK_DATA_SIZE=5000
ENV VITE_API_BASE_URL=$VITE_API_BASE_URL
ENV VITE_USE_MOCK_DATA=$VITE_USE_MOCK_DATA
ENV VITE_MOCK_DATA_SIZE=$VITE_MOCK_DATA_SIZE
RUN npm run build

# Stage 2: Serve with Nginx
FROM nginx:alpine

# Copier la configuration Nginx personnalisée
COPY nginx.conf /etc/nginx/conf.d/default.conf

# Copier les fichiers build depuis le stage builder
COPY --from=builder /app/dist /usr/share/nginx/html

EXPOSE 80

CMD ["nginx", "-g", "daemon off;"]
