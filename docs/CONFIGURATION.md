# Configuration

All v0.0.1 configuration is environment-based.

| Variable | Default | Purpose |
|---|---|---|
| `ADS_GITHUB_TOKEN` | empty | Read-only GitHub token/installation token. Public repos can work without it. |
| `ADS_REPOSITORIES` | empty | Comma-separated `owner/repo` entries, optional `@version` hint. |
| `ADS_DATA_DIR` | `.data` | SQLite/cache directory. |
| `ADS_PORT` | `4310` | HTTP port. |
| `ADS_HOST` | `0.0.0.0` | Listen address. |
| `ADS_SYNC_INTERVAL_SECONDS` | `300` | Periodic reconciliation; `0` disables. |
| `ADS_DEMO` | `0` | `1` loads bundled deterministic demo snapshot. |
| `ADS_WEB_DIST` | `apps/web/dist` | Production web asset path. |

Examples:

```bash
ADS_DEMO=1 npm start -w @ads-plane/server
```

```bash
ADS_GITHUB_TOKEN=... \
ADS_REPOSITORIES=kaicreator-mm/ai-development-standard@4.0.0,kaicreator-mm/domain-harness@v0.3 \
npm start -w @ads-plane/server
```
