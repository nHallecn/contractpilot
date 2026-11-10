import test from 'node:test';
import assert from 'node:assert/strict';
import { fixtures } from '../fixtures/contracts.js';
import { evaluateCase } from '../src/runner.js';
import { validateValue, verifyResponse } from '../src/contract.js';

for (const fixture of fixtures) {
  test(`${fixture.name}: fails before and passes after`, async () => {
    const common = { spec: fixture.spec, method: fixture.method, path: fixture.path, request: fixture.request };
    const broken = await evaluateCase({ ...common, handler: fixture.broken });
    const fixed = await evaluateCase({ ...common, handler: fixture.fixed });
    assert.equal(broken.state, 'FAIL');
    assert.ok(broken.violations.some(v => v.code === fixture.expectedFailure));
    assert.equal(fixed.state, 'PASS');
  });
}
test('unsupported $ref cannot pass', () => {
  assert.deepEqual(validateValue({ $ref: '#/components/schemas/X' }, {}), [{ code: 'UNSUPPORTED_SCHEMA', path: '$' }]);
});
test('non-JSON response contract is unknown', () => {
  const spec = { openapi: '3.0.3', paths: { '/a': { get: { responses: { 200: {} } } } } };
  assert.equal(verifyResponse({ spec, method: 'get', path: '/a', response: { status: 200, body: {} } }).state, 'UNKNOWN');
});
test('missing operation is unknown', () => {
  assert.equal(verifyResponse({ spec: fixtures[0].spec, method: 'delete', path: '/payments', response: { status: 200, body: {} } }).state, 'UNKNOWN');
});
test('invalid JSON is a failure', () => {
  assert.equal(verifyResponse({ spec: fixtures[1].spec, method: 'get', path: '/accounts', response: { status: 200, body: '{' } }).violations[0].code, 'INVALID_JSON');
});
test('handler crashes cannot pass', async () => {
  const f = fixtures[0];
  const result = await evaluateCase({ spec: f.spec, method: f.method, path: f.path, handler: () => { throw Error('failure'); } });
  assert.equal(result.state, 'UNKNOWN');
});
test('invalid types are not silently accepted', () => {
  assert.equal(validateValue({ type: 'integer' }, 1.5)[0].code, 'TYPE_MISMATCH');
});
test('nested required properties are verified', () => {
  assert.equal(validateValue({ type: 'object', required: ['details'], properties: {
    details: { type: 'object', required: ['id'], properties: { id: { type: 'string' } } }
  } }, { details: {} })[0].path, '$.details.id');
});
