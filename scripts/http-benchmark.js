import { paymentContract } from '../examples/payment-api/contract.js';
import {
  brokenPaymentHandler, correctedPaymentHandler, incompletePaymentHandler
} from '../examples/payment-api/implementations.js';
import { startExampleApi } from '../examples/payment-api/server.js';
import { probeExampleApi } from '../src/http-probe.js';

export async function runHttpBenchmark() {
  const candidates = [
    ['baseline-broken', brokenPaymentHandler, 'FAIL', 'UNEXPECTED_STATUS'],
    ['candidate-fixed', correctedPaymentHandler, 'PASS', null],
    ['negative-control-missing-id', incompletePaymentHandler, 'FAIL', 'MISSING_REQUIRED']
  ];
  const results = [];
  for (const [name, handler, expected, expectedViolation] of candidates) {
    const app = await startExampleApi(handler);
    try {
      const result = await probeExampleApi({ endpoint: app.endpoint, spec: paymentContract });
      const accepted = result.state === expected &&
        (!expectedViolation || result.violations.some(v => v.code === expectedViolation));
      results.push({ name, expected, accepted, result });
    } finally {
      await app.close();
    }
  }
  return { schemaVersion: 1, benchmark: 'local-payment-http', total: results.length,
    passed: results.filter(r => r.accepted).length, results };
}

if (process.argv[1] && import.meta.url === new URL(`file://${process.argv[1]}`).href) {
  try {
    const report = await runHttpBenchmark();
    console.log(JSON.stringify(report, null, 2));
    if (report.passed !== report.total) process.exitCode = 1;
  } catch (error) {
    console.error('HTTP benchmark infrastructure failed:', error);
    process.exitCode = 1;
  }
}
