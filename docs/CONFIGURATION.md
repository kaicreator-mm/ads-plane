# Configuration

Configuration comes from two layers:

1. **Boot defaults (environment)** — read once at server start.
2. **Runtime settings (UI)** — the in-app Settings drawer manages the GitHub token and repository list at runtime; changes apply immediately without a restart.

The UI language (English/中文) is a client-side preference persisted in `localStorage`.

## Environment variables (boot defaults)

| Variable | Default | Purpose |
|---|---|---|
| `ADS_GITHUB_TOKEN` | empty | Initial read-only GitHub token/installation token. Public repos can work without it. Can be replaced later in Settings. |
| `ADS_REPOSITORIES` | empty | Comma-separated `owner/repo` entries, optional `@version` hint. Registered at boot; more can be added in Settings. |
| `ADS_DATA_DIR` | `.data` | SQLite/cache directory. |
| `ADS_PORT` | `4310` | HTTP port. |
| `ADS_HOST` | `0.0.0.0` | Listen address. |
| `ADS_SYNC_INTERVAL_SECONDS` | `300` | Periodic reconciliation; `0` disables. |
| `ADS_DEMO` | `0` | `1` loads bundled deterministic demo snapshot (sync disabled). |
| `ADS_WEB_DIST` | `apps/web/dist` | Production web asset path (anchored to the server module). |

Examples:

```bash
ADS_DEMO=1 npm start -w @ads-plane/server
```

```bash
ADS_GITHUB_TOKEN=... \
ADS_REPOSITORIES=kaicreator-mm/ai-development-standard@4.0.0,kaicreator-mm/domain-harness@v0.3 \
npm start -w @ads-plane/server
```

## Runtime settings API

The Settings drawer in the web UI calls these endpoints; they are also usable directly:

| Method & path | Purpose |
|---|---|
| `GET /api/settings` | Current repositories, token status (masked hint, never the token), per-repo sync status. |
| `PUT /api/settings/github-token` | `{token}` — set or clear (empty string) the runtime token. Memory-only. |
| `POST /api/settings/repositories` | `{repository: "owner/repo@version"}` — register and sync in the background. `syncNow: false` registers only. |
| `DELETE /api/settings/repositories/:owner/:repo` | Unregister a repository and drop its cached snapshot. |
| `POST /api/projects/:owner/:repo/sync` | Trigger a background re-sync of a configured repository. |

Repository syncs run in the background; progress is reflected in the per-repository sync status (`syncing` / `ok` / `error`) polled by the UI.
