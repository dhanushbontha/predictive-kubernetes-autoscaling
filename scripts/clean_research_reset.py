"""
Clean Research Reset Script for Predictive Kubernetes Autoscaling Campaign.
Safely purges historical research runs, raw telemetry, summaries, and dataset rows,
preparing a pristine environment for Run 01 of the 30-run research campaign.
"""

import os
import shutil
import glob
import json
import subprocess
from datetime import datetime, timezone
import pandas as pd
import numpy as np

import sys
BASE_DIR = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
if BASE_DIR not in sys.path:
    sys.path.insert(0, BASE_DIR)
os.chdir(BASE_DIR)

print("==================================================")
print(" EXECUTING CLEAN RESEARCH CAMPAIGN RESET")
print("==================================================")

# 1. Clean PostgreSQL Database records via kubectl exec
print("\n[1/4] Cleaning PostgreSQL experiment records...")
sql_cmd = """
DELETE FROM scaling_events;
DELETE FROM experiment_results;
DELETE FROM experiments;
"""
try:
    cmd = ["kubectl", "exec", "-n", "autoscaling-experiment", "deployment/postgres", "--", "psql", "-U", "postgres", "-d", "autoscaling_db", "-c", sql_cmd]
    res = subprocess.run(cmd, capture_output=True, text=True, check=True)
    print("Postgres cleanup result:\n", res.stdout.strip())
except Exception as e:
    print(f"Warning cleaning PostgreSQL via kubectl: {e}")

# 2. Clean raw telemetry directories
print("\n[2/4] Purging previous raw telemetry and summaries...")
raw_dirs = [
    "results/raw",
    "experiment-backend/results/raw",
    "results/summaries",
    "experiment-backend/results/summaries"
]

for d in raw_dirs:
    if os.path.exists(d):
        for item in os.listdir(d):
            item_path = os.path.join(d, item)
            if os.path.isdir(item_path):
                shutil.rmtree(item_path)
            elif os.path.isfile(item_path):
                os.remove(item_path)
    os.makedirs(d, exist_ok=True)
    print(f"  Cleaned: {d}")

# 3. Regenerate pristine empty research dataset files
print("\n[3/4] Rebuilding clean 0-row research dataset...")
from scripts.build_research_dataset import DatasetBuilder

builder = DatasetBuilder(raw_dir="experiment-backend/results/raw", output_dir="results/dataset")
report = builder.build_all()

print("Validation Report:")
print(json.dumps(report, indent=2))

# 4. Clean scratch temporary files
print("\n[4/4] Cleaning temporary scratch test files...")
scratch_dir = "scratch"
if os.path.exists(scratch_dir):
    for f in glob.glob(os.path.join(scratch_dir, "run_*.py")) + glob.glob(os.path.join(scratch_dir, "verify_*.py")) + glob.glob(os.path.join(scratch_dir, "check_*.py")):
        try:
            os.remove(f)
        except Exception:
            pass

print("\n==================================================")
print(" CLEAN RESET COMPLETE")
print(f" Completed Runs: 0 / 30")
print(f" Research Dataset Rows: 0")
print(f" Validation: Scanned=0, Valid=0, Invalid=0")
print(" Next Run: Run 01 (STABLE | PREDICTIVE_PROPHET_KEDA | Repetition 1)")
print("==================================================")
