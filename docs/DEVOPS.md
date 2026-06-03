# SmartTax — DevOps (CI avec GitHub Actions)

## Ou vous en etes

| Etape | Statut |
|-------|--------|
| Git + commits GitHub | Fait (prerequis) |
| Docker Compose | Fait — voir [DOCKER-ETAPES.md](./DOCKER-ETAPES.md) |
| **CI (ce document)** | Fichier `.github/workflows/ci.yml` |
| Registry (GHCR / Docker Hub) | Etape suivante |
| CD (deploy auto) | Apres le registry |
| Kubernetes | Optionnel, apres CD |

---

## Ce que fait la CI

A chaque **push** ou **pull request** sur `main`, `master` ou `develop` :

- **Frontend uniquement** — `npm ci` + `ng build` (configuration `docker`)

Le **backend**, les **images Docker** et les services **ML** ne sont pas verifies en CI (build Maven lourd, DB locale, RAM). Validation backend / stack complete : Docker Compose en local — voir [DOCKER-ETAPES.md](./DOCKER-ETAPES.md).

---

## Activer la CI sur GitHub (premiere fois)

### 1. Pousser le workflow

```powershell
cd "c:\Users\yassi\Desktop\Stage PFE 2026\Application\SmartTax-Project"
git add .github/workflows/ci.yml docs/DEVOPS.md
git commit -m "ci: frontend-only GitHub Actions pipeline"
git push origin main
```

(Remplacez `main` par votre branche par defaut si besoin.)

### 2. Verifier sur GitHub

1. Ouvrez votre depot sur **https://github.com**
2. Onglet **Actions**
3. Si demande : **I understand my workflows, go ahead and enable them**
4. Cliquez sur le workflow **CI** — run en cours ou termine
5. Coche verte = succes ; rouge = ouvrir les logs du job **Frontend (Angular)**

### 3. Badge dans le README (optionnel)

```markdown
![CI](https://github.com/VOTRE_USER/VOTRE_REPO/actions/workflows/ci.yml/badge.svg)
```

Remplacez `VOTRE_USER` et `VOTRE_REPO`.

---

## Structure du pipeline

```
.github/workflows/ci.yml
└── job frontend  → Node 20 + npm ci + ng build (docker)
```

---

## Etape suivante : Registry (images)

Quand la CI est verte, vous pouvez ajouter plus tard un job qui pousse l image frontend vers **GitHub Container Registry** :

```yaml
# Exemple (a ajouter plus tard, avec secrets)
- uses: docker/login-action@v3
  with:
    registry: ghcr.io
    username: ${{ github.actor }}
    password: ${{ secrets.GITHUB_TOKEN }}
- uses: docker/build-push-action@v6
  with:
    context: ./Frontend
    push: true
    tags: ghcr.io/${{ github.repository }}/frontend:${{ github.sha }}
```

Puis deploiement sur une VM : `docker pull` + `docker compose up -d`.

---

## Depannage

| Probleme | Piste |
|----------|--------|
| Workflow absent dans Actions | Fichier pas pousse ou mauvaise branche |
| Echec `npm ci` | Commiter `Frontend/package-lock.json` |
| Echec build Angular | Lire les logs ; souvent erreur TypeScript ou budget CSS |
| Backend / Docker | Non couverts par cette CI — tester en local |

---

## Commandes locales (meme verification que la CI)

```powershell
cd Frontend
npm ci
npm run build -- --configuration docker
```

Backend en local (hors CI) :

```powershell
cd ArabSoftBack
mvn -B -DskipTests package
docker compose build backend
```
