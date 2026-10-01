import React from 'react';
import { Layers, Server, Box, CheckCircle2, ShieldCheck, Activity } from 'lucide-react';
import { formatInt } from '../services/formatters';

export default function ClusterStatus({ currentReplicas = 0 }) {
  const isOnline = currentReplicas > 0;

  return (
    <div className="glass-panel" style={{ padding: '1.25rem', marginBottom: '1.5rem' }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1rem', flexWrap: 'wrap', gap: '0.5rem' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          <Layers size={18} color="#06b6d4" />
          <h3 style={{ fontSize: '0.95rem' }}>Kubernetes Workload Cluster Status (`autoscaling-experiment`)</h3>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          <span className={`badge ${isOnline ? 'badge-emerald' : 'badge-zinc'}`}>
            {isOnline ? `${currentReplicas} / 5 PODS READY` : '0 PODS ACTIVE · CLUSTER OFFLINE'}
          </span>
          <span className="badge badge-cyan" style={{ fontSize: '0.7rem' }}>
            DEPLOYMENT: workload-service
          </span>
        </div>
      </div>

      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))',
        gap: '1rem',
      }}>
        {/* Card 1: Workload Deployment State */}
        <div style={{
          background: 'rgba(255, 255, 255, 0.02)',
          border: '1px solid var(--border-subtle)',
          borderRadius: '0.5rem',
          padding: '1rem'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', color: 'var(--text-secondary)', fontSize: '0.78rem', marginBottom: '0.35rem' }}>
            <Server size={14} color="#06b6d4" />
            <span>Target Deployment</span>
          </div>
          <div style={{ fontSize: '1rem', fontWeight: 700, color: '#ffffff', fontFamily: 'var(--font-mono)' }}>
            workload-service
          </div>
          <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', marginTop: '0.2rem' }}>
            Namespace: <span style={{ color: '#38bdf8' }}>autoscaling-experiment</span>
          </div>
        </div>

        {/* Card 2: Replica Pool Allocation */}
        <div style={{
          background: 'rgba(255, 255, 255, 0.02)',
          border: '1px solid var(--border-subtle)',
          borderRadius: '0.5rem',
          padding: '1rem'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', color: 'var(--text-secondary)', fontSize: '0.78rem', marginBottom: '0.35rem' }}>
            <Box size={14} color="#10b981" />
            <span>Ready Pod Replicas</span>
          </div>
          <div style={{ fontSize: '1rem', fontWeight: 700, color: isOnline ? '#10b981' : '#f43f5e', fontFamily: 'var(--font-mono)' }}>
            {formatInt(currentReplicas)} Pods Active
          </div>
          <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', marginTop: '0.2rem' }}>
            Min: 1 Pod &bull; Max Limit: 5 Pods
          </div>
        </div>

        {/* Card 3: Autoscaler Target Configuration */}
        <div style={{
          background: 'rgba(255, 255, 255, 0.02)',
          border: '1px solid var(--border-subtle)',
          borderRadius: '0.5rem',
          padding: '1rem'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', color: 'var(--text-secondary)', fontSize: '0.78rem', marginBottom: '0.35rem' }}>
            <Activity size={14} color="#8b5cf6" />
            <span>Autoscaling Thresholds</span>
          </div>
          <div style={{ fontSize: '0.85rem', fontWeight: 600, color: '#c4b5fd' }}>
            KEDA: 20 RPS &bull; HPA: 50% CPU
          </div>
          <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', marginTop: '0.2rem' }}>
            SLO Response Target: 200 ms
          </div>
        </div>

        {/* Card 4: Orchestration Bridge */}
        <div style={{
          background: 'rgba(255, 255, 255, 0.02)',
          border: '1px solid var(--border-subtle)',
          borderRadius: '0.5rem',
          padding: '1rem'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', color: 'var(--text-secondary)', fontSize: '0.78rem', marginBottom: '0.35rem' }}>
            <ShieldCheck size={14} color="#34d399" />
            <span>Telemetry Source</span>
          </div>
          <div style={{ fontSize: '0.85rem', fontWeight: 600, color: '#34d399' }}>
            Prometheus + k6 In-Cluster
          </div>
          <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', marginTop: '0.2rem' }}>
            Direct Fabric8 Pod condition queries
          </div>
        </div>
      </div>
    </div>
  );
}
