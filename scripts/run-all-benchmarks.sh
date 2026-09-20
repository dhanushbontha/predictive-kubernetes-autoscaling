#!/usr/bin/env bash
# ==============================================================================
# Automated End-to-End Benchmark Matrix Runner (Bash)
# Predictive Kubernetes Autoscaling: Meta Prophet + KEDA vs Reactive HPA
# ==============================================================================

set -eo pipefail

BACKEND_URL="${1:-http://localhost:8080}"
DURATION_SECONDS="${2:-120}"
TARGET_RPS="${3:-150}"
SLO_LATENCY_MS="${4:-200}"
COOLDOWN_SECONDS="${5:-10}"
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
OUTPUT_DIR="${SCRIPT_DIR}/../data"

mkdir -p "${OUTPUT_DIR}"

echo -e "\033[1;36m======================================================================\033[0m"
echo -e "\033[1;33m  Predictive Kubernetes Autoscaling — Benchmark Matrix Suite (Bash)  \033[0m"
echo -e "\033[1;36m======================================================================\033[0m"
echo "[INFO] Target Backend: ${BACKEND_URL}"
echo "[INFO] Output Directory: ${OUTPUT_DIR}"
echo "[INFO] Parameters: Target RPS=${TARGET_RPS}, Duration=${DURATION_SECONDS}s, SLO=${SLO_LATENCY_MS}ms"

# Health check
echo "[INFO] Checking backend connectivity at ${BACKEND_URL}/api/dashboard/live..."
curl -s -f "${BACKEND_URL}/api/dashboard/live" > /dev/null || {
  echo -e "\033[1;33m[WARN] Backend live check failed or pending. Invoking matrix engine...\033[0m"
}

SCENARIOS=("BURSTY" "PERIODIC" "GRADUAL" "NOISY" "STABLE")
MODES=("REACTIVE_HPA" "PREDICTIVE_PROPHET_KEDA")
TOTAL_RUNS=10
RUN_INDEX=0

for sc in "${SCENARIOS[@]}"; do
  for md in "${MODES[@]}"; do
    RUN_INDEX=$((RUN_INDEX + 1))
    echo -e "\n\033[1;35m----------------------------------------------------------------------\033[0m"
    echo -e "\033[1;37m [Run ${RUN_INDEX} / ${TOTAL_RUNS}] Scenario: ${sc} | Autoscaling Mode: ${md}\033[0m"
    echo -e "\033[1;35m----------------------------------------------------------------------\033[0m"

    PAYLOAD=$(cat <<EOF
{
  "name": "Auto_${sc}_${md}_Run",
  "scenario": "${sc}",
  "autoscalingMode": "${md}",
  "targetRps": ${TARGET_RPS},
  "durationSeconds": ${DURATION_SECONDS},
  "sloLatencyMs": ${SLO_LATENCY_MS},
  "forecastHorizonSeconds": 120
}
EOF
    )

    START_RESP=$(curl -s -X POST "${BACKEND_URL}/api/experiments/start" \
      -H "Content-Type: application/json" \
      -d "${PAYLOAD}" || true)

    EXP_ID=$(echo "${START_RESP}" | grep -o '"id":"[^"]*' | cut -d'"' -f4 || echo "")

    if [ -n "${EXP_ID}" ]; then
      echo -e "\033[1;32m[SUCCESS] Experiment [${EXP_ID}] started. Monitoring execution...\033[0m"
      
      # Poll status
      ELAPSED=0
      TIMEOUT=$((DURATION_SECONDS + 30))
      while [ ${ELAPSED} -lt ${TIMEOUT} ]; do
        sleep 3
        ELAPSED=$((ELAPSED + 3))
        STATUS_RESP=$(curl -s "${BACKEND_URL}/api/experiments/${EXP_ID}" || true)
        STATUS=$(echo "${STATUS_RESP}" | grep -o '"status":"[^"]*' | cut -d'"' -f4 || echo "")
        
        echo -ne "  [Elapsed: ${ELAPSED}s / ${DURATION_SECONDS}s] Status: ${STATUS} ...\r"
        
        if [ "${STATUS}" == "COMPLETED" ] || [ "${STATUS}" == "FAILED" ] || [ "${STATUS}" == "STOPPED" ]; then
          echo ""
          echo -e "\033[1;32m[SUCCESS] Experiment [${EXP_ID}] ${STATUS}!\033[0m"
          break
        fi
      done
    else
      echo -e "\033[1;33m[WARN] Could not parse Experiment ID. Proceeding to matrix summary export.\033[0m"
    fi

    if [ ${RUN_INDEX} -lt ${TOTAL_RUNS} ]; then
      echo "[INFO] Cooldown stabilization window (${COOLDOWN_SECONDS}s)..."
      sleep ${COOLDOWN_SECONDS}
    fi
  done
done

echo -e "\n\033[1;36m======================================================================\033[0m"
echo -e "\033[1;33m  Exporting Benchmark Matrix Summaries\033[0m"
echo -e "\033[1;36m======================================================================\033[0m"

curl -s "${BACKEND_URL}/api/experiments/matrix/summary.csv" > "${OUTPUT_DIR}/benchmark_matrix_summary.csv" || true
echo -e "\033[1;32m[SUCCESS] CSV saved -> ${OUTPUT_DIR}/benchmark_matrix_summary.csv\033[0m"

curl -s "${BACKEND_URL}/api/experiments/matrix/summary" > "${OUTPUT_DIR}/benchmark_matrix_results.json" || true
echo -e "\033[1;32m[SUCCESS] JSON saved -> ${OUTPUT_DIR}/benchmark_matrix_results.json\033[0m"

echo -e "\n\033[1;32mBenchmark Matrix Run Completed Successfully!\033[0m\n"
