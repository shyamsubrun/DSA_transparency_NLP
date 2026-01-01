# 🚀 Plan Backend Complet - DSA Transparency Dashboard
## Architecture Backend Optimisée pour Supabase Free Tier

---

## 📋 TABLE DES MATIÈRES

1. [Architecture Globale Recommandée](#1-architecture-globale-recommandée)
2. [Endpoints DSA TDB à Utiliser](#2-endpoints-dsa-tdb-à-utiliser)
3. [Modèle PostgreSQL Minimal](#3-modèle-postgresql-minimal)
4. [Stratégie ETL/Sync](#4-stratégie-etl--sync)
5. [Backend API Routes](#5-backend-api-routes)
6. [Prompt Final pour Génération](#6-prompt-final-pour-génération)

---

## 1. ARCHITECTURE GLOBALE RECOMMANDÉE

### 🏗️ Stack Technologique

```
┌─────────────────────────────────────────────────────────────┐
│                   DSA Transparency Database                  │
│              (transparency.dsa.ec.europa.eu)                 │
│                    OpenSearch API v2                         │
└───────────────────────┬─────────────────────────────────────┘
                        │
                        │ HTTPS REST API
                        │ Rate Limit: ~100 req/min
                        ↓
┌─────────────────────────────────────────────────────────────┐
│                    Backend Service                           │
│         Node.js 20+ TypeScript + Express                     │
│                                                               │
│  ┌──────────────────────────────────────────────────────┐  │
│  │  ETL Scheduler (node-cron)                            │  │
│  │  - Sync quotidien à 2h du matin                       │  │
│  │  - Récupération incrémentale des données             │  │
│  │  - Agrégation et calcul de métriques                 │  │
│  └──────────────────────────────────────────────────────┘  │
│                                                               │
│  ┌──────────────────────────────────────────────────────┐  │
│  │  API REST Endpoints                                   │  │
│  │  - GET /api/stats (métriques KPI)                    │  │
│  │  - GET /api/aggregations (pour graphiques)           │  │
│  │  - GET /api/time-series (données temporelles)        │  │
│  │  - GET /api/filters (valeurs uniques)                │  │
│  └──────────────────────────────────────────────────────┘  │
└───────────────────────┬─────────────────────────────────────┘
                        │
                        │ Supabase Client SDK
                        │ Row Level Security
                        ↓
┌─────────────────────────────────────────────────────────────┐
│                 Supabase PostgreSQL                          │
│                  (Free Tier: 500MB)                          │
│                                                               │
│  Tables:                                                      │
│  - moderation_entries (données brutes optimisées)           │
│  - aggregated_stats (métriques pré-calculées)              │
│  - sync_log (historique des synchronisations)              │
└───────────────────────┬─────────────────────────────────────┘
                        │
                        │ REST API + Realtime
                        ↓
┌─────────────────────────────────────────────────────────────┐
│                 Frontend Dashboard                           │
│            React 18 + Vite + ECharts                         │
└─────────────────────────────────────────────────────────────┘
```

### 🎯 Technologies Choisies

**Backend:**
- **Runtime**: Node.js 20+ (LTS)
- **Langage**: TypeScript 5+
- **Framework**: Express.js 4.18+
- **ORM/Client**: @supabase/supabase-js
- **Scheduler**: node-cron
- **HTTP Client**: axios
- **Validation**: zod
- **Logging**: winston
- **Testing**: Jest + Supertest

**Base de données:**
- **Provider**: Supabase (PostgreSQL 15)
- **Plan**: Free Tier (500MB, pas 5GB)
- **Extensions**: pgcrypto, pg_stat_statements

**Déploiement:**
- **Backend**: Vercel/Railway/Render (Free Tier compatible)
- **Cronjobs**: Vercel Cron ou service externe (cron-job.org)
- **Env Management**: .env + Vercel/Railway env vars

---

## 2. ENDPOINTS DSA TDB À UTILISER

### 📡 API DSA Transparency Database - Endpoints Découverts

**Base URL**: `https://transparency.dsa.ec.europa.eu/api/v2`

### 2.1 GET `/api/v2/statement`

**Utilité**: Récupérer les déclarations de modération (statements of reasons)

**Paramètres Query**:
```typescript
{
  page: number,              // Pagination (default: 1)
  per_page: number,          // Items par page (max: 100, default: 25)
  sort: 'created_at',        // Tri par date
  order: 'desc' | 'asc',     // Ordre
  decision_visibility: string[], // ex: ['DECISION_VISIBILITY_CONTENT_REMOVED']
  automated_detection: string,   // 'Yes' | 'No' | 'Partial'
  automated_decision: string,    // 'Yes' | 'No' | 'Partial'
  category: string[],        // Catégories de contenu
  platform_name: string[],   // Noms des plateformes
  countries_list: string[],  // Codes pays ISO (ex: ['DE', 'FR'])
  start_date: string,        // Format ISO 8601
  end_date: string          // Format ISO 8601
}
```

**Volume Estimé**: ~100K-500K statements (cumulatif)
**Réponse**: JSON avec structure complexe

**Décision**: ⚠️ **NE PAS STOCKER TOUT**
- Stocker seulement les champs essentiels (voir modèle DB)
- Requête incrémentale quotidienne (dernières 24h)
- Agrégation côté backend avant insertion

### 2.2 GET `/api/v2/platform`

**Utilité**: Liste des plateformes enregistrées

**Paramètres**: Aucun

**Volume Estimé**: ~100 plateformes max

**Décision**: ✅ **STOCKER EN CACHE**
- Table séparée `platforms`
- Mise à jour hebdomadaire
- < 10KB de données

### 2.3 GET `/api/v2/categories`

**Utilité**: Catégories de contenu disponibles

**Volume Estimé**: ~50 catégories

**Décision**: ✅ **STOCKER EN CACHE**
- Table `categories` ou JSONB dans config
- Mise à jour mensuelle

**⚠️ Limites API Découvertes:**
- **Rate Limit**: Environ 100-200 requêtes/minute (non documenté officiellement)
- **Pagination Max**: 100 items par page
- **Total Max par requête**: 10 000 résultats (limite OpenSearch standard)
- **Pas d'API GraphQL**: REST uniquement
- **Pas de bulk download**: Nécessite pagination

---

## 3. MODÈLE POSTGRESQL MINIMAL (Compatible Supabase 500MB)

### 🗄️ Stratégie d'Optimisation pour 500MB

**Principes:**
1. **Pas de stockage de champs texte longs** (descriptions, URLs externes)
2. **Agrégations pré-calculées** (plutôt que requêtes complexes)
3. **Types de données compacts** (SMALLINT au lieu d'INTEGER)
4. **Index sélectifs** (uniquement sur colonnes filtrées)
5. **Partitioning par mois** (si volume > 100K rows)
6. **JSONB pour données variables** (territorial_scope)

### 📊 Schéma SQL Optimisé

```sql
-- =============================================================================
-- Table 1: moderation_entries (Données brutes essentielles)
-- Estimation: ~250KB par 1000 entries = ~125MB pour 500K entries
-- =============================================================================

CREATE TABLE moderation_entries (
    id VARCHAR(50) PRIMARY KEY,                  -- ID DSA (ex: DSA-2024-000001)
    
    -- Dates (6 bytes each = 12 bytes)
    application_date DATE NOT NULL,
    content_date DATE NOT NULL,
    
    -- Plateforme et localisation (compact)
    platform_id SMALLINT NOT NULL,               -- Référence à platforms (2 bytes)
    country_code CHAR(2) NOT NULL,               -- ISO code (2 bytes)
    
    -- Catégories (SMALLINT = 2 bytes each = 8 bytes)
    category_id SMALLINT NOT NULL,               -- Référence à categories
    decision_type_id SMALLINT NOT NULL,          -- Référence à decision_types
    decision_ground_id SMALLINT NOT NULL,        -- Référence à decision_grounds
    content_type_id SMALLINT NOT NULL,           -- Référence à content_types
    
    -- Automatisation (2 bits = 1 byte)
    automated_detection BOOLEAN NOT NULL,
    automated_decision BOOLEAN NOT NULL,
    
    -- Scope territorial (variable, mais compact avec JSONB)
    territorial_scope JSONB,                     -- Ex: ["DE", "FR"]
    
    -- Métadonnées (8 bytes)
    created_at TIMESTAMP DEFAULT NOW(),
    
    -- Indexes pour queries fréquentes
    CONSTRAINT fk_platform FOREIGN KEY (platform_id) REFERENCES platforms(id),
    CONSTRAINT fk_category FOREIGN KEY (category_id) REFERENCES categories(id)
);

-- Index stratégiques (seulement ce qui est filtré)
CREATE INDEX idx_app_date ON moderation_entries(application_date DESC);
CREATE INDEX idx_platform ON moderation_entries(platform_id);
CREATE INDEX idx_country ON moderation_entries(country_code);
CREATE INDEX idx_category ON moderation_entries(category_id);
CREATE INDEX idx_decision_type ON moderation_entries(decision_type_id);

-- =============================================================================
-- Table 2: platforms (Référence ~100 rows = <10KB)
-- =============================================================================

CREATE TABLE platforms (
    id SMALLINT PRIMARY KEY GENERATED ALWAYS AS IDENTITY,
    name VARCHAR(100) NOT NULL UNIQUE,           -- Ex: "Meta"
    official_name VARCHAR(200),                  -- Ex: "Meta Platforms Ireland Limited"
    created_at TIMESTAMP DEFAULT NOW()
);

-- =============================================================================
-- Table 3: categories (Référence ~50 rows = <5KB)
-- =============================================================================

CREATE TABLE categories (
    id SMALLINT PRIMARY KEY GENERATED ALWAYS AS IDENTITY,
    name VARCHAR(100) NOT NULL UNIQUE,           -- Ex: "Hate Speech"
    dsa_code VARCHAR(50)                         -- Code officiel DSA
);

-- =============================================================================
-- Table 4: decision_types (Référence ~10 rows = <1KB)
-- =============================================================================

CREATE TABLE decision_types (
    id SMALLINT PRIMARY KEY GENERATED ALWAYS AS IDENTITY,
    name VARCHAR(100) NOT NULL UNIQUE            -- Ex: "Removal"
);

-- =============================================================================
-- Table 5: decision_grounds (Référence ~15 rows = <2KB)
-- =============================================================================

CREATE TABLE decision_grounds (
    id SMALLINT PRIMARY KEY GENERATED ALWAYS AS IDENTITY,
    name TEXT NOT NULL UNIQUE                    -- Ex: "Illegal content (Art. 3 DSA)"
);

-- =============================================================================
-- Table 6: content_types (Référence ~10 rows = <1KB)
-- =============================================================================

CREATE TABLE content_types (
    id SMALLINT PRIMARY KEY GENERATED ALWAYS AS IDENTITY,
    name VARCHAR(50) NOT NULL UNIQUE             -- Ex: "Text", "Video"
);

-- =============================================================================
-- Table 7: aggregated_stats (Métriques pré-calculées)
-- Estimation: ~50KB pour stats journalières sur 1 an
-- =============================================================================

CREATE TABLE aggregated_stats (
    id SERIAL PRIMARY KEY,
    stat_date DATE NOT NULL,
    stat_type VARCHAR(50) NOT NULL,              -- 'daily', 'weekly', 'monthly'
    
    -- Agrégations JSON pour flexibilité
    kpi_metrics JSONB,                           -- Total actions, avg delay, etc.
    by_platform JSONB,                           -- Count par plateforme
    by_category JSONB,                           -- Count par catégorie
    by_country JSONB,                            -- Count par pays
    by_decision_type JSONB,                      -- Count par type de décision
    
    created_at TIMESTAMP DEFAULT NOW(),
    UNIQUE(stat_date, stat_type)
);

CREATE INDEX idx_stat_date ON aggregated_stats(stat_date DESC);

-- =============================================================================
-- Table 8: sync_log (Historique de synchronisation)
-- Estimation: ~365 rows/an = <50KB
-- =============================================================================

CREATE TABLE sync_log (
    id SERIAL PRIMARY KEY,
    sync_date TIMESTAMP DEFAULT NOW(),
    status VARCHAR(20) NOT NULL,                 -- 'success', 'error', 'partial'
    records_fetched INTEGER,
    records_inserted INTEGER,
    records_updated INTEGER,
    records_failed INTEGER,
    error_message TEXT,
    execution_time_ms INTEGER,
    last_entry_date DATE                         -- Dernière entrée récupérée
);

-- =============================================================================
-- Vue matérialisée pour dashboard (refresh quotidien)
-- =============================================================================

CREATE MATERIALIZED VIEW dashboard_summary AS
SELECT 
    COUNT(*) as total_actions,
    COUNT(DISTINCT platform_id) as platform_count,
    COUNT(DISTINCT country_code) as country_count,
    ROUND(AVG(application_date - content_date), 1) as avg_delay_days,
    ROUND(100.0 * SUM(CASE WHEN automated_detection THEN 1 ELSE 0 END) / COUNT(*), 0) as auto_detection_rate,
    ROUND(100.0 * SUM(CASE WHEN automated_decision THEN 1 ELSE 0 END) / COUNT(*), 0) as auto_decision_rate,
    MAX(application_date) as last_update_date
FROM moderation_entries;

CREATE UNIQUE INDEX ON dashboard_summary ((1));  -- Index unique pour refresh

-- Refresh quotidien automatique (via cronjob backend)
-- REFRESH MATERIALIZED VIEW CONCURRENTLY dashboard_summary;
```

### 📦 Estimation de Taille Totale

| Table | Rows Estimées | Taille Estimée |
|-------|---------------|----------------|
| `moderation_entries` | 500,000 | ~125 MB |
| `platforms` | 100 | <10 KB |
| `categories` | 50 | <5 KB |
| `decision_types` | 10 | <1 KB |
| `decision_grounds` | 15 | <2 KB |
| `content_types` | 10 | <1 KB |
| `aggregated_stats` | 1,000 | ~50 KB |
| `sync_log` | 365 | <50 KB |
| **Indexes** | - | ~20 MB |
| **Views** | - | <1 MB |
| **TOTAL** | | **~146 MB** |

**✅ Marge de sécurité**: 354 MB restants pour croissance

---

## 4. STRATÉGIE ETL / SYNC

### ⚙️ Architecture du Pipeline ETL

```
┌──────────────────────────────────────────────────────────────┐
│                    DAILY CRON JOB (2h AM)                     │
└───────────────────┬──────────────────────────────────────────┘
                    │
                    ↓
┌──────────────────────────────────────────────────────────────┐
│  STEP 1: Fetch Incremental Data                              │
│  - Query DSA API for last 24-48h                             │
│  - Pagination: 100 items/page                                │
│  - Max 100 requests (= 10,000 entries max/day)              │
└───────────────────┬──────────────────────────────────────────┘
                    │
                    ↓
┌──────────────────────────────────────────────────────────────┐
│  STEP 2: Transform Data                                       │
│  - Map DSA fields → DB schema                                │
│  - Resolve platform_id, category_id, etc.                   │
│  - Calculate delay_days                                       │
│  - Validate with Zod schema                                  │
└───────────────────┬──────────────────────────────────────────┘
                    │
                    ↓
┌──────────────────────────────────────────────────────────────┐
│  STEP 3: Upsert to Database                                  │
│  - INSERT ... ON CONFLICT DO UPDATE                          │
│  - Batch insert (500 rows/batch)                             │
│  - Transaction pour cohérence                                │
└───────────────────┬──────────────────────────────────────────┘
                    │
                    ↓
┌──────────────────────────────────────────────────────────────┐
│  STEP 4: Compute Aggregations                                │
│  - Calculate daily/weekly/monthly stats                      │
│  - Update aggregated_stats table                             │
│  - Refresh materialized view                                 │
└───────────────────┬──────────────────────────────────────────┘
                    │
                    ↓
┌──────────────────────────────────────────────────────────────┐
│  STEP 5: Cleanup & Log                                        │
│  - Delete entries older than 18 months (GDPR)               │
│  - Insert sync_log entry                                     │
│  - Send notification if error                                │
└──────────────────────────────────────────────────────────────┘
```

### 📅 Fréquence de Synchronisation

**Quotidien (recommandé)**:
- **Heure**: 2h du matin UTC
- **Durée**: 5-15 minutes
- **Volume**: ~100-1000 nouvelles entrées/jour
- **Requêtes API**: 10-100 requêtes

**Alternative - Hebdomadaire** (si rate limit strict):
- Dimanche 2h du matin
- Volume: ~700-7000 entrées/semaine
- Plus de risque de perte de données

### 🔄 Stratégie de Récupération Incrémentale

```typescript
// Pseudo-code de la logique ETL

async function syncDailyData() {
    // 1. Récupérer la dernière date synchronisée
    const lastSync = await getLastSyncDate();
    const startDate = lastSync || new Date('2024-01-01');
    const endDate = new Date();
    
    // 2. Paginer les requêtes API
    let page = 1;
    let hasMore = true;
    let totalFetched = 0;
    
    while (hasMore && totalFetched < 10000) {
        const response = await fetchDSAStatements({
            start_date: startDate.toISOString(),
            end_date: endDate.toISOString(),
            page,
            per_page: 100,
            sort: 'created_at',
            order: 'asc'
        });
        
        // 3. Transformer et insérer
        const transformed = transformStatements(response.data);
        await batchUpsert(transformed);
        
        totalFetched += response.data.length;
        hasMore = response.data.length === 100;
        page++;
        
        // Rate limiting: attendre 600ms entre requêtes
        await sleep(600);
    }
    
    // 4. Calculer agrégations
    await computeDailyAggregations();
    
    // 5. Logger le résultat
    await logSyncResult({ totalFetched, status: 'success' });
}
```

### 🚦 Gestion des Limites API

**Rate Limiting**:
- Pause de 600ms entre chaque requête (max 100 req/min)
- Retry avec backoff exponentiel si 429
- Max 3 tentatives par requête

**Détection de mises à jour**:
- Utiliser `created_at` ou `updated_at` du DSA
- Stocker `last_entry_date` dans `sync_log`
- Query incrémentale: `WHERE created_at > last_entry_date`

**Gestion des erreurs**:
- Si échec total: notification email/Slack
- Si échec partiel: continuer et logger erreurs
- Mécanisme de retry le lendemain pour données manquées

### 💾 Stratégie de Cache

**Cache API Responses** (optionnel):
- Redis si disponible (non critique pour free tier)
- Cache en mémoire pour référentiels (platforms, categories)
- TTL: 24h pour agrégations, 7j pour référentiels

**Cache Frontend**:
- Réponses API cachées côté frontend (React Query)
- Stale time: 5 minutes pour stats
- Background refetch automatique

---

## 5. BACKEND API ROUTES

### 🛣️ Routes Exposées au Frontend

```
BASE_URL: https://your-backend.vercel.app/api
```

### 5.1 GET `/api/health`

**Description**: Check santé du backend et DB

**Response**:
```json
{
  "status": "healthy",
  "database": "connected",
  "lastSync": "2024-12-12T02:00:00Z",
  "totalRecords": 350420,
  "dbSize": "146MB",
  "supabaseStatus": "operational"
}
```

**Logique**:
- Ping Supabase
- Query `SELECT COUNT(*) FROM moderation_entries`
- Query dernière entrée `sync_log`
- Return aggregated info

---

### 5.2 GET `/api/stats`

**Description**: Métriques KPI globales (pour OverviewSection)

**Query Params**:
```typescript
{
  startDate?: string,  // ISO 8601
  endDate?: string,
  platforms?: string,  // Comma-separated
  categories?: string,
  countries?: string
}
```

**Response**:
```json
{
  "totalActions": 350420,
  "platformCount": 8,
  "countryCount": 27,
  "averageDelay": 4.2,
  "automatedDetectionRate": 85,
  "automatedDecisionRate": 72,
  "dateRange": {
    "start": "2024-01-01",
    "end": "2024-12-12"
  }
}
```

**Logique SQL**:
```sql
SELECT 
    COUNT(*) as total_actions,
    COUNT(DISTINCT platform_id) as platform_count,
    COUNT(DISTINCT country_code) as country_count,
    ROUND(AVG(application_date - content_date), 1) as average_delay,
    ROUND(100.0 * SUM(CASE WHEN automated_detection THEN 1 ELSE 0 END) / COUNT(*), 0) as auto_detection_rate,
    ROUND(100.0 * SUM(CASE WHEN automated_decision THEN 1 ELSE 0 END) / COUNT(*), 0) as auto_decision_rate
FROM moderation_entries
WHERE application_date BETWEEN $1 AND $2
    AND ($3::text IS NULL OR platform_id = ANY($3::smallint[]))
    AND ($4::text IS NULL OR category_id = ANY($4::smallint[]));
```

---

### 5.3 GET `/api/aggregations`

**Description**: Agrégations pour tous les graphiques

**Query Params**: Same as `/api/stats`

**Response**:
```json
{
  "byPlatform": {
    "Meta": 87520,
    "TikTok": 70320,
    "YouTube": 63240
  },
  "byCategory": {
    "Hate Speech": 63000,
    "Misleading Information": 56000
  },
  "byDecisionType": {
    "Removal": 175000,
    "Visibility Restriction": 105000
  },
  "byCountry": {
    "DE": 63000,
    "FR": 56000,
    "IT": 42000
  },
  "byContentType": {
    "Text": 140000,
    "Video": 105000,
    "Image": 70000
  },
  "decisionByPlatform": {
    "Meta": {
      "Removal": 50000,
      "Visibility Restriction": 25000
    }
  },
  "categoryByPlatform": {
    "Meta": {
      "Hate Speech": 30000,
      "Harassment": 20000
    }
  },
  "automationByPlatform": {
    "Meta": {
      "total": 87520,
      "automatedDetection": 80000,
      "automatedDecision": 65000
    }
  },
  "groundsAnalysis": {
    "legal": 210000,
    "tos": 140000
  }
}
```

**Logique**:
- Utiliser `aggregated_stats` table si date range = "last 30 days"
- Sinon, calculer dynamiquement avec GROUP BY
- Joindre tables de référence pour noms lisibles
- Cache côté backend: 5 minutes

---

### 5.4 GET `/api/time-series`

**Description**: Données séries temporelles (pour TimeSeriesSection)

**Query Params**: Same as `/api/stats`

**Response**:
```json
{
  "months": ["2024-01", "2024-02", "2024-03"],
  "byMonth": {
    "2024-01": 50000,
    "2024-02": 60000,
    "2024-03": 70000
  },
  "byPlatformMonth": {
    "Meta": {
      "2024-01": 20000,
      "2024-02": 25000
    }
  },
  "delayByMonth": {
    "2024-01": {
      "average": 4.0,
      "count": 50000
    }
  }
}
```

**Logique SQL**:
```sql
SELECT 
    DATE_TRUNC('month', application_date) as month,
    p.name as platform_name,
    COUNT(*) as count,
    AVG(application_date - content_date) as avg_delay
FROM moderation_entries me
JOIN platforms p ON me.platform_id = p.id
WHERE application_date BETWEEN $1 AND $2
GROUP BY month, platform_name
ORDER BY month ASC;
```

---

### 5.5 GET `/api/filters`

**Description**: Valeurs uniques pour dropdowns de filtres

**Response**:
```json
{
  "platforms": [
    {"id": 1, "name": "Meta"},
    {"id": 2, "name": "TikTok"}
  ],
  "categories": [
    {"id": 1, "name": "Hate Speech"},
    {"id": 2, "name": "Harassment"}
  ],
  "decisionTypes": [
    {"id": 1, "name": "Removal"},
    {"id": 2, "name": "Visibility Restriction"}
  ],
  "decisionGrounds": [
    {"id": 1, "name": "Illegal content (Art. 3 DSA)"}
  ],
  "contentTypes": [
    {"id": 1, "name": "Text"},
    {"id": 2, "name": "Video"}
  ],
  "countries": ["DE", "FR", "IT", "ES"],
  "dateRange": {
    "min": "2024-01-01",
    "max": "2024-12-12"
  }
}
```

**Logique**:
- SELECT * FROM tables de référence
- Cache agressif: 1 jour (données quasi-statiques)
- Min/max dates depuis `moderation_entries`

---

### 5.6 POST `/api/sync/trigger` (Admin only - optionnel)

**Description**: Déclencher une synchronisation manuelle

**Auth**: API Key required

**Response**:
```json
{
  "status": "started",
  "jobId": "sync-20241212-150230",
  "message": "Synchronization job started"
}
```

**Logique**:
- Déclencher le job ETL immédiatement
- Retourner job ID pour tracking
- Éviter double-run (lock mechanism)

---

## 6. PROMPT FINAL POUR GÉNÉRATION

Voici le prompt complet à utiliser pour générer le backend:

---

```markdown
# 🚀 PROMPT DE GÉNÉRATION BACKEND - DSA TRANSPARENCY DASHBOARD

## CONTEXTE

Je développe un dashboard analytics pour visualiser les données de la **DSA Transparency Database** de l'UE. Le frontend est déjà développé en React + Vite + ECharts.

Je dois maintenant créer un **backend Node.js TypeScript** qui:
1. Récupère les données depuis l'API DSA Transparency Database
2. Les transforme et les stocke dans Supabase PostgreSQL (plan gratuit: 500MB)
3. Expose des endpoints REST optimisés pour alimenter mon dashboard
4. Synchronise quotidiennement les nouvelles données via un cron job

## ARCHITECTURE TECHNIQUE

**Stack:**
- Runtime: Node.js 20+
- Langage: TypeScript 5+
- Framework: Express.js 4.18+
- Database: Supabase PostgreSQL (@supabase/supabase-js)
- Scheduler: node-cron
- HTTP Client: axios
- Validation: zod
- Logging: winston
- Testing: Jest + Supertest
- Déploiement: Vercel/Railway compatible

**Structure du projet:**
```
backend/
├── src/
│   ├── index.ts                 # Entry point
│   ├── config/
│   │   ├── database.ts          # Supabase client
│   │   └── env.ts               # Env validation
│   ├── services/
│   │   ├── dsa-api.service.ts   # DSA API client
│   │   ├── etl.service.ts       # ETL logic
│   │   └── aggregation.service.ts
│   ├── routes/
│   │   ├── health.routes.ts
│   │   ├── stats.routes.ts
│   │   ├── aggregations.routes.ts
│   │   ├── time-series.routes.ts
│   │   └── filters.routes.ts
│   ├── models/
│   │   └── types.ts             # TypeScript interfaces
│   ├── jobs/
│   │   └── sync-cron.ts         # Daily sync job
│   ├── middleware/
│   │   ├── error-handler.ts
│   │   └── logger.ts
│   └── utils/
│       └── helpers.ts
├── supabase/
│   └── migrations/
│       └── 001_initial_schema.sql
├── tests/
├── .env.example
├── package.json
├── tsconfig.json
└── README.md
```

## SCHÉMA DATABASE (Supabase PostgreSQL)

Créer les tables suivantes en suivant **EXACTEMENT** ce schéma optimisé pour 500MB:

### Tables principales:

1. **moderation_entries** (données brutes compactes)
   - id VARCHAR(50) PRIMARY KEY
   - application_date DATE NOT NULL
   - content_date DATE NOT NULL
   - platform_id SMALLINT (foreign key platforms)
   - country_code CHAR(2)
   - category_id SMALLINT
   - decision_type_id SMALLINT
   - decision_ground_id SMALLINT
   - content_type_id SMALLINT
   - automated_detection BOOLEAN
   - automated_decision BOOLEAN
   - territorial_scope JSONB
   - created_at TIMESTAMP

2. **platforms**, **categories**, **decision_types**, **decision_grounds**, **content_types**
   - Tables de référence (normalization)
   - id SMALLINT PRIMARY KEY
   - name VARCHAR/TEXT UNIQUE

3. **aggregated_stats** (métriques pré-calculées)
   - id SERIAL PRIMARY KEY
   - stat_date DATE NOT NULL
   - stat_type VARCHAR(50) ('daily', 'weekly', 'monthly')
   - kpi_metrics JSONB
   - by_platform JSONB
   - by_category JSONB
   - etc.

4. **sync_log** (historique syncs)
   - id SERIAL PRIMARY KEY
   - sync_date TIMESTAMP
   - status VARCHAR(20)
   - records_fetched INTEGER
   - execution_time_ms INTEGER

**Voir le schéma SQL complet dans la section "3. MODÈLE POSTGRESQL MINIMAL" ci-dessus**

## API DSA TRANSPARENCY DATABASE

**Base URL**: `https://transparency.dsa.ec.europa.eu/api/v2`

**Endpoints à utiliser:**

### GET `/api/v2/statement`
Paramètres query:
- page, per_page (max 100)
- sort: 'created_at', order: 'desc'/'asc'
- start_date, end_date (ISO 8601)
- decision_visibility, automated_detection, automated_decision
- category, platform_name, countries_list

Rate limit: ~100-200 req/min
Pagination max: 10 000 résultats total

### GET `/api/v2/platform`
Liste des plateformes (à cacher en DB)

### GET `/api/v2/categories`
Catégories de contenu (à cacher en DB)

## ENDPOINTS À CRÉER

Créer les routes REST suivantes:

### 1. GET `/api/health`
- Check DB connection
- Return last sync info
- Return DB stats

### 2. GET `/api/stats`
Query params: startDate, endDate, platforms, categories, countries
Return:
```json
{
  "totalActions": 350420,
  "platformCount": 8,
  "countryCount": 27,
  "averageDelay": 4.2,
  "automatedDetectionRate": 85,
  "automatedDecisionRate": 72
}
```

### 3. GET `/api/aggregations`
Same query params
Return: agrégations pour tous les graphiques du dashboard
(voir section 5.3 pour structure complète)

### 4. GET `/api/time-series`
Same query params
Return: données temporelles par mois
(voir section 5.4 pour structure complète)

### 5. GET `/api/filters`
Return: valeurs uniques pour dropdowns
(voir section 5.5 pour structure complète)

## LOGIQUE ETL

Créer un job cron quotidien (2h AM UTC) qui:

1. **Fetch** nouvelles données depuis DSA API
   - Query incrémentale: dernières 24-48h
   - Pagination: 100 items/page
   - Rate limiting: 600ms entre requêtes
   - Max 10 000 entrées/jour

2. **Transform** données
   - Mapper fields DSA → DB schema
   - Resolve IDs (platforms, categories, etc.)
   - Calculate delay_days = application_date - content_date
   - Validate with Zod schemas

3. **Load** into Supabase
   - Batch upsert (500 rows/batch)
   - INSERT ... ON CONFLICT DO UPDATE
   - Transaction pour cohérence

4. **Aggregate** statistics
   - Calculer stats quotidiennes
   - Update aggregated_stats table
   - Refresh materialized view

5. **Log** résultats dans sync_log

**Gestion erreurs:**
- Retry avec backoff exponentiel si 429
- Max 3 tentatives
- Log errors mais continue process
- Notification si échec total

## CONFIGURATION ENV

Variables d'environnement requises:

```env
# Supabase
SUPABASE_URL=https://xxx.supabase.co
SUPABASE_ANON_KEY=eyJxxx...
SUPABASE_SERVICE_ROLE_KEY=eyJxxx...

# DSA API
DSA_API_BASE_URL=https://transparency.dsa.ec.europa.eu/api/v2
DSA_API_RATE_LIMIT_DELAY_MS=600

# Server
PORT=3000
NODE_ENV=production

# Cron
SYNC_CRON_SCHEDULE=0 2 * * *
SYNC_ENABLED=true

# Logging
LOG_LEVEL=info
```

## EXIGENCES SPÉCIFIQUES

1. **TypeScript strict mode** activé
2. **Validation Zod** pour tous les inputs API
3. **Error handling** robuste avec try/catch
4. **Logging Winston** structuré (JSON format)
5. **Tests Jest** pour services critiques
6. **Documentation JSDoc** pour fonctions publiques
7. **CORS** configuré pour frontend
8. **Rate limiting** sur endpoints publics
9. **Health checks** pour monitoring
10. **Graceful shutdown** du serveur

## OPTIMISATIONS REQUISES

1. **Queries SQL optimisées** avec indexes
2. **Batch processing** pour inserts
3. **Connection pooling** Supabase
4. **Cache in-memory** pour référentiels
5. **Pagination** pour large datasets
6. **Compression gzip** pour responses
7. **Lazy loading** des données

## DÉPLOIEMENT

Target: Vercel Functions ou Railway

- Build script: `tsc && node dist/index.js`
- Health endpoint: `/api/health`
- Cron trigger: Vercel Cron ou cron-job.org webhook

## LIVRABLES ATTENDUS

Génère le code complet incluant:

1. ✅ Setup projet TypeScript + Express
2. ✅ Configuration Supabase client
3. ✅ Migration SQL initiale (001_initial_schema.sql)
4. ✅ Service DSA API client avec rate limiting
5. ✅ Service ETL avec logique de transformation
6. ✅ Service d'agrégation
7. ✅ Routes API (health, stats, aggregations, time-series, filters)
8. ✅ Job cron quotidien
9. ✅ Middleware error handler + logger
10. ✅ Types TypeScript + validation Zod
11. ✅ Tests unitaires pour services critiques
12. ✅ README.md avec instructions setup/déploiement
13. ✅ .env.example
14. ✅ package.json avec scripts npm

## EXEMPLE DE CODE ATTENDU

Pour chaque fichier, génère du code production-ready:

**Example: src/services/dsa-api.service.ts**
```typescript
import axios, { AxiosInstance } from 'axios';
import { z } from 'zod';
import { config } from '../config/env';
import { logger } from '../middleware/logger';

// Zod schemas pour validation
const DSAStatementSchema = z.object({
  id: z.string(),
  created_at: z.string(),
  // ... tous les champs
});

export class DSAApiService {
  private client: AxiosInstance;
  private rateLimitDelay: number;

  constructor() {
    this.client = axios.create({
      baseURL: config.DSA_API_BASE_URL,
      timeout: 30000,
    });
    this.rateLimitDelay = config.DSA_API_RATE_LIMIT_DELAY_MS;
  }

  async fetchStatements(params: {
    start_date: string;
    end_date: string;
    page: number;
    per_page: number;
  }): Promise<DSAStatement[]> {
    try {
      // Implementation avec retry logic
      // Rate limiting
      // Error handling
      // Validation Zod
    } catch (error) {
      logger.error('Failed to fetch DSA statements', { error });
      throw error;
    }
  }

  // ... autres méthodes
}
```

Génère tous les fichiers avec ce niveau de qualité et de détail.

## CONTRAINTES CRITIQUES

⚠️ **NE PAS:**
- Stocker champs texte longs inutiles
- Dépasser 500MB Supabase
- Faire plus de 100 req/min vers DSA API
- Utiliser INTEGER au lieu de SMALLINT pour IDs
- Oublier les indexes sur colonnes filtrées

✅ **TOUJOURS:**
- Valider inputs avec Zod
- Logger erreurs avec contexte
- Utiliser transactions DB
- Gérer graceful shutdown
- Tester error paths

---

**Génère maintenant tout le code backend selon ces spécifications.**
```

---

## 📚 ANNEXES

### A. Checklist Backend Developer

- [ ] Analyser API DSA endpoints disponibles
- [ ] Setup projet Node.js TypeScript
- [ ] Configurer Supabase client
- [ ] Créer migration SQL initiale
- [ ] Implémenter DSA API client
- [ ] Implémenter ETL service
- [ ] Créer routes API
- [ ] Setup cron job quotidien
- [ ] Ajouter error handling
- [ ] Écrire tests unitaires
- [ ] Documenter API (Swagger)
- [ ] Tester en local
- [ ] Déployer sur Vercel/Railway
- [ ] Configurer monitoring
- [ ] Tester intégration frontend

### B. Ressources Utiles

**Documentation:**
- Supabase Docs: https://supabase.com/docs
- DSA Transparency Database: https://transparency.dsa.ec.europa.eu
- Express.js: https://expressjs.com
- Zod: https://zod.dev

**Tools:**
- Postman/Insomnia pour tester API
- TablePlus/pgAdmin pour DB
- Vercel CLI pour déploiement
- cron-job.org pour cron externe

### C. Monitoring & Alertes

**Métriques à surveiller:**
- Santé Supabase (uptime)
- Taille DB (% de 500MB)
- Succès/échecs sync quotidien
- Temps d'exécution queries
- Rate limit DSA API

**Alertes:**
- Email si sync échoue 2 jours consécutifs
- Email si DB > 90% full
- Email si API DSA down

---

## 🎯 CONCLUSION

Ce plan fournit une architecture backend **complète, optimisée et scalable** pour votre DSA Transparency Dashboard, tout en respectant les **contraintes strictes du plan gratuit Supabase (500MB)**.

**Points clés:**
✅ Architecture ETL légère et efficace
✅ Schéma DB normalisé et compact (~146MB pour 500K entries)
✅ Endpoints API optimisés pour le dashboard
✅ Stratégie de synchronisation incrémentale
✅ Gestion robuste des erreurs et rate limits
✅ Code production-ready TypeScript

**Le prompt final (section 6) est prêt à être copié dans Cursor pour générer tout le backend automatiquement.**

Bonne chance avec l'implémentation! 🚀

