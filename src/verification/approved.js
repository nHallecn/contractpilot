import { createHash } from 'node:crypto';
import { applyReviewedPatch } from '../patch-proposal.js';

const sha256 = text => createHash('sha256').update(text).digest('hex');
const shaPattern = /^[a-f0-9]{64}$/;

/**
 * Human approval is an exact candidate digest, never a boolean supplied by a model.
 * The verifier is injected by trusted host code and must use the fixed, independent oracle.
 * No arbitrary paths, contract changes, or model-triggered execution.
 */
export async function verifyApprovedProposal({
  source, staged, approvedCandidateSha256, verifier
}) {
  if (typeof source !== 'string' || !staged || typeof staged !== 'object' ||
      typeof verifier !== 'function' || !shaPattern.test(approvedCandidateSha256 || '')) {
    throw new TypeError('INVALID_APPROVAL_REQUEST');
  }
  if (staged.state !== 'AWAITING_HUMAN_APPROVAL' ||
      staged.verification !== 'NOT_RUN' || staged.approval !== 'REQUIRED') {
    throw new Error('PROPOSAL_NOT_PENDING');
  }
  if (staged.baselineSha256 !== sha256(source) ||
      staged.proposal?.expectedSha256 !== staged.baselineSha256 ||
      staged.proposal?.path !== 'src/payment.mjs') {
    throw new Error('BASELINE_MISMATCH');
  }
  const candidate = applyReviewedPatch(source, staged.proposal);
  if (staged.candidate !== candidate || staged.candidateSha256 !== sha256(candidate)) {
    throw new Error('CANDIDATE_TAMPERED');
  }
  if (approvedCandidateSha256 !== staged.candidateSha256) {
    throw new Error('CANDIDATE_NOT_APPROVED');
  }
  const baseline = await verifier('baseline', source);
  // Never execute the candidate if the expected baseline violation was not reproduced.
  if (baseline?.sourceSha256 !== sha256(source) ||
      baseline?.result?.state !== 'FAIL' ||
      !baseline.result.violations?.some(x => x.code === 'UNEXPECTED_STATUS')) {
    return { state: 'REJECTED', reason: 'BASELINE_NOT_REPRODUCED', baseline,
      candidate: null, approval: 'RECORDED', verified: false };
  }
  const result = await verifier('approved-candidate', candidate);
  const accepted = result?.sourceSha256 === staged.candidateSha256 &&
    result?.result?.state === 'PASS' &&
    Array.isArray(result.result.violations) && result.result.violations.length === 0 &&
    typeof result.result.evidence?.bodySha256 === 'string';
  return {
    state: accepted ? 'VERIFIED' : 'REJECTED',
    reason: accepted ? null : 'CANDIDATE_FAILED_OR_UNVERIFIED',
    approval: 'RECORDED', verified: accepted,
    baseline, candidate: result
  };
}
