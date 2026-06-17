# SmartTax - Deploiement Docker (etape par etape)

> **Documentation complete :** voir [DOCKER-GUIDE-COMPLET.md](./DOCKER-GUIDE-COMPLET.md) (architecture, migration VM, depannage, checklist soutenance).

Prerequis : **Docker Desktop** installe et demarre.

---

## Base de donnees : sans VM (recommande)

Par defaut, le backend pointait vers PostgreSQL sur une **VM Oracle Linux** (`192.168.144.141`). Il fallait allumer la VM a chaque fois.

**Solution :** lancer PostgreSQL **dans Docker** avec le profil `local-db`. Seul **Docker Desktop** doit etre demarre.

### Configuration `.env`

```powershell
cd "c:\Users\yassi\Desktop\Stage PFE 2026\Application\SmartTax-Project"
copy .env.docker.example .env
```

Dans `.env`, utilisez :

```properties
POSTGRES_HOST=postgres
POSTGRES_PORT=5432
POSTGRES_DB=arabsoft_db
POSTGRES_USER=postgres
POSTGRES_PASSWORD=MonPass123
```

`postgres` = nom du conteneur sur le reseau `smarttax-net` (pas l IP de la VM).

### Demarrer la stack avec la base Docker

```powershell
docker network create smarttax-net 2>$null
docker rm -f smarttax-kafka 2>$null
docker compose -f docker-compose.kafka.yml up -d

docker compose --profile local-db --profile ui --profile ml up -d --build
```

### Verifier PostgreSQL

```powershell
docker compose ps
docker compose logs postgres --tail 20
docker exec smarttax-postgres pg_isready -U postgres -d arabsoft_db
```

Les donnees sont conservees dans le volume Docker **`postgres_data`** (meme apres `docker compose down`).

### Importer les donnees depuis la VM (une seule fois)

Quand la VM est encore accessible :

**1. Export sur la VM Oracle Linux :**

```bash
sudo -u postgres pg_dump -d ArabSoft_db -F c -f /tmp/arabsoft_backup.dump
```

Copiez `arabsoft_backup.dump` sur Windows.

**2. Import dans PostgreSQL Docker :**

```powershell
docker compose --profile local-db up -d postgres
docker cp arabsoft_backup.dump smarttax-postgres:/tmp/
docker exec smarttax-postgres pg_restore -U postgres -d arabsoft_db --clean --if-exists /tmp/arabsoft_backup.dump
```

Si la base n existe pas encore dans le conteneur :

```powershell
docker exec -it smarttax-postgres psql -U postgres -c "CREATE DATABASE arabsoft_db;"
```

> PostgreSQL Docker cree par defaut `arabsoft_db` (minuscules). Utilisez le meme nom dans `.env` (`POSTGRES_DB=arabsoft_db`).

Puis relancez `pg_restore`.

### Mode VM (ancien)

Si vous preferez garder la base sur Oracle Linux, dans `.env` :

```properties
POSTGRES_HOST=192.168.144.141
```

Sans profil `local-db` : la VM doit etre allumee.

---

## Etape 1 - Backend + Kafka

Arretez le backend Spring Boot de l'IDE (port **8080**).

```powershell
cd "c:\Users\yassi\Desktop\Stage PFE 2026\Application\SmartTax-Project"
copy .env.docker.example .env

docker network create smarttax-net 2>$null
docker rm -f smarttax-kafka 2>$null
docker compose -f docker-compose.kafka.yml up -d
docker compose build backend
docker compose --profile local-db up -d postgres
docker compose up -d backend --force-recreate
docker compose logs -f backend
```

Verifier : `docker network inspect smarttax-net` doit lister `smarttax-kafka`, `smarttax-postgres` (si local-db) et `smarttax-backend`.

### Verification

- http://localhost:8080 renvoie **403** (normal, securite Spring)
- Test public : http://localhost:8080/api/test/...
- Front : http://localhost:4200 (Docker) ou `npm start` en dev
- `docker compose ps` : backend = running

### Arret

```powershell
docker compose --profile local-db --profile ui --profile ml down
```

Les donnees PostgreSQL restent dans le volume `postgres_data`.

---

## Etape 2 - Frontend (profil ui)

```powershell
docker compose build frontend
docker compose --profile ui up -d frontend
```

- App : http://localhost:4200
- Les appels `/api` passent par Nginx vers le backend.

---

## Etape 3 - OCR (profil ml)

```powershell
docker compose build ocr
docker compose --profile ml up -d ocr
```

- http://localhost:8004/health

Puis redemarrer le backend :

```powershell
docker compose restart backend
```

---

## Etape 4 - Face + Sentiment (profil ml, long)

Le build peut prendre **30-60 min** (DeepFace/TensorFlow, PyTorch). En cas de timeout pip, relancer `docker compose build`.

```powershell
docker compose build face-verification sentiment
docker compose --profile ml up -d face-verification sentiment
docker compose restart backend
```

- Sentiment : http://localhost:8010/health
- Face : http://localhost:8005/health (premier appel lent : telechargement modele)

---

## Tout lancer (sans VM)

```powershell
docker compose --profile local-db --profile ui --profile ml up -d --build
```

Kafka (si pas deja lance) :

```powershell
docker compose -f docker-compose.kafka.yml up -d
```

---

## WebSocket, uploads, premier lancement Face

| Sujet | Detail |
|-------|--------|
| **WebSocket** (reclamations) | Nginx proxy `/ws` — fonctionne sur http://localhost:4200 en Docker |
| **Images** (profil, publications) | Volume `backend_uploads` ou bind mount `./ArabSoftBack/uploads:/app/uploads` via `docker-compose.override.yml` |
| **Face lent au 1er appel** | Normal (preload modele ~1-3 min) ; healthcheck `/ready` sur le conteneur face |

---

## Fichiers cles

| Fichier | Role |
|---------|------|
| `docker-compose.yml` | Orchestration (+ profil `local-db` pour PostgreSQL) |
| `.env` | Secrets locaux (non commite) — `POSTGRES_HOST=postgres` sans VM |
| `.env.docker.example` | Modele `.env` recommande |
| `docker-compose.override.yml` | Optionnel : partage uploads local/Docker |
| `ArabSoftBack/Dockerfile` | Image backend |
| `ArabSoftBack/src/main/resources/application-docker.properties` | Config conteneur |
| `Frontend/Dockerfile` | Build Angular + Nginx |
