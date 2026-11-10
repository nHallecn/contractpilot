# ContractPilot

**Turn API contract violations into independently verified fixes.**

ContractPilot is an action-first Codegeist 2026 project. The intended product connects Jira context, approved OpenAPI contracts, and authorized source repositories to produce test-backed pull requests. The final product is **not implemented yet**.

## Milestone 1 — deterministic contract verification

This pull request implements a small, dependency-free OpenAPI **response** checker and a repeatable synthetic baseline/after-fix benchmark. It deliberately performs no AI generation or repository writes.

```bash
npm run check
```

Requires Node.js 22+. The check runs unit tests and then a JSON-emitting benchmark; either can fail CI. Three independent cases intentionally violate (1) a response status code, (2) a required field, and (3) a field type; each has a known corrected handler. An UNKNOWN result cannot pass the benchmark.

**Supported subset:** OpenAPI 3.x operations with exact response status, `application/json` schema, object/array/scalar types, required fields, nested properties, and enum. Unsupported schema constructs such as `$ref`, `allOf`, `oneOf`, `anyOf`, nullable and complex constraints return UNKNOWN. The MVP does not verify all OpenAPI semantics, headers, request bodies, security rules, or live HTTP behavior.

The example handlers are trusted in-process fixtures, **not an arbitrary repository execution engine**. Benchmark passing does not demonstrate real-world repair accuracy.

## Next milestones

1. Exercise a real, explicitly authorized example API project in an isolated runner.
2. Generate a regression test and fix proposal with AI, keeping the oracle independent of the agent.
3. Create GitHub pull requests with verified evidence and human approval.
4. Integrate a bounded Rovo/Forge workflow triggered from Jira, then prepare a recorded benchmark-driven demonstration.

See [architecture and safety decisions](docs/DECISIONS.md).

## Contribution workflow

All changes go through feature branches and pull requests. Never commit features directly to main.
