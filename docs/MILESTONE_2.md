# Milestone 2: contract verification over real HTTP

## Demonstrated capability

Run a real Node.js HTTP server on a randomly allocated loopback port and send a POST /payments request through fetch. The same approved OpenAPI response oracle from milestone 1 adjudicates all candidates.

- Baseline handler: HTTP 200 -> FAIL (status mismatch)
- Corrected handler: HTTP 201 + paymentId -> PASS
- Negative control: HTTP 201 but missing paymentId -> FAIL

Outputs include content type, response status, response-size and SHA-256 of the raw body. Tests confirm the baseline and correction over real HTTP rather than calling a stub directly.

Run `npm run check`. The CI pipeline checks the benchmark's exit status.

## Limits and honest claims

The service is a **checked-in, trusted local example API**. Comparing its checked-in broken and corrected implementations is not an AI-generated patch and not external-repository execution. There is no clone, filesystem patch, untrusted code execution, CI deployment, or external HTTP target. The loopback probe is intentionally restricted.

The benchmark is still synthetic and not a representative accuracy estimate. Actual project execution requires a distinct disposable sandbox/worker with resource, network and credential restrictions. This milestone does not provide that sandbox.

## Next evidence gate

Create an explicitly authorized sample repository runner in an isolated worker. Capture a baseline test artifact from an actual commit, apply a proposed patch to a throwaway copy, rerun the same oracle and tests, and produce a reviewable diff. Only then introduce model-generated patches.
