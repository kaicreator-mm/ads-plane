import { createContext, useContext } from 'react';

export type Lang = 'en' | 'zh';

const en = {
  appSubtitle: 'AI Development Standard observer',
  sync: 'Sync now',
  syncing: 'Syncing…',
  settings: 'Settings',
  openSettings: 'Open settings',
  close: 'Close',
  language: 'Language',
  authorityExplain: 'GitHub and repository durable facts remain Source of Truth.',
  versionObserver: 'Version observer',
  progress: 'Progress',
  doneHint: '{done}/{total} done',
  running: 'Running',
  ready: 'Ready',
  blocked: 'Blocked',
  mergeReady: 'Merge ready',
  laneParallelism: 'Lane parallelism',
  readyQueues: 'Ready queues',
  roleBuilder: 'Builder',
  roleReviewer: 'Reviewer',
  roleValidator: 'Validator',
  roleMerge: 'Merge',
  roleBlocked: 'Blocked',
  taskDagLanes: 'Task DAG · lanes',
  evidenceMatrix: 'Evidence truth matrix',
  colTask: 'Task',
  colState: 'State',
  colCI: 'CI',
  colReview: 'Review',
  colValidation: 'Validation',
  colPR: 'PR',
  agentDispatch: 'Agent / dispatch activity',
  noDispatch: 'No active dispatch facts.',
  taskDetail: 'Task detail',
  issue: 'Issue',
  lane: 'Lane',
  workflow: 'Workflow',
  reviewPolicy: 'Review policy',
  risk: 'Risk',
  dependencies: 'Dependencies',
  blockedBy: 'Blocked by',
  currentlyBlocking: 'Currently blocking',
  none: 'none',
  evidence: 'Evidence',
  pullRequest: 'Pull request',
  dispatch: 'Dispatch',
  provenance: 'Provenance',
  unknownOperator: 'unknown operator',
  noSnapshot: 'No project snapshot yet',
  reducing: 'Reducing project facts…',
  noSnapshotHint: 'Add a GitHub repository in settings, or start the server with ADS_DEMO=1 to load the bundled demo.',
  versionLabel: 'Version',
  candidateLabel: 'Candidate',
  releaseLabel: 'Release',
  demoBadge: 'Demo',
  demoBadgeTitle: 'Demo mode: bundled snapshot, sync disabled.',
  githubConnection: 'GitHub connection',
  tokenLabel: 'GitHub token',
  tokenHelp: 'Read-only token for the GitHub API. Public repositories work without a token; the token is stored in server memory only and is never shown again.',
  tokenConfigured: 'Configured',
  tokenNotConfigured: 'Not configured',
  tokenPlaceholder: 'ghp_… (paste a read-only token)',
  saveToken: 'Save token',
  clearToken: 'Clear',
  tokenSaved: 'Token updated.',
  tokenCleared: 'Token cleared.',
  repositoriesSection: 'Repositories',
  addRepoLabel: 'Add repository',
  addRepoPlaceholder: 'owner/repo@version',
  addRepoNoSyncHint: 'Registered without syncing.',
  addRepo: 'Add & sync',
  removeRepo: 'Remove',
  confirmRemove: 'Confirm removal?',
  invalidRepo: 'Expected owner/repo with an optional @version hint.',
  repoRemoved: 'Repository removed.',
  syncQueued: 'Sync started.',
  syncDisabledDemo: 'Sync is disabled in demo mode.',
  syncStateSyncing: 'Syncing',
  syncStateOk: 'Synced',
  syncStateError: 'Sync failed',
  lastSync: 'Last sync',
  errorPrefix: 'Error',
  allProjects: 'All projects',
  projectsOverview: 'Projects overview',
  syncAll: 'Sync all',
  syncThis: 'Sync',
  openProject: 'Open',
  noProjects: 'No repositories configured',
  noProjectsHint: 'Add repositories in settings to start monitoring.',
} as const;

export type MessageKey = keyof typeof en;

const zh: Record<MessageKey, string> = {
  appSubtitle: 'AI 开发标准观察器',
  sync: '立即同步',
  syncing: '同步中…',
  settings: '设置',
  openSettings: '打开设置',
  close: '关闭',
  language: '语言',
  authorityExplain: 'GitHub 与仓库持久事实仍是唯一事实来源。',
  versionObserver: '版本观察器',
  progress: '进度',
  doneHint: '已完成 {done}/{total}',
  running: '运行中',
  ready: '就绪',
  blocked: '已阻塞',
  mergeReady: '可合并',
  laneParallelism: '泳道并行',
  readyQueues: '就绪队列',
  roleBuilder: '构建',
  roleReviewer: '评审',
  roleValidator: '验证',
  roleMerge: '合并',
  roleBlocked: '阻塞',
  taskDagLanes: '任务 DAG · 泳道',
  evidenceMatrix: '证据真值矩阵',
  colTask: '任务',
  colState: '状态',
  colCI: 'CI',
  colReview: '评审',
  colValidation: '验证',
  colPR: 'PR',
  agentDispatch: 'Agent / 调度活动',
  noDispatch: '暂无进行中的调度事实。',
  taskDetail: '任务详情',
  issue: 'Issue',
  lane: '泳道',
  workflow: '工作流',
  reviewPolicy: '评审策略',
  risk: '风险',
  dependencies: '依赖',
  blockedBy: '被阻塞于',
  currentlyBlocking: '当前阻塞',
  none: '无',
  evidence: '证据',
  pullRequest: '拉取请求',
  dispatch: '调度',
  provenance: '溯源',
  unknownOperator: '未知操作者',
  noSnapshot: '暂无项目快照',
  reducing: '正在归约项目事实…',
  noSnapshotHint: '在设置中添加 GitHub 仓库，或以 ADS_DEMO=1 启动服务器加载内置演示数据。',
  versionLabel: '版本',
  candidateLabel: '候选',
  releaseLabel: '发布',
  demoBadge: '演示',
  demoBadgeTitle: '演示模式：内置快照，同步已禁用。',
  githubConnection: 'GitHub 连接',
  tokenLabel: 'GitHub 令牌',
  tokenHelp: '用于 GitHub API 的只读令牌。公开仓库无需令牌；令牌仅保存在服务器内存中，且不会再次显示。',
  tokenConfigured: '已配置',
  tokenNotConfigured: '未配置',
  tokenPlaceholder: 'ghp_…（粘贴只读令牌）',
  saveToken: '保存令牌',
  clearToken: '清除',
  tokenSaved: '令牌已更新。',
  tokenCleared: '令牌已清除。',
  repositoriesSection: '仓库',
  addRepoLabel: '添加仓库',
  addRepoPlaceholder: 'owner/repo@version',
  addRepoNoSyncHint: '已注册，尚未同步。',
  addRepo: '添加并同步',
  removeRepo: '移除',
  confirmRemove: '确认移除？',
  invalidRepo: '格式应为 owner/repo，可选 @版本。',
  repoRemoved: '仓库已移除。',
  syncQueued: '同步已开始。',
  syncDisabledDemo: '演示模式下不支持同步。',
  syncStateSyncing: '同步中',
  syncStateOk: '已同步',
  syncStateError: '同步失败',
  lastSync: '上次同步',
  errorPrefix: '错误',
  allProjects: '所有项目',
  projectsOverview: '项目总览',
  syncAll: '全部同步',
  syncThis: '同步',
  openProject: '查看',
  noProjects: '尚未配置仓库',
  noProjectsHint: '在设置中添加仓库以开始监控。',
};

export const messages: Record<Lang, Record<MessageKey, string>> = {en, zh};

export type Translator = (key: MessageKey) => string;

export function makeTranslator(lang: Lang): Translator {
  return (key) => messages[lang][key];
}

export function formatMessage(template: string, values: Record<string, string | number>): string {
  return template.replace(/\{(\w+)\}/g, (_, name: string) => String(values[name] ?? `{${name}}`));
}

const workflowLabels: Record<Lang, Record<string, string>> = {
  en: {},
  zh: {done: '完成', claimed: '已认领', implementing: '实现中', 'review-ready': '待评审', reviewing: '评审中', validating: '验证中', 'changes-requested': '需修改', blocked: '已阻塞', planned: '已规划'}
};
const gateLabels: Record<Lang, Record<string, string>> = {
  en: {STALE: 'STALE'},
  zh: {PASS: '通过', FAIL: '失败', NOT_RUN: '未运行', BLOCKED: '已阻塞', NOT_APPLICABLE: '不适用', STALE: '已过期'}
};
const candidateLabels: Record<Lang, Record<string, string>> = {
  en: {},
  zh: {NOT_READY: '未就绪', PREPARED: '已准备', FROZEN: '已冻结', READY: '就绪'}
};
const dispatchLabels: Record<Lang, Record<string, string>> = {
  en: {},
  zh: {RUNNING: '运行中', QUEUED: '排队中', DONE: '已完成', CANCELLED: '已取消'}
};
const roleLabels: Record<Lang, Record<string, string>> = {
  en: {},
  zh: {builder: '构建', reviewer: '评审', validator: '验证', scheduler: '调度', merge: '合并', agent: '代理'}
};
const riskLabels: Record<Lang, Record<string, string>> = {
  en: {},
  zh: {critical: '严重', high: '高', medium: '中', low: '低'}
};
const policyLabels: Record<Lang, Record<string, string>> = {
  en: {},
  zh: {required: '必须', recommended: '建议', 'not-required': '无需'}
};
const provenanceKindLabels: Record<Lang, Record<string, string>> = {
  en: {},
  zh: {repository: '仓库', issue: 'Issue', comment: '评论', 'pull-request': 'PR', 'workflow-run': '工作流运行', artifact: '制品', derived: '派生'}
};

function label(table: Record<Lang, Record<string, string>>, lang: Lang, value: string): string {
  return table[lang][value] ?? value;
}

export const enumLabels = {
  workflow: (lang: Lang, value: string) => label(workflowLabels, lang, value),
  gate: (lang: Lang, value: string) => label(gateLabels, lang, value),
  candidate: (lang: Lang, value: string) => label(candidateLabels, lang, value),
  dispatch: (lang: Lang, value: string) => label(dispatchLabels, lang, value),
  role: (lang: Lang, value: string) => label(roleLabels, lang, value),
  risk: (lang: Lang, value: string) => label(riskLabels, lang, value),
  policy: (lang: Lang, value: string) => label(policyLabels, lang, value),
  provenanceKind: (lang: Lang, value: string) => label(provenanceKindLabels, lang, value)
};

export const LangContext = createContext<Lang>('en');

export function useLang(): Lang {
  return useContext(LangContext);
}

export function detectLang(): Lang {
  try {
    const stored = localStorage.getItem('ads-plane.lang');
    if (stored === 'en' || stored === 'zh') return stored;
  } catch { /* localStorage unavailable */ }
  return navigator.language?.toLowerCase().startsWith('zh') ? 'zh' : 'en';
}

export function localeOf(lang: Lang): string {
  return lang === 'zh' ? 'zh-CN' : 'en-US';
}
