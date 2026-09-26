# Local Browser Validation Handoff — v0.0.1

Use this only on a machine with Node.js 22+, npm registry access and a real Chromium/Chrome-class browser.

## Candidate

Validate the exact `version/v0.0.1` HEAD recorded in the tracking Issue before starting. If the branch moves, stop and re-bind to the new exact SHA.

## Setup

```bash
npm install
npm run check
ADS_PLANE_DEMO=true npm run dev
npm run dev:web
```

Open the UI and verify desktop plus narrow/mobile-class viewport behavior.

## Required checks

1. Version Overview renders without console/runtime errors.
2. Lane/DAG nodes are readable and dependency direction is understandable.
3. READY/RUNNING/BLOCKED/MERGE READY queues match the demo fixture.
4. Agent/Dispatch activity renders role/operator/state correctly.
5. Evidence matrix clearly distinguishes PASS/FAIL/BLOCKED/NOT_RUN and stale exact-SHA evidence.
6. Selecting a task exposes task detail and provenance/activity information.
7. `NON_AUTHORITATIVE_DERIVED_STATE` notice is visible.
8. Narrow viewport remains usable without losing critical state information.
9. Server demo mode boots successfully.
10. Optional live mode against a read-only GitHub token can sync a configured repository without any GitHub mutation.

## Result

Record exact SHA, browser/OS, viewport(s), PASS/FAIL, screenshots if useful, console errors, and any P0/P1/P2/P3 findings in the tracking Issue. Do not call the browser pass PASS for a different HEAD.
