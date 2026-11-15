# Milestone 4 (partial): bounded model proposal contract

This PR establishes a proposal interface for an injectable model. It is not yet a live model-backed repair runner.

## Supported scope
- An injected `generate(prompt)` callback receives the source and an already-known contract violation.
- Its output must be exactly JSON with `before` and `after` single-line strings.
- The host constructs the **only** permitted target path and source hash; model output cannot choose a file or change the contract oracle.
- The proposed change is checked for exact anchor uniqueness and returned as `AWAITING_HUMAN_APPROVAL`.
- Unit tests cover successful staging, extra keys/path redirection, malformed output, hallucinated anchors, no-op proposals, multiline injection, provider errors.

## Not yet done
- No live LLM provider is configured or called by this PR.
- No user approval UI, PR creation, or automated model-generated execution.
- No claim that a model repaired a real unfamiliar repository.
- Generated code must be treated as untrusted; execution in this repository's Docker demo is **not** a sufficient production sandbox.

## Next gate
Once the corrected Docker benchmark is green, wire a real provider with explicit opt-in and configured credentials, gather proposal acceptance measurements across independent failures, and execute approved proposals only in a hardened throwaway worker. Do not auto-merge.
