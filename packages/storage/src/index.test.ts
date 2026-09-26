import { describe, expect, it } from 'vitest';
import type { VersionSnapshot } from '@ads-plane/contracts';
import { SnapshotStore } from './index.js';

const snapshot: VersionSnapshot = {
  repository: 'acme/proj', version: '0.1.0', generatedAt: '2026-01-01T00:00:00Z', authorityNotice: 'NON_AUTHORITATIVE_DERIVED_STATE',
  progress: {total: 1, done: 0, running: 0, ready: 1, blocked: 0, mergeReady: 0, percent: 0},
  candidateState: 'UNKNOWN', releaseState: 'UNKNOWN',
  queues: {builder: [1], reviewer: [], validator: [], merge: [], blocked: []},
  lanes: [], workItems: [], provenance: []
};

describe('SnapshotStore', () => {
  it('persists rebuildable snapshots and summaries', () => {
    const store = new SnapshotStore();
    store.save(snapshot);
    expect(store.get('acme/proj')).toEqual(snapshot);
    expect(store.listSummaries()[0]?.repository).toBe('acme/proj');
    store.close();
  });
});
