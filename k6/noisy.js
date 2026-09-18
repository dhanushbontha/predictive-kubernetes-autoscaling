import http from 'k6/http';
import { check, sleep } from 'k6';

const TARGET_URL = __ENV.TARGET_URL || 'http://workload-service:8084';
const BASE_RPS = parseInt(__ENV.TARGET_RPS || '50', 10);

export const options = {
    scenarios: {
        noisy_workload: {
            executor: 'ramping-arrival-rate',
            startRate: BASE_RPS,
            timeUnit: '1s',
            preAllocatedVUs: Math.max(10, Math.floor(BASE_RPS * 1.5)),
            maxVUs: Math.max(50, BASE_RPS * 4),
            stages: [
                { target: Math.floor(BASE_RPS * 1.3), duration: '20s' },
                { target: Math.floor(BASE_RPS * 0.7), duration: '20s' },
                { target: Math.floor(BASE_RPS * 1.5), duration: '15s' },
                { target: Math.floor(BASE_RPS * 0.6), duration: '25s' },
                { target: Math.floor(BASE_RPS * 1.4), duration: '20s' },
                { target: Math.floor(BASE_RPS * 0.8), duration: '20s' },
                { target: Math.floor(BASE_RPS * 1.6), duration: '15s' },
                { target: Math.floor(BASE_RPS * 0.5), duration: '25s' },
                { target: Math.floor(BASE_RPS * 1.2), duration: '20s' },
                { target: BASE_RPS, duration: '20s' },
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
        tags: { scenario: 'noisy' },
        timeout: '10s',
    });

    check(res, {
        'status is 200': (r) => r.status === 200,
        'response contains expected text': (r) => r.body && r.body.includes('Workload processed'),
    });
}
