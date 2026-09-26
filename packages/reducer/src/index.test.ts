import { describe, expect, it } from 'vitest';
import type { RepositoryFacts } from '@ads-plane/contracts';
import { parseAgentEvent, reduceRepositoryFacts } from './index.js';

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
