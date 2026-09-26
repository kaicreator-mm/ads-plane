# Validation — v0.0.1

## Repository-real validation

Authoritative clean-runner validation is performed by `.github/workflows/ci.yml` on the exact PR HEAD.

Required checks:

- clean dependency installation on Node.js 22;
- production dependency audit (`npm audit --omit=dev --audit-level=high`);
- package/server/web production builds;
- reducer, adapter, storage and server tests;
- TypeScript strict typecheck across all workspaces;
- static safety assertion that the runtime GitHub adapter contains no POST/PUT/PATCH/DELETE method.

A PASS applies only to the exact commit SHA tested.

## Current environment limitation

The ChatGPT execution container used during initial implementation could not resolve the npm registry, so local install/build results from that environment are not release evidence. GitHub Actions is used as the clean repository-real validation host.

## Browser/UX validation

A real-browser visual and interaction pass is intentionally separated from repository compile/test validation. It must verify at least:

- desktop and narrow viewport layout;
- lane/DAG readability;
- READY/RUNNING/BLOCKED/MERGE READY panels;
- Agent/Dispatch cards;
- evidence matrix and stale exact-SHA warning visibility;
- task detail/provenance interaction;
- demo-mode boot and live API boot.

The browser pass is tracked as a local-environment validation handoff Issue when the current execution environment does not provide a suitable browser host.

## Authority

All UI/cache state is `NON_AUTHORITATIVE_DERIVED_STATE`; GitHub/repository durable facts remain authoritative.
