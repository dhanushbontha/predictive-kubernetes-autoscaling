"""
FastAPI Application Entrypoint for the Predictive Workload Forecasting Service.
"""

import logging
from contextlib import asynccontextmanager
from datetime import datetime, timezone
from fastapi import FastAPI, HTTPException, Response
from fastapi.middleware.cors import CORSMiddleware

from app.config import settings
from app.metrics import get_latest_metrics, PREDICTED_RPS_GAUGE
from app.schemas import AccuracyResponse, ForecastResponse, HealthResponse, TrainRequest, TrainResponse
from app.service import forecasting_service

# Configure root logger
logging.basicConfig(
    level=getattr(logging, settings.LOG_LEVEL.upper(), logging.INFO),
    format="%(asctime)s [%(levelname)s] %(name)s: %(message)s",
)
logger = logging.getLogger("forecasting-service.main")


@asynccontextmanager
async def lifespan(app: FastAPI):
    """
    Application lifespan context manager: manages background worker lifecycle.
    """
    logger.info("Initializing Predictive Forecasting Service...")
    forecasting_service.start_background_worker()
    yield
    logger.info("Shutting down Predictive Forecasting Service...")
    forecasting_service.stop_background_worker()


app = FastAPI(
    title="Predictive Kubernetes Autoscaling - Forecasting Service",
    description="Time-series workload forecasting engine utilizing Meta Prophet and FastAPI to power predictive KEDA autoscaling.",
    version="1.0.0",
    lifespan=lifespan,
)

# Enable CORS for dashboard and backend API access
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.get("/health", response_model=HealthResponse, summary="Health Check")
async def health_check():
    """
    Service health check and readiness status.
    """
    is_ready = forecasting_service.forecaster.last_fitted_at is not None
    current_rps = float(PREDICTED_RPS_GAUGE._value.get())

    return HealthResponse(
        status="UP",
        service="forecasting-service",
        model_ready=is_ready,
        last_trained_at=forecasting_service.forecaster.last_fitted_at,
        current_predicted_rps=current_rps,
    )


@app.get("/metrics", summary="Prometheus Metrics")
async def prometheus_metrics():
    """
    Exposes Prometheus format metrics including 'predicted_workload_requests_per_second' for KEDA.
    """
    data, content_type = get_latest_metrics()
    return Response(content=data, media_type=content_type)


@app.get("/api/forecast", response_model=ForecastResponse, summary="Get Current Workload Forecast")
async def get_forecast():
    """
    Retrieve the latest generated workload forecast time-series points.
    """
    if forecasting_service.latest_forecast is not None:
        return forecasting_service.latest_forecast

    # If no background forecast is ready yet, generate on-the-fly
    points = forecasting_service.forecaster.predict(
        horizon_seconds=settings.FORECAST_HORIZON_SECONDS,
        freq_seconds=settings.FORECAST_FREQUENCY_SECONDS,
    )
    current_rps = points[0].predicted_rps if points else settings.DEFAULT_BASELINE_RPS

    return ForecastResponse(
        generated_at=datetime.now(timezone.utc),
        horizon_seconds=settings.FORECAST_HORIZON_SECONDS,
        current_predicted_rps=current_rps,
        mae=forecasting_service.forecaster.latest_mae,
        rmse=forecasting_service.forecaster.latest_rmse,
        points=points,
    )


@app.get("/api/forecast/accuracy", response_model=AccuracyResponse, summary="Get Out-of-Sample Forecast Accuracy")
async def get_forecast_accuracy():
    """
    Retrieve genuine out-of-sample forecast accuracy evaluated against actual future telemetry.
    """
    count, mae, rmse, last_eval = forecasting_service.forecaster.ledger.get_accuracy()
    status_str = "EVALUATED" if count > 0 else "INSUFFICIENT_OUT_OF_SAMPLE_DATA"

    return AccuracyResponse(
        status=status_str,
        evaluated_pairs=count,
        mae=mae,
        rmse=rmse,
        last_evaluated_at=last_eval,
    )


@app.post("/api/train", response_model=TrainResponse, summary="Trigger Manual Model Retraining")
async def trigger_training(req: TrainRequest = TrainRequest()):
    """
    Trigger an immediate on-demand scrape and Prophet model training cycle.
    """
    response = await forecasting_service.run_forecast_cycle(
        lookback_minutes=req.lookback_minutes,
        forecast_horizon_seconds=req.forecast_horizon_seconds,
    )

    if response.status == "FAILED":
        raise HTTPException(status_code=500, detail=response.message)

    return response



if __name__ == "__main__":
    import uvicorn
    uvicorn.run("app.main:app", host=settings.HOST, port=settings.PORT, log_level=settings.LOG_LEVEL.lower())
