package com.autoscaling.backend.service;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.boot.actuate.health.Health;
import org.springframework.boot.actuate.health.HealthIndicator;
import org.springframework.stereotype.Component;

/**
 * HealthIndicator exposing current operational mode (RESEARCH vs DEV)
 * to prevent confusion between local offline development and real Kubernetes experiments.
 */
@Component("systemMode")
public class SystemModeHealthIndicator implements HealthIndicator {

    private final String mode;
    private final String datasourceUrl;

    public SystemModeHealthIndicator(
            @Value("${app.mode:research}") String mode,
            @Value("${spring.datasource.url:unknown}") String datasourceUrl) {
        this.mode = mode;
        this.datasourceUrl = datasourceUrl;
    }

    @Override
    public Health health() {
        boolean isResearchMode = "research".equalsIgnoreCase(mode);
        boolean isH2 = datasourceUrl.contains(":h2:");

        return Health.up()
                .withDetail("mode", mode.toUpperCase())
                .withDetail("isResearchMode", isResearchMode && !isH2)
                .withDetail("isDevSandbox", !isResearchMode || isH2)
                .withDetail("datasourceType", isH2 ? "H2_IN_MEMORY" : "POSTGRESQL")
                .build();
    }
}
