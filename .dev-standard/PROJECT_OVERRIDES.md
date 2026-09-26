# ADS Plane project overrides

Pinned `ai-development-standard` revision for v0.0.1:

`88aa35a6ac6ceec859c7c1d9114828873842c0c5`

## Project-specific decisions

- Integration mode: Version Branch Mode for v0.0.1.
- Runtime is GitHub read-only. Local SQLite writes are cache/read-model writes only.
- UI/read-model state is always `NON_AUTHORITATIVE_DERIVED_STATE`.
- Node.js >= 22 is required because v0.0.1 uses `node:sqlite`.
- GitHub App installation token is the recommended production authentication model; local token/public read is a bootstrap fallback.
