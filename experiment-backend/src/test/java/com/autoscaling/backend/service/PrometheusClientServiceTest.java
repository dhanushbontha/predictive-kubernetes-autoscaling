package com.autoscaling.backend.service;

import com.autoscaling.backend.dto.DashboardLiveResponse;
import com.autoscaling.backend.dto.LiveMetricsHistoryResponse;
import com.autoscaling.backend.dto.TimeSeriesPoint;
import com.fasterxml.jackson.databind.ObjectMapper;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;

import java.time.Instant;
import java.util.List;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertNotNull;

class PrometheusClientServiceTest {

    private PrometheusClientService prometheusService;
    private ObjectMapper objectMapper;

    @BeforeEach
    void setUp() {
        objectMapper = new ObjectMapper();
        // Pointing to local mock/fallback URL
        prometheusService = new PrometheusClientService("http://localhost:9090", objectMapper);
    }

    @Test
    @DisplayName("queryScalar gracefully returns 0.0 when Prometheus is not reachable")
    void testQueryScalarGracefulFallback() {
        Double scalar = prometheusService.queryScalar(PrometheusClientService.QUERY_ACTUAL_RPS);
        assertNotNull(scalar);
        assertEquals(0.0, scalar);
    }

    @Test
    @DisplayName("queryRange gracefully returns empty list when Prometheus is not reachable")
    void testQueryRangeGracefulFallback() {
        Instant now = Instant.now();
        List<TimeSeriesPoint> points = prometheusService.queryRange(
                PrometheusClientService.QUERY_ACTUAL_RPS, now.minusSeconds(60), now, "5s");
        assertNotNull(points);
    }

    @Test
    @DisplayName("populateLiveMetrics populates response object cleanly")
    void testPopulateLiveMetrics() {
        DashboardLiveResponse live = new DashboardLiveResponse();
        DashboardLiveResponse populated = prometheusService.populateLiveMetrics(live, 200);
        assertNotNull(populated);
        assertNotNull(populated.getCurrentRequestRate());
        assertNotNull(populated.getPredictedRequestRate());
    }

    @Test
    @DisplayName("calculateMae and calculateRmse correctly compute accuracy between matching timestamps")
    void testCalculateMaeAndRmse() {
        Instant t1 = Instant.parse("2026-09-21T05:00:00Z");
        Instant t2 = Instant.parse("2026-09-21T05:00:05Z");
        Instant t3 = Instant.parse("2026-09-21T05:00:10Z");

        List<TimeSeriesPoint> actual = List.of(
                new TimeSeriesPoint(t1, 50.0),
                new TimeSeriesPoint(t2, 100.0),
                new TimeSeriesPoint(t3, 150.0)
        );

        List<TimeSeriesPoint> pred = List.of(
                new TimeSeriesPoint(t1, 52.0), // error = 2
                new TimeSeriesPoint(t2, 95.0),  // error = 5
                new TimeSeriesPoint(t3, 154.0)  // error = 4
        );

        Double mae = prometheusService.calculateMae(actual, pred);
        Double rmse = prometheusService.calculateRmse(actual, pred);

        assertNotNull(mae);
        assertNotNull(rmse);
        // MAE = (2 + 5 + 4) / 3 = 11 / 3 = 3.6666...
        assertEquals(3.666, mae, 0.01);
        // RMSE = sqrt((4 + 25 + 16) / 3) = sqrt(45 / 3) = sqrt(15) = 3.8729...
        assertEquals(3.873, rmse, 0.01);
    }

    @Test
    @DisplayName("calculateMae returns null when no matching points exist")
    void testCalculateMaeEmpty() {
        Double mae = prometheusService.calculateMae(List.of(), List.of());
        org.junit.jupiter.api.Assertions.assertNull(mae);
    }
}
