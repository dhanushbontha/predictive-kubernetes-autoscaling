package com.autoscaling.backend.model;

/**
 * Supported synthetic workload traffic patterns.
 */
public enum WorkloadScenario {
    STABLE("stable.js"),
    PERIODIC("periodic.js"),
    GRADUAL("gradual.js"),
    BURSTY("bursty.js"),
    NOISY("noisy.js");

    private final String scriptFileName;

    WorkloadScenario(String scriptFileName) {
        this.scriptFileName = scriptFileName;
    }

    public String getScriptFileName() {
        return scriptFileName;
    }
}
