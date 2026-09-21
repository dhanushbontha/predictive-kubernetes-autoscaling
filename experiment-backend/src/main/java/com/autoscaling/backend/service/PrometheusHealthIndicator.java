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

/**
 * Actuator HealthIndicator that strictly probes the configured Prometheus server /-/healthy endpoint.
 */
@Component("prometheus")
public class PrometheusHealthIndicator implements HealthIndicator {

    private static final Logger log = LoggerFactory.getLogger(PrometheusHealthIndicator.class);

    private final String prometheusUrl;
    private final RestClient restClient;

    public PrometheusHealthIndicator(
            @Value("${app.prometheus.url:http://prometheus-kube-prometheus-prometheus.monitoring.svc.cluster.local:9090}") String prometheusUrl) {
        this.prometheusUrl = prometheusUrl;

        SimpleClientHttpRequestFactory factory = new SimpleClientHttpRequestFactory();
        factory.setConnectTimeout(800);
        factory.setReadTimeout(1200);

        this.restClient = RestClient.builder()
                .baseUrl(prometheusUrl)
                .requestFactory(factory)
                .build();
    }

    @Override
    public Health health() {
        try {
            ResponseEntity<String> response = restClient.get()
                    .uri("/-/healthy")
                    .retrieve()
                    .toEntity(String.class);

            if (response.getStatusCode().is2xxSuccessful()) {
                return Health.up()
                        .withDetail("service", "prometheus")
                        .withDetail("endpoint", prometheusUrl)
                        .build();
            }
            return Health.down()
                    .withDetail("service", "prometheus")
                    .withDetail("status", "UNHEALTHY")
                    .withDetail("endpoint", prometheusUrl)
                    .build();
        } catch (Exception ex) {
            log.debug("Prometheus health probe to {} failed: {}", prometheusUrl, ex.getMessage());
            return Health.down()
                    .withDetail("service", "prometheus")
                    .withDetail("status", "UNAVAILABLE")
                    .withDetail("endpoint", prometheusUrl)
                    .withDetail("error", ex.getMessage())
                    .build();
        }
    }
}
