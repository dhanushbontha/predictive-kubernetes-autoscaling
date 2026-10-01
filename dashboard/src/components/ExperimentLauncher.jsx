import React, { useState } from 'react';
import { 
  Play, Sparkles, Sliders, Zap, BarChart2, Activity, Shield, AlertTriangle, 
  Lock, CheckCircle2, ChevronDown, ChevronUp, Clock, Info, HelpCircle, ArrowRight
} from 'lucide-react';
import { 
  LOCKED_RESEARCH_CONFIG, RESEARCH_30_RUNS, evaluateResearchCampaign 
} from '../services/researchMatrix';

const DEMO_SCENARIOS = [
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
    name: 'Predictive (Prophet + KEDA)',
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

export default function ExperimentLauncher({ 
  onStartExperiment, 
  isStarting, 
  activeExp, 
  history = [],
  controlMode: controlledMode,
  onControlModeChange,
}) {
  const [internalMode, setInternalMode] = useState('RESEARCH'); // 'RESEARCH' | 'DEMO'
  const controlMode = controlledMode !== undefined ? controlledMode : internalMode;
  const setControlMode = (mode) => {
    if (onControlModeChange) {
      onControlModeChange(mode);
    } else {
      setInternalMode(mode);
    }
  };

  const [showScheduleMatrix, setShowScheduleMatrix] = useState(false);
  const [showConfirmModal, setShowConfirmModal] = useState(false);

  // Demo Mode Local State
  const [demoScenario, setDemoScenario] = useState('BURSTY');
  const [demoMode, setDemoMode] = useState('PREDICTIVE_PROPHET_KEDA');
  const [demoTargetRps, setDemoTargetRps] = useState(60);
  const [demoDurationSeconds, setDemoDurationSeconds] = useState(120);
  const [demoSloLatencyMs, setDemoSloLatencyMs] = useState(200);
  const [demoForecastHorizonSeconds, setDemoForecastHorizonSeconds] = useState(60);

  const isRunning = activeExp && (activeExp.status === 'STARTING' || activeExp.status === 'RUNNING');

  // Derive research campaign state from locked matrix and history
  const campaign = evaluateResearchCampaign(history);
  const scheduledRun = campaign.nextRun;

  // Handle Research Mode Start (with Confirmation Modal)
  const handleOpenResearchConfirm = (e) => {
    e.preventDefault();
    if (isRunning || campaign.isCampaignComplete) return;
    setShowConfirmModal(true);
  };

  const handleConfirmResearchStart = () => {
    setShowConfirmModal(false);
    if (isRunning || !scheduledRun) return;

    const payload = {
      name: `Run_${String(scheduledRun.runNumber).padStart(2, '0')}_${scheduledRun.scenario}_${scheduledRun.controller}_Rep${scheduledRun.replication}`,
      scenario: scheduledRun.scenario,
      autoscalingMode: scheduledRun.controller,
      targetRps: scheduledRun.targetRps,
      durationSeconds: LOCKED_RESEARCH_CONFIG.evaluationDurationSeconds,
      sloLatencyMs: LOCKED_RESEARCH_CONFIG.sloLatencyMs,
      forecastHorizonSeconds: LOCKED_RESEARCH_CONFIG.forecastHorizonSeconds,
      runNumber: scheduledRun.runNumber,
      repetition: scheduledRun.replication,
      isDemo: false,
    };

    onStartExperiment(payload);
  };

  // Handle Demo Mode Start
  const handleDemoSubmit = (e) => {
    e.preventDefault();
    if (isRunning) return;

    const payload = {
      name: `DEMO_${demoScenario}_${demoMode === 'PREDICTIVE_PROPHET_KEDA' ? 'KEDA' : 'HPA'}_${Date.now().toString().slice(-4)}`,
      scenario: demoScenario,
      autoscalingMode: demoMode,
      targetRps: Number(demoTargetRps),
      durationSeconds: Number(demoDurationSeconds),
      sloLatencyMs: Number(demoSloLatencyMs),
      forecastHorizonSeconds: Number(demoForecastHorizonSeconds),
      isDemo: true,
    };

    onStartExperiment(payload);
  };

  return (
    <div className="glass-panel" style={{ padding: '1.5rem', marginBottom: '1.5rem' }}>
      
      {/* Top Header & Mode Toggle Switcher */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '1rem', marginBottom: '1.25rem', borderBottom: '1px solid var(--border-subtle)', paddingBottom: '1rem' }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
            <Sparkles size={20} color="#06b6d4" />
            <h2 style={{ fontSize: '1.2rem', fontWeight: 700 }}>Experiment Benchmark Controller</h2>
          </div>
          <p style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', marginTop: '0.2rem' }}>
            {controlMode === 'RESEARCH' 
              ? 'Sequential 30-Run Locked Research Matrix Execution Engine' 
              : 'Interactive Live Sandbox for System Demonstration (Excluded from Research Dataset)'}
          </p>
        </div>

        {/* Mode Toggle Buttons */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', background: 'rgba(0,0,0,0.3)', padding: '0.3rem', borderRadius: '10px', border: '1px solid var(--border-subtle)' }}>
          <button
            type="button"
            onClick={() => setControlMode('RESEARCH')}
            style={{
              padding: '0.45rem 0.9rem',
              borderRadius: '8px',
              fontSize: '0.82rem',
              fontWeight: 700,
              display: 'flex',
              alignItems: 'center',
              gap: '0.4rem',
              border: controlMode === 'RESEARCH' ? '1px solid #10b981' : '1px solid transparent',
              background: controlMode === 'RESEARCH' ? 'rgba(16,185,129,0.2)' : 'transparent',
              color: controlMode === 'RESEARCH' ? '#34d399' : 'var(--text-muted)',
              cursor: 'pointer',
              transition: 'all 0.2s ease',
            }}
          >
            <Lock size={14} />
            <span>Research Mode (Locked)</span>
          </button>

          <button
            type="button"
            onClick={() => setControlMode('DEMO')}
            style={{
              padding: '0.45rem 0.9rem',
              borderRadius: '8px',
              fontSize: '0.82rem',
              fontWeight: 700,
              display: 'flex',
              alignItems: 'center',
              gap: '0.4rem',
              border: controlMode === 'DEMO' ? '1px solid #f59e0b' : '1px solid transparent',
              background: controlMode === 'DEMO' ? 'rgba(245,158,11,0.2)' : 'transparent',
              color: controlMode === 'DEMO' ? '#fbbf24' : 'var(--text-muted)',
              cursor: 'pointer',
              transition: 'all 0.2s ease',
            }}
          >
            <Sliders size={14} />
            <span>Demo Mode (Sandbox)</span>
          </button>
        </div>
      </div>

      {/* ========================================================================= */}
      {/* 1. RESEARCH MODE — LOCKED 30-RUN PROTOCOL                                */}
      {/* ========================================================================= */}
      {controlMode === 'RESEARCH' && (
        <div>
          
          {/* Campaign Progress Status Bar */}
          <div style={{
            background: 'rgba(15,23,42,0.6)',
            border: '1px solid var(--border-subtle)',
            borderRadius: '12px',
            padding: '1rem',
            marginBottom: '1.25rem',
          }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.6rem' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
                <span className="badge badge-emerald" style={{ fontSize: '0.75rem', fontWeight: 700 }}>
                  LOCKED RESEARCH PROTOCOL
                </span>
                <span style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>
                  Campaign Progress: <strong style={{ color: '#ffffff' }}>{campaign.completedCount} / 30 Runs Completed</strong>
                </span>
              </div>
              <span className="stat-mono" style={{ fontSize: '0.85rem', color: '#38bdf8' }}>
                {campaign.remainingCount} Remaining
              </span>
            </div>

            {/* Visual Progress Meter */}
            <div style={{ width: '100%', height: '8px', background: 'rgba(255,255,255,0.06)', borderRadius: '4px', overflow: 'hidden', marginBottom: '0.5rem' }}>
              <div 
                style={{ 
                  width: `${(campaign.completedCount / 30) * 100}%`, 
                  height: '100%', 
                  background: 'linear-gradient(90deg, #10b981 0%, #06b6d4 100%)',
                  transition: 'width 0.4s ease',
                }} 
              />
            </div>
          </div>

          {/* Current Scheduled Run Card */}
          <div style={{
            background: 'linear-gradient(135deg, rgba(6,182,212,0.08) 0%, rgba(139,92,246,0.08) 100%)',
            border: '1.5px solid rgba(6,182,212,0.4)',
            borderRadius: '14px',
            padding: '1.25rem',
            marginBottom: '1.25rem',
            position: 'relative',
          }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '0.75rem', marginBottom: '1rem' }}>
              <div>
                <span style={{ fontSize: '0.75rem', textTransform: 'uppercase', letterSpacing: '0.08em', color: '#38bdf8', fontWeight: 700 }}>
                  CURRENT SCHEDULED RESEARCH RUN
                </span>
                <h3 style={{ fontSize: '1.4rem', fontWeight: 800, color: '#ffffff', margin: '0.2rem 0' }}>
                  Run {String(scheduledRun.runNumber).padStart(2, '0')} / 30
                  <span style={{ fontSize: '0.9rem', color: 'var(--text-secondary)', fontWeight: 500, marginLeft: '0.75rem' }}>
                    (Replication {scheduledRun.replication} of 3)
                  </span>
                </h3>
              </div>

              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <span className={`badge ${scheduledRun.controller === 'PREDICTIVE_PROPHET_KEDA' ? 'badge-cyan' : 'badge-amber'}`} style={{ fontSize: '0.78rem' }}>
                  {scheduledRun.controller === 'PREDICTIVE_PROPHET_KEDA' ? '🔮 PREDICTIVE (PROPHET + KEDA)' : '⚡ REACTIVE (CPU HPA)'}
                </span>
                <span className="badge badge-zinc" style={{ display: 'flex', alignItems: 'center', gap: '0.3rem', fontSize: '0.75rem' }}>
                  <Lock size={11} /> READ-ONLY
                </span>
              </div>
            </div>

            {/* Read-Only Parameters Grid */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '0.75rem', marginBottom: '1.25rem' }}>
              
              {/* Workload Card */}
              <div style={{ background: 'rgba(0,0,0,0.25)', padding: '0.75rem', borderRadius: '10px', border: '1px solid rgba(255,255,255,0.06)' }}>
                <span style={{ fontSize: '0.72rem', color: 'var(--text-muted)', display: 'flex', alignItems: 'center', gap: '0.3rem' }}>
                  <Activity size={12} color="#06b6d4" /> WORKLOAD PATTERN
                </span>
                <strong style={{ fontSize: '0.95rem', color: '#ffffff', display: 'block', marginTop: '0.2rem' }}>
                  {scheduledRun.scenario}
                </strong>
                <span style={{ fontSize: '0.75rem', color: '#38bdf8' }}>
                  {scheduledRun.loadDesc}
                </span>
              </div>

              {/* Evaluation Duration */}
              <div style={{ background: 'rgba(0,0,0,0.25)', padding: '0.75rem', borderRadius: '10px', border: '1px solid rgba(255,255,255,0.06)' }}>
                <span style={{ fontSize: '0.72rem', color: 'var(--text-muted)', display: 'flex', alignItems: 'center', gap: '0.3rem' }}>
                  <Clock size={12} color="#a78bfa" /> EVALUATION WINDOW
                </span>
                <strong style={{ fontSize: '0.95rem', color: '#ffffff', display: 'block', marginTop: '0.2rem' }}>
                  180 Seconds
                </strong>
                <span style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>
                  Locked Duration
                </span>
              </div>

              {/* Forecast Horizon */}
              <div style={{ background: 'rgba(0,0,0,0.25)', padding: '0.75rem', borderRadius: '10px', border: '1px solid rgba(255,255,255,0.06)' }}>
                <span style={{ fontSize: '0.72rem', color: 'var(--text-muted)', display: 'flex', alignItems: 'center', gap: '0.3rem' }}>
                  <Zap size={12} color="#34d399" /> FORECAST HORIZON
                </span>
                <strong style={{ fontSize: '0.95rem', color: '#ffffff', display: 'block', marginTop: '0.2rem' }}>
                  {scheduledRun.controller === 'PREDICTIVE_PROPHET_KEDA' ? '60 Seconds' : 'N/A (Reactive)'}
                </strong>
                <span style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>
                  Frequency: 5s
                </span>
              </div>

              {/* SLO Threshold */}
              <div style={{ background: 'rgba(0,0,0,0.25)', padding: '0.75rem', borderRadius: '10px', border: '1px solid rgba(255,255,255,0.06)' }}>
                <span style={{ fontSize: '0.72rem', color: 'var(--text-muted)', display: 'flex', alignItems: 'center', gap: '0.3rem' }}>
                  <Shield size={12} color="#f59e0b" /> SLO LATENCY THRESHOLD
                </span>
                <strong style={{ fontSize: '0.95rem', color: '#ffffff', display: 'block', marginTop: '0.2rem' }}>
                  200 ms
                </strong>
                <span style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>
                  Rigorous Discrete Audit
                </span>
              </div>

            </div>

            {/* Launch Button */}
            <div style={{ display: 'flex', justifyContent: 'flex-end', alignItems: 'center', gap: '1rem' }}>
              <span style={{ fontSize: '0.78rem', color: 'var(--text-muted)' }}>
                Parameters are locked per research methodology. Click to confirm and execute.
              </span>
              <button
                type="button"
                onClick={handleOpenResearchConfirm}
                disabled={isRunning || isStarting || campaign.isCampaignComplete}
                className="btn-primary"
                style={{
                  padding: '0.7rem 1.5rem',
                  fontSize: '0.9rem',
                  fontWeight: 700,
                  borderRadius: '10px',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.5rem',
                  boxShadow: '0 0 20px rgba(6,182,212,0.3)',
                  cursor: isRunning ? 'not-allowed' : 'pointer',
                  opacity: isRunning ? 0.6 : 1,
                }}
              >
                <Play size={18} fill="#ffffff" />
                {isStarting ? 'Dispatching Run...' : isRunning ? 'Experiment in Progress' : `Start Run ${String(scheduledRun.runNumber).padStart(2, '0')}`}
              </button>
            </div>
          </div>

          {/* Locked Protocol Specifications Box */}
          <div style={{
            background: 'rgba(255,255,255,0.02)',
            border: '1px solid var(--border-subtle)',
            borderRadius: '12px',
            padding: '1rem',
            marginBottom: '1rem',
          }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.75rem' }}>
              <span style={{ fontSize: '0.82rem', fontWeight: 700, color: 'var(--text-secondary)', display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                <Lock size={14} color="#10b981" /> LOCKED RESEARCH PROTOCOL SPECIFICATIONS
              </span>
              <span className="badge badge-emerald" style={{ fontSize: '0.7rem' }}>IMMUTABLE</span>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: '1rem', fontSize: '0.78rem', color: 'var(--text-secondary)' }}>
              
              {/* KEDA Constraints */}
              <div style={{ background: 'rgba(0,0,0,0.2)', padding: '0.75rem', borderRadius: '8px', borderLeft: '3px solid #06b6d4' }}>
                <strong style={{ color: '#ffffff', display: 'block', marginBottom: '0.3rem' }}>KEDA Predictive Scaling:</strong>
                <ul style={{ paddingLeft: '1.2rem', margin: 0, lineHeight: 1.5 }}>
                  <li>Metric: <code className="stat-mono" style={{ color: '#22d3ee' }}>predicted_workload_requests_per_second</code></li>
                  <li>Threshold: <strong style={{ color: '#ffffff' }}>20 RPS</strong> per pod</li>
                  <li>Min / Max Replicas: <strong style={{ color: '#ffffff' }}>1 / 5</strong></li>
                  <li>Polling Interval: <strong style={{ color: '#ffffff' }}>5s</strong> | Cooldown: <strong style={{ color: '#ffffff' }}>30s</strong></li>
                </ul>
              </div>

              {/* HPA Constraints */}
              <div style={{ background: 'rgba(0,0,0,0.2)', padding: '0.75rem', borderRadius: '8px', borderLeft: '3px solid #f59e0b' }}>
                <strong style={{ color: '#ffffff', display: 'block', marginBottom: '0.3rem' }}>HPA Reactive Scaling:</strong>
                <ul style={{ paddingLeft: '1.2rem', margin: 0, lineHeight: 1.5 }}>
                  <li>Metric: <code className="stat-mono" style={{ color: '#f59e0b' }}>CPU Utilization Percentage</code></li>
                  <li>Target: <strong style={{ color: '#ffffff' }}>50% CPU</strong></li>
                  <li>Min / Max Replicas: <strong style={{ color: '#ffffff' }}>1 / 5</strong></li>
                  <li>Scale-down stabilization: <strong style={{ color: '#ffffff' }}>60s</strong></li>
                </ul>
              </div>

            </div>
          </div>

          {/* Collapsible 30-Run Matrix Schedule Table */}
          <div style={{
            background: 'rgba(15,23,42,0.4)',
            border: '1px solid var(--border-subtle)',
            borderRadius: '12px',
            overflow: 'hidden',
          }}>
            <div 
              onClick={() => setShowScheduleMatrix(!showScheduleMatrix)}
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                padding: '0.85rem 1.25rem',
                cursor: 'pointer',
                background: 'rgba(255,255,255,0.02)',
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
                <BarChart2 size={16} color="#06b6d4" />
                <span style={{ fontSize: '0.85rem', fontWeight: 600, color: '#ffffff' }}>
                  Official 30-Experiment Research Schedule Matrix
                </span>
                <span className="badge badge-cyan" style={{ fontSize: '0.7rem' }}>
                  {campaign.completedCount} / 30 Done
                </span>
              </div>
              {showScheduleMatrix ? <ChevronUp size={16} color="var(--text-muted)" /> : <ChevronDown size={16} color="var(--text-muted)" />}
            </div>

            {showScheduleMatrix && (
              <div style={{ maxHeight: '340px', overflowY: 'auto', padding: '0.5rem 1rem' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.78rem' }}>
                  <thead>
                    <tr style={{ borderBottom: '1px solid var(--border-subtle)', color: 'var(--text-muted)', textAlign: 'left' }}>
                      <th style={{ padding: '0.5rem' }}>Run #</th>
                      <th style={{ padding: '0.5rem' }}>Rep</th>
                      <th style={{ padding: '0.5rem' }}>Workload Scenario</th>
                      <th style={{ padding: '0.5rem' }}>Autoscaling Controller</th>
                      <th style={{ padding: '0.5rem' }}>Load Profile</th>
                      <th style={{ padding: '0.5rem' }}>Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {RESEARCH_30_RUNS.map((run) => {
                      const isCompleted = Boolean(campaign.completedRunMap[run.runNumber]);
                      const isCurrent = scheduledRun.runNumber === run.runNumber;
                      return (
                        <tr 
                          key={run.runNumber}
                          style={{
                            borderBottom: '1px solid rgba(255,255,255,0.03)',
                            background: isCurrent ? 'rgba(6,182,212,0.12)' : isCompleted ? 'rgba(16,185,129,0.04)' : 'transparent',
                          }}
                        >
                          <td style={{ padding: '0.5rem', fontWeight: isCurrent ? 800 : 500, color: isCurrent ? '#22d3ee' : '#ffffff' }}>
                            Run {String(run.runNumber).padStart(2, '0')}
                          </td>
                          <td style={{ padding: '0.5rem', color: 'var(--text-secondary)' }}>
                            Rep {run.replication}
                          </td>
                          <td style={{ padding: '0.5rem' }}>
                            <span style={{ color: LOCKED_RESEARCH_CONFIG.workloads[run.scenario]?.color || '#ffffff', fontWeight: 600 }}>
                              {run.scenario}
                            </span>
                          </td>
                          <td style={{ padding: '0.5rem' }}>
                            <span className={`badge ${run.controller === 'PREDICTIVE_PROPHET_KEDA' ? 'badge-cyan' : 'badge-amber'}`} style={{ fontSize: '0.68rem' }}>
                              {run.controller === 'PREDICTIVE_PROPHET_KEDA' ? 'PROPHET + KEDA' : 'REACTIVE HPA'}
                            </span>
                          </td>
                          <td style={{ padding: '0.5rem', color: 'var(--text-secondary)' }}>
                            {run.loadDesc}
                          </td>
                          <td style={{ padding: '0.5rem' }}>
                            {isCompleted ? (
                              <span style={{ color: '#34d399', display: 'flex', alignItems: 'center', gap: '0.3rem', fontWeight: 600 }}>
                                <CheckCircle2 size={13} /> COMPLETED
                              </span>
                            ) : isCurrent ? (
                              <span style={{ color: '#38bdf8', fontWeight: 700 }}>
                                ▶ NEXT UP
                              </span>
                            ) : (
                              <span style={{ color: 'var(--text-muted)' }}>
                                QUEUED
                              </span>
                            )}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </div>

        </div>
      )}

      {/* ========================================================================= */}
      {/* 2. DEMO MODE — INTERACTIVE LIVE DEMONSTRATION                             */}
      {/* ========================================================================= */}
      {controlMode === 'DEMO' && (
        <div>
          
          {/* Prominent Exclusion Warning Banner */}
          <div style={{
            background: 'rgba(245, 158, 11, 0.12)',
            border: '1.5px solid #f59e0b',
            borderRadius: '12px',
            padding: '1rem 1.25rem',
            marginBottom: '1.25rem',
            display: 'flex',
            alignItems: 'center',
            gap: '1rem',
          }}>
            <AlertTriangle size={24} color="#fbbf24" style={{ flexShrink: 0 }} />
            <div>
              <strong style={{ fontSize: '0.95rem', color: '#fbbf24', display: 'block', marginBottom: '0.2rem' }}>
                DEMO MODE — NOT INCLUDED IN RESEARCH DATASET
              </strong>
              <p style={{ fontSize: '0.78rem', color: 'var(--text-secondary)', margin: 0, lineHeight: 1.4 }}>
                This interactive sandbox is for practical live demonstration. Experiments executed here use the real in-cluster Kubernetes/Prophet/KEDA infrastructure but are strictly isolated from the official 30-run research benchmark results.
              </p>
            </div>
          </div>

          <form onSubmit={handleDemoSubmit}>
            
            {/* Scenario Selection Grid */}
            <div style={{ marginBottom: '1.25rem' }}>
              <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 600, color: 'var(--text-secondary)', marginBottom: '0.6rem' }}>
                1. Select Demonstration Workload Pattern:
              </label>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '0.75rem' }}>
                {DEMO_SCENARIOS.map((s) => {
                  const isSelected = demoScenario === s.id;
                  const Icon = s.icon;
                  return (
                    <div
                      key={s.id}
                      onClick={() => !isRunning && setDemoScenario(s.id)}
                      style={{
                        padding: '0.9rem',
                        background: isSelected ? 'rgba(245,158,11,0.12)' : 'rgba(255,255,255,0.02)',
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
                  const isSelected = demoMode === m.id;
                  return (
                    <div
                      key={m.id}
                      onClick={() => !isRunning && setDemoMode(m.id)}
                      style={{
                        padding: '1rem',
                        background: isSelected ? 'rgba(245,158,11,0.1)' : 'rgba(255,255,255,0.02)',
                        border: `1.5px solid ${isSelected ? '#f59e0b' : 'var(--border-subtle)'}`,
                        borderRadius: '12px',
                        cursor: isRunning ? 'not-allowed' : 'pointer',
                        boxShadow: isSelected ? '0 0 15px rgba(245,158,11,0.25)' : 'none',
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

            {/* Interactive Demo Parameters */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '1rem', marginBottom: '1.5rem' }}>
              
              {/* Target RPS */}
              <div>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.35rem' }}>
                  <label style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', fontWeight: 600 }}>Target Peak RPS:</label>
                  <span className="stat-mono" style={{ fontSize: '0.85rem', color: '#fbbf24', fontWeight: 700 }}>{demoTargetRps} RPS</span>
                </div>
                <input
                  type="range"
                  min="20"
                  max="150"
                  step="10"
                  value={demoTargetRps}
                  disabled={isRunning}
                  onChange={(e) => setDemoTargetRps(e.target.value)}
                  style={{ width: '100%', accentColor: '#f59e0b', cursor: isRunning ? 'not-allowed' : 'pointer' }}
                />
              </div>

              {/* Duration */}
              <div>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.35rem' }}>
                  <label style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', fontWeight: 600 }}>Duration:</label>
                  <span className="stat-mono" style={{ fontSize: '0.85rem', color: '#a78bfa', fontWeight: 700 }}>{demoDurationSeconds}s</span>
                </div>
                <select
                  value={demoDurationSeconds}
                  disabled={isRunning}
                  onChange={(e) => setDemoDurationSeconds(e.target.value)}
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
                  <option value="30" style={{ background: '#0f172a' }}>30 Seconds (Quick Smoke)</option>
                  <option value="60" style={{ background: '#0f172a' }}>60 Seconds (1 Minute)</option>
                  <option value="120" style={{ background: '#0f172a' }}>120 Seconds (2 Minutes)</option>
                  <option value="180" style={{ background: '#0f172a' }}>180 Seconds (3 Minutes)</option>
                </select>
              </div>

              {/* SLO Latency */}
              <div>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.35rem' }}>
                  <label style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', fontWeight: 600 }}>SLO Target Threshold:</label>
                  <span className="stat-mono" style={{ fontSize: '0.85rem', color: '#f59e0b', fontWeight: 700 }}>{demoSloLatencyMs}ms</span>
                </div>
                <input
                  type="number"
                  min="50"
                  max="1000"
                  step="50"
                  value={demoSloLatencyMs}
                  disabled={isRunning}
                  onChange={(e) => setDemoSloLatencyMs(e.target.value)}
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
                  <span className="stat-mono" style={{ fontSize: '0.85rem', color: '#34d399', fontWeight: 700 }}>{demoForecastHorizonSeconds}s</span>
                </div>
                <input
                  type="number"
                  min="15"
                  max="120"
                  step="15"
                  value={demoForecastHorizonSeconds}
                  disabled={isRunning}
                  onChange={(e) => setDemoForecastHorizonSeconds(e.target.value)}
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

            {/* Launch Demo Button */}
            <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
              <button
                type="submit"
                disabled={isRunning || isStarting}
                className="btn"
                style={{
                  width: '100%',
                  maxWidth: '320px',
                  background: 'linear-gradient(135deg, #f59e0b 0%, #d97706 100%)',
                  color: '#ffffff',
                  fontWeight: 700,
                  padding: '0.75rem 1.5rem',
                  borderRadius: '10px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '0.5rem',
                  border: 'none',
                  cursor: isRunning ? 'not-allowed' : 'pointer',
                  boxShadow: '0 0 15px rgba(245,158,11,0.3)',
                }}
              >
                <Play size={18} fill="#ffffff" />
                {isStarting ? 'Dispatching Demo...' : isRunning ? 'Experiment In Progress' : 'Launch Live Demo Experiment'}
              </button>
            </div>

          </form>
        </div>
      )}

      {/* ========================================================================= */}
      {/* 3. CONFIRMATION MODAL BEFORE STARTING RESEARCH RUN                       */}
      {/* ========================================================================= */}
      {showConfirmModal && scheduledRun && (
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          width: '100vw',
          height: '100vh',
          background: 'rgba(0,0,0,0.75)',
          backdropFilter: 'blur(8px)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 9999,
          padding: '1rem',
        }}>
          <div style={{
            background: '#0f172a',
            border: '2px solid #06b6d4',
            borderRadius: '16px',
            maxWidth: '520px',
            width: '100%',
            padding: '2rem',
            boxShadow: '0 20px 50px rgba(0,0,0,0.8), 0 0 30px rgba(6,182,212,0.3)',
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '1rem' }}>
              <div style={{ background: 'rgba(6,182,212,0.2)', padding: '0.6rem', borderRadius: '10px' }}>
                <Shield size={24} color="#06b6d4" />
              </div>
              <div>
                <h3 style={{ fontSize: '1.25rem', fontWeight: 800, color: '#ffffff', margin: 0 }}>
                  Confirm Research Experiment Execution
                </h3>
                <span style={{ fontSize: '0.78rem', color: '#38bdf8' }}>Official 30-Run Matrix Verification</span>
              </div>
            </div>

            <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', marginBottom: '1.25rem', lineHeight: 1.4 }}>
              You are about to start the following locked research run:
            </p>

            <div style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid var(--border-subtle)', borderRadius: '10px', padding: '1rem', marginBottom: '1.25rem' }}>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.6rem', fontSize: '0.82rem' }}>
                <div>
                  <span style={{ color: 'var(--text-muted)' }}>Run Index:</span>
                  <strong style={{ color: '#ffffff', display: 'block' }}>Run {String(scheduledRun.runNumber).padStart(2, '0')} / 30</strong>
                </div>
                <div>
                  <span style={{ color: 'var(--text-muted)' }}>Replication:</span>
                  <strong style={{ color: '#ffffff', display: 'block' }}>Replication {scheduledRun.replication} of 3</strong>
                </div>
                <div>
                  <span style={{ color: 'var(--text-muted)' }}>Workload:</span>
                  <strong style={{ color: '#ffffff', display: 'block' }}>{scheduledRun.scenario} ({scheduledRun.loadDesc})</strong>
                </div>
                <div>
                  <span style={{ color: 'var(--text-muted)' }}>Controller:</span>
                  <strong style={{ color: scheduledRun.controller === 'PREDICTIVE_PROPHET_KEDA' ? '#22d3ee' : '#fbbf24', display: 'block' }}>
                    {scheduledRun.controller}
                  </strong>
                </div>
                <div>
                  <span style={{ color: 'var(--text-muted)' }}>Duration:</span>
                  <strong style={{ color: '#ffffff', display: 'block' }}>180 seconds</strong>
                </div>
                <div>
                  <span style={{ color: 'var(--text-muted)' }}>SLO Target:</span>
                  <strong style={{ color: '#ffffff', display: 'block' }}>200 ms</strong>
                </div>
              </div>

              <div style={{ marginTop: '0.75rem', paddingTop: '0.75rem', borderTop: '1px solid rgba(255,255,255,0.06)', fontSize: '0.75rem', color: '#34d399', display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                <CheckCircle2 size={13} /> Research configuration is locked.
              </div>
            </div>

            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.75rem' }}>
              <button
                type="button"
                onClick={() => setShowConfirmModal(false)}
                className="btn-secondary"
                style={{ padding: '0.6rem 1.25rem', fontSize: '0.85rem', borderRadius: '8px' }}
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleConfirmResearchStart}
                className="btn-primary"
                style={{ padding: '0.6rem 1.5rem', fontSize: '0.85rem', fontWeight: 700, borderRadius: '8px' }}
              >
                Confirm & Start Run {String(scheduledRun.runNumber).padStart(2, '0')}
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
