package com.autoscaling.backend.model;

/**
 * Supported autoscaling strategies for comparative evaluation.
 */
public enum AutoscalingMode {
    REACTIVE_HPA,
    PREDICTIVE_PROPHET_KEDA
}
