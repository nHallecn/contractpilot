# M5: opt-in live model proposal adapter (proposal only)

## Intent
Connect the existing constrained proposal interface to the OpenAI Responses HTTP API. The only source disclosed by the demonstration CLI is the checked-in payment example, and only if the operator sets the explicit opt-in flag.

## Running a live provider
Set `OPENAI_API_KEY` and `CONTRACTPILOT_MODEL` in your own environment, and set `CONTRACTPILOT_SEND_DEMO_SOURCE=yes` to authorize sending the example source and failure evidence to the model. Then run `npm run propose:live`.

Do **not** commit keys or share private repositories through this demo. The CLI never writes files or creates PRs.

## Model/provider boundary
- Fixed provider endpoint `https://api.openai.com/v1/responses`, no caller-provided URL.
- `store: false`, bounded input/output, explicit timeout and no redirects.
- Responses must contain exactly one assistant text output; malformed and incomplete responses fail closed.
- Host code controls the target file path, exact source hash, parsing/allowlist and independent contract oracle.
- Proposed source remains `AWAITING_HUMAN_APPROVAL`; execution and CI verification are **NOT_RUN**.
- Model outputs are untrusted and must not be executed in a privileged environment.

## Evidence/limits
GitHub CI uses mocked provider transport to validate the request contract and consent handling; **a real model response has not been demonstrated unless an operator runs the CLI with actual API credentials**. This PR is a provider integration capability, not a benchmark of AI repair success or proof of autonomous patching.

## Next gate
Measure actual model proposal success on new, unmemorized cases; retain redacted provider traces and independently verified before/after artifacts from a disposable worker. Then add a human-approved PR workflow. For Codegeist, assess whether the sponsoring Atlassian Rovo agent can own the orchestration before presenting this as a sponsor-native agent.
