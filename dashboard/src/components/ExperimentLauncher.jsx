import React, { useState } from 'react';
import { Play, Sparkles, Sliders, Zap, BarChart2, Activity, Waves, Shield, AlertTriangle } from 'lucide-react';

const SCENARIOS = [
  {
    id: 'BURSTY',
    name: 'Bursty Traffic Surge',
    desc: 'Sudden high-amplitude spikes from baseline to peak RPS testing spin-up lag.',
    color: '#f43f5e',
    icon: Zap,
  },
  {
    id: 'PERIODIC',
    name: 'Periodic Sinusoidal',
    desc: 'Cyclical sinusoidal wave traffic testing seasonality tracking & prediction.',
    color: '#06b6d4',
    icon: Activity,
  },
  {
    id: 'GRADUAL',
    name: 'Gradual Ramp Up/Down',
    desc: 'Smooth linear traffic ramps evaluating steady-state slope adaptability.',
    color: '#10b981',
    icon: BarChart2,
  },
  {
    id: 'NOISY',
    name: 'Noisy Stochastic Jitter',
    desc: 'Random Gaussian noise with unpredictable fluctuations testing stability.',
    color: '#f59e0b',
    icon: Sliders,
  },
  {
    id: 'STABLE',
    name: 'Stable Uniform Load',
    desc: 'Constant flat baseline traffic for steady-state calibration.',
    color: '#8b5cf6',
    icon: Shield,
  },
];

const AUTOSCALING_MODES = [
  {
    id: 'PREDICTIVE_PROPHET_KEDA',
    name: 'Predictive (Meta Prophet + KEDA)',
    desc: 'Proactive time-series forecasting ahead of spikes. Eliminates reactive pod creation lag.',
    badge: 'PREDICTIVE',
    badgeClass: 'badge-cyan',
  },
  {
    id: 'REACTIVE_HPA',
    name: 'Reactive (Kubernetes CPU HPA)',
    desc: 'Standard Kubernetes HPA v2 scaling reactively on 50% CPU utilization threshold.',
    badge: 'REACTIVE',
    badgeClass: 'badge-amber',
  },
];

export default function ExperimentLauncher({ onStartExperiment, isStarting, activeExp }) {
  const [scenario, setScenario] = useState('BURSTY');
  const [autoscalingMode, setAutoscalingMode] = useState('PREDICTIVE_PROPHET_KEDA');
  const [targetRps, setTargetRps] = useState(150);
  const [durationSeconds, setDurationSeconds] = useState(120);
  const [sloLatencyMs, setSloLatencyMs] = useState(200);
  const [forecastHorizonSeconds, setForecastHorizonSeconds] = useState(60);

  const isRunning = activeExp && (activeExp.status === 'STARTING' || activeExp.status === 'RUNNING');

  const handleSubmit = (e) => {
    e.preventDefault();
    if (isRunning) return;

    const payload = {
      name: `${scenario.toLowerCase()}-${autoscalingMode === 'PREDICTIVE_PROPHET_KEDA' ? 'keda' : 'hpa'}-${Date.now().toString().slice(-4)}`,
      scenario,
      autoscalingMode,
      targetRps: Number(targetRps),
      durationSeconds: Number(durationSeconds),
      sloLatencyMs: Number(sloLatencyMs),
      forecastHorizonSeconds: Number(forecastHorizonSeconds),
    };

    onStartExperiment(payload);
  };

  return (
    <div className="glass-panel" style={{ padding: '1.5rem', marginBottom: '1.5rem' }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1.25rem' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
          <Sparkles size={20} color="#06b6d4" />
          <h2 style={{ fontSize: '1.15rem' }}>Experiment Benchmark Controller</h2>
        </div>
        {isRunning && (
          <span className="badge badge-amber" style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
            <AlertTriangle size={12} /> Experiment in Progress
          </span>
        )}
      </div>

      <form onSubmit={handleSubmit}>
        
        {/* Scenario Selection Grid */}
        <div style={{ marginBottom: '1.25rem' }}>
          <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 600, color: 'var(--text-secondary)', marginBottom: '0.6rem' }}>
            1. Select Synthetic Workload Pattern:
          </label>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '0.75rem' }}>
            {SCENARIOS.map((s) => {
              const isSelected = scenario === s.id;
              const Icon = s.icon;
              return (
                <div
                  key={s.id}
                  onClick={() => !isRunning && setScenario(s.id)}
                  style={{
                    padding: '0.9rem',
                    background: isSelected ? 'rgba(6,182,212,0.12)' : 'rgba(255,255,255,0.02)',
                    border: `1.5px solid ${isSelected ? s.color : 'var(--border-subtle)'}`,
                    borderRadius: '12px',
                    cursor: isRunning ? 'not-allowed' : 'pointer',
                    transition: 'all 0.2s ease',
                    boxShadow: isSelected ? `0 0 15px ${s.color}30` : 'none',
                    opacity: isRunning && !isSelected ? 0.6 : 1,
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.35rem' }}>
                    <Icon size={16} color={s.color} />
                    <strong style={{ fontSize: '0.85rem', color: isSelected ? '#ffffff' : 'var(--text-secondary)' }}>
                      {s.name}
                    </strong>
                  </div>
                  <p style={{ fontSize: '0.72rem', color: 'var(--text-muted)', lineHeight: 1.3 }}>
                    {s.desc}
                  </p>
                </div>
              );
            })}
          </div>
        </div>

        {/* Autoscaling Mode Selection */}
        <div style={{ marginBottom: '1.25rem' }}>
          <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 600, color: 'var(--text-secondary)', marginBottom: '0.6rem' }}>
            2. Select Autoscaling Strategy:
          </label>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '0.75rem' }}>
            {AUTOSCALING_MODES.map((m) => {
              const isSelected = autoscalingMode === m.id;
              return (
                <div
                  key={m.id}
                  onClick={() => !isRunning && setAutoscalingMode(m.id)}
                  style={{
                    padding: '1rem',
                    background: isSelected ? 'rgba(6,182,212,0.1)' : 'rgba(255,255,255,0.02)',
                    border: `1.5px solid ${isSelected ? 'var(--cyan-primary)' : 'var(--border-subtle)'}`,
                    borderRadius: '12px',
                    cursor: isRunning ? 'not-allowed' : 'pointer',
                    boxShadow: isSelected ? '0 0 15px rgba(6,182,212,0.25)' : 'none',
                    opacity: isRunning && !isSelected ? 0.6 : 1,
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.4rem' }}>
                    <strong style={{ fontSize: '0.9rem', color: isSelected ? '#ffffff' : 'var(--text-secondary)' }}>
                      {m.name}
                    </strong>
                    <span className={`badge ${m.badgeClass}`}>{m.badge}</span>
                  </div>
                  <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                    {m.desc}
                  </p>
                </div>
              );
            })}
          </div>
        </div>

        {/* Experiment Parameters */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '1rem', marginBottom: '1.5rem' }}>
          
          {/* Target RPS */}
          <div>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.35rem' }}>
              <label style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', fontWeight: 600 }}>Target Peak RPS:</label>
              <span className="stat-mono" style={{ fontSize: '0.85rem', color: '#22d3ee', fontWeight: 700 }}>{targetRps} RPS</span>
            </div>
            <input
              type="range"
              min="30"
              max="300"
              step="10"
              value={targetRps}
              disabled={isRunning}
              onChange={(e) => setTargetRps(e.target.value)}
              style={{ width: '100%', accentColor: 'var(--cyan-primary)', cursor: isRunning ? 'not-allowed' : 'pointer' }}
            />
          </div>

          {/* Duration */}
          <div>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.35rem' }}>
              <label style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', fontWeight: 600 }}>Duration:</label>
              <span className="stat-mono" style={{ fontSize: '0.85rem', color: '#a78bfa', fontWeight: 700 }}>{durationSeconds}s</span>
            </div>
            <select
              value={durationSeconds}
              disabled={isRunning}
              onChange={(e) => setDurationSeconds(e.target.value)}
              style={{
                width: '100%',
                padding: '0.5rem',
                background: 'rgba(255,255,255,0.05)',
                border: '1px solid var(--border-subtle)',
                borderRadius: '8px',
                color: '#ffffff',
                fontFamily: 'var(--font-sans)',
                fontSize: '0.85rem',
              }}
            >
              <option value="60" style={{ background: '#0f172a' }}>60 Seconds (1 Minute)</option>
              <option value="120" style={{ background: '#0f172a' }}>120 Seconds (2 Minutes)</option>
              <option value="300" style={{ background: '#0f172a' }}>300 Seconds (5 Minutes)</option>
              <option value="600" style={{ background: '#0f172a' }}>600 Seconds (10 Minutes)</option>
            </select>
          </div>

          {/* SLO Latency */}
          <div>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.35rem' }}>
              <label style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', fontWeight: 600 }}>SLO Target Threshold:</label>
              <span className="stat-mono" style={{ fontSize: '0.85rem', color: '#f59e0b', fontWeight: 700 }}>{sloLatencyMs}ms</span>
            </div>
            <input
              type="number"
              min="50"
              max="1000"
              step="50"
              value={sloLatencyMs}
              disabled={isRunning}
              onChange={(e) => setSloLatencyMs(e.target.value)}
              style={{
                width: '100%',
                padding: '0.5rem',
                background: 'rgba(255,255,255,0.05)',
                border: '1px solid var(--border-subtle)',
                borderRadius: '8px',
                color: '#ffffff',
                fontFamily: 'var(--font-mono)',
                fontSize: '0.85rem',
              }}
            />
          </div>

          {/* Forecast Horizon */}
          <div>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.35rem' }}>
              <label style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', fontWeight: 600 }}>Forecast Horizon:</label>
              <span className="stat-mono" style={{ fontSize: '0.85rem', color: '#34d399', fontWeight: 700 }}>{forecastHorizonSeconds}s</span>
            </div>
            <input
              type="number"
              min="15"
              max="300"
              step="15"
              value={forecastHorizonSeconds}
              disabled={isRunning}
              onChange={(e) => setForecastHorizonSeconds(e.target.value)}
              style={{
                width: '100%',
                padding: '0.5rem',
                background: 'rgba(255,255,255,0.05)',
                border: '1px solid var(--border-subtle)',
                borderRadius: '8px',
                color: '#ffffff',
                fontFamily: 'var(--font-mono)',
                fontSize: '0.85rem',
              }}
            />
          </div>

        </div>

        {/* Submit Launch Button */}
        <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
          <button
            type="submit"
            disabled={isRunning || isStarting}
            className="btn-primary"
            style={{ width: '100%', maxWidth: '300px' }}
          >
            <Play size={18} fill="#ffffff" />
            {isStarting ? 'Dispatching...' : isRunning ? 'Experiment In Progress' : 'Launch Benchmark Experiment'}
          </button>
        </div>

      </form>
    </div>
  );
}
