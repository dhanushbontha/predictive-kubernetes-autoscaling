package com.autoscaling.backend.model;

/**
 * State machine status for experiment execution lifecycle.
 */
public enum ExperimentStatus {
    IDLE,
    STARTING,
    RUNNING,
    COMPLETED,
    FAILED,
    STOPPED
}
