package com.autoscaling.backend.entity;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.Table;

import java.time.Instant;

/**
 * JPA entity representing a pod provisioning scaling event observation.
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

    public ScalingEventEntity() {
    }

    public ScalingEventEntity(String podName, Instant triggerTime, Instant podCreationTime, Instant podReadyTime, Double scalingDelaySeconds) {
        this.podName = podName;
        this.triggerTime = triggerTime;
        this.podCreationTime = podCreationTime;
        this.podReadyTime = podReadyTime;
        this.scalingDelaySeconds = scalingDelaySeconds;
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
}
