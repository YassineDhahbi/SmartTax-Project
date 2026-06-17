# Preparation CD Windows (une seule fois)
# Executer en PowerShell (admin non requis) :
#   cd Frontend\deploy
#   .\setup-windows.ps1

$ErrorActionPreference = 'Stop'

$deployPath = 'C:\smarttax-deploy'

if (-not (Test-Path $deployPath)) {
    New-Item -ItemType Directory -Path $deployPath | Out-Null
    Write-Host "Dossier cree: $deployPath"
}

$composeSource = Join-Path $PSScriptRoot 'docker-compose.prod.yml'
$envExample = Join-Path $PSScriptRoot '.env.prod.example'
$composeTarget = Join-Path $deployPath 'docker-compose.prod.yml'
$envTarget = Join-Path $deployPath '.env'

Copy-Item -Force $composeSource $composeTarget

if (-not (Test-Path $envTarget)) {
    Copy-Item $envExample $envTarget
    Write-Host "Fichier .env cree: $envTarget"
    Write-Host "Editez FRONTEND_IMAGE, BACKEND_IMAGE et les mots de passe."
} else {
    Write-Host ".env existe deja: $envTarget"
}

Write-Host ""
Write-Host "Prochaines etapes :"
Write-Host "1. Docker Desktop demarre"
Write-Host "2. Editer $envTarget"
Write-Host "3. docker login ghcr.io -u VOTRE_USER_GITHUB"
Write-Host "4. cd $deployPath"
Write-Host "5. docker compose -f docker-compose.prod.yml --profile local-db --profile ui up -d"
Write-Host "6. Installer le self-hosted runner GitHub (voir docs/CD-ETAPES-FRONTEND.md)"
