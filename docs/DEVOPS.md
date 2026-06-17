# SmartTax — DevOps (GitHub Actions)

## Ou vous en etes

| Etape | Statut |
|-------|--------|
| Git + commits GitHub | Fait |
| Docker Compose | Fait — [DOCKER-GUIDE-COMPLET.md](./DOCKER-GUIDE-COMPLET.md) |
| CI (build) | Fait |
| SonarCloud | Fait — [SONAR-ETAPES.md](./SONAR-ETAPES.md) |
| **Registry GHCR (frontend)** | [REGISTRY-ETAPES.md](./REGISTRY-ETAPES.md) |
| Registry GHCR (backend) | A faire |
| **CD frontend (Windows)** | [CD-ETAPES-FRONTEND.md](./CD-ETAPES-FRONTEND.md) |
| CD backend (VM) | Apres CD frontend |
| Kubernetes | Optionnel |

---

## Pipeline frontend (repo separe)

Fichier : `Frontend/.github/workflows/ci.yml`

```
push / PR
  └── job frontend     → npm ci + ng build + SonarCloud
  └── job publish-image (push seulement) → build Docker + push ghcr.io
```

Detail registry : [REGISTRY-ETAPES.md](./REGISTRY-ETAPES.md)

---

## Secrets GitHub (repo frontend)

| Secret | Usage |
|--------|--------|
| `SONAR_TOKEN` | Analyse SonarCloud |
| `SONAR_ORGANIZATION` | ex. `yassinedhahbi` |
| `GITHUB_TOKEN` | Automatique — push GHCR (pas a creer) |

---

## Commandes push (registry frontend)

```powershell
cd "C:\Users\yassi\Desktop\Stage PFE 2026\Application\SmartTax-Project\Frontend"

git add .github/workflows/ci.yml
git commit -m "ci: publish frontend Docker image to GHCR"
git push origin main
```

Verifier : **Actions** → job **Publish image (GHCR)** → **Packages** sur GitHub.

---

## Depannage CI

| Probleme | Piste |
|----------|--------|
| Echec `npm ci` | Commiter `package-lock.json` |
| Echec SonarCloud | [SONAR-ETAPES.md](./SONAR-ETAPES.md) |
| Echec push GHCR | [REGISTRY-ETAPES.md](./REGISTRY-ETAPES.md) — permissions `packages: write` |
