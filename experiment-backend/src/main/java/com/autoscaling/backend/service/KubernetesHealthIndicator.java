package com.autoscaling.backend.service;

import io.fabric8.kubernetes.client.KubernetesClient;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.boot.actuate.health.Health;
import org.springframework.boot.actuate.health.HealthIndicator;
import org.springframework.stereotype.Component;

import java.util.concurrent.CompletableFuture;
import java.util.concurrent.TimeUnit;

/**
 * Actuator HealthIndicator that probes live reachability of the Kubernetes API Server.
 */
@Component("kubernetes")
public class KubernetesHealthIndicator implements HealthIndicator {

    private static final Logger log = LoggerFactory.getLogger(KubernetesHealthIndicator.class);

    private final KubernetesOrchestratorService orchestratorService;

    public KubernetesHealthIndicator(KubernetesOrchestratorService orchestratorService) {
        this.orchestratorService = orchestratorService;
    }

    @Override
    public Health health() {
        KubernetesClient client = orchestratorService.getKubernetesClient();
        if (client == null) {
            return Health.down().withDetail("status", "UNCONFIGURED").build();
        }

        try {
            return CompletableFuture.supplyAsync(() -> {
                try {
                    String masterUrl = client.getMasterUrl() != null ? client.getMasterUrl().toString() : "unknown";
                    var ns = client.namespaces().withName("autoscaling-experiment").get();
                    if (ns != null) {
                        return Health.up()
                                .withDetail("masterUrl", masterUrl)
                                .withDetail("namespace", ns.getMetadata().getName())
                                .withDetail("status", "ACTIVE")
                                .build();
                    }
                } catch (Exception e) {
                    log.error("Kubernetes health ping failed: {} (Class: {})", e.getMessage(), e.getClass().getName());
                }
                String masterUrl = client.getMasterUrl() != null ? client.getMasterUrl().toString() : "unknown";
                return Health.down()
                        .withDetail("masterUrl", masterUrl)
                        .withDetail("status", "UNREACHABLE")
                        .build();
            }).get(3500, TimeUnit.MILLISECONDS);
        } catch (Exception ex) {
            log.error("Kubernetes health future failed: {}", ex.getMessage(), ex);
            return Health.down()
                    .withDetail("status", "UNREACHABLE")
                    .withDetail("error", ex.getMessage())
                    .build();
        }
    }
}
