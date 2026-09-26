import { describe, expect, it } from 'vitest';
import { SnapshotStore } from '@ads-plane/storage';
import { GitHubReadOnlyClient } from '@ads-plane/github-adapter';
import { buildApp } from './app.js';
import { loadConfig } from './config.js';
import { demoSnapshot } from './demo.js';
import { ObserverService } from './service.js';

describe('server API', () => {
  it('serves health, project list and derived snapshot without GitHub mutation', async () => {
    const store = new SnapshotStore();
    store.save(demoSnapshot());
    const client = new GitHubReadOnlyClient({fetchImpl: async () => { throw new Error('network not expected'); }});
    const service = new ObserverService(client, store);
    const config = loadConfig({ADS_DATA_DIR: '.data-test', ADS_PORT: '0', ADS_SYNC_INTERVAL_SECONDS: '0'});
    const app = await buildApp(config, service);
    const health = await app.inject({method:'GET',url:'/api/health'});
    expect(health.statusCode).toBe(200);
    expect(health.json().readOnly).toBe(true);
    const projects = await app.inject({method:'GET',url:'/api/projects'});
    expect(projects.json()).toHaveLength(1);
    const snapshot = await app.inject({method:'GET',url:'/api/projects/kaicreator-mm/demo-ads-project'});
    expect(snapshot.json().authorityNotice).toBe('NON_AUTHORITATIVE_DERIVED_STATE');
    await app.close();
    store.close();
  }, 20000);
});
