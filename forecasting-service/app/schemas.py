"""
Pydantic schemas for API request and response validation.
"""

from datetime import datetime
from typing import List, Optional
from pydantic import BaseModel, Field


class ForecastPoint(BaseModel):
    """
    A single point in time with predicted workload metrics.
    """
    timestamp: datetime = Field(..., description="Timestamp of the forecasted point")
    predicted_rps: float = Field(..., description="Point forecast predicted requests per second (yhat)")
    lower_bound: float = Field(..., description="Lower confidence interval bound (yhat_lower)")
    upper_bound: float = Field(..., description="Upper confidence interval bound (yhat_upper)")


class ForecastResponse(BaseModel):
    """
    Complete forecast time-series response.
    """
    generated_at: datetime = Field(..., description="Timestamp when the forecast was generated")
    horizon_seconds: int = Field(..., description="Forecast horizon length in seconds")
    current_predicted_rps: float = Field(..., description="Immediate target RPS for autoscaler consumption")
    mae: Optional[float] = Field(None, description="Mean Absolute Error of model residuals")
    rmse: Optional[float] = Field(None, description="Root Mean Squared Error of model residuals")
    points: List[ForecastPoint] = Field(default_factory=list, description="Array of forecasted data points")


class TrainRequest(BaseModel):
    """
    Request body for manual / on-demand model retraining.
    """
    lookback_minutes: Optional[int] = Field(None, ge=1, le=120, description="Override lookback window in minutes")
    forecast_horizon_seconds: Optional[int] = Field(None, ge=10, le=600, description="Override forecast horizon")


class TrainResponse(BaseModel):
    """
    Response returned after executing a training and forecasting cycle.
    """
    status: str = Field(..., description="Training status (e.g., 'SUCCESS', 'SKIPPED_INSUFFICIENT_DATA', 'FAILED')")
    message: str = Field(..., description="Detailed status message")
    data_points_trained: int = Field(..., description="Number of historical data points used for training")
    training_duration_seconds: float = Field(..., description="Time taken to train and forecast in seconds")
    predicted_rps: float = Field(..., description="Latest forward predicted RPS set on Prometheus gauge")
    mae: Optional[float] = Field(None, description="Computed MAE error metric")
    rmse: Optional[float] = Field(None, description="Computed RMSE error metric")


class HealthResponse(BaseModel):
    """
    Health check response model.
    """
    status: str = Field(..., description="Service health ('UP' or 'DOWN')")
    service: str = Field("forecasting-service", description="Service identifier")
    model_ready: bool = Field(..., description="True if at least one forecast cycle has executed")
    last_trained_at: Optional[datetime] = Field(None, description="Timestamp of the last successful model fit")
    current_predicted_rps: float = Field(..., description="Current value of the predicted RPS gauge")
