import { describe, expect, it } from 'vitest';
import { SnapshotStore } from '@ads-plane/storage';
import { GitHubReadOnlyClient } from '@ads-plane/github-adapter';
import { buildApp } from './app.js';
import { loadConfig } from './config.js';
import { demoSnapshot } from './demo.js';
import { ObserverService } from './service.js';

async function demoApp() {
  const store = new SnapshotStore();
  store.save(demoSnapshot());
  const client = new GitHubReadOnlyClient({fetchImpl: async () => { throw new Error('network not expected'); }});
  const service = new ObserverService(client, store);
  const config = loadConfig({ADS_DATA_DIR: '.data-test', ADS_PORT: '0', ADS_SYNC_INTERVAL_SECONDS: '0', ADS_DEMO: '1'});
  const app = await buildApp(config, service);
  return {app, store};
}

describe('runtime settings API', () => {
  it('exposes settings without ever returning the token', async () => {
    const {app, store} = await demoApp();
    const initial = await app.inject({method: 'GET', url: '/api/settings'});
    expect(initial.json()).toMatchObject({demo: true, githubTokenConfigured: false});
    expect(initial.json().repositories).toEqual([{repository: 'kaicreator-mm/demo-ads-project', versionHint: 'v0.4'}]);

    const updated = await app.inject({method: 'PUT', url: '/api/settings/github-token', payload: {token: 'ghp_secret_token_1234'}});
    expect(updated.json()).toMatchObject({githubTokenConfigured: true, githubTokenHint: 'ghp_…1234'});
    expect(JSON.stringify(updated.json())).not.toContain('ghp_secret_token_1234');

    const cleared = await app.inject({method: 'PUT', url: '/api/settings/github-token', payload: {token: ''}});
    expect(cleared.json().githubTokenConfigured).toBe(false);

    const bad = await app.inject({method: 'PUT', url: '/api/settings/github-token', payload: {}});
    expect(bad.statusCode).toBe(400);
    await app.close();
    store.close();
  }, 20000);

  it('validates, registers and removes repositories', async () => {
    const {app, store} = await demoApp();
    const invalid = await app.inject({method: 'POST', url: '/api/settings/repositories', payload: {repository: 'not-a-repo'}});
    expect(invalid.statusCode).toBe(400);

    const added = await app.inject({method: 'POST', url: '/api/settings/repositories', payload: {repository: 'acme/proj@v1.2', syncNow: false}});
    expect(added.json().repositories).toContainEqual({repository: 'acme/proj', versionHint: 'v1.2'});

    const removed = await app.inject({method: 'DELETE', url: '/api/settings/repositories/acme/proj'});
    expect(removed.json().repositories).not.toContainEqual({repository: 'acme/proj', versionHint: 'v1.2'});
    await app.close();
    store.close();
  }, 20000);

  it('rejects repo sync when unregistered or in demo mode, and reports background sync status', async () => {
    const {app, store} = await demoApp();
    const unregistered = await app.inject({method: 'POST', url: '/api/projects/acme/other/sync'});
    expect(unregistered.statusCode).toBe(404);

    await app.inject({method: 'POST', url: '/api/settings/repositories', payload: {repository: 'acme/proj', syncNow: false}});
    const demoSync = await app.inject({method: 'POST', url: '/api/projects/acme/proj/sync'});
    expect(demoSync.statusCode).toBe(409);

    const store2 = new SnapshotStore();
    const failing = new GitHubReadOnlyClient({fetchImpl: async () => { throw new Error('boom'); }});
    const service2 = new ObserverService(failing, store2);
    const liveConfig = loadConfig({ADS_DATA_DIR: '.data-test2', ADS_PORT: '0', ADS_SYNC_INTERVAL_SECONDS: '0'});
    const app2 = await buildApp(liveConfig, service2);
    await app2.inject({method: 'POST', url: '/api/settings/repositories', payload: {repository: 'acme/proj'}});
    await new Promise((resolve) => setTimeout(resolve, 50));
    const status = await app2.inject({method: 'GET', url: '/api/settings'});
    expect(status.json().syncStatus['acme/proj']).toMatchObject({state: 'error', message: 'boom'});
    await app2.close();
    store2.close();
    await app.close();
    store.close();
  }, 20000);
});

describe('account discovery API', () => {
  it('requires a token and classifies scanned repositories', async () => {
    const store = new SnapshotStore();
    const client = new GitHubReadOnlyClient({fetchImpl: async (input) => {
      const url = String(input);
      if (url.endsWith('/user')) return new Response(JSON.stringify({login: 'kaicreator-mm'}), {headers: {'content-type': 'application/json'}});
      if (url.includes('/user/repos')) return new Response(JSON.stringify([
        {full_name: 'kaicreator-mm/dac', private: true, fork: false, updated_at: 'now'},
        {full_name: 'kaicreator-mm/legacy', private: false, fork: false, updated_at: 'now'},
        {full_name: 'kaicreator-mm/plain', private: false, fork: false, updated_at: 'now'}
      ]), {headers: {'content-type': 'application/json'}});
      if (url.includes('/kaicreator-mm/dac/')) return new Response(JSON.stringify({type: 'file', name: 'VERSION', path: '.dev-standard/VERSION', sha: 's', content: Buffer.from('version=3.4.0').toString('base64'), encoding: 'base64'}), {headers: {'content-type': 'application/json'}});
      if (url.includes('/kaicreator-mm/legacy/')) return new Response(JSON.stringify({type: 'file', name: 'VERSION', path: '.dev-standard/VERSION', sha: 's', content: Buffer.from('version=2.0.0').toString('base64'), encoding: 'base64'}), {headers: {'content-type': 'application/json'}});
      return new Response(JSON.stringify({message: 'not found'}), {status: 404, headers: {'content-type': 'application/json'}});
    }});
    const service = new ObserverService(client, store);
    const config = loadConfig({ADS_DATA_DIR: '.data-test', ADS_PORT: '0'});
    const app = await buildApp(config, service);

    const noToken = await app.inject({method: 'POST', url: '/api/discovery/scan'});
    expect(noToken.statusCode).toBe(400);

    const scanned = await app.inject({method: 'POST', url: '/api/discovery/scan', headers: {authorization: 'Bearer test'}});
    expect(scanned.statusCode).toBe(400); // token only settable via settings endpoint

    await app.inject({method: 'PUT', url: '/api/settings/github-token', payload: {token: 'ghp_discovery_token_x'}});
    service.setClient(client); // keep the fetch-stubbed client after the real one was swapped in
    const result = await app.inject({method: 'POST', url: '/api/discovery/scan'});
    const view = result.json();
    expect(view.account).toBe('kaicreator-mm');
    const byName = Object.fromEntries(view.repositories.map((r: {repository: string}) => [r.repository, r]));
    expect(byName['kaicreator-mm/dac']).toMatchObject({adopted: true, monitorable: true, standardVersion: '3.4.0', monitored: false});
    expect(byName['kaicreator-mm/legacy']).toMatchObject({adopted: true, monitorable: false, standardVersion: '2.0.0'});
    expect(byName['kaicreator-mm/plain']).toMatchObject({adopted: false, monitorable: false});

    await app.inject({method: 'POST', url: '/api/settings/repositories', payload: {repository: 'kaicreator-mm/dac', syncNow: false}});
    const refreshed = await app.inject({method: 'GET', url: '/api/discovery'});
    expect(refreshed.json().repositories.find((r: {repository: string}) => r.repository === 'kaicreator-mm/dac').monitored).toBe(true);
    await app.close();
    store.close();
  }, 20000);
});
