import http from 'k6/http';
import { check, sleep } from 'k6';

const TARGET_URL = __ENV.TARGET_URL || 'http://workload-service:8084';
const PEAK_RPS = parseInt(__ENV.TARGET_RPS || '60', 10);
const BASE_RPS = Math.max(5, Math.floor(PEAK_RPS * 0.2));

export const options = {
    scenarios: {
        periodic_workload: {
            executor: 'ramping-arrival-rate',
            startRate: BASE_RPS,
            timeUnit: '1s',
            preAllocatedVUs: Math.max(10, Math.floor(PEAK_RPS * 1.5)),
            maxVUs: Math.max(50, PEAK_RPS * 4),
            stages: [
                // Cycle 1
                { target: PEAK_RPS, duration: '1m' },
                { target: BASE_RPS, duration: '1m' },
                // Cycle 2
                { target: PEAK_RPS, duration: '1m' },
                { target: BASE_RPS, duration: '1m' },
                // Cycle 3
                { target: PEAK_RPS, duration: '1m' },
                { target: BASE_RPS, duration: '1m' },
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
        tags: { scenario: 'periodic' },
        timeout: '10s',
    });

    check(res, {
        'status is 200': (r) => r.status === 200,
        'response contains expected text': (r) => r.body && r.body.includes('Workload processed'),
    });
}
