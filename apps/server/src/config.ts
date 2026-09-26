import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const moduleDir = dirname(fileURLToPath(import.meta.url));
// apps/server/{src,dist} -> apps/web/dist, independent of process.cwd()
const defaultWebDist = resolve(moduleDir, '../../web/dist');

export interface RuntimeConfig {
  host: string;
  port: number;
  dataDir: string;
  databasePath: string;
  githubToken?: string;
  repositories: Array<{repository: string; versionHint?: string}>;
  syncIntervalSeconds: number;
  demo: boolean;
  webDist: string;
}

export function parseRepositories(input = ''): Array<{repository: string; versionHint?: string}> {
  return input.split(',').map((v) => v.trim()).filter(Boolean).map((entry) => {
    const at = entry.lastIndexOf('@');
    if (at > entry.indexOf('/')) return {repository: entry.slice(0, at), versionHint: entry.slice(at + 1)};
    return {repository: entry};
  });
}

export function loadConfig(env: NodeJS.ProcessEnv = process.env): RuntimeConfig {
  const dataDir = resolve(env.ADS_DATA_DIR ?? '.data');
  return {
    host: env.ADS_HOST ?? '0.0.0.0',
    port: Number(env.ADS_PORT ?? 4310),
    dataDir,
    databasePath: resolve(dataDir, 'ads-plane.db'),
    ...(env.ADS_GITHUB_TOKEN ? {githubToken: env.ADS_GITHUB_TOKEN} : {}),
    repositories: parseRepositories(env.ADS_REPOSITORIES),
    syncIntervalSeconds: Math.max(0, Number(env.ADS_SYNC_INTERVAL_SECONDS ?? 300)),
    demo: env.ADS_DEMO === '1',
    webDist: env.ADS_WEB_DIST ? resolve(env.ADS_WEB_DIST) : defaultWebDist
  };
}
