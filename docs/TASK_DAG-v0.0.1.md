# Task DAG — ADS Plane v0.0.1

## Frozen Inputs

- PRD: `docs/PRD-v0.0.1.md`
- Architecture: `docs/ARCHITECTURE-v0.0.1.md`
- Baseline: `main@b4cb0d70601b9614af896f04b742d411c2d96232`
- Standard: `ai-development-standard 4.0.0@88aa35a6ac6ceec859c7c1d9114828873842c0c5`

## Lane summary

| Lane | Tasks | Parallelism rationale |
|---|---|---|
| core-contracts | T-001 | Shared contracts/reducer establish semantic base. |
| github-adapter | T-002 | Begins after contracts; isolated network adapter. |
| backend-runtime | T-003 | Integrates collector + reducer + storage/API. |
| web-ui | T-004 | Can develop against shared contracts/demo snapshot once API shape exists. |
| validation | T-005 | Converges implementation into replay/CI validation. |
| docs-release | T-006 | Documentation evolves in parallel but final closeout depends on validated implementation. |

## Planning DAG

| Task | Issue | Lane | Depends On | Parallel | Output | Review Policy | Status |
|---|---|---|---|---|---|---|---|
| T-001 | #2 | core-contracts | — | YES | contracts + reducer | recommended | DOING |
| T-002 | #3 | github-adapter | T-001 | YES | GET-only fact collector | recommended | DOING |
| T-003 | #4 | backend-runtime | T-001,T-002 | NO | SQLite + sync + API | recommended | DOING |
| T-004 | #5 | web-ui | T-001,T-003 | YES | React observer | recommended | DOING |
| T-005 | #6 | validation | T-001..T-004 | NO | replay/tests/CI | recommended | DOING |
| T-006 | #7 | docs-release | T-001..T-005 | YES | docs/package/release | recommended | DOING |

This checkpoint is planning/history only. GitHub Issue state/dependencies/events are live execution facts when supported by the connected capability.
