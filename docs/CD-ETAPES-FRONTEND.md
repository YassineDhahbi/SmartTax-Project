# SmartTax — CD Frontend (Windows + monorepo smarttax)

Deploiement du **frontend GHCR** dans le stack Docker **unique** du monorepo (`docker-compose.yml`).

Backend, Postgres, Kafka, ML restent dans le meme projet `smarttax`.

---

## Architecture

```
SmartTax-Project/          ← un seul endroit
  docker-compose.yml       ← frontend image GHCR + backend build + kafka + ml
  .env
  scripts/update-frontend.ps1
```

Plus besoin de `C:\smarttax-deploy` pour le quotidien.

---

## 1. Configuration `.env` (racine monorepo)

```env
FRONTEND_IMAGE=ghcr.io/yassinedhahbi/smarttax-project:latest
BACKEND_IMAGE=ghcr.io/yassinedhahbi/smarttax-backend:latest
```

---

## 2. Mise a jour manuelle du frontend

```powershell
cd "C:\Users\yassi\Desktop\Stage PFE 2026\Application\SmartTax-Project"
.\scripts\update-frontend.ps1
```

Equivalent :

```powershell
docker compose pull frontend
docker compose --profile ui up -d frontend
```

---

## 3. Stack complete

```powershell
docker compose --profile local-db --profile ui --profile ml up -d
```

Kafka : `docker compose -f docker-compose.kafka.yml up -d` (si separe).

---

## 4. CD automatique (GitHub Actions)

### Self-hosted runner

Repo **SmartTax-Project** → Settings → Actions → Runners → Windows, label **`smarttax`**.

### Secrets

| Secret | Valeur |
|--------|--------|
| `GHCR_READ_TOKEN` | PAT GitHub `read:packages` |
| `SMARTTAX_MONOREPO_PATH` | `C:\Users\yassi\Desktop\Stage PFE 2026\Application\SmartTax-Project` |

### Workflows

- `.github/workflows/cd.yml` (monorepo)
- `Frontend/.github/workflows/cd.yml` (si repo frontend separe)

Declenchement : apres CI + Publish GHCR reussi sur `main`.

---

## 5. Dev local (build au lieu de GHCR)

Dans `docker-compose.yml`, service `frontend` :

```yaml
# image: ...
# pull_policy: always
build:
  context: ./Frontend
  dockerfile: Dockerfile
```

---

## 6. Rapport PFE

> « Le deploiement continu met a jour le conteneur frontend depuis GHCR dans le stack Docker Compose unifie du projet SmartTax, sans impacter les services backend, Kafka et microservices ML. »

---

## Etape suivante

CD backend : meme principe avec `image: ghcr.io/.../smarttax-backend:latest` dans `docker-compose.yml`.
