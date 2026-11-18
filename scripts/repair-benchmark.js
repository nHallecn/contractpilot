import { readFile } from 'node:fs/promises';
import { join, resolve } from 'node:path';
import { applyReviewedPatch } from '../src/patch-proposal.js';
import { validateCandidate } from '../src/verification/example-worker.js';

const root = resolve(import.meta.dirname, '..');
const original = await readFile(join(root, 'examples/repair-lab/src/payment.mjs'), 'utf8');
const proposed = applyReviewedPatch(original);

try {
  const baseline = await validateCandidate('baseline', original);
  const candidate = await validateCandidate('reviewed-patch', proposed);
  const passed = baseline.result.state === 'FAIL' &&
    baseline.result.violations.some(v => v.code === 'UNEXPECTED_STATUS') &&
    candidate.result.state === 'PASS';
  console.log(JSON.stringify({
    schemaVersion: 1, benchmark: 'isolated-reviewed-patch',
    passed, baseline, candidate,
    disclosure: 'Checked-in patch and example source; no AI or arbitrary repository execution.'
  }, null, 2));
  if (!passed) process.exitCode = 1;
} catch (error) {
  console.error('Isolated benchmark failed:', error.message);
  process.exitCode = 1;
}
