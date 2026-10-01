import React from 'react';
import { Cpu, Server, Activity, Clock, ShieldAlert, TrendingUp } from 'lucide-react';
import { isMeasured, formatNum, formatPercent, formatMs, formatInt } from '../services/formatters';

export default function MetricsOverview({ currentMetrics }) {
  const {
    currentReplicas,
    avgCpuPercent,
    currentRps,
    predictedRps,
    p95LatencyMs,
    p99LatencyMs,
    sloViolationRate,
    totalRequests,
    mae,
    rmse,
  } = currentMetrics || {};

  const hasCpu = isMeasured(avgCpuPercent);
  const cpuStatusColor = !hasCpu ? '#94a3b8' : avgCpuPercent > 75 ? '#f43f5e' : avgCpuPercent > 50 ? '#f59e0b' : '#10b981';

  const hasP95 = isMeasured(p95LatencyMs);
  const latencyStatusColor = !hasP95 ? '#94a3b8' : p95LatencyMs > 200 ? '#f43f5e' : p95LatencyMs > 150 ? '#f59e0b' : '#34d399';

  const hasSlo = isMeasured(sloViolationRate);
  const sloColor = !hasSlo ? '#94a3b8' : sloViolationRate > 5 ? '#f43f5e' : '#10b981';

  const hasMae = isMeasured(mae);
  const hasRmse = isMeasured(rmse);
  const hasForecastRps = isMeasured(predictedRps) && predictedRps > 0;

  const cards = [
    {
      title: 'Active Pod Replicas',
      value: isMeasured(currentReplicas) ? `${currentReplicas} / 5` : 'N/A',
      subtext: 'Min: 1 | Max: 5',
      icon: Server,
      accent: '#06b6d4',
      badgeText: !isMeasured(currentReplicas) ? 'N/A' : currentReplicas > 1 ? 'SCALED' : currentReplicas === 1 ? 'BASELINE' : 'OFFLINE',
      badgeClass: !isMeasured(currentReplicas) ? 'badge-zinc' : currentReplicas > 1 ? 'badge-cyan' : currentReplicas === 1 ? 'badge-emerald' : 'badge-zinc',
    },
    {
      title: 'CPU Utilization',
      value: hasCpu ? `${avgCpuPercent.toFixed(1)}%` : 'N/A',
      subtext: 'Target Threshold: 50.0%',
      icon: Cpu,
      accent: cpuStatusColor,
      badgeText: !hasCpu ? 'N/A' : avgCpuPercent > 50 ? 'HIGH' : 'NORMAL',
      badgeClass: !hasCpu ? 'badge-zinc' : avgCpuPercent > 50 ? 'badge-amber' : 'badge-emerald',
    },
    {
      title: 'Workload Traffic',
      value: `Actual ${isMeasured(currentRps) ? currentRps.toFixed(1) : 'N/A'} · Forecast ${hasForecastRps ? predictedRps.toFixed(1) + ' RPS' : 'N/A'}`,
      subtext: hasForecastRps && isMeasured(currentRps) && currentRps > 0
        ? `Forecast Delta: ${((Math.abs(predictedRps - currentRps) / currentRps) * 100).toFixed(0)}%`
        : 'Live request rate from Prometheus telemetry',
      icon: Activity,
      accent: '#8b5cf6',
      badgeText: !isMeasured(currentRps) ? 'N/A' : currentRps > 50 ? 'HIGH LOAD' : 'NORMAL',
      badgeClass: !isMeasured(currentRps) ? 'badge-zinc' : currentRps > 50 ? 'badge-amber' : 'badge-violet',
    },
    {
      title: 'Response Latency',
      value: `P95 ${hasP95 ? p95LatencyMs.toFixed(1) + 'ms' : 'N/A'} · P99 ${isMeasured(p99LatencyMs) ? p99LatencyMs.toFixed(1) + 'ms' : 'N/A'}`,
      subtext: 'Service Level Objective (SLO): 200ms threshold',
      icon: Clock,
      accent: latencyStatusColor,
      badgeText: !hasP95 ? 'N/A' : p95LatencyMs > 200 ? 'SLO BREACH' : 'SLO COMPLIANT',
      badgeClass: !hasP95 ? 'badge-zinc' : p95LatencyMs > 200 ? 'badge-rose' : 'badge-emerald',
    },
    {
      title: 'SLO Violation Rate',
      value: hasSlo ? `${sloViolationRate.toFixed(2)}%` : 'N/A',
      subtext: `Total Requests: ${isMeasured(totalRequests) ? formatInt(totalRequests) : 'N/A'}`,
      icon: ShieldAlert,
      accent: sloColor,
      badgeText: !hasSlo ? 'N/A' : sloViolationRate > 0 ? `${sloViolationRate.toFixed(1)}%` : '0%',
      badgeClass: !hasSlo ? 'badge-zinc' : sloViolationRate > 0 ? 'badge-rose' : 'badge-emerald',
    },
    {
      title: 'Prophet Accuracy',
      value: `MAE ${hasMae ? mae.toFixed(2) : 'N/A'} · RMSE ${hasRmse ? rmse.toFixed(2) : 'N/A'}`,
      subtext: 'Out-of-sample forecast evaluation error',
      icon: TrendingUp,
      accent: '#06b6d4',
      badgeText: hasMae ? 'EVALUATED' : 'N/A',
      badgeClass: hasMae ? 'badge-cyan' : 'badge-zinc',
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
