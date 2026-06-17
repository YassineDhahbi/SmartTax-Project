# SmartTax — Registry (GHCR) — Frontend

Publication automatique de l image Docker frontend sur **GitHub Container Registry** (`ghcr.io`) apres chaque push.

---

## Ou vous en etes

| Etape | Statut |
|-------|--------|
| CI (build Angular) | Fait |
| SonarCloud | Fait |
| **Registry GHCR frontend** | Ce document |
| Registry backend | Etape suivante |
| CD (deploy auto) | Apres registry |

---

## Ce que fait le pipeline

A chaque **push** sur `main` / `master` / `develop` :

1. Job **frontend** : `npm ci` + build + SonarCloud
2. Job **publish-image** (apres frontend, push `main`/`master` uniquement) :
   - build de l image Docker (`Dockerfile`)
   - push vers `ghcr.io/VOTRE_USER/VOTRE_REPO-FRONTEND`

Sur une **pull request** : CI seulement, **pas de push** registry.

### Tags publies

| Tag | Quand |
|-----|--------|
| `latest` | push sur la branche par defaut (`main`) |
| `<sha-git>` | chaque push (ex. `a1b2c3d`) |
| `<nom-branche>` | ex. `develop` |

Exemple : `ghcr.io/yassinedhahbi/smarttax-frontend:latest`

---

## Prerequis GitHub

### 1. Permissions du workflow

Le job **Publish image (GHCR)** est dans `Frontend/.github/workflows/ci.yml` :

```yaml
permissions:
  contents: read
  packages: write
```

`GITHUB_TOKEN` est fourni automatiquement — **pas de secret a creer** pour GHCR.

### 2. Visibilite du package (apres le 1er push)

1. GitHub → votre profil → **Packages**
2. Ouvrez le package `smarttax-frontend` (ou le nom de votre repo)
3. **Package settings** → **Change visibility** (Public pour demo PFE, ou Private)

Pour un depot **prive**, liez le package au repo :
**Package settings** → **Manage Actions access** → autoriser le repo frontend.

---

## Activer sur le repo frontend

### 1. Pousser le workflow

Depuis le clone du **repo GitHub frontend** :

```powershell
cd "C:\chemin\vers\repo-frontend"

git add .github/workflows/ci.yml
git commit -m "ci: publish frontend Docker image to GHCR"
git push origin main
```

Ou depuis ce monorepo :

```powershell
cd "C:\Users\yassi\Desktop\Stage PFE 2026\Application\SmartTax-Project\Frontend"

git add .github/workflows/ci.yml
git commit -m "ci: publish frontend Docker image to GHCR"
git push origin main
```

### 2. Verifier sur GitHub Actions

1. Repo frontend → **Actions**
2. Run **CI** → job **Publish image (GHCR)** doit etre vert
3. **Packages** (profil GitHub) → image visible

---

## Utiliser l image publiee

### Tirer l image (autre machine / VM demo)

```powershell
docker login ghcr.io -u VOTRE_USER_GITHUB
# Mot de passe : Personal Access Token (read:packages) ou GITHUB_TOKEN

docker pull ghcr.io/VOTRE_USER/VOTRE_REPO-FRONTEND:latest
```

### Lancer le conteneur seul (test)

```powershell
docker run -d -p 4200:80 --name smarttax-front ghcr.io/VOTRE_USER/VOTRE_REPO-FRONTEND:latest
```

> Le frontend a besoin du **backend** pour `/api` et `/ws`. En production, utilisez Docker Compose ou Kubernetes avec les deux services.

### Avec Docker Compose (remplacer build local)

Dans `docker-compose.yml` (exemple futur) :

```yaml
frontend:
  image: ghcr.io/yassinedhahbi/smarttax-frontend:latest
  # build: ...  # commenter le build local
```

---

## Personal Access Token (optionnel)

`GITHUB_TOKEN` en CI suffit pour **pousser**. Pour `docker pull` depuis une machine externe sans etre connecte a Actions :

1. GitHub → **Settings** → **Developer settings** → **Personal access tokens**
2. Creer un token avec `read:packages`
3. `docker login ghcr.io -u VOTRE_USER` → coller le token

---

## Depannage

| Probleme | Solution |
|----------|----------|
| `denied: permission_denied` | Verifier `packages: write` dans le workflow ; lier le package au repo |
| Job publish-image saute | Normal sur **pull request** ; pousser sur `main` |
| Image introuvable au pull | Verifier visibilite du package (Public ou token `read:packages`) |
| Nom image en majuscules | GHCR utilise `lower(github.repository)` automatiquement via metadata |
| Build Docker echoue | Tester en local : `docker build -t test-front .` a la racine du repo front |

---

## Prochaine etape : backend

Meme principe sur le repo **SmartTax-Backend** :

- job Maven + SonarCloud
- job `publish-image` → `ghcr.io/.../smarttax-backend:latest`

Puis CD ou Kubernetes tirera les deux images depuis GHCR.

---

## Pour le rapport PFE

> « Apres la CI et SonarCloud, chaque push sur la branche principale publie automatiquement l image Docker du frontend sur GitHub Container Registry (ghcr.io), prete pour le deploiement sur VM ou Kubernetes. »
