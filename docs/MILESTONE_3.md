# M3: isolated reviewed-patch demonstration

## Purpose
Prove that a checked-in API source file can be copied into a temporary worktree, assessed by an independent HTTP contract oracle in a restricted Docker container, replaced by an explicitly reviewed patch, and assessed again using the same oracle.

Run `npm run benchmark:repair` with Docker installed and the `node:22-alpine` image already available. CI pulls the image, then runs the benchmark. The run fails if the baseline does not fail with UNEXPECTED_STATUS or the candidate does not pass.

## Security controls
- Only the checked-in payment fixture is eligible; the patch has a fixed allowlisted destination and exact source hash.
- No repository network access; container uses `--network none`.
- Read-only filesystem and worktree; no Linux capabilities; no-new-privileges; unprivileged user; memory, CPU, process and execution-time limits.
- No GitHub tokens or Atlassian credentials in the worker.
- Error/timeout/UNKNOWN states cannot qualify as a passing fix.
- Baseline and candidate use the exact same independent OpenAPI oracle.

## Explicit limitations
This is *not* an isolation solution for hostile repositories: Docker is not a hardened multi-tenant sandbox, and the host-side Docker executor has elevated access to its daemon. The image tag is not digest pinned, and the workflow should never accept an arbitrary path or PR-provided Docker command. Future remote execution needs a dedicated disposable worker/VM, immutable image digest, resource quotas, no host credentials, and threat-model review.

The patch is **handwritten**. This demonstration does not yet perform AI-generated repairs, pull requests from the product, or Atlassian/Rovo integration.
