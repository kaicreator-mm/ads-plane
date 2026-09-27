import { existsSync } from 'node:fs';
import Fastify from 'fastify';
import cors from '@fastify/cors';
import staticPlugin from '@fastify/static';
import { GitHubReadOnlyClient, MIN_SUPPORTED_STANDARD, compareStandardVersion, type AccountScan } from '@ads-plane/github-adapter';
import type { RuntimeConfig } from './config.js';
import type { ObserverService } from './service.js';

export interface SyncStatus { state: 'syncing' | 'ok' | 'error'; message?: string; at: string }

export interface DiscoveryRepository {
  repository: string;
  standardVersion?: string;
  adopted: boolean;
  /** Adopted and the pinned standard version is supported by this ADS Plane release. */
  monitorable: boolean;
  /** Already registered for monitoring. */
  monitored: boolean;
  private: boolean;
  fork: boolean;
  updatedAt: string;
}

export interface DiscoveryView {
  account?: string;
  scannedAt?: string;
  repositories: DiscoveryRepository[];
}

function maskToken(token: string): string {
  if (token.length <= 8) return '••••';
  return `${token.slice(0, 4)}…${token.slice(-4)}`;
}

function normalizeRepository(input: string): {repository: string; versionHint?: string} | undefined {
  const entry = input.trim();
  if (!entry) return undefined;
  const at = entry.lastIndexOf('@');
  const [body, versionHint] = at > entry.indexOf('/') ? [entry.slice(0, at), entry.slice(at + 1)] : [entry, undefined];
  if (!/^[A-Za-z0-9_.-]+\/[A-Za-z0-9_.-]+$/.test(body)) return undefined;
  if (versionHint !== undefined && !/^[\w.-]+$/.test(versionHint)) return undefined;
  return versionHint ? {repository: body, versionHint} : {repository: body};
}

export async function buildApp(config: RuntimeConfig, service: ObserverService) {
  const app = Fastify({logger: true});
  await app.register(cors, {origin: true});

  // Runtime configuration state. The GitHub token lives in memory only:
  // it is never persisted and never returned in full by the API.
  let githubToken: string | undefined = config.githubToken;
  const syncStatus = new Map<string, SyncStatus>();
  let accountScan: AccountScan | undefined;

  const discoveryView = (): DiscoveryView => ({
    ...(accountScan ? {account: accountScan.account, scannedAt: accountScan.scannedAt} : {}),
    repositories: (accountScan?.repositories ?? []).map((repo) => {
      const adopted = repo.standardVersion !== undefined;
      return {
        repository: repo.repository,
        ...(repo.standardVersion !== undefined ? {standardVersion: repo.standardVersion} : {}),
        adopted,
        monitorable: adopted && compareStandardVersion(repo.standardVersion!, MIN_SUPPORTED_STANDARD) >= 0,
        monitored: service.configs().some((entry) => entry.repository === repo.repository),
        private: repo.private,
        fork: repo.fork,
        updatedAt: repo.updatedAt
      };
    })
  });

  const settingsView = () => ({
    demo: config.demo,
    repositories: service.configs(),
    githubTokenConfigured: Boolean(githubToken),
    ...(githubToken ? {githubTokenHint: maskToken(githubToken)} : {}),
    syncStatus: Object.fromEntries(syncStatus)
  });

  const runSync = async (repository: string, versionHint?: string) => {
    const configEntry = versionHint ? {repository, versionHint} : {repository};
    service.register(configEntry);
    syncStatus.set(repository, {state: 'syncing', at: new Date().toISOString()});
    void service.sync(configEntry)
      .then(() => syncStatus.set(repository, {state: 'ok', at: new Date().toISOString()}))
      .catch((error: unknown) => syncStatus.set(repository, {state: 'error', message: error instanceof Error ? error.message : String(error), at: new Date().toISOString()}));
  };

  app.get('/api/health', async () => ({ok: true, version: '0.0.1', readOnly: true, authority: 'NON_AUTHORITATIVE_DERIVED_STATE'}));
  app.get('/api/projects', async () => service.list());
  app.get('/api/projects/:owner/:repo', async (request, reply) => {
    const {owner, repo} = request.params as {owner: string; repo: string};
    const snapshot = service.get(`${owner}/${repo}`);
    if (!snapshot) return reply.code(404).send({error: 'Snapshot not found. Sync the repository first.'});
    return snapshot;
  });

  app.get('/api/settings', async () => settingsView());

  app.get('/api/discovery', async () => discoveryView());

  app.post('/api/discovery/scan', async (request, reply) => {
    if (!githubToken) return reply.code(400).send({error: 'Configure a GitHub token in settings before scanning.'});
    try { accountScan = await service.scanAccountStandards(); }
    catch (error) { return reply.code(502).send({error: error instanceof Error ? error.message : String(error)}); }
    return discoveryView();
  });

  app.put('/api/settings/github-token', async (request, reply) => {
    const body = request.body as {token?: unknown} | undefined;
    if (typeof body?.token !== 'string') return reply.code(400).send({error: 'Field "token" (string) is required. Send an empty string to clear.'});
    githubToken = body.token.trim() ? body.token.trim() : undefined;
    service.setClient(new GitHubReadOnlyClient(githubToken ? {token: githubToken} : {}));
    return settingsView();
  });

  app.post('/api/settings/repositories', async (request, reply) => {
    const body = request.body as {repository?: unknown; syncNow?: unknown} | undefined;
    if (typeof body?.repository !== 'string') return reply.code(400).send({error: 'Field "repository" (string) is required, e.g. owner/repo@v1.2.'});
    const normalized = normalizeRepository(body.repository);
    if (!normalized) return reply.code(400).send({error: 'Invalid repository. Expected owner/repo with an optional @version hint.'});
    const known = service.configs().find((v) => v.repository === normalized.repository);
    const versionHint = normalized.versionHint ?? known?.versionHint;
    if (body.syncNow === false || config.demo) {
      service.register(versionHint ? {repository: normalized.repository, versionHint} : {repository: normalized.repository});
      return settingsView();
    }
    await runSync(normalized.repository, versionHint);
    return settingsView();
  });

  app.delete('/api/settings/repositories/:owner/:repo', async (request) => {
    const {owner, repo} = request.params as {owner: string; repo: string};
    const repository = `${owner}/${repo}`;
    service.unregister(repository);
    syncStatus.delete(repository);
    return settingsView();
  });

  app.post('/api/projects/:owner/:repo/sync', async (request, reply) => {
    const {owner, repo} = request.params as {owner: string; repo: string};
    const repository = `${owner}/${repo}`;
    const registered = service.configs().find((v) => v.repository === repository);
    if (!registered) return reply.code(404).send({error: 'Repository is not configured. Add it in settings first.'});
    if (config.demo) return reply.code(409).send({error: 'Sync is disabled in demo mode.'});
    await runSync(repository, registered.versionHint);
    return settingsView();
  });
  app.post('/api/sync', async () => {
    if (!config.demo) for (const entry of service.configs()) await runSync(entry.repository, entry.versionHint);
    return settingsView();
  });

  if (existsSync(config.webDist)) {
    await app.register(staticPlugin, {root: config.webDist, wildcard: false});
    app.setNotFoundHandler((request, reply) => {
      if (request.url.startsWith('/api/')) return reply.code(404).send({error: 'Not found'});
      return reply.sendFile('index.html');
    });
  }
  return app;
}
