export const WORKFLOW_STATES = [
  'planned', 'ready', 'claimed', 'implementing', 'review-ready', 'reviewing',
  'validation-needed', 'validating', 'changes-requested', 'merge-ready',
  'blocked', 'done', 'superseded', 'cancelled'
] as const;
export type WorkflowState = (typeof WORKFLOW_STATES)[number];

export const GATE_STATES = ['PASS', 'FAIL', 'BLOCKED', 'NOT_RUN', 'NOT_APPLICABLE'] as const;
export type GateState = (typeof GATE_STATES)[number];

export const DISPATCH_STATES = ['QUEUED', 'DELIVERED', 'ACKNOWLEDGED', 'RUNNING', 'DONE', 'FAILED', 'CANCELLED', 'TIMEOUT', 'STALE'] as const;
export type DispatchState = (typeof DISPATCH_STATES)[number];

export type CandidateState = 'PREPARED' | 'FROZEN' | 'THAWED' | 'INVALIDATED' | 'UNKNOWN';
export type ReleaseState = 'NOT_READY' | 'READY' | 'CONDITIONAL' | 'BLOCKED' | 'FAIL' | 'UNKNOWN';
export type ReviewPolicy = 'required' | 'recommended' | 'not-required' | 'unknown';
export type Risk = 'low' | 'medium' | 'high' | 'critical' | 'unknown';

export interface ProvenanceRef {
  kind: 'repository' | 'issue' | 'comment' | 'pull-request' | 'workflow-run' | 'artifact' | 'derived';
  ref: string;
  url?: string;
  sha?: string;
  note?: string;
}

export interface IssueFact {
  number: number;
  id: number;
  title: string;
  body: string;
  state: 'open' | 'closed';
  stateReason?: string | null;
  labels: string[];
  assignees: string[];
  milestone?: string | null;
  htmlUrl: string;
  updatedAt: string;
}

export interface DependencyFact {
  issueNumber: number;
  blockedBy: number[];
  source: 'native' | 'body-fallback';
}

export interface PullRequestFact {
  number: number;
  title: string;
  state: 'open' | 'closed';
  merged: boolean;
  headSha: string;
  baseSha: string;
  headRef: string;
  baseRef: string;
  htmlUrl: string;
  updatedAt: string;
}

export interface WorkflowRunFact {
  id: number;
  name: string;
  event: string;
  status: string;
  conclusion?: string | null;
  headSha: string;
  htmlUrl: string;
  updatedAt: string;
}

export interface CommentFact {
  id: number;
  issueNumber: number;
  body: string;
  htmlUrl: string;
  createdAt: string;
  updatedAt: string;
  author: string;
}

export interface AgentEventFact {
  event: string;
  issueNumber: number;
  commentId: number;
  actorRole?: string;
  operatorId?: string;
  dispatchId?: string;
  status?: string;
  nextState?: string;
  headSha?: string;
  candidateSha?: string;
  candidateState?: CandidateState;
  releaseState?: ReleaseState;
  occurredAt?: string;
  source: ProvenanceRef;
  raw: Record<string, string>;
}

export interface RepositoryArtifactFact {
  path: string;
  content: string;
  sha: string;
  htmlUrl?: string;
}

export interface RepositoryFacts {
  repository: string;
  defaultBranch: string;
  defaultBranchSha: string;
  repositoryVersion?: string;
  standardVersion?: string;
  issues: IssueFact[];
  dependencies: DependencyFact[];
  pullRequests: PullRequestFact[];
  workflowRuns: WorkflowRunFact[];
  comments: CommentFact[];
  events: AgentEventFact[];
  artifacts: RepositoryArtifactFact[];
  collectedAt: string;
}

export interface GateSnapshot {
  state: GateState;
  exactSha?: string;
  stale: boolean;
  provenance: ProvenanceRef[];
}

export interface DispatchSnapshot {
  id: string;
  role?: string;
  operatorId?: string;
  state: DispatchState;
  provenance: ProvenanceRef[];
}

export interface PullRequestSnapshot {
  number: number;
  state: 'open' | 'closed' | 'merged';
  headSha: string;
  baseSha: string;
  htmlUrl: string;
}

export interface WorkItemSnapshot {
  taskId: string;
  issueNumber: number;
  title: string;
  lane: string;
  workflowState: WorkflowState;
  reviewPolicy: ReviewPolicy;
  risk: Risk;
  blockedBy: number[];
  blockingDependencies: number[];
  pullRequest?: PullRequestSnapshot;
  dispatch?: DispatchSnapshot;
  review: GateSnapshot;
  validation: GateSnapshot;
  ci: GateSnapshot;
  readyForBuilder: boolean;
  readyForReview: boolean;
  readyForValidation: boolean;
  readyForMerge: boolean;
  provenance: ProvenanceRef[];
}

export interface LaneSnapshot {
  id: string;
  total: number;
  done: number;
  running: number;
  blocked: number;
  taskIds: string[];
}

export interface QueueSnapshot {
  builder: number[];
  reviewer: number[];
  validator: number[];
  merge: number[];
  blocked: number[];
}

export interface VersionSnapshot {
  version: string;
  repository: string;
  standardVersion?: string;
  generatedAt: string;
  authorityNotice: 'NON_AUTHORITATIVE_DERIVED_STATE';
  progress: { total: number; done: number; running: number; ready: number; blocked: number; mergeReady: number; percent: number };
  candidateState: CandidateState;
  releaseState: ReleaseState;
  queues: QueueSnapshot;
  lanes: LaneSnapshot[];
  workItems: WorkItemSnapshot[];
  provenance: ProvenanceRef[];
}

export interface ProjectSummary {
  repository: string;
  version: string;
  generatedAt: string;
  total: number;
  done: number;
  running: number;
  blocked: number;
  candidateState: CandidateState;
  releaseState: ReleaseState;
}
