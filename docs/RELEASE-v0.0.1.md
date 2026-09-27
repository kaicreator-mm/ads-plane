> 🌐 English | [中文](zh/RELEASE-v0.0.1.md)

# ADS Plane v0.0.1 release notes

## Theme

First read-only observer for projects adopting AI Development Standard.

## Included

- TypeScript monorepo and shared machine contracts;
- deterministic workflow/evidence reducer;
- GitHub GET-only fact collector with native Issue Dependencies support;
- rebuildable SQLite read model;
- Node/Fastify API with startup/periodic/manual reconciliation;
- React observer UI with progress, lanes, DAG, queues, Agent/dispatch activity, evidence matrix, stale exact-SHA warnings and task provenance;
- deterministic demo mode;
- tests, CI, Docker path and comprehensive documentation.

## Known limitations

- v0.0.1 keeps only the latest snapshot per repository rather than a historical time-series;
- event parsing supports the stable key/value surfaces used by current ADS workflows but is not a generic Markdown interpreter;
- periodic/full reconciliation is intentionally simple; webhook incremental collection is deferred;
- native dependency fallback uses `Depends On` body fields when the API/capability does not expose dependency facts;
- no GitHub writes or Agent control actions are present.
