"""
Meta Prophet Time-Series Forecaster.
Fits time-series regression and generates forward-looking workload predictions.
"""

import logging
from datetime import datetime, timezone
from typing import List, Optional, Tuple
import numpy as np
import pandas as pd
from prophet import Prophet

from app.config import settings
from app.schemas import ForecastPoint

logger = logging.getLogger("forecasting-service.model")


class ProphetForecaster:
    """
    Wrapper around Meta Prophet for automated workload time-series forecasting.
    """

    def __init__(
        self,
        changepoint_prior_scale: float = settings.PROPHET_CHANGEPOINT_PRIOR_SCALE,
        seasonality_prior_scale: float = settings.PROPHET_SEASONALITY_PRIOR_SCALE,
        interval_width: float = settings.PROPHET_INTERVAL_WIDTH,
    ):
        self.changepoint_prior_scale = changepoint_prior_scale
        self.seasonality_prior_scale = seasonality_prior_scale
        self.interval_width = interval_width
        self.model: Optional[Prophet] = None
        self.last_fitted_at: Optional[datetime] = None
        self.latest_mae: Optional[float] = None
        self.latest_rmse: Optional[float] = None

    def _create_model(self) -> Prophet:
        """
        Instantiate a new Prophet model configured for short-horizon micro-workload forecasting.
        """
        # Suppress Prophet stdout logging for clean logs
        return Prophet(
            growth="linear",
            changepoint_prior_scale=self.changepoint_prior_scale,
            seasonality_prior_scale=self.seasonality_prior_scale,
            interval_width=self.interval_width,
            daily_seasonality=False,
            weekly_seasonality=False,
            yearly_seasonality=False,
            uncertainty_samples=100,  # Fast uncertainty estimation
        )

    def fit(self, df: pd.DataFrame) -> Tuple[bool, str]:
        """
        Fit the Prophet model on historical (ds, y) data and compute residual accuracy metrics.
        """
        if df is None or len(df) < settings.MIN_DATA_POINTS_FOR_TRAIN:
            count = 0 if df is None else len(df)
            msg = f"Insufficient data points for training: {count} < {settings.MIN_DATA_POINTS_FOR_TRAIN}"
            logger.warning(msg)
            return False, msg

        # Ensure required columns exist
        if "ds" not in df.columns or "y" not in df.columns:
            msg = "DataFrame missing required 'ds' and 'y' columns"
            logger.error(msg)
            return False, msg

        try:
            # Clean and prepare data
            train_df = df[["ds", "y"]].copy()
            train_df["y"] = pd.to_numeric(train_df["y"], errors="coerce").fillna(0.0)
            train_df["y"] = train_df["y"].clip(lower=0.0)

            # Check if all values are identical (zero variance)
            if train_df["y"].nunique() <= 1 and len(train_df) > 0:
                logger.info("Uniform workload series detected (value=%.2f), creating baseline model", train_df['y'].iloc[0])

            model = self._create_model()
            model.fit(train_df)

            # In-sample evaluation for MAE and RMSE
            in_sample_pred = model.predict(train_df[["ds"]])
            residuals = train_df["y"].values - in_sample_pred["yhat"].values
            mae = float(np.mean(np.abs(residuals)))
            rmse = float(np.sqrt(np.mean(residuals ** 2)))

            self.model = model
            self.last_fitted_at = datetime.now(timezone.utc)
            self.latest_mae = round(mae, 4)
            self.latest_rmse = round(rmse, 4)

            logger.info("Prophet model successfully trained on %d data points. MAE=%.4f, RMSE=%.4f", len(train_df), mae, rmse)
            return True, f"Model trained successfully on {len(train_df)} points (MAE: {self.latest_mae}, RMSE: {self.latest_rmse})"

        except Exception as e:
            logger.error("Error fitting Prophet model: %s", e, exc_info=True)
            return False, f"Model training failed: {str(e)}"

    def predict(
        self,
        horizon_seconds: int = settings.FORECAST_HORIZON_SECONDS,
        freq_seconds: int = settings.FORECAST_FREQUENCY_SECONDS,
    ) -> List[ForecastPoint]:
        """
        Generate forward-looking forecast points starting from the latest known time.
        """
        if self.model is None:
            logger.warning("Predict called before model was trained; generating default baseline")
            return self._generate_baseline_forecast(horizon_seconds, freq_seconds)

        try:
            periods = max(1, horizon_seconds // freq_seconds)
            future_df = self.model.make_future_dataframe(
                periods=periods,
                freq=f"{freq_seconds}s",
                include_history=False,
            )

            forecast_df = self.model.predict(future_df)
            points: List[ForecastPoint] = []

            for _, row in forecast_df.iterrows():
                # Clamp non-negative predictions
                yhat = max(0.0, float(row["yhat"]))
                yhat_lower = max(0.0, float(row.get("yhat_lower", yhat * 0.8)))
                yhat_upper = max(0.0, float(row.get("yhat_upper", yhat * 1.2)))

                ts = row["ds"]
                if not isinstance(ts, datetime):
                    ts = pd.to_datetime(ts).to_pydatetime()
                if ts.tzinfo is None:
                    ts = ts.replace(tzinfo=timezone.utc)

                points.append(
                    ForecastPoint(
                        timestamp=ts,
                        predicted_rps=round(yhat, 2),
                        lower_bound=round(yhat_lower, 2),
                        upper_bound=round(yhat_upper, 2),
                    )
                )

            return points

        except Exception as e:
            logger.error("Error generating prediction from Prophet model: %s", e, exc_info=True)
            return self._generate_baseline_forecast(horizon_seconds, freq_seconds)

    def _generate_baseline_forecast(
        self,
        horizon_seconds: int,
        freq_seconds: int,
    ) -> List[ForecastPoint]:
        """
        Fallback baseline forecast when model is not yet fitted.
        """
        points: List[ForecastPoint] = []
        now = datetime.now(timezone.utc)
        baseline = settings.DEFAULT_BASELINE_RPS

        periods = max(1, horizon_seconds // freq_seconds)
        for i in range(1, periods + 1):
            ts = datetime.fromtimestamp(now.timestamp() + (i * freq_seconds), tz=timezone.utc)
            points.append(
                ForecastPoint(
                    timestamp=ts,
                    predicted_rps=baseline,
                    lower_bound=baseline * 0.8,
                    upper_bound=baseline * 1.2,
                )
            )
        return points
