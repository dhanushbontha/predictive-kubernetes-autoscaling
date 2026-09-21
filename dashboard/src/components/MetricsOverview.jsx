import React from 'react';
import { Cpu, Server, Activity, Clock, ShieldAlert, CheckCircle2, TrendingUp } from 'lucide-react';

export default function MetricsOverview({ currentMetrics }) {
  const {
    currentReplicas = 0,
    avgCpuPercent = 0,
    currentRps = 0,
    predictedRps = 0,
    p95LatencyMs = 0,
    p99LatencyMs = 0,
    sloViolationRate = 0,
    totalRequests = 0,
    mae = 0,
    rmse = 0,
  } = currentMetrics || {};

  const cpuStatusColor = avgCpuPercent > 75 ? '#f43f5e' : avgCpuPercent > 50 ? '#f59e0b' : '#10b981';
  const latencyStatusColor = p95LatencyMs > 200 ? '#f43f5e' : p95LatencyMs > 150 ? '#f59e0b' : '#34d399';

  const cards = [
    {
      title: 'Active Pod Replicas',
      value: `${currentReplicas} / 5`,
      subtext: 'Min: 1 | Max: 5',
      icon: Server,
      accent: '#06b6d4',
      badgeText: currentReplicas > 1 ? 'SCALED' : currentReplicas === 1 ? 'BASELINE' : 'OFFLINE',
      badgeClass: currentReplicas > 1 ? 'badge-cyan' : currentReplicas === 1 ? 'badge-emerald' : 'badge-zinc',
    },
    {
      title: 'CPU Utilization',
      value: `${avgCpuPercent.toFixed(1)}%`,
      subtext: 'Target Threshold: 50.0%',
      icon: Cpu,
      accent: cpuStatusColor,
      badgeText: avgCpuPercent > 50 ? 'HIGH' : 'NORMAL',
      badgeClass: avgCpuPercent > 50 ? 'badge-amber' : 'badge-emerald',
    },
    {
      title: 'Workload Traffic',
      value: `Actual ${currentRps.toFixed(1)} · Forecast ${predictedRps.toFixed(1)} rps`,
      subtext: `Forecast Delta: ${((Math.abs(predictedRps - currentRps) / Math.max(1, currentRps)) * 100).toFixed(0)}%`,
      icon: Activity,
      accent: '#8b5cf6',
      badgeText: currentRps > 50 ? 'HIGH LOAD' : 'NORMAL',
      badgeClass: currentRps > 50 ? 'badge-amber' : 'badge-violet',
    },
    {
      title: 'Response Latency',
      value: `P95 ${p95LatencyMs.toFixed(1)}ms · P99 ${p99LatencyMs.toFixed(1)}ms`,
      subtext: 'Service Level Objective (SLO): 200ms threshold',
      icon: Clock,
      accent: latencyStatusColor,
      badgeText: p95LatencyMs > 200 ? 'SLO BREACH' : 'SLO COMPLIANT',
      badgeClass: p95LatencyMs > 200 ? 'badge-rose' : 'badge-emerald',
    },
    {
      title: 'SLO Violation Rate',
      value: `${sloViolationRate.toFixed(2)}%`,
      subtext: `Total Requests: ${totalRequests.toLocaleString()}`,
      icon: ShieldAlert,
      accent: sloViolationRate > 5 ? '#f43f5e' : '#10b981',
      badgeText: sloViolationRate > 0 ? `${(sloViolationRate).toFixed(1)}%` : '0%',
      badgeClass: sloViolationRate > 0 ? 'badge-rose' : 'badge-emerald',
    },
    {
      title: 'Prophet Accuracy',
      value: `MAE ${mae ? mae.toFixed(2) : '—'} · RMSE ${rmse ? rmse.toFixed(2) : '—'}`,
      subtext: 'Out-of-sample forecast evaluation error',
      icon: TrendingUp,
      accent: '#06b6d4',
      badgeText: mae != null ? 'EVALUATED' : 'READY',
      badgeClass: mae != null ? 'badge-cyan' : 'badge-zinc',
    },
  ];

  return (
    <div style={{
      display: 'grid',
      gridTemplateColumns: 'repeat(auto-fit, minmax(210px, 1fr))',
      gap: '1rem',
      marginBottom: '1.5rem',
    }}>
      {cards.map((card, idx) => {
        const Icon = card.icon;
        return (
          <div key={idx} className="glass-panel" style={{
            padding: '1.15rem',
            position: 'relative',
            overflow: 'hidden',
          }}>
            {/* Top Row: Title + Icon */}
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.6rem' }}>
              <span style={{ fontSize: '0.8rem', fontWeight: 600, color: 'var(--text-secondary)' }}>
                {card.title}
              </span>
              <div style={{
                padding: '0.4rem',
                borderRadius: '8px',
                background: `${card.accent}15`,
                border: `1px solid ${card.accent}30`,
              }}>
                <Icon size={16} color={card.accent} />
              </div>
            </div>

            {/* Metric Value */}
            <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', gap: '0.5rem', marginBottom: '0.35rem', flexWrap: 'wrap' }}>
              <span className="stat-mono" style={{ fontSize: card.value.length > 12 ? '1.1rem' : '1.45rem', fontWeight: 700, color: '#ffffff' }}>
                {card.value}
              </span>
              <span className={`badge ${card.badgeClass}`}>
                {card.badgeText}
              </span>
            </div>

            {/* Subtext */}
            <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
              {card.subtext}
            </p>
          </div>
        );
      })}
    </div>
  );
}
