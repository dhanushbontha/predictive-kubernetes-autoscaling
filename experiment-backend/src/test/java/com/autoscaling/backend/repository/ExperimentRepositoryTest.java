package com.autoscaling.backend.repository;

import com.autoscaling.backend.entity.ExperimentEntity;
import com.autoscaling.backend.entity.ExperimentResultEntity;
import com.autoscaling.backend.entity.ScalingEventEntity;
import com.autoscaling.backend.model.AutoscalingMode;
import com.autoscaling.backend.model.ExperimentStatus;
import com.autoscaling.backend.model.WorkloadScenario;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.orm.jpa.DataJpaTest;

import java.time.Instant;
import java.util.Collections;
import java.util.List;
import java.util.Optional;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertNotNull;
import static org.junit.jupiter.api.Assertions.assertTrue;

@DataJpaTest
class ExperimentRepositoryTest {

    @Autowired
    private ExperimentRepository experimentRepository;

    @Test
    @DisplayName("Persists experiment with result and scaling events cleanly")
    void testPersistAndRetrieveExperiment() {
        ExperimentEntity entity = new ExperimentEntity();
        entity.setId("exp-db-test-1");
        entity.setName("Test DB Experiment");
        entity.setScenario(WorkloadScenario.PERIODIC);
        entity.setAutoscalingMode(AutoscalingMode.PREDICTIVE_PROPHET_KEDA);
        entity.setTargetRps(50);
        entity.setDurationSeconds(120);
        entity.setSloLatencyMs(150);
        entity.setForecastHorizonSeconds(30);
        entity.setStatus(ExperimentStatus.COMPLETED);
        entity.setStartTime(Instant.now().minusSeconds(120));
        entity.setEndTime(Instant.now());

        ExperimentResultEntity result = new ExperimentResultEntity();
        result.setExperiment(entity);
        result.setMae(1.85);
        result.setRmse(2.40);
        result.setP95LatencyMs(85.0);
        result.setP99LatencyMs(110.0);
        result.setAvgReplicas(2.5);
        result.setPeakReplicas(4);
        result.setAvgCpuPercent(48.2);
        result.setAvgMemoryBytes(256.0 * 1024 * 1024);
        result.setAvgScalingDelaySeconds(11.5);

        ScalingEventEntity event = new ScalingEventEntity(
                "workload-pod-1", Instant.now().minusSeconds(60), Instant.now().minusSeconds(55), Instant.now().minusSeconds(48), 12.0
        );
        result.setScalingEvents(Collections.singletonList(event));
        entity.setResult(result);

        experimentRepository.save(entity);

        Optional<ExperimentEntity> foundOpt = experimentRepository.findById("exp-db-test-1");
        assertTrue(foundOpt.isPresent());
        ExperimentEntity found = foundOpt.get();
        assertEquals("Test DB Experiment", found.getName());
        assertEquals(WorkloadScenario.PERIODIC, found.getScenario());
        assertEquals(AutoscalingMode.PREDICTIVE_PROPHET_KEDA, found.getAutoscalingMode());
        assertNotNull(found.getResult());
        assertEquals(1.85, found.getResult().getMae());
        assertEquals(1, found.getResult().getScalingEvents().size());
    }

    @Test
    @DisplayName("Find by scenario and autoscaling mode returns matching records")
    void testFindByScenarioAndAutoscalingMode() {
        ExperimentEntity hpaEntity = new ExperimentEntity();
        hpaEntity.setId("exp-hpa-1");
        hpaEntity.setName("HPA Run");
        hpaEntity.setScenario(WorkloadScenario.BURSTY);
        hpaEntity.setAutoscalingMode(AutoscalingMode.REACTIVE_HPA);
        hpaEntity.setTargetRps(80);
        hpaEntity.setDurationSeconds(60);
        hpaEntity.setSloLatencyMs(200);
        hpaEntity.setStatus(ExperimentStatus.COMPLETED);
        hpaEntity.setStartTime(Instant.now());
        experimentRepository.save(hpaEntity);

        List<ExperimentEntity> results = experimentRepository.findByScenarioAndAutoscalingMode(
                WorkloadScenario.BURSTY, AutoscalingMode.REACTIVE_HPA);
        assertEquals(1, results.size());
        assertEquals("exp-hpa-1", results.get(0).getId());
    }
}
