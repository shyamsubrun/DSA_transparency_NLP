#!/bin/bash
# Script de vérification complète du déploiement Buildah/Podman
# Usage: bash scripts/verify_buildah_deployment.sh
# Pour la démo Buildah

set -e

echo "🔍 Vérification complète du déploiement Buildah/Podman"
echo "======================================================"
echo ""

# Couleurs
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

# Compteurs
PASSED=0
FAILED=0
WARNINGS=0

check_pass() {
    echo -e "${GREEN}✅ $1${NC}"
    ((PASSED++))
}

check_fail() {
    echo -e "${RED}❌ $1${NC}"
    ((FAILED++))
}

check_warn() {
    echo -e "${YELLOW}⚠️  $1${NC}"
    ((WARNINGS++))
}

info() {
    echo -e "${BLUE}ℹ️  $1${NC}"
}

echo "1️⃣  Vérification de Buildah et Podman..."
echo "----------------------------------------"

if command -v buildah &> /dev/null; then
    BUILDAH_VERSION=$(buildah --version | head -1)
    check_pass "Buildah installé: $BUILDAH_VERSION"
else
    check_fail "Buildah non installé"
fi

if command -v podman &> /dev/null; then
    PODMAN_VERSION=$(podman --version)
    check_pass "Podman installé: $PODMAN_VERSION"
else
    check_fail "Podman non installé"
fi

echo ""
echo "2️⃣  Vérification des images Buildah..."
echo "--------------------------------------"

# Vérifier les images dans le contexte root (sudo podman)
BACKEND_IMAGE=$(sudo podman images --format "{{.Repository}}:{{.Tag}}" | grep "localhost/dsa-backend:latest" || echo "")
FRONTEND_IMAGE=$(sudo podman images --format "{{.Repository}}:{{.Tag}}" | grep "localhost/dsa-frontend:latest" || echo "")

if [ -n "$BACKEND_IMAGE" ]; then
    BACKEND_SIZE=$(sudo podman images localhost/dsa-backend:latest --format "{{.Size}}")
    check_pass "Image backend trouvée: $BACKEND_IMAGE ($BACKEND_SIZE)"
else
    check_fail "Image backend non trouvée (localhost/dsa-backend:latest)"
fi

if [ -n "$FRONTEND_IMAGE" ]; then
    FRONTEND_SIZE=$(sudo podman images localhost/dsa-frontend:latest --format "{{.Size}}")
    check_pass "Image frontend trouvée: $FRONTEND_IMAGE ($FRONTEND_SIZE)"
else
    check_fail "Image frontend non trouvée (localhost/dsa-frontend:latest)"
fi

echo ""
echo "3️⃣  Vérification du réseau Podman..."
echo "------------------------------------"

if sudo podman network exists dsa-network 2>/dev/null; then
    NETWORK_INFO=$(sudo podman network inspect dsa-network --format "{{.Name}}" 2>/dev/null || echo "")
    if [ -n "$NETWORK_INFO" ]; then
        check_pass "Réseau dsa-network existe"
        info "   Containers connectés:"
        sudo podman network inspect dsa-network --format "{{range .Containers}}{{.Name}} {{end}}" 2>/dev/null | xargs -n1 echo "   -" || echo "   (aucun)"
    else
        check_warn "Réseau dsa-network existe mais non inspectable"
    fi
else
    check_fail "Réseau dsa-network n'existe pas"
fi

echo ""
echo "4️⃣  Vérification des containers..."
echo "-----------------------------------"

BACKEND_STATUS=$(sudo podman ps --filter "name=dsa-backend" --format "{{.Status}}" 2>/dev/null || echo "")
FRONTEND_STATUS=$(sudo podman ps --filter "name=dsa-frontend" --format "{{.Status}}" 2>/dev/null || echo "")

if [ -n "$BACKEND_STATUS" ]; then
    BACKEND_UPTIME=$(sudo podman ps --filter "name=dsa-backend" --format "{{.Status}}" | awk '{print $4}')
    check_pass "Container backend (dsa-backend) est en cours d'exécution"
    info "   Statut: $BACKEND_STATUS"
else
    check_fail "Container backend (dsa-backend) n'est pas en cours d'exécution"
    info "   Containers arrêtés:"
    sudo podman ps -a --filter "name=dsa-backend" --format "table {{.Names}}\t{{.Status}}" 2>/dev/null || true
fi

if [ -n "$FRONTEND_STATUS" ]; then
    FRONTEND_UPTIME=$(sudo podman ps --filter "name=dsa-frontend" --format "{{.Status}}" | awk '{print $4}')
    check_pass "Container frontend (dsa-frontend) est en cours d'exécution"
    info "   Statut: $FRONTEND_STATUS"
else
    check_fail "Container frontend (dsa-frontend) n'est pas en cours d'exécution"
    info "   Containers arrêtés:"
    sudo podman ps -a --filter "name=dsa-frontend" --format "table {{.Names}}\t{{.Status}}" 2>/dev/null || true
fi

echo ""
echo "5️⃣  Vérification des ports..."
echo "----------------------------"

# Vérifier que les ports sont ouverts
BACKEND_PORT=$(sudo ss -tlnp 2>/dev/null | grep ":3001 " || sudo netstat -tlnp 2>/dev/null | grep ":3001 " || echo "")
FRONTEND_PORT=$(sudo ss -tlnp 2>/dev/null | grep ":80 " || sudo netstat -tlnp 2>/dev/null | grep ":80 " || echo "")

if [ -n "$BACKEND_PORT" ]; then
    check_pass "Port 3001 (backend) est ouvert"
else
    check_fail "Port 3001 (backend) n'est pas ouvert"
fi

if [ -n "$FRONTEND_PORT" ]; then
    check_pass "Port 80 (frontend) est ouvert"
else
    check_fail "Port 80 (frontend) n'est pas ouvert"
fi

echo ""
echo "6️⃣  Vérification de la santé du backend..."
echo "------------------------------------------"

# Test direct du backend
BACKEND_HEALTH=$(curl -s -w "\n%{http_code}" http://localhost:3001/health 2>/dev/null || echo -e "\n000")
BACKEND_HEALTH_CODE=$(echo "$BACKEND_HEALTH" | tail -1)
BACKEND_HEALTH_BODY=$(echo "$BACKEND_HEALTH" | head -n -1)

if [ "$BACKEND_HEALTH_CODE" = "200" ]; then
    check_pass "Backend health check direct: OK (HTTP $BACKEND_HEALTH_CODE)"
    if [ -n "$BACKEND_HEALTH_BODY" ]; then
        info "   Réponse: $BACKEND_HEALTH_BODY"
    fi
else
    check_fail "Backend health check direct: ÉCHEC (HTTP $BACKEND_HEALTH_CODE)"
    echo "   Dernières lignes des logs backend:"
    sudo podman logs --tail 10 dsa-backend 2>/dev/null | sed 's/^/   /' || echo "   (impossible de récupérer les logs)"
fi

echo ""
echo "7️⃣  Vérification de l'accès frontend..."
echo "----------------------------------------"

FRONTEND_CHECK=$(curl -s -o /dev/null -w "%{http_code}" http://localhost/ 2>/dev/null || echo "000")

if [ "$FRONTEND_CHECK" = "200" ]; then
    check_pass "Frontend accessible: OK (HTTP $FRONTEND_CHECK)"
else
    check_fail "Frontend accessible: ÉCHEC (HTTP $FRONTEND_CHECK)"
    echo "   Dernières lignes des logs frontend:"
    sudo podman logs --tail 10 dsa-frontend 2>/dev/null | sed 's/^/   /' || echo "   (impossible de récupérer les logs)"
fi

echo ""
echo "8️⃣  Vérification de l'API via proxy Nginx..."
echo "---------------------------------------------"

# Test via le proxy Nginx
API_HEALTH=$(curl -s -w "\n%{http_code}" http://localhost/api/health 2>/dev/null || echo -e "\n000")
API_HEALTH_CODE=$(echo "$API_HEALTH" | tail -1)
API_HEALTH_BODY=$(echo "$API_HEALTH" | head -n -1)

if [ "$API_HEALTH_CODE" = "200" ]; then
    check_pass "API via proxy Nginx: OK (HTTP $API_HEALTH_CODE)"
    if [ -n "$API_HEALTH_BODY" ]; then
        info "   Réponse: $API_HEALTH_BODY"
    fi
else
    check_fail "API via proxy Nginx: ÉCHEC (HTTP $API_HEALTH_CODE)"
    info "   Vérifiez la configuration Nginx et la résolution DNS du container backend"
fi

echo ""
echo "9️⃣  Vérification de la connexion PostgreSQL..."
echo "----------------------------------------------"

# Vérifier les logs pour les erreurs de connexion PostgreSQL
PG_ERRORS=$(sudo podman logs dsa-backend 2>&1 | grep -iE "error|fatal|connection.*refused|database.*does not exist|authentication failed" | tail -3 || echo "")

if [ -z "$PG_ERRORS" ]; then
    # Essayer de tester l'API qui nécessite la DB
    STATS_CHECK=$(curl -s -w "\n%{http_code}" http://localhost:3001/api/moderation/stats 2>/dev/null || echo -e "\n000")
    STATS_CODE=$(echo "$STATS_CHECK" | tail -1)
    
    if [ "$STATS_CODE" = "200" ]; then
        check_pass "Connexion PostgreSQL: OK (API stats fonctionne)"
    else
        check_warn "Connexion PostgreSQL: Incertaine (API stats retourne HTTP $STATS_CODE)"
    fi
else
    check_fail "Erreurs PostgreSQL détectées dans les logs:"
    echo "$PG_ERRORS" | sed 's/^/   /'
fi

echo ""
echo "🔟 Vérification de l'accès externe..."
echo "--------------------------------------"

# Obtenir l'IP publique de la VM
VM_IP=$(curl -s ifconfig.me 2>/dev/null || curl -s icanhazip.com 2>/dev/null || echo "35.223.190.104")

info "IP publique de la VM: $VM_IP"

# Test depuis l'extérieur (si accessible)
EXTERNAL_FRONTEND=$(curl -s -o /dev/null -w "%{http_code}" --max-time 5 "http://$VM_IP/" 2>/dev/null || echo "000")
EXTERNAL_API=$(curl -s -o /dev/null -w "%{http_code}" --max-time 5 "http://$VM_IP/api/health" 2>/dev/null || echo "000")

if [ "$EXTERNAL_FRONTEND" = "200" ]; then
    check_pass "Frontend accessible depuis l'extérieur: OK (HTTP $EXTERNAL_FRONTEND)"
else
    check_warn "Frontend non accessible depuis l'extérieur (HTTP $EXTERNAL_FRONTEND)"
    info "   Vérifiez les règles firewall GCP pour le port 80"
fi

if [ "$EXTERNAL_API" = "200" ]; then
    check_pass "API accessible depuis l'extérieur: OK (HTTP $EXTERNAL_API)"
else
    check_warn "API non accessible depuis l'extérieur (HTTP $EXTERNAL_API)"
fi

echo ""
echo "1️⃣1️⃣  Résumé des logs récents..."
echo "--------------------------------"

echo ""
info "📋 Logs backend (5 dernières lignes):"
sudo podman logs --tail 5 dsa-backend 2>/dev/null | sed 's/^/   /' || echo "   (aucun log disponible)"

echo ""
info "📋 Logs frontend (5 dernières lignes):"
sudo podman logs --tail 5 dsa-frontend 2>/dev/null | sed 's/^/   /' || echo "   (aucun log disponible)"

echo ""
echo "=============================================="
echo "📊 RÉSUMÉ DE LA VÉRIFICATION"
echo "=============================================="
echo -e "${GREEN}✅ Tests réussis: $PASSED${NC}"
echo -e "${RED}❌ Tests échoués: $FAILED${NC}"
echo -e "${YELLOW}⚠️  Avertissements: $WARNINGS${NC}"
echo ""

if [ $FAILED -eq 0 ]; then
    echo -e "${GREEN}🎉 Déploiement Buildah/Podman opérationnel!${NC}"
    echo ""
    echo "🌐 URLs pour la démo:"
    echo "   - Frontend: http://$VM_IP"
    echo "   - Backend API: http://$VM_IP/api/health"
    echo "   - Stats API: http://$VM_IP/api/moderation/stats"
    echo ""
    echo "📋 Commandes utiles pour la démo:"
    echo "   - Voir les logs: sudo podman logs -f dsa-backend"
    echo "   - Statut containers: sudo podman ps"
    echo "   - Redémarrer: sudo podman restart dsa-backend dsa-frontend"
    exit 0
else
    echo -e "${RED}❌ Des problèmes ont été détectés. Vérifiez les erreurs ci-dessus.${NC}"
    echo ""
    echo "🔧 Commandes de diagnostic:"
    echo "   - Logs backend: sudo podman logs dsa-backend"
    echo "   - Logs frontend: sudo podman logs dsa-frontend"
    echo "   - Statut détaillé: sudo podman ps -a"
    echo "   - Inspecter réseau: sudo podman network inspect dsa-network"
    exit 1
fi
