/**
 * @license
 * Copyright Google LLC All Rights Reserved.
 * Copyright (c) 2026 Ryan Lester.
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.io/license
 */
/** Six exact source successors. This module never supplies runtime admission. */
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {join,resolve} from 'node:path';
import {pathToFileURL} from 'node:url';
import {execFileSync} from 'node:child_process';
import {createHash} from 'node:crypto';
import {gunzipSync} from 'node:zlib';
const PRIOR='compatibility/rc/fixture-lifecycle-native-requalification-prior.json.gz';
const pins={main:'5c91793c0a2437ae9675adee70e2f31f40ed362b2212e35f6dcb2b71ff6935b3','21.x':'d14a17e6a1054d4d3aeb4db2cb33c8d77c7142b69d1b5d9dbe52f6bf748bc590'};
const hash=b=>createHash('sha256').update(b).digest('hex'),json=b=>JSON.stringify(b,null,2)+'\n';
const defaultRead=root=>p=>readFileSync(join(root,p));
const git=(root,commit,path)=>execFileSync('git',['--no-replace-objects','-c','gc.auto=0','-c','maintenance.auto=0','show',commit+':'+path],{cwd:root,maxBuffer:16*1024*1024,env:{...process.env,GIT_NO_LAZY_FETCH:'1'}});
export function fixtureLifecycleNativePrior({root=process.cwd(),read=defaultRead(root)}={}){
 const raw=read(PRIOR),prior=JSON.parse(gunzipSync(raw));assert.equal(hash(raw),pins[prior.line],'unknown six-proof source preimages');assert.equal(prior.schema_version,1);
 assert.equal(prior.selected.length,6);assert.equal(new Set(prior.selected.map(m=>m.sha)).size,6);assert.equal(prior.reviews.length,6);assert.equal(prior.producer_preimages.length,4);assert.equal(prior.context_preimages.length,2);
 for(const m of [prior.ledger,...prior.reviews,...prior.context_preimages]){assert.equal(hash(m.text),m.sha256);assert.equal(hash(git(root,prior.source_parent,m.path)),m.sha256,'unbound historical source: '+m.path);}
 for(const m of prior.producer_preimages){assert.equal(hash(m.before_text),m.before_sha256);assert.equal(hash(git(root,prior.producer_parent,m.path)),m.before_sha256);}
 return prior;
}
export function fixtureLifecycleNativeWrites(prior){
 const ledger=JSON.parse(prior.ledger.text),writes=new Map(),ref={path:PRIOR,sha256:pins[prior.line]};assert.equal(ledger.entries.length,1697);
 // Retain every unselected row and envelope byte, including historical
 // escaped Unicode. Re-serializing the entire ledger changes old evidence.
 const spans=nativeLedgerRows(prior.ledger.text),replacements=[];
 for(const selected of prior.selected){
  const entry=ledger.entries.find(e=>e.sha===selected.sha),previous=structuredClone(entry),member=prior.reviews.find(m=>m.path===entry.evidence_report);assert.ok(member);const body=JSON.parse(member.text);assert.equal(body.sha,entry.sha);assert.deepEqual(body.individual_proof,entry.individual_proof);
  const scope=entry.individual_proof[selected.field],stale=scope.source_members.filter(m=>m.path===selected.path);assert.equal(stale.length,1);assert.equal(stale[0].sha256,selected.before_sha256);assert.equal(prior.producer_preimages.find(m=>m.path===selected.path).sha256,selected.current_sha256);stale[0].sha256=selected.current_sha256;
  // Preserve nested historical source contexts. Direct source references in
  // this successor describe its new producer; no other evidence is refreshed.
  for(const name of ['reviewed_source_members','independent_evidence'])for(const m of body[name]??[])if(m.path===selected.path){assert.equal(m.sha256,selected.before_sha256);m.sha256=selected.current_sha256;}
  body.individual_proof=structuredClone(entry.individual_proof);
  body.recorded_source_context={inputs:ref,prior_entry:{ledger_path:prior.ledger.path,ledger_commit:prior.source_parent,entry_sha256:hash(json(previous))},prior_review:{path:member.path,sha256:member.sha256},previous_recorded_source_context:body.recorded_source_context,individual_requalification_judgment:selected.individual_requalification_judgment,source_scope_only:true,actual_native_packed_or_floor_qualified:false,note:'Exactly two public fixture lifecycle state paths changed. Every original source conclusion, patch/hunk judgment, branch minimum and actual coordinator requirement is retained.'};
  const path='compatibility/rc/fixture-lifecycle-native-requalification-'+entry.sha+'.json',bytes=Buffer.from(json(body));writes.set(path,bytes);entry.evidence_report=path;assert.ok(entry.source_check.evidence_report_sha256);entry.source_check.evidence_report_sha256=hash(bytes);
  const span=spans.find(m=>m.value.sha===entry.sha);assert.ok(span);replacements.push({...span,text:JSON.stringify(entry,null,2).replaceAll('\n','\n    ')});
 }
 let text=prior.ledger.text;for(const m of replacements.sort((a,b)=>b.start-a.start))text=text.slice(0,m.start)+m.text+text.slice(m.end);
 assert.equal(hash(json(JSON.parse(text))),hash(json(ledger)));
 return {ledger:Buffer.from(text),writes};
}
export function nativeLedgerRows(text){
 let at=text.indexOf('[',text.indexOf('"entries"'))+1;assert.ok(at>0);const rows=[];
 while(true){while(/[\s,]/.test(text[at]??''))at++;if(text[at]===']')break;const start=at;assert.equal(text[at],'{');let depth=0,string=false,escaped=false;
  for(;at<text.length;at++){const c=text[at];if(string){if(escaped)escaped=false;else if(c==='\\')escaped=true;else if(c==='"')string=false;}else if(c==='"')string=true;else if(c==='{')depth++;else if(c==='}'&&--depth===0){at++;break;}}
  assert.equal(depth,0);assert.equal(string,false);rows.push({start,end:at,value:JSON.parse(text.slice(start,at))});
 }
 assert.equal(rows.length,1697);return rows;
}
function validate({root=process.cwd(),read=defaultRead(root)}={}){
 const prior=fixtureLifecycleNativePrior({root,read}),expected=fixtureLifecycleNativeWrites(prior);
 for(const m of prior.reviews)assert.equal(hash(read(m.path)),m.sha256,'original six-proof report changed');
 for(const m of prior.producer_preimages){let count=0;const after=m.before_text.replace(/fixture(\??)\.destroyed/g,(_,optional)=>{count++;return 'fixture'+optional+'.componentRef.hostView.destroyed';});assert.equal(count,2);assert.equal(hash(after),m.sha256);assert.equal(read(m.path).toString(),after,'producer changes beyond public lifecycle state: '+m.path);}
 assert.equal(read(prior.ledger.path).equals(expected.ledger),true,'ledger differs beyond exact six-proof source delta');
 for(const [path,bytes]of expected.writes)assert.equal(read(path).equals(bytes),true,'changed six-proof source successor: '+path);
 for(const m of prior.context_preimages){let after=m.text;for(const [from,to]of m.substitutions){assert.equal(after.split(from).length,2);after=after.replace(from,to);}assert.equal(hash(after),m.after_sha256);assert.equal(read(m.path).toString(),after,'unknown task-preservation context: '+m.path);}
 const ledger=JSON.parse(expected.ledger);let members=0;
 for(const selected of prior.selected){const entry=ledger.entries.find(e=>e.sha===selected.sha);for(const m of entry.individual_proof[selected.field].source_members){assert.equal(hash(read(m.path)),m.sha256,'stale current native source: '+m.path);members++;}}
 return {prior,summary:{schema_version:1,line:prior.line,source_only_native_proofs_requalified:6,original_reports_preserved:6,unrelated_SHA_rows_preserved:1691,producer_files:4,public_state_path_repairs:8,current_native_source_members_rechecked:members,finite_task_context_edits:2,original_conclusions_dispositions_and_case_requirements_preserved:true,actual_native_packed_or_floor_qualified:false,g11_claim:'not-passed'}};
}
export function inspectFixtureLifecycleNativeRequalification(options={}){return validate(options).summary;}
/** Validate actual current files first, then expose only registered old task bytes.
 * Current production source/runtime validators never use this projection. */
export function fixtureLifecycleNativeParentReader({root=process.cwd(),read=defaultRead(root)}={}){
 const {prior}=validate({root,read}),members=new Map([prior.ledger,...prior.context_preimages].map(m=>[m.path,Buffer.from(m.text)]));return p=>members.has(p)?Buffer.from(members.get(p)):read(p);
}
if(process.argv[1]&&import.meta.url===pathToFileURL(resolve(process.argv[1])).href){
 assert.deepEqual(process.argv.slice(2),['--parent']);const {prior}=validate();process.stdout.write(JSON.stringify({ledger:prior.ledger,context_preimages:prior.context_preimages}));
}
