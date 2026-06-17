# SmartTax — SonarCloud (Frontend)

Meme procedure que le backend : organisation **yassinedhahbi**, secrets GitHub, analyse a chaque push.

---

## 1. SonarCloud — projet frontend

1. https://sonarcloud.io → connexion GitHub
2. Organisation **yassinedhahbi**
3. **+** → **Analyze new project** → depot **SmartTax-Frontend** (votre repo front)
4. Verifier la **Project key** : `yassinedhahbi_smarttax-frontend` (identique a `Frontend/sonar-project.properties`)

---

## 2. GitHub — 2 secrets sur le repo FRONTEND

**Settings** → **Secrets and variables** → **Actions** → **New repository secret**

| Secret | Valeur |
|--------|--------|
| `SONAR_TOKEN` | SonarCloud → **My Account** → **Security** → **Generate Token** |
| `SONAR_ORGANIZATION` | `yassinedhahbi` (Organization Key, pas le nom affiche) |

> Le backend a les memes secrets sur **SmartTax-Backend**. Chaque repo GitHub doit avoir ses propres secrets (meme token possible).

---

## 3. Fichiers dans le repo frontend

A la **racine** du repo GitHub frontend (contenu du dossier `Frontend/` de ce projet) :

```
.github/workflows/ci.yml
sonar-project.properties
package.json
...
```

---

## 4. Commandes push (repo frontend separe)

### Depuis le clone de votre repo GitHub frontend

```powershell
cd "C:\chemin\vers\SmartTax-Frontend"

git add .github/workflows/ci.yml sonar-project.properties
git commit -m "ci: add SonarCloud analysis with GitHub Actions"
git push origin main
```

(Remplacez `main` par `master` si c est votre branche par defaut.)

### Si vous copiez depuis ce monorepo local

```powershell
cd "C:\Users\yassi\Desktop\Stage PFE 2026\Application\SmartTax-Project\Frontend"

git add .github/workflows/ci.yml sonar-project.properties
git commit -m "ci: add SonarCloud analysis with GitHub Actions"
git push origin main
```

---

## 5. Verification

1. GitHub → repo frontend → **Actions** → workflow **CI**
2. Etape **SonarCloud Scan** : *Quality Gate passed* (comme le backend)
3. SonarCloud → projet **SmartTax Frontend** → **Activity**

Badge optionnel dans le README :

```markdown
[![Quality Gate Status](https://sonarcloud.io/api/project_badges/measure?project=yassinedhahbi_smarttax-frontend&metric=alert_status)](https://sonarcloud.io/summary/new_code?id=yassinedhahbi_smarttax-frontend)
```

---

## Depannage

| Probleme | Solution |
|----------|----------|
| `Project not found` | Creer le projet sur SonarCloud avec la key `yassinedhahbi_smarttax-frontend` |
| HTTP 403 | Verifier `SONAR_TOKEN` et acces au projet |
| Avertissement **Python 3** | Normal si Sonar detectait des fichiers hors Angular. `sonar.sources=src/app` et `sonar.python.file.suffixes=-` dans `sonar-project.properties` |
| **File encoding** warnings | `sonar.sourceEncoding=UTF-8` ; enregistrer les fichiers en UTF-8 dans l IDE |
| **Security Rating C** + 3 New Issues | SonarCloud → **Issues** → **New Code** + **Security** → traiter les 3 issues (Fix ou **Won't fix**) |
| Quality Gate failed (Security Hotspots Reviewed) | **Security Hotspots** → **Review** → Safe / Fixed |
| CI bloquee par la gate | `sonar.qualitygate.wait=false` (deja dans `sonar-project.properties`) : la CI passe, gate visible sur sonarcloud.io |
| Hotspot `githubactions:S7637` | Actions epinglees par SHA complet dans les workflows |
| Fork / untrusted code (`registry.yml`) | GHCR dans `ci.yml` (push main, checkout normal) ; supprimer `registry.yml` |
| `bypassSecurityTrustResourceUrl` Blocker | Utiliser `sanitizer.sanitize(SecurityContext.RESOURCE_URL, blobUrl)` |

### Faire passer la Quality Gate sur SonarCloud (dashboard vert)

1. **Issues** → filtre **New Code** + **Security** + **Open**
2. Pour chaque issue : **Fix** le code **ou** **Won't fix** (justification PFE)
3. Attendre la prochaine analyse ou **Project** → **Reanalyze**

**Alternative (PFE) :** SonarCloud → **Quality Gates** → dupliquer **Sonar way** → retirer la condition *Security Rating on New Code* → l assigner au projet.

---

## Configuration actuelle (`sonar-project.properties`)

- Analyse : **`src/app`** uniquement (TypeScript Angular)
- Exclu : `.github`, `assets`, `.py`, `.php`, `.yml`
- `sonar.qualitygate.wait=false` : la CI GitHub ne bloque plus ; ameliorer le score sur sonarcloud.io

---

## Backend

Voir `ArabSoftBack/sonar-project.properties` — projet `yassinedhahbi_smarttax-backend`, secrets sur **SmartTax-Backend**.
