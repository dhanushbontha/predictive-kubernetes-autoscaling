package com.autoscaling.backend.model;

import java.time.Instant;

/**
 * Individual pod scaling event capturing exact timestamps for three timing metrics:
 * 1. D_E2E = t_ready - t_0 (End-to-End Autoscaling Response Lag)
 * 2. D_provision = t_ready - t_creation (Pod Provisioning Delay)
 * 3. D_detect+sched = t_creation - t_0 (Detection and Scaling/Scheduling Delay)
 */
public class ScalingEvent {

    private String podName;
    private Instant triggerTime;              // t_0: Experiment start timestamp
    private Instant podCreationTime;          // t_creation: Kubernetes pod creation timestamp
    private Instant podReadyTime;             // t_ready: Kubernetes pod Ready transition timestamp
    private Double scalingDelaySeconds;       // D_E2E = t_ready - t_0 (null if not Ready)
    private Double provisioningDelaySeconds;  // D_provision = t_ready - t_creation (null if not Ready)
    private Double detectionSchedulingDelaySeconds; // D_detect+sched = t_creation - t_0

    public ScalingEvent() {
    }

    public ScalingEvent(String podName, Instant triggerTime, Instant podCreationTime, Instant podReadyTime, Double scalingDelaySeconds) {
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

    public ScalingEvent(String podName, Instant triggerTime, Instant podCreationTime, Instant podReadyTime,
                        Double scalingDelaySeconds, Double provisioningDelaySeconds, Double detectionSchedulingDelaySeconds) {
        this.podName = podName;
        this.triggerTime = triggerTime;
        this.podCreationTime = podCreationTime;
        this.podReadyTime = podReadyTime;
        this.scalingDelaySeconds = scalingDelaySeconds;
        this.provisioningDelaySeconds = provisioningDelaySeconds;
        this.detectionSchedulingDelaySeconds = detectionSchedulingDelaySeconds;
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
