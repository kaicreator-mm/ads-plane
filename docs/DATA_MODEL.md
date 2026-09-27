> 🌐 English | [中文](zh/DATA_MODEL.md)

# Data model

ADS Plane has two deliberately separate layers.

## Durable input facts

`RepositoryFacts` contains repository identity, Issues, dependencies, pull requests, workflow runs, comments/events and repository artifacts. These are adapter-normalized copies of durable external facts.

Important input identities:

- repository + default branch SHA;
- Issue number/id;
- dependency edge `issue -> blocked_by`;
- PR number + head/base SHA;
- workflow run id + head SHA;
- comment/event id;
- artifact path + blob SHA.

## Derived read model

`VersionSnapshot` is disposable and contains:

- progress totals;
- candidate/release state;
- lane summaries;
- Builder/Reviewer/Validator/Merge/Blocked queues;
- `WorkItemSnapshot[]`;
- provenance.

`WorkItemSnapshot` contains workflow state, dependencies/blockers, PR identity, dispatch, CI/Review/Validation gates and readiness projections.

Every snapshot is marked `NON_AUTHORITATIVE_DERIVED_STATE`.

## Evidence staleness

A gate can carry `exactSha`. When `state=PASS` and `exactSha != current PR headSha`, ADS Plane marks the gate `stale=true`. It does not rewrite old evidence or claim it ran on the new SHA.

## SQLite

Tables:

- `repositories(repository, version_hint, updated_at)`
- `snapshots(repository, version, generated_at, payload_json)`

The payload is the full VersionSnapshot JSON. v0.0.1 intentionally avoids a highly normalized derived database because the snapshot is a cache, not authority.
