package com.autoscaling.backend.entity;

import com.autoscaling.backend.model.AutoscalingMode;
import com.autoscaling.backend.model.Experiment;
import com.autoscaling.backend.model.ExperimentResult;
import com.autoscaling.backend.model.ExperimentStatus;
import com.autoscaling.backend.model.ScalingEvent;
import com.autoscaling.backend.model.WorkloadScenario;
import jakarta.persistence.CascadeType;
import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.EnumType;
import jakarta.persistence.Enumerated;
import jakarta.persistence.FetchType;
import jakarta.persistence.Id;
import jakarta.persistence.OneToOne;
import jakarta.persistence.Table;

import java.time.Instant;
import java.util.ArrayList;
import java.util.List;

/**
 * JPA entity representing experiment metadata, execution parameters, and status.
 */
@Entity
@Table(name = "experiments")
public class ExperimentEntity {

    @Id
    @Column(name = "id", length = 32, nullable = false, updatable = false)
    private String id;

    @Column(name = "name", nullable = false)
    private String name;

    @Enumerated(EnumType.STRING)
    @Column(name = "scenario", nullable = false)
    private WorkloadScenario scenario;

    @Enumerated(EnumType.STRING)
    @Column(name = "autoscaling_mode", nullable = false)
    private AutoscalingMode autoscalingMode;

    @Column(name = "target_rps", nullable = false)
    private Integer targetRps;

    @Column(name = "duration_seconds", nullable = false)
    private Integer durationSeconds;

    @Column(name = "slo_latency_ms", nullable = false)
    private Integer sloLatencyMs;

    @Column(name = "forecast_horizon_seconds")
    private Integer forecastHorizonSeconds;

    @Column(name = "start_time")
    private Instant startTime;

    @Column(name = "end_time")
    private Instant endTime;

    @Enumerated(EnumType.STRING)
    @Column(name = "status", nullable = false)
    private ExperimentStatus status;

    @Column(name = "error_message", length = 2048)
    private String errorMessage;

    @OneToOne(mappedBy = "experiment", cascade = CascadeType.ALL, orphanRemoval = true, fetch = FetchType.EAGER)
    private ExperimentResultEntity result;

    public ExperimentEntity() {
    }

    public static ExperimentEntity fromDomain(Experiment exp) {
        if (exp == null) return null;
        ExperimentEntity entity = new ExperimentEntity();
        entity.setId(exp.getId());
        entity.setName(exp.getName());
        entity.setScenario(exp.getScenario());
        entity.setAutoscalingMode(exp.getAutoscalingMode());
        entity.setTargetRps(exp.getTargetRps());
        entity.setDurationSeconds(exp.getDurationSeconds());
        entity.setSloLatencyMs(exp.getSloLatencyMs());
        entity.setForecastHorizonSeconds(exp.getForecastHorizonSeconds());
        entity.setStartTime(exp.getStartTime());
        entity.setEndTime(exp.getEndTime());
        entity.setStatus(exp.getStatus());
        entity.setErrorMessage(exp.getErrorMessage());

        if (exp.getResult() != null) {
            ExperimentResult res = exp.getResult();
            ExperimentResultEntity resEntity = new ExperimentResultEntity();
            resEntity.setExperiment(entity);
            resEntity.setMae(res.getMae());
            resEntity.setRmse(res.getRmse());
            resEntity.setP95LatencyMs(res.getP95LatencyMs());
            resEntity.setP99LatencyMs(res.getP99LatencyMs());
            resEntity.setTotalRequests(res.getTotalRequests());
            resEntity.setSloViolations(res.getSloViolations());
            resEntity.setSloViolationRate(res.getSloViolationRate());
            resEntity.setAvgReplicas(res.getAvgReplicas());
            resEntity.setPeakReplicas(res.getPeakReplicas());
            resEntity.setAvgCpuPercent(res.getAvgCpuPercent());
            resEntity.setPeakCpuPercent(res.getPeakCpuPercent());
            resEntity.setAvgMemoryBytes(res.getAvgMemoryBytes());
            resEntity.setAvgScalingDelaySeconds(res.getAvgScalingDelaySeconds());

            if (res.getScalingEvents() != null) {
                List<ScalingEventEntity> eventEntities = new ArrayList<>();
                for (ScalingEvent se : res.getScalingEvents()) {
                    eventEntities.add(new ScalingEventEntity(
                            se.getPodName(), se.getTriggerTime(), se.getPodCreationTime(), se.getPodReadyTime(), se.getScalingDelaySeconds()
                    ));
                }
                resEntity.setScalingEvents(eventEntities);
            }
            entity.setResult(resEntity);
        }
        return entity;
    }

    public Experiment toDomain() {
        Experiment exp = new Experiment();
        exp.setId(this.id);
        exp.setName(this.name);
        exp.setScenario(this.scenario);
        exp.setAutoscalingMode(this.autoscalingMode);
        exp.setTargetRps(this.targetRps);
        exp.setDurationSeconds(this.durationSeconds);
        exp.setSloLatencyMs(this.sloLatencyMs);
        exp.setForecastHorizonSeconds(this.forecastHorizonSeconds);
        exp.setStartTime(this.startTime);
        exp.setEndTime(this.endTime);
        exp.setStatus(this.status);
        exp.setErrorMessage(this.errorMessage);

        if (this.result != null) {
            ExperimentResult res = new ExperimentResult();
            res.setMae(this.result.getMae());
            res.setRmse(this.result.getRmse());
            res.setP95LatencyMs(this.result.getP95LatencyMs());
            res.setP99LatencyMs(this.result.getP99LatencyMs());
            res.setTotalRequests(this.result.getTotalRequests());
            res.setSloViolations(this.result.getSloViolations());
            res.setSloViolationRate(this.result.getSloViolationRate());
            res.setAvgReplicas(this.result.getAvgReplicas());
            res.setPeakReplicas(this.result.getPeakReplicas());
            res.setAvgCpuPercent(this.result.getAvgCpuPercent());
            res.setPeakCpuPercent(this.result.getPeakCpuPercent());
            res.setAvgMemoryBytes(this.result.getAvgMemoryBytes());
            res.setAvgScalingDelaySeconds(this.result.getAvgScalingDelaySeconds());

            if (this.result.getScalingEvents() != null) {
                List<ScalingEvent> events = new ArrayList<>();
                for (ScalingEventEntity see : this.result.getScalingEvents()) {
                    events.add(new ScalingEvent(
                            see.getPodName(), see.getTriggerTime(), see.getPodCreationTime(), see.getPodReadyTime(), see.getScalingDelaySeconds()
                    ));
                }
                res.setScalingEvents(events);
            }
            exp.setResult(res);
        }
        return exp;
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

    public ExperimentResultEntity getResult() {
        return result;
    }

    public void setResult(ExperimentResultEntity result) {
        this.result = result;
    }
}
