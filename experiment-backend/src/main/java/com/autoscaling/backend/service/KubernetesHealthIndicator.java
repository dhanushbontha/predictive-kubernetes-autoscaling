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
                    var version = client.getKubernetesVersion();
                    String masterUrl = client.getMasterUrl() != null ? client.getMasterUrl().toString() : "unknown";
                    if (version != null) {
                        return Health.up()
                                .withDetail("masterUrl", masterUrl)
                                .withDetail("gitVersion", version.getGitVersion())
                                .withDetail("platform", version.getPlatform())
                                .build();
                    }
                } catch (Exception e) {
                    log.debug("Kubernetes health ping failed: {}", e.getMessage());
                }
                String masterUrl = client.getMasterUrl() != null ? client.getMasterUrl().toString() : "unknown";
                return Health.down()
                        .withDetail("masterUrl", masterUrl)
                        .withDetail("status", "UNREACHABLE")
                        .build();
            }).get(800, TimeUnit.MILLISECONDS);
        } catch (Exception ex) {
            return Health.down()
                    .withDetail("status", "UNREACHABLE")
                    .withDetail("error", ex.getMessage())
                    .build();
        }
    }
}
