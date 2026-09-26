import { useCallback, useEffect, useMemo, useState } from 'react';
import { Background, Controls, MarkerType, ReactFlow, type Edge, type Node } from '@xyflow/react';
import type { ProjectSummary, VersionSnapshot, WorkItemSnapshot } from '@ads-plane/contracts';

const api = async <T,>(url: string, init?: RequestInit): Promise<T> => {
  const response = await fetch(url, init);
  if (!response.ok) throw new Error((await response.json().catch(() => ({}))).error ?? `${response.status} ${response.statusText}`);
  return response.json() as Promise<T>;
};

function Badge({value, tone = 'neutral'}: {value: string; tone?: 'neutral'|'good'|'warn'|'bad'|'active'}) {
  return <span className={`badge badge-${tone}`}>{value}</span>;
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
  const entries = [
    ['Builder', snapshot.queues.builder], ['Reviewer', snapshot.queues.reviewer], ['Validator', snapshot.queues.validator],
    ['Merge', snapshot.queues.merge], ['Blocked', snapshot.queues.blocked]
  ] as const;
  return <section className="panel queue-panel"><div className="panel-title">Ready queues</div>{entries.map(([name, values]) =>
    <div className="queue-row" key={name}><span>{name}</span><strong>{values.length}</strong><span className="queue-refs">{values.slice(0,4).map((v) => `#${v}`).join(' · ') || '—'}</span></div>
  )}</section>;
}

function GateCell({label, gate}: {label: string; gate: WorkItemSnapshot['review']}) {
  return <div className="gate-cell"><span>{label}</span><Badge value={gate.stale ? `${gate.state} · STALE` : gate.state} tone={gate.stale ? 'warn' : stateTone(gate.state)} /></div>;
}

function EvidenceMatrix({snapshot, onSelect}: {snapshot: VersionSnapshot; onSelect: (item: WorkItemSnapshot) => void}) {
  return <section className="panel evidence-panel">
    <div className="panel-title">Evidence truth matrix</div>
    <div className="evidence-table">
      <div className="evidence-head"><span>Task</span><span>State</span><span>CI</span><span>Review</span><span>Validation</span><span>PR</span></div>
      {snapshot.workItems.map((item) => <button className="evidence-row" key={item.issueNumber} onClick={() => onSelect(item)}>
        <span><strong>{item.taskId}</strong><small>#{item.issueNumber}</small></span>
        <span><Badge value={item.workflowState} tone={stateTone(item.workflowState)} /></span>
        <span><Badge value={item.ci.stale ? 'STALE' : item.ci.state} tone={item.ci.stale ? 'warn' : stateTone(item.ci.state)} /></span>
        <span><Badge value={item.review.stale ? 'STALE' : item.review.state} tone={item.review.stale ? 'warn' : stateTone(item.review.state)} /></span>
        <span><Badge value={item.validation.stale ? 'STALE' : item.validation.state} tone={item.validation.stale ? 'warn' : stateTone(item.validation.state)} /></span>
        <span>{item.pullRequest ? `#${item.pullRequest.number}` : '—'}</span>
      </button>)}
    </div>
  </section>;
}

function LaneSummary({snapshot}: {snapshot: VersionSnapshot}) {
  return <section className="panel"><div className="panel-title">Lane parallelism</div><div className="lanes">
    {snapshot.lanes.map((lane) => {
      const pct = lane.total ? Math.round((lane.done / lane.total) * 100) : 0;
      return <div className="lane" key={lane.id}>
        <div className="lane-top"><strong>{lane.id}</strong><span>{lane.done}/{lane.total}</span></div>
        <div className="lane-track"><div className="lane-fill" style={{width: `${pct}%`}} /></div>
        <div className="lane-meta">{lane.running} running · {lane.blocked} blocked</div>
      </div>;
    })}
  </div></section>;
}

function Dag({snapshot, onSelect}: {snapshot: VersionSnapshot; onSelect: (item: WorkItemSnapshot) => void}) {
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
  const edges: Edge[] = snapshot.workItems.flatMap((item) => item.blockedBy.filter((dep) => issueToTask.has(dep)).map((dep) => ({
    id: `${dep}-${item.issueNumber}`, source: String(dep), target: String(item.issueNumber), markerEnd: {type: MarkerType.ArrowClosed}, animated: item.blockingDependencies.includes(dep)
  })));
  return <section className="panel dag-panel"><div className="panel-title">Task DAG · lanes</div><div className="dag-canvas"><ReactFlow nodes={nodes} edges={edges} fitView onNodeClick={(_, node) => {const item = issueToTask.get(Number(node.id)); if (item) onSelect(item);}}><Background /><Controls /></ReactFlow></div></section>;
}

function Activity({snapshot}: {snapshot: VersionSnapshot}) {
  const items = snapshot.workItems.filter((item) => item.dispatch).map((item) => ({item, dispatch: item.dispatch!}));
  return <section className="panel"><div className="panel-title">Agent / dispatch activity</div>{items.length === 0 ? <div className="empty">No active dispatch facts.</div> : <div className="activity-list">{items.map(({item,dispatch}) =>
    <div className="activity" key={dispatch.id}><div><strong>{dispatch.operatorId ?? 'unknown operator'}</strong><span>{dispatch.role ?? 'agent'} · {item.taskId}</span></div><div><Badge value={dispatch.state} tone={stateTone(dispatch.state)} /><small>{dispatch.id}</small></div></div>
  )}</div>}</section>;
}

function DetailDrawer({item, onClose}: {item: WorkItemSnapshot | undefined; onClose: () => void}) {
  if (!item) return null;
  return <aside className="drawer">
    <button className="close" onClick={onClose}>×</button>
    <div className="eyebrow">Task detail · NON_AUTHORITATIVE_DERIVED_STATE</div>
    <h2>{item.taskId}</h2><p>{item.title}</p>
    <div className="detail-grid"><span>Issue</span><strong>#{item.issueNumber}</strong><span>Lane</span><strong>{item.lane}</strong><span>Workflow</span><Badge value={item.workflowState} tone={stateTone(item.workflowState)} /><span>Review policy</span><strong>{item.reviewPolicy}</strong><span>Risk</span><strong>{item.risk}</strong></div>
    <div className="drawer-section"><h3>Dependencies</h3><p>Blocked by: {item.blockedBy.map((v)=>`#${v}`).join(', ') || 'none'}</p><p>Currently blocking: {item.blockingDependencies.map((v)=>`#${v}`).join(', ') || 'none'}</p></div>
    <div className="drawer-section"><h3>Evidence</h3><GateCell label="CI" gate={item.ci} /><GateCell label="Review" gate={item.review} /><GateCell label="Validation" gate={item.validation} /></div>
    {item.pullRequest && <div className="drawer-section"><h3>Pull request</h3><p>PR #{item.pullRequest.number}</p><code>{item.pullRequest.headSha}</code></div>}
    {item.dispatch && <div className="drawer-section"><h3>Dispatch</h3><p>{item.dispatch.id} · {item.dispatch.operatorId ?? 'unknown'}</p><Badge value={item.dispatch.state} tone={stateTone(item.dispatch.state)} /></div>}
    <div className="drawer-section"><h3>Provenance</h3>{item.provenance.map((p,i)=><div className="provenance" key={`${p.ref}-${i}`}><span>{p.kind}</span><code>{p.ref}</code>{p.note && <small>{p.note}</small>}</div>)}</div>
  </aside>;
}

export function App() {
  const [projects, setProjects] = useState<ProjectSummary[]>([]);
  const [selectedRepo, setSelectedRepo] = useState('');
  const [snapshot, setSnapshot] = useState<VersionSnapshot>();
  const [selectedItem, setSelectedItem] = useState<WorkItemSnapshot>();
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const loadProjects = useCallback(async () => {
    try {
      const list = await api<ProjectSummary[]>('/api/projects');
      setProjects(list);
      if (!selectedRepo && list[0]) setSelectedRepo(list[0].repository);
    } catch (e) { setError(e instanceof Error ? e.message : String(e)); }
  }, [selectedRepo]);

  useEffect(() => { void loadProjects(); }, [loadProjects]);
  useEffect(() => {
    if (!selectedRepo) return;
    const [owner,repo] = selectedRepo.split('/');
    if (!owner || !repo) return;
    setLoading(true); setError('');
    void api<VersionSnapshot>(`/api/projects/${owner}/${repo}`).then(setSnapshot).catch((e)=>setError(e instanceof Error ? e.message : String(e))).finally(()=>setLoading(false));
  }, [selectedRepo]);

  const sync = async () => {
    if (!selectedRepo) return;
    const [owner,repo] = selectedRepo.split('/'); if (!owner || !repo) return;
    setLoading(true); setError('');
    try { const next = await api<VersionSnapshot>(`/api/projects/${owner}/${repo}/sync`, {method:'POST'}); setSnapshot(next); await loadProjects(); }
    catch (e) { setError(e instanceof Error ? e.message : String(e)); }
    finally { setLoading(false); }
  };

  const subtitle = useMemo(() => snapshot ? `${snapshot.version} · ADS ${snapshot.standardVersion ?? 'unknown'} · ${new Date(snapshot.generatedAt).toLocaleString()}` : '', [snapshot]);

  return <div className="app-shell">
    <header className="topbar"><div><div className="brand">ADS Plane</div><div className="top-sub">AI Development Standard observer</div></div><div className="top-actions"><select value={selectedRepo} onChange={(e)=>setSelectedRepo(e.target.value)}>{projects.map((p)=><option key={p.repository}>{p.repository}</option>)}</select><button onClick={()=>void sync()} disabled={!selectedRepo || loading}>{loading ? 'Syncing…' : 'Sync now'}</button></div></header>
    <div className="authority-banner"><strong>NON_AUTHORITATIVE_DERIVED_STATE</strong><span>GitHub and repository durable facts remain Source of Truth.</span></div>
    {error && <div className="error-banner">{error}</div>}
    {!snapshot ? <main className="empty-state"><h1>{loading ? 'Reducing project facts…' : 'No project snapshot yet'}</h1><p>Configure <code>ADS_REPOSITORIES</code> or run with <code>ADS_DEMO=1</code>, then synchronize.</p></main> : <main className="content">
      <section className="hero"><div><div className="eyebrow">{snapshot.repository}</div><h1>Version observer</h1><p>{subtitle}</p></div><div className="release-badges"><Badge value={`Candidate ${snapshot.candidateState}`} tone={stateTone(snapshot.candidateState)} /><Badge value={`Release ${snapshot.releaseState}`} tone={stateTone(snapshot.releaseState)} /></div></section>
      <section className="metrics"><Metric label="Progress" value={`${snapshot.progress.percent}%`} hint={`${snapshot.progress.done}/${snapshot.progress.total} done`} /><Metric label="Running" value={snapshot.progress.running} /><Metric label="Ready" value={snapshot.progress.ready} /><Metric label="Blocked" value={snapshot.progress.blocked} /><Metric label="Merge ready" value={snapshot.progress.mergeReady} /></section>
      <section className="two-col"><LaneSummary snapshot={snapshot} /><QueuePanel snapshot={snapshot} /></section>
      <Dag snapshot={snapshot} onSelect={setSelectedItem} />
      <section className="two-col evidence-layout"><EvidenceMatrix snapshot={snapshot} onSelect={setSelectedItem} /><Activity snapshot={snapshot} /></section>
    </main>}
    <DetailDrawer item={selectedItem} onClose={()=>setSelectedItem(undefined)} />
  </div>;
}
