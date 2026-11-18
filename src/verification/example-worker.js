import { mkdtemp, mkdir, chmod, writeFile, copyFile, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { resolve, join } from 'node:path';
import { execFileSync } from 'node:child_process';
import { createHash } from 'node:crypto';

// Restricted worker for the checked-in example only. Not a general sandbox.
const root = resolve(import.meta.dirname, '../..');
const digest = text => createHash('sha256').update(text).digest('hex');

export async function validateCandidate(label, code) {
  const stage = await mkdtemp(join(tmpdir(), 'contractpilot-'));
  try {
    // mkdtemp defaults to 0700; make read-only traversal possible for container UID 10001.
    await chmod(stage, 0o755);
    await mkdir(join(stage, 'src'), { mode: 0o755 });
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
