#!/bin/bash
# Script de vérification du déploiement
# Usage: bash scripts/check_deployment.sh

set -e

echo "🔍 Vérification du déploiement DSA Dashboard"
echo "=============================================="

# Couleurs pour l'output
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

check_status() {
    if [ $1 -eq 0 ]; then
        echo -e "${GREEN}✅ $2${NC}"
        return 0
    else
        echo -e "${RED}❌ $2${NC}"
        return 1
    fi
}

echo ""
echo "1️⃣  Vérification des containers..."

# Vérifier que les containers tournent
BACKEND_RUNNING=$(podman ps --filter "name=dsa-backend" --format "{{.Names}}" | grep -c dsa-backend || echo "0")
FRONTEND_RUNNING=$(podman ps --filter "name=dsa-frontend" --format "{{.Names}}" | grep -c dsa-frontend || echo "0")

if [ "$BACKEND_RUNNING" -eq 1 ]; then
    check_status 0 "Backend container (dsa-backend) est en cours d'exécution"
else
    check_status 1 "Backend container (dsa-backend) n'est pas en cours d'exécution"
fi

if [ "$FRONTEND_RUNNING" -eq 1 ]; then
    check_status 0 "Frontend container (dsa-frontend) est en cours d'exécution"
else
    check_status 1 "Frontend container (dsa-frontend) n'est pas en cours d'exécution"
fi

echo ""
echo "2️⃣  Vérification de la santé du backend..."

# Vérifier le health check du backend
HEALTH_CHECK=$(curl -s -o /dev/null -w "%{http_code}" http://localhost:3001/health || echo "000")

if [ "$HEALTH_CHECK" = "200" ]; then
    check_status 0 "Backend health check: OK (HTTP $HEALTH_CHECK)"
    echo "   Response: $(curl -s http://localhost:3001/health)"
else
    check_status 1 "Backend health check: ÉCHEC (HTTP $HEALTH_CHECK)"
    echo "   Logs backend:"
    podman logs --tail 20 dsa-backend 2>/dev/null || echo "   Impossible de récupérer les logs"
fi

echo ""
echo "3️⃣  Vérification de l'accès frontend..."

# Vérifier que le frontend répond
FRONTEND_CHECK=$(curl -s -o /dev/null -w "%{http_code}" http://localhost/ || echo "000")

if [ "$FRONTEND_CHECK" = "200" ] || [ "$FRONTEND_CHECK" = "301" ] || [ "$FRONTEND_CHECK" = "302" ]; then
    check_status 0 "Frontend accessible: OK (HTTP $FRONTEND_CHECK)"
else
    check_status 1 "Frontend accessible: ÉCHEC (HTTP $FRONTEND_CHECK)"
    echo "   Logs frontend:"
    podman logs --tail 20 dsa-frontend 2>/dev/null || echo "   Impossible de récupérer les logs"
fi

echo ""
echo "4️⃣  Vérification de l'API via le proxy Nginx..."

# Vérifier l'API via le proxy
API_CHECK=$(curl -s -o /dev/null -w "%{http_code}" http://localhost/api/health || echo "000")

if [ "$API_CHECK" = "200" ]; then
    check_status 0 "API via proxy Nginx: OK (HTTP $API_CHECK)"
    echo "   Response: $(curl -s http://localhost/api/health)"
else
    check_status 1 "API via proxy Nginx: ÉCHEC (HTTP $API_CHECK)"
fi

echo ""
echo "5️⃣  Vérification des logs récents..."

echo ""
echo "📋 Logs backend (10 dernières lignes):"
podman logs --tail 10 dsa-backend 2>/dev/null || echo "   Aucun log disponible"

echo ""
echo "📋 Logs frontend (10 dernières lignes):"
podman logs --tail 10 dsa-frontend 2>/dev/null || echo "   Aucun log disponible"

echo ""
echo "6️⃣  Vérification de la connexion PostgreSQL..."

# Vérifier si le backend peut se connecter à PostgreSQL
# En regardant les logs pour les erreurs de connexion
PG_ERROR=$(podman logs dsa-backend 2>&1 | grep -i "error\|fatal\|connection" | tail -1 || echo "")

if [ -z "$PG_ERROR" ]; then
    check_status 0 "Pas d'erreur de connexion PostgreSQL détectée dans les logs"
else
    echo -e "${YELLOW}⚠️  Erreur PostgreSQL détectée:${NC}"
    echo "   $PG_ERROR"
fi

echo ""
echo "=============================================="
echo "✅ Vérification terminée!"
echo ""
echo "Pour voir les logs en temps réel:"
echo "  podman-compose logs -f"
echo ""
echo "Pour tester depuis l'extérieur:"
echo "  curl http://35.223.190.104/api/health"
echo "  curl http://35.223.190.104"

