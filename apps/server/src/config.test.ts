import { describe, expect, it } from 'vitest';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { loadConfig, parseRepositories } from './config.js';

describe('runtime config', () => {
  it('resolves the default web dist against the server module, not process.cwd()', () => {
    const config = loadConfig({ADS_DATA_DIR: '.data-test'});
    const anchored = resolve(dirname(fileURLToPath(import.meta.url)), '../../web/dist');
    expect(config.webDist).toBe(anchored);
  });

  it('keeps ADS_WEB_DIST override resolved against the working directory', () => {
    const config = loadConfig({ADS_DATA_DIR: '.data-test', ADS_WEB_DIST: 'custom/dist'});
    expect(config.webDist).toBe(resolve('custom/dist'));
  });

  it('parses repository entries with optional version hints', () => {
    expect(parseRepositories('owner/project-a@v1.2, owner/project-b ,,')).toEqual([
      {repository: 'owner/project-a', versionHint: 'v1.2'},
      {repository: 'owner/project-b'}
    ]);
  });
});
