# SmartTax - Deploiement Docker (etape par etape)

Prerequis : **Docker Desktop** installe et demarre.

---

## Etape 1 - Backend + PostgreSQL + Kafka (commencer ici)

### Commandes

```powershell
cd "c:\Users\yassi\Desktop\Stage PFE 2026\Application\SmartTax-Project"
copy .env.docker.example .env
# Editez .env : POSTGRES_PASSWORD et POSTGRES_HOST si besoin
```

Arretez le backend Spring Boot de l'IDE (port **8080**). Gardez `npm start` pour le front Angular.

```powershell
docker network create smarttax-net 2>$null
docker rm -f smarttax-kafka
docker compose -f docker-compose.kafka.yml up -d
docker compose build backend
docker compose up -d backend --force-recreate
docker compose logs -f backend
```

Le `.env` doit pointer vers **votre** PostgreSQL (ex. `192.168.144.141` / `ArabSoft_db`). Sinon Docker utilise une base vide : ecrans vides, `No user found with id: 57`.

Postgres Docker local (optionnel, base vide) :
```powershell
docker compose --profile local-db up -d postgres
```

Verifier : `docker network inspect smarttax-net` doit lister `smarttax-kafka` et `smarttax-backend`.

### Verification

- http://localhost:8080 renvoie **403** (normal, securite Spring) � ce n'est pas une panne
- Test public : http://localhost:8080/api/test/...
- Front : `npm start` puis http://localhost:4200
- `docker compose ps` : backend = running

### Arret

```powershell
docker compose down
```

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

Puis redemarrer le backend pour qu'il joigne le service OCR :

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

- Sentiment : http://localhost:8010/health ? `{"status":"ok"}`
- Face : http://localhost:8005/health

---

## Tout lancer

```powershell
docker compose --profile ui --profile ml up -d --build
```

---

## Fichiers cles

| Fichier | Role |
|---------|------|
| `docker-compose.yml` | Orchestration |
| `.env` | Secrets locaux (non commite) |
| `ArabSoftBack/Dockerfile` | Image backend |
| `ArabSoftBack/src/main/resources/application-docker.properties` | Config conteneur |
| `Frontend/Dockerfile` | Build Angular + Nginx |
