import { draftRepair } from './propose.js';
import { createOpenAIProposalGenerator } from './openai-provider.js';

/**
 * Explicitly opted-in proposal workflow. No repository write, test execution,
 * container orchestration or GitHub permission.
 */
export async function proposeFromEvidence({
  source, findings, consent, apiKey, model, fetchImpl
}) {
  if (consent !== true) throw new Error('EXPLICIT_CONSENT_REQUIRED');
  if (!Array.isArray(findings) || !findings.some(f => f?.code === 'UNEXPECTED_STATUS')) {
    throw new Error('NO_SUPPORTED_CONTRACT_FAILURE');
  }
  const generate = createOpenAIProposalGenerator({ apiKey, model, fetchImpl });
  const staged = await draftRepair({ source, findings, generate });
  // Never export a candidate as "verified": it still needs an independent sandbox run.
  return {
    state: staged.state,
    proposal: staged.proposal,
    baselineSha256: staged.baselineSha256,
    candidateSha256: staged.candidateSha256,
    candidate: staged.candidate,
    verification: 'NOT_RUN',
    approval: 'REQUIRED'
  };
}
