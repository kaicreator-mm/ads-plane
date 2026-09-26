import type {
  AgentEventFact, CandidateState, CommentFact, DependencyFact, GateSnapshot, GateState,
  IssueFact, LaneSnapshot, ProvenanceRef, PullRequestFact, RepositoryFacts, ReviewPolicy,
  Risk, VersionSnapshot, WorkflowRunFact, WorkflowState, WorkItemSnapshot, ReleaseState,
  DispatchSnapshot
} from '@ads-plane/contracts';

const TASK_RE = /\b(T[- ]?\d{3,})\b/i;
const ISSUE_REF_RE = /#(\d+)/g;

function normalizeTaskId(title: string, issueNumber: number): string {
  const match = title.match(TASK_RE);
  return match ? match[1]!.toUpperCase().replace(' ', '-') : `ISSUE-${issueNumber}`;
}

function bodyField(body: string, field: string): string | undefined {
  const re = new RegExp(`^\\s*(?:[-*]\\s*)?${field}\\s*:\\s*(.+?)\\s*$`, 'im');
  return body.match(re)?.[1]?.trim();
}

function normalizeLane(issue: IssueFact): string {
  return bodyField(issue.body, 'Lane') ?? 'unassigned';
}

function normalizeReviewPolicy(issue: IssueFact): ReviewPolicy {
  const label = issue.labels.find((v) => v.startsWith('review:'))?.slice('review:'.length);
  const body = bodyField(issue.body, 'Review Policy')?.toLowerCase();
  const value = label ?? body;
  return value === 'required' || value === 'recommended' || value === 'not-required' ? value : 'unknown';
}

function normalizeRisk(issue: IssueFact): Risk {
  const label = issue.labels.find((v) => v.startsWith('risk:'))?.slice('risk:'.length);
  const body = bodyField(issue.body, 'Risk')?.toLowerCase();
  const value = label ?? body;
  return value === 'low' || value === 'medium' || value === 'high' || value === 'critical' ? value : 'unknown';
}

function workflowFromLabels(issue: IssueFact): WorkflowState | undefined {
  const value = issue.labels.find((v) => v.startsWith('state:'))?.slice('state:'.length);
  const allowed = new Set<WorkflowState>([
    'planned','ready','claimed','implementing','review-ready','reviewing','validation-needed',
    'validating','changes-requested','merge-ready','blocked','done','superseded','cancelled'
  ]);
  return value && allowed.has(value as WorkflowState) ? value as WorkflowState : undefined;
}

function parseBodyDependencies(body: string): number[] {
  const field = bodyField(body, 'Depends On');
  if (!field || field === '—' || field === '-') return [];
  return [...field.matchAll(ISSUE_REF_RE)].map((m) => Number(m[1]));
}

export function parseAgentEvent(comment: CommentFact): AgentEventFact | undefined {
  const interesting = /ai-dev:event:v2|\bevent\s*:|REVIEW_RESULT|VALIDATION_RESULT|RELEASE_QUALIFICATION|CANDIDATE_STATE_CHANGED|DISPATCH_/i;
  if (!interesting.test(comment.body)) return undefined;

  const raw: Record<string, string> = {};
  for (const line of comment.body.split(/\r?\n/)) {
    const match = line.match(/^\s*(?:[-*]\s*)?([A-Za-z0-9_.-]+)\s*:\s*[`"']?(.+?)[`"']?\s*$/);
    if (match) raw[match[1]!.toLowerCase()] = match[2]!.trim();
  }
  const event = raw.event ?? comment.body.match(/\b([A-Z][A-Z0-9_]+_(?:RESULT|CHANGED|CLAIMED|REQUEST|DECISION))\b/)?.[1];
  if (!event) return undefined;
  const status = raw.status ?? raw.outcome ?? raw.result;
  const candidateStateRaw = raw.candidate_state?.toUpperCase();
  const releaseStateRaw = (raw.release_state ?? (event === 'RELEASE_QUALIFICATION' ? status : undefined))?.toUpperCase();
  const candidateStates = new Set(['PREPARED','FROZEN','THAWED','INVALIDATED']);
  const releaseStates = new Set(['NOT_READY','READY','CONDITIONAL','BLOCKED','FAIL']);
  return {
    event,
    issueNumber: comment.issueNumber,
    commentId: comment.id,
    ...(raw.actor_role ? { actorRole: raw.actor_role } : {}),
    ...(raw.operator_id ? { operatorId: raw.operator_id } : {}),
    ...(raw.dispatch_id ? { dispatchId: raw.dispatch_id } : {}),
    ...(status ? { status: status.toUpperCase() } : {}),
    ...(raw.next_state ? { nextState: raw.next_state.replace(/^state:/, '') } : {}),
    ...(raw.head_sha ? { headSha: raw.head_sha } : {}),
    ...(raw.candidate_sha ? { candidateSha: raw.candidate_sha } : {}),
    ...(candidateStateRaw && candidateStates.has(candidateStateRaw) ? { candidateState: candidateStateRaw as CandidateState } : {}),
    ...(releaseStateRaw && releaseStates.has(releaseStateRaw) ? { releaseState: releaseStateRaw as ReleaseState } : {}),
    ...(raw.occurred_at ? { occurredAt: raw.occurred_at } : {}),
    source: { kind: 'comment', ref: `issue:#${comment.issueNumber}/comment:${comment.id}`, url: comment.htmlUrl },
    raw
  };
}

function issueProvenance(issue: IssueFact): ProvenanceRef {
  return { kind: 'issue', ref: `issue:#${issue.number}`, url: issue.htmlUrl };
}

function dependencyFor(issue: IssueFact, facts: RepositoryFacts): DependencyFact {
  return facts.dependencies.find((d) => d.issueNumber === issue.number) ?? {
    issueNumber: issue.number,
    blockedBy: parseBodyDependencies(issue.body),
    source: 'body-fallback'
  };
}

function prForIssue(issue: IssueFact, pullRequests: PullRequestFact[], comments: CommentFact[]): PullRequestFact | undefined {
  const refs = new Set<number>();
  const scan = `${issue.body}\n${comments.filter((c) => c.issueNumber === issue.number).map((c) => c.body).join('\n')}`;
  for (const match of scan.matchAll(/(?:PR|pull request)\s*#(\d+)/ig)) refs.add(Number(match[1]));
  const taskId = normalizeTaskId(issue.title, issue.number).toLowerCase();
  return pullRequests.find((pr) => refs.has(pr.number)) ?? pullRequests.find((pr) => pr.title.toLowerCase().includes(taskId));
}

function latest<T>(items: T[], time: (item: T) => string): T | undefined {
  return [...items].sort((a, b) => time(b).localeCompare(time(a)))[0];
}

function gateFromEvents(kind: 'review' | 'validation', events: AgentEventFact[], currentHead?: string): GateSnapshot {
  const event = latest(events.filter((e) => {
    if (kind === 'review') return /REVIEW/.test(e.event);
    return /VALIDATION/.test(e.event);
  }), (e) => e.occurredAt ?? e.source.ref);
  if (!event) return { state: 'NOT_RUN', stale: false, provenance: [] };
  const normalized = (event.status ?? '').toUpperCase();
  const state: GateState = normalized.includes('PASS') ? 'PASS'
    : normalized.includes('FAIL') || normalized.includes('CHANGES_REQUESTED') ? 'FAIL'
      : normalized.includes('BLOCK') ? 'BLOCKED'
        : normalized.includes('NOT_APPLICABLE') ? 'NOT_APPLICABLE' : 'NOT_RUN';
  const exactSha = event.headSha ?? event.raw.reviewed_head_sha ?? event.raw.requested_head_sha;
  return {
    state,
    ...(exactSha ? { exactSha } : {}),
    stale: Boolean(state === 'PASS' && currentHead && exactSha && currentHead !== exactSha),
    provenance: [event.source]
  };
}

function ciGate(pr: PullRequestFact | undefined, runs: WorkflowRunFact[]): GateSnapshot {
  if (!pr) return { state: 'NOT_RUN', stale: false, provenance: [] };
  const run = latest(runs.filter((r) => r.headSha === pr.headSha), (r) => r.updatedAt);
  if (!run) return { state: 'NOT_RUN', stale: false, provenance: [] };
  const state: GateState = run.conclusion === 'success' ? 'PASS'
    : run.conclusion === 'failure' ? 'FAIL'
      : run.status === 'completed' ? 'BLOCKED' : 'NOT_RUN';
  return {
    state,
    exactSha: run.headSha,
    stale: run.headSha !== pr.headSha,
    provenance: [{ kind: 'workflow-run', ref: `actions:${run.id}`, url: run.htmlUrl, sha: run.headSha }]
  };
}

function dispatchFromEvents(events: AgentEventFact[]): DispatchSnapshot | undefined {
  const dispatchEvents = events.filter((e) => e.dispatchId || /^DISPATCH_/.test(e.event));
  const event = latest(dispatchEvents, (e) => e.occurredAt ?? e.source.ref);
  if (!event?.dispatchId) return undefined;
  const status = (event.status ?? event.raw.dispatch_state ?? (event.event === 'DISPATCH_CLAIMED' ? 'ACKNOWLEDGED' : 'QUEUED')).toUpperCase();
  const allowed = new Set(['QUEUED','DELIVERED','ACKNOWLEDGED','RUNNING','DONE','FAILED','CANCELLED','TIMEOUT','STALE']);
  return {
    id: event.dispatchId,
    ...(event.actorRole ? { role: event.actorRole } : {}),
    ...(event.operatorId ? { operatorId: event.operatorId } : {}),
    state: allowed.has(status) ? status as DispatchSnapshot['state'] : 'QUEUED',
    provenance: [event.source]
  };
}

function deriveWorkflow(issue: IssueFact, events: AgentEventFact[], blocked: boolean, pr?: PullRequestFact, review?: GateSnapshot, validation?: GateSnapshot, ci?: GateSnapshot): WorkflowState {
  const labelState = workflowFromLabels(issue);
  if (labelState) return labelState;
  if (issue.state === 'closed') return 'done';
  if (blocked) return 'blocked';
  const event = latest(events.filter((e) => e.nextState), (e) => e.occurredAt ?? e.source.ref);
  if (event?.nextState) return event.nextState as WorkflowState;
  if (review?.state === 'FAIL') return 'changes-requested';
  if (validation?.state === 'FAIL') return 'changes-requested';
  if (pr && review?.state === 'PASS' && validation?.state === 'PASS' && ci?.state === 'PASS') return 'merge-ready';
  if (pr) return 'implementing';
  return 'ready';
}

export function reduceRepositoryFacts(facts: RepositoryFacts, versionHint?: string): VersionSnapshot {
  const issueByNumber = new Map(facts.issues.map((i) => [i.number, i]));
  const taskIssues = facts.issues.filter((issue) => /\bT[- ]?\d{3,}\b/i.test(issue.title) || issue.labels.includes('type:task'));
  const workItems: WorkItemSnapshot[] = taskIssues.map((issue) => {
    const dep = dependencyFor(issue, facts);
    const blockingDependencies = dep.blockedBy.filter((n) => issueByNumber.get(n)?.state !== 'closed');
    const events = facts.events.filter((e) => e.issueNumber === issue.number);
    const pr = prForIssue(issue, facts.pullRequests, facts.comments);
    const review = gateFromEvents('review', events, pr?.headSha);
    const validation = gateFromEvents('validation', events, pr?.headSha);
    const ci = ciGate(pr, facts.workflowRuns);
    const workflowState = deriveWorkflow(issue, events, blockingDependencies.length > 0, pr, review, validation, ci);
    const reviewPolicy = normalizeReviewPolicy(issue);
    const validationSatisfied = validation.state === 'PASS' || validation.state === 'NOT_APPLICABLE';
    const reviewSatisfied = reviewPolicy === 'not-required' || review.state === 'PASS' || (reviewPolicy === 'recommended' && review.state === 'NOT_RUN');
    const ciSatisfied = ci.state === 'PASS' || ci.state === 'NOT_APPLICABLE';
    const dispatch = dispatchFromEvents(events);
    const pullRequest: WorkItemSnapshot['pullRequest'] = pr ? {
      number: pr.number,
      state: pr.merged ? 'merged' : pr.state,
      headSha: pr.headSha,
      baseSha: pr.baseSha,
      htmlUrl: pr.htmlUrl
    } : undefined;
    return {
      taskId: normalizeTaskId(issue.title, issue.number),
      issueNumber: issue.number,
      title: issue.title,
      lane: normalizeLane(issue),
      workflowState,
      reviewPolicy,
      risk: normalizeRisk(issue),
      blockedBy: dep.blockedBy,
      blockingDependencies,
      ...(pullRequest ? { pullRequest } : {}),
      ...(dispatch ? { dispatch } : {}),
      review,
      validation,
      ci,
      readyForBuilder: workflowState === 'ready' || workflowState === 'changes-requested',
      readyForReview: workflowState === 'review-ready' || (Boolean(pr) && reviewPolicy !== 'not-required' && review.state === 'NOT_RUN'),
      readyForValidation: workflowState === 'validation-needed' || (Boolean(pr) && validation.state === 'NOT_RUN'),
      readyForMerge: workflowState === 'merge-ready' || (Boolean(pr) && blockingDependencies.length === 0 && validationSatisfied && reviewSatisfied && ciSatisfied),
      provenance: [issueProvenance(issue), ...(dep.source === 'body-fallback' ? [{ kind: 'derived' as const, ref: `body-dependencies:#${issue.number}`, note: 'Native dependency fact unavailable; parsed Depends On field.' }] : [])]
    };
  }).sort((a, b) => a.taskId.localeCompare(b.taskId));

  const laneMap = new Map<string, WorkItemSnapshot[]>();
  for (const item of workItems) laneMap.set(item.lane, [...(laneMap.get(item.lane) ?? []), item]);
  const lanes: LaneSnapshot[] = [...laneMap.entries()].map(([id, items]) => ({
    id,
    total: items.length,
    done: items.filter((i) => i.workflowState === 'done').length,
    running: items.filter((i) => ['claimed','implementing','reviewing','validating'].includes(i.workflowState)).length,
    blocked: items.filter((i) => i.workflowState === 'blocked').length,
    taskIds: items.map((i) => i.taskId)
  })).sort((a, b) => a.id.localeCompare(b.id));

  const candidateEvent = latest(facts.events.filter((e) => e.candidateState), (e) => e.occurredAt ?? e.source.ref);
  const releaseEvent = latest(facts.events.filter((e) => e.releaseState || e.event === 'RELEASE_QUALIFICATION'), (e) => e.occurredAt ?? e.source.ref);
  const total = workItems.length;
  const done = workItems.filter((i) => i.workflowState === 'done').length;
  const running = workItems.filter((i) => ['claimed','implementing','reviewing','validating'].includes(i.workflowState)).length;
  const ready = workItems.filter((i) => i.readyForBuilder).length;
  const blocked = workItems.filter((i) => i.workflowState === 'blocked').length;
  const mergeReady = workItems.filter((i) => i.readyForMerge).length;
  const version = versionHint ?? facts.repositoryVersion ?? 'unversioned';

  return {
    version,
    repository: facts.repository,
    ...(facts.standardVersion ? { standardVersion: facts.standardVersion } : {}),
    generatedAt: facts.collectedAt,
    authorityNotice: 'NON_AUTHORITATIVE_DERIVED_STATE',
    progress: { total, done, running, ready, blocked, mergeReady, percent: total === 0 ? 0 : Math.round((done / total) * 100) },
    candidateState: candidateEvent?.candidateState ?? 'UNKNOWN',
    releaseState: releaseEvent?.releaseState ?? 'UNKNOWN',
    queues: {
      builder: workItems.filter((i) => i.readyForBuilder).map((i) => i.issueNumber),
      reviewer: workItems.filter((i) => i.readyForReview).map((i) => i.issueNumber),
      validator: workItems.filter((i) => i.readyForValidation).map((i) => i.issueNumber),
      merge: workItems.filter((i) => i.readyForMerge).map((i) => i.issueNumber),
      blocked: workItems.filter((i) => i.workflowState === 'blocked').map((i) => i.issueNumber)
    },
    lanes,
    workItems,
    provenance: [
      { kind: 'repository', ref: facts.repository, sha: facts.defaultBranchSha },
      { kind: 'derived', ref: `reducer:${facts.collectedAt}`, note: 'Deterministic projection from GitHub/repository durable facts.' }
    ]
  };
}
