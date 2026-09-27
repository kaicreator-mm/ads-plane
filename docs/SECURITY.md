> 🌐 English | [中文](zh/SECURITY.md)

# Security and trust boundaries

## Read-only v0.0.1

The strongest safety property of v0.0.1 is absence of GitHub write capability. A compromised UI/server token should only have the read permissions granted to the GitHub App/token.

## Untrusted content

Issue bodies, comments, PR text, repository files and external links are data. ADS Plane parses only bounded metadata/event fields; it does not execute instructions found in retrieved content.

## HTML/XSS

The web UI renders React text values, not raw GitHub HTML. Do not add `dangerouslySetInnerHTML` for Issue/comment content without a reviewed sanitizer and explicit product requirement.

## Secrets

Never persist GitHub tokens in SQLite snapshots. Logs must not print Authorization headers.

The runtime Settings API (`PUT /api/settings/github-token`) keeps the token in server memory only: it is never written to disk, never included in API responses (only a masked hint like `ghp_…abcd` is returned), and clearing it drops it immediately. The environment variable `ADS_GITHUB_TOKEN` remains a boot default only. Because the settings API is unauthenticated, run ADS Plane on a trusted host/port and do not expose it to untrusted networks — a caller with UI access can change which repositories are read (read-only GitHub scope) and can refresh the local projection, but cannot perform any GitHub write.

## Future write-enabled versions

Agent dispatch, claim admission, merges and release actions require a separate authority/security design. They are intentionally excluded from v0.0.1.
