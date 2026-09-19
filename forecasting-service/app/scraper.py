"""
Prometheus Metrics Scraper.
Fetches historical workload time-series from Prometheus for Prophet model fitting.
"""

import logging
from datetime import datetime, timezone
import httpx
import pandas as pd

from app.config import settings

logger = logging.getLogger("forecasting-service.scraper")


class PrometheusScraper:
    """
    Client for extracting workload request rate history from Prometheus.
    """

    def __init__(self, prometheus_url: str = settings.PROMETHEUS_URL):
        self.prometheus_url = prometheus_url.rstrip("/")
        self.query_range_endpoint = f"{self.prometheus_url}/api/v1/query_range"

    async def fetch_workload_history(
        self,
        lookback_minutes: int = settings.SCRAPE_LOOKBACK_MINUTES,
        step_seconds: int = settings.SCRAPE_STEP_SECONDS,
        query: str = settings.WORKLOAD_METRIC_QUERY,
    ) -> pd.DataFrame:
        """
        Query Prometheus range API and return a sanitized DataFrame with 'ds' and 'y' columns.
        """
        now = datetime.now(timezone.utc)
        end_time = now.timestamp()
        start_time = end_time - (lookback_minutes * 60)

        params = {
            "query": query,
            "start": f"{start_time:.3f}",
            "end": f"{end_time:.3f}",
            "step": f"{step_seconds}s",
        }

        try:
            async with httpx.AsyncClient(timeout=settings.HTTP_TIMEOUT_SECONDS) as client:
                logger.debug("Querying Prometheus range API: %s with params %s", self.query_range_endpoint, params)
                response = await client.get(self.query_range_endpoint, params=params)
                response.raise_for_status()
                data = response.json()

            if data.get("status") != "success":
                logger.warning("Prometheus returned non-success status: %s", data)
                return pd.DataFrame(columns=["ds", "y"])

            results = data.get("data", {}).get("result", [])
            if not results:
                logger.info("No metric data returned from Prometheus for query: %s", query)
                return pd.DataFrame(columns=["ds", "y"])

            # Merge all returned series (or use the sum series)
            all_records = []
            for item in results:
                values = item.get("values", [])
                for timestamp_sec, val_str in values:
                    try:
                        val = float(val_str)
                        # Prometheus rates can sometimes be NaN or negative during counter resets
                        if val < 0.0 or pd.isna(val):
                            val = 0.0
                        ts = datetime.fromtimestamp(float(timestamp_sec), tz=timezone.utc)
                        all_records.append({"ds": ts, "y": val})
                    except (ValueError, TypeError):
                        continue

            if not all_records:
                return pd.DataFrame(columns=["ds", "y"])

            df = pd.DataFrame(all_records)
            # If multiple series returned, sum by timestamp
            df = df.groupby("ds", as_index=False)["y"].sum()
            # Sort chronologically and drop timezone for Prophet compatibility
            df["ds"] = df["ds"].dt.tz_localize(None)
            df = df.sort_values(by="ds").reset_index(drop=True)

            logger.info("Fetched %d historical data points from Prometheus", len(df))
            return df

        except httpx.RequestError as e:
            logger.warning("Network error while connecting to Prometheus at %s: %s", self.prometheus_url, e)
            return pd.DataFrame(columns=["ds", "y"])
        except Exception as e:
            logger.error("Unexpected error fetching metrics from Prometheus: %s", e, exc_info=True)
            return pd.DataFrame(columns=["ds", "y"])
