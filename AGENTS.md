# ADS Plane Agent Guide

Read `.dev-standard/VERSION` and `.dev-standard/PROJECT_OVERRIDES.md` before material changes.

Key invariants:

1. GitHub/repository durable facts remain Source of Truth.
2. UI/database snapshots are `NON_AUTHORITATIVE_DERIVED_STATE`.
3. `packages/reducer` is deterministic and has no network/storage side effects.
4. `packages/github-adapter` is read-only in v0.0.1.
5. Exact-SHA evidence must not silently migrate to a different PR HEAD.
6. Do not add GitHub mutation, Agent dispatch, merge or release action without a future frozen product/architecture change.
