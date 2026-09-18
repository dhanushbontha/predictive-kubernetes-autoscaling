package com.autoscaling.backend.dto;

import java.time.Instant;

/**
 * Single data point in a time-series line chart.
 */
public class TimeSeriesPoint {

    private Instant timestamp;
    private Double value;

    public TimeSeriesPoint() {
    }

    public TimeSeriesPoint(Instant timestamp, Double value) {
        this.timestamp = timestamp;
        this.value = value;
    }

    public Instant getTimestamp() {
        return timestamp;
    }

    public void setTimestamp(Instant timestamp) {
        this.timestamp = timestamp;
    }

    public Double getValue() {
        return value;
    }

    public void setValue(Double value) {
        this.value = value;
    }
}
