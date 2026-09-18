package com.autoscaling.backend.dto;

import com.autoscaling.backend.model.AutoscalingMode;
import com.autoscaling.backend.model.Experiment;
import com.autoscaling.backend.model.ExperimentResult;
import com.autoscaling.backend.model.ExperimentStatus;
import com.autoscaling.backend.model.WorkloadScenario;

import java.time.Instant;

/**
 * DTO for experiment details and summaries.
 */
public class ExperimentResponse {

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
    private ExperimentStatus status;
    private String errorMessage;
    private ExperimentResult result;

    public static ExperimentResponse fromDomain(Experiment exp) {
        if (exp == null) return null;
        ExperimentResponse resp = new ExperimentResponse();
        resp.setId(exp.getId());
        resp.setName(exp.getName());
        resp.setScenario(exp.getScenario());
        resp.setAutoscalingMode(exp.getAutoscalingMode());
        resp.setTargetRps(exp.getTargetRps());
        resp.setDurationSeconds(exp.getDurationSeconds());
        resp.setSloLatencyMs(exp.getSloLatencyMs());
        resp.setForecastHorizonSeconds(exp.getForecastHorizonSeconds());
        resp.setStartTime(exp.getStartTime());
        resp.setEndTime(exp.getEndTime());
        resp.setStatus(exp.getStatus());
        resp.setErrorMessage(exp.getErrorMessage());
        resp.setResult(exp.getResult());
        return resp;
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
