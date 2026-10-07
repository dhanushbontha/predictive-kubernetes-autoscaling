package com.autoscaling.backend.service;

import com.autoscaling.backend.model.AutoscalingMode;
import com.autoscaling.backend.model.Experiment;
import com.autoscaling.backend.model.ExperimentResult;
import com.autoscaling.backend.model.ScalingEvent;
import com.autoscaling.backend.model.WorkloadScenario;
import io.fabric8.kubernetes.api.model.Pod;
import io.fabric8.kubernetes.api.model.PodBuilder;
import io.fabric8.kubernetes.api.model.PodConditionBuilder;
import io.fabric8.kubernetes.api.model.PodList;
import io.fabric8.kubernetes.api.model.PodListBuilder;
import io.fabric8.kubernetes.client.KubernetesClient;
import io.fabric8.kubernetes.client.dsl.MixedOperation;
import io.fabric8.kubernetes.client.dsl.NonNamespaceOperation;
import io.fabric8.kubernetes.client.dsl.PodResource;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;

import java.time.Instant;
import java.util.List;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertNotNull;
import static org.junit.jupiter.api.Assertions.assertNull;
import static org.junit.jupiter.api.Assertions.assertTrue;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.when;

class ScalingTelemetryServiceTest {

    @Test
    @DisplayName("Verify timing metric identity: D_E2E = D_detect+sched + D_provision")
    void testTimingMetricIdentity() {
        Instant t0 = Instant.parse("2026-10-07T12:00:00Z");
        Instant tCreation = Instant.parse("2026-10-07T12:00:15Z");
        Instant tReady = Instant.parse("2026-10-07T12:00:27Z");

        double dE2e = (tReady.toEpochMilli() - t0.toEpochMilli()) / 1000.0;
        double dDetectSched = (tCreation.toEpochMilli() - t0.toEpochMilli()) / 1000.0;
        double dProvision = (tReady.toEpochMilli() - tCreation.toEpochMilli()) / 1000.0;

        assertEquals(27.0, dE2e);
        assertEquals(15.0, dDetectSched);
        assertEquals(12.0, dProvision);
        assertEquals(dE2e, dDetectSched + dProvision, 0.0001);

        ScalingEvent event = new ScalingEvent("workload-pod-2", t0, tCreation, tReady, dE2e, dProvision, dDetectSched);
        assertEquals(27.0, event.getScalingDelaySeconds());
        assertEquals(15.0, event.getDetectionSchedulingDelaySeconds());
        assertEquals(12.0, event.getProvisioningDelaySeconds());
    }

    @Test
    @DisplayName("Verify unready scale-out pod preserves N/A for D_E2E and D_provision")
    void testUnreadyPodProducesNullReadinessMetrics() {
        Instant t0 = Instant.parse("2026-10-07T12:00:00Z");
        Instant tCreation = Instant.parse("2026-10-07T12:00:15Z");

        double dDetectSched = (tCreation.toEpochMilli() - t0.toEpochMilli()) / 1000.0;

        // Pod created but never Ready
        ScalingEvent unreadyEvent = new ScalingEvent("workload-pod-unready", t0, tCreation, null, null, null, dDetectSched);
        assertEquals(15.0, unreadyEvent.getDetectionSchedulingDelaySeconds());
        assertNull(unreadyEvent.getPodReadyTime());
        assertNull(unreadyEvent.getScalingDelaySeconds());
        assertNull(unreadyEvent.getProvisioningDelaySeconds());
    }

    @Test
    @DisplayName("Verify extractScalingEvents from mocked Kubernetes Pods")
    void testExtractScalingEventsFromPods() {
        KubernetesClient mockClient = mock(KubernetesClient.class);
        var mockPodsOp = mock(MixedOperation.class);
        var mockNonNsOp = mock(NonNamespaceOperation.class);
        var mockLabeledOp = mock(NonNamespaceOperation.class);

        when(mockClient.pods()).thenReturn(mockPodsOp);
        when(mockPodsOp.inNamespace(any())).thenReturn(mockNonNsOp);
        when(mockNonNsOp.withLabel(eq("app"), any())).thenReturn(mockLabeledOp);

        Instant t0 = Instant.parse("2026-10-07T12:00:00Z");
        Instant tCreation = Instant.parse("2026-10-07T12:00:10Z");
        Instant tReady = Instant.parse("2026-10-07T12:00:22Z");
        Instant tEnd = Instant.parse("2026-10-07T12:03:00Z");

        // Old base pod created before experiment
        Pod basePod = new PodBuilder()
                .withNewMetadata()
                    .withName("workload-service-base")
                    .withCreationTimestamp("2026-10-07T11:55:00Z")
                .endMetadata()
                .withNewStatus()
                    .addNewCondition()
                        .withType("Ready")
                        .withStatus("True")
                        .withLastTransitionTime("2026-10-07T11:55:10Z")
                    .endCondition()
                .endStatus()
                .build();

        // Scale-out pod created during experiment and ready
        Pod scaledPod = new PodBuilder()
                .withNewMetadata()
                    .withName("workload-service-scaled-1")
                    .withCreationTimestamp(tCreation.toString())
                .endMetadata()
                .withNewStatus()
                    .addNewCondition()
                        .withType("Ready")
                        .withStatus("True")
                        .withLastTransitionTime(tReady.toString())
                    .endCondition()
                .endStatus()
                .build();

        // Scale-out pod created during experiment but NOT ready
        Pod unreadyPod = new PodBuilder()
                .withNewMetadata()
                    .withName("workload-service-unready")
                    .withCreationTimestamp("2026-10-07T12:01:00Z")
                .endMetadata()
                .withNewStatus()
                    .addNewCondition()
                        .withType("Ready")
                        .withStatus("False")
                    .endCondition()
                .endStatus()
                .build();

        PodList podList = new PodListBuilder().withItems(basePod, scaledPod, unreadyPod).build();
        when(mockLabeledOp.list()).thenReturn(podList);

        KubernetesOrchestratorService orchestrator = new KubernetesOrchestratorService(mockClient);
        List<ScalingEvent> events = orchestrator.extractScalingEvents("autoscaling-experiment", t0, tEnd);

        // Should filter out basePod (created before t0) and include scaledPod and unreadyPod
        assertEquals(2, events.size());

        // Scaled ready pod
        ScalingEvent readyEv = events.stream().filter(e -> "workload-service-scaled-1".equals(e.getPodName())).findFirst().orElseThrow();
        assertEquals(10.0, readyEv.getDetectionSchedulingDelaySeconds(), 0.001);
        assertEquals(12.0, readyEv.getProvisioningDelaySeconds(), 0.001);
        assertEquals(22.0, readyEv.getScalingDelaySeconds(), 0.001);
        assertEquals(readyEv.getScalingDelaySeconds(), readyEv.getDetectionSchedulingDelaySeconds() + readyEv.getProvisioningDelaySeconds(), 0.0001);

        // Unready pod
        ScalingEvent unreadyEv = events.stream().filter(e -> "workload-service-unready".equals(e.getPodName())).findFirst().orElseThrow();
        assertEquals(60.0, unreadyEv.getDetectionSchedulingDelaySeconds(), 0.001);
        assertNull(unreadyEv.getPodReadyTime());
        assertNull(unreadyEv.getScalingDelaySeconds());
        assertNull(unreadyEv.getProvisioningDelaySeconds());
    }
}
