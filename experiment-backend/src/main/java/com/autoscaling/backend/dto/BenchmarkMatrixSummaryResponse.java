package com.autoscaling.backend.dto;

import java.time.Instant;
import java.util.List;

/**
 * Aggregated summary response representing the complete 10-run benchmark matrix
 * across all 5 synthetic workload scenarios and both autoscaling modes.
 */
public class BenchmarkMatrixSummaryResponse {

    private Instant generatedAt;
    private int totalScenarios;
    private int totalRuns;
    private double overallAverageP95ReductionPercent;
    private double overallAverageSloReductionPercent;
    private double overallAverageScalingLeadTimeGainSeconds;
    private String benchmarkConclusion;
    private List<ComparisonResponse> scenarioComparisons;
    private List<ExperimentResponse> allRuns;

    public BenchmarkMatrixSummaryResponse() {
    }

    public BenchmarkMatrixSummaryResponse(
            Instant generatedAt,
            int totalScenarios,
            int totalRuns,
            double overallAverageP95ReductionPercent,
            double overallAverageSloReductionPercent,
            double overallAverageScalingLeadTimeGainSeconds,
            String benchmarkConclusion,
            List<ComparisonResponse> scenarioComparisons,
            List<ExperimentResponse> allRuns) {
        this.generatedAt = generatedAt;
        this.totalScenarios = totalScenarios;
        this.totalRuns = totalRuns;
        this.overallAverageP95ReductionPercent = overallAverageP95ReductionPercent;
        this.overallAverageSloReductionPercent = overallAverageSloReductionPercent;
        this.overallAverageScalingLeadTimeGainSeconds = overallAverageScalingLeadTimeGainSeconds;
        this.benchmarkConclusion = benchmarkConclusion;
        this.scenarioComparisons = scenarioComparisons;
        this.allRuns = allRuns;
    }

    public Instant getGeneratedAt() {
        return generatedAt;
    }

    public void setGeneratedAt(Instant generatedAt) {
        this.generatedAt = generatedAt;
    }

    public int getTotalScenarios() {
        return totalScenarios;
    }

    public void setTotalScenarios(int totalScenarios) {
        this.totalScenarios = totalScenarios;
    }

    public int getTotalRuns() {
        return totalRuns;
    }

    public void setTotalRuns(int totalRuns) {
        this.totalRuns = totalRuns;
    }

    public double getOverallAverageP95ReductionPercent() {
        return overallAverageP95ReductionPercent;
    }

    public void setOverallAverageP95ReductionPercent(double overallAverageP95ReductionPercent) {
        this.overallAverageP95ReductionPercent = overallAverageP95ReductionPercent;
    }

    public double getOverallAverageSloReductionPercent() {
        return overallAverageSloReductionPercent;
    }

    public void setOverallAverageSloReductionPercent(double overallAverageSloReductionPercent) {
        this.overallAverageSloReductionPercent = overallAverageSloReductionPercent;
    }

    public double getOverallAverageScalingLeadTimeGainSeconds() {
        return overallAverageScalingLeadTimeGainSeconds;
    }

    public void setOverallAverageScalingLeadTimeGainSeconds(double overallAverageScalingLeadTimeGainSeconds) {
        this.overallAverageScalingLeadTimeGainSeconds = overallAverageScalingLeadTimeGainSeconds;
    }

    public String getBenchmarkConclusion() {
        return benchmarkConclusion;
    }

    public void setBenchmarkConclusion(String benchmarkConclusion) {
        this.benchmarkConclusion = benchmarkConclusion;
    }

    public List<ComparisonResponse> getScenarioComparisons() {
        return scenarioComparisons;
    }

    public void setScenarioComparisons(List<ComparisonResponse> scenarioComparisons) {
        this.scenarioComparisons = scenarioComparisons;
    }

    public List<ExperimentResponse> getAllRuns() {
        return allRuns;
    }

    public void setAllRuns(List<ExperimentResponse> allRuns) {
        this.allRuns = allRuns;
    }
}
