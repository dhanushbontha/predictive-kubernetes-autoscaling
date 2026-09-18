import http from 'k6/http';
import { check, sleep } from 'k6';

const TARGET_URL = __ENV.TARGET_URL || 'http://workload-service:8084';
const SPIKE_RPS = parseInt(__ENV.TARGET_RPS || '100', 10);
const BASELINE_RPS = Math.max(5, Math.floor(SPIKE_RPS * 0.1));

export const options = {
    scenarios: {
        bursty_workload: {
            executor: 'ramping-arrival-rate',
            startRate: BASELINE_RPS,
            timeUnit: '1s',
            preAllocatedVUs: Math.max(10, Math.floor(SPIKE_RPS * 1.5)),
            maxVUs: Math.max(50, SPIKE_RPS * 4),
            stages: [
                { target: BASELINE_RPS, duration: '1m' }, // Baseline
                { target: SPIKE_RPS, duration: '10s' },   // Immediate sharp spike
                { target: SPIKE_RPS, duration: '1m' },    // Sustained spike
                { target: BASELINE_RPS, duration: '10s' }, // Immediate drop
                { target: BASELINE_RPS, duration: '1m' }, // Baseline recovery
                { target: SPIKE_RPS, duration: '10s' },   // Second sharp spike
                { target: SPIKE_RPS, duration: '1m' },
                { target: BASELINE_RPS, duration: '10s' },
                { target: BASELINE_RPS, duration: '1m' },
            ],
        },
    },
    thresholds: {
        http_req_failed: ['rate<0.05'],
    },
};

export default function () {
    const url = `${TARGET_URL}/api/workload`;
    const res = http.get(url, {
        tags: { scenario: 'bursty' },
        timeout: '10s',
    });

    check(res, {
        'status is 200': (r) => r.status === 200,
        'response contains expected text': (r) => r.body && r.body.includes('Workload processed'),
    });
}
