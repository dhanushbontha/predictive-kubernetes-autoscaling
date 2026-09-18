package com.autoscaling.backend.dto;

import com.autoscaling.backend.model.WorkloadScenario;

/**
 * Side-by-side comparison DTO evaluating reactive HPA vs predictive Prophet + KEDA.
 */
public class ComparisonResponse {

    private WorkloadScenario scenario;
    private ExperimentResponse reactiveHpaExperiment;
    private ExperimentResponse predictiveKedaExperiment;

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
}
