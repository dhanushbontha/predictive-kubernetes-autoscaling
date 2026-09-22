package com.autoscaling.backend.model;

import java.util.ArrayList;
import java.util.List;

/**
 * Aggregated measured benchmark observations from a completed experiment run.
 */
public class ExperimentResult {

    private Double mae;
    private Double rmse;
    private Double p95LatencyMs;
    private Double p99LatencyMs;
    private Long totalRequests;
    private Long sloViolations;
    private Double sloViolationRate;
    private Double avgReplicas;
    private Integer peakReplicas;
    private Double avgCpuPercent;
    private Double peakCpuPercent;
    private Double avgMemoryBytes;
    private Double avgScalingDelaySeconds;
    private List<ScalingEvent> scalingEvents = new ArrayList<>();

    // Request-level discrete provenance fields
    private Long k6TotalRequests;
    private Long k6SuccessfulRequests;
    private Long k6FailedRequests;
    private Long k6SloViolations;
    private Double k6SloViolationRate;
    private Double k6P95LatencyMs;
    private Double k6P99LatencyMs;

    // Prometheus Scrape Quality metadata
    private Integer prometheusScrapeSamples;
    private Integer prometheusScrapeGaps;

    public ExperimentResult() {
    }

    public Double getMae() {
        return mae;
    }

    public void setMae(Double mae) {
        this.mae = mae;
    }

    public Double getRmse() {
        return rmse;
    }

    public void setRmse(Double rmse) {
        this.rmse = rmse;
    }

    public Double getP95LatencyMs() {
        return p95LatencyMs;
    }

    public void setP95LatencyMs(Double p95LatencyMs) {
        this.p95LatencyMs = p95LatencyMs;
    }

    public Double getP99LatencyMs() {
        return p99LatencyMs;
    }

    public void setP99LatencyMs(Double p99LatencyMs) {
        this.p99LatencyMs = p99LatencyMs;
    }

    public Long getTotalRequests() {
        return totalRequests;
    }

    public void setTotalRequests(Long totalRequests) {
        this.totalRequests = totalRequests;
    }

    public Long getSloViolations() {
        return sloViolations;
    }

    public void setSloViolations(Long sloViolations) {
        this.sloViolations = sloViolations;
    }

    public Double getSloViolationRate() {
        return sloViolationRate;
    }

    public void setSloViolationRate(Double sloViolationRate) {
        this.sloViolationRate = sloViolationRate;
    }

    public Double getAvgReplicas() {
        return avgReplicas;
    }

    public void setAvgReplicas(Double avgReplicas) {
        this.avgReplicas = avgReplicas;
    }

    public Integer getPeakReplicas() {
        return peakReplicas;
    }

    public void setPeakReplicas(Integer peakReplicas) {
        this.peakReplicas = peakReplicas;
    }

    public Double getAvgCpuPercent() {
        return avgCpuPercent;
    }

    public void setAvgCpuPercent(Double avgCpuPercent) {
        this.avgCpuPercent = avgCpuPercent;
    }

    public Double getPeakCpuPercent() {
        return peakCpuPercent;
    }

    public void setPeakCpuPercent(Double peakCpuPercent) {
        this.peakCpuPercent = peakCpuPercent;
    }

    public Double getAvgMemoryBytes() {
        return avgMemoryBytes;
    }

    public void setAvgMemoryBytes(Double avgMemoryBytes) {
        this.avgMemoryBytes = avgMemoryBytes;
    }

    public Double getAvgScalingDelaySeconds() {
        return avgScalingDelaySeconds;
    }

    public void setAvgScalingDelaySeconds(Double avgScalingDelaySeconds) {
        this.avgScalingDelaySeconds = avgScalingDelaySeconds;
    }

    public List<ScalingEvent> getScalingEvents() {
        return scalingEvents;
    }

    public void setScalingEvents(List<ScalingEvent> scalingEvents) {
        this.scalingEvents = scalingEvents;
    }

    public Long getK6TotalRequests() {
        return k6TotalRequests;
    }

    public void setK6TotalRequests(Long k6TotalRequests) {
        this.k6TotalRequests = k6TotalRequests;
    }

    public Long getK6SuccessfulRequests() {
        return k6SuccessfulRequests;
    }

    public void setK6SuccessfulRequests(Long k6SuccessfulRequests) {
        this.k6SuccessfulRequests = k6SuccessfulRequests;
    }

    public Long getK6FailedRequests() {
        return k6FailedRequests;
    }

    public void setK6FailedRequests(Long k6FailedRequests) {
        this.k6FailedRequests = k6FailedRequests;
    }

    public Long getK6SloViolations() {
        return k6SloViolations;
    }

    public void setK6SloViolations(Long k6SloViolations) {
        this.k6SloViolations = k6SloViolations;
    }

    public Double getK6SloViolationRate() {
        return k6SloViolationRate;
    }

    public void setK6SloViolationRate(Double k6SloViolationRate) {
        this.k6SloViolationRate = k6SloViolationRate;
    }

    public Double getK6P95LatencyMs() {
        return k6P95LatencyMs;
    }

    public void setK6P95LatencyMs(Double k6P95LatencyMs) {
        this.k6P95LatencyMs = k6P95LatencyMs;
    }

    public Double getK6P99LatencyMs() {
        return k6P99LatencyMs;
    }

    public void setK6P99LatencyMs(Double k6P99LatencyMs) {
        this.k6P99LatencyMs = k6P99LatencyMs;
    }

    public Integer getPrometheusScrapeSamples() {
        return prometheusScrapeSamples;
    }

    public void setPrometheusScrapeSamples(Integer prometheusScrapeSamples) {
        this.prometheusScrapeSamples = prometheusScrapeSamples;
    }

    public Integer getPrometheusScrapeGaps() {
        return prometheusScrapeGaps;
    }

    public void setPrometheusScrapeGaps(Integer prometheusScrapeGaps) {
        this.prometheusScrapeGaps = prometheusScrapeGaps;
    }
}
