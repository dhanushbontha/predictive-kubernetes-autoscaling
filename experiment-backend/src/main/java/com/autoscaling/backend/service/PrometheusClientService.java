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
        history.setCpuUtilizationSeries(queryRange(QUERY_CPU_PERCENT, start, end, step));
        history.setMemoryUtilizationSeries(queryRange(QUERY_MEMORY_BYTES, start, end, step));
        history.setP95LatencySeries(queryRange(QUERY_P95_LATENCY, start, end, step));
        history.setP99LatencySeries(queryRange(QUERY_P99_LATENCY, start, end, step));
        return history;
    }
}
