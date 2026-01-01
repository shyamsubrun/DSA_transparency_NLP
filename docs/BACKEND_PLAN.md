# Plan Backend - DSA Transparency Dashboard

## Vue d'ensemble

Ce document décrit les besoins backend pour remplacer les données mockées par des données réelles provenant de la DSA Transparency Database de l'Union Européenne.

---

## 1. Architecture de récupération des données DSA

### Option 1 : Scraping/Extraction quotidienne automatisée (RECOMMANDÉ)

**Avantages :**
- Automatisation complète
- Données toujours à jour
- Pas de dépendance manuelle
- Scalable

**Architecture proposée :**
```
DSA EU Website/API
    ↓ (Daily Cron Job)
Scraper/Extractor Service
    ↓ (Parse & Transform)
PostgreSQL/MySQL Database
    ↓ (REST API)
Frontend Dashboard
```

**Implémentation :**
- **Service d'extraction** : Python/Node.js avec Puppeteer/Playwright ou requests pour scraper le site DSA
- **Scheduler** : Cron job quotidien (ex: 2h du matin) pour récupérer les nouvelles données
- **Base de données** : PostgreSQL avec tables optimisées pour les requêtes analytiques
- **API REST** : Node.js/Express ou Python/FastAPI pour servir les données au frontend

**Considérations :**
- Respecter les robots.txt et rate limiting
- Gérer les erreurs et retry logic
- Logging des extractions
- Versioning des données pour historique

### Option 2 : Base de données locale avec mise à jour quotidienne

**Avantages :**
- Contrôle total sur les données
- Performance optimale
- Possibilité d'enrichir les données

**Architecture proposée :**
```
DSA EU Data Source (CSV/JSON)
    ↓ (Daily ETL Process)
Local Database (PostgreSQL)
    ↓ (REST API)
Frontend Dashboard
```

**Implémentation :**
- **ETL Pipeline** : Script Python/Node.js qui télécharge et transforme les données
- **Base de données** : PostgreSQL avec schéma optimisé
- **Mise à jour** : Cron job quotidien pour synchroniser
- **API** : REST API pour exposer les données

### Option 3 : Téléchargement manuel + Base de données

**Avantages :**
- Simple à mettre en place
- Contrôle manuel sur les mises à jour

**Inconvénients :**
- Nécessite intervention manuelle
- Risque de données obsolètes

**Recommandation :** Utiliser cette option uniquement pour le développement initial, puis migrer vers Option 1 ou 2.

---

## 2. Structure de la base de données

### Table principale : `moderation_entries`

```sql
CREATE TABLE moderation_entries (
    id VARCHAR(50) PRIMARY KEY,
    application_date DATE NOT NULL,
    content_date DATE NOT NULL,
    platform_name VARCHAR(100) NOT NULL,
    category VARCHAR(100) NOT NULL,
    decision_type VARCHAR(100) NOT NULL,
    decision_ground TEXT NOT NULL,
    incompatible_content_ground TEXT,
    content_type VARCHAR(50) NOT NULL,
    automated_detection BOOLEAN NOT NULL,
    automated_decision BOOLEAN NOT NULL,
    country VARCHAR(100) NOT NULL,
    territorial_scope JSONB, -- Array of country codes
    language VARCHAR(10) NOT NULL,
    delay_days INTEGER NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    INDEX idx_application_date (application_date),
    INDEX idx_platform (platform_name),
    INDEX idx_category (category),
    INDEX idx_country (country),
    INDEX idx_decision_type (decision_type),
    INDEX idx_content_type (content_type)
);
```

### Table de métadonnées : `data_sync_log`

```sql
CREATE TABLE data_sync_log (
    id SERIAL PRIMARY KEY,
    sync_date TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    records_added INTEGER,
    records_updated INTEGER,
    status VARCHAR(20), -- 'success', 'error', 'partial'
    error_message TEXT,
    source_url TEXT
);
```

---

## 3. API Endpoints nécessaires

### 3.1 GET `/api/moderation`

**Description :** Récupère toutes les entrées de modération avec filtres optionnels

**Query Parameters :**
- `startDate` (optional): Date de début (YYYY-MM-DD)
- `endDate` (optional): Date de fin (YYYY-MM-DD)
- `platforms` (optional): Liste de plateformes séparées par virgules
- `categories` (optional): Liste de catégories séparées par virgules
- `decisionTypes` (optional): Liste de types de décisions
- `decisionGrounds` (optional): Liste de bases légales
- `countries` (optional): Liste de pays
- `contentTypes` (optional): Liste de types de contenu
- `automatedDetection` (optional): true/false/null
- `automatedDecision` (optional): true/false/null
- `page` (optional): Numéro de page (défaut: 1)
- `limit` (optional): Nombre d'éléments par page (défaut: 1000, max: 10000)

**Response :**
```json
{
  "data": [
    {
      "id": "DSA-000001",
      "application_date": "2024-01-15",
      "content_date": "2024-01-10",
      "platform_name": "Meta",
      "category": "Hate Speech",
      "decision_type": "Removal",
      "decision_ground": "Illegal content (Art. 3 DSA)",
      "incompatible_content_ground": null,
      "content_type": "Text",
      "automated_detection": true,
      "automated_decision": false,
      "country": "Germany",
      "territorial_scope": ["DE", "FR"],
      "language": "de",
      "delay_days": 5
    }
  ],
  "pagination": {
    "page": 1,
    "limit": 1000,
    "total": 350,
    "totalPages": 1
  }
}
```

### 3.2 GET `/api/stats`

**Description :** Récupère les statistiques KPI agrégées

**Query Parameters :** (mêmes filtres que `/api/moderation`)

**Response :**
```json
{
  "totalActions": 350,
  "platformCount": 8,
  "averageDelay": 4.2,
  "automatedDetectionRate": 85,
  "automatedDecisionRate": 72,
  "countryCount": 27
}
```

### 3.3 GET `/api/aggregations`

**Description :** Récupère toutes les agrégations nécessaires pour les graphiques

**Query Parameters :** (mêmes filtres que `/api/moderation`)

**Response :**
```json
{
  "byPlatform": {
    "Meta": 87,
    "TikTok": 70,
    "YouTube": 63
  },
  "byCategory": {
    "Hate Speech": 63,
    "Misleading Information": 56
  },
  "byDecisionType": {
    "Removal": 175,
    "Visibility Restriction": 105
  },
  "byDecisionGround": {
    "Illegal content (Art. 3 DSA)": 140,
    "Terms of Service violation": 105
  },
  "byCountry": {
    "Germany": 63,
    "France": 56
  },
  "byContentType": {
    "Text": 140,
    "Video": 105,
    "Image": 70
  },
  "byDate": {
    "2024-01": 50,
    "2024-02": 60
  },
  "decisionByPlatform": {
    "Meta": {
      "Removal": 50,
      "Visibility Restriction": 25
    }
  },
  "categoryByPlatform": {
    "Meta": {
      "Hate Speech": 30,
      "Harassment": 20
    }
  },
  "automationByPlatform": {
    "Meta": {
      "total": 87,
      "automatedDetection": 80,
      "automatedDecision": 65
    }
  },
  "decisionByContentType": {
    "Text": {
      "Removal": 70,
      "Visibility Restriction": 50
    }
  },
  "delayByContentType": {
    "Text": {
      "total": 700,
      "count": 140,
      "average": 5.0
    }
  },
  "groundsAnalysis": {
    "legal": 210,
    "tos": 140
  },
  "categoryByGround": {
    "Illegal content (Art. 3 DSA)": {
      "Hate Speech": 50,
      "Violence": 30
    }
  },
  "automationHeatmap": {
    "Meta|Hate Speech": {
      "total": 30,
      "automated": 25
    }
  }
}
```

### 3.4 GET `/api/time-series`

**Description :** Récupère les données de séries temporelles

**Query Parameters :** (mêmes filtres que `/api/moderation`)

**Response :**
```json
{
  "months": ["2024-01", "2024-02", "2024-03"],
  "platforms": ["Meta", "TikTok", "YouTube"],
  "byMonth": {
    "2024-01": 50,
    "2024-02": 60,
    "2024-03": 70
  },
  "byPlatformMonth": {
    "Meta": {
      "2024-01": 20,
      "2024-02": 25
    }
  },
  "delayByMonth": {
    "2024-01": {
      "total": 200,
      "count": 50,
      "average": 4.0
    }
  }
}
```

### 3.5 GET `/api/filters`

**Description :** Récupère les valeurs uniques disponibles pour les filtres

**Response :**
```json
{
  "platforms": ["Meta", "TikTok", "X", "YouTube"],
  "categories": ["Hate Speech", "Harassment", "Misleading Information"],
  "decisionTypes": ["Removal", "Visibility Restriction", "Account Suspension"],
  "decisionGrounds": ["Illegal content (Art. 3 DSA)", "Terms of Service violation"],
  "countries": ["Germany", "France", "Italy"],
  "contentTypes": ["Text", "Image", "Video"],
  "languages": ["de", "fr", "en"]
}
```

### 3.6 GET `/api/health`

**Description :** Endpoint de santé pour vérifier l'état de l'API

**Response :**
```json
{
  "status": "healthy",
  "database": "connected",
  "lastSync": "2024-01-15T02:00:00Z",
  "totalRecords": 350
}
```

---

## 4. Mapping des données DSA → Dashboard

### Structure attendue des données DSA

Basé sur les standards de transparence DSA, les données devraient contenir :

| Champ DSA | Champ Dashboard | Notes |
|-----------|-----------------|-------|
| `report_id` | `id` | Identifiant unique |
| `reporting_date` | `application_date` | Date de soumission |
| `content_creation_date` | `content_date` | Date de création du contenu |
| `platform` | `platform_name` | Nom de la plateforme |
| `content_category` | `category` | Catégorie de contenu |
| `action_taken` | `decision_type` | Type d'action |
| `legal_basis` | `decision_ground` | Base légale |
| `content_format` | `content_type` | Format du contenu |
| `automated_detection` | `automated_detection` | Détection automatisée |
| `automated_action` | `automated_decision` | Action automatisée |
| `member_state` | `country` | État membre |
| `territorial_scope` | `territorial_scope` | Portée territoriale |
| `language` | `language` | Langue |

**Calcul du délai :**
```javascript
delay_days = difference_in_days(application_date, content_date)
```

---

## 5. Recommandations d'implémentation

### Stack technique recommandé

**Backend :**
- **Langage** : Node.js (TypeScript) ou Python
- **Framework API** : Express.js ou FastAPI
- **Base de données** : PostgreSQL
- **ORM** : Prisma (Node.js) ou SQLAlchemy (Python)
- **Scheduler** : node-cron (Node.js) ou APScheduler (Python)

**Scraping/Extraction :**
- **Node.js** : Puppeteer ou Playwright pour scraping web
- **Python** : BeautifulSoup + requests ou Scrapy
- **Alternative** : Si API disponible, utiliser fetch/axios directement

### Architecture recommandée

```
backend/
├── src/
│   ├── api/
│   │   ├── routes/
│   │   │   ├── moderation.ts
│   │   │   ├── stats.ts
│   │   │   ├── aggregations.ts
│   │   │   └── time-series.ts
│   │   └── middleware/
│   ├── services/
│   │   ├── dsa-scraper.ts      # Service d'extraction DSA
│   │   ├── data-processor.ts   # Traitement des données
│   │   └── aggregation-service.ts
│   ├── database/
│   │   ├── models/
│   │   ├── migrations/
│   │   └── queries/
│   ├── jobs/
│   │   └── sync-dsa-data.ts    # Job quotidien
│   └── utils/
├── tests/
└── package.json
```

### Processus de synchronisation quotidienne

1. **Extraction** : Scraper/télécharger les données depuis la source DSA
2. **Validation** : Vérifier l'intégrité des données
3. **Transformation** : Mapper vers le schéma de la base de données
4. **Déduplication** : Éviter les doublons (basé sur `id`)
5. **Insertion** : Insérer les nouvelles données
6. **Mise à jour** : Mettre à jour les enregistrements existants si nécessaire
7. **Logging** : Enregistrer le résultat de la synchronisation

### Optimisations de performance

1. **Indexation** : Créer des index sur les colonnes fréquemment filtrées
2. **Cache** : Utiliser Redis pour mettre en cache les agrégations
3. **Pagination** : Implémenter la pagination pour les grandes listes
4. **Compression** : Activer gzip pour les réponses API
5. **CDN** : Utiliser un CDN pour les données statiques

---

## 6. Sécurité et bonnes pratiques

### Authentification (si nécessaire)

- JWT tokens pour l'authentification API
- Rate limiting pour éviter les abus
- CORS configuré correctement

### Validation des données

- Valider tous les inputs
- Sanitizer les données avant insertion
- Gérer les erreurs gracieusement

### Monitoring

- Logging des requêtes API
- Monitoring de la santé de la base de données
- Alertes en cas d'échec de synchronisation

---

## 7. Plan de migration depuis mock data

### Phase 1 : Setup initial
1. Configurer la base de données
2. Créer les tables et migrations
3. Implémenter les endpoints API de base

### Phase 2 : Extraction des données
1. Développer le service d'extraction/scraping
2. Tester avec un échantillon de données
3. Configurer le job de synchronisation quotidienne

### Phase 3 : Intégration frontend
1. Mettre à jour `dataService.ts` pour utiliser les vraies API
2. Tester avec les données réelles
3. Gérer les cas d'erreur et les états de chargement

### Phase 4 : Optimisation
1. Optimiser les requêtes de base de données
2. Implémenter le cache
3. Monitorer les performances

---

## 8. Ressources et documentation

### Sources de données DSA

- **Site officiel DSA** : https://digital-services-act.ec.europa.eu/
- **Base de données de transparence** : À vérifier sur le site officiel
- **Documentation API** : Si disponible, consulter la documentation officielle

### Outils recommandés

- **Postman/Insomnia** : Pour tester les API
- **pgAdmin/DBeaver** : Pour gérer la base de données
- **PM2** : Pour gérer les processus Node.js en production
- **Docker** : Pour containeriser l'application

---

## 9. Checklist pour le développeur backend

- [ ] Analyser la source de données DSA disponible
- [ ] Choisir l'approche d'extraction (scraping/API/CSV)
- [ ] Configurer la base de données PostgreSQL
- [ ] Créer le schéma de base de données
- [ ] Implémenter le service d'extraction/scraping
- [ ] Créer les endpoints API REST
- [ ] Implémenter la logique d'agrégation
- [ ] Configurer le job de synchronisation quotidienne
- [ ] Ajouter la gestion d'erreurs et logging
- [ ] Tester avec des données réelles
- [ ] Optimiser les performances
- [ ] Documenter l'API (Swagger/OpenAPI)
- [ ] Déployer en production

---

## 10. Format de réponse standardisé

Toutes les réponses API devraient suivre ce format :

```typescript
interface ApiResponse<T> {
  success: boolean;
  data?: T;
  error?: {
    code: string;
    message: string;
    details?: any;
  };
  meta?: {
    timestamp: string;
    requestId: string;
  };
}
```

---

## Conclusion

Ce plan fournit une architecture complète pour remplacer les données mockées par des données réelles de la DSA Transparency Database. L'approche recommandée est l'Option 1 (scraping automatisé quotidien) pour garantir des données toujours à jour avec un minimum d'intervention manuelle.

