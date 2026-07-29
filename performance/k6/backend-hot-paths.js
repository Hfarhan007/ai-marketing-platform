import http from 'k6/http';
import { check } from 'k6';
import { Trend, Rate } from 'k6/metrics';

const BASE_URL = __ENV.BASE_URL || 'http://localhost:3001/api/v1';
const WORKSPACE_ID = __ENV.WORKSPACE_ID || '';
const TOKEN = __ENV.ACCESS_TOKEN || '';
const duration = __ENV.PERF_DURATION || '2m';
const vus = Number(__ENV.PERF_VUS || 10);
const headers = {
  authorization: `Bearer ${TOKEN}`,
  'x-workspace-id': WORKSPACE_ID,
  'content-type': 'application/json',
};
const errors = new Rate('backend_error_rate');
const trends = Object.fromEntries(
  [
    'contact_search',
    'deal_pipeline',
    'inbox_pagination',
    'workflow_trigger',
    'campaign_schedule',
    'appointment_conflict',
    'ai_usage',
    'rag_retrieval',
  ].map((name) => [name, new Trend(`${name}_latency`, true)]),
);

export const options = {
  scenarios: Object.fromEntries(
    Object.keys(trends).map((name) => [
      name,
      { executor: 'constant-vus', exec: name, vus, duration, gracefulStop: '10s' },
    ]),
  ),
  thresholds: {
    http_req_duration: ['p(50)<100', 'p(95)<300', 'p(99)<750'],
    backend_error_rate: ['rate<0.01'],
    contact_search_latency: ['p(95)<250'],
    deal_pipeline_latency: ['p(95)<250'],
    inbox_pagination_latency: ['p(95)<200'],
    workflow_trigger_latency: ['p(95)<300'],
    campaign_schedule_latency: ['p(95)<350'],
    appointment_conflict_latency: ['p(95)<200'],
    ai_usage_latency: ['p(95)<200'],
    rag_retrieval_latency: ['p(95)<500'],
  },
};

function run(name, method, path, body) {
  const response = http.request(method, `${BASE_URL}${path}`, body ? JSON.stringify(body) : null, {
    headers,
    tags: { hot_path: name },
    timeout: '10s',
  });
  trends[name].add(response.timings.duration);
  const ok = check(response, { [`${name}: status below 500`]: (value) => value.status < 500 });
  errors.add(!ok);
}

export function contact_search() {
  run('contact_search', 'GET', '/contacts?search=performance&limit=50');
}
export function deal_pipeline() {
  run('deal_pipeline', 'GET', `/deals?pipelineId=${__ENV.PIPELINE_ID || ''}&limit=50`);
}
export function inbox_pagination() {
  run('inbox_pagination', 'GET', `/inbox/conversations/${__ENV.CONVERSATION_ID || ''}/messages?limit=50`);
}
export function workflow_trigger() {
  run('workflow_trigger', 'POST', `/workflows/${__ENV.WORKFLOW_ID || ''}/trigger`, {
    idempotencyKey: `k6-${__VU}-${__ITER}`,
    input: {},
  });
}
export function campaign_schedule() {
  run('campaign_schedule', 'POST', `/campaigns/${__ENV.CAMPAIGN_ID || ''}/schedule`, {
    scheduledAt: new Date(Date.now() + 3_600_000).toISOString(),
    idempotencyKey: `k6-${__VU}-${__ITER}`,
  });
}
export function appointment_conflict() {
  run('appointment_conflict', 'POST', '/appointments', {
    staffId: __ENV.STAFF_ID,
    startAt: new Date(Date.now() + 86_400_000).toISOString(),
    endAt: new Date(Date.now() + 88_200_000).toISOString(),
    idempotencyKey: `k6-${__VU}-${__ITER}`,
  });
}
export function ai_usage() {
  run('ai_usage', 'POST', '/agents/usage', {
    tokens: 10,
    idempotencyKey: `k6-${__VU}-${__ITER}`,
  });
}
export function rag_retrieval() {
  run('rag_retrieval', 'POST', '/knowledge-sources/retrieve', {
    query: 'performance test query',
    limit: 10,
  });
}
