# ADS Plane v0.0.1 PRD — Read-only Development Observer

Status: Frozen for v0.0.1

## Problem

AI-native projects using multiple Web/Local Agents, GitHub Issues/Dependencies, PRs, exact-SHA Review/Validation and release gates accumulate enough durable evidence to reconstruct project state, but GitHub's native surfaces do not present that state as one coherent operational view. Humans repeatedly ask which tasks are READY/RUNNING/BLOCKED, which lanes can progress in parallel, which evidence is stale, which Agent owns current work, and what prevents release.

## Product statement

ADS Plane reads GitHub and repository durable facts defined by `ai-development-standard`, deterministically reduces them into a project/version read model, and visualizes that read model as `NON_AUTHORITATIVE_DERIVED_STATE`.

GitHub/repository facts remain Source of Truth. ADS Plane v0.0.1 has no GitHub write capability.

## Users

- project owners coordinating multiple AI Agents;
- Builder/Reviewer/Validator operators needing shared situational awareness;
- release owners checking evidence and closure state;
- maintainers dogfooding `ai-development-standard` adoption.

## Primary journeys

1. Open ADS Plane and immediately see version progress, candidate/release state and active lanes.
2. Inspect the Task DAG to understand real dependencies and parallel work opportunities.
3. See READY/RUNNING/BLOCKED/MERGE queues without inspecting every Issue.
4. Identify which Agent/dispatch is active on a Task.
5. Inspect CI/Review/Validation evidence and immediately spot stale exact-SHA PASS evidence.
6. Click a Task and see dependencies, PR identity, dispatch, gates and provenance.
7. Re-sync from GitHub and reproduce the same derived state without chat history.

## Functional scope

### Fact collection

Read repository/default branch identity, Issues, labels, comments, structured Agent events, native Issue `blocked_by` dependencies, pull requests, workflow runs, VERSION, `.dev-standard/VERSION` and known Task DAG artifact paths.

### Deterministic reduction

Derive workflow state, active blockers, lane progress, ready sets, current PR identity, CI/Review/Validation gates, stale evidence, dispatch activity, candidate state and release state. Reducer decisions must be pure and explainable from input facts.

### Read model/cache

SQLite stores repository configuration and the latest VersionSnapshot. Deleting the database must not destroy project authority; a re-sync rebuilds the snapshot.

### UI

Provide project selector, version overview, metrics, lane progress, DAG, ready queues, evidence matrix, dispatch activity and Task detail/provenance.

## Non-scope

- no Issue/PR/label/dependency mutations;
- no Agent dispatch or claim admission;
- no Review/Validation execution;
- no merge, Candidate Freeze or Release Qualification action;
- no LLM-based state classification;
- no general-purpose project-management replacement;
- no Postgres or distributed services.

## Success criteria

- a configured ADS project can be reduced from GitHub facts into a valid VersionSnapshot;
- state reconstruction does not require prior chats;
- native dependencies are preferred when available;
- stale exact-SHA Review/Validation evidence is visible;
- runtime adapter exposes only GitHub GET operations;
- clean install passes typecheck, tests and production build;
- demo mode shows all major states without external credentials.

## Release blockers

- TypeScript strict build failure;
- reducer nondeterminism in replay test;
- runtime GitHub write method or write permission requirement;
- inability to start server in demo mode;
- web production build failure;
- missing installation/configuration/architecture documentation.
