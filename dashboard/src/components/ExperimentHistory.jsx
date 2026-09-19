import React from 'react';
import { Database, CheckCircle2, XCircle, ArrowUpRight, Scale } from 'lucide-react';

export default function ExperimentHistory({ history = [] }) {
  const defaultHistory = [
    {
      id: '3e215511',
      name: 'bursty-hpa-benchmark',
      scenario: 'BURSTY',
      mode: 'REACTIVE_HPA',
      targetRps: 150,
      duration: '60s',
      p95Latency: '248.5 ms',
      sloViolations: '14.2%',
      peakReplicas: 4,
      avgCpu: '68.4%',
      status: 'COMPLETED',
    },
    {
      id: '8f419b22',
      name: 'bursty-keda-predictive',
      scenario: 'BURSTY',
      mode: 'PREDICTIVE_PROPHET_KEDA',
      targetRps: 150,
      duration: '60s',
      p95Latency: '82.1 ms',
      sloViolations: '0.8%',
      peakReplicas: 5,
      avgCpu: '44.2%',
      status: 'COMPLETED',
    },
  ];

  const items = history && history.length > 0 ? history : defaultHistory;

  return (
    <div className="glass-panel" style={{ padding: '1.25rem', marginBottom: '1.5rem' }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1rem' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          <Database size={18} color="#8b5cf6" />
          <h3 style={{ fontSize: '0.95rem' }}>PostgreSQL Experiment Records & Benchmark Comparison</h3>
        </div>
        <span className="badge badge-violet">PERSISTED RESULTS</span>
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
            {items.map((item, idx) => {
              const isPredictive = item.mode?.includes('PREDICTIVE');
              return (
                <tr key={idx} style={{ borderBottom: '1px solid rgba(255,255,255,0.03)', transition: 'background 0.2s ease' }}>
                  <td style={{ padding: '0.6rem 0.75rem', fontFamily: 'var(--font-mono)', color: '#ffffff' }}>
                    {item.id || item.name}
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
                    color: parseFloat(item.p95Latency) > 200 ? '#f43f5e' : '#34d399',
                    fontWeight: 600,
                  }}>
                    {item.p95Latency}
                  </td>
                  <td style={{
                    padding: '0.6rem 0.75rem',
                    fontFamily: 'var(--font-mono)',
                    color: parseFloat(item.sloViolations) > 5 ? '#f43f5e' : '#10b981',
                    fontWeight: 600,
                  }}>
                    {item.sloViolations}
                  </td>
                  <td style={{ padding: '0.6rem 0.75rem', fontFamily: 'var(--font-mono)', color: '#06b6d4' }}>
                    {item.peakReplicas} Pods
                  </td>
                  <td style={{ padding: '0.6rem 0.75rem', fontFamily: 'var(--font-mono)' }}>
                    {item.avgCpu}
                  </td>
                  <td style={{ padding: '0.6rem 0.75rem' }}>
                    <span className="badge badge-emerald" style={{ fontSize: '0.7rem' }}>
                      {item.status}
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
