import http from 'k6/http';
import { check, sleep } from 'k6';

const TARGET_URL = __ENV.TARGET_URL || 'http://workload-service:8084';
const MAX_RPS = parseInt(__ENV.TARGET_RPS || '80', 10);

export const options = {
    scenarios: {
        gradual_workload: {
            executor: 'ramping-arrival-rate',
            startRate: Math.floor(MAX_RPS * 0.1),
            timeUnit: '1s',
            preAllocatedVUs: Math.max(10, Math.floor(MAX_RPS * 1.5)),
            maxVUs: Math.max(50, MAX_RPS * 4),
            stages: [
                { target: Math.floor(MAX_RPS * 0.25), duration: '1m' }, // Step 1: 25%
                { target: Math.floor(MAX_RPS * 0.25), duration: '30s' },
                { target: Math.floor(MAX_RPS * 0.50), duration: '1m' }, // Step 2: 50%
                { target: Math.floor(MAX_RPS * 0.50), duration: '30s' },
                { target: Math.floor(MAX_RPS * 0.75), duration: '1m' }, // Step 3: 75%
                { target: Math.floor(MAX_RPS * 0.75), duration: '30s' },
                { target: MAX_RPS, duration: '1m' },                    // Step 4: 100%
                { target: MAX_RPS, duration: '1m' },
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
        tags: { scenario: 'gradual' },
        timeout: '10s',
    });

    check(res, {
        'status is 200': (r) => r.status === 200,
        'response contains expected text': (r) => r.body && r.body.includes('Workload processed'),
    });
}
