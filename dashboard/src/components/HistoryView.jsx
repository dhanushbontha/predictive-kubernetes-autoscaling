import React, { useState, useMemo } from 'react';
import {
  Database,
  Search,
  Filter,
  FileSpreadsheet,
  FileText,
  CheckCircle2,
  RefreshCw,
  Zap,
  Activity,
  X,
  Eye,
  Copy,
  Check,
  Server,
  Clock,
  ShieldCheck,
} from 'lucide-react';
import { isMeasured, formatInt, formatMs, formatPercent, formatSeconds, formatMaeRmse } from '../services/formatters';
import { isDemoExperiment } from '../services/researchMatrix';

export default function HistoryView({ history = [], onRefresh, appMode = 'RESEARCH' }) {
  const [searchTerm, setSearchTerm] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('ALL'); // 'ALL' | 'RESEARCH' | 'DEMO'
  const [scenarioFilter, setScenarioFilter] = useState('ALL');
  const [modeFilter, setModeFilter] = useState('ALL');
  const [statusFilter, setStatusFilter] = useState('ALL');
  const [selectedExp, setSelectedExp] = useState(null);
  const [copiedJson, setCopiedJson] = useState(false);

  const isDemoMode = appMode === 'DEMO';

  // Use mode-separated history: Demo Mode sees ONLY demo runs; Research Mode sees ONLY research runs.
  const items = useMemo(() => {
    if (!Array.isArray(history)) return [];
    return history.filter((item) => (isDemoMode ? isDemoExperiment(item) : !isDemoExperiment(item)));
  }, [history, isDemoMode]);

  // Filtered experiments
  const filteredItems = useMemo(() => {
    return items.filter((item) => {
      const isDemo = isDemoExperiment(item);
      const matchCategory =
        categoryFilter === 'ALL' ||
        (categoryFilter === 'RESEARCH' && !isDemo) ||
        (categoryFilter === 'DEMO' && isDemo);

      const q = searchTerm.toLowerCase();
      const matchSearch =
        !searchTerm ||
        (item.id && item.id.toLowerCase().includes(q)) ||
        (item.name && item.name.toLowerCase().includes(q)) ||
        (item.scenario && item.scenario.toLowerCase().includes(q)) ||
        (item.autoscalingMode && item.autoscalingMode.toLowerCase().includes(q));

      const matchScenario = scenarioFilter === 'ALL' || item.scenario === scenarioFilter;
      const matchMode =
        modeFilter === 'ALL' ||
        (modeFilter === 'PREDICTIVE' && item.autoscalingMode?.includes('PREDICTIVE')) ||
        (modeFilter === 'REACTIVE' && item.autoscalingMode?.includes('REACTIVE'));

      const matchStatus = statusFilter === 'ALL' || item.status === statusFilter;

      return matchCategory && matchSearch && matchScenario && matchMode && matchStatus;
    });
  }, [items, categoryFilter, searchTerm, scenarioFilter, modeFilter, statusFilter]);

  // Summary Aggregate Stats from actual completed runs of the active mode
  const stats = useMemo(() => {
    const total = items.length;
    const completed = items.filter((i) => i.status === 'COMPLETED').length;
    let sumP95 = 0;
    let p95Count = 0;
    let totalReqs = 0;

    items.forEach((i) => {
      const r = i.result;
      const p95 = r?.k6P95LatencyMs ?? r?.p95LatencyMs;
      if (isMeasured(p95)) {
        sumP95 += Number(p95);
        p95Count++;
      }
      const reqs = r?.k6TotalRequests ?? r?.totalRequests;
      if (isMeasured(reqs)) {
        totalReqs += Number(reqs);
      }
    });

    const avgP95 = p95Count > 0 ? (sumP95 / p95Count).toFixed(1) : 'N/A';

    return { total, completed, avgP95, totalReqs };
  }, [items]);

  const handleExportCsv = () => {
    window.open('/api/experiments/matrix/summary.csv', '_blank');
  };

  const handleExportJson = () => {
    const dataStr = 'data:text/json;charset=utf-8,' + encodeURIComponent(JSON.stringify(items, null, 2));
    const downloadAnchor = document.createElement('a');
    downloadAnchor.setAttribute('href', dataStr);
    downloadAnchor.setAttribute('download', `${isDemoMode ? 'demo' : 'benchmark'}_history_${Date.now()}.json`);
    document.body.appendChild(downloadAnchor);
    downloadAnchor.click();
    downloadAnchor.remove();
  };

  const handleCopyJson = (exp) => {
    navigator.clipboard.writeText(JSON.stringify(exp, null, 2));
    setCopiedJson(true);
    setTimeout(() => setCopiedJson(false), 2000);
  };

  return (
    <div>
      {/* Top Stat Cards */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
        gap: '1rem',
        marginBottom: '1.5rem'
      }}>
        <div className="glass-panel" style={{ padding: '1rem' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <span style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>
              {isDemoMode ? 'Total Demo Experiments' : 'Total Experiments'}
            </span>
            <Database size={16} color={isDemoMode ? '#f59e0b' : '#8b5cf6'} />
          </div>
          <div style={{ fontSize: '1.6rem', fontWeight: 700, marginTop: '0.25rem', color: '#ffffff' }}>
            {stats.total}
          </div>
          <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', marginTop: '0.25rem' }}>
            {isDemoMode ? 'Demo sandbox executions' : 'Persisted in PostgreSQL database'}
          </div>
        </div>

        <div className="glass-panel" style={{ padding: '1rem' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <span style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>
              {isDemoMode ? 'Completed Demo Runs' : 'Completed Runs'}
            </span>
            <CheckCircle2 size={16} color="#10b981" />
          </div>
          <div style={{ fontSize: '1.6rem', fontWeight: 700, marginTop: '0.25rem', color: '#10b981' }}>
            {stats.completed}
          </div>
          <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', marginTop: '0.25rem' }}>
            {isDemoMode ? 'Finished sandbox trials' : 'Available for comparative pairing'}
          </div>
        </div>

        <div className="glass-panel" style={{ padding: '1rem' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <span style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>Average P95 Latency</span>
            <Zap size={16} color="#06b6d4" />
          </div>
          <div style={{ fontSize: '1.6rem', fontWeight: 700, marginTop: '0.25rem', color: '#06b6d4' }}>
            {stats.avgP95 !== 'N/A' ? `${stats.avgP95} ms` : 'N/A'}
          </div>
          <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', marginTop: '0.25rem' }}>
            Across completed benchmark runs
          </div>
        </div>

        <div className="glass-panel" style={{ padding: '1rem' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <span style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>Total Requests Evaluated</span>
            <Activity size={16} color="#f59e0b" />
          </div>
          <div style={{ fontSize: '1.6rem', fontWeight: 700, marginTop: '0.25rem', color: '#f59e0b' }}>
            {formatInt(stats.totalReqs)}
          </div>
          <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', marginTop: '0.25rem' }}>
            Discrete k6 request telemetry
          </div>
        </div>
      </div>

      {/* Main Database Control Panel */}
      <div className="glass-panel" style={{ padding: '1.25rem', marginBottom: '1.5rem' }}>
        
        {/* Toolbar */}
        <div style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', justifyContent: 'space-between', gap: '1rem', marginBottom: '1.25rem' }}>
          
          {/* Search Box */}
          <div style={{ position: 'relative', flex: '1 1 280px', maxWidth: '400px' }}>
            <Search size={16} style={{ position: 'absolute', left: '0.75rem', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-secondary)' }} />
            <input
              type="text"
              placeholder="Search by ID, name, scenario, or mode..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              style={{
                width: '100%',
                padding: '0.55rem 0.75rem 0.55rem 2.25rem',
                background: 'rgba(0, 0, 0, 0.35)',
                border: '1px solid var(--border-subtle)',
                borderRadius: '0.5rem',
                color: '#ffffff',
                fontSize: '0.85rem',
                outline: 'none',
              }}
            />
            {searchTerm && (
              <button
                onClick={() => setSearchTerm('')}
                style={{ position: 'absolute', right: '0.75rem', top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', color: 'var(--text-secondary)', cursor: 'pointer' }}
              >
                <X size={14} />
              </button>
            )}
          </div>

          {/* Export & Action Buttons */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <button
              onClick={handleExportCsv}
              className="btn btn-secondary"
              style={{ padding: '0.55rem 0.9rem', fontSize: '0.8rem', display: 'flex', alignItems: 'center', gap: '0.4rem' }}
              title="Download CSV Evaluation Matrix"
            >
              <FileSpreadsheet size={14} color="#10b981" />
              <span>Export CSV</span>
            </button>

            <button
              onClick={handleExportJson}
              className="btn btn-secondary"
              style={{ padding: '0.55rem 0.9rem', fontSize: '0.8rem', display: 'flex', alignItems: 'center', gap: '0.4rem' }}
              title="Download JSON Run Database"
            >
              <FileText size={14} color="#8b5cf6" />
              <span>Export JSON</span>
            </button>

            {onRefresh && (
              <button
                onClick={onRefresh}
                className="btn btn-secondary"
                style={{ padding: '0.55rem', fontSize: '0.8rem' }}
                title="Refresh Records"
              >
                <RefreshCw size={14} />
              </button>
            )}
          </div>
        </div>

        {/* Filter Pills */}
        <div style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', gap: '0.75rem', marginBottom: '1.25rem', paddingBottom: '1rem', borderBottom: '1px solid var(--border-subtle)' }}>
          
          {/* Category Filter / Mode Badge */}
          {isDemoMode ? (
            <span className="badge badge-amber" style={{ fontSize: '0.78rem', padding: '0.35rem 0.75rem' }}>
              🎮 Demo Sandbox Experiments
            </span>
          ) : (
            <>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.35rem', fontSize: '0.8rem', color: 'var(--text-secondary)' }}>
                <Filter size={14} />
                <span>Category:</span>
              </div>

              {[
                { id: 'ALL', label: 'All Research Records' },
                { id: 'RESEARCH', label: '🔬 Official 30-Run Matrix' },
              ].map((cat) => (
                <button
                  key={cat.id}
                  onClick={() => setCategoryFilter(cat.id)}
                  style={{
                    padding: '0.3rem 0.65rem',
                    fontSize: '0.75rem',
                    borderRadius: '0.375rem',
                    border: categoryFilter === cat.id ? '1px solid #10b981' : '1px solid var(--border-subtle)',
                    background: categoryFilter === cat.id ? 'rgba(16, 185, 129, 0.25)' : 'rgba(255, 255, 255, 0.03)',
                    color: categoryFilter === cat.id ? '#34d399' : 'var(--text-secondary)',
                    cursor: 'pointer',
                    fontWeight: categoryFilter === cat.id ? 700 : 400,
                  }}
                >
                  {cat.label}
                </button>
              ))}
            </>
          )}

          <div style={{ width: '1px', height: '18px', background: 'var(--border-subtle)', margin: '0 0.25rem' }} />

          <div style={{ display: 'flex', alignItems: 'center', gap: '0.35rem', fontSize: '0.8rem', color: 'var(--text-secondary)' }}>
            <span>Scenario:</span>
          </div>

          {['ALL', 'STABLE', 'BURSTY', 'PERIODIC', 'GRADUAL', 'NOISY'].map((sc) => (
            <button
              key={sc}
              onClick={() => setScenarioFilter(sc)}
              style={{
                padding: '0.3rem 0.65rem',
                fontSize: '0.75rem',
                borderRadius: '0.375rem',
                border: scenarioFilter === sc ? '1px solid #8b5cf6' : '1px solid var(--border-subtle)',
                background: scenarioFilter === sc ? 'rgba(139, 92, 246, 0.25)' : 'rgba(255, 255, 255, 0.03)',
                color: scenarioFilter === sc ? '#c4b5fd' : 'var(--text-secondary)',
                cursor: 'pointer',
                fontWeight: scenarioFilter === sc ? 600 : 400,
              }}
            >
              {sc}
            </button>
          ))}

          <div style={{ width: '1px', height: '18px', background: 'var(--border-subtle)', margin: '0 0.25rem' }} />

          <div style={{ display: 'flex', alignItems: 'center', gap: '0.35rem', fontSize: '0.8rem', color: 'var(--text-secondary)' }}>
            <span>Mode:</span>
          </div>

          {[
            { id: 'ALL', label: 'All Modes' },
            { id: 'PREDICTIVE', label: 'Predictive KEDA' },
            { id: 'REACTIVE', label: 'Reactive HPA' },
          ].map((m) => (
            <button
              key={m.id}
              onClick={() => setModeFilter(m.id)}
              style={{
                padding: '0.3rem 0.65rem',
                fontSize: '0.75rem',
                borderRadius: '0.375rem',
                border: modeFilter === m.id ? '1px solid #06b6d4' : '1px solid var(--border-subtle)',
                background: modeFilter === m.id ? 'rgba(6, 182, 212, 0.2)' : 'rgba(255, 255, 255, 0.03)',
                color: modeFilter === m.id ? '#67e8f9' : 'var(--text-secondary)',
                cursor: 'pointer',
                fontWeight: modeFilter === m.id ? 600 : 400,
              }}
            >
              {m.label}
            </button>
          ))}
        </div>

        {/* Database Grid Table */}
        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.8rem' }}>
            <thead>
              <tr style={{ borderBottom: '1px solid var(--border-subtle)', color: 'var(--text-secondary)', textAlign: 'left' }}>
                <th style={{ padding: '0.65rem 0.75rem' }}>Run Identifier</th>
                <th style={{ padding: '0.65rem 0.75rem' }}>Scenario</th>
                <th style={{ padding: '0.65rem 0.75rem' }}>Autoscaling Mode</th>
                <th style={{ padding: '0.65rem 0.75rem' }}>Target RPS</th>
                <th style={{ padding: '0.65rem 0.75rem' }}>P95 Latency</th>
                <th style={{ padding: '0.65rem 0.75rem' }}>P99 Latency</th>
                <th style={{ padding: '0.65rem 0.75rem' }}>SLO Violations (%)</th>
                <th style={{ padding: '0.65rem 0.75rem' }}>Avg CPU</th>
                <th style={{ padding: '0.65rem 0.75rem' }}>Peak Pods</th>
                <th style={{ padding: '0.65rem 0.75rem' }}>D_E2E (t_ready - t_0)</th>
                <th style={{ padding: '0.65rem 0.75rem' }}>Status</th>
                <th style={{ padding: '0.65rem 0.75rem', textAlign: 'center' }}>Audit</th>
              </tr>
            </thead>
            <tbody>
              {items.length === 0 ? (
                <tr>
                  <td colSpan={12} style={{ padding: '3rem 1.5rem', textAlign: 'center', color: 'var(--text-secondary)' }}>
                    <Database size={36} color={isDemoMode ? '#f59e0b' : '#64748b'} style={{ margin: '0 auto 0.75rem', opacity: 0.6 }} />
                    <strong style={{ fontSize: '1rem', color: '#ffffff', display: 'block', marginBottom: '0.35rem' }}>
                      {isDemoMode ? 'No demo experiments available yet.' : 'No research experiments available yet.'}
                    </strong>
                    <p style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', margin: 0 }}>
                      {isDemoMode
                        ? 'Launch a live demonstration workload from the Live Sandbox Telemetry tab to record sandbox experiment metrics here.'
                        : 'Execute research benchmark runs to populate the research history database.'}
                    </p>
                  </td>
                </tr>
              ) : filteredItems.length === 0 ? (
                <tr>
                  <td colSpan={12} style={{ padding: '2rem', textAlign: 'center', color: 'var(--text-secondary)' }}>
                    No experiment records matched the active filters.
                  </td>
                </tr>
              ) : (
                filteredItems.map((item, idx) => {
                  const isDemo = isDemoExperiment(item);
                  const modeStr = item.autoscalingMode || item.mode || '';
                  const isPredictive = modeStr.includes('PREDICTIVE');
                  const r = item.result;

                  // Prioritize exact k6 discrete measurements
                  const p95 = r?.k6P95LatencyMs ?? r?.p95LatencyMs ?? null;
                  const p99 = r?.k6P99LatencyMs ?? r?.p99LatencyMs ?? null;
                  const sloViolations = r?.k6SloViolations ?? r?.sloViolations ?? null;
                  const sloRate = r?.k6SloViolationRate ?? r?.sloViolationRate ?? null;
                  const avgCpu = r?.avgCpuPercent ?? null;
                  const peakReps = r?.peakReplicas ?? null;
                  const dE2e = r?.avgScalingDelaySeconds ?? null;

                  const status = item.status || 'COMPLETED';
                  let statusBadgeClass = 'badge-emerald';
                  if (status === 'RUNNING') statusBadgeClass = 'badge-cyan animate-pulse';
                  else if (status === 'STARTING') statusBadgeClass = 'badge-amber animate-pulse';
                  else if (status === 'FAILED') statusBadgeClass = 'badge-rose';
                  else if (status === 'STOPPED') statusBadgeClass = 'badge-zinc';

                  return (
                    <tr
                      key={item.id || idx}
                      style={{
                        borderBottom: '1px solid rgba(255,255,255,0.03)',
                        transition: 'background 0.2s ease',
                      }}
                      onMouseEnter={(e) => (e.currentTarget.style.background = 'rgba(255,255,255,0.02)')}
                      onMouseLeave={(e) => (e.currentTarget.style.background = 'transparent')}
                    >
                      <td style={{ padding: '0.65rem 0.75rem', fontFamily: 'var(--font-mono)' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.35rem', marginBottom: '2px' }}>
                          <span 
                            className={`badge ${isDemo ? 'badge-amber' : 'badge-emerald'}`} 
                            style={{ fontSize: '0.65rem', padding: '0.1rem 0.35rem' }}
                          >
                            {isDemo ? '🎮 DEMO' : '🔬 RESEARCH'}
                          </span>
                        </div>
                        <div style={{ fontWeight: 600, color: '#ffffff' }}>
                          {item.id ? item.id.substring(0, 16) : `run-${idx}`}
                        </div>
                        <div style={{ fontSize: '0.7rem', color: 'var(--text-secondary)', marginTop: '2px' }}>
                          {item.name || item.scenario}
                        </div>
                      </td>

                      <td style={{ padding: '0.65rem 0.75rem' }}>
                        <span className="badge badge-violet" style={{ fontSize: '0.7rem' }}>
                          {item.scenario || 'N/A'}
                        </span>
                      </td>

                      <td style={{ padding: '0.65rem 0.75rem' }}>
                        <span
                          className={`badge ${isPredictive ? 'badge-cyan' : 'badge-amber'}`}
                          style={{ fontSize: '0.7rem' }}
                        >
                          {isPredictive ? 'PREDICTIVE (KEDA)' : 'REACTIVE (HPA)'}
                        </span>
                      </td>

                      <td style={{ padding: '0.65rem 0.75rem', fontFamily: 'var(--font-mono)' }}>
                        {isMeasured(item.targetRps) ? `${item.targetRps} RPS` : 'N/A'}
                      </td>

                      <td
                        style={{
                          padding: '0.65rem 0.75rem',
                          fontFamily: 'var(--font-mono)',
                          fontWeight: 600,
                          color: !isMeasured(p95) ? 'var(--text-secondary)' : p95 > 200 ? '#f43f5e' : '#34d399',
                        }}
                      >
                        {formatMs(p95)}
                      </td>

                      <td style={{ padding: '0.65rem 0.75rem', fontFamily: 'var(--font-mono)', color: 'var(--text-secondary)' }}>
                        {formatMs(p99)}
                      </td>

                      <td
                        style={{
                          padding: '0.65rem 0.75rem',
                          fontFamily: 'var(--font-mono)',
                          fontWeight: 600,
                          color: !isMeasured(sloViolations) ? 'var(--text-secondary)' : sloViolations > 0 ? '#f43f5e' : '#10b981',
                        }}
                      >
                        {isMeasured(sloViolations)
                          ? `${formatInt(sloViolations)} (${isMeasured(sloRate) ? (sloRate * 100).toFixed(2) + '%' : 'N/A'})`
                          : 'N/A'}
                      </td>

                      <td style={{ padding: '0.65rem 0.75rem', fontFamily: 'var(--font-mono)' }}>
                        {formatPercent(avgCpu)}
                      </td>

                      <td style={{ padding: '0.65rem 0.75rem', fontFamily: 'var(--font-mono)', color: '#06b6d4' }}>
                        {isMeasured(peakReps) ? `${peakReps} Pods` : 'N/A'}
                      </td>

                      <td style={{ padding: '0.65rem 0.75rem', fontFamily: 'var(--font-mono)', color: isPredictive ? '#34d399' : '#f59e0b' }}>
                        {formatSeconds(dE2e)}
                      </td>

                      <td style={{ padding: '0.65rem 0.75rem' }}>
                        <span className={`badge ${statusBadgeClass}`} style={{ fontSize: '0.7rem' }}>
                          {status}
                        </span>
                      </td>

                      <td style={{ padding: '0.65rem 0.75rem', textAlign: 'center' }}>
                        <button
                          onClick={() => setSelectedExp(item)}
                          className="btn btn-secondary"
                          style={{ padding: '0.3rem 0.6rem', fontSize: '0.75rem', display: 'inline-flex', alignItems: 'center', gap: '0.25rem' }}
                          title="Inspect Run Audit Details"
                        >
                          <Eye size={12} />
                          <span>Audit</span>
                        </button>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Audit Trail Drill-Down Modal */}
      {selectedExp && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            background: 'rgba(0, 0, 0, 0.75)',
            backdropFilter: 'blur(8px)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: '1.5rem',
            zIndex: 1000,
          }}
          onClick={() => setSelectedExp(null)}
        >
          <div
            className="glass-panel"
            style={{
              width: '100%',
              maxWidth: '850px',
              maxHeight: '90vh',
              overflowY: 'auto',
              padding: '1.75rem',
              borderRadius: '1rem',
              border: '1px solid rgba(255, 255, 255, 0.15)',
              boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.7)',
            }}
            onClick={(e) => e.stopPropagation()}
          >
            {/* Modal Header */}
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1.5rem', borderBottom: '1px solid var(--border-subtle)', paddingBottom: '1rem' }}>
              <div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                  <Database size={20} color="#8b5cf6" />
                  <h2 style={{ fontSize: '1.15rem', fontWeight: 700, color: '#ffffff' }}>
                    Audit Trail: {selectedExp.id}
                  </h2>
                </div>
                <div style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', marginTop: '0.25rem' }}>
                  {selectedExp.name} &bull; Recorded: {selectedExp.startTime ? new Date(selectedExp.startTime).toUTCString() : 'N/A'}
                </div>
              </div>

              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <button
                  onClick={() => handleCopyJson(selectedExp)}
                  className="btn btn-secondary"
                  style={{ padding: '0.4rem 0.75rem', fontSize: '0.75rem', display: 'flex', alignItems: 'center', gap: '0.35rem' }}
                >
                  {copiedJson ? <Check size={14} color="#10b981" /> : <Copy size={14} />}
                  <span>{copiedJson ? 'Copied' : 'Copy JSON'}</span>
                </button>

                <button
                  onClick={() => setSelectedExp(null)}
                  style={{ background: 'none', border: 'none', color: 'var(--text-secondary)', cursor: 'pointer', padding: '0.25rem' }}
                >
                  <X size={20} />
                </button>
              </div>
            </div>

            {/* Config & Parameters Row */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '0.75rem', marginBottom: '1.5rem' }}>
              <div style={{ background: 'rgba(0,0,0,0.3)', padding: '0.75rem', borderRadius: '0.5rem', border: '1px solid var(--border-subtle)' }}>
                <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>Workload Scenario</div>
                <div style={{ fontSize: '0.9rem', fontWeight: 600, color: '#c4b5fd', marginTop: '2px' }}>
                  {selectedExp.scenario || 'N/A'}
                </div>
              </div>

              <div style={{ background: 'rgba(0,0,0,0.3)', padding: '0.75rem', borderRadius: '0.5rem', border: '1px solid var(--border-subtle)' }}>
                <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>Autoscaling Mode</div>
                <div style={{ fontSize: '0.9rem', fontWeight: 600, color: selectedExp.autoscalingMode?.includes('PREDICTIVE') ? '#67e8f9' : '#fcd34d', marginTop: '2px' }}>
                  {selectedExp.autoscalingMode || 'N/A'}
                </div>
              </div>

              <div style={{ background: 'rgba(0,0,0,0.3)', padding: '0.75rem', borderRadius: '0.5rem', border: '1px solid var(--border-subtle)' }}>
                <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>Traffic Load</div>
                <div style={{ fontSize: '0.9rem', fontWeight: 600, color: '#ffffff', marginTop: '2px', fontFamily: 'var(--font-mono)' }}>
                  {isMeasured(selectedExp.targetRps) ? `${selectedExp.targetRps} RPS` : 'N/A'} &bull; {isMeasured(selectedExp.durationSeconds) ? `${selectedExp.durationSeconds}s` : 'N/A'}
                </div>
              </div>

              <div style={{ background: 'rgba(0,0,0,0.3)', padding: '0.75rem', borderRadius: '0.5rem', border: '1px solid var(--border-subtle)' }}>
                <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>SLO Latency Target</div>
                <div style={{ fontSize: '0.9rem', fontWeight: 600, color: '#ffffff', marginTop: '2px', fontFamily: 'var(--font-mono)' }}>
                  {isMeasured(selectedExp.sloLatencyMs) ? `${selectedExp.sloLatencyMs} ms` : '200 ms'}
                </div>
              </div>
            </div>

            {/* Section 1: Discrete k6 Request-Level Telemetry */}
            <h3 style={{ fontSize: '0.85rem', marginBottom: '0.6rem', color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
              1. Discrete k6 Request Telemetry (Primary Ground Truth)
            </h3>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))', gap: '0.75rem', marginBottom: '1.25rem' }}>
              <div style={{ background: 'rgba(255,255,255,0.02)', padding: '0.75rem', borderRadius: '0.5rem', border: '1px solid var(--border-subtle)' }}>
                <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>Total Requests (k6)</div>
                <div style={{ fontSize: '1.2rem', fontWeight: 700, color: '#ffffff', marginTop: '2px', fontFamily: 'var(--font-mono)' }}>
                  {formatInt(selectedExp.result?.k6TotalRequests ?? selectedExp.result?.totalRequests)}
                </div>
              </div>

              <div style={{ background: 'rgba(255,255,255,0.02)', padding: '0.75rem', borderRadius: '0.5rem', border: '1px solid var(--border-subtle)' }}>
                <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>P95 Latency (k6)</div>
                <div style={{ fontSize: '1.2rem', fontWeight: 700, color: (selectedExp.result?.k6P95LatencyMs ?? selectedExp.result?.p95LatencyMs) > 200 ? '#f43f5e' : '#34d399', marginTop: '2px', fontFamily: 'var(--font-mono)' }}>
                  {formatMs(selectedExp.result?.k6P95LatencyMs ?? selectedExp.result?.p95LatencyMs)}
                </div>
              </div>

              <div style={{ background: 'rgba(255,255,255,0.02)', padding: '0.75rem', borderRadius: '0.5rem', border: '1px solid var(--border-subtle)' }}>
                <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>P99 Latency (k6)</div>
                <div style={{ fontSize: '1.2rem', fontWeight: 700, color: '#ffffff', marginTop: '2px', fontFamily: 'var(--font-mono)' }}>
                  {formatMs(selectedExp.result?.k6P99LatencyMs ?? selectedExp.result?.p99LatencyMs)}
                </div>
              </div>

              <div style={{ background: 'rgba(255,255,255,0.02)', padding: '0.75rem', borderRadius: '0.5rem', border: '1px solid var(--border-subtle)' }}>
                <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>SLO Violations (&gt;200ms)</div>
                <div style={{ fontSize: '1.2rem', fontWeight: 700, color: (selectedExp.result?.k6SloViolations ?? selectedExp.result?.sloViolations) > 0 ? '#f43f5e' : '#10b981', marginTop: '2px', fontFamily: 'var(--font-mono)' }}>
                  {isMeasured(selectedExp.result?.k6SloViolations ?? selectedExp.result?.sloViolations)
                    ? `${formatInt(selectedExp.result?.k6SloViolations ?? selectedExp.result?.sloViolations)} (${formatPercent((selectedExp.result?.k6SloViolationRate ?? selectedExp.result?.sloViolationRate) * 100, 2)})`
                    : 'N/A'}
                </div>
              </div>
            </div>

            {/* Section 2: Scaling Delays (Verified D_E2E and D_provision) */}
            <h3 style={{ fontSize: '0.85rem', marginBottom: '0.6rem', color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
              2. Scaling Delays & Resource Dynamics
            </h3>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '0.75rem', marginBottom: '1.25rem' }}>
              <div style={{ background: 'rgba(255,255,255,0.02)', padding: '0.75rem', borderRadius: '0.5rem', border: '1px solid var(--border-subtle)' }}>
                <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>D_E2E Response Lag (t_ready - t_0)</div>
                <div style={{ fontSize: '1.2rem', fontWeight: 700, color: '#f59e0b', marginTop: '2px', fontFamily: 'var(--font-mono)' }}>
                  {formatSeconds(selectedExp.result?.avgScalingDelaySeconds)}
                </div>
              </div>

              {selectedExp.result?.scalingEvents && selectedExp.result.scalingEvents.length > 0 && (
                <div style={{ background: 'rgba(255,255,255,0.02)', padding: '0.75rem', borderRadius: '0.5rem', border: '1px solid var(--border-subtle)' }}>
                  <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>D_provision (t_ready - t_creation)</div>
                  <div style={{ fontSize: '1.2rem', fontWeight: 700, color: '#06b6d4', marginTop: '2px', fontFamily: 'var(--font-mono)' }}>
                    {(() => {
                      const se = selectedExp.result.scalingEvents[0];
                      if (se.podReadyTime && se.podCreationTime) {
                        const dProv = (new Date(se.podReadyTime) - new Date(se.podCreationTime)) / 1000;
                        return formatSeconds(dProv);
                      }
                      return 'N/A';
                    })()}
                  </div>
                </div>
              )}

              <div style={{ background: 'rgba(255,255,255,0.02)', padding: '0.75rem', borderRadius: '0.5rem', border: '1px solid var(--border-subtle)' }}>
                <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>Avg / Peak CPU</div>
                <div style={{ fontSize: '1.1rem', fontWeight: 600, color: '#ffffff', marginTop: '4px', fontFamily: 'var(--font-mono)' }}>
                  {formatPercent(selectedExp.result?.avgCpuPercent)} / {formatPercent(selectedExp.result?.peakCpuPercent)}
                </div>
              </div>

              <div style={{ background: 'rgba(255,255,255,0.02)', padding: '0.75rem', borderRadius: '0.5rem', border: '1px solid var(--border-subtle)' }}>
                <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>Peak Pod Replicas</div>
                <div style={{ fontSize: '1.2rem', fontWeight: 700, color: '#06b6d4', marginTop: '2px', fontFamily: 'var(--font-mono)' }}>
                  {isMeasured(selectedExp.result?.peakReplicas) ? `${selectedExp.result.peakReplicas} Pods` : 'N/A'}
                </div>
              </div>
            </div>

            {/* Section 3: Forecast Accuracy (Out-of-sample) */}
            {selectedExp.autoscalingMode?.includes('PREDICTIVE') && (
              <div style={{ background: 'rgba(6, 182, 212, 0.05)', border: '1px solid rgba(6, 182, 212, 0.2)', borderRadius: '0.5rem', padding: '1rem', marginBottom: '1.25rem' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.5rem' }}>
                  <Zap size={16} color="#06b6d4" />
                  <span style={{ fontSize: '0.85rem', fontWeight: 600, color: '#67e8f9' }}>
                    Prophet Out-of-Sample Forecast Accuracy (60s Horizon)
                  </span>
                </div>
                <div style={{ display: 'flex', gap: '2rem', fontSize: '0.85rem', flexWrap: 'wrap' }}>
                  <div>
                    <span style={{ color: 'var(--text-secondary)' }}>Mean Absolute Error (MAE): </span>
                    <span style={{ fontFamily: 'var(--font-mono)', fontWeight: 600, color: '#ffffff' }}>
                      {formatMaeRmse(selectedExp.result?.mae)}
                    </span>
                  </div>
                  <div>
                    <span style={{ color: 'var(--text-secondary)' }}>Root Mean Squared Error (RMSE): </span>
                    <span style={{ fontFamily: 'var(--font-mono)', fontWeight: 600, color: '#ffffff' }}>
                      {formatMaeRmse(selectedExp.result?.rmse)}
                    </span>
                  </div>
                </div>
              </div>
            )}

            {/* Section 4: Raw JSON Snapshot View */}
            <details style={{ background: 'rgba(0,0,0,0.5)', padding: '0.75rem', borderRadius: '0.5rem', border: '1px solid var(--border-subtle)' }}>
              <summary style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', cursor: 'pointer' }}>
                View Raw PostgreSQL Entity Snapshot
              </summary>
              <pre style={{ fontSize: '0.75rem', color: '#38bdf8', overflowX: 'auto', marginTop: '0.5rem', maxHeight: '200px' }}>
                {JSON.stringify(selectedExp, null, 2)}
              </pre>
            </details>
          </div>
        </div>
      )}
    </div>
  );
}
