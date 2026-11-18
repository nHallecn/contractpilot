import { readFile } from 'node:fs/promises';
import { draftRepair } from '../src/agent/propose.js';
import { verifyApprovedProposal } from '../src/verification/approved.js';
import { validateCandidate } from '../src/verification/example-worker.js';

const source = await readFile(new URL('../examples/repair-lab/src/payment.mjs', import.meta.url), 'utf8');
const findings = [{ code: 'UNEXPECTED_STATUS', actual: 200 }];
// This is a MOCKED model output for repeatable CI, not a live AI-generated repair.
const generate = async () => JSON.stringify({
  before: '  return { status: 200, body: { ok: true } };',
  after: "  return { status: 201, body: { paymentId: 'pay_demo_001' } };"
});
try {
  const pending = await draftRepair({ source, findings, generate });
  const staged = { ...pending, verification: 'NOT_RUN', approval: 'REQUIRED' };
  // Explicit test authorization for this checked-in, trusted fixture only.
  const report = await verifyApprovedProposal({
    source, staged, approvedCandidateSha256: staged.candidateSha256,
    verifier: validateCandidate
  });
  console.log(JSON.stringify({
    schemaVersion: 1, benchmark: 'approved-proposal-demo',
    simulatedApproval: true, mockedModel: true, ...report
  }, null, 2));
  if (!report.verified) process.exitCode = 1;
} catch (error) {
  console.error('Approved benchmark failed:', error.message);
  process.exitCode = 1;
}
