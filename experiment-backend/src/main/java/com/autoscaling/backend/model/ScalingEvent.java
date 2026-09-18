package com.autoscaling.backend.model;

import java.time.Instant;

/**
 * Individual pod scaling event capturing exact timestamps for provisioning delay calculation:
 * D_scale = t_ready - t_trigger
 */
public class ScalingEvent {

    private String podName;
    private Instant triggerTime;
    private Instant podCreationTime;
    private Instant podReadyTime;
    private Double scalingDelaySeconds;

    public ScalingEvent() {
    }

    public ScalingEvent(String podName, Instant triggerTime, Instant podCreationTime, Instant podReadyTime, Double scalingDelaySeconds) {
        this.podName = podName;
        this.triggerTime = triggerTime;
        this.podCreationTime = podCreationTime;
        this.podReadyTime = podReadyTime;
        this.scalingDelaySeconds = scalingDelaySeconds;
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
