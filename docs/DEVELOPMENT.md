# Development guide

## Requirements

- Node.js 22+
- npm 10+

## Install

```bash
npm install
```

## Validate

```bash
npm run check
```

This runs strict typechecking, Vitest and production builds for all workspaces.

## Development servers

Terminal 1:

```bash
ADS_DEMO=1 npm run dev
```

Terminal 2:

```bash
npm run dev:web
```

Vite proxies `/api` to port 4310.

## Package rules

- contracts must not import adapter/storage/server code;
- reducer must remain pure and deterministic;
- GitHub adapter must remain read-only;
- storage cannot become project authority;
- web must consume VersionSnapshot rather than inventing independent workflow semantics.

## Adding reducer semantics

Add a replay/negative fixture first, then implement the smallest deterministic rule. Keep provenance for any fallback/heuristic. New authoritative meanings should first be defined in `ai-development-standard`, not invented by ADS Plane.
