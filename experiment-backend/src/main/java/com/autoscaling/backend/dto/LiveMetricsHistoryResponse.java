package com.autoscaling.backend.dto;

import java.util.ArrayList;
import java.util.List;

/**
 * Time-series telemetry payload powering the 5 dashboard real-time charts:
 * 1. Actual workload vs predicted workload
 * 2. Replica count over time
 * 3. P95 / P99 latency over time
 * 4. CPU utilization over time
 * 5. Memory utilization over time
 */
public class LiveMetricsHistoryResponse {

    private List<TimeSeriesPoint> actualWorkloadSeries = new ArrayList<>();
    private List<TimeSeriesPoint> predictedWorkloadSeries = new ArrayList<>();
    private List<TimeSeriesPoint> replicaSeries = new ArrayList<>();
    private List<TimeSeriesPoint> cpuUtilizationSeries = new ArrayList<>();
    private List<TimeSeriesPoint> memoryUtilizationSeries = new ArrayList<>();
    private List<TimeSeriesPoint> p95LatencySeries = new ArrayList<>();
    private List<TimeSeriesPoint> p99LatencySeries = new ArrayList<>();

    public LiveMetricsHistoryResponse() {
    }

    public List<TimeSeriesPoint> getActualWorkloadSeries() {
        return actualWorkloadSeries;
    }

    public void setActualWorkloadSeries(List<TimeSeriesPoint> actualWorkloadSeries) {
        this.actualWorkloadSeries = actualWorkloadSeries;
    }

    public List<TimeSeriesPoint> getPredictedWorkloadSeries() {
        return predictedWorkloadSeries;
    }

    public void setPredictedWorkloadSeries(List<TimeSeriesPoint> predictedWorkloadSeries) {
        this.predictedWorkloadSeries = predictedWorkloadSeries;
    }

    public List<TimeSeriesPoint> getReplicaSeries() {
        return replicaSeries;
    }

    public void setReplicaSeries(List<TimeSeriesPoint> replicaSeries) {
        this.replicaSeries = replicaSeries;
    }

    public List<TimeSeriesPoint> getCpuUtilizationSeries() {
        return cpuUtilizationSeries;
    }

    public void setCpuUtilizationSeries(List<TimeSeriesPoint> cpuUtilizationSeries) {
        this.cpuUtilizationSeries = cpuUtilizationSeries;
    }

    public List<TimeSeriesPoint> getMemoryUtilizationSeries() {
        return memoryUtilizationSeries;
    }

    public void setMemoryUtilizationSeries(List<TimeSeriesPoint> memoryUtilizationSeries) {
        this.memoryUtilizationSeries = memoryUtilizationSeries;
    }

    public List<TimeSeriesPoint> getP95LatencySeries() {
        return p95LatencySeries;
    }

    public void setP95LatencySeries(List<TimeSeriesPoint> p95LatencySeries) {
        this.p95LatencySeries = p95LatencySeries;
    }

    public List<TimeSeriesPoint> getP99LatencySeries() {
        return p99LatencySeries;
    }

    public void setP99LatencySeries(List<TimeSeriesPoint> p99LatencySeries) {
        this.p99LatencySeries = p99LatencySeries;
    }
}
