"""
Forecasting Orchestration Service.
Coordinates the background loop, Prometheus scraping, Prophet model fitting, and gauge updates.
"""

import asyncio
import logging
import time
from datetime import datetime, timezone
from typing import Optional

from app.config import settings
from app.metrics import (
    PREDICTED_RPS_GAUGE,
    FORECAST_MAE_GAUGE,
    FORECAST_RMSE_GAUGE,
    FORECAST_LAST_TRAINED_TIMESTAMP,
    FORECAST_TRAINING_DURATION_SECONDS,
    FORECAST_CYCLES_TOTAL,
)
from app.model import ProphetForecaster
from app.schemas import ForecastResponse, TrainResponse
from app.scraper import PrometheusScraper

logger = logging.getLogger("forecasting-service.orchestrator")


class ForecastingService:
    """
    Singleton service that manages periodic background model training and predictions.
    """

    def __init__(
        self,
        scraper: Optional[PrometheusScraper] = None,
        forecaster: Optional[ProphetForecaster] = None,
    ):
        self.scraper = scraper or PrometheusScraper()
        self.forecaster = forecaster or ProphetForecaster()
        self.latest_forecast: Optional[ForecastResponse] = None
        self._worker_task: Optional[asyncio.Task] = None
        self._running: bool = False

        # Initialize gauge with safe baseline
        PREDICTED_RPS_GAUGE.set(settings.DEFAULT_BASELINE_RPS)

    async def run_forecast_cycle(
        self,
        start_timestamp: Optional[float] = None,
        end_timestamp: Optional[float] = None,
        lookback_minutes: Optional[int] = None,
        forecast_horizon_seconds: Optional[int] = None,
    ) -> TrainResponse:
        """
        Execute one complete cycle: Scrape -> Fit -> Predict -> Update Metrics.
        """
        lookback = lookback_minutes or settings.SCRAPE_LOOKBACK_MINUTES
        horizon = forecast_horizon_seconds or settings.FORECAST_HORIZON_SECONDS
        start_time = time.perf_counter()

        logger.info("Starting forecasting cycle: start_ts=%s, end_ts=%s, lookback=%dm, horizon=%ds",
                    str(start_timestamp), str(end_timestamp), lookback, horizon)

        try:
            # 1. Scrape Prometheus
            df = await self.scraper.fetch_workload_history(
                start_timestamp=start_timestamp,
                end_timestamp=end_timestamp,
                lookback_minutes=lookback,
            )
            data_points = len(df) if df is not None else 0

            earliest_sample = None
            latest_sample = None
            if df is not None and len(df) > 0 and "ds" in df.columns:
                earliest_sample = pd.to_datetime(df["ds"].min()).to_pydatetime()
                latest_sample = pd.to_datetime(df["ds"].max()).to_pydatetime()
                if earliest_sample.tzinfo is None:
                    earliest_sample = earliest_sample.replace(tzinfo=timezone.utc)
                if latest_sample.tzinfo is None:
                    latest_sample = latest_sample.replace(tzinfo=timezone.utc)

            # 2. Fit Prophet Model
            success, message = self.forecaster.fit(df)
            now = datetime.now(timezone.utc)

            # 3. Predict Future Workload Points
            points = self.forecaster.predict(horizon_seconds=horizon)

            # Primary predicted RPS for KEDA (use the peak or immediate point in the horizon)
            if points:
                # Use immediate 30s-60s target RPS
                next_rps = points[0].predicted_rps
            else:
                next_rps = settings.DEFAULT_BASELINE_RPS

            duration = time.perf_counter() - start_time

            # 4. Update Prometheus Gauges
            PREDICTED_RPS_GAUGE.set(next_rps)
            FORECAST_TRAINING_DURATION_SECONDS.set(round(duration, 4))
            FORECAST_LAST_TRAINED_TIMESTAMP.set(now.timestamp())

            if self.forecaster.latest_mae is not None:
                FORECAST_MAE_GAUGE.set(self.forecaster.latest_mae)
            if self.forecaster.latest_rmse is not None:
                FORECAST_RMSE_GAUGE.set(self.forecaster.latest_rmse)

            FORECAST_CYCLES_TOTAL.labels(status="success" if success else "warning").inc()

            # 5. Cache Response for API Clients
            self.latest_forecast = ForecastResponse(
                generated_at=now,
                horizon_seconds=horizon,
                current_predicted_rps=next_rps,
                mae=self.forecaster.latest_mae,
                rmse=self.forecaster.latest_rmse,
                points=points,
            )

            status_str = "SUCCESS" if success else "SKIPPED_INSUFFICIENT_DATA"
            logger.info("Cycle completed in %.3fs. Status: %s. Data points: %d. Target Predicted RPS: %.2f",
                        duration, status_str, data_points, next_rps)

            training_start_dt = datetime.fromtimestamp(start_timestamp, tz=timezone.utc) if start_timestamp else None
            training_end_dt = datetime.fromtimestamp(end_timestamp, tz=timezone.utc) if end_timestamp else None

            return TrainResponse(
                status=status_str,
                message=message,
                data_points_trained=data_points,
                training_duration_seconds=round(duration, 4),
                predicted_rps=next_rps,
                mae=self.forecaster.latest_mae,
                rmse=self.forecaster.latest_rmse,
                training_start_utc=training_start_dt,
                training_end_utc=training_end_dt,
                earliest_training_sample=earliest_sample,
                latest_training_sample=latest_sample,
            )

        except Exception as e:
            duration = time.perf_counter() - start_time
            logger.error("Forecast cycle failed: %s", e, exc_info=True)
            FORECAST_CYCLES_TOTAL.labels(status="failure").inc()
            return TrainResponse(
                status="FAILED",
                message=f"Forecasting cycle failed: {str(e)}",
                data_points_trained=0,
                training_duration_seconds=round(duration, 4),
                predicted_rps=settings.DEFAULT_BASELINE_RPS,
                mae=None,
                rmse=None,
            )

    async def _background_loop(self):
        """
        Continuous background worker loop that runs every TRAINING_INTERVAL_SECONDS.
        """
        logger.info("Background forecasting worker loop started (interval: %ds)", settings.TRAINING_INTERVAL_SECONDS)
        while self._running:
            try:
                await self.run_forecast_cycle()
            except asyncio.CancelledError:
                logger.info("Background forecasting worker received cancellation")
                break
            except Exception as e:
                logger.error("Unhandled exception in background forecasting loop: %s", e, exc_info=True)

            try:
                await asyncio.sleep(settings.TRAINING_INTERVAL_SECONDS)
            except asyncio.CancelledError:
                break
        logger.info("Background forecasting worker loop stopped")

    def start_background_worker(self):
        """
        Launch the async background worker task.
        """
        if not self._running:
            self._running = True
            self._worker_task = asyncio.create_task(self._background_loop())
            logger.info("Forecasting background task created")

    def stop_background_worker(self):
        """
        Cancel the async background worker task.
        """
        if self._running:
            self._running = False
            if self._worker_task:
                self._worker_task.cancel()
                self._worker_task = None
            logger.info("Forecasting background task stopped")


# Singleton instance
forecasting_service = ForecastingService()
