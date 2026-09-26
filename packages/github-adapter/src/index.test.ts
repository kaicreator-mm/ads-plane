import { describe, expect, it } from 'vitest';
import { GitHubReadOnlyClient } from './index.js';

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
