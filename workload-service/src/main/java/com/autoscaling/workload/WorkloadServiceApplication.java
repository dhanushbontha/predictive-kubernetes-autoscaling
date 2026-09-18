package com.autoscaling.workload;

import org.springframework.boot.SpringApplication;
import org.springframework.boot.autoconfigure.SpringBootApplication;
import org.springframework.boot.context.properties.ConfigurationPropertiesScan;

/**
 * Main Spring Boot entry point for the Workload Service.
 * Serves deterministic CPU computation workloads for autoscaling benchmarking.
 */
@SpringBootApplication
@ConfigurationPropertiesScan
public class WorkloadServiceApplication {

    public static void main(String[] args) {
        SpringApplication.run(WorkloadServiceApplication.class, args);
    }
}
