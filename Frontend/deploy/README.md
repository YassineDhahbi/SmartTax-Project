# CD Frontend — monorepo smarttax (Windows)

Tout est dans le **monorepo** `SmartTax-Project` (un seul `docker-compose.yml`).

## Mise a jour manuelle du frontend GHCR

```powershell
cd "C:\Users\yassi\Desktop\Stage PFE 2026\Application\SmartTax-Project"
.\scripts\update-frontend.ps1
```

## Stack complete (comme avant)

```powershell
docker compose --profile local-db --profile ui --profile ml up -d
```

Le frontend utilise l'image GHCR par defaut (`FRONTEND_IMAGE` dans `.env`).

## Build local frontend (dev)

Dans `docker-compose.yml`, commentez `image` / `pull_policy` et decommentez `build`.

## CD automatique (GitHub)

Secrets repo **SmartTax-Project** :

| Secret | Exemple |
|--------|---------|
| `GHCR_READ_TOKEN` | PAT `read:packages` |
| `SMARTTAX_MONOREPO_PATH` | `C:\Users\yassi\Desktop\Stage PFE 2026\Application\SmartTax-Project` |

Runner self-hosted Windows, label `smarttax`.

Guide : `docs/CD-ETAPES-FRONTEND.md`

## Dossier C:\smarttax-deploy

**Optionnel / obsolete** — utilisez le monorepo a la place.
