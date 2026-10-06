import React, { useState, useEffect, useCallback, useRef } from 'react';
import { Activity, Scale, Database, Sparkles } from 'lucide-react';
import Header from './components/Header';
import ActiveExperimentBanner from './components/ActiveExperimentBanner';
import MetricsOverview from './components/MetricsOverview';
import ExperimentLauncher from './components/ExperimentLauncher';
import TelemetryCharts from './components/TelemetryCharts';
import ClusterStatus from './components/ClusterStatus';
import HistoryView from './components/HistoryView';
import ComparisonView from './components/ComparisonView';
import { checkHealth, getActiveExperiment, startExperiment, stopExperiment, getLiveSeries, getExperimentHistory, getLiveTelemetry } from './services/api';
import { isDemoExperiment } from './services/researchMatrix';

const DEFAULT_METRICS = {
  currentReplicas: null,
  avgCpuPercent: null,
  currentRps: null,
  predictedRps: null,
  p95LatencyMs: null,
  p99LatencyMs: null,
  sloViolationRate: null,
  totalRequests: null,
  mae: null,
  rmse: null,
};

function loadSessionJson(key, defaultValue) {
  try {
    const raw = sessionStorage.getItem(key);
    if (!raw) return defaultValue;
    return JSON.parse(raw);
  } catch {
    return defaultValue;
  }
}

function saveSessionJson(key, value) {
  try {
    if (value === undefined || value === null) {
      sessionStorage.removeItem(key);
    } else {
      sessionStorage.setItem(key, JSON.stringify(value));
    }
  } catch {}
}

export default function App() {
  const [activeTab, setActiveTab] = useState('live'); // 'live' | 'comparison' | 'history'
  const [appMode, setAppMode] = useState('RESEARCH'); // 'RESEARCH' | 'DEMO'
  const [backendHealth, setBackendHealth] = useState(() => loadSessionJson('dashboard_backend_health', null));
  const [activeExp, setActiveExp] = useState(() => loadSessionJson('dashboard_active_exp', null));
  const [experimentHistory, setExperimentHistory] = useState(() => loadSessionJson('dashboard_experiment_history', []));
  const [isStarting, setIsStarting] = useState(false);
  const [isStopping, setIsStopping] = useState(false);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [timeSeriesData, setTimeSeriesData] = useState(() => loadSessionJson('dashboard_timeseries_data', []));
  const [currentMetrics, setCurrentMetrics] = useState(() => loadSessionJson('dashboard_current_metrics', DEFAULT_METRICS));

  const lastRequestIdRef = useRef(0);

  // Fetch live system state from Backend API
  const refreshState = useCallback(async () => {
    const requestId = ++lastRequestIdRef.current;
    setIsRefreshing(true);
    try {
      const [health, exp, historyList, liveData] = await Promise.all([
        checkHealth(),
        getActiveExperiment(),
        getExperimentHistory(),
        getLiveTelemetry(),
      ]);

      // Guard against race conditions from out-of-order responses
      if (requestId !== lastRequestIdRef.current) {
        return;
      }

      if (health) {
        setBackendHealth(health);
        saveSessionJson('dashboard_backend_health', health);
      }

      setActiveExp(exp);
      saveSessionJson('dashboard_active_exp', exp);

      if (historyList && Array.isArray(historyList)) {
        setExperimentHistory(historyList);
        saveSessionJson('dashboard_experiment_history', historyList);
      }

      if (liveData) {
        const updatedMetrics = {
          currentReplicas: liveData.currentReplicas ?? null,
          avgCpuPercent: liveData.cpuUtilizationPercent ?? null,
          currentRps: liveData.currentRequestRate ?? null,
          predictedRps: liveData.predictedRequestRate ?? null,
          p95LatencyMs: liveData.p95LatencyMs ?? null,
          p99LatencyMs: liveData.p99LatencyMs ?? null,
          sloViolationRate: liveData.sloViolationRate ?? null,
          totalRequests: liveData.totalRequests ?? null,
          mae: liveData.mae ?? null,
          rmse: liveData.rmse ?? null,
        };
        setCurrentMetrics(updatedMetrics);
        saveSessionJson('dashboard_current_metrics', updatedMetrics);

        const timeStr = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' });
        const newPoint = {
          time: timeStr,
          cpuPercent: liveData.cpuUtilizationPercent != null ? Number(liveData.cpuUtilizationPercent.toFixed(1)) : 0,
          actualRps: liveData.currentRequestRate != null ? Number(liveData.currentRequestRate.toFixed(1)) : 0,
          predictedRps: liveData.predictedRequestRate != null ? Number(liveData.predictedRequestRate.toFixed(1)) : 0,
          replicas: liveData.currentReplicas != null ? liveData.currentReplicas : 0,
          p95Latency: liveData.p95LatencyMs != null ? Number(liveData.p95LatencyMs.toFixed(1)) : 0,
          p99Latency: liveData.p99LatencyMs != null ? Number(liveData.p99LatencyMs.toFixed(1)) : 0,
        };

        setTimeSeriesData((prev) => {
          const next = [...prev.slice(-29), newPoint];
          saveSessionJson('dashboard_timeseries_data', next);
          return next;
        });
      }
    } catch (err) {
      if (requestId === lastRequestIdRef.current) {
        console.warn('Dashboard poll error:', err.message);
      }
    } finally {
      if (requestId === lastRequestIdRef.current) {
        setIsRefreshing(false);
      }
    }
  }, []);

  // Initial load and periodic interval
  useEffect(() => {
    refreshState();
    const interval = setInterval(refreshState, 3000);
    return () => clearInterval(interval);
  }, [refreshState]);

  const handleAppModeChange = (mode) => {
    setAppMode(mode);
  };

  const handleStartExperiment = async (payload) => {
    setIsStarting(true);
    try {
      const started = await startExperiment(payload);
      setActiveExp(started);
      saveSessionJson('dashboard_active_exp', started);
      await refreshState();
    } catch (err) {
      alert(`Failed to start experiment: ${err.response?.data?.message || err.message}`);
    } finally {
      setIsStarting(false);
    }
  };

  const handleStopExperiment = async () => {
    setIsStopping(true);
    try {
      const stopped = await stopExperiment();
      setActiveExp(stopped);
      saveSessionJson('dashboard_active_exp', stopped);
      await refreshState();
    } catch (err) {
      alert(`Failed to stop experiment: ${err.response?.data?.message || err.message}`);
    } finally {
      setIsStopping(false);
    }
  };

  const isDemo = appMode === 'DEMO';
  const modeExperimentCount = experimentHistory.filter((e) => (isDemo ? isDemoExperiment(e) : !isDemoExperiment(e))).length;

  return (
    <div style={{ maxWidth: '1440px', margin: '0 auto', padding: '1.5rem' }}>
      
      {/* 1. Header with System Health Indicators & Dynamic Mode */}
      <Header
        appMode={appMode}
        backendHealth={backendHealth}
        isRefreshing={isRefreshing}
        onManualRefresh={refreshState}
      />

      {/* 2. Active Experiment Banner & Progress Bar */}
      <ActiveExperimentBanner
        appMode={appMode}
        activeExp={activeExp}
        backendHealth={backendHealth}
        onStopExperiment={handleStopExperiment}
        isStopping={isStopping}
      />

      {/* Top Tab Navigation Bar (Restored in BOTH Research Mode and Demo Mode) */}
      <div style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        background: 'rgba(15, 23, 42, 0.65)',
        backdropFilter: 'blur(12px)',
        border: '1px solid var(--border-subtle)',
        borderRadius: '0.75rem',
        padding: '0.4rem',
        marginBottom: '1.5rem',
      }}>
        <div style={{ display: 'flex', gap: '0.5rem' }}>
          <button
            onClick={() => setActiveTab('live')}
            className={`btn ${activeTab === 'live' ? 'btn-primary' : 'btn-secondary'}`}
            style={{
              padding: '0.6rem 1.25rem',
              fontSize: '0.85rem',
              display: 'flex',
              alignItems: 'center',
              gap: '0.5rem',
              borderRadius: '0.5rem',
              border: activeTab === 'live' ? (isDemo ? '1px solid #f59e0b' : '1px solid #06b6d4') : 'transparent',
            }}
          >
            <Activity size={16} color={activeTab === 'live' ? (isDemo ? '#f59e0b' : '#06b6d4') : 'currentColor'} />
            <span>{isDemo ? 'Live Sandbox Telemetry' : 'Live Monitor & Telemetry'}</span>
          </button>

          <button
            onClick={() => setActiveTab('comparison')}
            className={`btn ${activeTab === 'comparison' ? 'btn-primary' : 'btn-secondary'}`}
            style={{
              padding: '0.6rem 1.25rem',
              fontSize: '0.85rem',
              display: 'flex',
              alignItems: 'center',
              gap: '0.5rem',
              borderRadius: '0.5rem',
              border: activeTab === 'comparison' ? (isDemo ? '1px solid #f59e0b' : '1px solid #8b5cf6') : 'transparent',
              position: 'relative'
            }}
          >
            <Scale size={16} color={activeTab === 'comparison' ? (isDemo ? '#f59e0b' : '#8b5cf6') : 'currentColor'} />
            <span>Benchmark Comparison</span>
          </button>

          <button
            onClick={() => setActiveTab('history')}
            className={`btn ${activeTab === 'history' ? 'btn-primary' : 'btn-secondary'}`}
            style={{
              padding: '0.6rem 1.25rem',
              fontSize: '0.85rem',
              display: 'flex',
              alignItems: 'center',
              gap: '0.5rem',
              borderRadius: '0.5rem',
              border: activeTab === 'history' ? (isDemo ? '1px solid #f59e0b' : '1px solid #10b981') : 'transparent',
            }}
          >
            <Database size={16} color={activeTab === 'history' ? (isDemo ? '#f59e0b' : '#10b981') : 'currentColor'} />
            <span>Historical Database</span>
            <span style={{ fontSize: '0.75rem', opacity: 0.75 }}>({modeExperimentCount})</span>
          </button>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', paddingRight: '0.75rem' }}>
          <span style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>
            Autoscaling Mode:
          </span>
          <span className={`badge ${activeExp ? (activeExp.autoscalingMode === 'PREDICTIVE_PROPHET_KEDA' ? 'badge-cyan' : 'badge-amber') : (isDemo ? 'badge-amber' : 'badge-violet')}`} style={{ fontSize: '0.7rem' }}>
            {activeExp 
              ? (activeExp.autoscalingMode === 'PREDICTIVE_PROPHET_KEDA' ? 'Prophet + KEDA' : 'Reactive CPU HPA') 
              : (isDemo ? 'Interactive Sandbox' : 'Sequential Matrix Engine')}
          </span>
        </div>
      </div>

      {/* Tab 1: Live Monitor & Telemetry */}
      {activeTab === 'live' && (
        <>
          {/* Live KPI Metrics Overview */}
          <MetricsOverview currentMetrics={currentMetrics} />

          {/* Live Telemetry Charts Grid */}
          <TelemetryCharts timeSeriesData={timeSeriesData} />

          {/* Experiment Launcher & Scenario Controller */}
          <ExperimentLauncher
            controlMode={appMode}
            onControlModeChange={handleAppModeChange}
            onStartExperiment={handleStartExperiment}
            isStarting={isStarting}
            activeExp={activeExp}
            history={experimentHistory}
          />

          {/* Active Cluster Pods Status */}
          <ClusterStatus currentReplicas={currentMetrics.currentReplicas} />
        </>
      )}

      {/* Tab 2: Side-by-Side Benchmark Comparison (Mode-Separated) */}
      {activeTab === 'comparison' && (
        <ComparisonView history={experimentHistory} appMode={appMode} />
      )}

      {/* Tab 3: Historical Database Table (Mode-Separated) */}
      {activeTab === 'history' && (
        <HistoryView history={experimentHistory} appMode={appMode} onRefresh={refreshState} />
      )}

      {/* Footer */}
      <footer style={{
        textAlign: 'center',
        padding: '1.5rem 0',
        color: 'var(--text-muted)',
        fontSize: '0.8rem',
        borderTop: '1px solid var(--border-subtle)',
        marginTop: '2rem'
      }}>
        <p>Predictive Kubernetes Autoscaling — Benchmarking Prophet + KEDA vs Reactive HPA</p>
      </footer>

    </div>
  );
}

