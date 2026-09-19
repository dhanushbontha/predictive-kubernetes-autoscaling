import React from 'react';
import {
  ResponsiveContainer,
  AreaChart,
  Area,
  LineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
  ReferenceLine,
  Legend,
} from 'recharts';
import { Cpu, Activity, Server, Clock } from 'lucide-react';

const CustomTooltip = ({ active, payload, label, unit = '' }) => {
  if (active && payload && payload.length) {
    return (
      <div style={{
        background: 'rgba(15, 23, 42, 0.95)',
        border: '1px solid rgba(255, 255, 255, 0.15)',
        borderRadius: '8px',
        padding: '0.6rem 0.9rem',
        boxShadow: '0 8px 24px rgba(0,0,0,0.5)',
        fontSize: '0.8rem',
      }}>
        <p style={{ color: 'var(--text-muted)', marginBottom: '0.35rem', fontFamily: 'var(--font-mono)' }}>
          {label}
        </p>
        {payload.map((entry, index) => (
          <div key={`item-${index}`} style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.2rem' }}>
            <span style={{ width: '8px', height: '8px', borderRadius: '50%', background: entry.color }} />
            <span style={{ color: 'var(--text-secondary)' }}>{entry.name}:</span>
            <strong style={{ color: '#ffffff', fontFamily: 'var(--font-mono)' }}>
              {typeof entry.value === 'number' ? entry.value.toFixed(1) : entry.value} {unit}
            </strong>
          </div>
        ))}
      </div>
    );
  }
  return null;
};

export default function TelemetryCharts({ timeSeriesData }) {
  const data = timeSeriesData && timeSeriesData.length > 0 ? timeSeriesData : [];

  return (
    <div style={{
      display: 'grid',
      gridTemplateColumns: 'repeat(auto-fit, minmax(480px, 1fr))',
      gap: '1.25rem',
      marginBottom: '1.5rem',
    }}>
      
      {/* Chart 1: CPU Utilization */}
      <div className="glass-panel" style={{ padding: '1.25rem' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1rem' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <Cpu size={18} color="#06b6d4" />
            <h3 style={{ fontSize: '0.95rem' }}>CPU Utilization (%) vs Target</h3>
          </div>
          <span className="badge badge-cyan">TARGET: 50%</span>
        </div>
        <div style={{ height: '240px', width: '100%' }}>
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={data} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
              <defs>
                <linearGradient id="cpuGradient" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#06b6d4" stopOpacity={0.4} />
                  <stop offset="95%" stopColor="#06b6d4" stopOpacity={0.0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
              <XAxis dataKey="time" stroke="#64748b" fontSize={11} tickLine={false} />
              <YAxis domain={[0, 100]} stroke="#64748b" fontSize={11} tickLine={false} />
              <Tooltip content={<CustomTooltip unit="%" />} />
              <ReferenceLine y={50} stroke="#f59e0b" strokeDasharray="4 4" label={{ value: '50% HPA Target', fill: '#fbbf24', fontSize: 10, position: 'insideTopRight' }} />
              <Area type="monotone" dataKey="cpuPercent" name="Actual CPU" stroke="#06b6d4" strokeWidth={2} fillOpacity={1} fill="url(#cpuGradient)" />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Chart 2: Actual RPS vs Prophet Forecast */}
      <div className="glass-panel" style={{ padding: '1.25rem' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1rem' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <Activity size={18} color="#8b5cf6" />
            <h3 style={{ fontSize: '0.95rem' }}>Workload RPS vs Prophet Forecast</h3>
          </div>
          <span className="badge badge-violet">AI FORECAST</span>
        </div>
        <div style={{ height: '240px', width: '100%' }}>
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={data} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
              <XAxis dataKey="time" stroke="#64748b" fontSize={11} tickLine={false} />
              <YAxis domain={[0, 'auto']} stroke="#64748b" fontSize={11} tickLine={false} />
              <Tooltip content={<CustomTooltip unit="RPS" />} />
              <Legend wrapperStyle={{ fontSize: '11px', paddingTop: '8px' }} />
              <Line type="monotone" dataKey="actualRps" name="Actual Workload RPS" stroke="#06b6d4" strokeWidth={2.5} dot={false} />
              <Line type="monotone" dataKey="predictedRps" name="Prophet Forecast (60s)" stroke="#a78bfa" strokeWidth={2} strokeDasharray="5 5" dot={false} />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Chart 3: Active Pod Replicas */}
      <div className="glass-panel" style={{ padding: '1.25rem' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1rem' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <Server size={18} color="#10b981" />
            <h3 style={{ fontSize: '0.95rem' }}>Pod Replicas Timeline (1–5)</h3>
          </div>
          <span className="badge badge-emerald">AUTOSCALING DYNAMICS</span>
        </div>
        <div style={{ height: '240px', width: '100%' }}>
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={data} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
              <defs>
                <linearGradient id="replicaGradient" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#10b981" stopOpacity={0.4} />
                  <stop offset="95%" stopColor="#10b981" stopOpacity={0.0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
              <XAxis dataKey="time" stroke="#64748b" fontSize={11} tickLine={false} />
              <YAxis domain={[0, 6]} ticks={[1, 2, 3, 4, 5]} stroke="#64748b" fontSize={11} tickLine={false} />
              <Tooltip content={<CustomTooltip unit="Pods" />} />
              <Area type="stepAfter" dataKey="replicas" name="Active Pods" stroke="#10b981" strokeWidth={2.5} fillOpacity={1} fill="url(#replicaGradient)" />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Chart 4: Latency & SLO Threshold */}
      <div className="glass-panel" style={{ padding: '1.25rem' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1rem' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <Clock size={18} color="#f43f5e" />
            <h3 style={{ fontSize: '0.95rem' }}>Response Latency vs 200ms SLO</h3>
          </div>
          <span className="badge badge-rose">SLO: 200MS</span>
        </div>
        <div style={{ height: '240px', width: '100%' }}>
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={data} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
              <XAxis dataKey="time" stroke="#64748b" fontSize={11} tickLine={false} />
              <YAxis domain={[0, 'auto']} stroke="#64748b" fontSize={11} tickLine={false} />
              <Tooltip content={<CustomTooltip unit="ms" />} />
              <Legend wrapperStyle={{ fontSize: '11px', paddingTop: '8px' }} />
              <ReferenceLine y={200} stroke="#f43f5e" strokeWidth={1.5} strokeDasharray="4 4" label={{ value: '200ms SLO Threshold', fill: '#fb7185', fontSize: 10, position: 'insideTopRight' }} />
              <Line type="monotone" dataKey="p95Latency" name="P95 Latency" stroke="#38bdf8" strokeWidth={2} dot={false} />
              <Line type="monotone" dataKey="p99Latency" name="P99 Latency" stroke="#f43f5e" strokeWidth={2} dot={false} />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </div>

    </div>
  );
}
