import http from 'k6/http';
import { check, sleep } from 'k6';

// Configurable via environment variables with calibrated defaults
const TARGET_URL = __ENV.TARGET_URL || 'http://workload-service:8084';
const TARGET_RPS = parseInt(__ENV.TARGET_RPS || '30', 10);
const DURATION = __ENV.DURATION || '5m';

export const options = {
    scenarios: {
        stable_workload: {
            executor: 'constant-arrival-rate',
            rate: TARGET_RPS,
            timeUnit: '1s',
            duration: DURATION,
            preAllocatedVUs: Math.max(10, Math.floor(TARGET_RPS * 1.5)),
            maxVUs: Math.max(50, TARGET_RPS * 4),
        },
    },
    thresholds: {
        http_req_failed: ['rate<0.05'], // Under 5% error rate allowed
    },
};

export default function () {
    const url = `${TARGET_URL}/api/workload`;
    const res = http.get(url, {
        tags: { scenario: 'stable' },
        timeout: '10s',
    });

    check(res, {
        'status is 200': (r) => r.status === 200,
        'response contains expected text': (r) => r.body && r.body.includes('Workload processed'),
    });
}
