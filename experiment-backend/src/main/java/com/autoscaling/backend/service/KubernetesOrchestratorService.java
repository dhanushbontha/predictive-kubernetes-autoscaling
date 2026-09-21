package com.autoscaling.backend.service;

import com.autoscaling.backend.model.WorkloadScenario;
import io.fabric8.kubernetes.api.model.ConfigMapVolumeSourceBuilder;
import io.fabric8.kubernetes.api.model.ContainerBuilder;
import io.fabric8.kubernetes.api.model.EnvVarBuilder;
import io.fabric8.kubernetes.api.model.GenericKubernetesResource;
import io.fabric8.kubernetes.api.model.ObjectMetaBuilder;
import io.fabric8.kubernetes.api.model.Pod;
import io.fabric8.kubernetes.api.model.PodList;
import io.fabric8.kubernetes.api.model.PodSpecBuilder;
import io.fabric8.kubernetes.api.model.PodTemplateSpecBuilder;
import io.fabric8.kubernetes.api.model.Quantity;
import io.fabric8.kubernetes.api.model.ResourceRequirementsBuilder;
import io.fabric8.kubernetes.api.model.VolumeBuilder;
import io.fabric8.kubernetes.api.model.VolumeMountBuilder;
import io.fabric8.kubernetes.api.model.apps.Deployment;
import io.fabric8.kubernetes.api.model.autoscaling.v2.HorizontalPodAutoscaler;
import io.fabric8.kubernetes.api.model.autoscaling.v2.HorizontalPodAutoscalerBuilder;
import io.fabric8.kubernetes.api.model.autoscaling.v2.MetricSpecBuilder;
import io.fabric8.kubernetes.api.model.autoscaling.v2.MetricTargetBuilder;
import io.fabric8.kubernetes.api.model.autoscaling.v2.ResourceMetricSourceBuilder;
import io.fabric8.kubernetes.api.model.batch.v1.Job;
import io.fabric8.kubernetes.api.model.batch.v1.JobBuilder;
import io.fabric8.kubernetes.api.model.batch.v1.JobSpecBuilder;
import io.fabric8.kubernetes.client.Config;
import io.fabric8.kubernetes.client.ConfigBuilder;
import io.fabric8.kubernetes.client.KubernetesClient;
import io.fabric8.kubernetes.client.KubernetesClientBuilder;
import io.fabric8.kubernetes.client.dsl.base.CustomResourceDefinitionContext;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;

import java.util.ArrayList;
import java.util.Collections;
import java.util.HashMap;
import java.util.List;
import java.util.Map;

/**
 * Service orchestrating Kubernetes resources (Deployments, Jobs, HPAs, KEDA ScaledObjects)
 * via the official Fabric8 Kubernetes Client.
 */
@Service
public class KubernetesOrchestratorService {

    private static final Logger log = LoggerFactory.getLogger(KubernetesOrchestratorService.class);

    @Value("${app.kubernetes.namespace:autoscaling-experiment}")
    private String defaultNamespace;

    @Value("${app.kubernetes.workload-deployment:workload-service}")
    private String workloadDeploymentName;

    @Value("${app.kubernetes.k6-configmap:k6-workload-scripts}")
    private String k6ConfigMapName;

    private final KubernetesClient kubernetesClient;

    public KubernetesOrchestratorService() {
        KubernetesClient client;
        try {
            Config config = new ConfigBuilder()
                    .withConnectionTimeout(1000)
                    .withRequestTimeout(1000)
                    .build();
            client = new KubernetesClientBuilder().withConfig(config).build();
            log.info("Initialized Fabric8 Kubernetes Client successfully for master: {}", client.getMasterUrl());
        } catch (Exception ex) {
            log.warn("Could not automatically connect to Kubernetes cluster ({}), fallback client initialized", ex.getMessage());
            client = new KubernetesClientBuilder().build();
        }
        this.kubernetesClient = client;
    }

    public KubernetesOrchestratorService(KubernetesClient kubernetesClient) {
        this.kubernetesClient = kubernetesClient;
    }

    public KubernetesClient getKubernetesClient() {
        return this.kubernetesClient;
    }

    public String resolveNamespace(String namespace) {
        return (namespace != null && !namespace.isBlank()) ? namespace : defaultNamespace;
    }

    /**
     * Resets the workload-service deployment to the target replica count (1 by default).
     */
    public void scaleWorkloadDeployment(String namespace, int targetReplicas) {
        String ns = resolveNamespace(namespace);
        try {
            log.info("Scaling deployment {} in namespace {} to {} replicas", workloadDeploymentName, ns, targetReplicas);
            kubernetesClient.apps().deployments().inNamespace(ns).withName(workloadDeploymentName).scale(targetReplicas);
        } catch (Exception ex) {
            log.warn("Failed to scale deployment {}: {}", workloadDeploymentName, ex.getMessage());
        }
    }

    /**
     * Queries active ready pod count for workload-service with fast non-blocking timeout.
     */
    public int getWorkloadReadyReplicas(String namespace) {
        String ns = resolveNamespace(namespace);
        try {
            return java.util.concurrent.CompletableFuture.supplyAsync(() -> {
                try {
                    Deployment dep = kubernetesClient.apps().deployments().inNamespace(ns).withName(workloadDeploymentName).get();
                    if (dep != null && dep.getStatus() != null && dep.getStatus().getReadyReplicas() != null) {
                        return dep.getStatus().getReadyReplicas();
                    }
                } catch (Exception ex) {
                    // ignore
                }
                return 0;
            }).get(400, java.util.concurrent.TimeUnit.MILLISECONDS);
        } catch (Exception ex) {
            // Cluster unavailable or timeout
        }
        return 0;
    }

    /**
     * Retrieves all pods associated with the workload-service deployment.
     */
    public List<Pod> getWorkloadPods(String namespace) {
        String ns = resolveNamespace(namespace);
        try {
            PodList podList = kubernetesClient.pods().inNamespace(ns).withLabel("app", workloadDeploymentName).list();
            return podList != null ? podList.getItems() : Collections.emptyList();
        } catch (Exception ex) {
            log.warn("Error listing pods for {}: {}", workloadDeploymentName, ex.getMessage());
            return Collections.emptyList();
        }
    }

    /**
     * Enables reactive HorizontalPodAutoscaler on workload-service.
     */
    public void enableHpa(String namespace) {
        String ns = resolveNamespace(namespace);
        try {
            log.info("Enabling Reactive HPA in namespace {}", ns);
            HorizontalPodAutoscaler hpa = new HorizontalPodAutoscalerBuilder()
                    .withNewMetadata()
                        .withName("workload-service-hpa")
                        .withNamespace(ns)
                        .addToLabels("app", workloadDeploymentName)
                        .addToLabels("autoscaler", "reactive-hpa")
                    .endMetadata()
                    .withNewSpec()
                        .withNewScaleTargetRef()
                            .withApiVersion("apps/v1")
                            .withKind("Deployment")
                            .withName(workloadDeploymentName)
                        .endScaleTargetRef()
                        .withMinReplicas(1)
                        .withMaxReplicas(5)
                        .withMetrics(new MetricSpecBuilder()
                                .withType("Resource")
                                .withResource(new ResourceMetricSourceBuilder()
                                        .withName("cpu")
                                        .withTarget(new MetricTargetBuilder()
                                                .withType("Utilization")
                                                .withAverageUtilization(50)
                                                .build())
                                        .build())
                                .build())
                    .endSpec()
                    .build();

            kubernetesClient.autoscaling().v2().horizontalPodAutoscalers().inNamespace(ns).resource(hpa).createOrReplace();
        } catch (Exception ex) {
            log.warn("Failed to enable HPA: {}", ex.getMessage());
        }
    }

    /**
     * Disables reactive HorizontalPodAutoscaler.
     */
    public void disableHpa(String namespace) {
        String ns = resolveNamespace(namespace);
        try {
            log.info("Disabling Reactive HPA in namespace {}", ns);
            kubernetesClient.autoscaling().v2().horizontalPodAutoscalers().inNamespace(ns).withName("workload-service-hpa").delete();
        } catch (Exception ex) {
            log.debug("HPA disable info: {}", ex.getMessage());
        }
    }

    /**
     * Enables KEDA ScaledObject for predictive autoscaling.
     */
    public void enableKeda(String namespace) {
        String ns = resolveNamespace(namespace);
        try {
            log.info("Enabling KEDA ScaledObject in namespace {}", ns);
            CustomResourceDefinitionContext crdContext = new CustomResourceDefinitionContext.Builder()
                    .withGroup("keda.sh")
                    .withVersion("v1alpha1")
                    .withScope("Namespaced")
                    .withPlural("scaledobjects")
                    .build();

            Map<String, Object> spec = new HashMap<>();
            Map<String, Object> scaleTargetRef = new HashMap<>();
            scaleTargetRef.put("name", workloadDeploymentName);
            spec.put("scaleTargetRef", scaleTargetRef);
            spec.put("minReplicaCount", 1);
            spec.put("maxReplicaCount", 5);
            spec.put("cooldownPeriod", 30);
            spec.put("pollingInterval", 5);

            Map<String, Object> trigger = new HashMap<>();
            trigger.put("type", "prometheus");
            Map<String, String> metadataTrigger = new HashMap<>();
            metadataTrigger.put("serverAddress", "http://prometheus-kube-prometheus-prometheus.monitoring.svc.cluster.local:9090");
            metadataTrigger.put("metricName", "predicted_workload_requests_per_second");
            metadataTrigger.put("query", "predicted_workload_requests_per_second");
            metadataTrigger.put("threshold", "20");
            trigger.put("metadata", metadataTrigger);

            spec.put("triggers", List.of(trigger));

            GenericKubernetesResource scaledObject = new GenericKubernetesResource();
            scaledObject.setApiVersion("keda.sh/v1alpha1");
            scaledObject.setKind("ScaledObject");
            scaledObject.setMetadata(new ObjectMetaBuilder()
                    .withName("workload-service-keda")
                    .withNamespace(ns)
                    .build());
            scaledObject.setAdditionalProperties(Collections.singletonMap("spec", spec));

            kubernetesClient.genericKubernetesResources(crdContext).inNamespace(ns).resource(scaledObject).createOrReplace();
        } catch (Exception ex) {
            log.warn("Failed to enable KEDA ScaledObject: {}", ex.getMessage());
        }
    }

    /**
     * Disables KEDA ScaledObject.
     */
    public void disableKeda(String namespace) {
        String ns = resolveNamespace(namespace);
        try {
            log.info("Disabling KEDA ScaledObject in namespace {}", ns);
            CustomResourceDefinitionContext crdContext = new CustomResourceDefinitionContext.Builder()
                    .withGroup("keda.sh")
                    .withVersion("v1alpha1")
                    .withScope("Namespaced")
                    .withPlural("scaledobjects")
                    .build();

            kubernetesClient.genericKubernetesResources(crdContext).inNamespace(ns).withName("workload-service-keda").delete();
        } catch (Exception ex) {
            log.debug("KEDA disable info: {}", ex.getMessage());
        }
    }

    /**
     * Cleans up any existing k6 benchmark jobs.
     */
    public void cleanPreviousK6Jobs(String namespace) {
        String ns = resolveNamespace(namespace);
        try {
            log.info("Cleaning previous k6 jobs in namespace {}", ns);
            kubernetesClient.batch().v1().jobs().inNamespace(ns).withLabel("app", "k6-load-test").delete();
        } catch (Exception ex) {
            log.warn("Failed cleaning previous k6 jobs: {}", ex.getMessage());
        }
    }

    /**
     * Dispatches an in-cluster k6 Kubernetes Job for the specified scenario.
     */
    public Job dispatchK6Job(String namespace, String experimentId, WorkloadScenario scenario, int targetRps, int durationSeconds) {
        String ns = resolveNamespace(namespace);
        String jobName = "k6-job-" + experimentId.toLowerCase();
        String scriptName = scenario.getScriptFileName();

        log.info("Dispatching k6 Job {} with scenario {} (RPS: {}, Duration: {}s)", jobName, scriptName, targetRps, durationSeconds);

        Job job = new JobBuilder()
                .withMetadata(new ObjectMetaBuilder()
                        .withName(jobName)
                        .withNamespace(ns)
                        .addToLabels("app", "k6-load-test")
                        .addToLabels("experiment-id", experimentId)
                        .addToLabels("scenario", scenario.name().toLowerCase())
                        .build())
                .withSpec(new JobSpecBuilder()
                        .withBackoffLimit(0)
                        .withTtlSecondsAfterFinished(300)
                        .withTemplate(new PodTemplateSpecBuilder()
                                .withMetadata(new ObjectMetaBuilder()
                                        .addToLabels("app", "k6-load-test")
                                        .addToLabels("experiment-id", experimentId)
                                        .build())
                                .withSpec(new PodSpecBuilder()
                                        .withRestartPolicy("Never")
                                        .withContainers(new ContainerBuilder()
                                                .withName("k6")
                                                .withImage("grafana/k6:0.54.0")
                                                .withArgs("run", "/scripts/" + scriptName)
                                                .withEnv(
                                                        new EnvVarBuilder().withName("TARGET_URL").withValue("http://workload-service:8084").build(),
                                                        new EnvVarBuilder().withName("TARGET_RPS").withValue(String.valueOf(targetRps)).build(),
                                                        new EnvVarBuilder().withName("DURATION").withValue(durationSeconds + "s").build()
                                                )
                                                .withResources(new ResourceRequirementsBuilder()
                                                        .addToRequests("cpu", new Quantity("100m"))
                                                        .addToRequests("memory", new Quantity("128Mi"))
                                                        .addToLimits("cpu", new Quantity("500m"))
                                                        .addToLimits("memory", new Quantity("512Mi"))
                                                        .build())
                                                .withVolumeMounts(new VolumeMountBuilder()
                                                        .withName("k6-scripts-volume")
                                                        .withMountPath("/scripts")
                                                        .withReadOnly(true)
                                                        .build())
                                                .build())
                                        .withVolumes(new VolumeBuilder()
                                                .withName("k6-scripts-volume")
                                                .withConfigMap(new ConfigMapVolumeSourceBuilder()
                                                        .withName(k6ConfigMapName)
                                                        .withDefaultMode(0777)
                                                        .build())
                                                .build())
                                        .build())
                                .build())
                        .build())
                .build();

        return kubernetesClient.batch().v1().jobs().inNamespace(ns).resource(job).createOrReplace();
    }

    /**
     * Extracts genuine pod scaling events by inspecting Kubernetes Pod lifecycle condition timestamps.
     * D_scale = t_ready - t_trigger
     */
    public List<com.autoscaling.backend.model.ScalingEvent> extractScalingEvents(String namespace, java.time.Instant triggerTime, java.time.Instant endTime) {
        String ns = resolveNamespace(namespace);
        List<com.autoscaling.backend.model.ScalingEvent> events = new ArrayList<>();
        try {
            List<Pod> pods = getWorkloadPods(ns);
            for (Pod pod : pods) {
                String podName = pod.getMetadata() != null ? pod.getMetadata().getName() : "unknown";
                java.time.Instant creationTime = null;
                if (pod.getMetadata() != null && pod.getMetadata().getCreationTimestamp() != null) {
                    try {
                        creationTime = java.time.Instant.parse(pod.getMetadata().getCreationTimestamp());
                    } catch (Exception ex) {
                        log.debug("Could not parse pod creation timestamp: {}", ex.getMessage());
                    }
                }

                java.time.Instant readyTime = null;
                if (pod.getStatus() != null && pod.getStatus().getConditions() != null) {
                    for (var cond : pod.getStatus().getConditions()) {
                        if ("Ready".equalsIgnoreCase(cond.getType()) && "True".equalsIgnoreCase(cond.getStatus())) {
                            if (cond.getLastTransitionTime() != null) {
                                try {
                                    readyTime = java.time.Instant.parse(cond.getLastTransitionTime());
                                } catch (Exception ex) {
                                    log.debug("Could not parse pod ready timestamp: {}", ex.getMessage());
                                }
                            }
                        }
                    }
                }

                // If pod became ready after trigger time or was created during the experiment window
                if (readyTime != null && triggerTime != null) {
                    if (readyTime.isAfter(triggerTime) || (creationTime != null && creationTime.isAfter(triggerTime))) {
                        double delaySec = Math.max(0.0, java.time.Duration.between(triggerTime, readyTime).toMillis() / 1000.0);
                        events.add(new com.autoscaling.backend.model.ScalingEvent(podName, triggerTime, creationTime != null ? creationTime : triggerTime, readyTime, delaySec));
                        log.info("Captured genuine Pod Ready scaling event: pod={}, t_trigger={}, t_ready={}, D_scale={}s",
                                podName, triggerTime, readyTime, delaySec);
                    }
                }
            }
        } catch (Exception ex) {
            log.warn("Failed extracting Kubernetes scaling events: {}", ex.getMessage());
        }
        return events;
    }

    /**
     * Checks if a k6 Job has completed.
     */
    public boolean isJobCompleted(String namespace, String experimentId) {
        String ns = resolveNamespace(namespace);
        String jobName = "k6-job-" + experimentId.toLowerCase();
        try {
            Job job = kubernetesClient.batch().v1().jobs().inNamespace(ns).withName(jobName).get();
            if (job != null && job.getStatus() != null) {
                Integer succeeded = job.getStatus().getSucceeded();
                Integer failed = job.getStatus().getFailed();
                return (succeeded != null && succeeded > 0) || (failed != null && failed > 0);
            }
        } catch (Exception ex) {
            log.debug("Job status query: {}", ex.getMessage());
        }
        return false;
    }
}
