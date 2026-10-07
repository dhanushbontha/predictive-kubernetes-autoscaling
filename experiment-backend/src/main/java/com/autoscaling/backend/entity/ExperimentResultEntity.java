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

    @Column(name = "avg_provisioning_delay_seconds")
    private Double avgProvisioningDelaySeconds;

    @Column(name = "avg_detection_scheduling_delay_seconds")
    private Double avgDetectionSchedulingDelaySeconds;

    @Column(name = "k6_total_requests")
    private Long k6TotalRequests;

    @Column(name = "k6_successful_requests")
    private Long k6SuccessfulRequests;

    @Column(name = "k6_failed_requests")
    private Long k6FailedRequests;

    @Column(name = "k6_slo_violations")
    private Long k6SloViolations;

    @Column(name = "k6_slo_violation_rate")
    private Double k6SloViolationRate;

    @Column(name = "k6_p95_latency_ms")
    private Double k6P95LatencyMs;

    @Column(name = "k6_p99_latency_ms")
    private Double k6P99LatencyMs;

    @Column(name = "prometheus_scrape_samples")
    private Integer prometheusScrapeSamples;

    @Column(name = "prometheus_scrape_gaps")
    private Integer prometheusScrapeGaps;

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

    public Double getAvgProvisioningDelaySeconds() {
        return avgProvisioningDelaySeconds;
    }

    public void setAvgProvisioningDelaySeconds(Double avgProvisioningDelaySeconds) {
        this.avgProvisioningDelaySeconds = avgProvisioningDelaySeconds;
    }

    public Double getAvgDetectionSchedulingDelaySeconds() {
        return avgDetectionSchedulingDelaySeconds;
    }

    public void setAvgDetectionSchedulingDelaySeconds(Double avgDetectionSchedulingDelaySeconds) {
        this.avgDetectionSchedulingDelaySeconds = avgDetectionSchedulingDelaySeconds;
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

    public List<ScalingEventEntity> getScalingEvents() {
        return scalingEvents;
    }

    public void setScalingEvents(List<ScalingEventEntity> scalingEvents) {
        this.scalingEvents = scalingEvents;
    }
}
