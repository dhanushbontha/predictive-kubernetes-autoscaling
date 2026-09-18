package com.autoscaling.backend.controller;

import com.autoscaling.backend.dto.ComparisonResponse;
import com.autoscaling.backend.dto.DashboardLiveResponse;
import com.autoscaling.backend.dto.ExperimentResponse;
import com.autoscaling.backend.dto.LiveMetricsHistoryResponse;
import com.autoscaling.backend.service.ExperimentLifecycleService;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.CrossOrigin;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import java.util.List;

/**
 * Controller serving real-time telemetry, historical logs, and comparative evaluation views.
 */
@RestController
@RequestMapping("/api/dashboard")
@CrossOrigin(origins = "*")
public class DashboardController {

    private final ExperimentLifecycleService lifecycleService;

    public DashboardController(ExperimentLifecycleService lifecycleService) {
        this.lifecycleService = lifecycleService;
    }

    /**
     * Polls live experiment metrics (request rate, predicted rate, replicas, latency, CPU/memory).
     */
    @GetMapping("/live")
    public ResponseEntity<DashboardLiveResponse> getLiveTelemetry() {
        DashboardLiveResponse live = lifecycleService.getLiveDashboard();
        return ResponseEntity.ok(live);
    }

    /**
     * Returns live time-series history vectors for dashboard charts.
     */
    @GetMapping("/live/series")
    public ResponseEntity<LiveMetricsHistoryResponse> getLiveSeries(
            @RequestParam(name = "windowSeconds", defaultValue = "300") int windowSeconds,
            @RequestParam(name = "step", defaultValue = "5s") String step) {
        LiveMetricsHistoryResponse series = lifecycleService.getLiveHistory(windowSeconds, step);
        return ResponseEntity.ok(series);
    }

    /**
     * Returns historical completed experiments.
     */
    @GetMapping("/history")
    public ResponseEntity<List<ExperimentResponse>> getHistoricalRuns() {
        List<ExperimentResponse> history = lifecycleService.listExperiments();
        return ResponseEntity.ok(history);
    }

    /**
     * Compares an HPA experiment run with a predictive Prophet+KEDA run side-by-side.
     */
    @GetMapping("/comparison")
    public ResponseEntity<ComparisonResponse> getComparison(
            @RequestParam(name = "hpaId", required = false) String hpaId,
            @RequestParam(name = "kedaId", required = false) String kedaId) {
        ComparisonResponse comparison = lifecycleService.compareExperiments(hpaId, kedaId);
        return ResponseEntity.ok(comparison);
    }
}
