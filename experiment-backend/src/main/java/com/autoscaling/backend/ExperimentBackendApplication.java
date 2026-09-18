package com.autoscaling.backend;

import org.springframework.boot.SpringApplication;
import org.springframework.boot.autoconfigure.SpringBootApplication;

/**
 * Main entry point for the Experiment Backend microservice.
 */
@SpringBootApplication
public class ExperimentBackendApplication {

    public static void main(String[] args) {
        SpringApplication.run(ExperimentBackendApplication.class, args);
    }
}
