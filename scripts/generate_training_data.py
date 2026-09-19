"""
Dataset Generator for Predictive Kubernetes Autoscaling.
Generates comprehensive synthetic and realistic time-series training datasets
for Meta Prophet forecasting across 5 workload patterns:
1. Bursty
2. Periodic / Cyclical
3. Gradual Ramp
4. Noisy / Fluctuating
5. Stable Baseline
"""

import os
import math
import random
import numpy as np
import pandas as pd
from datetime import datetime, timedelta, timezone

def generate_datasets():
    os.makedirs("data", exist_ok=True)
    os.makedirs("data/scenarios", exist_ok=True)

    base_time = datetime(2026, 9, 19, 12, 0, 0, tzinfo=timezone.utc)
    
    # 1. Bursty Workload (600 seconds, 1s interval)
    bursty_rows = []
    spike_rps = 150.0
    base_rps = 15.0
    for t in range(600):
        ts = base_time + timedelta(seconds=t)
        ds = ts.strftime("%Y-%m-%d %H:%M:%S")
        # Double pulse bursts around t=120..180 and t=360..420
        is_spike = False
        if 120 <= t < 180:
            rps = spike_rps + random.gauss(0, 4)
            is_spike = True
        elif 360 <= t < 420:
            rps = spike_rps + random.gauss(0, 4)
            is_spike = True
        else:
            rps = base_rps + random.gauss(0, 1.5)
        
        rps = max(5.0, round(rps, 2))
        cpu = min(95.0, max(20.0, (rps / 150.0) * 85.0 + random.gauss(0, 2.0)))
        reps = 5 if is_spike else 1
        p95 = (72.0 + random.gauss(0, 4.0)) if reps > 2 else (240.0 + random.gauss(0, 15.0) if is_spike else 38.0)
        
        bursty_rows.append({
            "timestamp": ts.isoformat(),
            "ds": ds,
            "y": rps,
            "scenario": "BURSTY",
            "cpu_utilization_pct": round(cpu, 1),
            "p95_latency_ms": round(p95, 1),
            "p99_latency_ms": round(p95 * 1.35, 1),
            "active_replicas": reps,
            "is_spike": 1 if is_spike else 0
        })

    # 2. Periodic Workload (600 seconds, sinusoids with harmonic seasonality)
    periodic_rows = []
    period = 120 # 2 minute cycle
    for t in range(600):
        ts = base_time + timedelta(seconds=t)
        ds = ts.strftime("%Y-%m-%d %H:%M:%S")
        sine_val = (math.sin(2 * math.pi * t / period) + 1) / 2 # 0 to 1
        rps = 20.0 + sine_val * 130.0 + random.gauss(0, 2.5)
        rps = max(5.0, round(rps, 2))
        is_spike = rps > 100.0
        cpu = min(90.0, max(20.0, (rps / 150.0) * 80.0 + random.gauss(0, 2.0)))
        reps = max(1, min(5, math.ceil(rps / 30.0)))
        p95 = 52.0 + random.gauss(0, 3.5)

        periodic_rows.append({
            "timestamp": ts.isoformat(),
            "ds": ds,
            "y": rps,
            "scenario": "PERIODIC",
            "cpu_utilization_pct": round(cpu, 1),
            "p95_latency_ms": round(p95, 1),
            "p99_latency_ms": round(p95 * 1.35, 1),
            "active_replicas": reps,
            "is_spike": 1 if is_spike else 0
        })

    # 3. Gradual Workload (600 seconds, smooth monotonic ramp up and ramp down)
    gradual_rows = []
    for t in range(600):
        ts = base_time + timedelta(seconds=t)
        ds = ts.strftime("%Y-%m-%d %H:%M:%S")
        if t < 250:
            rps = 15.0 + (t / 250.0) * 135.0
        elif t < 350:
            rps = 150.0 + random.gauss(0, 2.0)
        else:
            rps = 150.0 - ((t - 350) / 250.0) * 135.0
        
        rps = max(5.0, round(rps + random.gauss(0, 1.5), 2))
        is_spike = rps > 120.0
        cpu = min(85.0, max(20.0, (rps / 150.0) * 75.0 + random.gauss(0, 1.5)))
        reps = max(1, min(5, math.ceil(rps / 32.0)))
        p95 = 48.0 + random.gauss(0, 2.5)

        gradual_rows.append({
            "timestamp": ts.isoformat(),
            "ds": ds,
            "y": rps,
            "scenario": "GRADUAL",
            "cpu_utilization_pct": round(cpu, 1),
            "p95_latency_ms": round(p95, 1),
            "p99_latency_ms": round(p95 * 1.35, 1),
            "active_replicas": reps,
            "is_spike": 1 if is_spike else 0
        })

    # 4. Noisy Workload (600 seconds, high-variance stochastic fluctuations)
    noisy_rows = []
    trend = 75.0
    for t in range(600):
        ts = base_time + timedelta(seconds=t)
        ds = ts.strftime("%Y-%m-%d %H:%M:%S")
        # Random walk with mean reversion
        noise = random.gauss(0, 18.0)
        trend += (75.0 - trend) * 0.05 + random.gauss(0, 3.0)
        rps = max(10.0, min(160.0, trend + noise))
        rps = round(rps, 2)
        is_spike = rps > 110.0
        cpu = min(90.0, max(25.0, (rps / 150.0) * 80.0 + random.gauss(0, 3.0)))
        reps = max(1, min(5, math.ceil(rps / 35.0)))
        p95 = 68.0 + random.gauss(0, 5.0)

        noisy_rows.append({
            "timestamp": ts.isoformat(),
            "ds": ds,
            "y": rps,
            "scenario": "NOISY",
            "cpu_utilization_pct": round(cpu, 1),
            "p95_latency_ms": round(p95, 1),
            "p99_latency_ms": round(p95 * 1.35, 1),
            "active_replicas": reps,
            "is_spike": 1 if is_spike else 0
        })

    # 5. Stable Workload (600 seconds, stationary steady-state)
    stable_rows = []
    for t in range(600):
        ts = base_time + timedelta(seconds=t)
        ds = ts.strftime("%Y-%m-%d %H:%M:%S")
        rps = 50.0 + random.gauss(0, 2.0)
        rps = max(10.0, round(rps, 2))
        cpu = 45.0 + random.gauss(0, 1.5)
        reps = 2
        p95 = 42.0 + random.gauss(0, 1.5)

        stable_rows.append({
            "timestamp": ts.isoformat(),
            "ds": ds,
            "y": rps,
            "scenario": "STABLE",
            "cpu_utilization_pct": round(cpu, 1),
            "p95_latency_ms": round(p95, 1),
            "p99_latency_ms": round(p95 * 1.35, 1),
            "active_replicas": reps,
            "is_spike": 0
        })

    # Save individual scenario CSV files
    df_bursty = pd.DataFrame(bursty_rows)
    df_periodic = pd.DataFrame(periodic_rows)
    df_gradual = pd.DataFrame(gradual_rows)
    df_noisy = pd.DataFrame(noisy_rows)
    df_stable = pd.DataFrame(stable_rows)

    df_bursty.to_csv("data/scenarios/bursty_workload.csv", index=False)
    df_periodic.to_csv("data/scenarios/periodic_workload.csv", index=False)
    df_gradual.to_csv("data/scenarios/gradual_workload.csv", index=False)
    df_noisy.to_csv("data/scenarios/noisy_workload.csv", index=False)
    df_stable.to_csv("data/scenarios/stable_workload.csv", index=False)

    # Combined master dataset
    df_all = pd.concat([df_bursty, df_periodic, df_gradual, df_noisy, df_stable], ignore_index=True)
    df_all.to_csv("data/workload_telemetry_complete.csv", index=False)

    # Standard Prophet dataset (ds, y)
    df_prophet = df_all[["ds", "y"]].copy()
    df_prophet.to_csv("data/prophet_training_dataset.csv", index=False)

    print(f"Generated {len(df_all)} total rows across 5 scenarios.")
    print("Files written:")
    print(" - data/prophet_training_dataset.csv (Standard Meta Prophet ds/y format)")
    print(" - data/workload_telemetry_complete.csv (Comprehensive multivariate telemetry)")
    print(" - data/scenarios/*.csv (Per-scenario workload series)")

if __name__ == "__main__":
    generate_datasets()
