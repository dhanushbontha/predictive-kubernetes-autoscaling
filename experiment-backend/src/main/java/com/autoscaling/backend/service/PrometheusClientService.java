package com.autoscaling.backend.service;

import com.autoscaling.backend.dto.DashboardLiveResponse;
import com.autoscaling.backend.dto.LiveMetricsHistoryResponse;
import com.autoscaling.backend.dto.TimeSeriesPoint;
import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.ResponseEntity;
import org.springframework.http.client.SimpleClientHttpRequestFactory;
import org.springframework.stereotype.Service;
import org.springframework.web.client.RestClient;
import org.springframework.web.util.UriComponentsBuilder;

import java.net.URI;
import java.time.Instant;
import java.util.ArrayList;
import java.util.List;

/**
 * Service querying Prometheus via PromQL HTTP API for real-time measurements
 * and time-series history.
 */
@Service
public class PrometheusClientService {

    private static final Logger log = LoggerFactory.getLogger(PrometheusClientService.class);

    // Exact PromQL queries isolated to application traffic
    public static final String QUERY_ACTUAL_RPS = "sum(rate(http_server_requests_seconds_count{job=\"workload-service\", uri=\"/api/workload\"}[1m]))";
    public static final String QUERY_PREDICTED_RPS = "predicted_workload_requests_per_second";
    public static final String QUERY_P95_LATENCY = "histogram_quantile(0.95, sum(rate(http_server_requests_seconds_bucket{job=\"workload-service\", uri=\"/api/workload\"}[1m])) by (le)) * 1000";
    public static final String QUERY_P99_LATENCY = "histogram_quantile(0.99, sum(rate(http_server_requests_seconds_bucket{job=\"workload-service\", uri=\"/api/workload\"}[1m])) by (le)) * 1000";
    public static final String QUERY_CPU_PERCENT = "sum(rate(container_cpu_usage_seconds_total{container=\"workload-service\"}[1m])) / sum(kube_pod_container_resource_requests{container=\"workload-service\", resource=\"cpu\"}) * 100";
    public static final String QUERY_CPU_FALLBACK = "sum(process_cpu_usage{job=\"workload-service\"}) * 100";
    public static final String QUERY_MEMORY_BYTES = "sum(container_memory_working_set_bytes{container=\"workload-service\"})";
    public static final String QUERY_REPLICAS = "kube_deployment_status_replicas_ready{deployment=\"workload-service\"}";

    private final String prometheusBaseUrl;
    private final RestClient restClient;
    private final ObjectMapper objectMapper;

    public PrometheusClientService(
            @Value("${app.prometheus.url:http://prometheus-kube-prometheus-prometheus.monitoring.svc.cluster.local:9090}") String prometheusBaseUrl,
            ObjectMapper objectMapper) {
        this.prometheusBaseUrl = prometheusBaseUrl;
        this.objectMapper = objectMapper;
        SimpleClientHttpRequestFactory requestFactory = new SimpleClientHttpRequestFactory();
        requestFactory.setConnectTimeout(300);
        requestFactory.setReadTimeout(500);
        this.restClient = RestClient.builder()
                .baseUrl(prometheusBaseUrl)
                .requestFactory(requestFactory)
                .build();
        log.info("Initialized Prometheus Client targeting base URL: {}", prometheusBaseUrl);
    }

    /**
     * Executes an instant PromQL query and returns the first scalar result.
     */
    public Double queryScalar(String query) {
        try {
            URI uri = UriComponentsBuilder.fromHttpUrl(prometheusBaseUrl)
                    .path("/api/v1/query")
                    .queryParam("query", query)
                    .build()
                    .toUri();

            ResponseEntity<String> response = restClient.get()
                    .uri(uri)
                    .retrieve()
                    .toEntity(String.class);

            if (response.getStatusCode().is2xxSuccessful() && response.getBody() != null) {
                JsonNode root = objectMapper.readTree(response.getBody());
                if ("success".equalsIgnoreCase(root.path("status").asText())) {
                    JsonNode results = root.path("data").path("result");
                    if (results.isArray() && !results.isEmpty()) {
                        JsonNode valueNode = results.get(0).path("value");
                        if (valueNode.isArray() && valueNode.size() >= 2) {
                            String rawVal = valueNode.get(1).asText();
                            if (!"NaN".equalsIgnoreCase(rawVal) && !"+Inf".equalsIgnoreCase(rawVal) && !"-Inf".equalsIgnoreCase(rawVal)) {
                                return Double.parseDouble(rawVal);
                            }
                        }
                    }
                }
            }
        } catch (Exception ex) {
            log.debug("Prometheus instant query '{}' failed: {}", query, ex.getMessage());
        }
        return 0.0;
    }

    /**
     * Executes a range PromQL query and parses the resulting time-series points.
     */
    public List<TimeSeriesPoint> queryRange(String query, Instant start, Instant end, String step) {
        List<TimeSeriesPoint> points = new ArrayList<>();
        try {
            URI uri = UriComponentsBuilder.fromHttpUrl(prometheusBaseUrl)
                    .path("/api/v1/query_range")
                    .queryParam("query", query)
                    .queryParam("start", start.getEpochSecond())
                    .queryParam("end", end.getEpochSecond())
                    .queryParam("step", (step != null && !step.isBlank()) ? step : "5s")
                    .build()
                    .toUri();

            ResponseEntity<String> response = restClient.get()
                    .uri(uri)
                    .retrieve()
                    .toEntity(String.class);

            if (response.getStatusCode().is2xxSuccessful() && response.getBody() != null) {
                JsonNode root = objectMapper.readTree(response.getBody());
                if ("success".equalsIgnoreCase(root.path("status").asText())) {
                    JsonNode results = root.path("data").path("result");
                    if (results.isArray() && !results.isEmpty()) {
                        JsonNode valuesNode = results.get(0).path("values");
                        if (valuesNode.isArray()) {
                            for (JsonNode pointNode : valuesNode) {
                                if (pointNode.isArray() && pointNode.size() >= 2) {
                                    long epochSeconds = pointNode.get(0).asLong();
                                    String rawVal = pointNode.get(1).asText();
                                    if (!"NaN".equalsIgnoreCase(rawVal) && !"+Inf".equalsIgnoreCase(rawVal) && !"-Inf".equalsIgnoreCase(rawVal)) {
                                        points.add(new TimeSeriesPoint(Instant.ofEpochSecond(epochSeconds), Double.parseDouble(rawVal)));
                                    }
                                }
                            }
                        }
                    }
                }
            }
        } catch (Exception ex) {
            log.debug("Prometheus range query '{}' failed: {}", query, ex.getMessage());
        }
        return points;
    }

    /**
     * Aggregates live telemetry from Prometheus into DashboardLiveResponse.
     */
    public DashboardLiveResponse populateLiveMetrics(DashboardLiveResponse liveResponse, Integer sloLatencyMs) {
        Double actualRps = queryScalar(QUERY_ACTUAL_RPS);
        Double predictedRps = queryScalar(QUERY_PREDICTED_RPS);
        Double p95Latency = queryScalar(QUERY_P95_LATENCY);
        Double p99Latency = queryScalar(QUERY_P99_LATENCY);
        Double cpu = queryScalar(QUERY_CPU_PERCENT);
        if (cpu == null || cpu == 0.0) {
            cpu = queryScalar(QUERY_CPU_FALLBACK);
        }
        Double memoryBytes = queryScalar(QUERY_MEMORY_BYTES);

        liveResponse.setCurrentRequestRate(actualRps != null ? actualRps : 0.0);
        liveResponse.setPredictedRequestRate(predictedRps != null ? predictedRps : 0.0);
        liveResponse.setP95LatencyMs(p95Latency != null ? p95Latency : 0.0);
        liveResponse.setP99LatencyMs(p99Latency != null ? p99Latency : 0.0);
        liveResponse.setCpuUtilizationPercent(cpu != null ? Math.min(100.0, cpu) : 0.0);
        liveResponse.setMemoryBytes(memoryBytes != null ? memoryBytes.longValue() : 0L);

        if (sloLatencyMs != null && p95Latency != null && p95Latency > sloLatencyMs) {
            liveResponse.setSloViolations(liveResponse.getSloViolations() + 1);
        }

        return liveResponse;
    }

    /**
     * Queries Prometheus for time-series history covering the specified window.
     */
    public LiveMetricsHistoryResponse fetchHistory(Instant start, Instant end, String step) {
        LiveMetricsHistoryResponse history = new LiveMetricsHistoryResponse();
        history.setActualWorkloadSeries(queryRange(QUERY_ACTUAL_RPS, start, end, step));
        history.setPredictedWorkloadSeries(queryRange(QUERY_PREDICTED_RPS, start, end, step));
        history.setReplicaSeries(queryRange(QUERY_REPLICAS, start, end, step));
        
        List<TimeSeriesPoint> cpuPoints = queryRange(QUERY_CPU_PERCENT, start, end, step);
        if (cpuPoints.isEmpty() || cpuPoints.stream().allMatch(p -> p.getValue() == 0.0)) {
            cpuPoints = queryRange(QUERY_CPU_FALLBACK, start, end, step);
        }
        history.setCpuUtilizationSeries(cpuPoints);
        
        history.setMemoryUtilizationSeries(queryRange(QUERY_MEMORY_BYTES, start, end, step));
        history.setP95LatencySeries(queryRange(QUERY_P95_LATENCY, start, end, step));
        history.setP99LatencySeries(queryRange(QUERY_P99_LATENCY, start, end, step));
        return history;
    }

    /**
     * Calculates total requests observed across the experiment time window [start, end].
     */
    public long calculateTotalRequests(Instant start, Instant end, List<TimeSeriesPoint> actualRatePoints) {
        long durationSec = Math.max(1, end.getEpochSecond() - start.getEpochSecond());
        String query = String.format("sum(increase(http_server_requests_seconds_count{job=\"workload-service\", uri=\"/api/workload\"}[%ds]))", durationSec);
        Double totalInc = queryScalar(query);
        if (totalInc != null && totalInc > 0.0) {
            return Math.round(totalInc);
        }

        // Numerical integration fallback: sum(rate * dt)
        if (actualRatePoints != null && !actualRatePoints.isEmpty()) {
            double integrated = 0.0;
            for (int i = 0; i < actualRatePoints.size() - 1; i++) {
                TimeSeriesPoint p1 = actualRatePoints.get(i);
                TimeSeriesPoint p2 = actualRatePoints.get(i + 1);
                long dt = p2.getTimestamp().getEpochSecond() - p1.getTimestamp().getEpochSecond();
                if (dt > 0 && dt <= 30) {
                    integrated += ((p1.getValue() + p2.getValue()) / 2.0) * dt;
                }
            }
            if (integrated > 0.0) {
                return Math.round(integrated);
            }
        }
        return 0L;
    }

    /**
     * Calculates SLO violations and breach rate (> sloLatencyMs) over [start, end].
     */
    public SloEvaluationResult calculateSloViolations(Instant start, Instant end, double sloLatencyMs, long totalRequests) {
        if (totalRequests <= 0) {
            return new SloEvaluationResult(0L, 0.0);
        }
        long durationSec = Math.max(1, end.getEpochSecond() - start.getEpochSecond());
        // Standard Prometheus / Micrometer bucket for 200ms is le="0.2"
        String bucketLe = (sloLatencyMs <= 200) ? "0.2" : String.format("%.2f", sloLatencyMs / 1000.0);
        String query = String.format("sum(increase(http_server_requests_seconds_bucket{job=\"workload-service\", uri=\"/api/workload\", le=\"%s\"}[%ds]))", bucketLe, durationSec);
        
        Double underSloInc = queryScalar(query);
        if (underSloInc != null && underSloInc >= 0.0) {
            long underSlo = Math.round(underSloInc);
            long violations = Math.max(0L, totalRequests - underSlo);
            double rate = (double) violations / totalRequests;
            return new SloEvaluationResult(violations, Math.min(1.0, Math.max(0.0, rate)));
        }

        return new SloEvaluationResult(0L, 0.0);
    }

    public static class SloEvaluationResult {
        private final long violations;
        private final double violationRate;

        public SloEvaluationResult(long violations, double violationRate) {
            this.violations = violations;
            this.violationRate = violationRate;
        }

        public long getViolations() {
            return violations;
        }

        public double getViolationRate() {
            return violationRate;
        }
    }

    public Double calculateAverage(List<TimeSeriesPoint> points) {
        if (points == null || points.isEmpty()) return null;
        double sum = 0.0;
        for (TimeSeriesPoint p : points) {
            sum += p.getValue();
        }
        return sum / points.size();
    }

    public Double calculatePeak(List<TimeSeriesPoint> points) {
        if (points == null || points.isEmpty()) return null;
        double max = -Double.MAX_VALUE;
        for (TimeSeriesPoint p : points) {
            if (p.getValue() > max) max = p.getValue();
        }
        return max >= 0 ? max : null;
    }

    /**
     * Calculates out-of-sample MAE between actual workload series and forward predicted series.
     */
    public Double calculateMae(List<TimeSeriesPoint> actual, List<TimeSeriesPoint> predicted) {
        if (actual == null || predicted == null || actual.isEmpty() || predicted.isEmpty()) {
            return null;
        }
        double sumAbsErr = 0.0;
        int matched = 0;

        for (TimeSeriesPoint act : actual) {
            long actSec = act.getTimestamp().getEpochSecond();
            // Find closest matching prediction within 5 seconds
            TimeSeriesPoint closest = null;
            long minDiff = Long.MAX_VALUE;
            for (TimeSeriesPoint pred : predicted) {
                long diff = Math.abs(pred.getTimestamp().getEpochSecond() - actSec);
                if (diff < minDiff && diff <= 5) {
                    minDiff = diff;
                    closest = pred;
                }
            }
            if (closest != null) {
                sumAbsErr += Math.abs(act.getValue() - closest.getValue());
                matched++;
            }
        }

        return (matched > 0) ? (sumAbsErr / matched) : null;
    }

    /**
     * Calculates out-of-sample RMSE between actual workload series and forward predicted series.
     */
    public Double calculateRmse(List<TimeSeriesPoint> actual, List<TimeSeriesPoint> predicted) {
        if (actual == null || predicted == null || actual.isEmpty() || predicted.isEmpty()) {
            return null;
        }
        double sumSqErr = 0.0;
        int matched = 0;

        for (TimeSeriesPoint act : actual) {
            long actSec = act.getTimestamp().getEpochSecond();
            TimeSeriesPoint closest = null;
            long minDiff = Long.MAX_VALUE;
            for (TimeSeriesPoint pred : predicted) {
                long diff = Math.abs(pred.getTimestamp().getEpochSecond() - actSec);
                if (diff < minDiff && diff <= 5) {
                    minDiff = diff;
                    closest = pred;
                }
            }
            if (closest != null) {
                double diff = act.getValue() - closest.getValue();
                sumSqErr += (diff * diff);
                matched++;
            }
        }

        return (matched > 0) ? Math.sqrt(sumSqErr / matched) : null;
    }
}
