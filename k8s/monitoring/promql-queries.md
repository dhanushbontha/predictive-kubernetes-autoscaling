# Prometheus PromQL Queries Reference

This document defines the exact PromQL queries utilized across the experimental platform by the **Experiment Backend**, **Forecasting Service**, and **KEDA Scaler**.

---

## 1. Workload Request Rate (Requests Per Second)

Filters exclusively for `/api/workload` traffic, preventing Actuator scrape noise from skewing experimental results:

```promql
sum(rate(http_server_requests_seconds_count{job="workload-service", uri="/api/workload"}[1m]))
```

Instantaneous rate over 15s window:
```promql
sum(rate(http_server_requests_seconds_count{job="workload-service", uri="/api/workload"}[15s]))
```

---

## 2. Latency Percentiles (SLO Monitoring)

### P95 Latency (Seconds)
```promql
histogram_quantile(0.95, sum(rate(http_server_requests_seconds_bucket{job="workload-service", uri="/api/workload"}[1m])) by (le))
```

### P99 Latency (Seconds)
```promql
histogram_quantile(0.99, sum(rate(http_server_requests_seconds_bucket{job="workload-service", uri="/api/workload"}[1m])) by (le))
```

---

## 3. Pod Replicas

### Total Ready Pods
```promql
kube_deployment_status_replicas_ready{deployment="workload-service"}
```

---

## 4. Container Resource Utilization

### Average CPU Utilization (%)
```promql
sum(rate(container_cpu_usage_seconds_total{container="workload-service"}[1m])) / sum(kube_pod_container_resource_requests{container="workload-service", resource="cpu"}) * 100
```

### Average Memory Utilization (Bytes)
```promql
sum(container_memory_working_set_bytes{container="workload-service"})
```

---

## 5. Forecast Metric (Emitted by Forecasting Service)

### Predicted Workload Rate (RPS)
```promql
predicted_workload_requests_per_second
```
