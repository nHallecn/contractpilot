import test from 'node:test';
import assert from 'node:assert/strict';
import { paymentContract } from '../examples/payment-api/contract.js';
import { brokenPaymentHandler, correctedPaymentHandler } from '../examples/payment-api/implementations.js';
import { startExampleApi } from '../examples/payment-api/server.js';
import { probeExampleApi } from '../src/http-probe.js';
import { runHttpBenchmark } from '../scripts/http-benchmark.js';

test('live loopback endpoint produces failing baseline evidence', async () => {
  const app = await startExampleApi(brokenPaymentHandler);
  try {
    const result = await probeExampleApi({ endpoint: app.endpoint, spec: paymentContract });
    assert.equal(result.state, 'FAIL');
    assert.equal(result.evidence.status, 200);
    assert.match(result.evidence.bodySha256, /^[0-9a-f]{64}$/);
  } finally {
    await app.close();
  }
});

test('live loopback endpoint passes with corrected implementation', async () => {
  const app = await startExampleApi(correctedPaymentHandler);
  try {
    const result = await probeExampleApi({ endpoint: app.endpoint, spec: paymentContract });
    assert.equal(result.state, 'PASS');
    assert.equal(result.evidence.status, 201);
  } finally {
    await app.close();
  }
});

test('benchmark includes baseline, correction and negative control', async () => {
  const report = await runHttpBenchmark();
  assert.equal(report.passed, 3);
  assert.equal(report.total, 3);
  assert.equal(report.results[2].result.violations[0].code, 'MISSING_REQUIRED');
});

test('rejects arbitrary network targets before any request', async () => {
  await assert.rejects(probeExampleApi({
    endpoint: 'https://example.com/payments', spec: paymentContract
  }), /loopback/);
});

test('unknown cannot be considered passing when server is unreachable', async () => {
  const result = await probeExampleApi({
    endpoint: 'http://127.0.0.1:1/payments', spec: paymentContract, timeoutMs: 300
  });
  assert.equal(result.state, 'UNKNOWN');
  assert.equal(result.evidence, null);
});
