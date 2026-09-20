package com.autoscaling.backend.dto;

import com.autoscaling.backend.model.WorkloadScenario;

/**
 * Side-by-side comparison DTO evaluating reactive HPA vs predictive Prophet + KEDA
 * with quantitative performance deltas and scientific evaluation metrics.
 */
public class ComparisonResponse {

    private WorkloadScenario scenario;
    private ExperimentResponse reactiveHpaExperiment;
    private ExperimentResponse predictiveKedaExperiment;

    // Computed scientific delta metrics
    private Double p95ReductionMs;
    private Double p95ReductionPercent;
    private Double p99ReductionMs;
    private Double p99ReductionPercent;
    private Long sloViolationsAvoided;
    private Double sloViolationRateReductionPercent;
    private Double scalingDelayImprovementSeconds;
    private Double overProvisioningPenaltyScore;
    private Double underProvisioningPenaltyScore;
    private String executiveSummary;

    public ComparisonResponse() {
    }

    public ComparisonResponse(WorkloadScenario scenario, ExperimentResponse reactiveHpaExperiment, ExperimentResponse predictiveKedaExperiment) {
        this.scenario = scenario;
        this.reactiveHpaExperiment = reactiveHpaExperiment;
        this.predictiveKedaExperiment = predictiveKedaExperiment;
    }

    public WorkloadScenario getScenario() {
        return scenario;
    }

    public void setScenario(WorkloadScenario scenario) {
        this.scenario = scenario;
    }

    public ExperimentResponse getReactiveHpaExperiment() {
        return reactiveHpaExperiment;
    }

    public void setReactiveHpaExperiment(ExperimentResponse reactiveHpaExperiment) {
        this.reactiveHpaExperiment = reactiveHpaExperiment;
    }

    public ExperimentResponse getPredictiveKedaExperiment() {
        return predictiveKedaExperiment;
    }

    public void setPredictiveKedaExperiment(ExperimentResponse predictiveKedaExperiment) {
        this.predictiveKedaExperiment = predictiveKedaExperiment;
    }

    public Double getP95ReductionMs() {
        return p95ReductionMs;
    }

    public void setP95ReductionMs(Double p95ReductionMs) {
        this.p95ReductionMs = p95ReductionMs;
    }

    public Double getP95ReductionPercent() {
        return p95ReductionPercent;
    }

    public void setP95ReductionPercent(Double p95ReductionPercent) {
        this.p95ReductionPercent = p95ReductionPercent;
    }

    public Double getP99ReductionMs() {
        return p99ReductionMs;
    }

    public void setP99ReductionMs(Double p99ReductionMs) {
        this.p99ReductionMs = p99ReductionMs;
    }

    public Double getP99ReductionPercent() {
        return p99ReductionPercent;
    }

    public void setP99ReductionPercent(Double p99ReductionPercent) {
        this.p99ReductionPercent = p99ReductionPercent;
    }

    public Long getSloViolationsAvoided() {
        return sloViolationsAvoided;
    }

    public void setSloViolationsAvoided(Long sloViolationsAvoided) {
        this.sloViolationsAvoided = sloViolationsAvoided;
    }

    public Double getSloViolationRateReductionPercent() {
        return sloViolationRateReductionPercent;
    }

    public void setSloViolationRateReductionPercent(Double sloViolationRateReductionPercent) {
        this.sloViolationRateReductionPercent = sloViolationRateReductionPercent;
    }

    public Double getScalingDelayImprovementSeconds() {
        return scalingDelayImprovementSeconds;
    }

    public void setScalingDelayImprovementSeconds(Double scalingDelayImprovementSeconds) {
        this.scalingDelayImprovementSeconds = scalingDelayImprovementSeconds;
    }

    public Double getOverProvisioningPenaltyScore() {
        return overProvisioningPenaltyScore;
    }

    public void setOverProvisioningPenaltyScore(Double overProvisioningPenaltyScore) {
        this.overProvisioningPenaltyScore = overProvisioningPenaltyScore;
    }

    public Double getUnderProvisioningPenaltyScore() {
        return underProvisioningPenaltyScore;
    }

    public void setUnderProvisioningPenaltyScore(Double underProvisioningPenaltyScore) {
        this.underProvisioningPenaltyScore = underProvisioningPenaltyScore;
    }

    public String getExecutiveSummary() {
        return executiveSummary;
    }

    public void setExecutiveSummary(String executiveSummary) {
        this.executiveSummary = executiveSummary;
    }
}
