import { useCallback, useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import { Background, Controls, MarkerType, ReactFlow, type Edge, type Node } from '@xyflow/react';
import type { ProjectSummary, VersionSnapshot, WorkItemSnapshot } from '@ads-plane/contracts';
import { LangContext, detectLang, enumLabels, formatMessage, localeOf, makeTranslator, useLang, type Lang } from './i18n.js';

interface SyncStatusEntry { state: 'syncing' | 'ok' | 'error'; message?: string; at: string }
interface SettingsView {
  demo: boolean;
  repositories: Array<{repository: string; versionHint?: string}>;
  githubTokenConfigured: boolean;
  githubTokenHint?: string;
  syncStatus: Record<string, SyncStatusEntry>;
}

const api = async <T,>(url: string, init?: RequestInit): Promise<T> => {
  const response = await fetch(url, init);
  if (!response.ok) throw new Error((await response.json().catch(() => ({}))).error ?? `${response.status} ${response.statusText}`);
  return response.json() as Promise<T>;
};

function useT() {
  const lang = useLang();
  const t = useMemo(() => makeTranslator(lang), [lang]);
  return {lang, t};
}

function Badge({value, tone = 'neutral', title}: {value: string; tone?: 'neutral'|'good'|'warn'|'bad'|'active'; title?: string}) {
  return <span className={`badge badge-${tone}`} title={title}>{value}</span>;
}

function stateTone(value: string): 'neutral'|'good'|'warn'|'bad'|'active' {
  if (['done','PASS','READY','FROZEN'].includes(value)) return 'good';
  if (['blocked','FAIL','BLOCKED'].includes(value)) return 'bad';
  if (['claimed','implementing','reviewing','validating','RUNNING'].includes(value)) return 'active';
  if (['changes-requested','CONDITIONAL','STALE'].includes(value)) return 'warn';
  return 'neutral';
}

function Metric({label, value, hint}: {label: string; value: string|number; hint?: string}) {
  return <div className="metric"><div className="metric-label">{label}</div><div className="metric-value">{value}</div>{hint && <div className="metric-hint">{hint}</div>}</div>;
}

function QueuePanel({snapshot}: {snapshot: VersionSnapshot}) {
  const {t} = useT();
  const entries = [
    [t('roleBuilder'), snapshot.queues.builder], [t('roleReviewer'), snapshot.queues.reviewer], [t('roleValidator'), snapshot.queues.validator],
    [t('roleMerge'), snapshot.queues.merge], [t('roleBlocked'), snapshot.queues.blocked]
  ] as const;
  return <section className="panel queue-panel"><div className="panel-title">{t('readyQueues')}</div>{entries.map(([name, values]) =>
    <div className="queue-row" key={name}><span>{name}</span><strong>{values.length}</strong><span className="queue-refs">{values.slice(0,4).map((v) => `#${v}`).join(' · ') || '—'}</span></div>
  )}</section>;
}

function GateCell({label, gate}: {label: string; gate: WorkItemSnapshot['review']}) {
  const {lang, t} = useT();
  const value = gate.stale ? `${enumLabels.gate(lang, gate.state)} · ${enumLabels.gate(lang, 'STALE')}` : enumLabels.gate(lang, gate.state);
  return <div className="gate-cell"><span>{label}</span><Badge value={value} tone={gate.stale ? 'warn' : stateTone(gate.state)} /></div>;
}

function GateBadge({gate}: {gate: WorkItemSnapshot['review']}) {
  const lang = useLang();
  const value = gate.stale ? `${enumLabels.gate(lang, gate.state)} · ${enumLabels.gate(lang, 'STALE')}` : enumLabels.gate(lang, gate.state);
  return <Badge value={value} tone={gate.stale ? 'warn' : stateTone(gate.state)} />;
}

function EvidenceMatrix({snapshot, onSelect}: {snapshot: VersionSnapshot; onSelect: (item: WorkItemSnapshot) => void}) {
  const {lang, t} = useT();
  return <section className="panel evidence-panel">
    <div className="panel-title">{t('evidenceMatrix')}</div>
    <div className="evidence-table">
      <div className="evidence-head"><span>{t('colTask')}</span><span>{t('colState')}</span><span>{t('colCI')}</span><span>{t('colReview')}</span><span>{t('colValidation')}</span><span>{t('colPR')}</span></div>
      {snapshot.workItems.map((item) => <button className="evidence-row" key={item.issueNumber} onClick={() => onSelect(item)}>
        <span><strong>{item.taskId}</strong><small>#{item.issueNumber}</small></span>
        <span><Badge value={enumLabels.workflow(lang, item.workflowState)} tone={stateTone(item.workflowState)} /></span>
        <span><GateBadge gate={item.ci} /></span>
        <span><GateBadge gate={item.review} /></span>
        <span><GateBadge gate={item.validation} /></span>
        <span>{item.pullRequest ? `#${item.pullRequest.number}` : '—'}</span>
      </button>)}
    </div>
  </section>;
}

function LaneSummary({snapshot}: {snapshot: VersionSnapshot}) {
  const {t} = useT();
  return <section className="panel"><div className="panel-title">{t('laneParallelism')}</div><div className="lanes">
    {snapshot.lanes.map((lane) => {
      const pct = lane.total ? Math.round((lane.done / lane.total) * 100) : 0;
      return <div className="lane" key={lane.id}>
        <div className="lane-top"><strong>{lane.id}</strong><span>{lane.done}/{lane.total}</span></div>
        <div className="lane-track"><div className="lane-fill" style={{width: `${pct}%`}} /></div>
        <div className="lane-meta">{lane.running} {t('running').toLowerCase()} · {lane.blocked} {t('blocked').toLowerCase()}</div>
      </div>;
    })}
  </div></section>;
}

function Dag({snapshot, onSelect}: {snapshot: VersionSnapshot; onSelect: (item: WorkItemSnapshot) => void}) {
  const {t} = useT();
  const laneIndex = new Map(snapshot.lanes.map((lane, i) => [lane.id, i]));
  const issueToTask = new Map(snapshot.workItems.map((item) => [item.issueNumber, item]));
  const laneOffsets = new Map<string, number>();
  const nodes: Node[] = snapshot.workItems.map((item) => {
    const index = laneOffsets.get(item.lane) ?? 0;
    laneOffsets.set(item.lane, index + 1);
    return {
      id: String(item.issueNumber),
      position: {x: index * 230, y: (laneIndex.get(item.lane) ?? 0) * 150},
      data: {label: <div className="dag-node" onDoubleClick={() => onSelect(item)}><strong>{item.taskId}</strong><span>{item.title.replace(/^T[- ]?\d+\s*[—:-]?\s*/i,'')}</span><small>#{item.issueNumber} · {item.lane}</small><Badge value={item.workflowState} tone={stateTone(item.workflowState)} /></div>},
      style: {width: 205, borderRadius: 12, border: '1px solid var(--border)', background: 'var(--surface)', color: 'var(--text)', padding: 0}
    };
  });
  const laneLabelNodes: Node[] = snapshot.lanes.map((lane, i) => ({
    id: `lane-${lane.id}`, position: {x: -180, y: i * 150 + 44}, draggable: false, selectable: false, connectable: false,
    data: {label: <div className="dag-lane-label">{lane.id}</div>}
  }));
  const edges: Edge[] = snapshot.workItems.flatMap((item) => item.blockedBy.filter((dep) => issueToTask.has(dep)).map((dep) => ({
    id: `${dep}-${item.issueNumber}`, source: String(dep), target: String(item.issueNumber), markerEnd: {type: MarkerType.ArrowClosed}, animated: item.blockingDependencies.includes(dep)
  })));
  return <section className="panel dag-panel"><div className="panel-title">{t('taskDagLanes')}</div><div className="dag-canvas"><ReactFlow nodes={[...nodes, ...laneLabelNodes]} edges={edges} fitView onNodeClick={(_, node) => {const item = issueToTask.get(Number(node.id)); if (item) onSelect(item);}}><Background /><Controls /></ReactFlow></div></section>;
}

function Activity({snapshot}: {snapshot: VersionSnapshot}) {
  const {lang, t} = useT();
  const items = snapshot.workItems.filter((item) => item.dispatch).map((item) => ({item, dispatch: item.dispatch!}));
  return <section className="panel"><div className="panel-title">{t('agentDispatch')}</div>{items.length === 0 ? <div className="empty">{t('noDispatch')}</div> : <div className="activity-list">{items.map(({item,dispatch}) =>
    <div className="activity" key={dispatch.id}><div><strong>{dispatch.operatorId ?? t('unknownOperator')}</strong><span>{enumLabels.role(lang, dispatch.role ?? 'agent')} · {item.taskId}</span></div><div><Badge value={enumLabels.dispatch(lang, dispatch.state)} tone={stateTone(dispatch.state)} /><small>{dispatch.id}</small></div></div>
  )}</div>}</section>;
}

function DrawerShell({title, onClose, children}: {title: string; onClose: () => void; children: ReactNode}) {
  const {t} = useT();
  useEffect(() => {
    const onKey = (event: KeyboardEvent) => { if (event.key === 'Escape') onClose(); };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [onClose]);
  return <div className="drawer-overlay" onClick={onClose}>
    <aside className="drawer" role="dialog" aria-modal="true" aria-label={title} onClick={(event) => event.stopPropagation()}>
      <button className="close" onClick={onClose} aria-label={t('close')}>×</button>
      <div className="eyebrow">{title}</div>
      {children}
    </aside>
  </div>;
}

function DetailDrawer({item, onClose}: {item: WorkItemSnapshot | undefined; onClose: () => void}) {
  const {lang, t} = useT();
  if (!item) return null;
  return <DrawerShell title={`${t('taskDetail')} · NON_AUTHORITATIVE_DERIVED_STATE`} onClose={onClose}>
    <h2>{item.taskId}</h2><p>{item.title}</p>
    <div className="detail-grid"><span>{t('issue')}</span><strong>#{item.issueNumber}</strong><span>{t('lane')}</span><strong>{item.lane}</strong><span>{t('workflow')}</span><Badge value={enumLabels.workflow(lang, item.workflowState)} tone={stateTone(item.workflowState)} /><span>{t('reviewPolicy')}</span><strong>{enumLabels.policy(lang, item.reviewPolicy)}</strong><span>{t('risk')}</span><strong>{enumLabels.risk(lang, item.risk)}</strong></div>
    <div className="drawer-section"><h3>{t('dependencies')}</h3><p>{t('blockedBy')}: {item.blockedBy.map((v)=>`#${v}`).join(', ') || t('none')}</p><p>{t('currentlyBlocking')}: {item.blockingDependencies.map((v)=>`#${v}`).join(', ') || t('none')}</p></div>
    <div className="drawer-section"><h3>{t('evidence')}</h3><GateCell label={t('colCI')} gate={item.ci} /><GateCell label={t('colReview')} gate={item.review} /><GateCell label={t('colValidation')} gate={item.validation} /></div>
    {item.pullRequest && <div className="drawer-section"><h3>{t('pullRequest')}</h3><p>PR #{item.pullRequest.number}</p><code>{item.pullRequest.headSha}</code></div>}
    {item.dispatch && <div className="drawer-section"><h3>{t('dispatch')}</h3><p>{item.dispatch.id} · {item.dispatch.operatorId ?? t('unknownOperator')}</p><Badge value={enumLabels.dispatch(lang, item.dispatch.state)} tone={stateTone(item.dispatch.state)} /></div>}
    <div className="drawer-section"><h3>{t('provenance')}</h3>{item.provenance.map((p,i)=><div className="provenance" key={`${p.ref}-${i}`}><span>{enumLabels.provenanceKind(lang, p.kind)}</span><code>{p.ref}</code>{p.note && <small>{p.note}</small>}</div>)}</div>
  </DrawerShell>;
}

const REPO_PATTERN = /^[A-Za-z0-9_.-]+\/[A-Za-z0-9_.-]+(@[\w.-]+)?$/;

function SettingsDrawer({onClose, onChanged, onToast}: {onClose: () => void; onChanged: (settings: SettingsView) => void; onToast: (message: string, tone: 'good'|'bad') => void}) {
  const {lang, t} = useT();
  const [settings, setSettings] = useState<SettingsView>();
  const [tokenInput, setTokenInput] = useState('');
  const [repoInput, setRepoInput] = useState('');
  const [repoError, setRepoError] = useState('');
  const [confirming, setConfirming] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const confirmTimer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);

  const load = useCallback(async () => {
    try { const next = await api<SettingsView>('/api/settings'); setSettings(next); onChanged(next); }
    catch (e) { onToast(e instanceof Error ? e.message : String(e), 'bad'); }
  }, [onChanged, onToast]);

  useEffect(() => { void load(); }, [load]);
  useEffect(() => () => { if (confirmTimer.current) clearTimeout(confirmTimer.current); }, []);

  const saveToken = async () => {
    if (!settings || busy) return;
    setBusy(true);
    try {
      const next = await api<SettingsView>('/api/settings/github-token', {method: 'PUT', headers: {'content-type': 'application/json'}, body: JSON.stringify({token: tokenInput.trim()})});
      setSettings(next); onChanged(next); setTokenInput('');
      onToast(tokenInput.trim() ? t('tokenSaved') : t('tokenCleared'), 'good');
    } catch (e) { onToast(e instanceof Error ? e.message : String(e), 'bad'); }
    finally { setBusy(false); }
  };

  const addRepo = async () => {
    if (!settings || busy) return;
    const input = repoInput.trim();
    if (!REPO_PATTERN.test(input)) { setRepoError(t('invalidRepo')); return; }
    setRepoError('');
    setBusy(true);
    try {
      const next = await api<SettingsView>('/api/settings/repositories', {method: 'POST', headers: {'content-type': 'application/json'}, body: JSON.stringify({repository: input})});
      setSettings(next); onChanged(next); setRepoInput('');
      if (Object.values(next.syncStatus ?? {}).some((s) => s.state === 'syncing')) onToast(t('syncQueued'), 'good');
    } catch (e) { onToast(e instanceof Error ? e.message : String(e), 'bad'); }
    finally { setBusy(false); }
  };

  const removeRepo = async (repository: string) => {
    if (!settings || busy) return;
    if (confirming !== repository) {
      setConfirming(repository);
      if (confirmTimer.current) clearTimeout(confirmTimer.current);
      confirmTimer.current = setTimeout(() => setConfirming(null), 3000);
      return;
    }
    setBusy(true);
    try {
      const [owner, repo] = repository.split('/');
      const next = await api<SettingsView>(`/api/settings/repositories/${owner}/${repo}`, {method: 'DELETE'});
      setSettings(next); onChanged(next); setConfirming(null);
      onToast(t('repoRemoved'), 'good');
    } catch (e) { onToast(e instanceof Error ? e.message : String(e), 'bad'); }
    finally { setBusy(false); }
  };

  const syncChip = (status: SyncStatusEntry | undefined) => {
    if (!status) return null;
    if (status.state === 'syncing') return <Badge value={t('syncStateSyncing')} tone="active" />;
    if (status.state === 'ok') return <Badge value={t('syncStateOk')} tone="good" title={new Date(status.at).toLocaleString(localeOf(lang))} />;
    return <Badge value={t('syncStateError')} tone="bad" title={status.message} />;
  };

  return <DrawerShell title={t('settings')} onClose={onClose}>
    <h2>{t('settings')}</h2>
    <div className="drawer-section"><h3>{t('githubConnection')}</h3>
      <p className="settings-hint">{settings?.githubTokenConfigured ? `${t('tokenConfigured')} · ${settings.githubTokenHint}` : t('tokenNotConfigured')}</p>
      <label className="field-label" htmlFor="github-token">{t('tokenLabel')}</label>
      <div className="settings-row">
        <input id="github-token" type="password" autoComplete="off" placeholder={t('tokenPlaceholder')} value={tokenInput} onChange={(e)=>setTokenInput(e.target.value)} />
        <button onClick={()=>void saveToken()} disabled={busy}>{tokenInput.trim() ? t('saveToken') : t('clearToken')}</button>
      </div>
      <small className="settings-help">{t('tokenHelp')}</small>
    </div>
    <div className="drawer-section"><h3>{t('repositoriesSection')}</h3>
      <ul className="repo-list">
        {(settings?.repositories ?? []).map(({repository, versionHint}) => <li key={repository}>
          <div className="repo-line"><code>{repository}</code>{versionHint && <Badge value={versionHint} />} {syncChip(settings?.syncStatus?.[repository])}</div>
          <button className={confirming === repository ? 'danger confirm' : 'danger'} onClick={()=>void removeRepo(repository)} disabled={busy}>
            {confirming === repository ? t('confirmRemove') : t('removeRepo')}
          </button>
        </li>)}
      </ul>
      <label className="field-label" htmlFor="add-repo">{t('addRepoLabel')}</label>
      <div className="settings-row">
        <input id="add-repo" placeholder={t('addRepoPlaceholder')} value={repoInput} onChange={(e)=>{setRepoInput(e.target.value); setRepoError('');}} onKeyDown={(e)=>{ if (e.key === 'Enter') void addRepo(); }} aria-invalid={Boolean(repoError)} />
        <button onClick={()=>void addRepo()} disabled={busy || !repoInput.trim()}>{t('addRepo')}</button>
      </div>
      {repoError && <small className="field-error" role="alert">{repoError}</small>}
      {settings?.demo && <small className="settings-help">{t('demoBadgeTitle')}</small>}
    </div>
  </DrawerShell>;
}

export function App() {
  const [lang, setLang] = useState<Lang>(detectLang);
  const t = useMemo(() => makeTranslator(lang), [lang]);
  const [projects, setProjects] = useState<ProjectSummary[]>([]);
  const [selectedRepo, setSelectedRepo] = useState('');
  const [snapshot, setSnapshot] = useState<VersionSnapshot>();
  const [selectedItem, setSelectedItem] = useState<WorkItemSnapshot>();
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [settings, setSettings] = useState<SettingsView>();
  const [toast, setToast] = useState<{message: string; tone: 'good'|'bad'} | undefined>();

  useEffect(() => {
    try { localStorage.setItem('ads-plane.lang', lang); } catch { /* ignore */ }
    document.documentElement.lang = lang === 'zh' ? 'zh-CN' : 'en';
  }, [lang]);

  const showToast = useCallback((message: string, tone: 'good'|'bad') => {
    setToast({message, tone});
    setTimeout(() => setToast(undefined), 4000);
  }, []);

  const loadProjects = useCallback(async () => {
    try {
      const list = await api<ProjectSummary[]>('/api/projects');
      setProjects(list);
      setSelectedRepo((current) => current && list.some((p) => p.repository === current) ? current : (list[0]?.repository ?? ''));
    } catch (e) { setError(e instanceof Error ? e.message : String(e)); }
  }, []);

  useEffect(() => { void loadProjects(); }, [loadProjects]);

  useEffect(() => {
    void api<SettingsView>('/api/settings').then(setSettings).catch(() => undefined);
  }, []);

  const loadSnapshot = useCallback(async (repository: string) => {
    const [owner, repo] = repository.split('/');
    if (!owner || !repo) return;
    setLoading(true); setError('');
    try { setSnapshot(await api<VersionSnapshot>(`/api/projects/${owner}/${repo}`)); }
    catch (e) { setError(e instanceof Error ? e.message : String(e)); }
    finally { setLoading(false); }
  }, []);

  useEffect(() => { if (selectedRepo) void loadSnapshot(selectedRepo); }, [selectedRepo, loadSnapshot]);

  const syncing = useMemo(() => Object.values(settings?.syncStatus ?? {}).some((s) => s.state === 'syncing'), [settings]);
  useEffect(() => {
    if (!syncing) return;
    const timer = setInterval(async () => {
      try {
        const next = await api<SettingsView>('/api/settings');
        const stillSyncing = Object.values(next.syncStatus ?? {}).some((s) => s.state === 'syncing');
        setSettings(next);
        if (!stillSyncing) {
          await loadProjects();
          if (selectedRepo) await loadSnapshot(selectedRepo);
        }
      } catch { /* transient poll failure */ }
    }, 2500);
    return () => clearInterval(timer);
  }, [syncing, loadProjects, loadSnapshot, selectedRepo]);

  const sync = async () => {
    if (!selectedRepo) return;
    const [owner, repo] = selectedRepo.split('/'); if (!owner || !repo) return;
    setLoading(true); setError('');
    try {
      await api<SettingsView>(`/api/projects/${owner}/${repo}/sync`, {method: 'POST'});
      showToast(t('syncQueued'), 'good');
      setSettings(await api<SettingsView>('/api/settings'));
    }
    catch (e) { showToast(e instanceof Error ? e.message : String(e), 'bad'); }
    finally { setLoading(false); }
  };

  const subtitle = useMemo(() => {
    if (!snapshot) return '';
    const date = new Date(snapshot.generatedAt).toLocaleString(localeOf(lang));
    return [snapshot.version, snapshot.standardVersion ? `ADS ${snapshot.standardVersion}` : null, date].filter(Boolean).join(' · ');
  }, [snapshot, lang]);

  const demoMode = settings?.demo ?? false;

  return <LangContext.Provider value={lang}>
    <div className="app-shell">
      <header className="topbar">
        <div><div className="brand">ADS Plane</div><div className="top-sub">{t('appSubtitle')}</div></div>
        <div className="top-actions">
          <div className="lang-toggle" role="group" aria-label={t('language')}>
            <button aria-pressed={lang === 'en'} className={lang === 'en' ? 'on' : ''} onClick={()=>setLang('en')}>EN</button>
            <button aria-pressed={lang === 'zh'} className={lang === 'zh' ? 'on' : ''} onClick={()=>setLang('zh')}>中文</button>
          </div>
          <select aria-label={t('repositoriesSection')} value={selectedRepo} onChange={(e)=>setSelectedRepo(e.target.value)}>
            {projects.map((p)=><option key={p.repository}>{p.repository}</option>)}
          </select>
          {demoMode && <Badge value={t('demoBadge')} tone="warn" title={t('demoBadgeTitle')} />}
          <button onClick={()=>void sync()} disabled={!selectedRepo || loading || demoMode} title={demoMode ? t('syncDisabledDemo') : t('sync')}>{loading ? t('syncing') : t('sync')}</button>
          <button className="ghost" onClick={()=>setSettingsOpen(true)} aria-label={t('openSettings')}>⚙ {t('settings')}</button>
        </div>
      </header>
      <div className="authority-banner"><strong>NON_AUTHORITATIVE_DERIVED_STATE</strong><span>{t('authorityExplain')}</span></div>
      {error && <div className="error-banner" role="alert">{error}</div>}
      {toast && <div className={`toast toast-${toast.tone}`} role="status">{toast.message}</div>}
      {!snapshot ? <main className="empty-state"><h1>{loading ? t('reducing') : t('noSnapshot')}</h1><p>{t('noSnapshotHint')}</p><button onClick={()=>setSettingsOpen(true)}>⚙ {t('openSettings')}</button></main> : <main className="content">
        <section className="hero"><div><div className="eyebrow">{snapshot.repository}</div><h1>{t('versionObserver')}</h1><p>{subtitle}</p></div><div className="release-badges"><Badge value={`${t('candidateLabel')} ${enumLabels.candidate(lang, snapshot.candidateState)}`} tone={stateTone(snapshot.candidateState)} /><Badge value={`${t('releaseLabel')} ${enumLabels.candidate(lang, snapshot.releaseState)}`} tone={stateTone(snapshot.releaseState)} /></div></section>
        <section className="metrics"><Metric label={t('progress')} value={`${snapshot.progress.percent}%`} hint={formatMessage(t('doneHint'), {done: snapshot.progress.done, total: snapshot.progress.total})} /><Metric label={t('running')} value={snapshot.progress.running} /><Metric label={t('ready')} value={snapshot.progress.ready} /><Metric label={t('blocked')} value={snapshot.progress.blocked} /><Metric label={t('mergeReady')} value={snapshot.progress.mergeReady} /></section>
        <section className="two-col"><LaneSummary snapshot={snapshot} /><QueuePanel snapshot={snapshot} /></section>
        <Dag snapshot={snapshot} onSelect={setSelectedItem} />
        <section className="two-col evidence-layout"><EvidenceMatrix snapshot={snapshot} onSelect={setSelectedItem} /><Activity snapshot={snapshot} /></section>
      </main>}
      <DetailDrawer item={selectedItem} onClose={()=>setSelectedItem(undefined)} />
      {settingsOpen && <SettingsDrawer onClose={()=>setSettingsOpen(false)} onChanged={setSettings} onToast={showToast} />}
    </div>
  </LangContext.Provider>;
}
