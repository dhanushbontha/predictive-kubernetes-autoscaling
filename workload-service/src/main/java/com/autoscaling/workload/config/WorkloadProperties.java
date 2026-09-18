package com.autoscaling.workload.config;

import org.springframework.boot.context.properties.ConfigurationProperties;

/**
 * Configuration properties for controlled workload execution.
 */
@ConfigurationProperties(prefix = "workload")
public class WorkloadProperties {

    /**
     * Default number of iterations for the deterministic CPU loop (10,000,000).
     */
    private int defaultIterations = 10_000_000;

    public int getDefaultIterations() {
        return defaultIterations;
    }

    public void setDefaultIterations(int defaultIterations) {
        this.defaultIterations = defaultIterations;
    }
}
