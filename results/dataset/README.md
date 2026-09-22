# Master Research Dataset Documentation
## Predictive Kubernetes Autoscaling vs. Reactive HPA Benchmark Dataset

This directory contains the verified, reproducible research dataset comparing:
1. **Predictive Autoscaling:** Meta Prophet Time-Series Forecaster + KEDA PromQL Scaler
2. **Reactive Baseline:** Native Kubernetes Horizontal Pod Autoscaler (HPA v2)

### Table Schemas

1. **`master_experiments.csv`**: Aggregated run-level empirical measurements (one row per experiment).
2. **`master_requests.csv`**: Exact client-side k6 request telemetry bounded to the $[t_0, t_0 + 180\text{s}]$ evaluation interval.
3. **`master_timeseries.csv`**: Synchronized time-series observations for workload rates, replica states, CPU, and memory.
4. **`master_forecasts.csv`**: Discrete out-of-sample forward prediction vs. actual telemetry matching pairs.
5. **`master_scaling_events.csv`**: Kubernetes Pod condition readiness timestamps and provisioning delays ($D_{\text{scale}}$).
6. **`experiment_manifest.csv`**: End-to-end experiment provenance, git commit hashes, and protocol versions.
7. **`final_analysis_dataset.csv` / `.parquet`**: Cleaned, validated dataset ready for statistical analysis and paper tables.
8. **`dataset_validation_report.json`**: Automated validation audit log with cryptographic SHA-256 checksums.

### Provenance Guarantee
All dataset rows are directly reconstructed from raw in-cluster JSON telemetry in `experiment-backend/results/raw/`. No synthesized, modeled, or percentile-interpolated counts exist.
