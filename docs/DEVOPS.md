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

1. **Backend** — `mvn package` (compilation, sans tests DB)
2. **Frontend** — `npm ci` + `ng build` (configuration `docker`)
3. **Docker** — construction des images backend et frontend (sans push)

Les services ML (OCR, face, sentiment) ne sont pas dans la CI : builds lents et lourds en RAM. Ils restent valides via Docker Compose en local.

---

## Activer la CI sur GitHub (premiere fois)

### 1. Pousser le workflow

```powershell
cd "c:\Users\yassi\Desktop\Stage PFE 2026\Application\SmartTax-Project"
git add .github/workflows/ci.yml docs/DEVOPS.md
git commit -m "ci: add GitHub Actions pipeline for backend, frontend and Docker"
git push origin main
```

(Remplacez `main` par votre branche par defaut si besoin.)

### 2. Verifier sur GitHub

1. Ouvrez votre depot sur **https://github.com**
2. Onglet **Actions**
3. Si demande : **I understand my workflows, go ahead and enable them**
4. Cliquez sur le workflow **CI** — run en cours ou termine
5. Coche verte = succes ; rouge = ouvrir les logs du job en echec

### 3. Badge dans le README (optionnel)

```markdown
![CI](https://github.com/VOTRE_USER/VOTRE_REPO/actions/workflows/ci.yml/badge.svg)
```

Remplacez `VOTRE_USER` et `VOTRE_REPO`.

---

## Structure du pipeline

```
.github/workflows/ci.yml
├── job backend     → Java 17 + Maven
├── job frontend    → Node 20 + npm
└── job docker-images (apres 1 et 2) → buildx, pas de push
```

---

## Pourquoi les tests Maven sont desactives en CI

Le test `ArabSoftBackApplicationTests.contextLoads()` demarre tout le contexte Spring avec la base definie dans `application.properties` (PostgreSQL sur `192.168.144.141`). Cette machine n existe pas sur les runners GitHub.

Pour activer les tests plus tard :

- ajouter `src/test/resources/application.properties` (profil test + PostgreSQL de service CI), ou
- utiliser Testcontainers / H2.

En attendant, la CI garantit que le **code compile** et que le **front se build**.

---

## Etape suivante : Registry (images)

Quand la CI est verte, ajouter un job qui pousse les images vers **GitHub Container Registry** :

```yaml
# Exemple (a ajouter plus tard, avec secrets)
- uses: docker/login-action@v3
  with:
    registry: ghcr.io
    username: ${{ github.actor }}
    password: ${{ secrets.GITHUB_TOKEN }}
- uses: docker/build-push-action@v6
  with:
    push: true
    tags: ghcr.io/${{ github.repository }}/backend:${{ github.sha }}
```

Puis deploiement sur une VM : `docker pull` + `docker compose up -d`.

---

## Depannage

| Probleme | Piste |
|----------|--------|
| Workflow absent dans Actions | Fichier pas pousse ou mauvaise branche |
| Echec `npm ci` | Commiter `Frontend/package-lock.json` |
| Echec Maven | Verifier Java 17 dans `pom.xml` |
| Timeout job Docker | Normal la 1re fois (telechargement Maven/DJL) ; relancer le run |
| Secrets / .env | Ne jamais commiter `.env` ; la CI n en a pas besoin pour compiler |

---

## Commandes locales (meme verifications que la CI)

```powershell
cd ArabSoftBack
mvn -B -DskipTests package

cd ..\Frontend
npm ci
npm run build -- --configuration docker

cd ..
docker compose build backend frontend
```
