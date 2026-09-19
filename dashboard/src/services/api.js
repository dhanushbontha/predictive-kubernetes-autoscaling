import axios from 'axios';

// Base axios instance
const api = axios.create({
  baseURL: '',
  timeout: 5000,
  headers: {
    'Content-Type': 'application/json',
  },
});

export const checkHealth = async () => {
  try {
    const res = await api.get('/actuator/health');
    return res.data;
  } catch (err) {
    return { status: 'DOWN', error: err.message };
  }
};

export const getActiveExperiment = async () => {
  try {
    const res = await api.get('/api/experiments/active');
    return res.data;
  } catch (err) {
    if (err.response && err.response.status === 404) {
      return null;
    }
    throw err;
  }
};

export const startExperiment = async (payload) => {
  const res = await api.post('/api/experiments/start', payload);
  return res.data;
};

export const stopExperiment = async () => {
  const res = await api.post('/api/experiments/stop');
  return res.data;
};

export const getLiveSeries = async (metric, durationSeconds = 300) => {
  try {
    const res = await api.get(`/api/dashboard/live/series`, {
      params: { metric, durationSeconds },
    });
    return res.data;
  } catch (err) {
    console.warn(`Failed to fetch live series for ${metric}:`, err.message);
    return [];
  }
};

export const getLiveTelemetry = async () => {
  try {
    const res = await api.get('/api/dashboard/live');
    return res.data;
  } catch (err) {
    console.warn('Failed to fetch live telemetry:', err.message);
    return null;
  }
};

export const getExperimentHistory = async () => {
  try {
    const res = await api.get('/api/experiments');
    return res.data || [];
  } catch (err) {
    console.warn('Failed to fetch experiment history:', err.message);
    return [];
  }
};

export default api;
