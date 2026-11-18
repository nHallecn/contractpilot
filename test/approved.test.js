import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { createHash } from 'node:crypto';
import { draftRepair } from '../src/agent/propose.js';
import { verifyApprovedProposal } from '../src/verification/approved.js';

const source = await readFile(new URL('../examples/repair-lab/src/payment.mjs', import.meta.url), 'utf8');
const hash = v => createHash('sha256').update(v).digest('hex');
const findings = [{ code: 'UNEXPECTED_STATUS', actual: 200 }];
const generate = async () => JSON.stringify({
  before: '  return { status: 200, body: { ok: true } };',
  after: "  return { status: 201, body: { paymentId: 'pay_demo_001' } };"
});
const prepare = async () => {
  const result = await draftRepair({ source, findings, generate });
  return { ...result, verification: 'NOT_RUN', approval: 'REQUIRED' };
};
const verifier = async (label, code) => ({
  label, sourceSha256: hash(code),
  result: label === 'baseline'
    ? { state: 'FAIL', violations: [{ code: 'UNEXPECTED_STATUS' }], evidence: { bodySha256: hash('bad') } }
    : { state: 'PASS', violations: [], evidence: { bodySha256: hash('good') } }
});

test('approved exact candidate passes both independent gates', async () => {
  const staged = await prepare();
  const result = await verifyApprovedProposal({
    source, staged, approvedCandidateSha256: staged.candidateSha256, verifier
  });
  assert.equal(result.state, 'VERIFIED');
  assert.equal(result.verified, true);
});
test('approval required before any candidate execution', async () => {
  const staged = await prepare(); let calls = 0;
  await assert.rejects(verifyApprovedProposal({
    source, staged, approvedCandidateSha256: hash('different'),
    verifier: async () => { calls++; return verifier(); }
  }), /CANDIDATE_NOT_APPROVED/);
  assert.equal(calls, 0);
});
test('tampered candidate is rejected before execution', async () => {
  const staged = await prepare(); let calls = 0;
  staged.candidate += '\nconsole.log("bad")';
  await assert.rejects(verifyApprovedProposal({
    source, staged, approvedCandidateSha256: staged.candidateSha256,
    verifier: async () => { calls++; }
  }), /CANDIDATE_TAMPERED/);
  assert.equal(calls, 0);
});
test('source drift blocks execution', async () => {
  const staged = await prepare();
  await assert.rejects(verifyApprovedProposal({
    source: source + ' ', staged,
    approvedCandidateSha256: staged.candidateSha256, verifier
  }), /BASELINE_MISMATCH/);
});
test('baseline must fail for documented reason; candidate not executed', async () => {
  const staged = await prepare(); let calls = 0;
  const result = await verifyApprovedProposal({
    source, staged, approvedCandidateSha256: staged.candidateSha256,
    verifier: async (label, code) => { calls++; return {
      label, sourceSha256: hash(code), result: { state: 'PASS', violations: [], evidence: {} }
    }; }
  });
  assert.equal(result.reason, 'BASELINE_NOT_REPRODUCED');
  assert.equal(calls, 1);
});
test('UNKNOWN candidate cannot become verified', async () => {
  const staged = await prepare();
  const result = await verifyApprovedProposal({
    source, staged, approvedCandidateSha256: staged.candidateSha256,
    verifier: async (label, code) => ({
      sourceSha256: hash(code),
      result: label === 'baseline'
        ? { state: 'FAIL', violations: [{ code: 'UNEXPECTED_STATUS' }], evidence: {} }
        : { state: 'UNKNOWN', violations: [], evidence: {} }
    })
  });
  assert.equal(result.state, 'REJECTED');
});
test('source hash reported by worker must match candidate', async () => {
  const staged = await prepare();
  const result = await verifyApprovedProposal({
    source, staged, approvedCandidateSha256: staged.candidateSha256,
    verifier: async (label, code) => ({
      sourceSha256: label === 'baseline' ? hash(code) : hash('other'),
      result: label === 'baseline'
        ? { state: 'FAIL', violations: [{ code: 'UNEXPECTED_STATUS' }], evidence: {} }
        : { state: 'PASS', violations: [], evidence: { bodySha256: hash('good') } }
    })
  });
  assert.equal(result.verified, false);
});
