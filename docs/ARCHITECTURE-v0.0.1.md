> 🌐 English | [中文](zh/ARCHITECTURE-v0.0.1.md)

# ADS Plane v0.0.1 Architecture

Status: Frozen for v0.0.1

## Architecture drivers

1. GitHub/repository remain durable authority.
2. Derived state must be deterministic and rebuildable.
3. Runtime must be read-only toward GitHub in v0.0.1.
4. Exact identities and evidence provenance must survive presentation.
5. The same reducer should be reusable by future CLI, scheduler and controller layers.
6. First deployment must be lightweight: one Node process + SQLite + static web assets.

## System

```text
GitHub REST + repository contents
            |
            v
   GitHubReadOnlyClient
            |
            v
       RepositoryFacts
            |
            v
   deterministic reducer
            |
            v
       VersionSnapshot
            |
       +----+-----+
       |          |
    SQLite      HTTP API
     cache         |
                   v
               React UI
```

## Package boundaries

- `@ads-plane/contracts`: canonical fact and read-model TypeScript types. No network/storage logic.
- `@ads-plane/reducer`: pure parsing/reduction. No network/storage imports.
- `@ads-plane/github-adapter`: GitHub GET-only fact collection.
- `@ads-plane/storage`: rebuildable SQLite snapshot cache.
- `@ads-plane/server`: configuration, synchronization and HTTP API.
- `@ads-plane/web`: browser observer UI.

## Authority boundary

ADS Plane does not own workflow truth. The VersionSnapshot contains `authorityNotice = NON_AUTHORITATIVE_DERIVED_STATE`. If the UI conflicts with current Issues, native Issue Dependencies, PR HEAD/evidence or structured events, the correct operation is to sync/reduce again—not to modify GitHub to match the UI.

## Dependency semantics

The collector prefers GitHub's native Issue Dependencies `blocked_by` endpoint. Body `Depends On: #N` parsing is a capability fallback only when native dependency facts are unavailable. The fallback is explicitly marked in provenance.

## Reducer rules

- explicit canonical `state:*` metadata wins over heuristic routing;
- closed Task Issue reduces to `done` when no explicit stronger state is present;
- unsatisfied native/body dependency reduces to `blocked` unless explicit canonical metadata says otherwise;
- current PR exact HEAD is the identity used for CI/Review/Validation staleness;
- PASS evidence whose exact SHA differs from current PR HEAD is shown as stale and does not silently migrate;
- queues are projections, not task authority;
- candidate/release state comes only from durable events when available.

## Authentication

Production recommendation: GitHub App with read-only repository permissions and installation token injection into ADS Plane. v0.0.1 runtime accepts `ADS_GITHUB_TOKEN` because installation-token lifecycle can be provided externally. Public repositories can be read without authentication subject to GitHub rate limits.

## Storage

SQLite is a cache/read model. It stores registered repository coordinates and latest snapshots. No hidden canonical state is allowed. The schema can be deleted and rebuilt by synchronization.

## Sync model

v0.0.1 provides startup sync, periodic reconciliation and explicit `POST .../sync`. Future versions may add webhook-driven dirty-object refresh, but periodic reconciliation remains useful to repair missed webhook delivery.

## Future extension points

The architecture intentionally leaves controllers outside the reducer. A future write-enabled ADS Plane can add serialized claim admission, Agent dispatch, Review/Validation routing, Merge Controller and Release Controller without changing the authority of the reducer/read model.
