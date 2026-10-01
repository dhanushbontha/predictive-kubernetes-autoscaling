"""
Research Experiment Execution & Validation Engine
Executes individual benchmark runs across the 30-experiment research matrix with strict causal isolation,
controller exclusivity, discrete request-level k6 telemetry collection, and dataset validation.
"""

import os
import sys
import time
import json
import uuid
import argparse
import subprocess
from datetime import datetime, timezone, timedelta
from typing import Dict, Any, Optional, List
import httpx
import numpy as np

# Ensure root directory is on python path
BASE_DIR = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
os.chdir(BASE_DIR)

BACKEND_URL = os.environ.get("BACKEND_URL", "http://localhost:8080")
PROMETHEUS_URL = os.environ.get("PROMETHEUS_URL", "http://localhost:9090")
FORECASTING_URL = os.environ.get("FORECASTING_URL", "http://localhost:8000")


def log(msg: str):
    ts = datetime.now(timezone.utc).strftime("%H:%M:%S")
    print(f"[{ts} UTC] {msg}", flush=True)


def run_cmd(cmd: List[str], check: bool = True) -> subprocess.CompletedProcess:
    return subprocess.run(cmd, capture_output=True, text=True, check=check)


def setup_controller_exclusivity(controller: str):
    log(f"Setting up controller exclusivity for: {controller}")
    
    # 1. Clean previous k6 jobs
    run_cmd(["kubectl", "delete", "job", "-l", "app=k6-load-test", "-n", "autoscaling-experiment", "--ignore-not-found"])
    
    if controller == "REACTIVE_HPA":
        # Disable KEDA ScaledObject
        log("  -> Disabling KEDA ScaledObject...")
        run_cmd(["kubectl", "delete", "scaledobject", "workload-service-keda", "-n", "autoscaling-experiment", "--ignore-not-found"])
        
        # Apply HPA
        log("  -> Applying native HPA (target CPU: 50%, min: 1, max: 5)...")
        run_cmd(["kubectl", "apply", "-f", "k8s/autoscaling/hpa.yaml"])
        
    elif controller == "PREDICTIVE_PROPHET_KEDA":
        # Disable HPA
        log("  -> Disabling native HPA...")
        run_cmd(["kubectl", "delete", "hpa", "workload-service-hpa", "-n", "autoscaling-experiment", "--ignore-not-found"])
        
        # Apply KEDA ScaledObject
        log("  -> Applying KEDA ScaledObject (threshold: 20 RPS, min: 1, max: 5)...")
        run_cmd(["kubectl", "apply", "-f", "k8s/autoscaling/keda-scaledobject.yaml"])
        
    # Scale deployment to exactly 1 replica
    log("  -> Resetting workload-service deployment to 1 replica...")
    run_cmd(["kubectl", "scale", "deployment", "workload-service", "--replicas=1", "-n", "autoscaling-experiment"])
    
    # Wait for 1 ready replica
    log("  -> Waiting for workload-service pod to be Ready...")
    run_cmd(["kubectl", "rollout", "status", "deployment/workload-service", "-n", "autoscaling-experiment", "--timeout=60s"])
    time.sleep(3)


def execute_warmup_and_prophet_calibration() -> Dict[str, Any]:
    log("==================================================")
    log("STARTING PROPHET WARM-UP & CALIBRATION (120s @ 10 RPS)")
    log("==================================================")
    
    # 1. Reset forecasting state
    try:
        r = httpx.post(f"{FORECASTING_URL}/api/forecast/reset", timeout=10.0)
        log(f"  -> Reset forecasting state: {r.status_code}")
    except Exception as e:
        log(f"  -> Warning resetting forecasting state: {e}")
        
    warmup_start_dt = datetime.now(timezone.utc)
    warmup_start_ts = warmup_start_dt.timestamp()
    
    # 2. Dispatch 120s warm-up load at 10 RPS
    log("  -> Dispatching 120s warm-up k6 load generator at 10 RPS...")
    warmup_job_yaml = """
apiVersion: batch/v1
kind: Job
metadata:
  name: k6-warmup-job
  namespace: autoscaling-experiment
  labels:
    app: k6-load-test
    role: warmup
spec:
  backoffLimit: 0
  ttlSecondsAfterFinished: 60
  template:
    metadata:
      labels:
        app: k6-load-test
    spec:
      restartPolicy: Never
      containers:
        - name: k6
          image: grafana/k6:0.54.0
          args: ["run", "--vus", "5", "--duration", "120s", "--rps", "10", "/scripts/stable.js"]
          env:
            - name: TARGET_URL
              value: "http://workload-service:8084"
            - name: TARGET_RPS
              value: "10"
            - name: DURATION
              value: "120s"
          volumeMounts:
            - name: k6-scripts-volume
              mountPath: /scripts
              readOnly: true
      volumes:
        - name: k6-scripts-volume
          configMap:
            name: k6-workload-scripts
            defaultMode: 0777
"""
    # Apply warm-up job
    p = subprocess.Popen(["kubectl", "apply", "-f", "-"], stdin=subprocess.PIPE, text=True)
    p.communicate(input=warmup_job_yaml)
    
    # Wait for warm-up job completion (120s)
    log("  -> Generating warm-up traffic for 120 seconds...")
    time.sleep(122)
    
    warmup_end_dt = datetime.now(timezone.utc)
    warmup_end_ts = warmup_end_dt.timestamp()
    
    # Cleanup warmup job
    run_cmd(["kubectl", "delete", "job", "k6-warmup-job", "-n", "autoscaling-experiment", "--ignore-not-found"])
    
    # 3. Explicitly bounded training interval [warmup_start + 60s, warmup_end]
    training_start_ts = warmup_start_ts + 60.0
    training_end_ts = warmup_end_ts
    
    log(f"  -> Training bounds: [{datetime.fromtimestamp(training_start_ts, tz=timezone.utc).isoformat()} to {datetime.fromtimestamp(training_end_ts, tz=timezone.utc).isoformat()}] (60s query window)")
    
    # Trigger /api/train
    train_req = {
        "start_timestamp": training_start_ts,
        "end_timestamp": training_end_ts,
        "forecast_horizon_seconds": 60
    }
    train_resp = httpx.post(f"{FORECASTING_URL}/api/train", json=train_req, timeout=15.0).json()
    log(f"  -> /api/train response: status={train_resp.get('status')}, points={train_resp.get('data_points_trained')}, pred_rps={train_resp.get('predicted_rps')}")
    
    # Health check
    health = httpx.get(f"{FORECASTING_URL}/health", timeout=10.0).json()
    model_ready = health.get("model_ready", False)
    current_pred = health.get("current_predicted_rps", 0.0)
    log(f"  -> Health check: model_ready={model_ready}, current_predicted_rps={current_pred}")
    
    # Ensure deployment is scaled back to 1 replica and ready
    run_cmd(["kubectl", "scale", "deployment", "workload-service", "--replicas=1", "-n", "autoscaling-experiment"])
    time.sleep(3)
    
    return {
        "warmup_start_utc": warmup_start_dt.isoformat(),
        "warmup_end_utc": warmup_end_dt.isoformat(),
        "training_start_utc": datetime.fromtimestamp(training_start_ts, tz=timezone.utc).isoformat(),
        "training_end_utc": datetime.fromtimestamp(training_end_ts, tz=timezone.utc).isoformat(),
        "training_sample_count": train_resp.get("data_points_trained"),
        "model_ready": model_ready,
        "initial_predicted_rps": current_pred,
        "train_response": train_resp
    }


def run_experiment(run_number: int, scenario: str, controller: str, repetition: int, target_rps: int, duration_sec: int = 180, slo_ms: int = 200) -> Dict[str, Any]:
    log("======================================================================")
    log(f" EXECUTING RUN {run_number:02d}/30: {scenario} | {controller} | Rep {repetition}")
    log(f" Target RPS: {target_rps} | Duration: {duration_sec}s | SLO: {slo_ms}ms")
    log("======================================================================")
    
    # Step 1: Controller Exclusivity Setup
    setup_controller_exclusivity(controller)
    
    # Step 2: Prophet Calibration if Predictive
    calibration_info = {}
    if controller == "PREDICTIVE_PROPHET_KEDA":
        calibration_info = execute_warmup_and_prophet_calibration()
        if not calibration_info.get("model_ready"):
            raise RuntimeError("Prophet calibration failed: modelReady is False")
            
    # Step 3: Launch experiment via backend API
    exp_name = f"Run_{run_number:02d}_{scenario}_{controller}_Rep{repetition}"
    start_body = {
        "name": exp_name,
        "scenario": scenario,
        "autoscalingMode": controller,
        "targetRps": target_rps,
        "durationSeconds": duration_sec,
        "sloLatencyMs": slo_ms,
        "forecastHorizonSeconds": 60
    }
    
    log("  -> Launching experiment via backend API...")
    start_resp = httpx.post(f"{BACKEND_URL}/api/experiments/start", json=start_body, timeout=15.0).json()
    exp_id = start_resp.get("id")
    log(f"  -> Experiment [{exp_id}] initiated. Polling status until completion...")
    
    # Step 4: Poll until completed
    start_wait = time.time()
    max_wait = duration_sec + 60
    exp_status = "STARTING"
    final_resp = {}
    
    while time.time() - start_wait < max_wait:
        time.sleep(4)
        try:
            r = httpx.get(f"{BACKEND_URL}/api/experiments/{exp_id}", timeout=10.0).json()
            exp_status = r.get("status")
            elapsed = int(time.time() - start_wait)
            print(f"\r  [Elapsed: {elapsed:03d}s / {duration_sec}s] Status: {exp_status} ...    ", end="", flush=True)
            if exp_status in ["COMPLETED", "FAILED", "STOPPED"]:
                final_resp = r
                print()
                break
        except Exception as e:
            pass
            
    log(f"  -> Experiment [{exp_id}] finished with status: {exp_status}")
    
    # Step 5: Copy raw files to project results/raw/<exp_id>/ if needed
    src_raw = os.path.join("experiment-backend", "results", "raw", exp_id)
    dst_raw = os.path.join("results", "raw", exp_id)
    os.makedirs(dst_raw, exist_ok=True)
    
    if os.path.exists(src_raw):
        for fname in os.listdir(src_raw):
            s_path = os.path.join(src_raw, fname)
            d_path = os.path.join(dst_raw, fname)
            if os.path.isfile(s_path):
                with open(s_path, "r", encoding="utf-8") as sf, open(d_path, "w", encoding="utf-8") as df:
                    df.write(sf.read())

    # Extract forecasts.json and scaling_events.json if in telemetry.json
    telemetry_file = os.path.join(dst_raw, "telemetry.json")
    if os.path.exists(telemetry_file):
        try:
            with open(telemetry_file, "r", encoding="utf-8") as tf:
                tdata = json.load(tf)
            scaling_events = tdata.get("scalingEvents", [])
            with open(os.path.join(dst_raw, "scaling_events.json"), "w", encoding="utf-8") as sef:
                json.dump(scaling_events, sef, indent=2)

            pred_rates = tdata.get("predictedRate", [])
            req_rates = tdata.get("requestRate", [])
            forecast_points = []
            if pred_rates:
                for p_pt in pred_rates:
                    forecast_points.append({
                        "experiment_id": exp_id,
                        "timestamp": p_pt.get("timestamp"),
                        "predicted_rps": p_pt.get("value"),
                        "lead_time_seconds": 60
                    })
            with open(os.path.join(dst_raw, "forecasts.json"), "w", encoding="utf-8") as fcf:
                json.dump(forecast_points, fcf, indent=2)
        except Exception as e:
            log(f"  -> Note extracting forecasts/scaling_events: {e}")
                    
    # Update summary with warm-up metadata
    summary_path = os.path.join("experiment-backend", "results", "summaries", f"{exp_id}.json")
    if os.path.exists(summary_path):
        with open(summary_path, "r", encoding="utf-8") as sf:
            sum_data = json.load(sf)
        sum_data["runNumber"] = run_number
        sum_data["repetition"] = repetition
        sum_data["targetRps"] = target_rps
        if calibration_info:
            sum_data["warmupStartUtc"] = calibration_info.get("warmup_start_utc")
            sum_data["warmupEndUtc"] = calibration_info.get("warmup_end_utc")
            sum_data["trainingStartUtc"] = calibration_info.get("training_start_utc")
            sum_data["trainingEndUtc"] = calibration_info.get("training_end_utc")
            sum_data["trainingSampleCount"] = calibration_info.get("training_sample_count")
        with open(summary_path, "w", encoding="utf-8") as sf:
            json.dump(sum_data, sf, indent=2)
            
    # Save metadata.json in raw folder
    metadata = {
        "run_number": run_number,
        "experiment_id": exp_id,
        "scenario": scenario,
        "controller": controller,
        "repetition": repetition,
        "target_rps": target_rps,
        "duration_seconds": duration_sec,
        "slo_latency_ms": slo_ms,
        "calibration": calibration_info,
        "status": exp_status,
        "timestamp_utc": datetime.now(timezone.utc).isoformat()
    }
    with open(os.path.join(dst_raw, "metadata.json"), "w", encoding="utf-8") as mf:
        json.dump(metadata, mf, indent=2)
        
    # Step 6: Run dataset build & validation pipeline
    log("  -> Rebuilding master research dataset & executing validation audit...")
    build_res = subprocess.run(["python", "scripts/build_research_dataset.py"], capture_output=True, text=True)
    log(f"  -> Dataset builder exit code: {build_res.returncode}")
    
    return {
        "run_number": run_number,
        "experiment_id": exp_id,
        "scenario": scenario,
        "controller": controller,
        "repetition": repetition,
        "target_rps": target_rps,
        "status": exp_status,
        "result": final_resp.get("result", {}),
        "calibration": calibration_info,
        "raw_dir": dst_raw
    }


if __name__ == "__main__":
    parser = argparse.ArgumentParser(description="Run single research experiment")
    parser.add_argument("--run-number", type=int, required=True, help="Run index (1..30)")
    parser.add_argument("--scenario", type=str, required=True, choices=["STABLE", "PERIODIC", "GRADUAL", "BURSTY", "NOISY"])
    parser.add_argument("--controller", type=str, required=True, choices=["PREDICTIVE_PROPHET_KEDA", "REACTIVE_HPA"])
    parser.add_argument("--repetition", type=int, default=1)
    parser.add_argument("--target-rps", type=int, default=30)
    parser.add_argument("--duration", type=int, default=180)
    parser.add_argument("--slo", type=int, default=200)
    
    args = parser.parse_args()
    res = run_experiment(
        run_number=args.run_number,
        scenario=args.scenario,
        controller=args.controller,
        repetition=args.repetition,
        target_rps=args.target_rps,
        duration_sec=args.duration,
        slo_ms=args.slo
    )
    print(json.dumps(res, indent=2, default=str))
