# Redirige vers le script monorepo (stack smarttax unique)
$monorepo = Resolve-Path (Join-Path $PSScriptRoot '..\..')
& (Join-Path $monorepo 'scripts\update-frontend.ps1')
