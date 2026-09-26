# Changelog

## Unreleased

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
