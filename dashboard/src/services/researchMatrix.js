/**
 * Official Locked Research Protocol & 30-Run Experiment Matrix
 * Defines the immutable parameter constraints and exact 30-run execution order.
 */

export const LOCKED_RESEARCH_CONFIG = {
  totalRuns: 30,
  replications: 3,
  evaluationDurationSeconds: 180,
  sloLatencyMs: 200,
  forecastHorizonSeconds: 60,
  forecastFrequencySeconds: 5,
  keda: {
    thresholdRps: 20,
    minReplicas: 1,
    maxReplicas: 5,
    pollingIntervalSeconds: 5,
    cooldownPeriodSeconds: 30,
  },
  hpa: {
    cpuTargetPercent: 50,
    minReplicas: 1,
    maxReplicas: 5,
    scaleUpStabilizationSeconds: 0,
    scaleDownStabilizationSeconds: 60,
    scaleUpPolicy: 'max(+100%, +2 pods / 15s)',
  },
  workloads: {
    STABLE: {
      name: 'STABLE',
      label: 'Stable Uniform Load',
      targetRps: 30,
      description: '30 RPS constant load',
      color: '#8b5cf6',
    },
    PERIODIC: {
      name: 'PERIODIC',
      label: 'Periodic Sinusoidal',
      targetRps: 60,
      description: '60 RPS peak, 12 RPS base',
      color: '#06b6d4',
    },
    GRADUAL: {
      name: 'GRADUAL',
      label: 'Gradual Ramp Up/Down',
      targetRps: 80,
      description: '80 RPS maximum step/ramp',
      color: '#10b981',
    },
    BURSTY: {
      name: 'BURSTY',
      label: 'Bursty Traffic Surge',
      targetRps: 60,
      description: '60 RPS spike, 6 RPS base',
      color: '#f43f5e',
    },
    NOISY: {
      name: 'NOISY',
      label: 'Noisy Stochastic Jitter',
      targetRps: 50,
      description: '50 RPS base, ±50% variance',
      color: '#f59e0b',
    },
  },
};

/**
 * Exact 30-run sequence locked for the research matrix.
 */
export const RESEARCH_30_RUNS = [
  // Replication 1 (Runs 01 - 10)
  { runNumber: 1, replication: 1, scenario: 'STABLE', controller: 'PREDICTIVE_PROPHET_KEDA', targetRps: 30, loadDesc: '30 RPS constant' },
  { runNumber: 2, replication: 1, scenario: 'STABLE', controller: 'REACTIVE_HPA', targetRps: 30, loadDesc: '30 RPS constant' },
  { runNumber: 3, replication: 1, scenario: 'PERIODIC', controller: 'PREDICTIVE_PROPHET_KEDA', targetRps: 60, loadDesc: '60 RPS peak, 12 RPS base' },
  { runNumber: 4, replication: 1, scenario: 'PERIODIC', controller: 'REACTIVE_HPA', targetRps: 60, loadDesc: '60 RPS peak, 12 RPS base' },
  { runNumber: 5, replication: 1, scenario: 'GRADUAL', controller: 'PREDICTIVE_PROPHET_KEDA', targetRps: 80, loadDesc: '80 RPS maximum ramp' },
  { runNumber: 6, replication: 1, scenario: 'GRADUAL', controller: 'REACTIVE_HPA', targetRps: 80, loadDesc: '80 RPS maximum ramp' },
  { runNumber: 7, replication: 1, scenario: 'BURSTY', controller: 'PREDICTIVE_PROPHET_KEDA', targetRps: 60, loadDesc: '60 RPS spike, 6 RPS base' },
  { runNumber: 8, replication: 1, scenario: 'BURSTY', controller: 'REACTIVE_HPA', targetRps: 60, loadDesc: '60 RPS spike, 6 RPS base' },
  { runNumber: 9, replication: 1, scenario: 'NOISY', controller: 'PREDICTIVE_PROPHET_KEDA', targetRps: 50, loadDesc: '50 RPS base, ±50% variance' },
  { runNumber: 10, replication: 1, scenario: 'NOISY', controller: 'REACTIVE_HPA', targetRps: 50, loadDesc: '50 RPS base, ±50% variance' },

  // Replication 2 (Runs 11 - 20)
  { runNumber: 11, replication: 2, scenario: 'BURSTY', controller: 'REACTIVE_HPA', targetRps: 60, loadDesc: '60 RPS spike, 6 RPS base' },
  { runNumber: 12, replication: 2, scenario: 'BURSTY', controller: 'PREDICTIVE_PROPHET_KEDA', targetRps: 60, loadDesc: '60 RPS spike, 6 RPS base' },
  { runNumber: 13, replication: 2, scenario: 'NOISY', controller: 'REACTIVE_HPA', targetRps: 50, loadDesc: '50 RPS base, ±50% variance' },
  { runNumber: 14, replication: 2, scenario: 'NOISY', controller: 'PREDICTIVE_PROPHET_KEDA', targetRps: 50, loadDesc: '50 RPS base, ±50% variance' },
  { runNumber: 15, replication: 2, scenario: 'STABLE', controller: 'REACTIVE_HPA', targetRps: 30, loadDesc: '30 RPS constant' },
  { runNumber: 16, replication: 2, scenario: 'STABLE', controller: 'PREDICTIVE_PROPHET_KEDA', targetRps: 30, loadDesc: '30 RPS constant' },
  { runNumber: 17, replication: 2, scenario: 'PERIODIC', controller: 'REACTIVE_HPA', targetRps: 60, loadDesc: '60 RPS peak, 12 RPS base' },
  { runNumber: 18, replication: 2, scenario: 'PERIODIC', controller: 'PREDICTIVE_PROPHET_KEDA', targetRps: 60, loadDesc: '60 RPS peak, 12 RPS base' },
  { runNumber: 19, replication: 2, scenario: 'GRADUAL', controller: 'REACTIVE_HPA', targetRps: 80, loadDesc: '80 RPS maximum ramp' },
  { runNumber: 20, replication: 2, scenario: 'GRADUAL', controller: 'PREDICTIVE_PROPHET_KEDA', targetRps: 80, loadDesc: '80 RPS maximum ramp' },

  // Replication 3 (Runs 21 - 30)
  { runNumber: 21, replication: 3, scenario: 'GRADUAL', controller: 'PREDICTIVE_PROPHET_KEDA', targetRps: 80, loadDesc: '80 RPS maximum ramp' },
  { runNumber: 22, replication: 3, scenario: 'GRADUAL', controller: 'REACTIVE_HPA', targetRps: 80, loadDesc: '80 RPS maximum ramp' },
  { runNumber: 23, replication: 3, scenario: 'BURSTY', controller: 'PREDICTIVE_PROPHET_KEDA', targetRps: 60, loadDesc: '60 RPS spike, 6 RPS base' },
  { runNumber: 24, replication: 3, scenario: 'BURSTY', controller: 'REACTIVE_HPA', targetRps: 60, loadDesc: '60 RPS spike, 6 RPS base' },
  { runNumber: 25, replication: 3, scenario: 'NOISY', controller: 'PREDICTIVE_PROPHET_KEDA', targetRps: 50, loadDesc: '50 RPS base, ±50% variance' },
  { runNumber: 26, replication: 3, scenario: 'NOISY', controller: 'REACTIVE_HPA', targetRps: 50, loadDesc: '50 RPS base, ±50% variance' },
  { runNumber: 27, replication: 3, scenario: 'STABLE', controller: 'PREDICTIVE_PROPHET_KEDA', targetRps: 30, loadDesc: '30 RPS constant' },
  { runNumber: 28, replication: 3, scenario: 'STABLE', controller: 'REACTIVE_HPA', targetRps: 30, loadDesc: '30 RPS constant' },
  { runNumber: 29, replication: 3, scenario: 'PERIODIC', controller: 'PREDICTIVE_PROPHET_KEDA', targetRps: 60, loadDesc: '60 RPS peak, 12 RPS base' },
  { runNumber: 30, replication: 3, scenario: 'PERIODIC', controller: 'REACTIVE_HPA', targetRps: 60, loadDesc: '60 RPS peak, 12 RPS base' },
];

/**
 * Checks if an experiment is an official Research run vs a Demo run.
 */
export function isDemoExperiment(exp) {
  if (!exp) return false;
  const name = (exp.name || '').toUpperCase();
  if (name.startsWith('DEMO_') || name.startsWith('DEMO-') || name.includes('DEMO')) {
    return true;
  }
  // If explicitly named with official Run_XX pattern, it's research
  if (name.startsWith('RUN_') || name.startsWith('RUN-') || name.startsWith('RUN0') || name.startsWith('RUN1') || name.startsWith('RUN2') || name.startsWith('RUN3')) {
    return false;
  }
  // Historical pilot smoke tests
  if (name.includes('SMOKE') || name.includes('VALIDATION')) {
    return true;
  }
  return false;
}

/**
 * Matches history against the official 30-run matrix to determine campaign progress.
 */
export function evaluateResearchCampaign(history = []) {
  const completedRunMap = {};
  
  if (Array.isArray(history)) {
    history.forEach((exp) => {
      if (exp && exp.status === 'COMPLETED' && !isDemoExperiment(exp)) {
        // Try extracting run index from experiment name (e.g. Run_01_...)
        const match = (exp.name || '').match(/Run[_-](\d+)/i);
        if (match) {
          const runNum = parseInt(match[1], 10);
          if (runNum >= 1 && runNum <= 30) {
            completedRunMap[runNum] = exp;
          }
        }
      }
    });
  }

  // Find next uncompleted run
  let nextRun = null;
  for (let i = 1; i <= 30; i++) {
    if (!completedRunMap[i]) {
      nextRun = RESEARCH_30_RUNS[i - 1];
      break;
    }
  }

  const completedCount = Object.keys(completedRunMap).length;
  const isCampaignComplete = completedCount >= 30;

  return {
    totalRuns: 30,
    completedCount,
    remainingCount: 30 - completedCount,
    isCampaignComplete,
    nextRun: nextRun || RESEARCH_30_RUNS[29],
    completedRunMap,
  };
}
