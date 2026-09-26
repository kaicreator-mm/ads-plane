# Operations

## Health

`GET /api/health` returns the ADS Plane runtime version and read-only authority marker.

## Synchronization

- startup: all configured repositories are reconciled once;
- periodic: controlled by `ADS_SYNC_INTERVAL_SECONDS`;
- manual: `POST /api/projects/:owner/:repo/sync` or `POST /api/sync`.

A sync failure does not erase the last good cached snapshot. The API reports the error while the existing snapshot remains available.

## Backup

The SQLite file is disposable. Backup is optional. To rebuild:

```bash
rm -f .data/ads-plane.db*
npm start -w @ads-plane/server
```

The configured repositories are normally supplied by environment. If you rely only on registrations made through API sync, re-provide their repository coordinates after deleting the database.

## Rate limits

Authenticated GitHub access is recommended for multiple/private projects. Large organizations should move to webhook-assisted incremental sync in a later ADS Plane release rather than aggressive polling.

## Logs

Fastify emits structured server logs. Collector errors include the GitHub GET path and HTTP status, with response bodies truncated to avoid log amplification.
