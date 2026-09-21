# scripts/start-dev-mode.ps1 - Offline Local Development Launcher
# Runs local React, local Spring Boot with H2, and local Python Prophet without requiring Kubernetes

Write-Host "=====================================================================" -ForegroundColor Yellow
Write-Host "   PREDICTIVE KUBERNETES AUTOSCALING - LOCAL DEVELOPMENT SANDBOX" -ForegroundColor Yellow
Write-Host "   [OFFLINE DEV MODE - NOT FOR OFFICIAL KUBERNETES EXPERIMENTS]" -ForegroundColor Yellow
Write-Host "=====================================================================" -ForegroundColor Yellow

$baseDir = Split-Path -Parent $PSScriptRoot

# 1. Start Python Prophet Forecasting Service (Port 8000)
Write-Host "`n[1/3] Launching Local Python FastAPI Prophet Service (Port 8000)..." -ForegroundColor Yellow
$forecastingCmd = @"
cd '$baseDir\forecasting-service'
Write-Host '=====================================================' -ForegroundColor Cyan
Write-Host '  Starting Local Prophet Forecasting Service (:8000) ' -ForegroundColor Cyan
Write-Host '=====================================================' -ForegroundColor Cyan
python -m uvicorn app.main:app --host 0.0.0.0 --port 8000 --reload
"@
Start-Process powershell -ArgumentList "-NoExit", "-Command", $forecastingCmd

# 2. Start Spring Boot Experiment Backend in Local Profile (H2 DB)
Write-Host "[2/3] Launching Local Spring Boot Backend (Port 8080, Profile: local)..." -ForegroundColor Yellow
$backendCmd = @"
cd '$baseDir\experiment-backend'
Write-Host '=====================================================' -ForegroundColor Cyan
Write-Host '  Starting Spring Boot Backend (DEV MODE - H2 DB)    ' -ForegroundColor Cyan
Write-Host '=====================================================' -ForegroundColor Cyan
mvn spring-boot:run -Dspring-boot.run.profiles=local
"@
Start-Process powershell -ArgumentList "-NoExit", "-Command", $backendCmd

# 3. Start React Vite Dashboard (Port 3000)
Write-Host "[3/3] Launching React Vite Dashboard (Port 3000)..." -ForegroundColor Yellow
$dashboardCmd = @"
cd '$baseDir\dashboard'
Write-Host '=====================================================' -ForegroundColor Cyan
Write-Host '  Starting React Vite Dashboard (Port 3000)          ' -ForegroundColor Cyan
Write-Host '=====================================================' -ForegroundColor Cyan
npm run dev
"@
Start-Process powershell -ArgumentList "-NoExit", "-Command", $dashboardCmd

Write-Host "`n=====================================================================" -ForegroundColor Green
Write-Host " All 3 Local Dev Services are booting up in separate terminals!" -ForegroundColor Green
Write-Host " - Frontend UI:        http://localhost:3000" -ForegroundColor Cyan
Write-Host " - Backend API:        http://localhost:8080 (Profile: local, DB: H2)" -ForegroundColor Cyan
Write-Host " - Forecasting API:    http://localhost:8000/docs (Local Python)" -ForegroundColor Cyan
Write-Host "---------------------------------------------------------------------" -ForegroundColor DarkGray
Write-Host "NOTE: To run official Kubernetes research experiments with KEDA and" -ForegroundColor Yellow
Write-Host "PostgreSQL, use 'scripts/start-research-mode.ps1' instead." -ForegroundColor Yellow
Write-Host "=====================================================================" -ForegroundColor Green
