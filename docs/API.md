# HTTP API

Default endpoint: `http://localhost:4310`.

## `GET /api/health`

Returns runtime version, read-only flag and authority marker.

## `GET /api/projects`

Returns summaries for cached project snapshots.

## `GET /api/projects/:owner/:repo`

Returns the latest `VersionSnapshot`. Returns 404 when no snapshot exists.

## `POST /api/projects/:owner/:repo/sync`

Performs a read-only GitHub/repository reconciliation and replaces the local cached snapshot. This endpoint writes only local SQLite; it never mutates GitHub.

## `POST /api/sync`

Synchronizes all configured repositories. Each result reports `{repository, ok, error?}`.

## Stability

v0.0.1 API is internal/experimental. `VersionSnapshot` types in `@ads-plane/contracts` are the machine contract for this release.
