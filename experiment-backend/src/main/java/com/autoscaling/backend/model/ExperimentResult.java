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
}
