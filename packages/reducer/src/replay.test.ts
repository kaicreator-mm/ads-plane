import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';
import type { RepositoryFacts } from '@ads-plane/contracts';
import { parseAgentEvent, reduceRepositoryFacts } from './index.js';

const fixturePath = fileURLToPath(new URL('../../../tests/fixtures/replay-v0.0.1.json', import.meta.url));

function loadFixture(): RepositoryFacts {
  const facts = JSON.parse(readFileSync(fixturePath, 'utf8')) as RepositoryFacts;
  facts.events = facts.comments.map(parseAgentEvent).filter((event): event is NonNullable<typeof event> => Boolean(event));
  return facts;
}

describe('v0.0.1 replay fixture', () => {
  it('reconstructs the same project state from durable facts', () => {
    const first = reduceRepositoryFacts(loadFixture());
    const second = reduceRepositoryFacts(loadFixture());
    expect(second).toEqual(first);
    expect(first.authorityNotice).toBe('NON_AUTHORITATIVE_DERIVED_STATE');
    expect(first.progress.total).toBe(4);
    expect(first.progress.done).toBe(1);
    expect(first.workItems.find((item) => item.issueNumber === 102)?.review.stale).toBe(true);
    expect(first.workItems.find((item) => item.issueNumber === 102)?.validation.stale).toBe(false);
    expect(first.workItems.find((item) => item.issueNumber === 103)?.dispatch?.operatorId).toBe('worker-a');
    expect(first.workItems.find((item) => item.issueNumber === 104)?.workflowState).toBe('blocked');
  });
});
