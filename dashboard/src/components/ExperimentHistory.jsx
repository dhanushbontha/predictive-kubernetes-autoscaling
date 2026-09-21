import React from 'react';
import { Database, CheckCircle2, XCircle, Clock, AlertCircle, RefreshCw, Layers } from 'lucide-react';

export default function ExperimentHistory({ history = [] }) {
  const rawItems = history || [];

  return (
    <div className="glass-panel" style={{ padding: '1.25rem', marginBottom: '1.5rem' }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1rem' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          <Database size={18} color="#8b5cf6" />
          <h3 style={{ fontSize: '0.95rem' }}>PostgreSQL Experiment Records & Benchmark Comparison</h3>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          <span className="badge badge-violet">PERSISTED RESULTS</span>
          <span style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>
            ({rawItems.length} runs)
          </span>
        </div>
      </div>

      <div style={{ overflowX: 'auto' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.8rem' }}>
          <thead>
            <tr style={{ borderBottom: '1px solid var(--border-subtle)', color: 'var(--text-secondary)', textAlign: 'left' }}>
              <th style={{ padding: '0.6rem 0.75rem' }}>Experiment ID</th>
              <th style={{ padding: '0.6rem 0.75rem' }}>Scenario</th>
              <th style={{ padding: '0.6rem 0.75rem' }}>Autoscaling Mode</th>
              <th style={{ padding: '0.6rem 0.75rem' }}>Target RPS</th>
              <th style={{ padding: '0.6rem 0.75rem' }}>P95 Latency</th>
              <th style={{ padding: '0.6rem 0.75rem' }}>SLO Breach %</th>
              <th style={{ padding: '0.6rem 0.75rem' }}>Peak Replicas</th>
              <th style={{ padding: '0.6rem 0.75rem' }}>Avg CPU</th>
              <th style={{ padding: '0.6rem 0.75rem' }}>Status</th>
            </tr>
          </thead>
          <tbody>
            {rawItems.length === 0 ? (
              <tr>
                <td colSpan={9} style={{ padding: '2rem', textAlign: 'center', color: 'var(--text-secondary)' }}>
                  No completed experiments recorded yet. Launch an experiment from the Live Monitor to generate verified benchmark data.
                </td>
              </tr>
            ) : (
              rawItems.map((item, idx) => {
              const modeStr = item.autoscalingMode || item.mode || '';
              const isPredictive = modeStr.includes('PREDICTIVE');
              
              const p95Val = item.result?.p95LatencyMs != null
                ? `${item.result.p95LatencyMs.toFixed(1)} ms`
                : (item.p95Latency || '—');
              
              const p95Num = item.result?.p95LatencyMs ?? parseFloat(item.p95Latency ?? 0);

              const sloVal = item.result?.sloViolationRate != null
                ? `${(item.result.sloViolationRate * 100).toFixed(1)}%`
                : (item.sloViolations != null ? `${item.sloViolations}` : '—');
              
              const sloNum = item.result?.sloViolationRate != null
                ? (item.result.sloViolationRate * 100)
                : parseFloat(item.sloViolations ?? 0);

              const peakReps = item.result?.peakReplicas != null
                ? `${item.result.peakReplicas} Pods`
                : (item.peakReplicas ? `${item.peakReplicas} Pods` : '—');

              const avgCpu = item.result?.avgCpuPercent != null
                ? `${item.result.avgCpuPercent.toFixed(1)}%`
                : (item.avgCpu ? `${item.avgCpu}` : '—');

              const status = item.status || 'UNKNOWN';

              let statusBadgeClass = 'badge-emerald';
              if (status === 'RUNNING') statusBadgeClass = 'badge-cyan animate-pulse';
              else if (status === 'STARTING') statusBadgeClass = 'badge-amber animate-pulse';
              else if (status === 'FAILED') statusBadgeClass = 'badge-rose';
              else if (status === 'STOPPED') statusBadgeClass = 'badge-zinc';

              return (
                <tr key={item.id || idx} style={{ borderBottom: '1px solid rgba(255,255,255,0.03)', transition: 'background 0.2s ease' }}>
                  <td style={{ padding: '0.6rem 0.75rem', fontFamily: 'var(--font-mono)', color: '#ffffff' }}>
                    {item.id ? item.id.substring(0, 8) : item.name}
                  </td>
                  <td style={{ padding: '0.6rem 0.75rem' }}>
                    <span className="badge badge-violet" style={{ fontSize: '0.7rem' }}>
                      {item.scenario}
                    </span>
                  </td>
                  <td style={{ padding: '0.6rem 0.75rem' }}>
                    <span className={`badge ${isPredictive ? 'badge-cyan' : 'badge-amber'}`} style={{ fontSize: '0.7rem' }}>
                      {isPredictive ? 'PREDICTIVE (KEDA)' : 'REACTIVE (HPA)'}
                    </span>
                  </td>
                  <td style={{ padding: '0.6rem 0.75rem', fontFamily: 'var(--font-mono)' }}>
                    {item.targetRps} RPS
                  </td>
                  <td style={{
                    padding: '0.6rem 0.75rem',
                    fontFamily: 'var(--font-mono)',
                    color: p95Num > 200 ? '#f43f5e' : (p95Val === '—' ? 'var(--text-secondary)' : '#34d399'),
                    fontWeight: 600,
                  }}>
                    {p95Val}
                  </td>
                  <td style={{
                    padding: '0.6rem 0.75rem',
                    fontFamily: 'var(--font-mono)',
                    color: sloNum > 5 ? '#f43f5e' : (sloVal === '—' ? 'var(--text-secondary)' : '#10b981'),
                    fontWeight: 600,
                  }}>
                    {sloVal}
                  </td>
                  <td style={{ padding: '0.6rem 0.75rem', fontFamily: 'var(--font-mono)', color: '#06b6d4' }}>
                    {peakReps}
                  </td>
                  <td style={{ padding: '0.6rem 0.75rem', fontFamily: 'var(--font-mono)' }}>
                    {avgCpu}
                  </td>
                  <td style={{ padding: '0.6rem 0.75rem' }}>
                    <span className={`badge ${statusBadgeClass}`} style={{ fontSize: '0.7rem' }}>
                      {status}
                    </span>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
