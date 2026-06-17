# Met a jour le frontend depuis GHCR dans le stack smarttax (monorepo)
# Usage : .\scripts\update-frontend.ps1
# Depuis la racine du monorepo.

$ErrorActionPreference = 'Stop'

$root = Split-Path $PSScriptRoot -Parent
Set-Location $root

$frontendImage = if ($env:FRONTEND_IMAGE) {
  $env:FRONTEND_IMAGE
} else {
  'ghcr.io/yassinedhahbi/smarttax-project:latest'
}

Write-Host "Monorepo: $root"
Write-Host "Image frontend: $frontendImage"

$env:FRONTEND_IMAGE = $frontendImage

# Si le conteneur a ete cree hors compose (docker run), le retirer d'abord
docker stop smarttax-frontend 2>$null
docker rm smarttax-frontend 2>$null

docker compose pull frontend
docker compose --profile ui up -d frontend
docker compose ps frontend

try {
  Invoke-WebRequest -Uri 'http://127.0.0.1:4200/' -UseBasicParsing -TimeoutSec 15 | Out-Null
  Write-Host 'OK : http://localhost:4200'
} catch {
  Write-Warning 'Frontend non joignable sur :4200 — verifier backend et Docker Desktop'
}
