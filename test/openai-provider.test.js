import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { createOpenAIProposalGenerator } from '../src/agent/openai-provider.js';
import { proposeFromEvidence } from '../src/agent/workflow.js';

const source = await readFile(new URL('../examples/repair-lab/src/payment.mjs', import.meta.url), 'utf8');
const validModelText = JSON.stringify({
  before: '  return { status: 200, body: { ok: true } };',
  after: "  return { status: 201, body: { paymentId: 'pay_demo_001' } };"
});
const mockResponse = (text = validModelText, status = 'completed') => ({
  ok: true, text: async () => JSON.stringify({
    status, output: [{ type: 'message', role: 'assistant', content: [{ type: 'output_text', text }] }]
  })
});
const findings = [{ code: 'UNEXPECTED_STATUS', actual: 200 }];

test('explicitly authorized provider stages a real-API-shaped proposal without executing it', async () => {
  let calls = 0;
  const fetchImpl = async (url, options) => {
    calls++;
    assert.equal(url, 'https://api.openai.com/v1/responses');
    assert.equal(options.redirect, 'error');
    const payload = JSON.parse(options.body);
    assert.equal(payload.store, false);
    assert.equal(payload.model, 'test-model');
    assert.equal(payload.input[1].role, 'user');
    return mockResponse();
  };
  const result = await proposeFromEvidence({
    source, findings, consent: true, apiKey: 'unit-test-key', model: 'test-model', fetchImpl
  });
  assert.equal(calls, 1);
  assert.equal(result.state, 'AWAITING_HUMAN_APPROVAL');
  assert.equal(result.verification, 'NOT_RUN');
  assert.equal(result.approval, 'REQUIRED');
});

test('without consent, the provider is never contacted', async () => {
  let calls = 0;
  await assert.rejects(proposeFromEvidence({
    source, findings, consent: false, apiKey: 'test', model: 'test-model',
    fetchImpl: async () => { calls++; return mockResponse(); }
  }), /EXPLICIT_CONSENT_REQUIRED/);
  assert.equal(calls, 0);
});

test('unsupported findings fail before any model request', async () => {
  let calls = 0;
  await assert.rejects(proposeFromEvidence({
    source, findings: [{ code: 'INVALID_JSON' }], consent: true,
    apiKey: 'test', model: 'test-model',
    fetchImpl: async () => { calls++; return mockResponse(); }
  }), /NO_SUPPORTED_CONTRACT_FAILURE/);
  assert.equal(calls, 0);
});

test('provider rejects incomplete responses', async () => {
  const generate = createOpenAIProposalGenerator({
    apiKey: 'test', model: 'test-model', fetchImpl: async () => mockResponse(validModelText, 'incomplete')
  });
  await assert.rejects(generate('repair this'), /INCOMPLETE_MODEL_RESPONSE/);
});

test('provider rejects no answer and tool-only responses', async () => {
  const generate = createOpenAIProposalGenerator({
    apiKey: 'test', model: 'test-model',
    fetchImpl: async () => ({ ok: true, text: async () =>
      JSON.stringify({ status: 'completed', output: [{ type: 'function_call' }] }) })
  });
  await assert.rejects(generate('repair'), /INVALID_MODEL_OUTPUT/);
});

test('provider maps HTTP errors without exposing response body', async () => {
  const generate = createOpenAIProposalGenerator({
    apiKey: 'test', model: 'test-model',
    fetchImpl: async () => ({ ok: false, status: 401 })
  });
  await assert.rejects(generate('repair'), /MODEL_HTTP_401/);
});

test('transport exception is sanitized', async () => {
  const generate = createOpenAIProposalGenerator({
    apiKey: 'test', model: 'test-model',
    fetchImpl: async () => { throw new Error('secret credential'); }
  });
  await assert.rejects(generate('repair'), /^Error: MODEL_TRANSPORT_ERROR$/);
});

test('model-generated extra fields are rejected by host validator', async () => {
  await assert.rejects(proposeFromEvidence({
    source, findings, consent: true, apiKey: 'test', model: 'test-model',
    fetchImpl: async () => mockResponse(JSON.stringify({
      before: validModelText, after: 'replacement', path: '../../source'
    }))
  }), /INVALID_MODEL_PATCH/);
});

test('API key and model must be configured', () => {
  assert.throws(() => createOpenAIProposalGenerator({ apiKey: '', model: 'test-model' }), /OPENAI_API_KEY_REQUIRED/);
  assert.throws(() => createOpenAIProposalGenerator({ apiKey: 'test', model: 'bad model' }), /INVALID_OPENAI_MODEL/);
});
