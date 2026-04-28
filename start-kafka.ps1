Write-Host "Starting Kafka for SmartTax..." -ForegroundColor Cyan
docker compose -f ".\docker-compose.kafka.yml" up -d

if ($LASTEXITCODE -ne 0) {
  Write-Host "Kafka startup failed." -ForegroundColor Red
  exit $LASTEXITCODE
}

Write-Host "Kafka started on localhost:9092" -ForegroundColor Green
Write-Host "Check logs with: docker logs -f smarttax-kafka" -ForegroundColor Yellow
