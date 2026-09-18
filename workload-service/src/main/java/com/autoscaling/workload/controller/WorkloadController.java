package com.autoscaling.workload.controller;

import com.autoscaling.workload.service.WorkloadComputationService;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

/**
 * Controller exposing the CPU-intensive workload endpoint.
 * Monitored by Prometheus via Micrometer HTTP metrics (http_server_requests_seconds).
 */
@RestController
@RequestMapping("/api/workload")
public class WorkloadController {

    private final WorkloadComputationService computationService;

    public WorkloadController(WorkloadComputationService computationService) {
        this.computationService = computationService;
    }

    /**
     * Executes deterministic CPU workload.
     *
     * @param iterations Optional query param to override iteration count
     * @return Deterministic computation result string
     */
    @GetMapping(produces = "text/plain")
    public ResponseEntity<String> processWorkload(
            @RequestParam(name = "iterations", required = false) Integer iterations) {
        String result = computationService.executeComputation(iterations);
        return ResponseEntity.ok(result);
    }
}
