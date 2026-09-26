import type { ProvenanceRef, VersionSnapshot } from '@ads-plane/contracts';

const issueProvenance = (number: number): ProvenanceRef[] => [{kind: 'issue', ref: `issue:#${number}`}];

export function demoSnapshot(): VersionSnapshot {
  const generatedAt = new Date().toISOString();
  const baseGate = {state: 'NOT_RUN' as const, stale: false, provenance: []};
  return {
    repository: 'kaicreator-mm/demo-ads-project', version: 'v0.4', standardVersion: '4.0.0', generatedAt,
    authorityNotice: 'NON_AUTHORITATIVE_DERIVED_STATE', candidateState: 'PREPARED', releaseState: 'NOT_READY',
    progress: {total: 7, done: 2, running: 2, ready: 1, blocked: 1, mergeReady: 1, percent: 29},
    queues: {builder: [104], reviewer: [103], validator: [105], merge: [103], blocked: [106]},
    lanes: [
      {id: 'contract', total: 2, done: 2, running: 0, blocked: 0, taskIds: ['T-001','T-002']},
      {id: 'core', total: 2, done: 0, running: 1, blocked: 0, taskIds: ['T-003','T-004']},
      {id: 'ux', total: 1, done: 0, running: 1, blocked: 0, taskIds: ['T-005']},
      {id: 'validation', total: 1, done: 0, running: 0, blocked: 1, taskIds: ['T-006']},
      {id: 'integration', total: 1, done: 0, running: 0, blocked: 0, taskIds: ['T-007']}
    ],
    workItems: [
      {taskId:'T-001',issueNumber:101,title:'T-001 — contract model',lane:'contract',workflowState:'done',reviewPolicy:'required',risk:'high',blockedBy:[],blockingDependencies:[],review:{state:'PASS',stale:false,provenance:[]},validation:{state:'PASS',stale:false,provenance:[]},ci:{state:'PASS',stale:false,provenance:[]},readyForBuilder:false,readyForReview:false,readyForValidation:false,readyForMerge:false,provenance:issueProvenance(101)},
      {taskId:'T-002',issueNumber:102,title:'T-002 — schema',lane:'contract',workflowState:'done',reviewPolicy:'recommended',risk:'medium',blockedBy:[101],blockingDependencies:[],review:{state:'PASS',stale:false,provenance:[]},validation:{state:'PASS',stale:false,provenance:[]},ci:{state:'PASS',stale:false,provenance:[]},readyForBuilder:false,readyForReview:false,readyForValidation:false,readyForMerge:false,provenance:issueProvenance(102)},
      {taskId:'T-003',issueNumber:103,title:'T-003 — reducer',lane:'core',workflowState:'review-ready',reviewPolicy:'required',risk:'high',blockedBy:[102],blockingDependencies:[],pullRequest:{number:201,state:'open',headSha:'b88d2f1',baseSha:'aa0182c',htmlUrl:'#'},review:{state:'NOT_RUN',stale:false,provenance:[]},validation:{state:'PASS',exactSha:'b88d2f1',stale:false,provenance:[]},ci:{state:'PASS',exactSha:'b88d2f1',stale:false,provenance:[]},readyForBuilder:false,readyForReview:true,readyForValidation:false,readyForMerge:true,provenance:issueProvenance(103)},
      {taskId:'T-004',issueNumber:104,title:'T-004 — GitHub adapter',lane:'core',workflowState:'implementing',reviewPolicy:'recommended',risk:'medium',blockedBy:[102],blockingDependencies:[],dispatch:{id:'D-104',role:'builder',operatorId:'codex-ubuntu',state:'RUNNING',provenance:[]},review:baseGate,validation:baseGate,ci:baseGate,readyForBuilder:false,readyForReview:false,readyForValidation:false,readyForMerge:false,provenance:issueProvenance(104)},
      {taskId:'T-005',issueNumber:105,title:'T-005 — observer UI',lane:'ux',workflowState:'validating',reviewPolicy:'recommended',risk:'medium',blockedBy:[102],blockingDependencies:[],dispatch:{id:'D-105',role:'validator',operatorId:'chatgpt-web',state:'RUNNING',provenance:[]},pullRequest:{number:205,state:'open',headSha:'def456',baseSha:'aa0182c',htmlUrl:'#'},review:{state:'PASS',exactSha:'abc123',stale:true,provenance:[]},validation:baseGate,ci:{state:'PASS',exactSha:'def456',stale:false,provenance:[]},readyForBuilder:false,readyForReview:false,readyForValidation:true,readyForMerge:false,provenance:issueProvenance(105)},
      {taskId:'T-006',issueNumber:106,title:'T-006 — platform validation',lane:'validation',workflowState:'blocked',reviewPolicy:'not-required',risk:'high',blockedBy:[105],blockingDependencies:[105],review:{state:'NOT_APPLICABLE',stale:false,provenance:[]},validation:{state:'BLOCKED',stale:false,provenance:[]},ci:baseGate,readyForBuilder:false,readyForReview:false,readyForValidation:false,readyForMerge:false,provenance:issueProvenance(106)},
      {taskId:'T-007',issueNumber:107,title:'T-007 — integration closure',lane:'integration',workflowState:'planned',reviewPolicy:'required',risk:'critical',blockedBy:[103,104,105,106],blockingDependencies:[103,104,105,106],review:baseGate,validation:baseGate,ci:baseGate,readyForBuilder:false,readyForReview:false,readyForValidation:false,readyForMerge:false,provenance:issueProvenance(107)}
    ],
    provenance: [{kind:'derived',ref:'demo-fixture',note:'Bundled deterministic UI/demo snapshot.'}]
  };
}
