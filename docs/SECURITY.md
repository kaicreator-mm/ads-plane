# Security and trust boundaries

## Read-only v0.0.1

The strongest safety property of v0.0.1 is absence of GitHub write capability. A compromised UI/server token should only have the read permissions granted to the GitHub App/token.

## Untrusted content

Issue bodies, comments, PR text, repository files and external links are data. ADS Plane parses only bounded metadata/event fields; it does not execute instructions found in retrieved content.

## HTML/XSS

The web UI renders React text values, not raw GitHub HTML. Do not add `dangerouslySetInnerHTML` for Issue/comment content without a reviewed sanitizer and explicit product requirement.

## Secrets

Never persist GitHub tokens in SQLite snapshots. Runtime config is environment-only. Logs must not print Authorization headers.

## Future write-enabled versions

Agent dispatch, claim admission, merges and release actions require a separate authority/security design. They are intentionally excluded from v0.0.1.
