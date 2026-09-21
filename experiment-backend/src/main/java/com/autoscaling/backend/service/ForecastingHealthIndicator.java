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
 * Actuator HealthIndicator that strictly probes the configured Prophet forecasting-service health endpoint.
 * No silent secondary fallbacks.
 */
@Component("forecasting")
public class ForecastingHealthIndicator implements HealthIndicator {

    private static final Logger log = LoggerFactory.getLogger(ForecastingHealthIndicator.class);

    private final String configuredUrl;
    private final RestClient restClient;

    public ForecastingHealthIndicator(
            @Value("${app.forecasting.url:http://forecasting-service:8000}") String forecastingUrl) {
        this.configuredUrl = forecastingUrl;
        
        SimpleClientHttpRequestFactory factory = new SimpleClientHttpRequestFactory();
        factory.setConnectTimeout(800);
        factory.setReadTimeout(1200);

        this.restClient = RestClient.builder()
                .baseUrl(forecastingUrl)
                .requestFactory(factory)
                .build();
    }

    @Override
    @SuppressWarnings("unchecked")
    public Health health() {
        try {
            ResponseEntity<Map> response = restClient.get()
                    .uri("/health")
                    .retrieve()
                    .toEntity(Map.class);

            if (response.getStatusCode().is2xxSuccessful() && response.getBody() != null) {
                Map<String, Object> body = response.getBody();
                String status = String.valueOf(body.getOrDefault("status", "UNKNOWN"));
                boolean modelReady = Boolean.parseBoolean(String.valueOf(body.getOrDefault("model_ready", false)));

                if ("UP".equalsIgnoreCase(status)) {
                    boolean isK8s = configuredUrl.contains("forecasting-service") || configuredUrl.contains("8000");
                    return Health.up()
                            .withDetail("service", "forecasting-service")
                            .withDetail("modelReady", modelReady)
                            .withDetail("endpoint", configuredUrl + "/health")
                            .withDetail("isKubernetes", isK8s)
                            .build();
                }
            }
            return Health.down()
                    .withDetail("service", "forecasting-service")
                    .withDetail("status", "NON_UP_RESPONSE")
                    .withDetail("endpoint", configuredUrl + "/health")
                    .build();
        } catch (Exception ex) {
            log.debug("Forecasting health probe to {} failed: {}", configuredUrl, ex.getMessage());
            return Health.down()
                    .withDetail("service", "forecasting-service")
                    .withDetail("status", "UNAVAILABLE")
                    .withDetail("endpoint", configuredUrl + "/health")
                    .withDetail("error", ex.getMessage())
                    .build();
        }
    }
}
