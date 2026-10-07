package com.autoscaling.backend.entity;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.Table;

import java.time.Instant;

/**
 * JPA entity representing a pod provisioning scaling event observation:
 * 1. D_E2E = t_ready - t_0
 * 2. D_provision = t_ready - t_creation
 * 3. D_detect+sched = t_creation - t_0
 */
@Entity
@Table(name = "scaling_events")
public class ScalingEventEntity {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "pod_name")
    private String podName;

    @Column(name = "trigger_time")
    private Instant triggerTime;

    @Column(name = "pod_creation_time")
    private Instant podCreationTime;

    @Column(name = "pod_ready_time")
    private Instant podReadyTime;

    @Column(name = "scaling_delay_seconds")
    private Double scalingDelaySeconds;

    @Column(name = "provisioning_delay_seconds")
    private Double provisioningDelaySeconds;

    @Column(name = "detection_scheduling_delay_seconds")
    private Double detectionSchedulingDelaySeconds;

    public ScalingEventEntity() {
    }

    public ScalingEventEntity(String podName, Instant triggerTime, Instant podCreationTime, Instant podReadyTime, Double scalingDelaySeconds) {
        this.podName = podName;
        this.triggerTime = triggerTime;
        this.podCreationTime = podCreationTime;
        this.podReadyTime = podReadyTime;
        this.scalingDelaySeconds = scalingDelaySeconds;
        if (podReadyTime != null && podCreationTime != null && podReadyTime.isAfter(podCreationTime)) {
            this.provisioningDelaySeconds = Math.max(0.0, java.time.Duration.between(podCreationTime, podReadyTime).toMillis() / 1000.0);
        }
        if (podCreationTime != null && triggerTime != null) {
            this.detectionSchedulingDelaySeconds = Math.max(0.0, java.time.Duration.between(triggerTime, podCreationTime).toMillis() / 1000.0);
        }
    }

    public ScalingEventEntity(String podName, Instant triggerTime, Instant podCreationTime, Instant podReadyTime,
                              Double scalingDelaySeconds, Double provisioningDelaySeconds, Double detectionSchedulingDelaySeconds) {
        this.podName = podName;
        this.triggerTime = triggerTime;
        this.podCreationTime = podCreationTime;
        this.podReadyTime = podReadyTime;
        this.scalingDelaySeconds = scalingDelaySeconds;
        this.provisioningDelaySeconds = provisioningDelaySeconds;
        this.detectionSchedulingDelaySeconds = detectionSchedulingDelaySeconds;
    }

    public Long getId() {
        return id;
    }

    public void setId(Long id) {
        this.id = id;
    }

    public String getPodName() {
        return podName;
    }

    public void setPodName(String podName) {
        this.podName = podName;
    }

    public Instant getTriggerTime() {
        return triggerTime;
    }

    public void setTriggerTime(Instant triggerTime) {
        this.triggerTime = triggerTime;
    }

    public Instant getPodCreationTime() {
        return podCreationTime;
    }

    public void setPodCreationTime(Instant podCreationTime) {
        this.podCreationTime = podCreationTime;
    }

    public Instant getPodReadyTime() {
        return podReadyTime;
    }

    public void setPodReadyTime(Instant podReadyTime) {
        this.podReadyTime = podReadyTime;
    }

    public Double getScalingDelaySeconds() {
        return scalingDelaySeconds;
    }

    public void setScalingDelaySeconds(Double scalingDelaySeconds) {
        this.scalingDelaySeconds = scalingDelaySeconds;
    }

    public Double getProvisioningDelaySeconds() {
        return provisioningDelaySeconds;
    }

    public void setProvisioningDelaySeconds(Double provisioningDelaySeconds) {
        this.provisioningDelaySeconds = provisioningDelaySeconds;
    }

    public Double getDetectionSchedulingDelaySeconds() {
        return detectionSchedulingDelaySeconds;
    }

    public void setDetectionSchedulingDelaySeconds(Double detectionSchedulingDelaySeconds) {
        this.detectionSchedulingDelaySeconds = detectionSchedulingDelaySeconds;
    }
}
