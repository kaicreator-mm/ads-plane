import type {
  CommentFact, DependencyFact, IssueFact, PullRequestFact, RepositoryArtifactFact,
  RepositoryFacts, WorkflowRunFact
} from '@ads-plane/contracts';
import { parseAgentEvent } from '@ads-plane/reducer';

export interface GitHubReaderOptions {
  token?: string;
  apiBase?: string;
  apiVersion?: string;
  fetchImpl?: typeof fetch;
  userAgent?: string;
}

interface GitHubLabel { name?: string }
interface GitHubIssue {
  id: number; number: number; title: string; body?: string | null; state: 'open'|'closed';
  state_reason?: string | null; labels: Array<GitHubLabel|string>; assignees?: Array<{login: string}>;
  milestone?: {title: string} | null; html_url: string; updated_at: string; pull_request?: unknown;
}
interface GitHubPull {
  number: number; title: string; state: 'open'|'closed'; merged_at?: string | null;
  head: {sha: string; ref: string}; base: {sha: string; ref: string}; html_url: string; updated_at: string;
}
interface GitHubComment { id: number; body?: string | null; html_url: string; created_at: string; updated_at: string; user?: {login?: string} | null }
interface GitHubWorkflowRun { id: number; name?: string; event: string; status: string; conclusion?: string | null; head_sha: string; html_url: string; updated_at: string }
interface GitHubRepo { default_branch: string }
interface GitHubBranch { commit: {sha: string} }
interface GitHubContent { type: string; name: string; path: string; sha: string; content?: string; encoding?: string; html_url?: string | null }

function decodeContent(payload: GitHubContent): string {
  if (!payload.content) return '';
  if (payload.encoding === 'base64') return Buffer.from(payload.content.replace(/\n/g, ''), 'base64').toString('utf8');
  return payload.content;
}

export class GitHubReadOnlyClient {
  private readonly fetchImpl: typeof fetch;
  private readonly apiBase: string;
  private readonly apiVersion: string;
  private readonly token?: string;
  private readonly userAgent: string;

  constructor(options: GitHubReaderOptions = {}) {
    this.fetchImpl = options.fetchImpl ?? fetch;
    this.apiBase = options.apiBase ?? 'https://api.github.com';
    this.apiVersion = options.apiVersion ?? '2026-03-10';
    this.token = options.token;
    this.userAgent = options.userAgent ?? 'ads-plane/0.0.1';
  }

  private async request<T>(path: string): Promise<T> {
    const headers: Record<string,string> = {
      Accept: 'application/vnd.github+json',
      'X-GitHub-Api-Version': this.apiVersion,
      'User-Agent': this.userAgent
    };
    if (this.token) headers.Authorization = `Bearer ${this.token}`;
    const response = await this.fetchImpl(`${this.apiBase}${path}`, {headers});
    if (!response.ok) {
      const body = await response.text();
      throw new Error(`GitHub GET ${path} failed: ${response.status} ${body.slice(0, 300)}`);
    }
    return response.json() as Promise<T>;
  }

  private async optional<T>(path: string): Promise<T | undefined> {
    try { return await this.request<T>(path); }
    catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      if (/ 404 | 410 /.test(` ${message} `)) return undefined;
      throw error;
    }
  }

  private async paged<T>(path: string): Promise<T[]> {
    const results: T[] = [];
    for (let page = 1; page <= 100; page += 1) {
      const separator = path.includes('?') ? '&' : '?';
      const batch = await this.request<T[]>(`${path}${separator}per_page=100&page=${page}`);
      results.push(...batch);
      if (batch.length < 100) break;
    }
    return results;
  }

  async collect(repository: string): Promise<RepositoryFacts> {
    const [owner, repo] = repository.split('/');
    if (!owner || !repo) throw new Error(`Invalid repository: ${repository}`);
    const repoFact = await this.request<GitHubRepo>(`/repos/${owner}/${repo}`);
    const branch = await this.request<GitHubBranch>(`/repos/${owner}/${repo}/branches/${encodeURIComponent(repoFact.default_branch)}`);
    const rawIssues = await this.paged<GitHubIssue>(`/repos/${owner}/${repo}/issues?state=all`);
    const issues = rawIssues.filter((issue) => !issue.pull_request).map<IssueFact>((issue) => ({
      number: issue.number,
      id: issue.id,
      title: issue.title,
      body: issue.body ?? '',
      state: issue.state,
      stateReason: issue.state_reason,
      labels: issue.labels.map((label) => typeof label === 'string' ? label : label.name ?? '').filter(Boolean),
      assignees: (issue.assignees ?? []).map((a) => a.login),
      milestone: issue.milestone?.title ?? null,
      htmlUrl: issue.html_url,
      updatedAt: issue.updated_at
    }));

    const dependencies: DependencyFact[] = [];
    const comments: CommentFact[] = [];
    for (const issue of issues) {
      const blockedBy = await this.optional<GitHubIssue[]>(`/repos/${owner}/${repo}/issues/${issue.number}/dependencies/blocked_by?per_page=100`);
      if (blockedBy) dependencies.push({issueNumber: issue.number, blockedBy: blockedBy.map((v) => v.number), source: 'native'});
      const issueComments = await this.paged<GitHubComment>(`/repos/${owner}/${repo}/issues/${issue.number}/comments`);
      comments.push(...issueComments.map((comment) => ({
        id: comment.id,
        issueNumber: issue.number,
        body: comment.body ?? '',
        htmlUrl: comment.html_url,
        createdAt: comment.created_at,
        updatedAt: comment.updated_at,
        author: comment.user?.login ?? 'unknown'
      })));
    }

    const rawPulls = await this.paged<GitHubPull>(`/repos/${owner}/${repo}/pulls?state=all`);
    const pullRequests = rawPulls.map<PullRequestFact>((pr) => ({
      number: pr.number,
      title: pr.title,
      state: pr.state,
      merged: Boolean(pr.merged_at),
      headSha: pr.head.sha,
      baseSha: pr.base.sha,
      headRef: pr.head.ref,
      baseRef: pr.base.ref,
      htmlUrl: pr.html_url,
      updatedAt: pr.updated_at
    }));

    const workflowPayload = await this.optional<{workflow_runs: GitHubWorkflowRun[]}>(`/repos/${owner}/${repo}/actions/runs?per_page=100`);
    const workflowRuns = (workflowPayload?.workflow_runs ?? []).map<WorkflowRunFact>((run) => ({
      id: run.id,
      name: run.name ?? 'workflow',
      event: run.event,
      status: run.status,
      conclusion: run.conclusion,
      headSha: run.head_sha,
      htmlUrl: run.html_url,
      updatedAt: run.updated_at
    }));

    const artifacts: RepositoryArtifactFact[] = [];
    for (const path of ['VERSION', '.dev-standard/VERSION', 'TASK_DAG.md', 'docs/TASK_DAG.md', 'docs/TASK_DAG-v0.0.1.md']) {
      const payload = await this.optional<GitHubContent>(`/repos/${owner}/${repo}/contents/${path}?ref=${encodeURIComponent(repoFact.default_branch)}`);
      if (payload && payload.type === 'file') artifacts.push({path, content: decodeContent(payload), sha: payload.sha, ...(payload.html_url ? {htmlUrl: payload.html_url} : {})});
    }

    const events = comments.map(parseAgentEvent).filter((event): event is NonNullable<typeof event> => Boolean(event));
    return {
      repository,
      defaultBranch: repoFact.default_branch,
      defaultBranchSha: branch.commit.sha,
      repositoryVersion: artifacts.find((a) => a.path === 'VERSION')?.content.trim(),
      standardVersion: artifacts.find((a) => a.path === '.dev-standard/VERSION')?.content.trim(),
      issues,
      dependencies,
      pullRequests,
      workflowRuns,
      comments,
      events,
      artifacts,
      collectedAt: new Date().toISOString()
    };
  }
}
