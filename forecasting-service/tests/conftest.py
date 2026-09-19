"""
Pytest fixtures for the forecasting service test suite.
"""

from datetime import datetime, timedelta, timezone
import numpy as np
import pandas as pd
import pytest
from fastapi.testclient import TestClient

from app.main import app
from app.model import ProphetForecaster
from app.scraper import PrometheusScraper
from app.service import ForecastingService


@pytest.fixture
def mock_workload_df() -> pd.DataFrame:
    """
    Generate synthetic 15-minute time-series data at 5-second intervals (180 data points).
    Simulates a periodic workload with mean 50 RPS.
    """
    now = datetime.now(timezone.utc).replace(microsecond=0)
    timestamps = [now - timedelta(seconds=5 * i) for i in range(180, 0, -1)]
    
    # Generate periodic wave: y = 50 + 30*sin(x) + noise
    x = np.linspace(0, 4 * np.pi, len(timestamps))
    y = 50.0 + 30.0 * np.sin(x) + np.random.normal(0, 2.0, len(timestamps))
    y = np.clip(y, 5.0, 150.0)

    # Format ds without timezone for Prophet
    ds_clean = [ts.replace(tzinfo=None) for ts in timestamps]
    return pd.DataFrame({"ds": ds_clean, "y": y})


@pytest.fixture
def test_forecaster() -> ProphetForecaster:
    """
    Instance of ProphetForecaster with fast uncertainty sampling for tests.
    """
    return ProphetForecaster()


@pytest.fixture
def mock_prometheus_response():
    """
    Mock response structure matching Prometheus /api/v1/query_range.
    """
    now = datetime.now(timezone.utc).timestamp()
    values = [[now - (i * 5), str(50.0 + (i % 10))] for i in range(30, 0, -1)]
    return {
        "status": "success",
        "data": {
            "resultType": "matrix",
            "result": [
                {
                    "metric": {"__name__": "http_server_requests_seconds_count"},
                    "values": values,
                }
            ]
        }
    }


@pytest.fixture
def client() -> TestClient:
    """
    FastAPI test client.
    """
    return TestClient(app)
