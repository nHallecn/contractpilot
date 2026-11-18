# M6 — Human-approved candidate verification

## What exists
1. An existing model adapter produces a single-line replacement proposal. It does not execute its output.
2. An operator reviews the proposed candidate and explicitly authorizes its exact SHA-256.
3. The host reconstructs the candidate from the trusted original source and pinned one-file patch scope.
4. Only then, in the checked-in example runner, a Docker worker verifies baseline FAIL and candidate PASS with the unchanged OpenAPI oracle.
5. Evidence includes source hashes and HTTP response digests. No GitHub branch, commit or PR is created by the product.

## Usage
- Optional live model proposal: `CONTRACTPILOT_SEND_DEMO_SOURCE=yes OPENAI_API_KEY=... CONTRACTPILOT_MODEL=... npm run propose:live > proposal.json` (do not log/share credentials).
- Review `proposal.json` carefully, including the full candidate source.
- Set `CONTRACTPILOT_APPROVE_EXECUTION=yes` and `CONTRACTPILOT_APPROVED_CANDIDATE_SHA256` to the exact candidate digest.
- Run `npm run verify:approved` on a trusted Docker-equipped host with the `node:22-alpine` image present.
- CI uses a **mocked** model response and **simulated** approval to run a repeatable benchmark. That is NOT evidence of real model repair accuracy.

## Security and limitations
- Docker is not a hardened sandbox for adversarial repositories or hostile model output. This demo must only be executed with the reviewed, trusted fixture. The Docker daemon remains privileged on the host.
- Full source review is mandatory; checking a digest alone is not meaningful consent if the proposed code was not examined.
- The single-file guard is not a semantic safety proof. A syntactically valid replacement can still be harmful.
- A real production service needs a disposable VM/microVM, immutable image digest, isolated credentials, strict egress, quotas, and audit logs.
- There is **no Atlassian/Forge/Rovo integration and no product-created GitHub PR** at this stage.

## Next quality gate
Run actual live model attempts against independent, previously unseen API violations and publish honest pass/reject rates, including failure cases and reproducible evidence. Prioritize Atlassian-native Rovo orchestration before polish.
