# ADS Plane

> 🌐 English | [中文](README.zh-CN.md)

**ADS Plane** is the read-only observer and future control-plane foundation for projects adopting [AI Development Standard](https://github.com/kaicreator-mm/ai-development-standard).

Version: **0.0.1**

ADS Plane reads GitHub and repository durable facts, deterministically reduces them into project/version state, and visualizes that state without becoming a second source of truth.

> Every UI snapshot is `NON_AUTHORITATIVE_DERIVED_STATE`. GitHub Issues, native Issue Dependencies, PR/exact-SHA evidence, structured events and repository artifacts remain authoritative.

## What v0.0.1 shows

- version progress and candidate/release state;
- lane-oriented Task DAG and dependency blockers;
- Builder / Reviewer / Validator / Merge / Blocked queues;
- active Agent/dispatch facts;
- CI / Review / Validation evidence matrix;
- stale exact-SHA PASS warnings;
- Task details, PR identity and provenance;
- deterministic demo mode for evaluation without credentials.

## Architecture

```text
GitHub REST + repository files
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
         /       \
   SQLite cache   HTTP API
                     |
                     v
                  React UI
```

The runtime is intentionally GitHub read-only in v0.0.1. Local synchronization endpoints only refresh the SQLite projection.

## Requirements

- Node.js 22+
- npm 10+

## Quick start — demo

```bash
npm install
npm run build
ADS_DEMO=1 npm start -w @ads-plane/server
```

Open `http://localhost:4310`.

Demo mode loads a deterministic project snapshot showing DONE, RUNNING, READY, BLOCKED, stale evidence and dispatch activity.

## Quick start — real GitHub repositories

Copy `.env.example` or export variables:

```bash
export ADS_GITHUB_TOKEN='<read-only token or GitHub App installation token>'
export ADS_REPOSITORIES='kaicreator-mm/ai-development-standard@4.0.0'

npm install
npm run build
npm start -w @ads-plane/server
```

Public repositories can be read without a token, but authenticated access is recommended for rate limits and required for private repositories.

Alternatively, start with no repositories configured and add them at runtime: open the UI, click **Settings**, paste a read-only GitHub token and add repositories (`owner/repo@version`). The token is kept in server memory only and is never displayed again. See [Configuration](docs/CONFIGURATION.md).

Multiple repositories:

```bash
ADS_REPOSITORIES='owner/project-a@v1.2,owner/project-b@v0.4' npm start -w @ads-plane/server
```

The UI is localized in English and Chinese; switch languages with the `EN / 中文` toggle in the header (the choice is remembered per browser).

## Development

```bash
npm install
npm run check
```

For live development:

```bash
# terminal 1
ADS_DEMO=1 npm run dev

# terminal 2
npm run dev:web
```

The Vite dev server proxies `/api` to ADS Plane server port `4310`.

## Docker

```bash
docker compose up --build
```

By default `compose.yaml` starts demo mode. Override environment variables for real repositories.

## Repository structure

```text
apps/
  server/              Fastify sync/API runtime
  web/                 React observer UI
packages/
  contracts/           durable fact + read-model TypeScript contracts
  reducer/             pure deterministic reducer
  github-adapter/      GitHub GET-only collector
  storage/             rebuildable SQLite snapshot cache
docs/
  PRD-v0.0.1.md
  ARCHITECTURE-v0.0.1.md
  TASK_DAG-v0.0.1.md
  API.md
  CONFIGURATION.md
  DATA_MODEL.md
  GITHUB_PERMISSIONS.md
  OPERATIONS.md
  DEVELOPMENT.md
  SECURITY.md
```

## Read-only security model

The recommended production setup is a GitHub App with repository permissions limited to read access for Contents, Issues, Pull Requests and Actions. `GitHubReadOnlyClient` contains only GET requests. There are no Issue update, dependency mutation, merge or dispatch actions in v0.0.1.

## ADS standard pin

v0.0.1 adopts:

- `ai-development-standard` version `4.0.0`
- pinned revision `88aa35a6ac6ceec859c7c1d9114828873842c0c5`

See `.dev-standard/PROJECT_OVERRIDES.md`.

## Documentation

English docs are canonical; Chinese translations live in [`docs/zh/`](docs/zh/) (see also the [Chinese README](README.zh-CN.md)). Where translations diverge, the English version wins.

- [Product requirements](docs/PRD-v0.0.1.md) · [中文](docs/zh/PRD-v0.0.1.md)
- [Architecture](docs/ARCHITECTURE-v0.0.1.md) · [中文](docs/zh/ARCHITECTURE-v0.0.1.md)
- [Task DAG](docs/TASK_DAG-v0.0.1.md) · [中文](docs/zh/TASK_DAG-v0.0.1.md)
- [API](docs/API.md) · [中文](docs/zh/API.md)
- [Configuration](docs/CONFIGURATION.md) · [中文](docs/zh/CONFIGURATION.md)
- [Data model](docs/DATA_MODEL.md) · [中文](docs/zh/DATA_MODEL.md)
- [GitHub permissions](docs/GITHUB_PERMISSIONS.md) · [中文](docs/zh/GITHUB_PERMISSIONS.md)
- [Operations](docs/OPERATIONS.md) · [中文](docs/zh/OPERATIONS.md)
- [Development](docs/DEVELOPMENT.md) · [中文](docs/zh/DEVELOPMENT.md)
- [Security](docs/SECURITY.md) · [中文](docs/zh/SECURITY.md)
- [Release notes](docs/RELEASE-v0.0.1.md) · [中文](docs/zh/RELEASE-v0.0.1.md)
- [Validation](docs/VALIDATION.md) · [中文](docs/zh/VALIDATION.md)
- [Browser validation handoff](docs/HANDOFF_BROWSER_VALIDATION.md) · [中文](docs/zh/HANDOFF_BROWSER_VALIDATION.md)

## Roadmap after v0.0.1

The reducer/read model is intentionally separated from controllers. Future versions can add webhook incremental sync, history/time-series, serialized Agent claim admission, dispatch, Review/Validation routing, Merge Controller, Candidate Freeze and Release Controller without redefining GitHub durable authority.
