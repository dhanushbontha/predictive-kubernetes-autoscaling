"""
Unit tests for Meta Prophet Forecaster wrapper.
"""

from datetime import datetime, timedelta
import numpy as np
import pandas as pd
from app.model import ProphetForecaster
from app.config import settings


def test_prophet_fit_and_predict(mock_workload_df, test_forecaster):
    """
    Verify that ProphetForecaster successfully fits on valid time-series data
    and generates forward predictions with error metrics.
    """
    success, message = test_forecaster.fit(mock_workload_df)
    assert success is True
    assert "Model trained successfully" in message
    assert test_forecaster.model is not None
    assert test_forecaster.latest_mae is not None
    assert test_forecaster.latest_mae >= 0.0
    assert test_forecaster.latest_rmse is not None
    assert test_forecaster.latest_rmse >= 0.0

    # Test forward prediction
    horizon_seconds = 60
    freq_seconds = 5
    expected_periods = horizon_seconds // freq_seconds

    points = test_forecaster.predict(horizon_seconds=horizon_seconds, freq_seconds=freq_seconds)
    assert len(points) == expected_periods

    for p in points:
        assert p.predicted_rps >= 0.0
        assert p.lower_bound >= 0.0
        assert p.upper_bound >= p.lower_bound
        assert p.timestamp is not None


def test_insufficient_data_handling(test_forecaster):
    """
    Verify that fitting with fewer than MIN_DATA_POINTS_FOR_TRAIN returns False.
    """
    now = datetime.now()
    small_df = pd.DataFrame({
        "ds": [now - timedelta(seconds=i * 5) for i in range(3)],
        "y": [10.0, 12.0, 15.0],
    })

    success, message = test_forecaster.fit(small_df)
    assert success is False
    assert "Insufficient data points" in message


def test_empty_dataframe_handling(test_forecaster):
    """
    Verify that empty or None DataFrame is handled gracefully without exception.
    """
    success, message = test_forecaster.fit(pd.DataFrame(columns=["ds", "y"]))
    assert success is False
    assert "Insufficient data points" in message

    success_none, _ = test_forecaster.fit(None)
    assert success_none is False


def test_baseline_fallback_when_unfitted():
    """
    Verify that predict() on an unfitted forecaster returns default baseline points.
    """
    unfitted = ProphetForecaster()
    points = unfitted.predict(horizon_seconds=30, freq_seconds=5)
    assert len(points) == 6
    for p in points:
        assert p.predicted_rps == settings.DEFAULT_BASELINE_RPS


def test_constant_workload_series(test_forecaster):
    """
    Verify that Prophet handles constant / uniform series (e.g. flat 50 RPS) without dividing by zero.
    """
    now = datetime.now()
    flat_df = pd.DataFrame({
        "ds": [now - timedelta(seconds=i * 5) for i in range(20, 0, -1)],
        "y": [50.0] * 20,
    })

    success, message = test_forecaster.fit(flat_df)
    assert success is True
    points = test_forecaster.predict(horizon_seconds=20, freq_seconds=5)
    assert len(points) == 4
    for p in points:
        # Prediction should be close to 50.0
        assert 45.0 <= p.predicted_rps <= 55.0
