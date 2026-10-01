/**
 * Precise, traceable metric formatters for research dashboard.
 * 
 * Rules:
 * 1. A genuine measured 0 must display as 0 (e.g., 0, 0.0, 0.00, 0%).
 * 2. Unmeasured or missing metrics (null/undefined/NaN) must display as "N/A".
 * 3. Never replace missing data with 0 or fallback approximations.
 */

export function isMeasured(val) {
  return val !== null && val !== undefined && !Number.isNaN(Number(val));
}

export function formatNum(val, decimals = 1, suffix = '') {
  if (!isMeasured(val)) return 'N/A';
  const num = Number(val);
  const formatted = decimals >= 0 ? num.toFixed(decimals) : num.toString();
  return suffix ? `${formatted} ${suffix}` : formatted;
}

export function formatInt(val, suffix = '') {
  if (!isMeasured(val)) return 'N/A';
  const num = Math.round(Number(val));
  const formatted = num.toLocaleString();
  return suffix ? `${formatted} ${suffix}` : formatted;
}

export function formatMs(val, decimals = 1) {
  if (!isMeasured(val)) return 'N/A';
  return `${Number(val).toFixed(decimals)} ms`;
}

export function formatPercent(val, decimals = 1) {
  if (!isMeasured(val)) return 'N/A';
  return `${Number(val).toFixed(decimals)}%`;
}

export function formatRps(val, decimals = 1) {
  if (!isMeasured(val)) return 'N/A';
  return `${Number(val).toFixed(decimals)} RPS`;
}

export function formatSeconds(val, decimals = 1) {
  if (!isMeasured(val)) return 'N/A';
  return `${Number(val).toFixed(decimals)} s`;
}

export function formatMaeRmse(val, decimals = 2) {
  if (!isMeasured(val)) return 'N/A';
  return `${Number(val).toFixed(decimals)} RPS`;
}
