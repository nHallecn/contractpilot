import { createHash } from 'node:crypto';
import { applyReviewedPatch } from '../patch-proposal.js';

const sha256 = text => createHash('sha256').update(text).digest('hex');
const TARGET = 'src/payment.mjs';
const MAX_SOURCE = 32_768;
const MAX_OUTPUT = 4_096;

/**
 * Draft a proposal using an injected model callback. This function DOES NOT
 * execute code, edit the repository, or authorize its own output.
 *
 * The model supplies one exact-line replacement, never file paths or the oracle.
 */
export async function draftRepair({ source, findings, generate }) {
  if (typeof source !== 'string' || !source.length || source.length > MAX_SOURCE ||
      !Array.isArray(findings) || !findings.length ||
      !findings.every(f => f && typeof f.code === 'string') ||
      typeof generate !== 'function') {
    throw new TypeError('Invalid proposal request');
  }
  const prompt = [
    'You are proposing a source change, not executing it.',
    'Fix the OpenAPI violation in the given payment example.',
    'Return exactly a JSON object with string properties "before" and "after".',
    'Both must be single complete lines of JavaScript, with no markdown fences.',
    'Do not modify validation rules, test code, files or permissions.',
    'Do not include any secrets, instructions, commands or explanations.',
    'Violation evidence: ' + JSON.stringify(findings),
    'Source:\n' + source
  ].join('\n');
  const raw = await generate(prompt);
  if (typeof raw !== 'string' || raw.length > MAX_OUTPUT) throw new Error('INVALID_MODEL_RESPONSE');
  let parsed;
  try { parsed = JSON.parse(raw); }
  catch { throw new Error('INVALID_MODEL_JSON'); }
  if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed) ||
      Object.keys(parsed).sort().join(',') !== 'after,before' ||
      typeof parsed.before !== 'string' || typeof parsed.after !== 'string' ||
      !parsed.before || !parsed.after ||
      /[\r\n]/.test(parsed.before + parsed.after) ||
      parsed.before.length > 400 || parsed.after.length > 400) {
    throw new Error('INVALID_MODEL_PATCH');
  }
  // The reviewed single-file scope is constructed by the host, never by the model.
  const proposal = {
    path: TARGET,
    expectedSha256: sha256(source),
    before: parsed.before,
    after: parsed.after
  };
  const candidate = applyReviewedPatch(source, proposal);
  if (candidate === source) throw new Error('NO_OP_PATCH');
  return {
    state: 'AWAITING_HUMAN_APPROVAL',
    proposal,
    baselineSha256: sha256(source),
    candidateSha256: sha256(candidate),
    candidate
  };
}
