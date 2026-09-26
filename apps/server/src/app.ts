import { existsSync } from 'node:fs';
import Fastify from 'fastify';
import cors from '@fastify/cors';
import staticPlugin from '@fastify/static';
import type { RuntimeConfig } from './config.js';
import type { ObserverService } from './service.js';

export async function buildApp(config: RuntimeConfig, service: ObserverService) {
  const app = Fastify({logger: true});
  await app.register(cors, {origin: true});

  app.get('/api/health', async () => ({ok: true, version: '0.0.1', readOnly: true, authority: 'NON_AUTHORITATIVE_DERIVED_STATE'}));
  app.get('/api/projects', async () => service.list());
  app.get('/api/projects/:owner/:repo', async (request, reply) => {
    const {owner, repo} = request.params as {owner: string; repo: string};
    const snapshot = service.get(`${owner}/${repo}`);
    if (!snapshot) return reply.code(404).send({error: 'Snapshot not found. Sync the repository first.'});
    return snapshot;
  });
  app.post('/api/projects/:owner/:repo/sync', async (request, reply) => {
    const {owner, repo} = request.params as {owner: string; repo: string};
    const repository = `${owner}/${repo}`;
    const registered = service.configs().find((v) => v.repository === repository) ?? {repository};
    service.register(registered);
    try { return await service.sync(registered); }
    catch (error) { return reply.code(502).send({error: error instanceof Error ? error.message : String(error)}); }
  });
  app.post('/api/sync', async () => service.syncAll());

  if (existsSync(config.webDist)) {
    await app.register(staticPlugin, {root: config.webDist, wildcard: false});
    app.setNotFoundHandler((request, reply) => {
      if (request.url.startsWith('/api/')) return reply.code(404).send({error: 'Not found'});
      return reply.sendFile('index.html');
    });
  }
  return app;
}
