"""
API integration tests for FastAPI forecasting endpoints.
"""

from unittest.mock import AsyncMock, patch
import pandas as pd
from fastapi.testclient import TestClient


def test_health_endpoint(client: TestClient):
    """
    Test GET /health returns 200 with service metadata and gauge value.
    """
    response = client.get("/health")
    assert response.status_code == 200
    data = response.json()
    assert data["status"] == "UP"
    assert data["service"] == "forecasting-service"
    assert "model_ready" in data
    assert "current_predicted_rps" in data


def test_prometheus_metrics_endpoint(client: TestClient):
    """
    Test GET /metrics exposes Prometheus formatted metrics including predicted RPS.
    """
    response = client.get("/metrics")
    assert response.status_code == 200
    assert "text/plain" in response.headers["content-type"]
    text = response.text
    assert "predicted_workload_requests_per_second" in text
    assert "forecast_training_duration_seconds" in text
    assert "forecast_cycles_total" in text


def test_get_forecast_endpoint(client: TestClient):
    """
    Test GET /api/forecast returns a valid ForecastResponse.
    """
    response = client.get("/api/forecast")
    assert response.status_code == 200
    data = response.json()
    assert "generated_at" in data
    assert "horizon_seconds" in data
    assert "current_predicted_rps" in data
    assert "points" in data
    assert isinstance(data["points"], list)
    assert len(data["points"]) > 0


@patch("app.scraper.PrometheusScraper.fetch_workload_history")
def test_manual_train_endpoint(mock_fetch, client: TestClient, mock_workload_df: pd.DataFrame):
    """
    Test POST /api/train executes a full training cycle with mocked Prometheus data.
    """
    mock_fetch.return_value = mock_workload_df

    response = client.post("/api/train", json={"lookback_minutes": 15, "forecast_horizon_seconds": 60})
    assert response.status_code == 200
    data = response.json()
    assert data["status"] == "SUCCESS"
    assert data["data_points_trained"] == len(mock_workload_df)
    assert data["predicted_rps"] > 0.0
    assert data["mae"] is not None
    assert data["rmse"] is not None

    # Verify metrics endpoint reflects updated values
    metrics_res = client.get("/metrics")
    assert "forecast_model_mae" in metrics_res.text
    assert "forecast_model_rmse" in metrics_res.text


def test_get_forecast_accuracy_endpoint(client: TestClient):
    """
    Test GET /api/forecast/accuracy returns authentic out-of-sample evaluated state.
    """
    response = client.get("/api/forecast/accuracy")
    assert response.status_code == 200
    data = response.json()
    assert "status" in data
    assert "evaluated_pairs" in data

