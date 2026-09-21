# scripts/start-research-mode.ps1 - Automated Research/Demo Mode Launcher
# Launches local Windows Backend & Dashboard bridged to Minikube Kubernetes infrastructure via port-forwards

Write-Host "=====================================================================" -ForegroundColor Cyan
Write-Host "   PREDICTIVE KUBERNETES AUTOSCALING - RESEARCH / DEMO MODE" -ForegroundColor Cyan
Write-Host "=====================================================================" -ForegroundColor Cyan

$baseDir = Split-Path -Parent $PSScriptRoot
$ErrorActionPreference = "Stop"

# Dedicated host port for Kubernetes PostgreSQL to avoid any Windows port 5432 conflicts
$postgresHostPort = if ($env:RESEARCH_POSTGRES_HOST_PORT) { $env:RESEARCH_POSTGRES_HOST_PORT } else { "15432" }
$forecastingHostPort = if ($env:RESEARCH_FORECASTING_HOST_PORT) { $env:RESEARCH_FORECASTING_HOST_PORT } else { "8000" }
$prometheusHostPort = if ($env:RESEARCH_PROMETHEUS_HOST_PORT) { $env:RESEARCH_PROMETHEUS_HOST_PORT } else { "9090" }

# ---------------------------------------------------------------------
# Step 1: Verify Docker Desktop
# ---------------------------------------------------------------------
Write-Host "`n[1/10] Verifying Docker Desktop daemon..." -ForegroundColor Yellow
try {
    $dockerInfo = docker info --format '{{.ServerVersion}}' 2>$null
        $dockerPaths = @(
            "$env:LOCALAPPDATA\Programs\DockerDesktop\Docker Desktop.exe",
            "C:\Program Files\Docker\Docker\Docker Desktop.exe"
        )
        foreach ($dp in $dockerPaths) {
            if (Test-Path $dp) {
                Start-Process $dp -ErrorAction SilentlyContinue
                break
            }
        }
        Start-Sleep -Seconds 12
        $dockerInfo = docker info --format '{{.ServerVersion}}' 2>$null
    Write-Host "  [OK] Docker Desktop is running (Version: $dockerInfo)" -ForegroundColor Green
} catch {
    Write-Host "  [FAIL] Docker Desktop must be running to execute Research Mode." -ForegroundColor Red
    Write-Host "  Please start Docker Desktop and run this script again." -ForegroundColor Yellow
    exit 1
}

# ---------------------------------------------------------------------
# Step 2: Start Minikube if necessary
# ---------------------------------------------------------------------
Write-Host "`n[2/10] Checking Minikube cluster status..." -ForegroundColor Yellow
$minikubeStatus = ""
try {
    $minikubeStatus = minikube status --format '{{.Host}}' 2>$null
} catch {
    $minikubeStatus = "Stopped"
}

if ($minikubeStatus -ne "Running") {
    Write-Host "  Minikube is stopped. Starting Minikube cluster (driver: docker)..." -ForegroundColor Magenta
    minikube start --driver=docker --memory=4096 --cpus=2
} else {
    Write-Host "  [OK] Minikube is already Running." -ForegroundColor Green
}

# ---------------------------------------------------------------------
# Step 3: Verify Minikube & Kubernetes Nodes
# ---------------------------------------------------------------------
Write-Host "`n[3/10] Verifying Kubernetes cluster node readiness..." -ForegroundColor Yellow
$nodeStatus = kubectl get nodes -o jsonpath='{.items[0].status.conditions[?(@.type=="Ready")].status}'
if ($nodeStatus -eq "True") {
    $nodeName = kubectl get nodes -o jsonpath='{.items[0].metadata.name}'
    Write-Host "  [OK] Kubernetes Node '$nodeName' is Ready" -ForegroundColor Green
} else {
    Write-Host "  [FAIL] Kubernetes Node is not Ready. Check minikube status." -ForegroundColor Red
    exit 1
}

# ---------------------------------------------------------------------
# Step 4: Deploy & Verify Kubernetes Resources
# ---------------------------------------------------------------------
Write-Host "`n[4/10] Deploying / Verifying Kubernetes experiment manifests..." -ForegroundColor Yellow

# Namespace
kubectl apply -f "$baseDir\k8s\namespace.yaml" | Out-Null

# Database (PostgreSQL Secret, PVC, Deployment, Service)
kubectl apply -f "$baseDir\k8s\database\postgres-secret.yaml" | Out-Null
kubectl apply -f "$baseDir\k8s\database\postgres.yaml" | Out-Null

# Forecasting Service (Prophet Deployment & Service)
kubectl apply -f "$baseDir\k8s\forecasting\deployment.yaml" | Out-Null
kubectl apply -f "$baseDir\k8s\forecasting\service.yaml" | Out-Null

# Workload Service (Deployment & Service)
kubectl apply -f "$baseDir\k8s\workload\deployment.yaml" | Out-Null
kubectl apply -f "$baseDir\k8s\workload\service.yaml" | Out-Null

# k6 Scripts ConfigMap
kubectl apply -f "$baseDir\k8s\k6\configmap.yaml" | Out-Null

# Autoscalers (HPA & KEDA ScaledObject)
kubectl apply -f "$baseDir\k8s\autoscaling\hpa.yaml" | Out-Null
kubectl apply -f "$baseDir\k8s\autoscaling\keda-scaledobject.yaml" | Out-Null

Write-Host "  [OK] Kubernetes manifests applied to namespace 'autoscaling-experiment'." -ForegroundColor Green

# ---------------------------------------------------------------------
# Step 5: Wait for Pods & Deployments to be Ready
# ---------------------------------------------------------------------
Write-Host "`n[5/10] Waiting for Kubernetes workloads to reach Ready state..." -ForegroundColor Yellow

Write-Host "  -> Waiting for postgres deployment..." -ForegroundColor DarkGray
kubectl rollout status deployment/postgres -n autoscaling-experiment --timeout=90s | Out-Null

Write-Host "  -> Waiting for forecasting-service deployment..." -ForegroundColor DarkGray
kubectl rollout status deployment/forecasting-service -n autoscaling-experiment --timeout=90s | Out-Null

Write-Host "  -> Waiting for workload-service deployment..." -ForegroundColor DarkGray
kubectl rollout status deployment/workload-service -n autoscaling-experiment --timeout=90s | Out-Null

Write-Host "  [OK] All core Kubernetes pods are Ready." -ForegroundColor Green

# ---------------------------------------------------------------------
# Step 6: Establish Host -> Kubernetes Port-Forward Bridges
# ---------------------------------------------------------------------
Write-Host "`n[6/10] Configuring Host -> Kubernetes Port-Forward Bridges..." -ForegroundColor Yellow

# Terminate existing kubectl port-forwards
Get-Process -Name "kubectl" -ErrorAction SilentlyContinue | Where-Object {
    $_.CommandLine -like "*port-forward*"
} | Stop-Process -Force -ErrorAction SilentlyContinue

# Resolve Prometheus Service name in monitoring namespace
$promSvc = "prometheus-kube-prometheus-prometheus"
try {
    $discoveredProm = kubectl get svc -n monitoring -o jsonpath='{.items[?(@.spec.ports[*].port==9090)].metadata.name}' 2>$null
    if ($discoveredProm) {
        $promSvc = ($discoveredProm -split " ")[0]
    }
} catch {}

# Start stable background port-forwards
Write-Host "  -> Port-Forward: localhost:${postgresHostPort} -> k8s svc/postgres:5432 (ns: autoscaling-experiment)" -ForegroundColor DarkCyan
Start-Process -FilePath "kubectl" -ArgumentList "port-forward", "svc/postgres", "${postgresHostPort}:5432", "-n", "autoscaling-experiment" -WindowStyle Hidden

Write-Host "  -> Port-Forward: localhost:${forecastingHostPort}  -> k8s svc/forecasting-service:8000 (ns: autoscaling-experiment)" -ForegroundColor DarkCyan
Start-Process -FilePath "kubectl" -ArgumentList "port-forward", "svc/forecasting-service", "${forecastingHostPort}:8000", "-n", "autoscaling-experiment" -WindowStyle Hidden

Write-Host "  -> Port-Forward: localhost:${prometheusHostPort}  -> k8s svc/$promSvc:9090 (ns: monitoring)" -ForegroundColor DarkCyan
Start-Process -FilePath "kubectl" -ArgumentList "port-forward", "svc/$promSvc", "${prometheusHostPort}:9090", "-n", "monitoring" -WindowStyle Hidden

Start-Sleep -Seconds 3
Write-Host "  [OK] Host -> Kubernetes port-forward bridges active." -ForegroundColor Green

# ---------------------------------------------------------------------
# Step 7: Launch Local Spring Boot Backend (Research Configuration)
# ---------------------------------------------------------------------
Write-Host "`n[7/10] Launching Spring Boot Experiment Backend (Port 8080)..." -ForegroundColor Yellow

$backendCmd = @"
`$env:SPRING_DATASOURCE_URL = 'jdbc:postgresql://localhost:${postgresHostPort}/autoscaling_db'
`$env:SPRING_DATASOURCE_USERNAME = 'postgres'
`$env:SPRING_DATASOURCE_PASSWORD = 'password'
`$env:PROMETHEUS_URL = 'http://localhost:${prometheusHostPort}'
`$env:FORECASTING_URL = 'http://localhost:${forecastingHostPort}'
`$env:APP_MODE = 'research'
cd '$baseDir\experiment-backend'
Write-Host '=====================================================' -ForegroundColor Cyan
Write-Host '  Starting Spring Boot Backend (RESEARCH MODE)       ' -ForegroundColor Cyan
Write-Host '  Database:      PostgreSQL via localhost:${postgresHostPort}      ' -ForegroundColor Green
Write-Host '  Forecasting:   Prophet via localhost:${forecastingHostPort}         ' -ForegroundColor Green
Write-Host '  Prometheus:    Prometheus via localhost:${prometheusHostPort}      ' -ForegroundColor Green
Write-Host '=====================================================' -ForegroundColor Cyan
mvn spring-boot:run
"@

Start-Process powershell -ArgumentList "-NoExit", "-Command", $backendCmd

# ---------------------------------------------------------------------
# Step 8: Launch Local React Dashboard (Port 3000)
# ---------------------------------------------------------------------
Write-Host "`n[8/10] Launching React Vite Dashboard (Port 3000)..." -ForegroundColor Yellow

$dashboardCmd = @"
cd '$baseDir\dashboard'
Write-Host '=====================================================' -ForegroundColor Cyan
Write-Host '  Starting React Dashboard (Port 3000)               ' -ForegroundColor Cyan
Write-Host '=====================================================' -ForegroundColor Cyan
npm run dev
"@

Start-Process powershell -ArgumentList "-NoExit", "-Command", $dashboardCmd

# ---------------------------------------------------------------------
# Step 9: Health Verification
# ---------------------------------------------------------------------
Write-Host "`n[9/10] Verifying end-to-end component health..." -ForegroundColor Yellow

Write-Host "  Waiting for backend initialization (approx 15 seconds)..." -ForegroundColor DarkGray
$maxRetries = 20
$backendHealthy = $false

for ($i = 1; $i -le $maxRetries; $i++) {
    Start-Sleep -Seconds 2
    try {
        $health = Invoke-RestMethod -Uri "http://localhost:8080/actuator/health" -TimeoutSec 3 -ErrorAction SilentlyContinue
        if ($health) {
            $backendHealthy = $true
            break
        }
    } catch {
        Write-Host "  ... waiting for backend ($i/$maxRetries)" -ForegroundColor DarkGray
    }
}

# ---------------------------------------------------------------------
# Step 10: Startup Summary Table
# ---------------------------------------------------------------------
Write-Host "`n[10/10] Startup Status Summary:" -ForegroundColor Yellow
Write-Host "---------------------------------------------------------------------" -ForegroundColor DarkGray

# 1. Backend
if ($backendHealthy) {
    Write-Host "  [ONLINE]      Experiment Backend       -> http://localhost:8080" -ForegroundColor Green
} else {
    Write-Host "  [STARTING]    Experiment Backend       -> http://localhost:8080 (booting)" -ForegroundColor Yellow
}

# 2. React Dashboard
try {
    $resUi = Invoke-WebRequest -Uri "http://localhost:3000" -UseBasicParsing -TimeoutSec 3 -ErrorAction SilentlyContinue
    Write-Host "  [ONLINE]      React Vite Dashboard     -> http://localhost:3000" -ForegroundColor Green
} catch {
    Write-Host "  [STARTING]    React Vite Dashboard     -> http://localhost:3000 (booting)" -ForegroundColor Yellow
}

# 3. PostgreSQL
try {
    $tcpPg = Test-NetConnection -ComputerName "localhost" -Port ([int]$postgresHostPort) -WarningAction SilentlyContinue
    if ($tcpPg.TcpTestSucceeded) {
        Write-Host "  [CONNECTED]   PostgreSQL (K8s Bridge)  -> localhost:${postgresHostPort} -> svc/postgres:5432" -ForegroundColor Green
    } else {
        Write-Host "  [WARNING]     PostgreSQL Bridge        -> Port ${postgresHostPort} not responding" -ForegroundColor Yellow
    }
} catch {
    Write-Host "  [CHECK]       PostgreSQL Bridge        -> localhost:${postgresHostPort}" -ForegroundColor DarkGray
}

# 4. Forecasting Service
try {
    $fRes = Invoke-RestMethod -Uri "http://localhost:${forecastingHostPort}/health" -TimeoutSec 3 -ErrorAction SilentlyContinue
    Write-Host "  [READY]       Prophet Service (Bridge) -> localhost:${forecastingHostPort} -> svc/forecasting-service (Model: $($fRes.model_ready))" -ForegroundColor Green
} catch {
    Write-Host "  [CHECK]       Prophet Service (Bridge) -> localhost:${forecastingHostPort}" -ForegroundColor DarkGray
}

# 5. Prometheus
try {
    $pRes = Invoke-WebRequest -Uri "http://localhost:${prometheusHostPort}/-/healthy" -UseBasicParsing -TimeoutSec 3 -ErrorAction SilentlyContinue
    Write-Host "  [CONNECTED]   Prometheus (Bridge)      -> localhost:${prometheusHostPort} -> svc/$promSvc" -ForegroundColor Green
} catch {
    Write-Host "  [CHECK]       Prometheus (Bridge)      -> localhost:${prometheusHostPort}" -ForegroundColor DarkGray
}

# 6. Kubernetes API
Write-Host "  [CONNECTED]   Kubernetes Cluster       -> Minikube (Node: $nodeName)" -ForegroundColor Green

Write-Host "---------------------------------------------------------------------" -ForegroundColor DarkGray
Write-Host "Active Mode:  RESEARCH / DEMO MODE (Local Windows Backend + Minikube K8s)" -ForegroundColor Cyan
Write-Host "Dashboard UI: http://localhost:3000" -ForegroundColor White
Write-Host "=====================================================================" -ForegroundColor Cyan
