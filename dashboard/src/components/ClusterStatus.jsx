import React from 'react';
import { Layers, Server, HardDrive, CheckCircle2, ShieldCheck, Box } from 'lucide-react';

export default function ClusterStatus({ currentReplicas = 1 }) {
  // Generate visual pod representations based on active replica count
  const pods = Array.from({ length: currentReplicas }, (_, i) => ({
    name: `workload-service-7f8d9b6c-${Math.random().toString(36).substring(2, 7)}`,
    status: 'Running',
    ready: '1/1',
    restarts: 0,
    cpuUsage: `${(Math.random() * 30 + 35).toFixed(0)}m`,
    memUsage: `${(Math.random() * 20 + 210).toFixed(0)}Mi`,
  }));

  return (
    <div className="glass-panel" style={{ padding: '1.25rem', marginBottom: '1.5rem' }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1rem' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          <Layers size={18} color="#06b6d4" />
          <h3 style={{ fontSize: '0.95rem' }}>Kubernetes Cluster Workload Pods (`autoscaling-experiment`)</h3>
        </div>
        <span className="badge badge-emerald">{currentReplicas} PODS HEALTHY</span>
      </div>

      <div style={{ overflowX: 'auto' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.8rem' }}>
          <thead>
            <tr style={{ borderBottom: '1px solid var(--border-subtle)', color: 'var(--text-secondary)', textAlign: 'left' }}>
              <th style={{ padding: '0.6rem 0.75rem' }}>Pod Name</th>
              <th style={{ padding: '0.6rem 0.75rem' }}>Ready</th>
              <th style={{ padding: '0.6rem 0.75rem' }}>Status</th>
              <th style={{ padding: '0.6rem 0.75rem' }}>Restarts</th>
              <th style={{ padding: '0.6rem 0.75rem' }}>CPU (millicores)</th>
              <th style={{ padding: '0.6rem 0.75rem' }}>Memory</th>
            </tr>
          </thead>
          <tbody>
            {pods.map((p, idx) => (
              <tr key={idx} style={{ borderBottom: '1px solid rgba(255,255,255,0.03)', transition: 'background 0.2s ease' }}>
                <td style={{ padding: '0.6rem 0.75rem', fontFamily: 'var(--font-mono)', color: '#ffffff' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                    <Box size={14} color="#06b6d4" />
                    {p.name}
                  </div>
                </td>
                <td style={{ padding: '0.6rem 0.75rem', color: 'var(--text-secondary)' }}>{p.ready}</td>
                <td style={{ padding: '0.6rem 0.75rem' }}>
                  <span className="badge badge-emerald" style={{ fontSize: '0.7rem' }}>
                    {p.status}
                  </span>
                </td>
                <td style={{ padding: '0.6rem 0.75rem', color: 'var(--text-secondary)' }}>{p.restarts}</td>
                <td style={{ padding: '0.6rem 0.75rem', fontFamily: 'var(--font-mono)', color: '#38bdf8' }}>{p.cpuUsage}</td>
                <td style={{ padding: '0.6rem 0.75rem', fontFamily: 'var(--font-mono)', color: '#a78bfa' }}>{p.memUsage}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
