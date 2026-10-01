import React, { useState, useEffect } from 'react';
import {
  Scale,
  Award,
  Sparkles,
  BarChart3,
  Layers,
  Zap,
} from 'lucide-react';
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  Legend,
  CartesianGrid,
} from 'recharts';
import { getComparison } from '../services/api';
import { isMeasured, formatInt, formatMs, formatPercent, formatSeconds, formatMaeRmse } from '../services/formatters';
import { isDemoExperiment } from '../services/researchMatrix';

const SCENARIOS = [
  { id: 'STABLE', label: 'Stable Load', desc: 'Constant uniform workload (30 RPS benchmark baseline)' },
  { id: 'BURSTY', label: 'Bursty Traffic', desc: 'Sudden traffic surges evaluating reactive spin-up lag' },
  { id: 'PERIODIC', label: 'Periodic / Diurnal', desc: 'Cyclical sinusoidal wave pattern' },
  { id: 'GRADUAL', label: 'Gradual Ramp', desc: 'Smooth linear traffic ramp-up and ramp-down' },
  { id: 'NOISY', label: 'Noisy Fluctuations', desc: 'Stochastic random jitter fluctuations' },
];

export default function ComparisonView({ history = [], appMode = 'RESEARCH' }) {
  const [selectedScenario, setSelectedScenario] = useState('STABLE');
  const [comparisonData, setComparisonData] = useState(null);
  const [loading, setLoading] = useState(false);

  const isDemoMode = appMode === 'DEMO';
  const modeHistory = React.useMemo(() => {
    return Array.isArray(history) 
      ? history.filter((e) => (isDemoMode ? isDemoExperiment(e) : !isDemoExperiment(e)))
      : [];
  }, [history, isDemoMode]);

  const hpaRun = React.useMemo(() => {
    return modeHistory.find(
      (e) => e.scenario === selectedScenario && e.autoscalingMode === 'REACTIVE_HPA' && (e.status === 'COMPLETED' || e.status === 'VALID')
    ) || null;
  }, [modeHistory, selectedScenario]);

  const kedaRun = React.useMemo(() => {
    return modeHistory.find(
      (e) => e.scenario === selectedScenario && e.autoscalingMode === 'PREDICTIVE_PROPHET_KEDA' && (e.status === 'COMPLETED' || e.status === 'VALID')
    ) || null;
  }, [modeHistory, selectedScenario]);

  const hasHpa = Boolean(hpaRun);
  const hasKeda = Boolean(kedaRun);

  // Auto-find latest HPA and KEDA runs for the chosen scenario
  useEffect(() => {
    async function loadComparison() {
      if (hpaRun && kedaRun) {
        setLoading(true);
        try {
          const data = await getComparison(hpaRun.id, kedaRun.id);
          if (data) {
            setComparisonData(data);
          } else {
            setComparisonData(null);
          }
        } catch (err) {
          console.warn('Comparison load warning:', err.message);
          setComparisonData(null);
        } finally {
          setLoading(false);
        }
      } else {
        setComparisonData(null);
      }
    }
    loadComparison();
  }, [hpaRun, kedaRun]);

  const hpa = comparisonData?.reactiveHpaExperiment?.result || null;
  const keda = comparisonData?.predictiveKedaExperiment?.result || null;
  const hpaMeta = comparisonData?.reactiveHpaExperiment || null;
  const kedaMeta = comparisonData?.predictiveKedaExperiment || null;
  const hasBoth = Boolean(hasHpa && hasKeda && hpa && keda);

  if (!hasBoth) {
    let emptyTitle = '';
    let emptyDesc = '';

    if (isDemoMode) {
      if (!hasHpa && !hasKeda) {
        emptyTitle = 'No demo comparison data available yet.';
        emptyDesc = 'Neither Reactive (HPA) nor Predictive (Prophet + KEDA) demo experiments have been completed for this scenario yet.';
      } else if (hasHpa && !hasKeda) {
        emptyTitle = 'No predictive demo comparison data available yet.';
        emptyDesc = 'Reactive HPA demo experiments are available for this scenario, but no completed Predictive (Prophet + KEDA) demo experiment is available for comparison yet.';
      } else if (!hasHpa && hasKeda) {
        emptyTitle = 'No reactive demo comparison data available yet.';
        emptyDesc = 'Predictive (Prophet + KEDA) demo experiments are available for this scenario, but no completed Reactive HPA demo experiment is available for comparison yet.';
      }
    } else {
      emptyTitle = `Awaiting Paired Benchmark Data for ${selectedScenario}`;
      if (!hasHpa && !hasKeda) {
        emptyDesc = `Neither Reactive (HPA) nor Predictive (KEDA) experiments have been completed for the ${selectedScenario} scenario yet. Execute both controller runs to generate verified side-by-side comparative analytics.`;
      } else if (hasHpa && !hasKeda) {
        const hpaP95 = hpaRun?.result?.k6P95LatencyMs ?? hpaRun?.result?.p95LatencyMs;
        emptyDesc = `Reactive HPA experiment completed (P95: ${formatMs(hpaP95)}), but no Predictive KEDA run exists for ${selectedScenario}. Run a Predictive KEDA experiment to compare performance.`;
      } else if (!hasHpa && hasKeda) {
        const kedaP95 = kedaRun?.result?.k6P95LatencyMs ?? kedaRun?.result?.p95LatencyMs;
        emptyDesc = `Predictive KEDA experiment completed (P95: ${formatMs(kedaP95)}), but no Reactive HPA run exists for ${selectedScenario}. Run a Reactive HPA experiment to compare performance.`;
      }
    }

    return (
      <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem', marginBottom: '2rem' }}>
        {/* Header & Scenario Selector */}
        <div className="glass-panel" style={{ padding: '1.25rem' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '1rem', marginBottom: '1.25rem' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
              <div style={{
                background: isDemoMode 
                  ? 'linear-gradient(135deg, rgba(245,158,11,0.2) 0%, rgba(6,182,212,0.2) 100%)'
                  : 'linear-gradient(135deg, rgba(139,92,246,0.2) 0%, rgba(6,182,212,0.2) 100%)',
                padding: '0.6rem',
                borderRadius: '10px',
                border: isDemoMode ? '1px solid rgba(245,158,11,0.4)' : '1px solid rgba(139,92,246,0.4)',
              }}>
                <Scale size={22} color={isDemoMode ? '#f59e0b' : '#8b5cf6'} />
              </div>
              <div>
                <h2 style={{ fontSize: '1.15rem', fontWeight: 700, color: '#ffffff' }}>
                  {isDemoMode ? 'Demo Sandbox Comparison & Evaluation' : 'Benchmark Comparison & Evaluation Engine'}
                </h2>
                <p style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>
                  {isDemoMode 
                    ? 'Side-by-side empirical evaluation of live demo experiments'
                    : 'Head-to-head empirical evaluation: Reactive HPA vs Predictive Prophet + KEDA'}
                </p>
              </div>
            </div>
            <span className={`badge ${isDemoMode ? 'badge-amber' : 'badge-zinc'}`} style={{ fontSize: '0.75rem', padding: '0.35rem 0.75rem' }}>
              <Sparkles size={13} style={{ marginRight: '4px' }} />
              {isDemoMode ? 'DEMO SANDBOX EVALUATION' : 'AWAITING COMPLETE PAIR'}
            </span>
          </div>

          {/* Scenario Pill Buttons */}
          <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
            {SCENARIOS.map((sc) => {
              const isSelected = selectedScenario === sc.id;
              return (
                <button
                  key={sc.id}
                  onClick={() => setSelectedScenario(sc.id)}
                  className={`btn ${isSelected ? 'btn-primary' : 'btn-secondary'}`}
                  style={{
                    padding: '0.5rem 1rem',
                    fontSize: '0.8rem',
                    borderRadius: '0.5rem',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '0.4rem',
                    border: isSelected ? (isDemoMode ? '1px solid #f59e0b' : '1px solid #06b6d4') : '1px solid var(--border-subtle)',
                  }}
                >
                  <span style={{ fontWeight: isSelected ? 700 : 500 }}>{sc.label}</span>
                </button>
              );
            })}
          </div>
        </div>

        {/* Empty State Banner */}
        <div className="glass-panel" style={{ textAlign: 'center', padding: '3.5rem 1.5rem' }}>
          <Scale size={48} color={isDemoMode ? '#f59e0b' : '#64748b'} style={{ margin: '0 auto 1rem', opacity: 0.6 }} />
          <h3 style={{ fontSize: '1.1rem', fontWeight: 600, color: '#ffffff', marginBottom: '0.5rem' }}>
            {emptyTitle}
          </h3>
          <p style={{ color: 'var(--text-secondary)', fontSize: '0.85rem', maxWidth: '540px', margin: '0 auto', lineHeight: 1.6 }}>
            {emptyDesc}
          </p>
        </div>
      </div>
    );
  }

  // Prioritize exact k6 discrete request metrics
  const hpaP95 = hpa.k6P95LatencyMs ?? hpa.p95LatencyMs ?? 0;
  const kedaP95 = keda.k6P95LatencyMs ?? keda.p95LatencyMs ?? 0;
  const p95Diff = hpaP95 - kedaP95;
  const p95Pct = hpaP95 > 0 ? ((p95Diff / hpaP95) * 100).toFixed(1) : '0.0';

  const hpaP99 = hpa.k6P99LatencyMs ?? hpa.p99LatencyMs ?? 0;
  const kedaP99 = keda.k6P99LatencyMs ?? keda.p99LatencyMs ?? 0;
  const p99Diff = hpaP99 - kedaP99;
  const p99Pct = hpaP99 > 0 ? ((p99Diff / hpaP99) * 100).toFixed(1) : '0.0';

  const hpaSloViolations = hpa.k6SloViolations ?? hpa.sloViolations ?? 0;
  const kedaSloViolations = keda.k6SloViolations ?? keda.sloViolations ?? 0;
  const hpaSloRate = (hpa.k6SloViolationRate ?? hpa.sloViolationRate ?? 0) * 100;
  const kedaSloRate = (keda.k6SloViolationRate ?? keda.sloViolationRate ?? 0) * 100;
  const sloDiffPct = hpaSloRate > 0 ? (((hpaSloRate - kedaSloRate) / hpaSloRate) * 100).toFixed(1) : '0.0';

  const hpaDelay = hpa.avgScalingDelaySeconds ?? 0;
  const kedaDelay = keda.avgScalingDelaySeconds ?? 0;
  const delayDiff = (hpaDelay - kedaDelay).toFixed(1);

  // Data for Recharts side-by-side grouped bar chart
  const chartData = [
    {
      metric: 'P95 Latency',
      Reactive_HPA: Number(hpaP95.toFixed(1)),
      Predictive_KEDA: Number(kedaP95.toFixed(1)),
      unit: 'ms',
    },
    {
      metric: 'P99 Latency',
      Reactive_HPA: Number(hpaP99.toFixed(1)),
      Predictive_KEDA: Number(kedaP99.toFixed(1)),
      unit: 'ms',
    },
    {
      metric: 'SLO Breach %',
      Reactive_HPA: Number(hpaSloRate.toFixed(2)),
      Predictive_KEDA: Number(kedaSloRate.toFixed(2)),
      unit: '%',
    },
    {
      metric: 'D_E2E Response Lag',
      Reactive_HPA: Number(hpaDelay.toFixed(1)),
      Predictive_KEDA: Number(kedaDelay.toFixed(1)),
      unit: 's',
    },
    {
      metric: 'Avg CPU Load',
      Reactive_HPA: Number((hpa.avgCpuPercent || 0).toFixed(1)),
      Predictive_KEDA: Number((keda.avgCpuPercent || 0).toFixed(1)),
      unit: '%',
    },
  ];

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem', marginBottom: '2rem' }}>
      
      {/* 1. Header & Scenario Selector */}
      <div className="glass-panel" style={{ padding: '1.25rem' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '1rem', marginBottom: '1rem' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
            <div style={{
              background: 'linear-gradient(135deg, rgba(6, 182, 212, 0.2), rgba(139, 92, 246, 0.2))',
              padding: '0.5rem',
              borderRadius: '0.5rem',
              border: '1px solid rgba(6, 182, 212, 0.3)'
            }}>
              <Scale size={22} color="#06b6d4" />
            </div>
            <div>
              <h2 style={{ fontSize: '1.15rem', fontWeight: 700, color: '#ffffff' }}>
                Benchmark Comparison & Scientific Evaluation Engine
              </h2>
              <p style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>
                Direct quantitative evaluation: Reactive HPA vs Predictive Prophet + KEDA
              </p>
            </div>
          </div>
          <span className="badge badge-cyan" style={{ fontSize: '0.75rem', padding: '0.35rem 0.75rem' }}>
            <Sparkles size={13} style={{ marginRight: '4px' }} />
            PAIRED EVALUATION ACTIVE
          </span>
        </div>

        {/* Scenario Pill Buttons */}
        <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
          {SCENARIOS.map((sc) => {
            const isSelected = selectedScenario === sc.id;
            return (
              <button
                key={sc.id}
                onClick={() => setSelectedScenario(sc.id)}
                className={`btn ${isSelected ? 'btn-primary' : 'btn-secondary'}`}
                style={{
                  padding: '0.5rem 0.9rem',
                  fontSize: '0.8rem',
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'flex-start',
                  textAlign: 'left',
                  border: isSelected ? '1px solid #06b6d4' : '1px solid var(--border-subtle)',
                }}
              >
                <span style={{ fontWeight: 600 }}>{sc.label}</span>
                <span style={{ fontSize: '0.65rem', opacity: 0.75 }}>{sc.id}</span>
              </button>
            );
          })}
        </div>
      </div>

      {/* 2. Executive Delta KPI Scorecards */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))',
        gap: '1rem'
      }}>
        
        {/* Card 1: P95 & P99 Latency Delta */}
        <div className="glass-panel" style={{ padding: '1.25rem', borderLeft: '4px solid #10b981' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '0.5rem' }}>
            <span style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', fontWeight: 500 }}>
              Tail Latency (P95 / P99)
            </span>
            <span className="badge badge-emerald" style={{ fontSize: '0.72rem' }}>
              {p95Diff >= 0 ? `▼ ${p95Pct}% P95` : `▲ ${Math.abs(p95Pct)}% P95`}
            </span>
          </div>
          <div style={{ display: 'flex', alignItems: 'baseline', gap: '0.5rem' }}>
            <span style={{ fontSize: '1.5rem', fontWeight: 800, color: p95Diff >= 0 ? '#10b981' : '#f59e0b', fontFamily: 'var(--font-mono)' }}>
              {p95Diff >= 0 ? `-${p95Diff.toFixed(1)} ms` : `+${Math.abs(p95Diff).toFixed(1)} ms`}
            </span>
            <span style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>
              (P99: {p99Diff >= 0 ? `-${p99Diff.toFixed(1)} ms` : `+${Math.abs(p99Diff).toFixed(1)} ms`})
            </span>
          </div>
          <p style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', marginTop: '0.35rem' }}>
            KEDA: <strong style={{ color: '#ffffff' }}>{formatMs(kedaP95)}</strong> vs HPA: <span style={{ color: '#fb7185' }}>{formatMs(hpaP95)}</span>
          </p>
        </div>

        {/* Card 2: SLO Violations Delta */}
        <div className="glass-panel" style={{ padding: '1.25rem', borderLeft: '4px solid #06b6d4' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '0.5rem' }}>
            <span style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', fontWeight: 500 }}>
              SLO Violations (&gt;200ms)
            </span>
            <span className="badge badge-cyan" style={{ fontSize: '0.75rem' }}>
              {hpaSloViolations - kedaSloViolations >= 0 ? `${hpaSloViolations - kedaSloViolations} Avoided` : `${kedaSloViolations - hpaSloViolations} Additional`}
            </span>
          </div>
          <div style={{ display: 'flex', alignItems: 'baseline', gap: '0.5rem' }}>
            <span style={{ fontSize: '1.5rem', fontWeight: 800, color: '#06b6d4', fontFamily: 'var(--font-mono)' }}>
              {kedaSloViolations} ({kedaSloRate.toFixed(2)}%) vs {hpaSloViolations} ({hpaSloRate.toFixed(2)}%)
            </span>
          </div>
          <p style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', marginTop: '0.35rem' }}>
            SLO Threshold: 200 ms | Discrete k6 request telemetry
          </p>
        </div>

        {/* Card 3: End-to-End Autoscaling Response Lag (D_E2E) */}
        <div className="glass-panel" style={{ padding: '1.25rem', borderLeft: '4px solid #8b5cf6' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '0.5rem' }}>
            <span style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', fontWeight: 500 }}>
              Response Lag D_E2E (t_ready - t_0)
            </span>
            <span className="badge badge-violet" style={{ fontSize: '0.75rem' }}>
              {Number(delayDiff) >= 0 ? `▼ ${delayDiff}s Faster` : `▲ ${Math.abs(delayDiff)}s Slower`}
            </span>
          </div>
          <div style={{ display: 'flex', alignItems: 'baseline', gap: '0.5rem' }}>
            <span style={{ fontSize: '1.5rem', fontWeight: 800, color: '#8b5cf6', fontFamily: 'var(--font-mono)' }}>
              {kedaDelay.toFixed(1)}s vs {hpaDelay.toFixed(1)}s
            </span>
          </div>
          <p style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', marginTop: '0.35rem' }}>
            D_E2E = t_ready - t_0 (Traffic start to Pod Ready)
          </p>
        </div>

        {/* Card 4: Prophet Forecast Accuracy */}
        <div className="glass-panel" style={{ padding: '1.25rem', borderLeft: '4px solid #f59e0b' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '0.5rem' }}>
            <span style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', fontWeight: 500 }}>
              Prophet Forecast Accuracy
            </span>
            <span className="badge badge-amber" style={{ fontSize: '0.75rem' }}>
              {isMeasured(keda.mae) ? 'EVALUATED' : 'N/A'}
            </span>
          </div>
          <div style={{ display: 'flex', alignItems: 'baseline', gap: '0.5rem' }}>
            <span style={{ fontSize: '1.3rem', fontWeight: 800, color: '#f59e0b', fontFamily: 'var(--font-mono)' }}>
              MAE {formatMaeRmse(keda.mae)} &bull; RMSE {formatMaeRmse(keda.rmse)}
            </span>
          </div>
          <p style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', marginTop: '0.35rem' }}>
            Out-of-sample forecast accuracy evaluated during experiment
          </p>
        </div>

      </div>

      {/* 3. Side-by-Side Visual Bar Chart & Summary */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(480px, 1fr))', gap: '1.5rem' }}>
        
        {/* Comparative Recharts Grouped Bar Chart */}
        <div className="glass-panel" style={{ padding: '1.25rem' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '1rem' }}>
            <BarChart3 size={18} color="#06b6d4" />
            <h3 style={{ fontSize: '0.95rem' }}>Measured Performance Comparison (Lower is Better for Latency & Violations)</h3>
          </div>
          <div style={{ width: '100%', height: '280px' }}>
            <ResponsiveContainer>
              <BarChart data={chartData} margin={{ top: 10, right: 10, left: -10, bottom: 5 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
                <XAxis 
                  dataKey="metric" 
                  interval={0} 
                  tick={{ fill: 'var(--text-secondary)', fontSize: 11 }} 
                />
                <YAxis tick={{ fill: 'var(--text-secondary)', fontSize: 11 }} />
                <Tooltip
                  contentStyle={{
                    backgroundColor: '#0c101c',
                    borderColor: 'rgba(255,255,255,0.1)',
                    borderRadius: '8px',
                    fontSize: '0.8rem',
                  }}
                  formatter={(value, name, item) => [`${value} ${item?.payload?.unit || ''}`, name]}
                />
                <Legend wrapperStyle={{ fontSize: '0.8rem', paddingTop: '10px' }} />
                <Bar dataKey="Reactive_HPA" name="Reactive (HPA)" fill="#f43f5e" radius={[4, 4, 0, 0]} />
                <Bar dataKey="Predictive_KEDA" name="Predictive (KEDA)" fill="#10b981" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Dynamic Measured Comparative Summary */}
        <div className="glass-panel" style={{ padding: '1.25rem', display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.75rem' }}>
              <Award size={18} color="#f59e0b" />
              <h3 style={{ fontSize: '0.95rem' }}>Empirical Comparative Findings ({selectedScenario})</h3>
            </div>
            <div style={{
              background: 'rgba(6, 182, 212, 0.05)',
              border: '1px solid rgba(6, 182, 212, 0.15)',
              borderRadius: '0.5rem',
              padding: '1rem',
              fontSize: '0.82rem',
              lineHeight: '1.5',
              color: 'var(--text-primary)',
              marginBottom: '1rem'
            }}>
              <p style={{ marginBottom: '0.5rem' }}>
                Measured results for <strong>{selectedScenario}</strong> workload pattern (Target: {kedaMeta?.targetRps || hpaMeta?.targetRps || 30} RPS, Duration: {kedaMeta?.durationSeconds || hpaMeta?.durationSeconds || 180}s):
              </p>
              <ul style={{ paddingLeft: '1.2rem', display: 'flex', flexDirection: 'column', gap: '0.35rem' }}>
                <li>
                  <strong>Tail Latency:</strong> P95 was <strong>{formatMs(kedaP95)}</strong> (Predictive) vs <strong>{formatMs(hpaP95)}</strong> (Reactive) (Δ: {p95Diff >= 0 ? `-${p95Diff.toFixed(1)} ms, ${p95Pct}% reduction` : `+${Math.abs(p95Diff).toFixed(1)} ms`}). P99 was <strong>{formatMs(kedaP99)}</strong> vs <strong>{formatMs(hpaP99)}</strong>.
                </li>
                <li>
                  <strong>SLO Violations:</strong> Predictive KEDA recorded <strong>{formatInt(kedaSloViolations)}</strong> violations ({kedaSloRate.toFixed(2)}%), while Reactive HPA recorded <strong>{formatInt(hpaSloViolations)}</strong> violations ({hpaSloRate.toFixed(2)}%).
                </li>
                <li>
                  <strong>Autoscaling Response Lag (D_E2E):</strong> Predictive KEDA reached Pod Ready state in <strong>{formatSeconds(kedaDelay)}</strong> from traffic start, while Reactive HPA reached Ready in <strong>{formatSeconds(hpaDelay)}</strong>.
                </li>
                <li>
                  <strong>Forecast Accuracy:</strong> Prophet achieved an out-of-sample MAE of <strong>{formatMaeRmse(keda.mae)}</strong> and RMSE of <strong>{formatMaeRmse(keda.rmse)}</strong> over a 60-second horizon.
                </li>
              </ul>
            </div>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', borderTop: '1px solid var(--border-subtle)', paddingTop: '0.75rem', fontSize: '0.75rem', color: 'var(--text-secondary)' }}>
            <span>Evaluated on Kubernetes v1.30 &bull; Minikube &bull; Fabric8 Orchestrator</span>
            <span className="badge badge-emerald">EMPIRICAL DATA ONLY</span>
          </div>
        </div>

      </div>

      {/* 4. Complete Side-by-Side Matrix Table */}
      <div className="glass-panel" style={{ padding: '1.25rem' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '1rem' }}>
          <Layers size={18} color="#8b5cf6" />
          <h3 style={{ fontSize: '0.95rem' }}>Detailed Metric-by-Metric Evaluation Matrix ({selectedScenario})</h3>
        </div>

        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.8rem' }}>
            <thead>
              <tr style={{ borderBottom: '1px solid var(--border-subtle)', color: 'var(--text-secondary)', textAlign: 'left' }}>
                <th style={{ padding: '0.6rem 0.75rem' }}>Evaluation Parameter</th>
                <th style={{ padding: '0.6rem 0.75rem' }}>Reactive (Kubernetes HPA)</th>
                <th style={{ padding: '0.6rem 0.75rem' }}>Predictive (Prophet + KEDA)</th>
                <th style={{ padding: '0.6rem 0.75rem' }}>Quantitative Delta (Δ)</th>
                <th style={{ padding: '0.6rem 0.75rem' }}>Notes</th>
              </tr>
            </thead>
            <tbody>
              
              {/* Row 1: P95 */}
              <tr style={{ borderBottom: '1px solid rgba(255,255,255,0.03)' }}>
                <td style={{ padding: '0.6rem 0.75rem', fontWeight: 600 }}>P95 Response Latency (k6)</td>
                <td style={{ padding: '0.6rem 0.75rem', fontFamily: 'var(--font-mono)', color: hpaP95 > 200 ? '#f43f5e' : '#34d399' }}>{formatMs(hpaP95)}</td>
                <td style={{ padding: '0.6rem 0.75rem', fontFamily: 'var(--font-mono)', color: kedaP95 > 200 ? '#f43f5e' : '#34d399', fontWeight: 700 }}>{formatMs(kedaP95)}</td>
                <td style={{ padding: '0.6rem 0.75rem', fontFamily: 'var(--font-mono)', color: p95Diff >= 0 ? '#10b981' : '#f59e0b' }}>
                  {p95Diff >= 0 ? `▼ ${p95Pct}% (-${p95Diff.toFixed(1)} ms)` : `▲ ${Math.abs(p95Pct)}% (+${Math.abs(p95Diff).toFixed(1)} ms)`}
                </td>
                <td style={{ padding: '0.6rem 0.75rem' }}>
                  <span className={`badge ${p95Diff >= 0 ? 'badge-emerald' : 'badge-amber'}`}>
                    {p95Diff >= 0 ? `Predictive (-${p95Pct}%)` : `Reactive (-${Math.abs(p95Pct)}%)`}
                  </span>
                </td>
              </tr>

              {/* Row 2: P99 */}
              <tr style={{ borderBottom: '1px solid rgba(255,255,255,0.03)' }}>
                <td style={{ padding: '0.6rem 0.75rem', fontWeight: 600 }}>P99 Tail Latency (k6)</td>
                <td style={{ padding: '0.6rem 0.75rem', fontFamily: 'var(--font-mono)', color: hpaP99 > 200 ? '#f43f5e' : '#34d399' }}>{formatMs(hpaP99)}</td>
                <td style={{ padding: '0.6rem 0.75rem', fontFamily: 'var(--font-mono)', color: kedaP99 > 200 ? '#f43f5e' : '#34d399', fontWeight: 700 }}>{formatMs(kedaP99)}</td>
                <td style={{ padding: '0.6rem 0.75rem', fontFamily: 'var(--font-mono)', color: p99Diff >= 0 ? '#10b981' : '#f59e0b' }}>
                  {p99Diff >= 0 ? `▼ ${p99Pct}% (-${p99Diff.toFixed(1)} ms)` : `▲ ${Math.abs(p99Pct)}% (+${Math.abs(p99Diff).toFixed(1)} ms)`}
                </td>
                <td style={{ padding: '0.6rem 0.75rem' }}>
                  <span className={`badge ${p99Diff >= 0 ? 'badge-emerald' : 'badge-amber'}`}>
                    {p99Diff >= 0 ? 'Predictive' : 'Reactive'}
                  </span>
                </td>
              </tr>

              {/* Row 3: SLO Violations */}
              <tr style={{ borderBottom: '1px solid rgba(255,255,255,0.03)' }}>
                <td style={{ padding: '0.6rem 0.75rem', fontWeight: 600 }}>SLO Violations (&gt;200ms)</td>
                <td style={{ padding: '0.6rem 0.75rem', fontFamily: 'var(--font-mono)', color: hpaSloViolations > 0 ? '#f43f5e' : '#10b981' }}>
                  {formatInt(hpaSloViolations)} ({hpaSloRate.toFixed(2)}%)
                </td>
                <td style={{ padding: '0.6rem 0.75rem', fontFamily: 'var(--font-mono)', color: kedaSloViolations > 0 ? '#f43f5e' : '#10b981', fontWeight: 700 }}>
                  {formatInt(kedaSloViolations)} ({kedaSloRate.toFixed(2)}%)
                </td>
                <td style={{ padding: '0.6rem 0.75rem', fontFamily: 'var(--font-mono)', color: hpaSloViolations >= kedaSloViolations ? '#10b981' : '#f43f5e' }}>
                  {hpaSloViolations >= kedaSloViolations ? `▼ ${hpaSloViolations - kedaSloViolations} Avoided` : `▲ ${kedaSloViolations - hpaSloViolations} More`}
                </td>
                <td style={{ padding: '0.6rem 0.75rem' }}>
                  <span className={`badge ${hpaSloViolations >= kedaSloViolations ? 'badge-emerald' : 'badge-amber'}`}>
                    {hpaSloViolations >= kedaSloViolations ? 'Predictive' : 'Reactive'}
                  </span>
                </td>
              </tr>

              {/* Row 4: Scaling Lag */}
              <tr style={{ borderBottom: '1px solid rgba(255,255,255,0.03)' }}>
                <td style={{ padding: '0.6rem 0.75rem', fontWeight: 600 }}>D_E2E Response Lag (t_ready - t_0)</td>
                <td style={{ padding: '0.6rem 0.75rem', fontFamily: 'var(--font-mono)', color: '#fbbf24' }}>{formatSeconds(hpaDelay)}</td>
                <td style={{ padding: '0.6rem 0.75rem', fontFamily: 'var(--font-mono)', color: '#06b6d4', fontWeight: 700 }}>{formatSeconds(kedaDelay)}</td>
                <td style={{ padding: '0.6rem 0.75rem', fontFamily: 'var(--font-mono)', color: '#06b6d4' }}>
                  {Number(delayDiff) >= 0 ? `▼ ${delayDiff}s Lead` : `▲ ${Math.abs(delayDiff)}s Lag`}
                </td>
                <td style={{ padding: '0.6rem 0.75rem' }}>
                  <span className="badge badge-cyan">t_ready - t_0</span>
                </td>
              </tr>

              {/* Row 5: Peak Replicas */}
              <tr style={{ borderBottom: '1px solid rgba(255,255,255,0.03)' }}>
                <td style={{ padding: '0.6rem 0.75rem', fontWeight: 600 }}>Peak Pod Replicas</td>
                <td style={{ padding: '0.6rem 0.75rem', fontFamily: 'var(--font-mono)' }}>{isMeasured(hpa.peakReplicas) ? `${hpa.peakReplicas} Pods` : 'N/A'}</td>
                <td style={{ padding: '0.6rem 0.75rem', fontFamily: 'var(--font-mono)', color: '#06b6d4' }}>{isMeasured(keda.peakReplicas) ? `${keda.peakReplicas} Pods` : 'N/A'}</td>
                <td style={{ padding: '0.6rem 0.75rem', fontFamily: 'var(--font-mono)' }}>
                  {isMeasured(keda.peakReplicas) && isMeasured(hpa.peakReplicas) ? `${keda.peakReplicas - hpa.peakReplicas >= 0 ? '+' : ''}${keda.peakReplicas - hpa.peakReplicas} Pods` : 'N/A'}
                </td>
                <td style={{ padding: '0.6rem 0.75rem' }}><span className="badge badge-violet">Pool Allocation</span></td>
              </tr>

              {/* Row 6: Peak CPU */}
              <tr style={{ borderBottom: '1px solid rgba(255,255,255,0.03)' }}>
                <td style={{ padding: '0.6rem 0.75rem', fontWeight: 600 }}>Avg / Peak CPU Utilization</td>
                <td style={{ padding: '0.6rem 0.75rem', fontFamily: 'var(--font-mono)' }}>{formatPercent(hpa.avgCpuPercent)} / {formatPercent(hpa.peakCpuPercent)}</td>
                <td style={{ padding: '0.6rem 0.75rem', fontFamily: 'var(--font-mono)', color: '#10b981' }}>{formatPercent(keda.avgCpuPercent)} / {formatPercent(keda.peakCpuPercent)}</td>
                <td style={{ padding: '0.6rem 0.75rem', fontFamily: 'var(--font-mono)' }}>
                  {isMeasured(hpa.avgCpuPercent) && isMeasured(keda.avgCpuPercent) ? `${(hpa.avgCpuPercent - keda.avgCpuPercent).toFixed(1)}% Avg Δ` : 'N/A'}
                </td>
                <td style={{ padding: '0.6rem 0.75rem' }}><span className="badge badge-emerald">CPU Dynamics</span></td>
              </tr>

              {/* Row 7: ML Metrics */}
              <tr>
                <td style={{ padding: '0.6rem 0.75rem', fontWeight: 600 }}>Prophet Out-of-Sample Accuracy</td>
                <td style={{ padding: '0.6rem 0.75rem', color: 'var(--text-secondary)' }}>N/A (Reactive Controller)</td>
                <td style={{ padding: '0.6rem 0.75rem', fontFamily: 'var(--font-mono)', color: '#f59e0b' }}>
                  MAE: {formatMaeRmse(keda.mae)} &bull; RMSE: {formatMaeRmse(keda.rmse)}
                </td>
                <td style={{ padding: '0.6rem 0.75rem', fontFamily: 'var(--font-mono)', color: '#f59e0b' }}>Out-of-Sample 60s</td>
                <td style={{ padding: '0.6rem 0.75rem' }}><span className="badge badge-amber">{isMeasured(keda.mae) ? 'Evaluated' : 'N/A'}</span></td>
              </tr>

            </tbody>
          </table>
        </div>
      </div>

    </div>
  );
}
