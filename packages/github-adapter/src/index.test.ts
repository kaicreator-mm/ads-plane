import { describe, expect, it } from 'vitest';
import { GitHubReadOnlyClient, MIN_SUPPORTED_STANDARD, compareStandardVersion } from './index.js';

function response(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {status, headers: {'content-type': 'application/json'}});
}

describe('GitHubReadOnlyClient', () => {
  it('collects native blocked_by dependencies and never uses write methods', async () => {
    const calls: Array<{url: string; method: string}> = [];
    const fetchImpl: typeof fetch = async (input, init) => {
      const url = String(input);
      calls.push({url, method: init?.method ?? 'GET'});
      if (url.endsWith('/repos/acme/proj')) return response({default_branch: 'main'});
      if (url.includes('/branches/main')) return response({commit: {sha: 'abc'}});
      if (url.includes('/issues?state=all')) return response([{id: 1, number: 1, title: 'T-001 — task', body: 'Lane: core', state: 'open', labels: [], assignees: [], milestone: null, html_url: 'https://example/i1', updated_at: 'now'}]);
      if (url.includes('/issues/1/dependencies/blocked_by')) return response([{number: 9}]);
      if (url.includes('/issues/1/comments')) return response([]);
      if (url.includes('/pulls?state=all')) return response([]);
      if (url.includes('/actions/runs')) return response({workflow_runs: []});
      if (url.includes('/contents/')) return response({message: 'not found'}, 404);
      throw new Error(`Unexpected URL ${url}`);
    };
    const facts = await new GitHubReadOnlyClient({fetchImpl}).collect('acme/proj');
    expect(facts.dependencies).toEqual([{issueNumber: 1, blockedBy: [9], source: 'native'}]);
    expect(calls.every((call) => call.method === 'GET')).toBe(true);
  });

  it('parses key=value version pins and collects issue-body events with task ids', async () => {
    const fetchImpl: typeof fetch = async (input) => {
      const url = String(input);
      if (url.endsWith('/repos/acme/proj')) return response({default_branch: 'main'});
      if (url.includes('/branches/main')) return response({commit: {sha: 'abc'}});
      if (url.includes('/issues?state=all')) return response([
        {id: 1, number: 1, title: '[v0.1 T401] core', body: '<!-- ai-dev:event:v2 -->\nevent: IMPLEMENTATION_TASK\ntask_id: T401', state: 'open', labels: [], assignees: [], milestone: null, html_url: 'https://example/i1', updated_at: 'now'},
        {id: 2, number: 2, title: '[v0.1 T401] Fresh Independent Review', body: 'PR: #7', state: 'open', labels: [], assignees: [], milestone: null, html_url: 'https://example/i2', updated_at: 'now'}
      ]);
      if (url.includes('/dependencies/blocked_by')) return response([], 404);
      if (url.includes('/comments')) return response([
        {id: 51, body: 'event: REVIEW_RESULT\nstatus: PASS\nhead_sha: sha-7', html_url: 'https://example/c51', created_at: 'now', updated_at: 'now', user: {login: 'reviewer'}}
      ]);
      if (url.includes('/pulls?state=all')) return response([]);
      if (url.includes('/actions/runs')) return response({workflow_runs: []});
      if (url.includes('/contents/VERSION')) return response({type: 'file', name: 'VERSION', path: 'VERSION', sha: 'v1', content: Buffer.from('0.1.0').toString('base64'), encoding: 'base64', html_url: null});
      if (url.includes('/contents/.dev-standard/VERSION')) return response({type: 'file', name: 'VERSION', path: '.dev-standard/VERSION', sha: 'v2', content: Buffer.from('repository=acme/standard\nversion=3.4.0\nrevision=418d244f').toString('base64'), encoding: 'base64', html_url: null});
      if (url.includes('/contents/')) return response({message: 'not found'}, 404);
      throw new Error(`Unexpected URL ${url}`);
    };
    const facts = await new GitHubReadOnlyClient({fetchImpl}).collect('acme/proj');
    expect(facts.standardVersion).toBe('3.4.0');
    expect(facts.repositoryVersion).toBe('0.1.0');
    const bodyEvent = facts.events.find((e) => e.event === 'IMPLEMENTATION_TASK');
    expect(bodyEvent?.taskId).toBe('T401');
    expect(bodyEvent?.source.kind).toBe('issue');
    expect(bodyEvent?.source.ref).toBe('issue:#1');
    const commentEvent = facts.events.find((e) => e.event === 'REVIEW_RESULT');
    expect(commentEvent?.taskId).toBe('T401');
  });

  it('collects per-issue facts with bounded concurrency', async () => {
    const issueNumbers = [1, 2, 3, 4, 5, 6, 7, 8];
    let inFlight = 0;
    let peak = 0;
    const fetchImpl: typeof fetch = async (input) => {
      const url = String(input);
      inFlight += 1;
      peak = Math.max(peak, inFlight);
      await new Promise((resolve) => setTimeout(resolve, 10));
      inFlight -= 1;
      if (url.endsWith('/repos/acme/proj')) return response({default_branch: 'main'});
      if (url.includes('/branches/main')) return response({commit: {sha: 'abc'}});
      if (url.includes('/issues?state=all')) return response(issueNumbers.map((number) => ({id: number, number, title: `T-${number}`, body: '', state: 'open', labels: [], assignees: [], milestone: null, html_url: `https://example/i${number}`, updated_at: 'now'})));
      if (url.includes('/dependencies/blocked_by')) return response([], 404);
      if (url.includes('/comments')) return response([]);
      if (url.includes('/pulls?state=all')) return response([]);
      if (url.includes('/actions/runs')) return response({workflow_runs: []});
      if (url.includes('/contents/')) return response({message: 'not found'}, 404);
      throw new Error(`Unexpected URL ${url}`);
    };
    const facts = await new GitHubReadOnlyClient({fetchImpl, maxConcurrency: 3}).collect('acme/proj');
    expect(facts.issues).toHaveLength(8);
    expect(facts.comments).toEqual([]);
    expect(peak).toBeLessThanOrEqual(3);
  });
});

describe('account discovery', () => {
  it('lists account repositories and probes standard adoption', async () => {
    const fetchImpl: typeof fetch = async (input) => {
      const url = String(input);
      if (url.endsWith('/user')) return response({login: 'kaicreator-mm'});
      if (url.includes('/user/repos')) return response([
        {full_name: 'kaicreator-mm/dac', private: true, fork: false, updated_at: 'now'},
        {full_name: 'kaicreator-mm/plain', private: false, fork: false, updated_at: 'now'},
        {full_name: 'kaicreator-mm/legacy', private: false, fork: true, updated_at: 'now'}
      ]);
      if (url.includes('/repos/kaicreator-mm/dac/contents/.dev-standard/VERSION')) {
        return response({type: 'file', name: 'VERSION', path: '.dev-standard/VERSION', sha: 's1', content: Buffer.from('repository=x\nversion=3.4.0\nrevision=y').toString('base64'), encoding: 'base64', html_url: null});
      }
      if (url.includes('/contents/.dev-standard/VERSION')) return response({message: 'not found'}, 404);
      if (url.includes('/repos/kaicreator-mm/legacy/contents/.dev-standard/VERSION')) {
        return response({type: 'file', name: 'VERSION', path: '.dev-standard/VERSION', sha: 's2', content: Buffer.from('version: 2.0.0\nrevision: deadbee').toString('base64'), encoding: 'base64', html_url: null});
      }
      throw new Error(`Unexpected URL ${url}`);
    };
    const scan = await new GitHubReadOnlyClient({fetchImpl, maxConcurrency: 2}).scanAccountStandards();
    expect(scan.account).toBe('kaicreator-mm');
    expect(scan.repositories.map((r) => r.repository)).toEqual(['kaicreator-mm/dac', 'kaicreator-mm/legacy', 'kaicreator-mm/plain']);
    expect(scan.repositories.find((r) => r.repository === 'kaicreator-mm/dac')?.standardVersion).toBe('3.4.0');
    expect(scan.repositories.find((r) => r.repository === 'kaicreator-mm/plain')?.standardVersion).toBeUndefined();
    expect(scan.repositories.find((r) => r.repository === 'kaicreator-mm/legacy')?.fork).toBe(true);
  });

  it('compares v-prefixed standard versions', () => {
    expect(compareStandardVersion('v4.0.0', MIN_SUPPORTED_STANDARD)).toBeGreaterThan(0);
    expect(compareStandardVersion('3.4.0', MIN_SUPPORTED_STANDARD)).toBe(0);
    expect(compareStandardVersion('3.3.9', MIN_SUPPORTED_STANDARD)).toBeLessThan(0);
    expect(compareStandardVersion('1.2.1', MIN_SUPPORTED_STANDARD)).toBeLessThan(0);
  });
});
