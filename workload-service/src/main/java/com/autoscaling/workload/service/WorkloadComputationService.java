package com.autoscaling.workload.service;

import com.autoscaling.workload.config.WorkloadProperties;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.stereotype.Service;

/**
 * Service performing deterministic CPU-intensive computation
 * to generate measurable CPU load for autoscaling observations.
 */
@Service
public class WorkloadComputationService {

    private static final Logger log = LoggerFactory.getLogger(WorkloadComputationService.class);

    private final WorkloadProperties properties;

    public WorkloadComputationService(WorkloadProperties properties) {
        this.properties = properties;
    }

    /**
     * Executes deterministic math computations.
     *
     * @param iterations Optional iteration count override (falls back to configured default)
     * @return Formatted result string
     */
    public String executeComputation(Integer iterations) {
        int loopCount = (iterations != null && iterations > 0)
                ? iterations
                : properties.getDefaultIterations();

        double result = 0;
        for (int i = 0; i < loopCount; i++) {
            result += Math.sqrt(i) * Math.sin(i);
        }
        

        log.debug("Completed workload computation for {} iterations: {}", loopCount, result);
        return "Workload processed. Result: " + result;
    }
}
