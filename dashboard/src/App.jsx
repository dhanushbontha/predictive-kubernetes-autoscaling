import React, { useState, useEffect, useCallback } from 'react';
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

export default function App() {
  const [activeTab, setActiveTab] = useState('live'); // 'live' | 'comparison' | 'history'
  const [backendHealth, setBackendHealth] = useState({ status: 'UP', components: { db: { status: 'UP' } } });
  const [activeExp, setActiveExp] = useState(null);
  const [experimentHistory, setExperimentHistory] = useState([]);
  const [isStarting, setIsStarting] = useState(false);
  const [isStopping, setIsStopping] = useState(false);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [timeSeriesData, setTimeSeriesData] = useState([]);
  const [currentMetrics, setCurrentMetrics] = useState({
    currentReplicas: 1,
    avgCpuPercent: 0.0,
    currentRps: 0.0,
    predictedRps: 0.0,
    p95LatencyMs: 0.0,
    p99LatencyMs: 0.0,
    sloViolationRate: 0.0,
    totalRequests: 0,
    mae: null,
    rmse: null,
  });

  // Fetch live system state from Backend API
  const refreshState = useCallback(async () => {
    setIsRefreshing(true);
    try {
      const [health, exp, historyList, liveData] = await Promise.all([
        checkHealth(),
        getActiveExperiment(),
        getExperimentHistory(),
        getLiveTelemetry(),
      ]);

      if (health) {
        setBackendHealth(health);
      }
      setActiveExp(exp);
      if (historyList && Array.isArray(historyList)) {
        setExperimentHistory(historyList);
      }

      if (liveData) {
        setCurrentMetrics({
          currentReplicas: liveData.currentReplicas ?? 1,
          avgCpuPercent: liveData.cpuUtilizationPercent ?? 0.0,
          currentRps: liveData.currentRequestRate ?? 0.0,
          predictedRps: liveData.predictedRequestRate ?? 0.0,
          p95LatencyMs: liveData.p95LatencyMs ?? 0.0,
          p99LatencyMs: liveData.p99LatencyMs ?? 0.0,
          sloViolationRate: liveData.sloViolationRate ?? 0.0,
          totalRequests: liveData.totalRequests ?? 0,
          mae: liveData.mae ?? null,
          rmse: liveData.rmse ?? null,
        });

        const timeStr = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' });
        const newPoint = {
          time: timeStr,
          cpuPercent: Number((liveData.cpuUtilizationPercent || 0).toFixed(1)),
          actualRps: Number((liveData.currentRequestRate || 0).toFixed(1)),
          predictedRps: Number((liveData.predictedRequestRate || 0).toFixed(1)),
          replicas: liveData.currentReplicas || 1,
          p95Latency: Number((liveData.p95LatencyMs || 0).toFixed(1)),
          p99Latency: Number((liveData.p99LatencyMs || 0).toFixed(1)),
        };

        setTimeSeriesData((prev) => [...prev.slice(-29), newPoint]);
      } else {
        setCurrentMetrics({
          currentReplicas: 1,
          avgCpuPercent: 0.0,
          currentRps: 0.0,
          predictedRps: 0.0,
          p95LatencyMs: 0.0,
          p99LatencyMs: 0.0,
          sloViolationRate: 0.0,
          totalRequests: 0,
          mae: null,
          rmse: null,
        });
      }
    } catch (err) {
      console.warn('Dashboard poll error:', err.message);
    } finally {
      setIsRefreshing(false);
    }
  }, [activeExp]);

  // Initial load and periodic interval
  useEffect(() => {
    refreshState();
    const interval = setInterval(refreshState, 3000);
    return () => clearInterval(interval);
  }, [refreshState]);

  const handleStartExperiment = async (payload) => {
    setIsStarting(true);
    try {
      const started = await startExperiment(payload);
      setActiveExp(started);
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
      await refreshState();
    } catch (err) {
      alert(`Failed to stop experiment: ${err.response?.data?.message || err.message}`);
    } finally {
      setIsStopping(false);
    }
  };

  return (
    <div style={{ maxWidth: '1440px', margin: '0 auto', padding: '1.5rem' }}>
      
      {/* 1. Header with System Health Indicators */}
      <Header
        backendHealth={backendHealth}
        isRefreshing={isRefreshing}
        onManualRefresh={refreshState}
      />

      {/* 2. Active Experiment Banner & Progress Bar */}
      <ActiveExperimentBanner
        activeExp={activeExp}
        onStopExperiment={handleStopExperiment}
        isStopping={isStopping}
      />

      {/* Top Tab Navigation Bar */}
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
              border: activeTab === 'live' ? '1px solid #06b6d4' : 'transparent',
            }}
          >
            <Activity size={16} color={activeTab === 'live' ? '#06b6d4' : 'currentColor'} />
            <span>Live Monitor & Telemetry</span>
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
              border: activeTab === 'comparison' ? '1px solid #8b5cf6' : 'transparent',
              position: 'relative'
            }}
          >
            <Scale size={16} color={activeTab === 'comparison' ? '#8b5cf6' : 'currentColor'} />
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
              border: activeTab === 'history' ? '1px solid #10b981' : 'transparent',
            }}
          >
            <Database size={16} color={activeTab === 'history' ? '#10b981' : 'currentColor'} />
            <span>Historical Database</span>
            <span style={{ fontSize: '0.75rem', opacity: 0.75 }}>({experimentHistory.length})</span>
          </button>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', paddingRight: '0.75rem' }}>
          <span style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>
            Autoscaling Mode:
          </span>
          <span className="badge badge-cyan" style={{ fontSize: '0.7rem' }}>
            Meta Prophet + KEDA
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
            onStartExperiment={handleStartExperiment}
            isStarting={isStarting}
            activeExp={activeExp}
          />

          {/* Active Cluster Pods Status */}
          <ClusterStatus currentReplicas={currentMetrics.currentReplicas} />
        </>
      )}

      {/* Tab 2: Side-by-Side Benchmark Comparison */}
      {activeTab === 'comparison' && (
        <ComparisonView history={experimentHistory} />
      )}

      {/* Tab 3: Historical Database Table & Audit Trail Explorer */}
      {activeTab === 'history' && (
        <HistoryView history={experimentHistory} onRefresh={refreshState} />
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
        <p>Predictive Kubernetes Autoscaling — Benchmarking Meta Prophet + KEDA vs Reactive HPA</p>
      </footer>

    </div>
  );
}

