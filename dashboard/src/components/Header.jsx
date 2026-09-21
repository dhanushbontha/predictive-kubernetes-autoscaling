import React, { useState, useEffect } from 'react';
import { Activity, Server, Database, Layers, RefreshCw, Zap, Radio } from 'lucide-react';

export default function Header({ backendHealth, isRefreshing, onManualRefresh }) {
  const [time, setTime] = useState(new Date().toUTCString());

  useEffect(() => {
    const timer = setInterval(() => {
      setTime(new Date().toUTCString());
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  const isSyncing = backendHealth === null;
  const isBackendUp = !isSyncing && Boolean(backendHealth && (backendHealth.status === 'UP' || backendHealth.status === 'OK' || backendHealth.components));
  
  // Real individual component statuses directly from Actuator health breakdown
  const isDbUp = !isSyncing && isBackendUp && Boolean(backendHealth?.components?.db?.status === 'UP');
  const isPrometheusUp = !isSyncing && isBackendUp && Boolean(backendHealth?.components?.prometheus?.status === 'UP');
  const isProphetUp = !isSyncing && isBackendUp && Boolean(backendHealth?.components?.forecasting?.status === 'UP');
  const isK8sUp = !isSyncing && isBackendUp && Boolean(backendHealth?.components?.kubernetes?.status === 'UP');

  // Mode detection (Research vs Dev sandbox)
  const rawMode = backendHealth?.components?.systemMode?.details?.mode;
  const isDbH2 = backendHealth?.components?.db?.details?.database === 'H2' || backendHealth?.components?.systemMode?.details?.datasourceType === 'H2_IN_MEMORY';
  const isDevMode = rawMode === 'DEV' || isDbH2;
  const isResearchMode = isBackendUp && !isDevMode && (rawMode === 'RESEARCH' || !isDbH2);

  const getBackendInfo = () => {
    if (isSyncing) return { label: 'SYNCING', color: '#38bdf8', dotClass: 'status-dot-syncing' };
    if (isBackendUp) return { label: 'ONLINE', color: '#34d399', dotClass: 'status-dot-active' };
    return { label: 'OFFLINE', color: '#fb7185', dotClass: 'status-dot-danger' };
  };

  const getDbInfo = () => {
    if (isSyncing) return { label: 'SYNCING', color: '#38bdf8', dotClass: 'status-dot-syncing' };
    if (isDbUp) return { label: isDbH2 ? 'H2 (LOCAL)' : 'CONNECTED', color: '#34d399', dotClass: 'status-dot-active' };
    return { label: 'DISCONNECTED', color: '#fbbf24', dotClass: 'status-dot-warning' };
  };

  const getPrometheusInfo = () => {
    if (isSyncing) return { label: 'SYNCING', color: '#38bdf8', dotClass: 'status-dot-syncing' };
    if (isPrometheusUp) return { label: 'CONNECTED', color: '#34d399', dotClass: 'status-dot-active' };
    return { label: 'DISCONNECTED', color: '#fbbf24', dotClass: 'status-dot-warning' };
  };

  const getProphetInfo = () => {
    if (isSyncing) return { label: 'SYNCING', color: '#38bdf8', dotClass: 'status-dot-syncing' };
    if (isProphetUp) return { label: 'READY', color: '#22d3ee', dotClass: 'status-dot-active' };
    return { label: 'NOT READY', color: '#fbbf24', dotClass: 'status-dot-warning' };
  };

  const getK8sInfo = () => {
    if (isSyncing) return { label: 'SYNCING', color: '#38bdf8', dotClass: 'status-dot-syncing' };
    if (isK8sUp) return { label: 'CONNECTED', color: '#a78bfa', dotClass: 'status-dot-active' };
    return { label: 'DISCONNECTED', color: '#fbbf24', dotClass: 'status-dot-warning' };
  };

  const backendInfo = getBackendInfo();
  const dbInfo = getDbInfo();
  const prometheusInfo = getPrometheusInfo();
  const prophetInfo = getProphetInfo();
  const k8sInfo = getK8sInfo();

  return (
    <header className="glass-panel" style={{ padding: '1.25rem 2rem', marginBottom: '1.5rem' }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '1rem' }}>
        
        {/* Brand & Title */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
          <div style={{
            background: 'linear-gradient(135deg, rgba(6,182,212,0.2) 0%, rgba(99,102,241,0.2) 100%)',
            border: '1px solid rgba(6,182,212,0.4)',
            padding: '0.75rem',
            borderRadius: '12px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            boxShadow: '0 0 15px rgba(6,182,212,0.3)',
          }}>
            <Zap size={28} color="#06b6d4" />
          </div>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', flexWrap: 'wrap' }}>
              <h1 style={{ fontSize: '1.45rem', fontWeight: 800, background: 'linear-gradient(90deg, #ffffff 0%, #22d3ee 100%)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>
                Predictive Kubernetes Autoscaling
              </h1>
              
              {/* Distinct Mode Badge */}
              {isResearchMode && (
                <span
                  className="badge badge-emerald"
                  style={{
                    background: 'rgba(16, 185, 129, 0.15)',
                    border: '1px solid #10b981',
                    color: '#34d399',
                    boxShadow: '0 0 10px rgba(16, 185, 129, 0.2)',
                    fontWeight: 700,
                    letterSpacing: '0.04em'
                  }}
                  title="Research / Demo Mode: Local Windows Backend connected via Port-Forward bridges to Kubernetes/Minikube"
                >
                  🔬 RESEARCH MODE
                </span>
              )}
              {isDevMode && isBackendUp && (
                <span
                  className="badge"
                  style={{
                    background: 'rgba(245, 158, 11, 0.15)',
                    border: '1px solid #f59e0b',
                    color: '#fbbf24',
                    boxShadow: '0 0 10px rgba(245, 158, 11, 0.2)',
                    fontWeight: 700,
                    letterSpacing: '0.04em'
                  }}
                  title="Development Mode: Offline Local Sandbox - Not for official Kubernetes research experiments"
                >
                  🛠️ DEV MODE (LOCAL SANDBOX)
                </span>
              )}
              {!isBackendUp && !isSyncing && (
                <span className="badge badge-zinc">OFFLINE</span>
              )}
            </div>
            <p style={{ color: 'var(--text-secondary)', fontSize: '0.85rem', marginTop: '0.15rem' }}>
              Meta Prophet + KEDA vs Reactive HPA Benchmark Engine
            </p>
          </div>
        </div>

        {/* Live System Component Status Pills */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', flexWrap: 'wrap' }}>
          
          {/* Backend Status */}
          <div style={{
            display: 'flex',
            alignItems: 'center',
            gap: '0.45rem',
            padding: '0.4rem 0.75rem',
            background: 'rgba(255,255,255,0.03)',
            border: '1px solid var(--border-subtle)',
            borderRadius: '8px',
            fontSize: '0.78rem'
          }}>
            <span className={`status-dot ${backendInfo.dotClass}`} />
            <Server size={13} color={backendInfo.color} />
            <span style={{ color: 'var(--text-secondary)' }}>Backend:</span>
            <strong style={{ color: backendInfo.color }}>{backendInfo.label}</strong>
          </div>

          {/* PostgreSQL Status */}
          <div style={{
            display: 'flex',
            alignItems: 'center',
            gap: '0.45rem',
            padding: '0.4rem 0.75rem',
            background: 'rgba(255,255,255,0.03)',
            border: '1px solid var(--border-subtle)',
            borderRadius: '8px',
            fontSize: '0.78rem'
          }}>
            <span className={`status-dot ${dbInfo.dotClass}`} />
            <Database size={13} color={dbInfo.color} />
            <span style={{ color: 'var(--text-secondary)' }}>PostgreSQL:</span>
            <strong style={{ color: dbInfo.color }}>{dbInfo.label}</strong>
          </div>

          {/* Prometheus Status */}
          <div style={{
            display: 'flex',
            alignItems: 'center',
            gap: '0.45rem',
            padding: '0.4rem 0.75rem',
            background: 'rgba(255,255,255,0.03)',
            border: '1px solid var(--border-subtle)',
            borderRadius: '8px',
            fontSize: '0.78rem'
          }}>
            <span className={`status-dot ${prometheusInfo.dotClass}`} />
            <Activity size={13} color={prometheusInfo.color} />
            <span style={{ color: 'var(--text-secondary)' }}>Prometheus:</span>
            <strong style={{ color: prometheusInfo.color }}>{prometheusInfo.label}</strong>
          </div>

          {/* Forecasting / Prophet */}
          <div style={{
            display: 'flex',
            alignItems: 'center',
            gap: '0.45rem',
            padding: '0.4rem 0.75rem',
            background: 'rgba(255,255,255,0.03)',
            border: '1px solid var(--border-subtle)',
            borderRadius: '8px',
            fontSize: '0.78rem'
          }}>
            <span className={`status-dot ${prophetInfo.dotClass}`} />
            <Radio size={13} color={prophetInfo.color} />
            <span style={{ color: 'var(--text-secondary)' }}>Prophet:</span>
            <strong style={{ color: prophetInfo.color }}>{prophetInfo.label}</strong>
          </div>

          {/* Kubernetes Cluster */}
          <div style={{
            display: 'flex',
            alignItems: 'center',
            gap: '0.45rem',
            padding: '0.4rem 0.75rem',
            background: 'rgba(255,255,255,0.03)',
            border: '1px solid var(--border-subtle)',
            borderRadius: '8px',
            fontSize: '0.78rem'
          }}>
            <span className={`status-dot ${k8sInfo.dotClass}`} />
            <Layers size={13} color={k8sInfo.color} />
            <span style={{ color: 'var(--text-secondary)' }}>Kubernetes:</span>
            <strong style={{ color: k8sInfo.color }}>{k8sInfo.label}</strong>
          </div>

          {/* UTC Clock & Refresh */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', marginLeft: '0.2rem' }}>
            <span className="stat-mono" style={{ color: 'var(--text-muted)', fontSize: '0.75rem' }}>
              {time.split(' ').slice(4, 5)[0]} UTC
            </span>
            <button
              onClick={onManualRefresh}
              className="btn-secondary"
              title="Refresh telemetry"
              style={{ padding: '0.35rem 0.5rem', borderRadius: '8px' }}
            >
              <RefreshCw size={13} className={isRefreshing ? 'spin' : ''} style={{ animation: isRefreshing ? 'spin 1s linear infinite' : 'none' }} />
            </button>
          </div>

        </div>

      </div>

      <style>{`
        @keyframes spin {
          from { transform: rotate(0deg); }
          to { transform: rotate(360deg); }
        }
      `}</style>
    </header>
  );
}
