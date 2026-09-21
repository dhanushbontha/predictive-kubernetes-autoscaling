package com.autoscaling.backend.service;

import com.autoscaling.backend.dto.BenchmarkMatrixSummaryResponse;
import com.autoscaling.backend.dto.ComparisonResponse;
import com.autoscaling.backend.dto.ExperimentResponse;
import com.autoscaling.backend.entity.ExperimentEntity;
import com.autoscaling.backend.model.AutoscalingMode;
import com.autoscaling.backend.model.Experiment;
import com.autoscaling.backend.model.ExperimentResult;
import com.autoscaling.backend.model.ExperimentStatus;
import com.autoscaling.backend.model.WorkloadScenario;
import com.autoscaling.backend.repository.ExperimentRepository;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.stereotype.Service;

import java.time.Instant;
import java.util.ArrayList;
import java.util.List;
import java.util.Optional;

/**
 * Service for orchestrating batch automated matrix benchmark execution across all 5 workload scenarios
 * and producing academic comparative evaluations.
 */
@Service
public class BenchmarkMatrixRunner {

    private static final Logger log = LoggerFactory.getLogger(BenchmarkMatrixRunner.class);

    private final ExperimentLifecycleService lifecycleService;
    private final ExperimentRepository experimentRepository;

    public BenchmarkMatrixRunner(
            ExperimentLifecycleService lifecycleService,
            ExperimentRepository experimentRepository) {
        this.lifecycleService = lifecycleService;
        this.experimentRepository = experimentRepository;
    }

    /**
     * Aggregates and summarizes genuine completed benchmark experiments from PostgreSQL.
     * Never generates fake or seeded results.
     */
    public BenchmarkMatrixSummaryResponse runOrSeedMatrix() {
        log.info("Aggregating genuine completed benchmark experiments from database...");

        WorkloadScenario[] scenarios = WorkloadScenario.values();
        List<ExperimentResponse> allRuns = new ArrayList<>();
        List<ComparisonResponse> scenarioComparisons = new ArrayList<>();

        List<ExperimentEntity> dbList = experimentRepository.findAllByOrderByStartTimeDesc();
        List<Experiment> completedExpList = new ArrayList<>();
        if (dbList != null) {
            for (ExperimentEntity entity : dbList) {
                Experiment exp = entity.toDomain();
                if (exp.getStatus() == ExperimentStatus.COMPLETED && exp.getResult() != null) {
                    completedExpList.add(exp);
                }
            }
        }

        for (WorkloadScenario scenario : scenarios) {
            Experiment hpaExp = completedExpList.stream()
                    .filter(e -> e.getScenario() == scenario && e.getAutoscalingMode() == AutoscalingMode.REACTIVE_HPA)
                    .findFirst()
                    .orElse(null);

            Experiment kedaExp = completedExpList.stream()
                    .filter(e -> e.getScenario() == scenario && e.getAutoscalingMode() == AutoscalingMode.PREDICTIVE_PROPHET_KEDA)
                    .findFirst()
                    .orElse(null);

            if (hpaExp != null) {
                allRuns.add(ExperimentResponse.fromDomain(hpaExp));
            }
            if (kedaExp != null) {
                allRuns.add(ExperimentResponse.fromDomain(kedaExp));
            }

            if (hpaExp != null && kedaExp != null) {
                ComparisonResponse comparison = lifecycleService.compareExperiments(hpaExp, kedaExp);
                scenarioComparisons.add(comparison);
            }
        }

        // Calculate Overall Academic Aggregate Metrics across completed pairs
        Double avgP95Red = null;
        Double avgSloRed = null;
        Double avgDelayGain = null;
        String conclusion;

        int pairedCount = scenarioComparisons.size();
        if (pairedCount > 0) {
            double totalP95RedPct = 0.0;
            double totalSloRedPct = 0.0;
            double totalDelayGain = 0.0;

            for (ComparisonResponse cmp : scenarioComparisons) {
                if (cmp.getP95ReductionPercent() != null) totalP95RedPct += cmp.getP95ReductionPercent();
                if (cmp.getSloViolationRateReductionPercent() != null) totalSloRedPct += cmp.getSloViolationRateReductionPercent();
                if (cmp.getScalingDelayImprovementSeconds() != null) totalDelayGain += cmp.getScalingDelayImprovementSeconds();
            }

            avgP95Red = Math.round((totalP95RedPct / pairedCount) * 10.0) / 10.0;
            avgSloRed = Math.round((totalSloRedPct / pairedCount) * 10.0) / 10.0;
            avgDelayGain = Math.round((totalDelayGain / pairedCount) * 10.0) / 10.0;

            conclusion = String.format(
                    "Across %d evaluated scenario pair(s), Predictive Autoscaling (Meta Prophet + KEDA) demonstrated an average P95 latency reduction of %.1f%%, eliminated %.1f%% of SLO violations, and provided an average scaling lead-time advantage of %.1f seconds over Reactive Kubernetes HPA.",
                    pairedCount, avgP95Red, avgSloRed, avgDelayGain
            );
        } else {
            conclusion = "No completed paired benchmark runs recorded yet. Launch both Reactive (HPA) and Predictive (KEDA) experiments to generate empirical evaluations.";
        }

        BenchmarkMatrixSummaryResponse summary = new BenchmarkMatrixSummaryResponse(
                Instant.now(),
                scenarios.length,
                allRuns.size(),
                avgP95Red != null ? avgP95Red : 0.0,
                avgSloRed != null ? avgSloRed : 0.0,
                avgDelayGain != null ? avgDelayGain : 0.0,
                conclusion,
                scenarioComparisons,
                allRuns
        );

        log.info("Benchmark Matrix summarized: {} scenarios, {} total completed runs, {} paired evaluations.",
                scenarios.length, allRuns.size(), pairedCount);
        return summary;
    }

    /**
     * Generates CSV summary text of the matrix results.
     */
    public String generateCsvSummary(BenchmarkMatrixSummaryResponse summary) {
        StringBuilder sb = new StringBuilder();
        sb.append("Scenario,Mode,P95_Latency_ms,P99_Latency_ms,SLO_Breaches,SLO_Breach_Rate_pct,Avg_CPU_pct,Peak_CPU_pct,Peak_Replicas,Avg_Scaling_Delay_s,MAE,RMSE\n");
        for (ExperimentResponse exp : summary.getAllRuns()) {
            ExperimentResult r = exp.getResult();
            double p95 = (r != null && r.getP95LatencyMs() != null) ? r.getP95LatencyMs() : 0.0;
            double p99 = (r != null && r.getP99LatencyMs() != null) ? r.getP99LatencyMs() : 0.0;
            long sloViolations = (r != null && r.getSloViolations() != null) ? r.getSloViolations() : 0L;
            double sloRate = (r != null && r.getSloViolationRate() != null) ? r.getSloViolationRate() * 100.0 : 0.0;
            double avgCpu = (r != null && r.getAvgCpuPercent() != null) ? r.getAvgCpuPercent() : 0.0;
            double peakCpu = (r != null && r.getPeakCpuPercent() != null) ? r.getPeakCpuPercent() : 0.0;
            int peakReps = (r != null && r.getPeakReplicas() != null) ? r.getPeakReplicas() : 1;
            double delay = (r != null && r.getAvgScalingDelaySeconds() != null) ? r.getAvgScalingDelaySeconds() : 0.0;
            String maeStr = (r != null && r.getMae() != null) ? String.format("%.2f", r.getMae()) : "N/A";
            String rmseStr = (r != null && r.getRmse() != null) ? String.format("%.2f", r.getRmse()) : "N/A";

            sb.append(String.format("%s,%s,%.1f,%.1f,%d,%.2f,%.1f,%.1f,%d,%.1f,%s,%s\n",
                    exp.getScenario(),
                    exp.getAutoscalingMode(),
                    p95,
                    p99,
                    sloViolations,
                    sloRate,
                    avgCpu,
                    peakCpu,
                    peakReps,
                    delay,
                    maeStr,
                    rmseStr
            ));
        }
        return sb.toString();
    }
}
