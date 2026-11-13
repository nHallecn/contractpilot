import { createHash } from 'node:crypto';

export const PAYMENT_PATCH = Object.freeze({
  path: 'src/payment.mjs',
  expectedSha256: '5d3cf85fa550cccf2df5c610c5d6b980b0f2b18aeaeafa7c16c0d6d70cd7ad20',
  before: "  return { status: 200, body: { ok: true } };",
  after: "  return { status: 201, body: { paymentId: 'pay_demo_001' } };"
});

/**
 * Apply exactly one reviewed replacement to a known source revision.
 * No arbitrary paths, shell instructions, fuzzy matching or silent partial edits.
 */
export function applyReviewedPatch(source, proposal = PAYMENT_PATCH) {
  if (typeof source !== 'string' || !proposal ||
      proposal.path !== 'src/payment.mjs' ||
      typeof proposal.expectedSha256 !== 'string' ||
      typeof proposal.before !== 'string' ||
      typeof proposal.after !== 'string' ||
      !proposal.before || !proposal.after) throw new TypeError('Invalid patch proposal');
  const sha = createHash('sha256').update(source).digest('hex');
  if (sha !== proposal.expectedSha256) throw new Error('BASELINE_SHA_MISMATCH');
  const first = source.indexOf(proposal.before);
  if (first < 0 || source.indexOf(proposal.before, first + proposal.before.length) !== -1) {
    throw new Error('PATCH_ANCHOR_NOT_UNIQUE');
  }
  return source.slice(0, first) + proposal.after + source.slice(first + proposal.before.length);
}
