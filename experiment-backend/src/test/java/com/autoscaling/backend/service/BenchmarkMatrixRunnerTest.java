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
    void testRunOrSeedMatrix_EmptyDatabase_ReturnsEmptySummary() {
        when(experimentRepository.findAllByOrderByStartTimeDesc()).thenReturn(java.util.Collections.emptyList());

        BenchmarkMatrixSummaryResponse summary = matrixRunner.runOrSeedMatrix();

        assertNotNull(summary);
        assertEquals(5, summary.getTotalScenarios());
        assertEquals(0, summary.getTotalRuns());
        assertEquals(0, summary.getScenarioComparisons().size());
        assertEquals(0, summary.getAllRuns().size());
        assertEquals(0.0, summary.getOverallAverageP95ReductionPercent());
        assertNotNull(summary.getBenchmarkConclusion());
        assertTrue(summary.getBenchmarkConclusion().contains("No completed paired benchmark runs recorded yet"));
    }

    @Test
    void testGenerateCsvSummary_EmptySummary_ProducesValidHeaderOnly() {
        when(experimentRepository.findAllByOrderByStartTimeDesc()).thenReturn(java.util.Collections.emptyList());

        BenchmarkMatrixSummaryResponse summary = matrixRunner.runOrSeedMatrix();
        String csv = matrixRunner.generateCsvSummary(summary);

        assertNotNull(csv);
        assertTrue(csv.startsWith("Scenario,Mode,P95_Latency_ms"));
        assertEquals(1, csv.trim().split("\n").length); // Only the CSV header row
    }
}
