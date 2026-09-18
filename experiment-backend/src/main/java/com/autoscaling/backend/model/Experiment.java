package com.autoscaling.backend.model;

import java.time.Instant;

/**
 * Domain entity representing an experiment execution.
 */
public class Experiment {

    private String id;
    private String name;
    private WorkloadScenario scenario;
    private AutoscalingMode autoscalingMode;
    private Integer targetRps;
    private Integer durationSeconds;
    private Integer sloLatencyMs;
    private Integer forecastHorizonSeconds;
    private Instant startTime;
    private Instant endTime;
    private ExperimentStatus status = ExperimentStatus.IDLE;
    private String errorMessage;
    private ExperimentResult result;

    public Experiment() {
    }

    public String getId() {
        return id;
    }

    public void setId(String id) {
        this.id = id;
    }

    public String getName() {
        return name;
    }

    public void setName(String name) {
        this.name = name;
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

    public Integer getTargetRps() {
        return targetRps;
    }

    public void setTargetRps(Integer targetRps) {
        this.targetRps = targetRps;
    }

    public Integer getDurationSeconds() {
        return durationSeconds;
    }

    public void setDurationSeconds(Integer durationSeconds) {
        this.durationSeconds = durationSeconds;
    }

    public Integer getSloLatencyMs() {
        return sloLatencyMs;
    }

    public void setSloLatencyMs(Integer sloLatencyMs) {
        this.sloLatencyMs = sloLatencyMs;
    }

    public Integer getForecastHorizonSeconds() {
        return forecastHorizonSeconds;
    }

    public void setForecastHorizonSeconds(Integer forecastHorizonSeconds) {
        this.forecastHorizonSeconds = forecastHorizonSeconds;
    }

    public Instant getStartTime() {
        return startTime;
    }

    public void setStartTime(Instant startTime) {
        this.startTime = startTime;
    }

    public Instant getEndTime() {
        return endTime;
    }

    public void setEndTime(Instant endTime) {
        this.endTime = endTime;
    }

    public ExperimentStatus getStatus() {
        return status;
    }

    public void setStatus(ExperimentStatus status) {
        this.status = status;
    }

    public String getErrorMessage() {
        return errorMessage;
    }

    public void setErrorMessage(String errorMessage) {
        this.errorMessage = errorMessage;
    }

    public ExperimentResult getResult() {
        return result;
    }

    public void setResult(ExperimentResult result) {
        this.result = result;
    }
}
