package com.autoscaling.backend.model;

import java.time.Instant;

/**
 * High-resolution, discrete per-request observation captured directly from in-cluster k6 execution.
 */
public class K6RequestRecord {

    private Instant timestamp;
    private Double durationMs;
    private String status;
    private boolean isSuccess;
    private boolean isSloViolation;
    private String scenario;

    public K6RequestRecord() {
    }

    public K6RequestRecord(Instant timestamp, Double durationMs, String status, boolean isSuccess, boolean isSloViolation, String scenario) {
        this.timestamp = timestamp;
        this.durationMs = durationMs;
        this.status = status;
        this.isSuccess = isSuccess;
        this.isSloViolation = isSloViolation;
        this.scenario = scenario;
    }

    public Instant getTimestamp() {
        return timestamp;
    }

    public void setTimestamp(Instant timestamp) {
        this.timestamp = timestamp;
    }

    public Double getDurationMs() {
        return durationMs;
    }

    public void setDurationMs(Double durationMs) {
        this.durationMs = durationMs;
    }

    public String getStatus() {
        return status;
    }

    public void setStatus(String status) {
        this.status = status;
    }

    public boolean isSuccess() {
        return isSuccess;
    }

    public void setSuccess(boolean success) {
        isSuccess = success;
    }

    public boolean isSloViolation() {
        return isSloViolation;
    }

    public void setSloViolation(boolean sloViolation) {
        isSloViolation = sloViolation;
    }

    public String getScenario() {
        return scenario;
    }

    public void setScenario(String scenario) {
        this.scenario = scenario;
    }
}
