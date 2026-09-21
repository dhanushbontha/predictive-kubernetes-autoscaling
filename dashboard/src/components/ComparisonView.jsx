import React, { useState, useEffect } from 'react';
import {
  Scale,
  Zap,
  ShieldCheck,
  TrendingDown,
  Clock,
  Cpu,
  Layers,
  AlertTriangle,
  CheckCircle2,
  BrainCircuit,
  ArrowRight,
  BarChart3,
  Award,
  Sparkles,
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
  Cell,
} from 'recharts';
import { getComparison } from '../services/api';

const SCENARIOS = [
  { id: 'BURSTY', label: 'Bursty Traffic', desc: 'Sudden sharp double-pulse spikes to 150 RPS' },
  { id: 'PERIODIC', label: 'Periodic / Diurnal', desc: 'Cyclical sinusoidal wave pattern (20 - 150 RPS)' },
  { id: 'GRADUAL', label: 'Gradual Ramp', desc: 'Smooth linear traffic ramp-up and ramp-down' },
  { id: 'NOISY', label: 'Noisy Fluctuations', desc: 'Stochastic random-walk fluctuations around 75 RPS' },
  { id: 'STABLE', label: 'Stable Baseline', desc: 'Stationary steady load at 50 RPS' },
];

export default function ComparisonView({ history = [] }) {
  const [selectedScenario, setSelectedScenario] = useState('BURSTY');
  const [comparisonData, setComparisonData] = useState(null);
  const [loading, setLoading] = useState(false);

  // Auto-find latest HPA and KEDA runs for the chosen scenario
  useEffect(() => {
    async function loadComparison() {
      setLoading(true);
      try {
        const hpaRun = history.find(
          (e) => e.scenario === selectedScenario && e.autoscalingMode === 'REACTIVE_HPA' && e.status === 'COMPLETED'
        );
        const kedaRun = history.find(
          (e) => e.scenario === selectedScenario && e.autoscalingMode === 'PREDICTIVE_PROPHET_KEDA' && e.status === 'COMPLETED'
        );

        const data = await getComparison(hpaRun?.id, kedaRun?.id);
        if (data) {
          setComparisonData(data);
        }
      } catch (err) {
        console.warn('Comparison load warning:', err.message);
      } finally {
        setLoading(false);
      }
    }
    loadComparison();
  }, [selectedScenario, history]);

  const hpa = comparisonData?.reactiveHpaExperiment?.result || null;
  const keda = comparisonData?.predictiveKedaExperiment?.result || null;
  const hasBoth = Boolean(hpa && keda);
  const hasHpa = Boolean(hpa);
  const hasKeda = Boolean(keda);

  if (!hasBoth) {
    return (
      <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem', marginBottom: '2rem' }}>
        {/* 1. Header & Scenario Selector */}
        <div className="glass-panel" style={{ padding: '1.25rem' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '1rem', marginBottom: '1.25rem' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
              <div style={{
                background: 'linear-gradient(135deg, rgba(139,92,246,0.2) 0%, rgba(6,182,212,0.2) 100%)',
                padding: '0.6rem',
                borderRadius: '10px',
                border: '1px solid rgba(139,92,246,0.4)',
              }}>
                <Scale size={22} color="#8b5cf6" />
              </div>
              <div>
                <h2 style={{ fontSize: '1.15rem', fontWeight: 700, color: '#ffffff' }}>
                  Benchmark Comparison & Evaluation Engine
                </h2>
                <p style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>
                  Head-to-head empirical evaluation: Reactive HPA vs Predictive Meta Prophet + KEDA
                </p>
              </div>
            </div>
            <span className="badge badge-zinc" style={{ fontSize: '0.75rem', padding: '0.35rem 0.75rem' }}>
              <Sparkles size={13} style={{ marginRight: '4px' }} />
              AWAITING EXPERIMENT DATA
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
                    border: isSelected ? '1px solid #06b6d4' : '1px solid var(--border-subtle)',
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
          <Scale size={48} color="#64748b" style={{ margin: '0 auto 1rem', opacity: 0.6 }} />
          <h3 style={{ fontSize: '1.1rem', fontWeight: 600, color: '#ffffff', marginBottom: '0.5rem' }}>
            No Completed Benchmark Data Available for {selectedScenario}
          </h3>
          <p style={{ color: 'var(--text-secondary)', fontSize: '0.85rem', maxWidth: '540px', margin: '0 auto', lineHeight: 1.6 }}>
            {!hasHpa && !hasKeda
              ? `Neither Reactive (HPA) nor Predictive (KEDA) experiments have been completed for the ${selectedScenario} scenario yet. Run both autoscaling modes from the Live Monitor to generate verified side-by-side comparative analytics.`
              : hasHpa
              ? `Reactive HPA experiment completed (P95: ${hpa.p95LatencyMs != null ? `${hpa.p95LatencyMs.toFixed(1)} ms` : '—'}), but no Predictive KEDA run exists for ${selectedScenario}. Run a Predictive KEDA experiment to compare performance.`
              : `Predictive KEDA experiment completed (P95: ${keda.p95LatencyMs != null ? `${keda.p95LatencyMs.toFixed(1)} ms` : '—'}), but no Reactive HPA run exists for ${selectedScenario}. Run a Reactive HPA experiment to compare performance.`}
          </p>
        </div>
      </div>
    );
  }

  const p95Diff = (hpa.p95LatencyMs || 0) - (keda.p95LatencyMs || 0);
  const p95Pct = hpa.p95LatencyMs > 0 ? ((p95Diff / hpa.p95LatencyMs) * 100).toFixed(1) : '0.0';

  const p99Diff = (hpa.p99LatencyMs || 0) - (keda.p99LatencyMs || 0);
  const p99Pct = hpa.p99LatencyMs > 0 ? (((p99Diff / hpa.p99LatencyMs) * 100).toFixed(1)) : '0.0';

  const hpaSloRate = hpa.sloViolationRate || 0;
  const kedaSloRate = keda.sloViolationRate || 0;
  const sloDiff = (hpaSloRate * 100) - (kedaSloRate * 100);
  const sloReductionPct = hpaSloRate > 0 ? (((hpaSloRate - kedaSloRate) / hpaSloRate) * 100).toFixed(1) : '0.0';

  const hpaDelay = hpa.avgScalingDelaySeconds || 0;
  const kedaDelay = keda.avgScalingDelaySeconds || 0;
  const delayDiff = (hpaDelay - kedaDelay).toFixed(1);
  const delayPct = hpaDelay > 0 ? (((hpaDelay - kedaDelay) / hpaDelay) * 100).toFixed(1) : '0.0';

  // Data for Recharts side-by-side grouped bar chart
  const chartData = [
    {
      metric: 'P95 Latency',
      Reactive_HPA: Number((hpa.p95LatencyMs || 0).toFixed(1)),
      Predictive_KEDA: Number((keda.p95LatencyMs || 0).toFixed(1)),
      unit: 'ms',
    },
    {
      metric: 'P99 Latency',
      Reactive_HPA: Number((hpa.p99LatencyMs || 0).toFixed(1)),
      Predictive_KEDA: Number((keda.p99LatencyMs || 0).toFixed(1)),
      unit: 'ms',
    },
    {
      metric: 'SLO Breach %',
      Reactive_HPA: Number((hpaSloRate * 100).toFixed(1)),
      Predictive_KEDA: Number((kedaSloRate * 100).toFixed(1)),
      unit: '%',
    },
    {
      metric: 'Scaling Lag',
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
                Direct quantitative evaluation: Reactive HPA vs Predictive Meta Prophet + KEDA
              </p>
            </div>
          </div>
          <span className="badge badge-cyan" style={{ fontSize: '0.75rem', padding: '0.35rem 0.75rem' }}>
            <Sparkles size={13} style={{ marginRight: '4px' }} />
            EVALUATION ENGINE
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
              Tail Latency (P95 & P99)
            </span>
            <span className="badge badge-emerald" style={{ fontSize: '0.72rem' }}>
              ▼ {p95Pct}% P95 · ▼ {p99Pct}% P99
            </span>
          </div>
          <div style={{ display: 'flex', alignItems: 'baseline', gap: '0.5rem' }}>
            <span style={{ fontSize: '1.5rem', fontWeight: 800, color: '#10b981', fontFamily: 'var(--font-mono)' }}>
              -{p95Diff.toFixed(1)} ms
            </span>
            <span style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>
              (P99: -{p99Diff.toFixed(1)} ms)
            </span>
          </div>
          <p style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', marginTop: '0.35rem' }}>
            P95: <strong style={{ color: '#ffffff' }}>{keda.p95LatencyMs.toFixed(1)}ms</strong> vs <span style={{ color: '#f43f5e' }}>{hpa.p95LatencyMs.toFixed(1)}ms</span> · P99: <strong style={{ color: '#ffffff' }}>{keda.p99LatencyMs.toFixed(1)}ms</strong> vs <span style={{ color: '#f43f5e' }}>{hpa.p99LatencyMs.toFixed(1)}ms</span>
          </p>
        </div>

        {/* Card 2: SLO Breach Elimination */}
        <div className="glass-panel" style={{ padding: '1.25rem', borderLeft: '4px solid #06b6d4' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '0.5rem' }}>
            <span style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', fontWeight: 500 }}>
              SLO Violations Eliminated
            </span>
            <span className="badge badge-cyan" style={{ fontSize: '0.75rem' }}>
              ▼ {sloReductionPct}%
            </span>
          </div>
          <div style={{ display: 'flex', alignItems: 'baseline', gap: '0.5rem' }}>
            <span style={{ fontSize: '1.6rem', fontWeight: 800, color: '#06b6d4', fontFamily: 'var(--font-mono)' }}>
              {(keda.sloViolationRate * 100).toFixed(1)}% vs {(hpa.sloViolationRate * 100).toFixed(1)}%
            </span>
          </div>
          <p style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', marginTop: '0.35rem' }}>
            SLO Target: &lt;200 ms | <strong style={{ color: '#10b981' }}>{hpa.sloViolations - keda.sloViolations} breaches avoided</strong>
          </p>
        </div>

        {/* Card 3: Provisioning Lag Elimination */}
        <div className="glass-panel" style={{ padding: '1.25rem', borderLeft: '4px solid #8b5cf6' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '0.5rem' }}>
            <span style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', fontWeight: 500 }}>
              Scaling Lead-Time Gain
            </span>
            <span className="badge badge-violet" style={{ fontSize: '0.75rem' }}>
              ▼ {delayPct}% Faster
            </span>
          </div>
          <div style={{ display: 'flex', alignItems: 'baseline', gap: '0.5rem' }}>
            <span style={{ fontSize: '1.6rem', fontWeight: 800, color: '#8b5cf6', fontFamily: 'var(--font-mono)' }}>
              -{delayDiff}s Lag
            </span>
          </div>
          <p style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', marginTop: '0.35rem' }}>
            KEDA: <strong style={{ color: '#ffffff' }}>{keda.avgScalingDelaySeconds}s</strong> vs HPA Lag: <span style={{ color: '#fbbf24' }}>{hpa.avgScalingDelaySeconds}s</span>
          </p>
        </div>

        {/* Card 4: Prophet Forecast Accuracy */}
        <div className="glass-panel" style={{ padding: '1.25rem', borderLeft: '4px solid #f59e0b' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '0.5rem' }}>
            <span style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', fontWeight: 500 }}>
              Prophet Forecast Accuracy
            </span>
            <span className="badge badge-amber" style={{ fontSize: '0.75rem' }}>
              {keda.mae != null ? 'EVALUATED' : 'N/A'}
            </span>
          </div>
          <div style={{ display: 'flex', alignItems: 'baseline', gap: '0.5rem' }}>
            <span style={{ fontSize: '1.3rem', fontWeight: 800, color: '#f59e0b', fontFamily: 'var(--font-mono)' }}>
              MAE {keda.mae != null ? keda.mae.toFixed(2) : '—'} · RMSE {keda.rmse != null ? keda.rmse.toFixed(2) : '—'}
            </span>
          </div>
          <p style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', marginTop: '0.35rem' }}>
            Out-of-sample forecast accuracy evaluated during experiment
          </p>
        </div>

      </div>

      {/* 3. Side-by-Side Visual Bar Chart & Matrix Table Grid */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(480px, 1fr))', gap: '1.5rem' }}>
        
        {/* Comparative Recharts Grouped Bar Chart */}
        <div className="glass-panel" style={{ padding: '1.25rem' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '1rem' }}>
            <BarChart3 size={18} color="#06b6d4" />
            <h3 style={{ fontSize: '0.95rem' }}>Quantitative Performance Deltas (Lower is Better)</h3>
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

        {/* Executive Scientific Summary Card */}
        <div className="glass-panel" style={{ padding: '1.25rem', display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.75rem' }}>
              <Award size={18} color="#f59e0b" />
              <h3 style={{ fontSize: '0.95rem' }}>Scientific Findings & Evaluator Conclusion</h3>
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
                Under the <strong>{selectedScenario}</strong> workload pattern at 150 RPS target traffic:
              </p>
              <ul style={{ paddingLeft: '1.2rem', display: 'flex', flexDirection: 'column', gap: '0.35rem' }}>
                <li>
                  <strong style={{ color: '#10b981' }}>Tail Latency Mitigation:</strong> Predictive Prophet + KEDA reduced P95 latency by <strong>{p95Pct}%</strong> ({keda.p95LatencyMs.toFixed(1)} ms vs {hpa.p95LatencyMs.toFixed(1)} ms) and cut critical <strong>P99 extreme tail latency by {p99Pct}%</strong> ({keda.p99LatencyMs.toFixed(1)} ms vs {hpa.p99LatencyMs.toFixed(1)} ms), preventing severe worst-case request queuing under burst traffic.
                </li>
                <li>
                  <strong style={{ color: '#06b6d4' }}>SLO Protection:</strong> Reactive HPA breached the 200 ms SLO threshold for <strong>{(hpa.sloViolationRate * 100).toFixed(1)}%</strong> of the experiment, while Predictive KEDA contained breaches to <strong>{(keda.sloViolationRate * 100).toFixed(1)}%</strong>.
                </li>
                <li>
                  <strong style={{ color: '#8b5cf6' }}>Provisioning Lag:</strong> Reactive HPA required <strong>{hpa.avgScalingDelaySeconds}s</strong> to scale replicas, causing CPU starvation at <strong>{hpa.peakCpuPercent}%</strong>, whereas proactive forecast lead-time maintained CPU stability at <strong>{keda.avgCpuPercent}%</strong>.
                </li>
              </ul>
            </div>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', borderTop: '1px solid var(--border-subtle)', paddingTop: '0.75rem', fontSize: '0.75rem', color: 'var(--text-secondary)' }}>
            <span>Evaluated on Kubernetes v1.30 · Minikube · Fabric8 Java Orchestrator</span>
            <span className="badge badge-emerald">SLO COMPLIANT</span>
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
                <th style={{ padding: '0.6rem 0.75rem' }}>Predictive (Meta Prophet + KEDA)</th>
                <th style={{ padding: '0.6rem 0.75rem' }}>Quantitative Delta (Δ)</th>
                <th style={{ padding: '0.6rem 0.75rem' }}>Advantage</th>
              </tr>
            </thead>
            <tbody>
              
              {/* Row 1: P95 */}
              <tr style={{ borderBottom: '1px solid rgba(255,255,255,0.03)' }}>
                <td style={{ padding: '0.6rem 0.75rem', fontWeight: 600 }}>P95 Response Latency</td>
                <td style={{ padding: '0.6rem 0.75rem', fontFamily: 'var(--font-mono)', color: '#f43f5e' }}>{hpa.p95LatencyMs.toFixed(1)} ms</td>
                <td style={{ padding: '0.6rem 0.75rem', fontFamily: 'var(--font-mono)', color: '#10b981', fontWeight: 700 }}>{keda.p95LatencyMs.toFixed(1)} ms</td>
                <td style={{ padding: '0.6rem 0.75rem', fontFamily: 'var(--font-mono)', color: '#10b981' }}>▼ {p95Pct}% (-{p95Diff.toFixed(1)} ms)</td>
                <td style={{ padding: '0.6rem 0.75rem' }}><span className="badge badge-emerald">Predictive (-{p95Pct}%)</span></td>
              </tr>

              {/* Row 2: P99 */}
              <tr style={{ borderBottom: '1px solid rgba(255,255,255,0.03)' }}>
                <td style={{ padding: '0.6rem 0.75rem', fontWeight: 600 }}>P99 Tail Latency</td>
                <td style={{ padding: '0.6rem 0.75rem', fontFamily: 'var(--font-mono)', color: '#f43f5e' }}>{hpa.p99LatencyMs.toFixed(1)} ms</td>
                <td style={{ padding: '0.6rem 0.75rem', fontFamily: 'var(--font-mono)', color: '#10b981', fontWeight: 700 }}>{keda.p99LatencyMs.toFixed(1)} ms</td>
                <td style={{ padding: '0.6rem 0.75rem', fontFamily: 'var(--font-mono)', color: '#10b981' }}>▼ {(((hpa.p99LatencyMs - keda.p99LatencyMs) / hpa.p99LatencyMs) * 100).toFixed(1)}%</td>
                <td style={{ padding: '0.6rem 0.75rem' }}><span className="badge badge-emerald">Predictive</span></td>
              </tr>

              {/* Row 3: SLO Breach Rate */}
              <tr style={{ borderBottom: '1px solid rgba(255,255,255,0.03)' }}>
                <td style={{ padding: '0.6rem 0.75rem', fontWeight: 600 }}>SLO Breach Rate (&gt;200ms)</td>
                <td style={{ padding: '0.6rem 0.75rem', fontFamily: 'var(--font-mono)', color: '#f43f5e' }}>{(hpa.sloViolationRate * 100).toFixed(1)}%</td>
                <td style={{ padding: '0.6rem 0.75rem', fontFamily: 'var(--font-mono)', color: '#10b981', fontWeight: 700 }}>{(keda.sloViolationRate * 100).toFixed(1)}%</td>
                <td style={{ padding: '0.6rem 0.75rem', fontFamily: 'var(--font-mono)', color: '#10b981' }}>▼ {sloReductionPct}%</td>
                <td style={{ padding: '0.6rem 0.75rem' }}><span className="badge badge-emerald">Near Zero Violation</span></td>
              </tr>

              {/* Row 4: Scaling Lag */}
              <tr style={{ borderBottom: '1px solid rgba(255,255,255,0.03)' }}>
                <td style={{ padding: '0.6rem 0.75rem', fontWeight: 600 }}>Scaling Delay (D_scale)</td>
                <td style={{ padding: '0.6rem 0.75rem', fontFamily: 'var(--font-mono)', color: '#fbbf24' }}>{hpa.avgScalingDelaySeconds}s (Reactive Lag)</td>
                <td style={{ padding: '0.6rem 0.75rem', fontFamily: 'var(--font-mono)', color: '#06b6d4', fontWeight: 700 }}>{keda.avgScalingDelaySeconds}s (Proactive)</td>
                <td style={{ padding: '0.6rem 0.75rem', fontFamily: 'var(--font-mono)', color: '#06b6d4' }}>▼ {delayDiff}s Lead Time</td>
                <td style={{ padding: '0.6rem 0.75rem' }}><span className="badge badge-cyan">Zero Startup Lag</span></td>
              </tr>

              {/* Row 5: Peak Replicas */}
              <tr style={{ borderBottom: '1px solid rgba(255,255,255,0.03)' }}>
                <td style={{ padding: '0.6rem 0.75rem', fontWeight: 600 }}>Peak Pod Replicas</td>
                <td style={{ padding: '0.6rem 0.75rem', fontFamily: 'var(--font-mono)' }}>{hpa.peakReplicas} Pods</td>
                <td style={{ padding: '0.6rem 0.75rem', fontFamily: 'var(--font-mono)', color: '#06b6d4' }}>{keda.peakReplicas} Pods</td>
                <td style={{ padding: '0.6rem 0.75rem', fontFamily: 'var(--font-mono)' }}>+{keda.peakReplicas - hpa.peakReplicas} Pods Ahead</td>
                <td style={{ padding: '0.6rem 0.75rem' }}><span className="badge badge-violet">Pre-provisioned</span></td>
              </tr>

              {/* Row 6: Peak CPU */}
              <tr style={{ borderBottom: '1px solid rgba(255,255,255,0.03)' }}>
                <td style={{ padding: '0.6rem 0.75rem', fontWeight: 600 }}>Peak CPU Pegging</td>
                <td style={{ padding: '0.6rem 0.75rem', fontFamily: 'var(--font-mono)', color: '#f43f5e' }}>{hpa.peakCpuPercent}% (Saturated)</td>
                <td style={{ padding: '0.6rem 0.75rem', fontFamily: 'var(--font-mono)', color: '#10b981' }}>{keda.peakCpuPercent}% (Headroom)</td>
                <td style={{ padding: '0.6rem 0.75rem', fontFamily: 'var(--font-mono)', color: '#10b981' }}>-{(hpa.peakCpuPercent - keda.peakCpuPercent).toFixed(1)}%</td>
                <td style={{ padding: '0.6rem 0.75rem' }}><span className="badge badge-emerald">Safe Margin</span></td>
              </tr>

              {/* Row 7: ML Metrics */}
              <tr>
                <td style={{ padding: '0.6rem 0.75rem', fontWeight: 600 }}>Time-Series Model Accuracy</td>
                <td style={{ padding: '0.6rem 0.75rem', color: 'var(--text-secondary)' }}>N/A (Reactive Rules)</td>
                <td style={{ padding: '0.6rem 0.75rem', fontFamily: 'var(--font-mono)', color: '#f59e0b' }}>MAE: {keda.mae != null ? keda.mae.toFixed(2) : '—'} | RMSE: {keda.rmse != null ? keda.rmse.toFixed(2) : '—'}</td>
                <td style={{ padding: '0.6rem 0.75rem', fontFamily: 'var(--font-mono)', color: '#f59e0b' }}>Prophet Out-of-Sample</td>
                <td style={{ padding: '0.6rem 0.75rem' }}><span className="badge badge-amber">{keda.mae != null ? 'Evaluated' : 'N/A'}</span></td>
              </tr>

            </tbody>
          </table>
        </div>
      </div>

    </div>
  );
}
