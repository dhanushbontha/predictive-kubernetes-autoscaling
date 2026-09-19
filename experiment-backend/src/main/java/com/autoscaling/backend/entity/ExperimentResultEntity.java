package com.autoscaling.backend.entity;

import jakarta.persistence.CascadeType;
import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.FetchType;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.JoinColumn;
import jakarta.persistence.OneToMany;
import jakarta.persistence.OneToOne;
import jakarta.persistence.Table;

import java.util.ArrayList;
import java.util.List;

/**
 * JPA entity storing aggregated benchmark measurements for an experiment.
 */
@Entity
@Table(name = "experiment_results")
public class ExperimentResultEntity {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @OneToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "experiment_id", nullable = false)
    private ExperimentEntity experiment;

    @Column(name = "mae")
    private Double mae;

    @Column(name = "rmse")
    private Double rmse;

    @Column(name = "p95_latency_ms")
    private Double p95LatencyMs;

    @Column(name = "p99_latency_ms")
    private Double p99LatencyMs;

    @Column(name = "total_requests")
    private Long totalRequests;

    @Column(name = "slo_violations")
    private Long sloViolations;

    @Column(name = "slo_violation_rate")
    private Double sloViolationRate;

    @Column(name = "avg_replicas")
    private Double avgReplicas;

    @Column(name = "peak_replicas")
    private Integer peakReplicas;

    @Column(name = "avg_cpu_percent")
    private Double avgCpuPercent;

    @Column(name = "peak_cpu_percent")
    private Double peakCpuPercent;

    @Column(name = "avg_memory_bytes")
    private Double avgMemoryBytes;

    @Column(name = "avg_scaling_delay_seconds")
    private Double avgScalingDelaySeconds;

    @OneToMany(cascade = CascadeType.ALL, orphanRemoval = true, fetch = FetchType.EAGER)
    @JoinColumn(name = "experiment_result_id")
    private List<ScalingEventEntity> scalingEvents = new ArrayList<>();

    public ExperimentResultEntity() {
    }

    public Long getId() {
        return id;
    }

    public void setId(Long id) {
        this.id = id;
    }

    public ExperimentEntity getExperiment() {
        return experiment;
    }

    public void setExperiment(ExperimentEntity experiment) {
        this.experiment = experiment;
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

    public List<ScalingEventEntity> getScalingEvents() {
        return scalingEvents;
    }

    public void setScalingEvents(List<ScalingEventEntity> scalingEvents) {
        this.scalingEvents = scalingEvents;
    }
}
