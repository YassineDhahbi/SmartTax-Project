$ErrorActionPreference = "Stop"
$root = Split-Path -Parent $MyInvocation.MyCommand.Path
$ocrDir = Join-Path $root "ArabSoftBack\ocr-service"
if (-not (Test-Path $ocrDir)) {
    $ocrDir = Join-Path $root "ocr-service"
}

if (-not (Test-Path $ocrDir)) {
    Write-Host "Dossier introuvable: ArabSoftBack\ocr-service" -ForegroundColor Red
    exit 1
}

Set-Location $ocrDir

$python = "python"
$venvPy = Join-Path $ocrDir ".venv\Scripts\python.exe"
if (Test-Path $venvPy) {
    $python = $venvPy
}

Write-Host "Demarrage OCR SmartTax (real_cin_reader)..." -ForegroundColor Cyan
Write-Host "URL: http://localhost:8004" -ForegroundColor Green
& $python real_cin_reader.py
