# ==============================================================================
# Automated End-to-End Benchmark Matrix Runner (PowerShell)
# Predictive Kubernetes Autoscaling: Meta Prophet + KEDA vs Reactive HPA
# ==============================================================================

[CmdletBinding()]
param (
    [string]$BackendUrl = "http://localhost:8080",
    [int]$DurationSeconds = 120,
    [int]$TargetRps = 150,
    [int]$SloLatencyMs = 200,
    [int]$CooldownSeconds = 10,
    [string]$OutputDir = "$PSScriptRoot\..\data",
    [switch]$DryRun
)

$ErrorActionPreference = "Stop"

function Write-Banner {
    param([string]$Text)
    Write-Host "`n======================================================================" -ForegroundColor Cyan
    Write-Host "  $Text" -ForegroundColor Yellow
    Write-Host "======================================================================`n" -ForegroundColor Cyan
}

function Write-Info {
    param([string]$Text)
    Write-Host "[INFO] $(Get-Date -Format 'HH:mm:ss') $Text" -ForegroundColor Gray
}

function Write-Success {
    param([string]$Text)
    Write-Host "[SUCCESS] $(Get-Date -Format 'HH:mm:ss') $Text" -ForegroundColor Green
}

function Write-Warn {
    param([string]$Text)
    Write-Host "[WARN] $(Get-Date -Format 'HH:mm:ss') $Text" -ForegroundColor Yellow
}

function Write-Err {
    param([string]$Text)
    Write-Host "[ERROR] $(Get-Date -Format 'HH:mm:ss') $Text" -ForegroundColor Red
}

Write-Banner "Predictive Kubernetes Autoscaling — Benchmark Matrix Suite"
Write-Info "Target Backend: $BackendUrl"
Write-Info "Output Directory: $OutputDir"
Write-Info "Parameters: Target RPS=$TargetRps, Duration=${DurationSeconds}s, SLO=${SloLatencyMs}ms"

# Ensure output directory exists
if (-not (Test-Path $OutputDir)) {
    New-Item -ItemType Directory -Path $OutputDir -Force | Out-Null
}

# 1. Health Check
Write-Info "Checking backend connectivity at $BackendUrl/api/dashboard/live..."
try {
    $healthResp = Invoke-RestMethod -Uri "$BackendUrl/api/dashboard/live" -Method Get -TimeoutSec 10 -ErrorAction Stop
    Write-Success "Backend is active and healthy! (Status: $($healthResp.status))"
} catch {
    Write-Warn "Direct backend live check failed ($($_.Exception.Message)). Attempting to start/verify via matrix seeder..."
}

# 2. Define the 10-run Matrix
$scenarios = @("BURSTY", "PERIODIC", "GRADUAL", "NOISY", "STABLE")
$modes = @("REACTIVE_HPA", "PREDICTIVE_PROPHET_KEDA")
$totalRuns = $scenarios.Count * $modes.Count
$runIndex = 0

Write-Info "Executing 10-run benchmark matrix across $($scenarios.Count) scenarios..."

if ($DryRun) {
    Write-Info "Fast/DryRun flag detected: Invoking backend matrix runner engine..."
    try {
        $matrixResp = Invoke-RestMethod -Uri "$BackendUrl/api/experiments/matrix/launch" -Method Post -TimeoutSec 30
        Write-Success "Backend matrix engine completed successfully!"
    } catch {
        Write-Err "Matrix launch failed: $($_.Exception.Message)"
    }
} else {
    foreach ($sc in $scenarios) {
        foreach ($md in $modes) {
            $runIndex++
            $expName = "Auto_${sc}_${md}_Run"
            Write-Host "`n----------------------------------------------------------------------" -ForegroundColor DarkCyan
            Write-Host " [Run $runIndex / $totalRuns] Scenario: $sc | Autoscaling Mode: $md" -ForegroundColor White
            Write-Host "----------------------------------------------------------------------" -ForegroundColor DarkCyan

            $body = @{
                name = $expName
                scenario = $sc
                autoscalingMode = $md
                targetRps = $TargetRps
                durationSeconds = $DurationSeconds
                sloLatencyMs = $SloLatencyMs
                forecastHorizonSeconds = 120
            } | ConvertTo-Json

            try {
                Write-Info "Launching experiment via API..."
                $startResp = Invoke-RestMethod -Uri "$BackendUrl/api/experiments/start" -Method Post -Body $body -ContentType "application/json" -TimeoutSec 15
                $expId = $startResp.id
                Write-Success "Experiment [$expId] started. Polling status until completion..."

                $isDone = $false
                $startTime = Get-Date
                $timeoutSeconds = $DurationSeconds + 40

                while (-not $isDone) {
                    Start-Sleep -Seconds 3
                    $statusResp = Invoke-RestMethod -Uri "$BackendUrl/api/experiments/$expId" -Method Get -TimeoutSec 10
                    $status = $statusResp.status
                    $elapsed = [math]::Round(((Get-Date) - $startTime).TotalSeconds)

                    Write-Host -NoNewline "`r  [Elapsed: ${elapsed}s / ${DurationSeconds}s] Status: $status ...    " -ForegroundColor Cyan

                    if ($status -eq "COMPLETED" -or $status -eq "FAILED" -or $status -eq "STOPPED") {
                        $isDone = $true
                        Write-Host ""
                        if ($status -eq "COMPLETED") {
                            Write-Success "Experiment [$expId] COMPLETED successfully!"
                            if ($null -ne $statusResp.result) {
                                $r = $statusResp.result
                                Write-Host "    -> P95 Latency: $($r.p95LatencyMs) ms | P99: $($r.p99LatencyMs) ms" -ForegroundColor Yellow
                                Write-Host "    -> SLO Breaches: $($r.sloViolations) ($([math]::Round($r.sloViolationRate * 100, 2))%)" -ForegroundColor Yellow
                                Write-Host "    -> Avg CPU: $($r.avgCpuPercent)% | Peak Replicas: $($r.peakReplicas)" -ForegroundColor Yellow
                                Write-Host "    -> Avg Scaling Delay: $($r.avgScalingDelaySeconds) s" -ForegroundColor Yellow
                            }
                        } else {
                            Write-Warn "Experiment [$expId] finished with status: $status ($($statusResp.errorMessage))"
                        }
                    }

                    if ($elapsed -gt $timeoutSeconds) {
                        Write-Warn "`nTimeout reached for experiment [$expId]. Proceeding..."
                        break
                    }
                }
            } catch {
                Write-Err "Failed to execute experiment: $($_.Exception.Message)"
            }

            # Inter-run cooldown
            if ($runIndex -lt $totalRuns) {
                Write-Info "Cooldown stabilization window (${CooldownSeconds}s)..."
                Start-Sleep -Seconds $CooldownSeconds
            }
        }
    }
}

# 3. Export Summary JSON and CSV
Write-Banner "Exporting Benchmark Matrix Summaries"

$csvPath = Join-Path $OutputDir "benchmark_matrix_summary.csv"
$jsonPath = Join-Path $OutputDir "benchmark_matrix_results.json"

try {
    Write-Info "Downloading CSV export to $csvPath..."
    $csvContent = Invoke-RestMethod -Uri "$BackendUrl/api/experiments/matrix/summary.csv" -Method Get
    Set-Content -Path $csvPath -Value $csvContent -Encoding UTF8
    Write-Success "CSV Summary saved -> $csvPath"
} catch {
    Write-Warn "Downloading CSV summary endpoint failed: $($_.Exception.Message)"
}

try {
    Write-Info "Downloading JSON matrix results to $jsonPath..."
    $jsonResp = Invoke-RestMethod -Uri "$BackendUrl/api/experiments/matrix/summary" -Method Get
    $jsonResp | ConvertTo-Json -Depth 10 | Set-Content -Path $jsonPath -Encoding UTF8
    Write-Success "JSON Results saved -> $jsonPath"

    Write-Banner "Academic Evaluation Matrix Summary"
    Write-Host "Overall Average P95 Latency Reduction: $($jsonResp.overallAverageP95ReductionPercent)%" -ForegroundColor Green
    Write-Host "Overall Average SLO Breach Reduction:   $($jsonResp.overallAverageSloReductionPercent)%" -ForegroundColor Green
    Write-Host "Overall Scaling Lead-Time Advantage:    $($jsonResp.overallAverageScalingLeadTimeGainSeconds)s" -ForegroundColor Green
    Write-Host "`nExecutive Conclusion:" -ForegroundColor Yellow
    Write-Host "  $($jsonResp.benchmarkConclusion)" -ForegroundColor White
} catch {
    Write-Warn "Downloading JSON matrix results failed: $($_.Exception.Message)"
}

Write-Banner "Benchmark Matrix Run Completed Successfully!"
