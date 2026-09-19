package com.autoscaling.backend.controller;

import com.autoscaling.backend.dto.ExperimentResponse;
import com.autoscaling.backend.dto.StartExperimentRequest;
import com.autoscaling.backend.service.ExperimentLifecycleService;
import jakarta.validation.Valid;
import org.springframework.http.HttpStatus;
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
 * Controller handling experiment lifecycle management and querying.
 */
@RestController
@RequestMapping("/api/experiments")
@CrossOrigin(origins = "*")
public class ExperimentController {

    private final ExperimentLifecycleService lifecycleService;

    public ExperimentController(ExperimentLifecycleService lifecycleService) {
        this.lifecycleService = lifecycleService;
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
