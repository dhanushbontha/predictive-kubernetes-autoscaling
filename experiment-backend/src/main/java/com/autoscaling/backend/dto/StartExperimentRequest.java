package com.autoscaling.backend.dto;

import com.autoscaling.backend.model.AutoscalingMode;
import com.autoscaling.backend.model.WorkloadScenario;
import jakarta.validation.constraints.Max;
import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotNull;

/**
 * Request payload to initialize and launch an experiment run.
 */
public class StartExperimentRequest {

    private String name;

    @NotNull(message = "Workload scenario is required")
    private WorkloadScenario scenario;

    @NotNull(message = "Autoscaling mode is required")
    private AutoscalingMode autoscalingMode;

    @NotNull(message = "Target RPS is required")
    @Min(value = 1, message = "Target RPS must be at least 1")
    @Max(value = 500, message = "Target RPS cannot exceed 500")
    private Integer targetRps = 30;

    @NotNull(message = "Duration is required")
    @Min(value = 30, message = "Duration must be at least 30 seconds")
    @Max(value = 3600, message = "Duration cannot exceed 3600 seconds")
    private Integer durationSeconds = 300;

    @NotNull(message = "SLO latency is required")
    @Min(value = 10, message = "SLO latency must be at least 10ms")
    private Integer sloLatencyMs = 200;

    /**
     * Required when autoscalingMode == PREDICTIVE_PROPHET_KEDA.
     */
    @Min(value = 10, message = "Forecast horizon must be at least 10s")
    private Integer forecastHorizonSeconds = 60;

    public StartExperimentRequest() {
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
}
