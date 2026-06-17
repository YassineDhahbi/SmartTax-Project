# Met a jour le backend depuis GHCR dans le stack smarttax (monorepo)
# Usage : .\scripts\update-backend.ps1

$ErrorActionPreference = 'Stop'

$root = Split-Path $PSScriptRoot -Parent
Set-Location $root

$backendImage = if ($env:BACKEND_IMAGE) {
  $env:BACKEND_IMAGE
} else {
  'ghcr.io/yassinedhahbi/smarttax-backend:latest'
}

Write-Host "Monorepo: $root"
Write-Host "Image backend: $backendImage"

$env:BACKEND_IMAGE = $backendImage

docker stop smarttax-backend 2>$null
docker rm smarttax-backend 2>$null

docker compose pull backend
docker compose up -d backend
docker compose ps backend

try {
  Invoke-WebRequest -Uri 'http://127.0.0.1:8080/' -UseBasicParsing -TimeoutSec 15 | Out-Null
  Write-Host 'OK : http://localhost:8080'
} catch {
  Write-Warning 'Backend non joignable sur :8080 — verifier DB/Kafka et Docker Desktop'
}
