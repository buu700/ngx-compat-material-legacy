/**
 * @license
 * Copyright Google LLC All Rights Reserved.
 * Copyright (c) 2026 Ryan Lester.
 * Use of this source code is governed by the MIT license in LICENSE.
 */
/** Finite source-only requalification; no native, packed, security or G11 credit. */
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {execFileSync} from 'node:child_process';
import {readFileSync,writeFileSync} from 'node:fs';
import {createRequire} from 'node:module';
import {resolve} from 'node:path';
import {fileURLToPath} from 'node:url';
import {progressCspRequirements,validateProgressCsp} from './upstream-progress-csp-evidence.mjs';
import {mediaMatcherRequirements,validateMediaMatcher} from './upstream-media-matcher-evidence.mjs';
const ts=createRequire(import.meta.url)('typescript');
const INPUT='compatibility/rc/progress-media-source-4903-inputs.json';
const INPUT_SHA='a33aff8c60c50088b4e78730faa8b79c32b3672de273776b01ea01512aad8b15';
const PROOF='compatibility/rc/progress-media-source-4903-proof.json';
const hash=b=>createHash('sha256').update(b).digest('hex');
const bytes=x=>Buffer.from(JSON.stringify(x,null,2)+'\n');
const git=(root,args)=>execFileSync('git',['--no-replace-objects','-c','gc.auto=0','-c','maintenance.auto=0',...args],{cwd:root,env:{...process.env,GIT_NO_LAZY_FETCH:'1'},maxBuffer:20*1024*1024});
function patchEntries(text,entries){
 const file=ts.parseJsonText('ledger.json',text);assert.equal(file.parseDiagnostics.length,0,'malformed live ledger');
 const root=file.statements[0]?.expression;assert.ok(root && ts.isObjectLiteralExpression(root),'live ledger root must be object');
 const properties=root.properties.filter(p=>p.name?.text==='entries');assert.equal(properties.length,1,'live ledger must have exactly one entries property');
 const array=properties[0].initializer;assert.ok(ts.isArrayLiteralExpression(array),'live ledger entries must be array');const edits=[];
 for(const node of array.elements){const old=JSON.parse(node.getText(file)),next=entries.get(old.sha);if(!next)continue;
  const indent=' '.repeat(file.getLineAndCharacterOfPosition(node.getStart(file)).character);
  edits.push({start:node.getStart(file),end:node.end,text:JSON.stringify(next,null,2).replaceAll('\n','\n'+indent)});
 }
 assert.equal(edits.length,entries.size);for(const edit of edits.reverse())text=text.slice(0,edit.start)+edit.text+text.slice(edit.end);return Buffer.from(text);
}
export function buildProgressMediaSource4903({root=process.cwd(),read=p=>readFileSync(resolve(root,p))}={}) {
 const raw=read(INPUT);assert.equal(hash(raw),INPUT_SHA,'source review inputs changed');const input=JSON.parse(raw);
 assert.equal(input.source_parent,'4903a80fc76cd3b57b806a9b89003f5b1545baa5');assert.equal(input.line,'main');
 const ledgerBytes=git(root,['show',input.source_parent+':'+input.ledger_path]);assert.equal(hash(ledgerBytes),input.ledger_sha256,'prior ledger not Git-authenticated');
 const ledger=JSON.parse(ledgerBytes);assert.equal(input.prior_entries.length,3);const changes=new Map();
 for(const row of input.reviewed_changes){
  assert.ok(!changes.has(row.path));const before=git(root,['show',row.before_commit+':'+row.path]);const after=git(root,['show',input.source_parent+':'+row.path]);
  const diff=git(root,['diff','--no-ext-diff','--no-renames',row.before_commit,input.source_parent,'--',row.path]);
  assert.equal(hash(before),row.before_sha256,'before Git subject changed '+row.path);assert.equal(hash(after),row.after_sha256,'after Git subject changed '+row.path);
  assert.equal(hash(read(row.path)),row.after_sha256,'live source changed '+row.path);assert.equal(hash(diff),row.diff_sha256,'complete Git delta changed '+row.path);assert.equal(diff.length,row.diff_bytes);
  assert.ok(row.decision.length>40);changes.set(row.path,row);
 }
 assert.equal(changes.size,13);
 for(const report of input.prior_reports){const current=read(report.path);assert.equal(hash(current),report.sha256,'prior report changed');assert.equal(hash(git(root,['show',input.source_parent+':'+report.path])),report.sha256,'prior report not Git-authenticated');}
 // The exact source deltas are authenticated above; independently pin the finite
 // unchanged behavioral entry points. Other possible caller inputs are not claimed.
 const anchors=[['projects/ngx-material-legacy/legacy-core/internal/legacy-animations.ts',"matchMedia('(prefers-reduced-motion)')"],['projects/ngx-material-legacy/legacy-autocomplete/internal/autocomplete-trigger-base.ts','.observe(Breakpoints.HandsetLandscape)'],['projects/ngx-material-legacy/legacy-tooltip/tooltip.ts','breakpointObserver.observe(Breakpoints.Handset)'],['projects/ngx-material-legacy/legacy-snack-bar/internal/snack-bar-base.ts','.observe(Breakpoints.HandsetPortrait)']];
 for(const [path,text]of anchors){const row=changes.get(path);assert.ok(git(root,['show',row.before_commit+':'+path]).toString().includes(text));assert.ok(read(path).toString().includes(text));}
 const browser=read('scripts/browser-surface-families.mjs').toString();for(const text of ['peer_media_matcher: peerMediaMatcher','media_matcher_peer: mediaMatcherPeer','progress_csp: progressCsp','PEER_ICON_TT_CSP + "; img-src \'none\'"'])assert.ok(browser.includes(text),text);
 const proof={schema_version:1,line:'main',source_parent:input.source_parent,producer:{path:'scripts/progress-media-source-4903.mjs',sha256:hash(read('scripts/progress-media-source-4903.mjs'))},inputs:{path:INPUT,sha256:INPUT_SHA},prior_ledger:{path:input.ledger_path,sha256:input.ledger_sha256},prior_reports:input.prior_reports,reviewed_changes:input.reviewed_changes,
  source_scope_only:true,actual_native_packed_or_floor_qualified:false,g11_claim:'not-passed',scope:input.scope};
 const writes=new Map([[PROOF,bytes(proof)]]),proofRef={path:PROOF,sha256:hash(writes.get(PROOF))},entries=new Map();
 for(const old of input.prior_entries){
  assert.deepEqual(ledger.entries.find(row=>row.sha===old.sha),old,'prior selected ledger row changed');const entry=structuredClone(old),isMedia=entry.sha.startsWith('231f94');
  const field=isMedia?'media_matcher_behavior':'progress_csp_behavior';const req=isMedia?mediaMatcherRequirements(entry.sha,'main'):progressCspRequirements(entry.sha);
  const scope=entry.individual_proof[field];assert.deepEqual([...scope.source_members.map(x=>x.path)].sort(),[...req.members].sort());
  scope.source_members=scope.source_members.map(member=>{const current=hash(read(member.path));const changed=changes.get(member.path);if(changed){assert.equal(member.sha256,changed.before_sha256,'prior member disagrees with Git preimage');assert.equal(current,changed.after_sha256);}else assert.equal(current,member.sha256,'unreviewed source member changed');return {...member,sha256:current};});
  const prior=input.prior_reports.find(x=>x.sha===entry.sha);const previousBody=JSON.parse(read(prior.path));assert.equal(previousBody.sha,entry.sha);const body=structuredClone(previousBody);
  body.individual_proof=structuredClone(entry.individual_proof);body.progress_media_source_requalification={source_proof:proofRef,prior_entry:old,prior_review:prior,source_scope_only:true,actual_native_packed_or_floor_qualified:false,g11_claim:'not-passed',note:'The old document and any preexisting proof mismatch remain intact; this adds no runtime, security, branch, case or decision credit.'};
  const out='compatibility/rc/progress-media-source-4903-'+entry.sha+'.json';const report=bytes(body);writes.set(out,report);entry.evidence_report=out;if(entry.source_check?.evidence_report_sha256)entry.source_check.evidence_report_sha256=hash(report);entries.set(entry.sha,entry);
 }
 const liveLedger=read(input.ledger_path);const live=JSON.parse(liveLedger);assert.ok(Array.isArray(live.entries),'live ledger entries must be an array');
 for(const old of input.prior_entries){
  const matches=live.entries.filter(row=>row && row.sha===old.sha);assert.equal(matches.length,1,'selected row missing or duplicated: '+old.sha);
  const next=entries.get(old.sha);assert.ok(JSON.stringify(matches[0])===JSON.stringify(old)||JSON.stringify(matches[0])===JSON.stringify(next),'selected row contains unreviewed changes: '+old.sha);
 }
 const nextLedger=patchEntries(liveLedger.toString(),entries);writes.set(input.ledger_path,nextLedger);return {input,proof,proofRef,writes,entries};
}
export async function verifyProgressMediaSource4903(options={}){
 const result=buildProgressMediaSource4903(options);const {root=process.cwd()}=options;
 for(const entry of result.entries.values()){
  const proof=entry.individual_proof;const outcome=entry.sha.startsWith('231f94')?validateMediaMatcher({root,entry,proof,request:{line:'main'}}):validateProgressCsp({root,entry,proof});
  assert.equal(outcome.ok,false);assert.match(outcome.detail,/missing coordinator run|missing.*run/);
 }
 return {...result,actual_native_packed_or_floor_qualified:false,g11_claim:'not-passed'};
}
if(process.argv[1]&&resolve(process.argv[1])===fileURLToPath(import.meta.url)){
 const action=process.argv[2];assert.equal(action,'--write','expected --write');const result=buildProgressMediaSource4903();for(const [path,data] of result.writes)writeFileSync(resolve(path),data);console.log(JSON.stringify({updated_rows:result.entries.size,source_changes:result.input.reviewed_changes.length,actual_native_packed_or_floor_qualified:false,g11_claim:'not-passed'}));
}
