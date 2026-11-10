# Architecture decision record: action-first contract verification

## Scope of PR #1

A pure OpenAPI response oracle and trusted in-process benchmark. No AI, no repository modification, no GitHub-write token, no real application execution, and no Atlassian integration is claimed in this PR.

## Evidence model

The baseline is a deliberately broken handler for each fixture and the comparison is a corrected handler. For each case the oracle must detect the known violation, and accept the corrected response. This is a synthetic 3-case smoke benchmark, not a claim about production accuracy.

PASS means only the supported subset of the response schema was satisfied. FAIL means a supported contract was violated. UNKNOWN means input or schema cannot be assessed reliably, or the handler could not be exercised.

## Safety boundaries for later PRs

1. Explicit authorization for repository read and PR write scopes.
2. Untrusted repository tests run in a network-restricted disposable sandbox with CPU, memory, file-system and time limits; never inside the Forge runtime.
3. A model may propose patches but may not alter the contract oracle or select its own adjudication rules.
4. Real PR creation requires user approval and attaches the unchanged validation artifacts.
5. No auto-merge, production credentials, or deployment privileges.

## Next gate

Demonstrate a real adapter executing a user-authorized example API repository, then add an agent constrained to generating a regression test and patch. Preserve baseline and post-fix results under the same independent oracle.
