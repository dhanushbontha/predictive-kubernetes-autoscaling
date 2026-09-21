package com.autoscaling.backend.service;

import com.autoscaling.backend.dto.ComparisonResponse;
import com.autoscaling.backend.dto.DashboardLiveResponse;
import com.autoscaling.backend.dto.ExperimentResponse;
import com.autoscaling.backend.dto.LiveMetricsHistoryResponse;
import com.autoscaling.backend.dto.StartExperimentRequest;
import com.autoscaling.backend.entity.ExperimentEntity;
import com.autoscaling.backend.model.AutoscalingMode;
import com.autoscaling.backend.model.Experiment;
import com.autoscaling.backend.model.ExperimentResult;
import com.autoscaling.backend.model.ExperimentStatus;
import com.autoscaling.backend.model.ScalingEvent;
import com.autoscaling.backend.model.WorkloadScenario;
import com.autoscaling.backend.repository.ExperimentRepository;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.Instant;
import java.util.ArrayList;
import java.util.Collections;
import java.util.List;
import java.util.Map;
import java.util.Optional;
import java.util.UUID;
import java.util.concurrent.ConcurrentHashMap;
import java.util.concurrent.ExecutorService;
import java.util.concurrent.Executors;

/**
 * Service managing experiment state machine, lifecycle automation, and PostgreSQL persistence.
 */
@Service
public class ExperimentLifecycleService {

    private static final Logger log = LoggerFactory.getLogger(ExperimentLifecycleService.class);

    private final KubernetesOrchestratorService kubernetesService;
    private final PrometheusClientService prometheusClientService;
    private final ExperimentRepository experimentRepository;
    private final Map<String, Experiment> experimentStore = new ConcurrentHashMap<>();
    private final ExecutorService executor = Executors.newCachedThreadPool();

    private volatile String activeExperimentId = null;

    public ExperimentLifecycleService(
            KubernetesOrchestratorService kubernetesService,
            PrometheusClientService prometheusClientService,
            ExperimentRepository experimentRepository) {
        this.kubernetesService = kubernetesService;
        this.prometheusClientService = prometheusClientService;
        this.experimentRepository = experimentRepository;
    }

    /**
     * Initiates, persists, and runs an automated experiment.
     */
    @Transactional
    public synchronized ExperimentResponse startExperiment(StartExperimentRequest request) {
        if (activeExperimentId != null) {
            Experiment active = experimentStore.get(activeExperimentId);
            if (active != null && (active.getStatus() == ExperimentStatus.RUNNING || active.getStatus() == ExperimentStatus.STARTING)) {
                throw new IllegalStateException("An experiment is already running: " + activeExperimentId);
            }
        }

        String experimentId = UUID.randomUUID().toString().substring(0, 8);
        Experiment experiment = new Experiment();
        experiment.setId(experimentId);
        experiment.setName((request.getName() != null && !request.getName().isBlank())
                ? request.getName()
                : request.getScenario().name() + "_" + request.getAutoscalingMode().name() + "_" + experimentId);
        experiment.setScenario(request.getScenario());
        experiment.setAutoscalingMode(request.getAutoscalingMode());
        experiment.setTargetRps(request.getTargetRps());
        experiment.setDurationSeconds(request.getDurationSeconds());
        experiment.setSloLatencyMs(request.getSloLatencyMs());
        experiment.setForecastHorizonSeconds(request.getForecastHorizonSeconds());
        experiment.setStatus(ExperimentStatus.STARTING);
        experiment.setStartTime(Instant.now());

        experimentStore.put(experimentId, experiment);
        this.activeExperimentId = experimentId;

        // Persist to PostgreSQL database
        try {
            experimentRepository.save(ExperimentEntity.fromDomain(experiment));
        } catch (Exception ex) {
            log.warn("Database persistence note: {}", ex.getMessage());
        }

        log.info("Starting experiment [{}] with scenario={}, mode={}, RPS={}, duration={}s",
                experimentId, request.getScenario(), request.getAutoscalingMode(), request.getTargetRps(), request.getDurationSeconds());

        // Launch lifecycle execution asynchronously in the background
        executor.submit(() -> executeExperimentLifecycle(experiment));

        return ExperimentResponse.fromDomain(experiment);
    }

    /**
     * Executes the sequential 16-step automated experiment lifecycle.
     */
    private void executeExperimentLifecycle(Experiment exp) {
        String expId = exp.getId();
        try {
            // Step 1: Clean previous jobs
            kubernetesService.cleanPreviousK6Jobs(null);

            // Step 2 & 3: Disable conflicting autoscalers
            if (exp.getAutoscalingMode() == AutoscalingMode.REACTIVE_HPA) {
                kubernetesService.disableKeda(null);
                kubernetesService.enableHpa(null);
            } else {
                kubernetesService.disableHpa(null);
                kubernetesService.enableKeda(null);
            }

            // Step 4 & 5: Reset workload Deployment to 1 replica
            kubernetesService.scaleWorkloadDeployment(null, 1);
            Thread.sleep(2000);

            // Step 6: Mark RUNNING
            exp.setStatus(ExperimentStatus.RUNNING);
            exp.setStartTime(Instant.now());
            saveExperimentSafely(exp);

            // Step 7: Dispatch in-cluster k6 load generation Job
            kubernetesService.dispatchK6Job(null, expId, exp.getScenario(), exp.getTargetRps(), exp.getDurationSeconds());

            log.info("Experiment [{}] is now RUNNING. Monitoring execution...", expId);

            // Step 8: Monitor execution until completion or duration expiry
            long endTimeMs = System.currentTimeMillis() + (exp.getDurationSeconds() * 1000L) + 15000L;
            while (System.currentTimeMillis() < endTimeMs) {
                if (exp.getStatus() == ExperimentStatus.STOPPED) {
                    log.info("Experiment [{}] was stopped manually.", expId);
                    saveExperimentSafely(exp);
                    return;
                }
                if (kubernetesService.isJobCompleted(null, expId)) {
                    log.info("k6 Job for experiment [{}] completed.", expId);
                    break;
                }
                Thread.sleep(2000);
            }

            // Step 9: Compute final measured results
            ExperimentResult result = calculateExperimentResults(exp);
            exp.setResult(result);
            exp.setEndTime(Instant.now());
            exp.setStatus(ExperimentStatus.COMPLETED);
            saveExperimentSafely(exp);

            log.info("Experiment [{}] COMPLETED and persisted successfully.", expId);

        } catch (InterruptedException ex) {
            Thread.currentThread().interrupt();
            exp.setStatus(ExperimentStatus.FAILED);
            exp.setErrorMessage("Experiment execution was interrupted: " + ex.getMessage());
            saveExperimentSafely(exp);
        } catch (Exception ex) {
            log.error("Experiment [{}] failed during lifecycle: {}", expId, ex.getMessage(), ex);
            exp.setStatus(ExperimentStatus.FAILED);
            exp.setErrorMessage(ex.getMessage());
            saveExperimentSafely(exp);
        } finally {
            if (activeExperimentId != null && activeExperimentId.equals(expId)) {
                activeExperimentId = null;
            }
        }
    }

    private void saveExperimentSafely(Experiment exp) {
        try {
            Optional<ExperimentEntity> existingOpt = experimentRepository.findById(exp.getId());
            ExperimentEntity entity = ExperimentEntity.fromDomain(exp);
            if (existingOpt.isPresent() && existingOpt.get().getResult() != null && entity.getResult() != null) {
                entity.getResult().setId(existingOpt.get().getResult().getId());
            }
            experimentRepository.save(entity);
        } catch (Exception ex) {
            log.warn("Database persist warning for experiment {}: {}", exp.getId(), ex.getMessage());
        }
    }

    /**
     * Stops an actively running experiment.
     */
    public synchronized ExperimentResponse stopExperiment(String experimentId) {
        Experiment exp = experimentStore.get(experimentId);
        if (exp == null) {
            Optional<ExperimentEntity> dbOpt = experimentRepository.findById(experimentId);
            if (dbOpt.isPresent()) {
                exp = dbOpt.get().toDomain();
            } else {
                throw new IllegalArgumentException("Experiment not found: " + experimentId);
            }
        }

        if (exp.getStatus() == ExperimentStatus.RUNNING || exp.getStatus() == ExperimentStatus.STARTING) {
            log.info("Stopping experiment [{}]", experimentId);
            exp.setStatus(ExperimentStatus.STOPPED);
            exp.setEndTime(Instant.now());
            kubernetesService.cleanPreviousK6Jobs(null);
            saveExperimentSafely(exp);
            if (activeExperimentId != null && activeExperimentId.equals(experimentId)) {
                activeExperimentId = null;
            }
        }
        return ExperimentResponse.fromDomain(exp);
    }

    public ExperimentResponse getActiveExperiment() {
        if (activeExperimentId != null) {
            Experiment exp = experimentStore.get(activeExperimentId);
            if (exp != null) {
                return ExperimentResponse.fromDomain(exp);
            }
        }
        return null;
    }

    public ExperimentResponse getExperiment(String id) {
        Experiment exp = experimentStore.get(id);
        if (exp == null) {
            Optional<ExperimentEntity> dbOpt = experimentRepository.findById(id);
            if (dbOpt.isPresent()) {
                return ExperimentResponse.fromDomain(dbOpt.get().toDomain());
            }
            throw new IllegalArgumentException("Experiment not found with ID: " + id);
        }
        return ExperimentResponse.fromDomain(exp);
    }

    public List<ExperimentResponse> listExperiments() {
        try {
            List<ExperimentEntity> dbList = experimentRepository.findAllByOrderByStartTimeDesc();
            if (dbList != null && !dbList.isEmpty()) {
                List<ExperimentResponse> list = new ArrayList<>();
                Instant now = Instant.now();
                for (ExperimentEntity entity : dbList) {
                    Experiment exp = entity.toDomain();
                    // Auto-reconcile if experiment duration has elapsed and it's no longer running in active memory
                    if ((exp.getStatus() == ExperimentStatus.RUNNING || exp.getStatus() == ExperimentStatus.STARTING)) {
                        int dur = exp.getDurationSeconds() != null ? exp.getDurationSeconds() : 120;
                        Instant expiry = (exp.getStartTime() != null) ? exp.getStartTime().plusSeconds(dur + 10L) : now;
                        boolean isActiveMemory = exp.getId().equals(activeExperimentId);
                        if (!isActiveMemory || now.isAfter(expiry)) {
                            exp.setStatus(ExperimentStatus.COMPLETED);
                            exp.setEndTime(exp.getStartTime() != null ? exp.getStartTime().plusSeconds(dur) : now);
                            exp.setResult(calculateExperimentResults(exp));
                            saveExperimentSafely(exp);
                        }
                    } else if (exp.getStatus() == ExperimentStatus.COMPLETED) {
                        // Re-calculate if it previously had the old static 130.0ms placeholder
                        if (exp.getResult() == null || (exp.getResult().getP95LatencyMs() != null && exp.getResult().getP95LatencyMs() == 130.0 && exp.getResult().getSloViolationRate() == 0.0)) {
                            exp.setResult(calculateExperimentResults(exp));
                            saveExperimentSafely(exp);
                        }
                    }
                    list.add(ExperimentResponse.fromDomain(exp));
                }
                return list;
            }
        } catch (Exception ex) {
            log.warn("Querying repository failed, falling back to memory store: {}", ex.getMessage());
        }

        List<ExperimentResponse> list = new ArrayList<>();
        for (Experiment exp : experimentStore.values()) {
            list.add(ExperimentResponse.fromDomain(exp));
        }
        return list;
    }

    /**
     * Returns live telemetry for the active experiment / dashboard.
     */
    public DashboardLiveResponse getLiveDashboard() {
        DashboardLiveResponse resp = new DashboardLiveResponse();
        Integer sloLatency = 200;
        if (activeExperimentId != null) {
            Experiment active = experimentStore.get(activeExperimentId);
            if (active != null) {
                resp.setActiveExperimentId(active.getId());
                resp.setStatus(active.getStatus());
                resp.setScenario(active.getScenario());
                resp.setAutoscalingMode(active.getAutoscalingMode());
                sloLatency = active.getSloLatencyMs();
            }
        } else {
            resp.setStatus(ExperimentStatus.IDLE);
        }

        int readyReplicas = kubernetesService.getWorkloadReadyReplicas(null);
        resp.setCurrentReplicas(readyReplicas);
        resp.setDesiredReplicas(readyReplicas);

        // Fetch real-time live telemetry from Prometheus
        return prometheusClientService.populateLiveMetrics(resp, sloLatency);
    }

    /**
     * Returns time-series range history for dashboard chart streaming.
     */
    public LiveMetricsHistoryResponse getLiveHistory(int windowSeconds, String step) {
        int window = (windowSeconds > 0) ? windowSeconds : 300;
        Instant end = Instant.now();
        Instant start = end.minusSeconds(window);
        return prometheusClientService.fetchHistory(start, end, step);
    }

    /**
     * Stores an experiment in cache and repository.
     */
    public void registerExperiment(Experiment exp) {
        if (exp != null && exp.getId() != null) {
            experimentStore.put(exp.getId(), exp);
            saveExperimentSafely(exp);
        }
    }

    /**
     * Returns paired comparative metrics and calculated scientific deltas
     * between reactive HPA and predictive Prophet + KEDA runs.
     */
    public ComparisonResponse compareExperiments(String hpaExperimentId, String kedaExperimentId) {
        Experiment hpaExp = findExperimentOrNull(hpaExperimentId);
        Experiment kedaExp = findExperimentOrNull(kedaExperimentId);

        // If IDs not provided or not found, auto-pair latest completed runs
        if (hpaExp == null || kedaExp == null) {
            List<ExperimentResponse> all = listExperiments();
            if (hpaExp == null) {
                hpaExp = all.stream()
                        .filter(e -> e.getAutoscalingMode() == AutoscalingMode.REACTIVE_HPA && e.getStatus() == ExperimentStatus.COMPLETED)
                        .findFirst()
                        .map(this::toDomainSafe)
                        .orElse(null);
            }
            if (kedaExp == null) {
                kedaExp = all.stream()
                        .filter(e -> e.getAutoscalingMode() == AutoscalingMode.PREDICTIVE_PROPHET_KEDA && e.getStatus() == ExperimentStatus.COMPLETED)
                        .findFirst()
                        .map(this::toDomainSafe)
                        .orElse(null);
            }
        }

        return compareExperiments(hpaExp, kedaExp);
    }

    /**
     * Overloaded compareExperiments taking domain objects directly.
     */
    public ComparisonResponse compareExperiments(Experiment hpaExp, Experiment kedaExp) {
        WorkloadScenario scenario = (hpaExp != null) ? hpaExp.getScenario() : (kedaExp != null ? kedaExp.getScenario() : WorkloadScenario.BURSTY);

        ComparisonResponse resp = new ComparisonResponse(
                scenario,
                ExperimentResponse.fromDomain(hpaExp),
                ExperimentResponse.fromDomain(kedaExp)
        );

        // Compute rich delta metrics if both experiments have results
        if (hpaExp != null && hpaExp.getResult() != null && kedaExp != null && kedaExp.getResult() != null) {
            ExperimentResult hpaRes = hpaExp.getResult();
            ExperimentResult kedaRes = kedaExp.getResult();

            double hpaP95 = hpaRes.getP95LatencyMs() != null ? hpaRes.getP95LatencyMs() : 0.0;
            double kedaP95 = kedaRes.getP95LatencyMs() != null ? kedaRes.getP95LatencyMs() : 0.0;
            double p95Diff = hpaP95 - kedaP95;
            double p95Pct = (hpaP95 > 0) ? (p95Diff / hpaP95) * 100.0 : 0.0;

            double hpaP99 = hpaRes.getP99LatencyMs() != null ? hpaRes.getP99LatencyMs() : 0.0;
            double kedaP99 = kedaRes.getP99LatencyMs() != null ? kedaRes.getP99LatencyMs() : 0.0;
            double p99Diff = hpaP99 - kedaP99;
            double p99Pct = (hpaP99 > 0) ? (p99Diff / hpaP99) * 100.0 : 0.0;

            long hpaViolations = hpaRes.getSloViolations() != null ? hpaRes.getSloViolations() : 0L;
            long kedaViolations = kedaRes.getSloViolations() != null ? kedaRes.getSloViolations() : 0L;
            long violationsAvoided = Math.max(0L, hpaViolations - kedaViolations);

            double hpaSloRate = hpaRes.getSloViolationRate() != null ? hpaRes.getSloViolationRate() : 0.0;
            double kedaSloRate = kedaRes.getSloViolationRate() != null ? kedaRes.getSloViolationRate() : 0.0;
            double sloRateReductionPct = (hpaSloRate > 0) ? ((hpaSloRate - kedaSloRate) / hpaSloRate) * 100.0 : 0.0;

            double hpaDelay = hpaRes.getAvgScalingDelaySeconds() != null ? hpaRes.getAvgScalingDelaySeconds() : 0.0;
            double kedaDelay = kedaRes.getAvgScalingDelaySeconds() != null ? kedaRes.getAvgScalingDelaySeconds() : 0.0;
            double delayImprovement = hpaDelay - kedaDelay;

            double underPenalty = hpaSloRate * 100.0;
            double overPenalty = Math.max(0.0, ((kedaRes.getPeakReplicas() != null ? kedaRes.getPeakReplicas() : 1) - (hpaRes.getPeakReplicas() != null ? hpaRes.getPeakReplicas() : 1)) * 1.5);

            resp.setP95ReductionMs(round2(p95Diff));
            resp.setP95ReductionPercent(round2(p95Pct));
            resp.setP99ReductionMs(round2(p99Diff));
            resp.setP99ReductionPercent(round2(p99Pct));
            resp.setSloViolationsAvoided(violationsAvoided);
            resp.setSloViolationRateReductionPercent(round2(sloRateReductionPct));
            resp.setScalingDelayImprovementSeconds(round2(delayImprovement));
            resp.setUnderProvisioningPenaltyScore(round2(underPenalty));
            resp.setOverProvisioningPenaltyScore(round2(overPenalty));

            StringBuilder summary = new StringBuilder();
            summary.append(String.format("Empirical evaluation under %s workload pattern: ", scenario.name()));
            if (p95Diff > 0) {
                summary.append(String.format("Predictive KEDA achieved a %.1f%% reduction in P95 latency (%.1f ms vs %.1f ms). ", p95Pct, kedaP95, hpaP95));
            } else if (p95Diff < 0) {
                summary.append(String.format("Reactive HPA demonstrated lower P95 latency by %.1f ms (%.1f ms vs %.1f ms). ", Math.abs(p95Diff), hpaP95, kedaP95));
            } else {
                summary.append(String.format("Both autoscalers achieved comparable P95 latency (%.1f ms). ", kedaP95));
            }

            if (hpaViolations > kedaViolations) {
                summary.append(String.format("SLO breaches were reduced by %.1f%% (%d avoided). ", sloRateReductionPct, violationsAvoided));
            } else if (kedaViolations > hpaViolations) {
                summary.append(String.format("Reactive HPA had %d fewer SLO breaches. ", kedaViolations - hpaViolations));
            }

            if (delayImprovement != 0.0) {
                summary.append(String.format("Scaling provisioning delay difference: %.1fs.", delayImprovement));
            }

            resp.setExecutiveSummary(summary.toString().trim());
        }

        return resp;
    }

    private double round2(double val) {
        return Math.round(val * 10.0) / 10.0;
    }

    private Experiment toDomainSafe(ExperimentResponse resp) {
        if (resp == null) return null;
        return findExperimentOrNull(resp.getId());
    }

    private Experiment findExperimentOrNull(String id) {
        if (id == null || id.isBlank()) return null;
        Experiment exp = experimentStore.get(id);
        if (exp == null) {
            Optional<ExperimentEntity> dbOpt = experimentRepository.findById(id);
            if (dbOpt.isPresent()) {
                return dbOpt.get().toDomain();
            }
        }
        return exp;
    }

    /**
     * Calculates authentic experiment results derived entirely from actual Prometheus telemetry
     * and real Kubernetes pod condition readiness timestamps over the experiment window [startTime, endTime].
     */
    private ExperimentResult calculateExperimentResults(Experiment exp) {
        ExperimentResult result = new ExperimentResult();
        Instant startTime = exp.getStartTime() != null ? exp.getStartTime() : Instant.now().minusSeconds(exp.getDurationSeconds() != null ? exp.getDurationSeconds() : 60);
        Instant endTime = exp.getEndTime() != null ? exp.getEndTime() : Instant.now();

        log.info("Calculating authentic experiment results for [{}] over window [{} to {}]", exp.getId(), startTime, endTime);

        // 1. Fetch range telemetry from Prometheus for the exact bounded window
        LiveMetricsHistoryResponse history = prometheusClientService.fetchHistory(startTime, endTime, "2s");
        var reqSeries = history.getActualWorkloadSeries();
        var predSeries = history.getPredictedWorkloadSeries();
        var p95Series = history.getP95LatencySeries();
        var p99Series = history.getP99LatencySeries();
        var cpuSeries = history.getCpuUtilizationSeries();
        var memSeries = history.getMemoryUtilizationSeries();
        var repSeries = history.getReplicaSeries();

        // 2. Compute Total Requests and SLO Violations
        long totalReqs = prometheusClientService.calculateTotalRequests(startTime, endTime, reqSeries);
        int sloTargetMs = exp.getSloLatencyMs() != null ? exp.getSloLatencyMs() : 200;
        var sloEval = prometheusClientService.calculateSloViolations(startTime, endTime, (double) sloTargetMs, totalReqs);

        // 3. Compute Aggregates
        Double avgP95 = prometheusClientService.calculateAverage(p95Series);
        Double peakP95 = prometheusClientService.calculatePeak(p95Series);
        Double effectiveP95 = (peakP95 != null && peakP95 > 0.0) ? peakP95 : avgP95;

        Double avgP99 = prometheusClientService.calculateAverage(p99Series);
        Double peakP99 = prometheusClientService.calculatePeak(p99Series);
        Double effectiveP99 = (peakP99 != null && peakP99 > 0.0) ? peakP99 : avgP99;

        Double avgCpu = prometheusClientService.calculateAverage(cpuSeries);
        Double peakCpu = prometheusClientService.calculatePeak(cpuSeries);
        Double avgReps = prometheusClientService.calculateAverage(repSeries);
        Double peakRepsD = prometheusClientService.calculatePeak(repSeries);
        int peakReps = peakRepsD != null ? (int) Math.round(peakRepsD) : 1;
        Double avgMem = prometheusClientService.calculateAverage(memSeries);

        // 4. Out-of-sample Forecast Accuracy (for predictive mode)
        Double mae = null;
        Double rmse = null;
        if (exp.getAutoscalingMode() == AutoscalingMode.PREDICTIVE_PROPHET_KEDA) {
            mae = prometheusClientService.calculateMae(reqSeries, predSeries);
            rmse = prometheusClientService.calculateRmse(reqSeries, predSeries);
        }

        // 5. Query Real Kubernetes Pod Scaling Events & Delay
        List<ScalingEvent> scalingEvents = kubernetesService.extractScalingEvents(null, startTime, endTime);
        Double avgScalingDelay = null;
        if (!scalingEvents.isEmpty()) {
            avgScalingDelay = scalingEvents.stream()
                    .mapToDouble(ScalingEvent::getScalingDelaySeconds)
                    .average()
                    .orElse(0.0);
        }

        // 6. Populate ExperimentResult
        result.setTotalRequests(totalReqs);
        result.setSloViolations(sloEval.getViolations());
        result.setSloViolationRate(sloEval.getViolationRate());
        result.setP95LatencyMs(effectiveP95);
        result.setP99LatencyMs(effectiveP99);
        result.setAvgCpuPercent(avgCpu);
        result.setPeakCpuPercent(peakCpu);
        result.setAvgReplicas(avgReps != null ? avgReps : 1.0);
        result.setPeakReplicas(Math.max(1, peakReps));
        result.setAvgMemoryBytes(avgMem);
        result.setAvgScalingDelaySeconds(avgScalingDelay);
        result.setMae(mae);
        result.setRmse(rmse);
        result.setScalingEvents(scalingEvents);

        // 7. Persist raw telemetry and summary files to results/ directory
        persistRawTelemetry(exp, history, scalingEvents);
        persistSummary(exp, result);

        return result;
    }

    private void persistRawTelemetry(Experiment exp, LiveMetricsHistoryResponse history, List<ScalingEvent> scalingEvents) {
        try {
            java.io.File rawDir = new java.io.File("results/raw/" + exp.getId());
            if (!rawDir.exists()) {
                rawDir.mkdirs();
            }
            java.io.File rawFile = new java.io.File(rawDir, "telemetry.json");
            Map<String, Object> rawData = new java.util.LinkedHashMap<>();
            rawData.put("experimentId", exp.getId());
            rawData.put("name", exp.getName());
            rawData.put("scenario", exp.getScenario() != null ? exp.getScenario().name() : "UNKNOWN");
            rawData.put("controller", exp.getAutoscalingMode() != null ? exp.getAutoscalingMode().name() : "UNKNOWN");
            rawData.put("startTime", exp.getStartTime() != null ? exp.getStartTime().toString() : null);
            rawData.put("endTime", exp.getEndTime() != null ? exp.getEndTime().toString() : null);
            rawData.put("targetRps", exp.getTargetRps());
            rawData.put("durationSeconds", exp.getDurationSeconds());
            rawData.put("sloLatencyMs", exp.getSloLatencyMs());
            rawData.put("requestRate", history.getActualWorkloadSeries());
            rawData.put("predictedRate", history.getPredictedWorkloadSeries());
            rawData.put("p95Latency", history.getP95LatencySeries());
            rawData.put("p99Latency", history.getP99LatencySeries());
            rawData.put("cpu", history.getCpuUtilizationSeries());
            rawData.put("memory", history.getMemoryUtilizationSeries());
            rawData.put("readyReplicas", history.getReplicaSeries());
            rawData.put("scalingEvents", scalingEvents);

            com.fasterxml.jackson.databind.ObjectMapper mapper = new com.fasterxml.jackson.databind.ObjectMapper();
            mapper.registerModule(new com.fasterxml.jackson.datatype.jsr310.JavaTimeModule());
            mapper.writerWithDefaultPrettyPrinter().writeValue(rawFile, rawData);
            log.info("Persisted raw telemetry provenance to: {}", rawFile.getAbsolutePath());
        } catch (Exception ex) {
            log.warn("Failed persisting raw telemetry JSON for {}: {}", exp.getId(), ex.getMessage());
        }
    }

    private void persistSummary(Experiment exp, ExperimentResult res) {
        try {
            java.io.File summaryDir = new java.io.File("results/summaries");
            if (!summaryDir.exists()) {
                summaryDir.mkdirs();
            }
            java.io.File summaryFile = new java.io.File(summaryDir, exp.getId() + ".json");
            Map<String, Object> sumData = new java.util.LinkedHashMap<>();
            sumData.put("experimentId", exp.getId());
            sumData.put("name", exp.getName());
            sumData.put("scenario", exp.getScenario() != null ? exp.getScenario().name() : "UNKNOWN");
            sumData.put("controller", exp.getAutoscalingMode() != null ? exp.getAutoscalingMode().name() : "UNKNOWN");
            sumData.put("startTime", exp.getStartTime() != null ? exp.getStartTime().toString() : null);
            sumData.put("endTime", exp.getEndTime() != null ? exp.getEndTime().toString() : null);
            sumData.put("totalRequests", res.getTotalRequests());
            sumData.put("sloViolations", res.getSloViolations());
            sumData.put("sloViolationRate", res.getSloViolationRate());
            sumData.put("p95LatencyMs", res.getP95LatencyMs());
            sumData.put("p99LatencyMs", res.getP99LatencyMs());
            sumData.put("avgCpuPercent", res.getAvgCpuPercent());
            sumData.put("peakCpuPercent", res.getPeakCpuPercent());
            sumData.put("avgReplicas", res.getAvgReplicas());
            sumData.put("peakReplicas", res.getPeakReplicas());
            sumData.put("avgMemoryBytes", res.getAvgMemoryBytes());
            sumData.put("avgScalingDelaySeconds", res.getAvgScalingDelaySeconds());
            sumData.put("mae", res.getMae());
            sumData.put("rmse", res.getRmse());

            com.fasterxml.jackson.databind.ObjectMapper mapper = new com.fasterxml.jackson.databind.ObjectMapper();
            mapper.registerModule(new com.fasterxml.jackson.datatype.jsr310.JavaTimeModule());
            mapper.writerWithDefaultPrettyPrinter().writeValue(summaryFile, sumData);
            log.info("Persisted summary metrics to: {}", summaryFile.getAbsolutePath());
        } catch (Exception ex) {
            log.warn("Failed persisting summary JSON for {}: {}", exp.getId(), ex.getMessage());
        }
    }
}
