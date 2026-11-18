import { readFile } from 'node:fs/promises';
import { verifyApprovedProposal } from '../src/verification/approved.js';
import { validateCandidate } from '../src/verification/example-worker.js';

/**
 * Operator workflow:
 * 1. Generate proposal using `npm run propose:live > proposal.json`.
 * 2. Review full proposed diff and its candidateSha256.
 * 3. Set CONTRACTPILOT_APPROVE_EXECUTION=yes and exact digest to approve.
 *
 * The application never reads arbitrary user-supplied source paths.
 * CAUTION: only use the checked-in trusted payment fixture.
 */
if (process.env.CONTRACTPILOT_APPROVE_EXECUTION !== 'yes' ||
    !/^[a-f0-9]{64}$/.test(process.env.CONTRACTPILOT_APPROVED_CANDIDATE_SHA256 || '')) {
  console.error('Explicit approval and exact candidate SHA-256 are required.');
  process.exit(2);
}
try {
  const source = await readFile(new URL('../examples/repair-lab/src/payment.mjs', import.meta.url), 'utf8');
  const proposalText = await readFile(new URL('../proposal.json', import.meta.url), 'utf8');
  if (proposalText.length > 100000) throw Error('PROPOSAL_TOO_LARGE');
  const staged = JSON.parse(proposalText);
  const report = await verifyApprovedProposal({
    source, staged,
    approvedCandidateSha256: process.env.CONTRACTPILOT_APPROVED_CANDIDATE_SHA256,
    verifier: validateCandidate
  });
  console.log(JSON.stringify(report, null, 2));
  if (!report.verified) process.exitCode = 1;
} catch (error) {
  console.error('Verification failed:', error.message);
  process.exitCode = 1;
}
