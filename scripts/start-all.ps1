# scripts/start-all.ps1 - One-Click Launcher for Predictive Kubernetes Autoscaling Platform
Write-Host "===============================================================" -ForegroundColor Cyan
Write-Host "   Starting Predictive Kubernetes Autoscaling Platform" -ForegroundColor Cyan
Write-Host "===============================================================" -ForegroundColor Cyan

$baseDir = Split-Path -Parent $PSScriptRoot

# 1. Start Python Forecasting Service (Port 8000)
Write-Host "`n[1/3] Launching Python FastAPI Prophet Forecasting Service (Port 8000)..." -ForegroundColor Yellow
Start-Process powershell -ArgumentList "-NoExit", "-Command", "cd '$baseDir\forecasting-service'; Write-Host 'Starting Prophet Forecasting Service...' -ForegroundColor Cyan; python -m uvicorn app.main:app --host 0.0.0.0 --port 8000 --reload"

# 2. Start Spring Boot Experiment Backend (Port 8080)
Write-Host "[2/3] Launching Spring Boot Experiment Backend (Port 8080)..." -ForegroundColor Yellow
Start-Process powershell -ArgumentList "-NoExit", "-Command", "cd '$baseDir\experiment-backend'; Write-Host 'Starting Spring Boot Backend...' -ForegroundColor Cyan; mvn spring-boot:run"

# 3. Start React Vite Dashboard (Port 3000)
Write-Host "[3/3] Launching React Vite Dashboard (Port 3000)..." -ForegroundColor Yellow
Start-Process powershell -ArgumentList "-NoExit", "-Command", "cd '$baseDir\dashboard'; Write-Host 'Starting React Vite Dashboard...' -ForegroundColor Cyan; npm run dev"

Write-Host "`n===============================================================" -ForegroundColor Green
Write-Host " All 3 Services are booting up in separate terminals!" -ForegroundColor Green
Write-Host " - Frontend UI:        http://localhost:3000" -ForegroundColor Cyan
Write-Host " - Backend API:        http://localhost:8080" -ForegroundColor Cyan
Write-Host " - Forecasting API:    http://localhost:8000/docs" -ForegroundColor Cyan
Write-Host "===============================================================" -ForegroundColor Green
Write-Host "Once terminals are ready (approx 10-15s), open http://localhost:3000 in your browser." -ForegroundColor White
