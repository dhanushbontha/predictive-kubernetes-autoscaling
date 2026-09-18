package com.autoscaling.backend.dto;

import com.autoscaling.backend.model.AutoscalingMode;
import com.autoscaling.backend.model.ExperimentStatus;
import com.autoscaling.backend.model.WorkloadScenario;

import java.time.Instant;

/**
 * Live telemetry DTO streamed/polled by the React dashboard during an active benchmark.
 */
public class DashboardLiveResponse {

    private String activeExperimentId;
    private ExperimentStatus status = ExperimentStatus.IDLE;
    private WorkloadScenario scenario;
    private AutoscalingMode autoscalingMode;
    private Instant timestamp;
    private Double currentRequestRate = 0.0;
    private Double predictedRequestRate = 0.0;
    private Integer currentReplicas = 1;
    private Integer desiredReplicas = 1;
    private Double cpuUtilizationPercent = 0.0;
    private Double memoryUtilizationPercent = 0.0;
    private Long memoryBytes = 0L;
    private Double p95LatencyMs = 0.0;
    private Double p99LatencyMs = 0.0;
    private Long totalRequests = 0L;
    private Long sloViolations = 0L;
    private Double avgScalingDelaySeconds = 0.0;

    public DashboardLiveResponse() {
        this.timestamp = Instant.now();
    }

    public String getActiveExperimentId() {
        return activeExperimentId;
    }

    public void setActiveExperimentId(String activeExperimentId) {
        this.activeExperimentId = activeExperimentId;
    }

    public ExperimentStatus getStatus() {
        return status;
    }

    public void setStatus(ExperimentStatus status) {
        this.status = status;
    }

    public WorkloadScenario getScenario() {
        return scenario;
    }

    public void setScenario(WorkloadScenario scenario) {
        this.scenario = scenario;
    }

    public AutoscalingMode getAutoscalingMode() {
        return autoscalingMode;
    }

    public void setAutoscalingMode(AutoscalingMode autoscalingMode) {
        this.autoscalingMode = autoscalingMode;
    }

    public Instant getTimestamp() {
        return timestamp;
    }

    public void setTimestamp(Instant timestamp) {
        this.timestamp = timestamp;
    }

    public Double getCurrentRequestRate() {
        return currentRequestRate;
    }

    public void setCurrentRequestRate(Double currentRequestRate) {
        this.currentRequestRate = currentRequestRate;
    }

    public Double getPredictedRequestRate() {
        return predictedRequestRate;
    }

    public void setPredictedRequestRate(Double predictedRequestRate) {
        this.predictedRequestRate = predictedRequestRate;
    }

    public Integer getCurrentReplicas() {
        return currentReplicas;
    }

    public void setCurrentReplicas(Integer currentReplicas) {
        this.currentReplicas = currentReplicas;
    }

    public Integer getDesiredReplicas() {
        return desiredReplicas;
    }

    public void setDesiredReplicas(Integer desiredReplicas) {
        this.desiredReplicas = desiredReplicas;
    }

    public Double getCpuUtilizationPercent() {
        return cpuUtilizationPercent;
    }

    public void setCpuUtilizationPercent(Double cpuUtilizationPercent) {
        this.cpuUtilizationPercent = cpuUtilizationPercent;
    }

    public Double getMemoryUtilizationPercent() {
        return memoryUtilizationPercent;
    }

    public void setMemoryUtilizationPercent(Double memoryUtilizationPercent) {
        this.memoryUtilizationPercent = memoryUtilizationPercent;
    }

    public Long getMemoryBytes() {
        return memoryBytes;
    }

    public void setMemoryBytes(Long memoryBytes) {
        this.memoryBytes = memoryBytes;
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

    public Double getAvgScalingDelaySeconds() {
        return avgScalingDelaySeconds;
    }

    public void setAvgScalingDelaySeconds(Double avgScalingDelaySeconds) {
        this.avgScalingDelaySeconds = avgScalingDelaySeconds;
    }
}
