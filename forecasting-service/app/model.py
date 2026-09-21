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


class RollingForecastLedger:
    """
    Maintains a rolling ledger of future predictions and matches them against
    subsequent actual Prometheus telemetry observations for genuine out-of-sample evaluation.
    Guarantees no data leakage by requiring prediction_time < observation_time.
    """

    def __init__(self, max_records: int = 5000):
        self.max_records = max_records
        self.pending_predictions: List[dict] = []
        self.evaluated_pairs: List[dict] = []
        self.last_evaluated_at: Optional[datetime] = None

    def record_predictions(self, points: List[ForecastPoint], horizon_seconds: int):
        now = datetime.now(timezone.utc)
        for pt in points:
            target_ts = pt.timestamp
            if target_ts.tzinfo is None:
                target_ts = target_ts.replace(tzinfo=timezone.utc)
            self.pending_predictions.append({
                "prediction_time": now,
                "target_time": target_ts,
                "yhat": pt.predicted_rps,
                "horizon_seconds": horizon_seconds,
            })
        # Prune older pending predictions older than 30 minutes
        cutoff = now.timestamp() - 1800
        self.pending_predictions = [
            p for p in self.pending_predictions if p["target_time"].timestamp() >= cutoff
        ]

    def match_observations(self, df: pd.DataFrame):
        if df is None or len(df) == 0 or not self.pending_predictions:
            return

        now = datetime.now(timezone.utc)
        matched_indices = set()

        for _, row in df.iterrows():
            obs_ts = row["ds"]
            if not isinstance(obs_ts, datetime):
                obs_ts = pd.to_datetime(obs_ts).to_pydatetime()
            if obs_ts.tzinfo is None:
                obs_ts = obs_ts.replace(tzinfo=timezone.utc)

            obs_y = float(row["y"])
            obs_epoch = obs_ts.timestamp()

            for idx, pred in enumerate(self.pending_predictions):
                if idx in matched_indices:
                    continue

                # Ensure out-of-sample: prediction was made BEFORE observation time
                lead_time = obs_epoch - pred["prediction_time"].timestamp()
                target_diff = abs(obs_epoch - pred["target_time"].timestamp())

                # Matched within 5s target tolerance and strictly made at least 5s before observation
                if target_diff <= 5.0 and lead_time >= 5.0:
                    yhat = pred["yhat"]
                    abs_err = abs(obs_y - yhat)
                    sq_err = (obs_y - yhat) ** 2

                    self.evaluated_pairs.append({
                        "target_time": obs_ts,
                        "lead_time_seconds": lead_time,
                        "y_actual": obs_y,
                        "yhat": yhat,
                        "abs_error": abs_err,
                        "sq_error": sq_err,
                    })
                    matched_indices.add(idx)
                    self.last_evaluated_at = now

        # Remove matched predictions from pending
        self.pending_predictions = [
            p for idx, p in enumerate(self.pending_predictions) if idx not in matched_indices
        ]

        # Retain max evaluated records
        if len(self.evaluated_pairs) > self.max_records:
            self.evaluated_pairs = self.evaluated_pairs[-self.max_records:]

    def get_accuracy(self) -> Tuple[int, Optional[float], Optional[float], Optional[datetime]]:
        """
        Calculates out-of-sample MAE and RMSE across all valid matched future prediction pairs.
        Returns: (count, MAE, RMSE, last_evaluated_at)
        """
        if not self.evaluated_pairs:
            return 0, None, None, None

        abs_errors = [p["abs_error"] for p in self.evaluated_pairs]
        sq_errors = [p["sq_error"] for p in self.evaluated_pairs]

        mae = float(np.mean(abs_errors))
        rmse = float(np.sqrt(np.mean(sq_errors)))

        return len(self.evaluated_pairs), round(mae, 4), round(rmse, 4), self.last_evaluated_at


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
        self.ledger = RollingForecastLedger()
        self.latest_mae: Optional[float] = None
        self.latest_rmse: Optional[float] = None

    def _create_model(self) -> Prophet:
        """
        Instantiate a new Prophet model configured for short-horizon micro-workload forecasting.
        """
        return Prophet(
            growth="linear",
            changepoint_prior_scale=self.changepoint_prior_scale,
            seasonality_prior_scale=self.seasonality_prior_scale,
            interval_width=self.interval_width,
            daily_seasonality=False,
            weekly_seasonality=False,
            yearly_seasonality=False,
            uncertainty_samples=100,
        )

    def fit(self, df: pd.DataFrame) -> Tuple[bool, str]:
        """
        Fit the Prophet model on historical (ds, y) data and update out-of-sample accuracy.
        """
        if df is None or len(df) < settings.MIN_DATA_POINTS_FOR_TRAIN:
            count = 0 if df is None else len(df)
            msg = f"Insufficient data points for training: {count} < {settings.MIN_DATA_POINTS_FOR_TRAIN}"
            logger.warning(msg)
            return False, msg

        if "ds" not in df.columns or "y" not in df.columns:
            msg = "DataFrame missing required 'ds' and 'y' columns"
            logger.error(msg)
            return False, msg

        try:
            # 1. Match latest observations against past out-of-sample predictions
            self.ledger.match_observations(df)
            count, mae, rmse, _ = self.ledger.get_accuracy()
            self.latest_mae = mae
            self.latest_rmse = rmse

            # 2. Fit model on historical observations
            train_df = df[["ds", "y"]].copy()
            train_df["y"] = pd.to_numeric(train_df["y"], errors="coerce").fillna(0.0).clip(lower=0.0)

            model = self._create_model()
            model.fit(train_df)

            self.model = model
            self.last_fitted_at = datetime.now(timezone.utc)

            logger.info("Prophet model fitted on %d points. Out-of-sample evaluated pairs: %d, MAE: %s, RMSE: %s",
                        len(train_df), count, str(self.latest_mae), str(self.latest_rmse))
            return True, f"Model trained on {len(train_df)} points (Out-of-sample MAE: {self.latest_mae}, RMSE: {self.latest_rmse})"

        except Exception as e:
            logger.error("Error fitting Prophet model: %s", e, exc_info=True)
            return False, f"Model training failed: {str(e)}"

    def predict(
        self,
        horizon_seconds: int = settings.FORECAST_HORIZON_SECONDS,
        freq_seconds: int = settings.FORECAST_FREQUENCY_SECONDS,
    ) -> List[ForecastPoint]:
        """
        Generate forward-looking forecast points and record in out-of-sample evaluation ledger.
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

            # Record predictions in out-of-sample ledger
            self.ledger.record_predictions(points, horizon_seconds)

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

