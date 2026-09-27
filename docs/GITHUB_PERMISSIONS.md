> 🌐 English | [中文](zh/GITHUB_PERMISSIONS.md)

# GitHub permissions

v0.0.1 is intentionally read-only.

## Recommended GitHub App repository permissions

- Metadata: read (implicit/required by GitHub Apps)
- Contents: read
- Issues: read
- Pull requests: read
- Actions: read
- Checks: read only if your deployment later chooses to collect check-run detail beyond workflow runs

The native Issue Dependencies read endpoint is covered by Issues read permission.

## Runtime safety rule

`GitHubReadOnlyClient` exposes only GET requests. There are no create/update/delete/merge methods in the runtime package. Local `POST /sync` endpoints mean "refresh local projection", not "POST to GitHub".

## Token handling

Do not commit tokens. Prefer a GitHub App installation token with short lifetime, supplied through the runtime environment/secret manager. `ADS_GITHUB_TOKEN` is an injection point and does not require a classic PAT.
