Write-Host "Stopping Kafka for SmartTax..." -ForegroundColor Cyan
docker compose -f ".\docker-compose.kafka.yml" down

if ($LASTEXITCODE -ne 0) {
  Write-Host "Kafka stop failed." -ForegroundColor Red
  exit $LASTEXITCODE
}

Write-Host "Kafka stopped." -ForegroundColor Green
