import React, { useState, useEffect } from 'react';
import { Activity, Server, Database, Cpu, Layers, RefreshCw, Zap } from 'lucide-react';

export default function Header({ backendHealth, isRefreshing, onManualRefresh }) {
  const [time, setTime] = useState(new Date().toUTCString());

  useEffect(() => {
    const timer = setInterval(() => {
      setTime(new Date().toUTCString());
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  const isBackendUp = backendHealth?.status === 'UP';
  const isDbUp = backendHealth?.components?.db?.status === 'UP';

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
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
              <h1 style={{ fontSize: '1.45rem', fontWeight: 800, background: 'linear-gradient(90deg, #ffffff 0%, #22d3ee 100%)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>
                Predictive Kubernetes Autoscaling
              </h1>
              <span className="badge badge-cyan">v1.0.0</span>
            </div>
            <p style={{ color: 'var(--text-secondary)', fontSize: '0.85rem', marginTop: '0.15rem' }}>
              Meta Prophet + KEDA vs Reactive HPA Benchmark Engine
            </p>
          </div>
        </div>

        {/* Live Cluster & System Status Pills */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', flexWrap: 'wrap' }}>
          
          {/* Backend Status */}
          <div style={{
            display: 'flex',
            alignItems: 'center',
            gap: '0.5rem',
            padding: '0.4rem 0.8rem',
            background: 'rgba(255,255,255,0.03)',
            border: '1px solid var(--border-subtle)',
            borderRadius: '8px',
            fontSize: '0.8rem'
          }}>
            <span className={`status-dot ${isBackendUp ? 'status-dot-active' : 'status-dot-danger'}`} />
            <Server size={14} color={isBackendUp ? '#10b981' : '#f43f5e'} />
            <span style={{ color: 'var(--text-secondary)' }}>Backend:</span>
            <strong style={{ color: isBackendUp ? '#34d399' : '#fb7185' }}>{isBackendUp ? 'ONLINE' : 'OFFLINE'}</strong>
          </div>

          {/* Database Status */}
          <div style={{
            display: 'flex',
            alignItems: 'center',
            gap: '0.5rem',
            padding: '0.4rem 0.8rem',
            background: 'rgba(255,255,255,0.03)',
            border: '1px solid var(--border-subtle)',
            borderRadius: '8px',
            fontSize: '0.8rem'
          }}>
            <span className={`status-dot ${isDbUp ? 'status-dot-active' : 'status-dot-warning'}`} />
            <Database size={14} color={isDbUp ? '#10b981' : '#f59e0b'} />
            <span style={{ color: 'var(--text-secondary)' }}>PostgreSQL:</span>
            <strong style={{ color: isDbUp ? '#34d399' : '#fbbf24' }}>{isDbUp ? 'CONNECTED' : 'DISCONNECTED'}</strong>
          </div>

          {/* Forecasting Engine */}
          <div style={{
            display: 'flex',
            alignItems: 'center',
            gap: '0.5rem',
            padding: '0.4rem 0.8rem',
            background: 'rgba(255,255,255,0.03)',
            border: '1px solid var(--border-subtle)',
            borderRadius: '8px',
            fontSize: '0.8rem'
          }}>
            <span className="status-dot status-dot-active" />
            <Activity size={14} color="#06b6d4" />
            <span style={{ color: 'var(--text-secondary)' }}>Prophet:</span>
            <strong style={{ color: '#22d3ee' }}>READY</strong>
          </div>

          {/* Clock & Refresh button */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <span className="stat-mono" style={{ color: 'var(--text-muted)', fontSize: '0.8rem' }}>
              {time.split(' ').slice(4, 5)[0]} UTC
            </span>
            <button
              onClick={onManualRefresh}
              className="btn-secondary"
              title="Refresh telemetry"
              style={{ padding: '0.4rem', borderRadius: '8px' }}
            >
              <RefreshCw size={14} className={isRefreshing ? 'spin' : ''} style={{ animation: isRefreshing ? 'spin 1s linear infinite' : 'none' }} />
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
