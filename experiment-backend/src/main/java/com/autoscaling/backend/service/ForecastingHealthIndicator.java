package com.autoscaling.backend.service;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.boot.actuate.health.Health;
import org.springframework.boot.actuate.health.HealthIndicator;
import org.springframework.http.ResponseEntity;
import org.springframework.http.client.SimpleClientHttpRequestFactory;
import org.springframework.stereotype.Component;
import org.springframework.web.client.RestClient;

import java.util.Map;

/**
 * Actuator HealthIndicator that probes the real Python FastAPI forecasting service /health endpoint.
 * Supports Kubernetes DNS (http://forecasting-service:8000) and local dev environments.
 */
@Component("forecasting")
public class ForecastingHealthIndicator implements HealthIndicator {

    private static final Logger log = LoggerFactory.getLogger(ForecastingHealthIndicator.class);

    private final String primaryUrl;
    private final RestClient primaryClient;
    private final RestClient localFallbackClient;

    public ForecastingHealthIndicator(
            @Value("${app.forecasting.url:http://forecasting-service:8000}") String forecastingUrl) {
        this.primaryUrl = forecastingUrl;
        
        SimpleClientHttpRequestFactory factory = new SimpleClientHttpRequestFactory();
        factory.setConnectTimeout(800);
        factory.setReadTimeout(1200);

        this.primaryClient = RestClient.builder()
                .baseUrl(forecastingUrl)
                .requestFactory(factory)
                .build();

        this.localFallbackClient = RestClient.builder()
                .baseUrl("http://localhost:8000")
                .requestFactory(factory)
                .build();
    }

    @Override
    public Health health() {
        // 1. Try primary configured endpoint (Kubernetes Service DNS)
        Health primaryHealth = probeUrl(primaryClient, primaryUrl);
        if (primaryHealth != null) {
            return primaryHealth;
        }

        // 2. If primary is not localhost and was unreachable (e.g. local dev outside k8s), try localhost
        if (!primaryUrl.contains("localhost") && !primaryUrl.contains("127.0.0.1")) {
            Health localHealth = probeUrl(localFallbackClient, "http://localhost:8000");
            if (localHealth != null) {
                return localHealth;
            }
        }

        return Health.down()
                .withDetail("service", "forecasting-service")
                .withDetail("status", "UNAVAILABLE")
                .withDetail("probedUrl", primaryUrl)
                .build();
    }

    @SuppressWarnings("unchecked")
    private Health probeUrl(RestClient client, String targetUrl) {
        try {
            ResponseEntity<Map> response = client.get()
                    .uri("/health")
                    .retrieve()
                    .toEntity(Map.class);

            if (response.getStatusCode().is2xxSuccessful() && response.getBody() != null) {
                Map<String, Object> body = response.getBody();
                String status = String.valueOf(body.getOrDefault("status", "UNKNOWN"));
                boolean modelReady = Boolean.parseBoolean(String.valueOf(body.getOrDefault("model_ready", false)));

                if ("UP".equalsIgnoreCase(status)) {
                    return Health.up()
                            .withDetail("service", "forecasting-service")
                            .withDetail("modelReady", modelReady)
                            .withDetail("endpoint", targetUrl + "/health")
                            .build();
                }
            }
        } catch (Exception ex) {
            log.debug("Forecasting health probe to {} failed: {}", targetUrl, ex.getMessage());
        }
        return null;
    }
}
