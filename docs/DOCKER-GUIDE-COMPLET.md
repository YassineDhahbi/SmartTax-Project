# SmartTax — Guide Docker complet (PFE)

Documentation unique : architecture, configuration, commandes, depannage et checklist soutenance.

**Prerequis :** Docker Desktop installe et demarre sur Windows.

---

## Table des matieres

1. [Architecture](#1-architecture)
2. [Fichiers du projet](#2-fichiers-du-projet)
3. [Configuration `.env`](#3-configuration-env)
4. [Demarrage rapide (sans VM)](#4-demarrage-rapide-sans-vm)
5. [Deploiement etape par etape](#5-deploiement-etape-par-etape)
6. [Base de donnees PostgreSQL](#6-base-de-donnees-postgresql)
7. [Migration VM Oracle Linux vers Docker](#7-migration-vm-oracle-linux-vers-docker)
8. [Kafka](#8-kafka)
9. [Uploads et images](#9-uploads-et-images)
10. [WebSocket (reclamations temps reel)](#10-websocket-reclamations-temps-reel)
11. [Services ML (OCR, Face, Sentiment, SWIN)](#11-services-ml-ocr-face-sentiment-swin)
12. [Mode developpement vs Docker](#12-mode-developpement-vs-docker)
13. [Commandes utiles](#13-commandes-utiles)
14. [Depannage](#14-depannage)
15. [Checklist soutenance](#15-checklist-soutenance)

---

## 1. Architecture

```
Navigateur  http://localhost:4200
    |
    v
+-------------+     /api, /ws, /uploads
|  frontend   | ------------------------+
|  (Nginx)    |                         |
+-------------+                         v
                              +------------------+
                              |     backend      |
                              |  (Spring Boot)   |
                              +------------------+
                                 |    |    |    |
            +--------------------+    |    |    +------------------+
            v                         v    v                       v
     +------------+            +-------+ +-------+            +-----------+
     |  postgres  |            |  ocr  | | face  |            | sentiment |
     | (local-db) |            | :8004 | | :8005 |            |   :8010   |
     +------------+            +-------+ +-------+            +-----------+
            |
     +------------+
     |   kafka    |  (docker-compose.kafka.yml)
     +------------+
```

| Service | Conteneur | Port hote | Profil Compose |
|---------|-----------|-----------|----------------|
| PostgreSQL | `smarttax-postgres` | 5432 | `local-db` |
| Backend | `smarttax-backend` | 8080 | (defaut) |
| Frontend | `smarttax-frontend` | 4200 | `ui` |
| OCR | `smarttax-ocr` | 8004 | `ml` |
| Face | `smarttax-face` | 8005 | `ml` |
| Sentiment | `smarttax-sentiment` | 8010 | `ml` |
| Kafka | `smarttax-kafka` | 9092 | fichier separe |

Reseau Docker partage : **`smarttax-net`**.

---

## 2. Fichiers du projet

| Fichier | Role |
|---------|------|
| `docker-compose.yml` | Orchestration principale |
| `docker-compose.kafka.yml` | Kafka separe (evite conflits) |
| `docker-compose.override.yml` | Optionnel : uploads partages IDE/Docker |
| `.env` | Secrets locaux (**ne pas commiter**) |
| `.env.docker.example` | Modele `.env` recommande |
| `ArabSoftBack/Dockerfile` | Image backend (Java 17, SWIN/DJL) |
| `ArabSoftBack/docker-entrypoint.sh` | Permissions `/app/uploads`, user `spring` |
| `ArabSoftBack/src/main/resources/application-docker.properties` | Config Spring en conteneur |
| `Frontend/Dockerfile` | Build Angular + Nginx |
| `Frontend/nginx.conf` | Proxy `/api`, `/ws`, `/uploads` |

### Volumes Docker

| Volume | Contenu |
|--------|---------|
| `postgres_data` | Donnees PostgreSQL (persistantes) |
| `backend_uploads` | Photos profil, publications, documents |
| `backend_logs` | Logs backend |
| `face_deepface_cache` | Cache modeles DeepFace |

---

## 3. Configuration `.env`

```powershell
cd "c:\Users\yassi\Desktop\Stage PFE 2026\Application\SmartTax-Project"
copy .env.docker.example .env
```

### Mode recommande : PostgreSQL dans Docker (sans VM)

```properties
SPRING_PROFILES_ACTIVE=docker

POSTGRES_HOST=postgres
POSTGRES_PORT=5432
POSTGRES_DB=arabsoft_db
POSTGRES_USER=postgres
POSTGRES_PASSWORD=MonPass123

KAFKA_BOOTSTRAP_SERVERS=smarttax-kafka:29092

OCR_SERVICE_URL=http://ocr:8004
FACE_VERIFICATION_SERVICE_URL=http://face-verification:8005
SENTIMENT_SERVICE_URL=http://sentiment:8010

APP_BASE_URL=http://localhost:8080
JWT_SECRET=change-me-in-production-use-long-random-string
```

> **`POSTGRES_HOST=postgres`** = nom du service Docker, pas une IP.  
> **`POSTGRES_DB=arabsoft_db`** = minuscules (nom reel dans le volume Docker).

### Mode alternatif : PostgreSQL sur VM Oracle Linux

```properties
POSTGRES_HOST=192.168.144.141
POSTGRES_DB=ArabSoft_db
```

La VM doit etre allumee. Ne pas utiliser le profil `local-db`.

---

## 4. Demarrage rapide (sans VM)

**Une seule fois** (reseau + Kafka) :

```powershell
cd "c:\Users\yassi\Desktop\Stage PFE 2026\Application\SmartTax-Project"

docker network create smarttax-net 2>$null
docker compose -f docker-compose.kafka.yml up -d
```

**Demarrer toute la stack** :

```powershell
docker compose --profile local-db --profile ui --profile ml up -d
```

**Application :** http://localhost:4200  
**Ne pas lancer** `npm start` en parallele sur le port 4200.

**Verifier :**

```powershell
docker compose ps
```

**Arreter :**

```powershell
docker compose --profile local-db --profile ui --profile ml down
```

Les donnees PostgreSQL et uploads restent dans les volumes.

---

## 5. Deploiement etape par etape

### Etape 0 — Preparation

- Docker Desktop demarre
- Backend Spring Boot de l'IDE **arrete** (port 8080 libre)
- Fichier `.env` configure (voir section 3)

### Etape 1 — Kafka + PostgreSQL + Backend

```powershell
cd "c:\Users\yassi\Desktop\Stage PFE 2026\Application\SmartTax-Project"

docker network create smarttax-net 2>$null
docker rm -f smarttax-kafka 2>$null
docker compose -f docker-compose.kafka.yml up -d

docker compose build backend
docker compose --profile local-db up -d postgres
docker compose up -d backend --force-recreate
docker compose logs -f backend
```

Attendre dans les logs : `Started ArabSoftBackApplication`.

### Etape 2 — Frontend (profil `ui`)

```powershell
docker compose build frontend
docker compose --profile ui up -d frontend
```

- http://localhost:4200

### Etape 3 — OCR (profil `ml`)

```powershell
docker compose build ocr
docker compose --profile ml up -d ocr
docker compose restart backend
```

- http://localhost:8004/health

### Etape 4 — Face + Sentiment (profil `ml`, long)

Build possible **30-60 min** (TensorFlow, DeepFace). En cas d'echec, relancer le build.

```powershell
docker compose build face-verification sentiment
docker compose --profile ml up -d face-verification sentiment
docker compose restart backend
```

- Sentiment : http://localhost:8010/health
- Face ready : http://localhost:8005/ready (peut prendre 1-3 min au premier demarrage)

### Tout reconstruire et lancer

```powershell
docker compose --profile local-db --profile ui --profile ml up -d --build
```

---

## 6. Base de donnees PostgreSQL

### Sans VM (profil `local-db`)

PostgreSQL tourne dans `smarttax-postgres`. Seul Docker Desktop est requis.

**Verifier :**

```powershell
docker exec smarttax-postgres pg_isready -U postgres -d postgres
docker exec smarttax-postgres psql -U postgres -d arabsoft_db -c "\dt"
```

**Lister les bases :**

```powershell
docker exec smarttax-postgres psql -U postgres -c "\l"
```

**Mot de passe desynchronise** (apres changement dans `.env`) :

```powershell
docker exec smarttax-postgres psql -U postgres -c "ALTER USER postgres WITH PASSWORD 'MonPass123';"
docker compose restart backend
```

### Noms de base : piege frequent

| Environnement | Nom de base |
|---------------|-------------|
| VM Oracle Linux | `ArabSoft_db` (majuscules) |
| Docker | `arabsoft_db` (minuscules) |

Dans `.env` Docker : **`POSTGRES_DB=arabsoft_db`**.

Erreur typique dans les logs :

```
FATAL: database "ArabSoft_db" does not exist
```

Cause : healthcheck ou `.env` avec le mauvais nom. Le healthcheck est corrige pour utiliser la base systeme `postgres`.

---

## 7. Migration VM Oracle Linux vers Docker

### Sur la VM — export

```bash
# Lister les bases (utilisateur postgres, pas postgresql-16)
sudo -u postgres psql -l

# Export (IMPORTANT : sudo -u postgres, pas pg_dump -U postgres en tant que yassine)
sudo -u postgres pg_dump -d ArabSoft_db -F c -f /tmp/arabsoft_backup.dump

ls -lh /tmp/arabsoft_backup.dump
```

Alternative avec mot de passe :

```bash
PGPASSWORD='MonPass123' pg_dump -U postgres -h localhost -d ArabSoft_db -F c -f /tmp/arabsoft_backup.dump
```

### Copier vers Windows

```powershell
scp yassine@192.168.144.141:/tmp/arabsoft_backup.dump "C:\Users\yassi\Desktop\Stage PFE 2026\Application\SmartTax-Project\arabsoft_backup.dump"
```

(WinSCP, dossier partage VM, etc. fonctionnent aussi.)

### Import dans Docker

```powershell
cd "C:\Users\yassi\Desktop\Stage PFE 2026\Application\SmartTax-Project"

docker compose stop backend
docker compose --profile local-db up -d postgres

docker cp arabsoft_backup.dump smarttax-postgres:/tmp/arabsoft_backup.dump

docker exec smarttax-postgres pg_restore -U postgres -d arabsoft_db --clean --if-exists /tmp/arabsoft_backup.dump

docker compose up -d backend
docker compose --profile ui --profile ml up -d
```

**Verifier l'import :**

```powershell
docker exec smarttax-postgres psql -U postgres -d arabsoft_db -c "SELECT count(*) FROM utilisateur;"
```

> `--clean` remplace les donnees existantes dans `arabsoft_db`.

---

## 8. Kafka

Kafka est dans un fichier compose separe pour eviter les conflits de conteneur.

```powershell
docker network create smarttax-net 2>$null
docker compose -f docker-compose.kafka.yml up -d
```

Dans `.env` :

```properties
KAFKA_BOOTSTRAP_SERVERS=smarttax-kafka:29092
```

Verifier :

```powershell
docker network inspect smarttax-net
docker ps --filter name=smarttax-kafka
```

---

## 9. Uploads et images

### Stockage backend

Les fichiers sont dans le conteneur sous `/app/uploads` :
- `uploads/users/` — photos profil
- `uploads/publications/` — images publications

Volume Docker : **`backend_uploads`**.

### Partager uploads entre IDE et Docker (optionnel)

Creer `docker-compose.override.yml` a la racine :

```yaml
services:
  backend:
    volumes:
      - ./ArabSoftBack/uploads:/app/uploads
```

Ainsi les memes fichiers sont visibles en local et en Docker.

### URLs images

- En Docker : Nginx proxy `/uploads/` vers le backend
- Le frontend utilise `MediaUrlService` pour resoudre les URLs
- Ne pas hardcoder `http://localhost:8080` dans les templates

---

## 10. WebSocket (reclamations temps reel)

En Docker, tout passe par le frontend Nginx sur le port **4200** :

- `Frontend/nginx.conf` : proxy `/ws` vers `backend:8080/ws`
- `environment.docker.ts` : `wsUrl: '/ws'`

**Test :** messagerie reclamation en temps reel sur http://localhost:4200 (pas besoin de `npm start`).

Si WebSocket ne marche qu'avec `npm start` : le proxy `/ws` manquait dans Nginx (corrige).

---

## 11. Services ML (OCR, Face, Sentiment, SWIN)

| Service | URL interne | Health |
|---------|-------------|--------|
| OCR | `http://ocr:8004` | http://localhost:8004/health |
| Face | `http://face-verification:8005` | http://localhost:8005/ready |
| Sentiment | `http://sentiment:8010` | http://localhost:8010/health |
| SWIN (CIN) | dans le backend `/app/models` | via immatriculation |

### Face verification — premier lancement lent

- DeepFace telecharge le modele Facenet512 au premier appel
- Healthcheck : jusqu'a **5 min** (`start_period: 300s`)
- Timeout backend : **300 s** (`application-docker.properties`)
- Cache : volume `face_deepface_cache`

**Ne pas** lancer le service face en local (port 8005) **et** `smarttax-face` en meme temps.

### Apres ajout des services ML

```powershell
docker compose restart backend
```

---

## 12. Mode developpement vs Docker

| | Developpement (IDE) | Docker |
|--|---------------------|--------|
| Frontend | `npm start` → :4200 | http://localhost:4200 |
| Backend | Spring Boot IDE → :8080 | conteneur :8080 |
| PostgreSQL | VM ou local | `postgres` (profil `local-db`) |
| Base `.env` | `application.properties` | `.env` + profil `docker` |

**Regle :** ne pas utiliser `npm start` et le conteneur frontend sur le **meme port 4200**.

http://localhost:8080 → **403** en Docker est **normal** (Spring Security). Tester via http://localhost:4200.

---

## 13. Commandes utiles

### Etat et logs

```powershell
docker compose ps
docker compose logs -f backend
docker compose logs postgres --tail 30
docker compose logs face-verification --tail 50
```

### Redemarrer un service

```powershell
docker compose restart backend
docker compose restart frontend
```

### Rebuild une image

```powershell
docker compose build backend
docker compose build frontend
docker compose up -d backend --force-recreate
```

### Entrer dans un conteneur

```powershell
docker exec -it smarttax-postgres psql -U postgres -d arabsoft_db
docker exec -it smarttax-backend sh
```

### Nettoyer (attention : supprime les conteneurs)

```powershell
docker compose --profile local-db --profile ui --profile ml down
```

### Supprimer aussi les volumes (EFFACE les donnees)

```powershell
docker compose --profile local-db --profile ui --profile ml down -v
```

---

## 14. Depannage

| Probleme | Cause probable | Solution |
|----------|----------------|----------|
| Ecrans vides / pas d'utilisateurs | Mauvaise base ou base vide | Verifier `.env` `POSTGRES_HOST=postgres`, `POSTGRES_DB=arabsoft_db` ; importer depuis VM |
| `database "ArabSoft_db" does not exist` | Mauvais nom de base | Utiliser `arabsoft_db` dans `.env` |
| `password authentication failed` | Mot de passe volume != `.env` | `ALTER USER postgres WITH PASSWORD '...'` dans le conteneur |
| `authentification peer echouee` (VM) | Mauvais utilisateur | `sudo -u postgres psql` (pas `postgresql-16`) |
| Backend ne demarre pas | Port 8080 occupe | Arreter Spring Boot IDE |
| 403 sur :8080 | Normal | Tester via :4200 |
| WebSocket ne marche pas en Docker | Proxy manquant | Verifier `nginx.conf` `/ws` |
| Images profil/publications cassees | Mauvais chemin uploads | Volume `backend_uploads` ou override bind mount |
| Face timeout / indisponible | 1er chargement modele | Attendre `/ready` ; ne pas lancer face local + Docker |
| Kafka erreur connexion | Kafka absent ou mauvaise URL | `docker compose -f docker-compose.kafka.yml up -d` ; `smarttax-kafka:29092` |
| Dossier vide apres immatriculation | Email/TIN incorrect | Endpoint `/api/immatriculation/my-dossier` |
| `No user found with id: X` | Base Docker vide | Importer dump VM ou utiliser meme PostgreSQL |

### Plan B jour de soutenance

```powershell
docker compose -f docker-compose.kafka.yml up -d
docker compose --profile local-db --profile ui --profile ml up -d
docker compose ps
docker compose logs backend --tail 50
```

---

## 15. Checklist soutenance

Tester sur **http://localhost:4200 uniquement** (stack Docker complete).

- [ ] Connexion contribuable / agent / admin
- [ ] Immatriculation (OCR + face + SWIN)
- [ ] Creation de compte (TIN + code)
- [ ] Dossier + profil (photo)
- [ ] Publications (image)
- [ ] Reclamations (messagerie temps reel WebSocket)
- [ ] Sentiment (si utilise dans l'UI)

**Commande de demarrage :**

```powershell
cd "c:\Users\yassi\Desktop\Stage PFE 2026\Application\SmartTax-Project"
docker compose -f docker-compose.kafka.yml up -d
docker compose --profile local-db --profile ui --profile ml up -d
```

---

## Resume des profils Docker Compose

| Profil | Services |
|--------|----------|
| *(defaut)* | `backend` |
| `local-db` | `postgres` |
| `ui` | `frontend` |
| `ml` | `ocr`, `face-verification`, `sentiment` |
| `with-kafka` | `kafka` (dans docker-compose.yml ; prefere kafka.yml) |

---

*Document SmartTax PFE — Docker, DevOps et deploiement. Derniere mise a jour : juin 2026.*
