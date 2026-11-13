import { createPayment } from './src/payment.mjs';
import { paymentContract } from './spec.mjs';
import { startExampleApi } from './server.js';
import { probeExampleApi } from './http-probe.js';

// Run only inside the restricted demonstration container.
// This worker owns the verifier; candidate payment source cannot choose its oracle.
let server;
try {
  server = await startExampleApi(createPayment);
  const result = await probeExampleApi({ endpoint: server.endpoint, spec: paymentContract });
  console.log(JSON.stringify(result));
} catch (error) {
  console.error('Verification infrastructure error:', error.message);
  process.exitCode = 2;
} finally {
  if (server) await server.close();
}
