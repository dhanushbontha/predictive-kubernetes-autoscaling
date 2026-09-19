import React, { useState, useEffect } from 'react';
import { Play, Square, Clock, Gauge, Target, ShieldAlert, Cpu, CheckCircle } from 'lucide-react';

export default function ActiveExperimentBanner({ activeExp, onStopExperiment, isStopping }) {
  const [elapsed, setElapsed] = useState(0);

  useEffect(() => {
    if (!activeExp || !activeExp.startTime) {
      setElapsed(0);
      return;
    }

    const startMs = new Date(activeExp.startTime).getTime();
    const updateProgress = () => {
      const nowMs = Date.now();
      const diffSec = Math.max(0, Math.floor((nowMs - startMs) / 1000));
      setElapsed(diffSec);
    };

    updateProgress();
    const interval = setInterval(updateProgress, 1000);
    return () => clearInterval(interval);
  }, [activeExp]);

  if (!activeExp || activeExp.status === 'IDLE' || activeExp.status === 'COMPLETED' || activeExp.status === 'STOPPED') {
    return (
      <div className="glass-panel" style={{
        padding: '1rem 1.5rem',
        marginBottom: '1.5rem',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        background: 'linear-gradient(90deg, rgba(16,185,129,0.05) 0%, rgba(15,23,42,0.6) 100%)',
        borderColor: 'rgba(16,185,129,0.2)',
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.85rem' }}>
          <div style={{ padding: '0.5rem', background: 'rgba(16,185,129,0.15)', borderRadius: '10px' }}>
            <CheckCircle size={20} color="#10b981" />
          </div>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <strong style={{ fontSize: '0.95rem' }}>Benchmark Platform Ready</strong>
              <span className="badge badge-emerald">IDLE</span>
            </div>
            <p style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', marginTop: '0.1rem' }}>
              Select a synthetic workload pattern below to dispatch an automated benchmark execution.
            </p>
          </div>
        </div>
      </div>
    );
  }

  const duration = activeExp.durationSeconds || 60;
  const progressPercent = Math.min(100, Math.round((elapsed / duration) * 100));
  const isPredictive = activeExp.autoscalingMode === 'PREDICTIVE_PROPHET_KEDA';

  return (
    <div className="glass-panel" style={{
      padding: '1.25rem 1.75rem',
      marginBottom: '1.5rem',
      background: isPredictive 
        ? 'linear-gradient(90deg, rgba(6,182,212,0.12) 0%, rgba(99,102,241,0.08) 100%)'
        : 'linear-gradient(90deg, rgba(245,158,11,0.12) 0%, rgba(244,63,94,0.08) 100%)',
      borderColor: isPredictive ? 'rgba(6,182,212,0.4)' : 'rgba(245,158,11,0.4)',
      boxShadow: isPredictive ? '0 0 25px rgba(6,182,212,0.2)' : '0 0 25px rgba(245,158,11,0.2)',
    }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '1rem', marginBottom: '0.85rem' }}>
        
        {/* Title & Badges */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
          <span className="status-dot status-dot-active" />
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', flexWrap: 'wrap' }}>
              <span style={{ fontSize: '1.1rem', fontWeight: 800, color: '#ffffff' }}>
                {activeExp.name || 'Active Benchmark'}
              </span>
              <span className={`badge ${isPredictive ? 'badge-cyan' : 'badge-amber'}`}>
                {isPredictive ? 'PREDICTIVE (PROPHET + KEDA)' : 'REACTIVE (CPU HPA)'}
              </span>
              <span className="badge badge-violet">
                {activeExp.scenario} PATTERN
              </span>
              <span className="badge badge-emerald">
                {activeExp.status}
              </span>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '1.25rem', marginTop: '0.35rem', fontSize: '0.85rem', color: 'var(--text-secondary)' }}>
              <span>Target: <strong style={{ color: '#ffffff' }}>{activeExp.targetRps} RPS</strong></span>
              <span>SLO: <strong style={{ color: '#ffffff' }}>{activeExp.sloLatencyMs} ms</strong></span>
              <span>Horizon: <strong style={{ color: '#ffffff' }}>{activeExp.forecastHorizonSeconds} s</strong></span>
            </div>
          </div>
        </div>

        {/* Action Button */}
        <button
          onClick={onStopExperiment}
          disabled={isStopping}
          className="btn-danger"
          style={{ padding: '0.6rem 1.2rem', fontSize: '0.85rem' }}
        >
          <Square size={16} fill="#ffffff" />
          {isStopping ? 'Stopping...' : 'Stop Benchmark'}
        </button>

      </div>

      {/* Progress Bar & Countdown */}
      <div>
        <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.8rem', color: 'var(--text-secondary)', marginBottom: '0.35rem' }}>
          <span className="stat-mono">Elapsed: {elapsed}s / {duration}s</span>
          <span className="stat-mono">Progress: {progressPercent}% ({Math.max(0, duration - elapsed)}s remaining)</span>
        </div>
        <div style={{
          height: '8px',
          background: 'rgba(255,255,255,0.08)',
          borderRadius: '999px',
          overflow: 'hidden',
          position: 'relative'
        }}>
          <div style={{
            width: `${progressPercent}%`,
            height: '100%',
            background: isPredictive
              ? 'linear-gradient(90deg, #06b6d4 0%, #6366f1 100%)'
              : 'linear-gradient(90deg, #f59e0b 0%, #f43f5e 100%)',
            borderRadius: '999px',
            transition: 'width 0.5s ease',
            boxShadow: isPredictive ? '0 0 10px #06b6d4' : '0 0 10px #f59e0b',
          }} />
        </div>
      </div>

    </div>
  );
}
