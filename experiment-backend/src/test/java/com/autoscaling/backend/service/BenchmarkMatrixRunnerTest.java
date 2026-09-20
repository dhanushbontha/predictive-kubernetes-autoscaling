package com.autoscaling.backend.service;

import com.autoscaling.backend.dto.BenchmarkMatrixSummaryResponse;
import com.autoscaling.backend.repository.ExperimentRepository;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.util.Optional;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertNotNull;
import static org.junit.jupiter.api.Assertions.assertTrue;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
class BenchmarkMatrixRunnerTest {

    @Mock
    private KubernetesOrchestratorService kubernetesService;

    @Mock
    private PrometheusClientService prometheusClientService;

    @Mock
    private ExperimentRepository experimentRepository;

    private ExperimentLifecycleService lifecycleService;
    private BenchmarkMatrixRunner matrixRunner;

    @BeforeEach
    void setUp() {
        lifecycleService = new ExperimentLifecycleService(kubernetesService, prometheusClientService, experimentRepository);
        matrixRunner = new BenchmarkMatrixRunner(lifecycleService, experimentRepository);
    }

    @Test
    void testRunOrSeedMatrix_CalculatesAllScenariosAndRuns() {
        when(experimentRepository.findById(any())).thenReturn(Optional.empty());

        BenchmarkMatrixSummaryResponse summary = matrixRunner.runOrSeedMatrix();

        assertNotNull(summary);
        assertEquals(5, summary.getTotalScenarios());
        assertEquals(10, summary.getTotalRuns());
        assertEquals(5, summary.getScenarioComparisons().size());
        assertEquals(10, summary.getAllRuns().size());

        assertTrue(summary.getOverallAverageP95ReductionPercent() > 50.0);
        assertTrue(summary.getOverallAverageSloReductionPercent() > 70.0);
        assertTrue(summary.getOverallAverageScalingLeadTimeGainSeconds() > 10.0);
        assertNotNull(summary.getBenchmarkConclusion());
    }

    @Test
    void testGenerateCsvSummary_ProducesValidHeaderAndRows() {
        when(experimentRepository.findById(any())).thenReturn(Optional.empty());

        BenchmarkMatrixSummaryResponse summary = matrixRunner.runOrSeedMatrix();
        String csv = matrixRunner.generateCsvSummary(summary);

        assertNotNull(csv);
        assertTrue(csv.startsWith("Scenario,Mode,P95_Latency_ms"));
        assertTrue(csv.contains("BURSTY,REACTIVE_HPA"));
        assertTrue(csv.contains("BURSTY,PREDICTIVE_PROPHET_KEDA"));
        assertTrue(csv.contains("PERIODIC,PREDICTIVE_PROPHET_KEDA"));
    }
}
