package com.autoscaling.backend.controller;

import com.autoscaling.backend.dto.BenchmarkMatrixSummaryResponse;
import com.autoscaling.backend.dto.ExperimentResponse;
import com.autoscaling.backend.dto.StartExperimentRequest;
import com.autoscaling.backend.service.BenchmarkMatrixRunner;
import com.autoscaling.backend.service.ExperimentLifecycleService;
import jakarta.validation.Valid;
import org.springframework.http.HttpHeaders;
import org.springframework.http.HttpStatus;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.CrossOrigin;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import java.util.List;

/**
 * Controller handling experiment lifecycle management, querying, and automated matrix benchmarking.
 */
@RestController
@RequestMapping("/api/experiments")
@CrossOrigin(origins = "*")
public class ExperimentController {

    private final ExperimentLifecycleService lifecycleService;
    private final BenchmarkMatrixRunner matrixRunner;

    public ExperimentController(
            ExperimentLifecycleService lifecycleService,
            BenchmarkMatrixRunner matrixRunner) {
        this.lifecycleService = lifecycleService;
        this.matrixRunner = matrixRunner;
    }

    /**
     * Starts a new benchmark experiment.
     */
    @PostMapping("/start")
    public ResponseEntity<ExperimentResponse> startExperiment(@Valid @RequestBody StartExperimentRequest request) {
        ExperimentResponse response = lifecycleService.startExperiment(request);
        return ResponseEntity.status(HttpStatus.CREATED).body(response);
    }

    /**
     * Executes or seeds the full 10-run automated benchmark matrix.
     */
    @PostMapping("/matrix/launch")
    public ResponseEntity<BenchmarkMatrixSummaryResponse> launchBenchmarkMatrix() {
        BenchmarkMatrixSummaryResponse summary = matrixRunner.runOrSeedMatrix();
        return ResponseEntity.ok(summary);
    }

    /**
     * Retrieves the latest aggregated benchmark matrix summary.
     */
    @GetMapping("/matrix/summary")
    public ResponseEntity<BenchmarkMatrixSummaryResponse> getBenchmarkMatrixSummary() {
        BenchmarkMatrixSummaryResponse summary = matrixRunner.runOrSeedMatrix();
        return ResponseEntity.ok(summary);
    }

    /**
     * Exports the aggregated benchmark matrix summary as CSV.
     */
    @GetMapping(value = "/matrix/summary.csv", produces = "text/csv")
    public ResponseEntity<String> exportBenchmarkMatrixCsv() {
        BenchmarkMatrixSummaryResponse summary = matrixRunner.runOrSeedMatrix();
        String csv = matrixRunner.generateCsvSummary(summary);
        return ResponseEntity.ok()
                .header(HttpHeaders.CONTENT_DISPOSITION, "attachment; filename=\"benchmark_matrix_summary.csv\"")
                .contentType(MediaType.parseMediaType("text/csv"))
                .body(csv);
    }

    /**
     * Stops an active experiment.
     */
    @PostMapping("/stop")
    public ResponseEntity<ExperimentResponse> stopExperiment(@RequestParam(name = "id") String experimentId) {
        ExperimentResponse response = lifecycleService.stopExperiment(experimentId);
        return ResponseEntity.ok(response);
    }

    /**
     * Retrieves currently active/running experiment if any.
     */
    @GetMapping("/active")
    public ResponseEntity<ExperimentResponse> getActiveExperiment() {
        ExperimentResponse active = lifecycleService.getActiveExperiment();
        if (active != null) {
            return ResponseEntity.ok(active);
        }
        return ResponseEntity.noContent().build();
    }

    /**
     * Retrieves experiment metadata and aggregated results by ID.
     */
    @GetMapping("/{id}")
    public ResponseEntity<ExperimentResponse> getExperiment(@PathVariable("id") String id) {
        ExperimentResponse response = lifecycleService.getExperiment(id);
        return ResponseEntity.ok(response);
    }

    /**
     * Lists all executed experiments.
     */
    @GetMapping
    public ResponseEntity<List<ExperimentResponse>> listExperiments() {
        List<ExperimentResponse> list = lifecycleService.listExperiments();
        return ResponseEntity.ok(list);
    }
}
