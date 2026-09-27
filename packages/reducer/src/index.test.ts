import { describe, expect, it } from 'vitest';
import type { RepositoryFacts } from '@ads-plane/contracts';
import { parseAgentEvent, parseIssueBodyEvent, reduceRepositoryFacts } from './index.js';

const baseFacts: RepositoryFacts = {
  repository: 'acme/project',
  defaultBranch: 'main',
  defaultBranchSha: 'main-sha',
  repositoryVersion: '0.1.0',
  standardVersion: '4.0.0',
  issues: [
    { number: 10, id: 10, title: 'T-001 — contract', body: 'Lane: core\nDepends On: —\nReview Policy: required\nRisk: high', state: 'closed', labels: [], assignees: [], htmlUrl: 'https://example/10', updatedAt: '2026-01-01T00:00:00Z' },
    { number: 11, id: 11, title: 'T-002 — adapter', body: 'Lane: adapter\nDepends On: #10\nReview Policy: recommended\nRisk: medium\nPR #21', state: 'open', labels: [], assignees: [], htmlUrl: 'https://example/11', updatedAt: '2026-01-01T00:00:00Z' },
    { number: 12, id: 12, title: 'T-003 — ui', body: 'Lane: ui\nDepends On: #99\nReview Policy: not-required\nRisk: low', state: 'open', labels: [], assignees: [], htmlUrl: 'https://example/12', updatedAt: '2026-01-01T00:00:00Z' }
  ],
  dependencies: [
    { issueNumber: 10, blockedBy: [], source: 'native' },
    { issueNumber: 11, blockedBy: [10], source: 'native' },
    { issueNumber: 12, blockedBy: [99], source: 'native' }
  ],
  pullRequests: [
    { number: 21, title: 'T-002 adapter', state: 'open', merged: false, headSha: 'head-2', baseSha: 'main-sha', headRef: 'task/t2', baseRef: 'main', htmlUrl: 'https://example/pr21', updatedAt: '2026-01-01T00:00:00Z' }
  ],
  workflowRuns: [
    { id: 31, name: 'ci', event: 'pull_request', status: 'completed', conclusion: 'success', headSha: 'head-2', htmlUrl: 'https://example/run31', updatedAt: '2026-01-01T00:00:00Z' }
  ],
  comments: [
    { id: 41, issueNumber: 11, body: 'event: REVIEW_RESULT\nstatus: PASS\nhead_sha: old-head\noccurred_at: 2026-01-01T00:00:00Z', htmlUrl: 'https://example/c41', createdAt: '2026-01-01T00:00:00Z', updatedAt: '2026-01-01T00:00:00Z', author: 'bot' },
    { id: 42, issueNumber: 11, body: 'event: VALIDATION_RESULT\nstatus: PASS\nhead_sha: head-2\noccurred_at: 2026-01-01T00:01:00Z', htmlUrl: 'https://example/c42', createdAt: '2026-01-01T00:01:00Z', updatedAt: '2026-01-01T00:01:00Z', author: 'validator' }
  ],
  events: [],
  artifacts: [],
  collectedAt: '2026-01-01T00:02:00Z'
};
baseFacts.events = baseFacts.comments.map(parseAgentEvent).filter((v): v is NonNullable<typeof v> => Boolean(v));

describe('reduceRepositoryFacts', () => {
  it('derives queues, lanes, blockers and stale exact-SHA evidence deterministically', () => {
    const first = reduceRepositoryFacts(baseFacts);
    const second = reduceRepositoryFacts(structuredClone(baseFacts));
    expect(second).toEqual(first);
    expect(first.progress.total).toBe(3);
    expect(first.progress.done).toBe(1);
    expect(first.workItems.find((v) => v.issueNumber === 11)?.review.stale).toBe(true);
    expect(first.workItems.find((v) => v.issueNumber === 11)?.validation.stale).toBe(false);
    expect(first.workItems.find((v) => v.issueNumber === 12)?.workflowState).toBe('blocked');
    expect(first.queues.blocked).toEqual([12]);
    expect(first.lanes.map((v) => v.id)).toEqual(['adapter', 'core', 'ui']);
  });

  it('prefers native dependency facts over body fallback', () => {
    const snapshot = reduceRepositoryFacts(baseFacts);
    expect(snapshot.workItems.find((v) => v.issueNumber === 11)?.blockedBy).toEqual([10]);
  });
});

describe('parseAgentEvent', () => {
  it('reads durable key/value event comments', () => {
    const parsed = parseAgentEvent({
      id: 1, issueNumber: 2, author: 'agent', htmlUrl: 'https://example', createdAt: 'x', updatedAt: 'x',
      body: 'schema: ai-dev/event:v2\nevent: DISPATCH_CLAIMED\ndispatch_id: D-1\noperator_id: web-1\nstatus: RUNNING'
    });
    expect(parsed?.event).toBe('DISPATCH_CLAIMED');
    expect(parsed?.dispatchId).toBe('D-1');
    expect(parsed?.operatorId).toBe('web-1');
  });
});

describe('v3.4-style issue-body events and task-id dependencies', () => {
  const implementationBody = (taskId: string, dependsOn?: string) => `<!-- ai-dev:event:v2 -->
event: IMPLEMENTATION_TASK
task_id: ${taskId}
parent_dag: #9
${dependsOn ? `depends_on_task_ids: [${dependsOn}]` : ''}
merge_target: version/v0.1

Status: ${dependsOn ? `WAITING_DEPENDENCY(${dependsOn})` : 'READY'}.`;

  const v34Facts: RepositoryFacts = {
    repository: 'acme/dac',
    defaultBranch: 'main',
    defaultBranchSha: 'main-sha',
    issues: [
      { number: 40, id: 40, title: '[v0.1 T401] Orchestration core', body: implementationBody('T401'), state: 'open', labels: [], assignees: [], htmlUrl: 'https://example/40', updatedAt: '2026-01-01T00:00:00Z' },
      { number: 42, id: 42, title: '[v0.1 T403] Conformance closure', body: implementationBody('T403', 'T401'), state: 'open', labels: [], assignees: [], htmlUrl: 'https://example/42', updatedAt: '2026-01-01T00:00:00Z' },
      { number: 84, id: 84, title: '[v0.1 T403] Fresh Independent Review — PR #90 exact HEAD', body: 'Parent task: #42 / T403\nPR: #90', state: 'closed', labels: [], assignees: [], htmlUrl: 'https://example/84', updatedAt: '2026-01-01T00:00:00Z' },
      { number: 94, id: 94, title: '[v0.1 T403R1] Fresh Independent rereview — repaired HEAD', body: 'event: REVIEW_RESULT\nstatus: PASS\nhead_sha: sha-90', state: 'open', labels: [], assignees: [], htmlUrl: 'https://example/94', updatedAt: '2026-01-01T00:00:00Z' },
      { number: 95, id: 95, title: '[v0.1 T404] Repository validation', body: 'event: VALIDATION_RESULT\nstatus: PASS\nhead_sha: sha-90', state: 'open', labels: [], assignees: [], htmlUrl: 'https://example/95', updatedAt: '2026-01-01T00:00:00Z' }
    ],
    dependencies: [],
    pullRequests: [
      { number: 90, title: 'feat(T403): conformance', state: 'open', merged: false, headSha: 'sha-90', baseSha: 'main-sha', headRef: 'task/t403', baseRef: 'main', htmlUrl: 'https://example/pr90', updatedAt: '2026-01-01T00:00:00Z' }
    ],
    workflowRuns: [],
    comments: [],
    events: [],
    artifacts: [],
    collectedAt: '2026-01-01T00:01:00Z'
  };
  v34Facts.events = v34Facts.issues.map(parseIssueBodyEvent).filter((v): v is NonNullable<typeof v> => Boolean(v));

  it('classifies implementation vs evidence issues and keeps one work item per task', () => {
    const snapshot = reduceRepositoryFacts(v34Facts);
    expect(snapshot.workItems.map((v) => v.taskId).sort()).toEqual(['T401', 'T403', 'T404']);
    expect(snapshot.progress.total).toBe(3);
    // review issue #84 and rereview #94 are evidence for T403, not separate work items
    expect(snapshot.workItems.find((v) => v.issueNumber === 84)).toBeUndefined();
    expect(snapshot.workItems.find((v) => v.issueNumber === 94)).toBeUndefined();
  });

  it('resolves depends_on_task_ids to the implementation issue and blocks the task', () => {
    const snapshot = reduceRepositoryFacts(v34Facts);
    const t403 = snapshot.workItems.find((v) => v.taskId === 'T403');
    expect(t403?.blockedBy).toEqual([40]);
    expect(t403?.blockingDependencies).toEqual([40]);
    expect(t403?.workflowState).toBe('blocked');
    expect(snapshot.queues.blocked).toEqual([42]);
    expect(t403?.provenance.some((p) => p.ref === 'body-task-ids:#42')).toBe(true);
  });

  it('attaches evidence-issue body events to the matching implementation work item', () => {
    const snapshot = reduceRepositoryFacts(v34Facts);
    const t403 = snapshot.workItems.find((v) => v.taskId === 'T403');
    expect(t403?.review.state).toBe('PASS');
    expect(t403?.review.exactSha).toBe('sha-90');
    expect(t403?.review.provenance[0]?.ref).toBe('issue:#94');
  });

  it('binds the PR through evidence-issue references and applies validation evidence', () => {
    const snapshot = reduceRepositoryFacts(v34Facts);
    const t403 = snapshot.workItems.find((v) => v.taskId === 'T403');
    expect(t403?.pullRequest?.number).toBe(90);
    // T404 has no implementation issue: the repository-validation issue keeps the task visible
    const t404 = snapshot.workItems.find((v) => v.taskId === 'T404');
    expect(t404?.issueNumber).toBe(95);
    expect(t404?.validation.state).toBe('PASS');
  });

  it('normalizes rereview suffixes (T403R1 -> T403) deterministically', () => {
    const snapshot = reduceRepositoryFacts(structuredClone(v34Facts));
    expect(snapshot.workItems.find((v) => v.taskId === 'T403R1')).toBeUndefined();
    expect(snapshot).toEqual(reduceRepositoryFacts(structuredClone(v34Facts)));
  });
});

describe('blocked-by markdown-list dependency variant', () => {
  const listFacts: RepositoryFacts = {
    repository: 'acme/sim', defaultBranch: 'main', defaultBranchSha: 'sha',
    issues: [
      { number: 12, id: 12, title: 'T-101 — scaffold', body: '### Dependencies\n\n- blocked by: none\n', state: 'closed', labels: [], assignees: [], htmlUrl: 'u', updatedAt: 'now' },
      { number: 13, id: 13, title: 'T-102 — contracts', body: '### Dependencies\n\n- blocked by: T-101 (#12)\n', state: 'open', labels: [], assignees: [], htmlUrl: 'u', updatedAt: 'now' },
      { number: 14, id: 14, title: 'T-103 — engine', body: '### Dependencies\n\n- blocked by: T-102\n', state: 'open', labels: [], assignees: [], htmlUrl: 'u', updatedAt: 'now' }
    ],
    dependencies: [], pullRequests: [], workflowRuns: [], comments: [], events: [], artifacts: [], collectedAt: 'now'
  };

  it('parses `- blocked by:` lists using issue refs directly and task ids via task keys', () => {
    const snapshot = reduceRepositoryFacts(listFacts);
    const t102 = snapshot.workItems.find((v) => v.taskId === 'T-102');
    expect(t102?.blockedBy).toEqual([12]);
    // #12 is closed, so the dependency is satisfied and T-102 is not blocked
    expect(t102?.blockingDependencies).toEqual([]);
    const t103 = snapshot.workItems.find((v) => v.taskId === 'T-103');
    expect(t103?.blockedBy).toEqual([13]);
    expect(snapshot.queues.blocked).toEqual([14]);
  });

  it('keeps none as no dependency', () => {
    const snapshot = reduceRepositoryFacts(listFacts);
    expect(snapshot.workItems.find((v) => v.taskId === 'T-101')?.blockedBy).toEqual([]);
  });
});
