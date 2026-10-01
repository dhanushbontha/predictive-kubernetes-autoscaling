import React from 'react';
import { Database } from 'lucide-react';
import { isMeasured, formatInt, formatMs, formatPercent } from '../services/formatters';
import { isDemoExperiment } from '../services/researchMatrix';

export default function ExperimentHistory({ history = [] }) {
  const rawItems = history || [];

  return (
    <div className="glass-panel" style={{ padding: '1.25rem', marginBottom: '1.5rem' }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1rem', flexWrap: 'wrap', gap: '0.5rem' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          <Database size={18} color="#8b5cf6" />
          <h3 style={{ fontSize: '0.95rem' }}>PostgreSQL Experiment Records & Measured Results</h3>
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
              <th style={{ padding: '0.6rem 0.75rem' }}>SLO Violations (%)</th>
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
                const isDemo = isDemoExperiment(item);
                const modeStr = item.autoscalingMode || item.mode || '';
                const isPredictive = modeStr.includes('PREDICTIVE');
                const r = item.result;

                // Prioritize exact k6 discrete request metrics
                const p95 = r?.k6P95LatencyMs ?? r?.p95LatencyMs ?? null;
                const sloViolations = r?.k6SloViolations ?? r?.sloViolations ?? null;
                const sloRate = r?.k6SloViolationRate ?? r?.sloViolationRate ?? null;
                const avgCpu = r?.avgCpuPercent ?? null;
                const peakReps = r?.peakReplicas ?? null;

                const status = item.status || 'UNKNOWN';

                let statusBadgeClass = 'badge-emerald';
                if (status === 'RUNNING') statusBadgeClass = 'badge-cyan animate-pulse';
                else if (status === 'STARTING') statusBadgeClass = 'badge-amber animate-pulse';
                else if (status === 'FAILED') statusBadgeClass = 'badge-rose';
                else if (status === 'STOPPED') statusBadgeClass = 'badge-zinc';

                return (
                  <tr key={item.id || idx} style={{ borderBottom: '1px solid rgba(255,255,255,0.03)', transition: 'background 0.2s ease' }}>
                    <td style={{ padding: '0.6rem 0.75rem', fontFamily: 'var(--font-mono)', color: '#ffffff' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.35rem', marginBottom: '2px' }}>
                        <span 
                          className={`badge ${isDemo ? 'badge-amber' : 'badge-emerald'}`} 
                          style={{ fontSize: '0.65rem', padding: '0.1rem 0.35rem' }}
                        >
                          {isDemo ? '🎮 DEMO' : '🔬 RESEARCH'}
                        </span>
                      </div>
                      {item.id ? item.id.substring(0, 8) : (item.name || `run-${idx}`)}
                    </td>
                    <td style={{ padding: '0.6rem 0.75rem' }}>
                      <span className="badge badge-violet" style={{ fontSize: '0.7rem' }}>
                        {item.scenario || 'N/A'}
                      </span>
                    </td>
                    <td style={{ padding: '0.6rem 0.75rem' }}>
                      <span className={`badge ${isPredictive ? 'badge-cyan' : 'badge-amber'}`} style={{ fontSize: '0.7rem' }}>
                        {isPredictive ? 'PREDICTIVE (KEDA)' : 'REACTIVE (HPA)'}
                      </span>
                    </td>
                    <td style={{ padding: '0.6rem 0.75rem', fontFamily: 'var(--font-mono)' }}>
                      {isMeasured(item.targetRps) ? `${item.targetRps} RPS` : 'N/A'}
                    </td>
                    <td style={{
                      padding: '0.6rem 0.75rem',
                      fontFamily: 'var(--font-mono)',
                      color: !isMeasured(p95) ? 'var(--text-secondary)' : p95 > 200 ? '#f43f5e' : '#34d399',
                      fontWeight: 600,
                    }}>
                      {formatMs(p95)}
                    </td>
                    <td style={{
                      padding: '0.6rem 0.75rem',
                      fontFamily: 'var(--font-mono)',
                      color: !isMeasured(sloViolations) ? 'var(--text-secondary)' : sloViolations > 0 ? '#f43f5e' : '#10b981',
                      fontWeight: 600,
                    }}>
                      {isMeasured(sloViolations)
                        ? `${formatInt(sloViolations)} (${isMeasured(sloRate) ? (sloRate * 100).toFixed(2) + '%' : 'N/A'})`
                        : 'N/A'}
                    </td>
                    <td style={{ padding: '0.6rem 0.75rem', fontFamily: 'var(--font-mono)', color: '#06b6d4' }}>
                      {isMeasured(peakReps) ? `${peakReps} Pods` : 'N/A'}
                    </td>
                    <td style={{ padding: '0.6rem 0.75rem', fontFamily: 'var(--font-mono)' }}>
                      {formatPercent(avgCpu)}
                    </td>
                    <td style={{ padding: '0.6rem 0.75rem' }}>
                      <span className={`badge ${statusBadgeClass}`} style={{ fontSize: '0.7rem' }}>
                        {status}
                      </span>
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
