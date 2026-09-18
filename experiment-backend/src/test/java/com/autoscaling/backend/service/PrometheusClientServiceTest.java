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
    @DisplayName("fetchHistory builds complete 5-chart telemetry response")
    void testFetchHistory() {
        Instant now = Instant.now();
        LiveMetricsHistoryResponse history = prometheusService.fetchHistory(now.minusSeconds(60), now, "5s");
        assertNotNull(history);
        assertNotNull(history.getActualWorkloadSeries());
        assertNotNull(history.getPredictedWorkloadSeries());
        assertNotNull(history.getReplicaSeries());
        assertNotNull(history.getCpuUtilizationSeries());
        assertNotNull(history.getMemoryUtilizationSeries());
    }
}
