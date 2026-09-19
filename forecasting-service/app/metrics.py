"""
Prometheus Metrics definition for the Forecasting Service.
"""

from prometheus_client import Counter, Gauge, generate_latest, CONTENT_TYPE_LATEST

# Primary Predictive Metric consumed by KEDA ScaledObject
PREDICTED_RPS_GAUGE = Gauge(
    "predicted_workload_requests_per_second",
    "Forward-looking predicted request rate (RPS) for the workload service calculated by Meta Prophet",
)

# Model Error & Performance Evaluation Metrics
FORECAST_MAE_GAUGE = Gauge(
    "forecast_model_mae",
    "Mean Absolute Error (MAE) of the latest fitted Prophet model on training residuals",
)

FORECAST_RMSE_GAUGE = Gauge(
    "forecast_model_rmse",
    "Root Mean Squared Error (RMSE) of the latest fitted Prophet model on training residuals",
)

FORECAST_LAST_TRAINED_TIMESTAMP = Gauge(
    "forecast_last_trained_timestamp",
    "Unix timestamp (seconds) of the last successful Prophet model training and inference cycle",
)

FORECAST_TRAINING_DURATION_SECONDS = Gauge(
    "forecast_training_duration_seconds",
    "Time taken in seconds to train Prophet model and generate forward predictions",
)

FORECAST_CYCLES_TOTAL = Counter(
    "forecast_cycles_total",
    "Total number of forecast cycles executed",
    ["status"],  # "success" or "failure"
)


def get_latest_metrics() -> tuple[bytes, str]:
    """
    Generate the latest metrics payload in Prometheus text format.
    """
    return generate_latest(), CONTENT_TYPE_LATEST
