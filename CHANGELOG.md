# Changelog

## Unreleased

- ai-development-standard v3.4-style project compatibility, from the domain-ai-creator trial (#18):
  - `.dev-standard/VERSION` / `VERSION` artifacts now parse key=value pin blocks (`version=3.4.0`) instead of rendering the whole file.
  - Structured `ai-dev:event:v2` blocks in issue bodies are parsed alongside comment events and attributed to their task, so gates recorded on dedicated review/validation issues attach to the matching implementation task.
  - `depends_on_task_ids: [Txxx]` body fields resolve to issue numbers via task keys; native dependency entries merge with (rather than silence) body-derived edges; new `body-task-ids` provenance.
  - One work item per task id: review/rereview issues are classified as evidence instead of phantom tasks, `T203R1` suffixes normalize to `T203`, and evidence-only tasks stay visible.
  - Net effect on the trial repo: 41 → 29 work items, dependency edges 0 → 84, `ADS 3.4.0` rendered, blocked queue populated; the v4-style repo reduces 91 → 13 tasks with candidate/release states resolved.
- Documentation: added Chinese translations for all docs under `docs/zh/`, a root `README.zh-CN.md`, and cross-language links. English remains canonical (#16).
- UI runtime configuration, localization and UX pass (#14):
  - Settings drawer manages the GitHub token and repository list at runtime (`/api/settings`); env vars remain boot defaults. Token is memory-only, returned as a masked hint, never persisted.
  - Repository syncs run in the background with per-repo status (`syncing`/`ok`/`error`) instead of blocking HTTP requests.
  - UI localized in English and Chinese with a header language toggle (persisted per browser); workflow/gate/candidate/dispatch states and all labels translate consistently; technical identifiers (`NON_AUTHORITATIVE_DERIVED_STATE`, issue numbers, SHAs) stay untranslated.
  - UX conventions: dialog drawers with Esc/backdrop close and `role="dialog"`, two-step confirmation for repository removal, inline form validation, sync feedback toasts, demo-mode badge with sync disabled, locale-aware dates.
- Hardening from the v0.0.1 real-browser validation (#11):
  - Fixed the default web dist resolution so `npm start -w @ads-plane/server` serves the UI regardless of working directory (#9 P2-1).
  - Fixed narrow-viewport header overflow; repository selector and Sync now wrap (#9 P2-2).
  - GitHub collector fetches per-issue dependencies/comments with bounded concurrency (default 6, `maxConcurrency` option) and the server listens before the initial background sync completes (#9 P2-3).
  - Added per-lane labels and stronger edge contrast to the DAG canvas; demo fixture now carries task-level provenance; `ADS unknown` subtitle segment omitted when the standard version is absent (#9 P3-5..P3-7).
  - Corrected the demo env var in the browser-validation handoff (`ADS_DEMO=1`) and raised the server API test timeout (#9 P3-4, P3-8).
- Upgraded dev tooling `vitest` to `^5.0.2`, clearing both moderate audit findings (GHSA-82fw-gwwq-j7x9) (#10).

## 0.0.1

- Initial ADS Plane read-only Development Observer.
- Added TypeScript contracts, deterministic reducer and GitHub read-only collector.
- Added SQLite read model, Fastify API and React lane/DAG/evidence UI.
- Added demo/replay validation, CI, Docker packaging and full operator/developer documentation.
