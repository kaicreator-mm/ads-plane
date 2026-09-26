import { mkdirSync } from 'node:fs';
import { GitHubReadOnlyClient } from '@ads-plane/github-adapter';
import { SnapshotStore } from '@ads-plane/storage';
import { buildApp } from './app.js';
import { loadConfig } from './config.js';
import { demoSnapshot } from './demo.js';
import { ObserverService } from './service.js';

const config = loadConfig();
mkdirSync(config.dataDir, {recursive: true});
const store = new SnapshotStore(config.databasePath);
for (const repo of config.repositories) store.register(repo);
if (config.demo) store.save(demoSnapshot());
const client = new GitHubReadOnlyClient(config.githubToken ? {token: config.githubToken} : {});
const service = new ObserverService(client, store);

if (!config.demo && config.repositories.length > 0) {
  const results = await service.syncAll();
  for (const result of results) if (!result.ok) console.error(`[sync] ${result.repository}: ${result.error}`);
}

if (!config.demo && config.syncIntervalSeconds > 0) {
  const timer = setInterval(() => void service.syncAll(), config.syncIntervalSeconds * 1000);
  timer.unref();
}

const app = await buildApp(config, service);
await app.listen({host: config.host, port: config.port});
