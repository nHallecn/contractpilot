import { readFile } from 'node:fs/promises';
import { proposeFromEvidence } from '../src/agent/workflow.js';

// Only the checked-in demonstration file is read and disclosed to the model.
// The runner has no GitHub/Atlassian write integration and prints no credentials.
if (process.env.CONTRACTPILOT_SEND_DEMO_SOURCE !== 'yes') {
  console.error('Set CONTRACTPILOT_SEND_DEMO_SOURCE=yes to explicitly authorize sending the example source to the configured model.');
  process.exit(2);
}
if (!process.env.OPENAI_API_KEY || !process.env.CONTRACTPILOT_MODEL) {
  console.error('Set OPENAI_API_KEY and CONTRACTPILOT_MODEL.');
  process.exit(2);
}
try {
  const source = await readFile(new URL('../examples/repair-lab/src/payment.mjs', import.meta.url), 'utf8');
  const staged = await proposeFromEvidence({
    source,
    findings: [{ code: 'UNEXPECTED_STATUS', actual: 200 }],
    consent: true,
    apiKey: process.env.OPENAI_API_KEY,
    model: process.env.CONTRACTPILOT_MODEL
  });
  console.log(JSON.stringify({
    ...staged,
    disclosure: 'Proposal only: requires human approval and independent verification. Not a completed repair.'
  }, null, 2));
} catch (error) {
  console.error('Proposal failed:', error.message);
  process.exitCode = 1;
}
