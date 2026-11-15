import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { draftRepair } from '../src/agent/propose.js';

const source = await readFile(new URL('../examples/repair-lab/src/payment.mjs', import.meta.url), 'utf8');
const findings = [{ code: 'UNEXPECTED_STATUS', actual: 200 }];
const generate = async () => JSON.stringify({
  before: '  return { status: 200, body: { ok: true } };',
  after: "  return { status: 201, body: { paymentId: 'pay_demo_001' } };"
});

test('model-style proposal is staged, never applied automatically', async () => {
  const result = await draftRepair({ source, findings, generate });
  assert.equal(result.state, 'AWAITING_HUMAN_APPROVAL');
  assert.match(result.candidate, /status: 201/);
  assert.equal(result.proposal.path, 'src/payment.mjs');
  assert.match(result.baselineSha256, /^[0-9a-f]{64}$/);
});

test('model cannot select or modify a different file', async () => {
  await assert.rejects(draftRepair({ source, findings, generate: async () =>
    JSON.stringify({ before: 'x', after: 'y', path: '../contract.js' }) }), /INVALID_MODEL_PATCH/);
});

test('unanchored hallucinated edits are rejected', async () => {
  await assert.rejects(draftRepair({ source, findings, generate: async () =>
    JSON.stringify({ before: 'nonexistent', after: 'valid replacement' }) }), /PATCH_ANCHOR_NOT_UNIQUE/);
});

test('model no-ops rejected', async () => {
  await assert.rejects(draftRepair({ source, findings, generate: async () =>
    JSON.stringify({ before: '  return { status: 200, body: { ok: true } };',
      after: '  return { status: 200, body: { ok: true } };' }) }), /NO_OP_PATCH/);
});

test('invalid model response rejected', async () => {
  await assert.rejects(draftRepair({ source, findings, generate: async () => 'not json' }), /INVALID_MODEL_JSON/);
});

test('model proposed line cannot contain multiple lines', async () => {
  await assert.rejects(draftRepair({ source, findings, generate: async () =>
    JSON.stringify({ before: 'a', after: 'b\nimport x from \"fs\"' }) }), /INVALID_MODEL_PATCH/);
});

test('network/provider error propagates, never becomes an accepted patch', async () => {
  await assert.rejects(draftRepair({ source, findings, generate: async () => { throw Error('provider down'); } }), /provider down/);
});
