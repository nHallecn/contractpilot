import { fixtures } from '../fixtures/contracts.js';
import { evaluateCase } from '../src/runner.js';

let failures = 0;
const cases = [];
for (const fixture of fixtures) {
  const shared = { spec: fixture.spec, method: fixture.method, path: fixture.path, request: fixture.request };
  const before = await evaluateCase({ ...shared, handler: fixture.broken });
  const after = await evaluateCase({ ...shared, handler: fixture.fixed });
  const expected = before.state === 'FAIL' &&
    before.violations.some(v => v.code === fixture.expectedFailure) &&
    after.state === 'PASS';
  if (!expected) failures++;
  cases.push({ name: fixture.name, broken: before, fixed: after, expected });
}
console.log(JSON.stringify({ schemaVersion: 1, total: cases.length, passed: cases.length - failures, failed: failures, cases }, null, 2));
if (failures) process.exitCode = 1;
