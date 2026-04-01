# README Monitoring Dashboard - Projet DSA

## 1) Contexte

Le projet principal dsa-dashboard expose une application metier.
La partie monitoring a été mise en place dans le dossier monitoring pour:
- observer l'etat de la VM et des conteneurs,
- centraliser les metriques,
- visualiser la sante globale dans Grafana

Point d'entree de cette partie:
- monitoring/docker-compose.yml

---

## 2) Stack Monitoring

### Services et roles

- Prometheus (prom/prometheus:v3.10.0): collecte et stocke les metriques time-series.
- Grafana (grafana/grafana:12.3.5): visualisation des metriques via dashboards.
- cAdvisor (gcr.io/cadvisor/cadvisor:v0.51.0): metriques des conteneurs Docker (CPU, RAM, reseau, filesystem).
- node-exporter (prom/node-exporter:v1.10.0): metriques host Linux (CPU, memoire, disque, reseau, load).

### Comment ils travaillent ensemble

1. cAdvisor et node-exporter exposent des endpoints /metrics.
2. Prometheus scrape ces endpoints via la configuration prometheus.yml.
3. Grafana interroge Prometheus pour afficher les dashboards.

### Ports exposes

- Prometheus: 9090:9090
- Grafana: 3002:3000
- cAdvisor: 8080:8080
- node-exporter: 9100:9100

### Volumes

- prometheus_data pour la persistence Prometheus.
- grafana_data pour la persistence Grafana.
- La config Prometheus:
  - ./prometheus.yml:/etc/prometheus/prometheus.yml

---

## 3) Configuration Annexe

Fichier principal:
- monitoring/prometheus.yml

Jobs definis:
1. job prometheus -> localhost:9090
2. job cadvisor -> cadvisor:8080
3. job node-exporter -> node-exporter:9100

---

## 4) Dashboards Grafana et Liens Metriques

### Dashboards utilises

- Dashboards monitoring infra/containers (datasource Prometheus), notamment:
  - CPU host/container,
  - mémoire,
  - réseau,
  - état des services.

### Source de donnees

- Dashboards infra/container -> Prometheus.

---

## 5) Prerequis

1. Docker et Docker Compose installes sur la VM.
2. Dossier monitoring présent avec au minimum:
   - docker-compose.yml
   - prometheus.yml
3. Services cibles (backend) accessibles depuis la VM.

---

## 6) Commandes d'Exploitation

### Lancer la stack monitoring

```bash
cd monitoring
sudo docker compose up -d
```

### Verifier les services

```bash
sudo docker compose ps
sudo docker ps --format 'table {{.Names}}\t{{.Status}}\t{{.Ports}}'
```

### Acces UI

- Grafana: http://localhost:3002
- Prometheus: http://localhost:9090
- cAdvisor: http://localhost:8080

---

## 7) Conclusion

La partie monitoring est finalisée:

- Observabilite composée de Prometheus + cAdvisor + node-exporter + Grafana.
