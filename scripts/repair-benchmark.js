import { mkdtemp, mkdir, chmod, readFile, writeFile, copyFile, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { resolve, join, dirname } from 'node:path';
import { execFileSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import { applyReviewedPatch } from '../src/patch-proposal.js';

// Intentionally fixed to a checked-in demonstration API. This is not
// an arbitrary repository clone or a general untrusted-code sandbox.
const root = resolve(import.meta.dirname, '..');
const original = await readFile(join(root, 'examples/repair-lab/src/payment.mjs'), 'utf8');
const proposed = applyReviewedPatch(original);
const digest = text => createHash('sha256').update(text).digest('hex');

async function validateCandidate(label, code) {
  const stage = await mkdtemp(join(tmpdir(), 'contractpilot-'));
  try {
    // mkdtemp defaults to 0700; make read-only traversal possible for container UID 10001.\n    await chmod(stage, 0o755);\n    await mkdir(join(stage, 'src'), { mode: 0o755 });
    await writeFile(join(stage, 'package.json'), '{"type":"module"}\n');
    await writeFile(join(stage, 'src/payment.mjs'), code);
    const copy = async (from, to) => copyFile(join(root, from), join(stage, to));
    await copy('examples/repair-lab/worker.mjs', 'worker.mjs');
    await copy('examples/payment-api/contract.js', 'spec.mjs');
    await copy('examples/payment-api/server.js', 'server.js');
    await copy('src/http-probe.js', 'http-probe.js');
    await copy('src/contract.js', 'contract.js');

    // Container cannot reach the network, gain privileges, write into /work,
    // or access the host working tree. A preinstalled image is required.
    const args = [
      'run', '--rm', '--network', 'none',
      '--read-only', '--cap-drop', 'ALL',
      '--security-opt', 'no-new-privileges',
      '--pids-limit', '64', '--memory', '256m', '--cpus', '1',
      '--user', '10001:10001', '--tmpfs', '/tmp:rw,nosuid,noexec,size=16m',
      '--mount', `type=bind,src=${stage},dst=/work,readonly`,
      '--workdir', '/work', 'node:22-alpine',
      'node', 'worker.mjs'
    ];
    const stdout = execFileSync('docker', args, { encoding: 'utf8', timeout: 30000,
      maxBuffer: 1024 * 1024 });
    const result = JSON.parse(stdout.trim());
    if (!['PASS', 'FAIL', 'UNKNOWN'].includes(result?.state) ||
        !Array.isArray(result.violations) || !result.evidence) {
      throw new Error('INVALID_WORKER_EVIDENCE');
    }
    return { label, sourceSha256: digest(code), result };
  } finally {
    await rm(stage, { recursive: true, force: true });
  }
}
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
