"""
Application configuration for the Forecasting Service.
"""

from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    """
    Configuration settings loaded from environment variables with defaults.
    """
    model_config = SettingsConfigDict(env_file=".env", env_file_encoding="utf-8", extra="ignore")

    # Server Settings
    HOST: str = "0.0.0.0"
    PORT: int = 8000
    LOG_LEVEL: str = "INFO"

    # Prometheus Scraping Configuration
    PROMETHEUS_URL: str = "http://prometheus-kube-prometheus-prometheus.monitoring.svc.cluster.local:9090"
    WORKLOAD_METRIC_QUERY: str = 'sum(rate(http_server_requests_seconds_count{uri="/api/workload"}[1m]))'
    SCRAPE_LOOKBACK_MINUTES: int = 15
    SCRAPE_STEP_SECONDS: int = 5
    HTTP_TIMEOUT_SECONDS: float = 10.0

    # Forecasting & Model Parameters
    TRAINING_INTERVAL_SECONDS: int = 30
    FORECAST_HORIZON_SECONDS: int = 60
    FORECAST_FREQUENCY_SECONDS: int = 5
    MIN_DATA_POINTS_FOR_TRAIN: int = 10
    DEFAULT_BASELINE_RPS: float = 10.0

    # Prophet Hyperparameters
    PROPHET_CHANGEPOINT_PRIOR_SCALE: float = 0.5
    PROPHET_SEASONALITY_PRIOR_SCALE: float = 10.0
    PROPHET_INTERVAL_WIDTH: float = 0.95


settings = Settings()
