# Predictive Kubernetes Autoscaling: Experimental Platform

A complete web-based experimental testbed and benchmarking platform to empirically measure, compare, and evaluate reactive Kubernetes Horizontal Pod Autoscaling (HPA) against predictive time-series autoscaling using Meta Prophet and KEDA (Kubernetes Event-driven Autoscaling).

---

## 1. Application Overview

The primary goal of this application is to answer the core engineering and systems question:
> *"When does predictive Kubernetes autoscaling provide a measurable benefit compared with reactive HPA, and when do forecast error or provisioning delay limit that benefit?"*

The platform automates the end-to-end experiment lifecycle:
- Synthetic workload generation via in-cluster **k6** load testing jobs across multiple synthetic patterns (Stable, Periodic, Gradual, Bursty, Noisy).
- Real-time performance monitoring and metric scraping via **Prometheus**.
- Predictive request-rate forecasting via a dedicated **Prophet + FastAPI** service.
- Dynamic autoscaling management toggling between native **Kubernetes HPA** and **KEDA Prometheus Scaler**.
- Complete experiment orchestration, lifecycle control, and state reset managed by a **Spring Boot Backend**.
- Live and historical visualization, side-by-side metric comparison, and metric export using a modern **React + Vite Dashboard**.
- Persistence of experiment configurations, status, and summary metrics in **PostgreSQL**.

---

## 2. High-Level Architecture

```
                         +-----------------------+
                         |    React Dashboard    |
                         +-----------+-----------+
                                     | (HTTP/REST)
                                     v
                         +-----------------------+
                         |   Experiment Backend  |
                         |      (Spring Boot)    |
                         +-----+-----------+-----+
                               |           |
             (Kubernetes API)  |           | (PromQL HTTP API)
                               v           v
                        +------------+   +------------+
                        | Kubernetes |   | Prometheus |
                        | Cluster    |   +------+-----+
                        +-----+------+          ^
                              |                 | (Scrapes Metrics)
          +-------------------+-----------------+-------------------+
          | In-Cluster Runtime                                          |
          |                                                             |
          |   +-----------+         +-------------------------------+   |
          |   |  k6 Job   | ------> |        workload-service       |   |
          |   +-----------+ (HTTP)  |     (Spring Boot on :8084)    |   |
          |                         +---------------+---------------+   |
          |                                         |                   |
          |                       +-----------------+-----------------+ |
          |                       |                                   | |
          |                       v                                   v |
          |              +-----------------+                 +--------+-+--+
          |              |  Reactive HPA   |                 | KEDA Scaler |
          |              | (CPU Threshold) |                 +------+------+
          |              +-----------------+                        ^
          |                                                         | (PromQL)
          |                                                +--------+-------+
          |                                                |   Prophet /    |
          |                                                |   FastAPI      |
          |                                                +----------------+
          +-------------------------------------------------------------+
```

---

## 3. Technology Stack

| Module | Primary Technology | Purpose |
| :--- | :--- | :--- |
| **workload-service** | Java 21, Spring Boot 3.x, Actuator, Micrometer | Target microservice executing deterministic CPU-intensive tasks |
| **experiment-backend** | Java 21, Spring Boot 3.x, Spring Data JPA, Fabric8 / K8s Client | Experiment orchestration, job dispatching, state reset, results aggregation |
| **forecasting-service** | Python 3.11+, Prophet, FastAPI, pandas, prometheus-client | Periodically trains time-series model on Prometheus data and emits predictions |
| **dashboard** | React 18+, Vite, Vanilla CSS, Recharts / Chart.js | Web UI for experiment control, live telemetry, and side-by-side strategy comparison |
| **k6** | Grafana k6 (Containerized inside K8s) | In-cluster synthetic load generation executing configurable JS scenarios |
| **Storage / DB** | PostgreSQL 16+ | Relational storage for experiment metadata, run parameters, and summary metrics |
| **Monitoring** | Prometheus / Prometheus Operator (kube-prometheus-stack) | Time-series metrics collection for CPU, memory, request rates, latencies, and forecasts |
| **Autoscaling** | Kubernetes HPA & KEDA v2 | Execution of reactive and metric-driven predictive scaling policies |

---

## 4. Repository Structure

```
predictive-kubernetes-autoscaling/
├── workload-service/          # Controlled CPU load target application (Java 21 / Spring Boot)
├── experiment-backend/        # Experiment control & lifecycle orchestrator (Java 21 / Spring Boot)
├── forecasting-service/       # Workload predictor using Prophet (Python / FastAPI)
├── dashboard/                 # Web dashboard for experiment control and visualization (React / Vite)
├── k6/                        # Synthetic workload test scripts (stable, periodic, gradual, bursty, noisy)
├── k8s/                       # Kubernetes manifests organized by subsystem
│   ├── workload/              # Deployment and Service definitions for workload-service
│   ├── monitoring/            # ServiceMonitor and Prometheus scrape definitions
│   ├── autoscaling/           # HPA and KEDA ScaledObject definitions
│   ├── k6/                    # ConfigMaps and Job templates for load generation
│   ├── forecasting/           # Deployment and Service for Prophet forecasting service
│   └── database/              # PostgreSQL Deployment, PVC, and Service definitions
├── results/                   # Benchmark output artifacts
│   ├── raw/                   # Immutable raw observations and time-series dumps
│   ├── summaries/             # Aggregated benchmark run summaries
│   ├── figures/               # Rendered comparison plots and charts
│   └── tables/                # Exported CSV / JSON metric tables
├── README.md                  # System and application documentation
└── .gitignore                 # Universal gitignore for multi-language workspace
```

---

## 5. Prerequisites

Before running the platform, ensure the following tools are installed on your host system:

- **Git** (v2.40+)
- **JDK 21** (Eclipse Temurin / OpenJDK 21)
- **Maven** (v3.9+)
- **Python** (v3.11+)
- **Node.js** (v20+ LTS) & **npm** (v10+)
- **Docker** (v26+)
- **Minikube** (v1.33+) or an active **Kubernetes** cluster (v1.28+)
- **kubectl** (v1.28+)
- **Helm** (v3.14+)

---

## 6. Local Setup

Clone the repository and inspect the workspace:

```bash
git clone https://github.com/<org>/predictive-kubernetes-autoscaling.git
cd predictive-kubernetes-autoscaling
```

---

## 7. Docker Setup

Build the local container images for each microservice module:

```bash
# 1. Build workload service image
docker build -t predictive-k8s/workload-service:latest ./workload-service

# 2. Build experiment backend image
docker build -t predictive-k8s/experiment-backend:latest ./experiment-backend

# 3. Build forecasting service image
docker build -t predictive-k8s/forecasting-service:latest ./forecasting-service

# 4. Build dashboard image (production build)
docker build -t predictive-k8s/dashboard:latest ./dashboard
```

---

## 8. Minikube Setup

Start a local Minikube cluster with adequate resource allocation:

```bash
# Start Minikube with required CPU and memory
minikube start --cpus=4 --memory=8192 --driver=docker

# Point local Docker CLI to Minikube's Docker daemon (optional for local image builds)
# Windows PowerShell:
& minikube -p minikube docker-env --shell powershell | Invoke-Expression

# Enable metrics-server addon
minikube addons enable metrics-server
```

---

## 9. Kubernetes Setup

Deploy cluster infrastructure manifests in sequence:

```bash
# Create application namespace
kubectl create namespace autoscaling-experiment

# Set default namespace context
kubectl config set-context --current --namespace=autoscaling-experiment

# Deploy PostgreSQL database
kubectl apply -f k8s/database/

# Deploy workload service and expose service
kubectl apply -f k8s/workload/
```

---

## 10. Prometheus Setup

Install Prometheus using the Prometheus Operator (`kube-prometheus-stack`):

```bash
helm repo add prometheus-community https://prometheus-community.github.io/helm-charts
helm repo update

helm install prometheus prometheus-community/kube-prometheus-stack \
  --namespace autoscaling-experiment \
  --set prometheus.prometheusSpec.serviceMonitorSelectorNilUsesHelmValues=false

# Apply workload service monitor
kubectl apply -f k8s/monitoring/
```

---

## 11. k6 Setup

Load generation scripts are stored as a Kubernetes ConfigMap and dispatched as Jobs:

```bash
# Create ConfigMap from k6 scripts
kubectl create configmap k6-workload-scripts \
  --from-file=k6/ \
  --namespace=autoscaling-experiment
```

---

## 12. Reactive HPA Configuration

Deploy the native Kubernetes Horizontal Pod Autoscaler targeting CPU utilization:

```bash
kubectl apply -f k8s/autoscaling/hpa.yaml
```

- **Target Metric**: CPU 50%
- **Min Replicas**: 1
- **Max Replicas**: 5

---

## 13. Prophet Forecasting Service

Deploy the Python-based Prophet forecasting microservice:

```bash
kubectl apply -f k8s/forecasting/
```

The forecasting service queries Prometheus for historical request rates on `/api/workload`, trains a Prophet time-series model, and exposes the custom gauge `predicted_workload_requests_per_second` on `:8000/metrics`.

---

## 14. KEDA Predictive Autoscaling

Install KEDA and deploy the custom Prometheus `ScaledObject`:

```bash
helm repo add kedacore https://kedacore.github.io/charts
helm repo update

helm install keda kedacore/keda --namespace autoscaling-experiment

# Apply KEDA ScaledObject for predictive scaling
kubectl apply -f k8s/autoscaling/keda-scaledobject.yaml
```

---

## 15. PostgreSQL Database

PostgreSQL holds experiment execution records and aggregated benchmark observations.
- Accessible in-cluster at `postgres.autoscaling-experiment.svc.cluster.local:5432`.
- **Note**: PostgreSQL is strictly isolated from the high-throughput `/api/workload` path.

---

## 16. Experiment Backend Service

Start the backend locally or deploy to Kubernetes:

```bash
# Running locally with Maven:
cd experiment-backend
mvn clean spring-boot:run
```

Key REST Endpoints:
- `POST /api/experiments/start` - Validates configuration, cleans cluster state, enables designated autoscaler, and launches k6 Job.
- `POST /api/experiments/stop` - Terminates running experiment and tears down active k6 Job.
- `GET /api/experiments/{id}` - Retrieves experiment configuration and execution metadata.
- `GET /api/dashboard/live` - Streams live cluster telemetry (replicas, CPU, memory, request rate, predicted rate, latencies).
- `GET /api/dashboard/comparison` - Returns paired comparative metrics between reactive HPA and predictive Prophet+KEDA runs.

---

## 17. React Dashboard

Launch the development frontend:

```bash
cd dashboard
npm install
npm run dev
```

The UI exposes:
1. **Experiment Control Panel**: Scenario selector (Stable, Periodic, Gradual, Bursty, Noisy), Autoscaling mode (HPA vs Prophet+KEDA), target RPS, run duration, SLO target, and forecast horizon.
2. **Live Monitoring Dashboard**: Real-time graphs for actual vs. predicted workload, active replica count, CPU/Memory utilization, and P95/P99 latencies.
3. **Historical Comparison Panel**: Side-by-side evaluation table and overlay charts.

---

## 18. Running an Experiment

1. Open the dashboard at `http://localhost:5173`.
2. Select a workload scenario (e.g. `Bursty`).
3. Select an autoscaling strategy (e.g. `Reactive HPA`).
4. Set Target RPS, Duration (e.g. `10m`), and SLO Latency Target (e.g. `200ms`).
5. Click **START EXPERIMENT**.
6. Monitor live metrics, replica provisioning, and latency behavior on the dashboard.

---

## 19. Comparing Experiments

1. Execute an identical scenario using `Prophet + KEDA` with a configured forecast horizon.
2. Navigate to the **Comparison View** in the dashboard.
3. Select Experiment A (HPA) and Experiment B (Prophet + KEDA).
4. Review measured comparative metrics:
   - Forecast MAE / RMSE (for predictive mode)
   - P95 / P99 Latencies
   - Total SLO Violations
   - Average and Peak Replicas
   - Average CPU and Memory Utilization
   - Scaling / Provisioning Delay ($D_{scale} = t_{ready} - t_{trigger}$)

---

## 20. Exporting Results

Raw experiment observations and summary tables can be exported directly via the dashboard or backend API:

```bash
# Export summary CSV
curl -o results/summaries/experiment_comparison.csv http://localhost:8080/api/experiments/export/csv
```

Files are archived under `results/`:
- `results/raw/`: Raw PromQL time-series metrics.
- `results/summaries/`: Computed aggregate statistics.
- `results/figures/`: Exported graphical plots.
- `results/tables/`: Generated CSV and JSON summaries.

---

## 21. Resetting the Environment

To return the Kubernetes cluster to a clean baseline between runs:

```bash
# Reset replicas to 1
kubectl scale deployment workload-service --replicas=1

# Delete completed k6 jobs
kubectl delete jobs -l app=k6-load-test

# Ensure mutually exclusive autoscalers are disabled
kubectl delete -f k8s/autoscaling/hpa.yaml --ignore-not-found=true
kubectl delete -f k8s/autoscaling/keda-scaledobject.yaml --ignore-not-found=true
```

---

## 22. Troubleshooting

- **Workload pods not scaling with HPA**: Verify `metrics-server` is active with `kubectl top pods`.
- **KEDA ScaledObject in Error state**: Verify the Prometheus service endpoint URL configured in the ScaledObject is reachable.
- **k6 Job fails to dispatch**: Verify the `k6-workload-scripts` ConfigMap is present in the namespace.
- **Port conflicts during local dev**: Default ports are `8084` (workload-service), `8080` (experiment-backend), `8000` (forecasting-service), and `5173` (dashboard).

---

## 23. Reproducing an Experiment

All experiment executions are deterministic:
1. Scenario configurations are specified in version-controlled k6 scripts under `k6/`.
2. Hardware resource requests/limits (`requests.cpu`, `limits.cpu`) are locked in `k8s/workload/deployment.yaml`.
3. The orchestration backend enforces a clean-state reset (1 ready pod) prior to launching each workload run.
