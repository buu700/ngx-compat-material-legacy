/** @license Copyright Google LLC All Rights Reserved. Copyright (c) 2026 Ryan Lester. MIT. */
import assert from 'node:assert/strict';
import {readFileSync,mkdtempSync,mkdirSync,writeFileSync,rmSync} from 'node:fs';
import {join,dirname} from 'node:path';
import {tmpdir} from 'node:os';
import {gunzipSync} from 'node:zlib';
import {sassInspectionSourceBatch,sassInspectionEntrySourceOk} from '../scripts/upstream-sass-inspection-admission.mjs';
const root=process.cwd(),physical=p=>readFileSync(join(root,p));
const body=JSON.parse(physical('compatibility/rc/upstream-sass-inspection-individual-review.json'));
const packet=JSON.parse(gunzipSync(physical('compatibility/rc/upstream-sass-inspection-ledger-transition.json.gz')));
const entries=packet.entries.map(row=>row.after_entry),group=process.argv[2]??'metadata';
let reads=0;const read=p=>{reads++;return physical(p);};
const args=()=>({root,read,line:body.line,body:structuredClone(body),entries:structuredClone(entries)});
if(group==='metadata'){
 const checks=[],reject=(name,mutate)=>{const value=args();mutate(value);const before=reads;assert.throws(()=>sassInspectionSourceBatch(value),undefined,name);assert.equal(reads,before,'invalid metadata invoked supplied reader');checks.push(name);};
 reject('partial roster',a=>a.entries.pop());
 reject('duplicate roster',a=>a.entries[1]=structuredClone(a.entries[0]));
 reject('unknown roster SHA',a=>a.entries[0].sha='0'.repeat(40));
 reject('changed body',a=>a.body.g11_claim='passed');
 reject('changed decision',a=>a.entries[0].reason+=' unreviewed');
 reject('changed disposition',a=>a.entries[0].final_disposition='inherited');
 reject('missing proof',a=>delete a.entries[0].individual_proof);
 reject('changed diff proof',a=>a.entries[0].individual_proof.diff_sha256='0'.repeat(64));
 reject('changed source SHA',a=>a.entries[0].individual_proof.sass_inspection.sha='0'.repeat(40));
 reject('changed source files',a=>a.entries[0].files=[]);
 reject('wrong line',a=>a.line=a.line==='main'?'21.x':'main');
 let getters=0;
 reject('reader accessor',a=>Object.defineProperty(a,'read',{get(){getters++;return read;},enumerable:true}));
 reject('roster accessor',a=>Object.defineProperty(a,'entries',{get(){getters++;return entries;},enumerable:true}));
 reject('nested metadata accessor',a=>Object.defineProperty(a.entries[0],'reason',{get(){getters++;return entries[0].reason;},enumerable:true}));
 const proxy=new Proxy(args(),{getOwnPropertyDescriptor(){getters++;return undefined;}});assert.throws(()=>sassInspectionSourceBatch(proxy));checks.push('argument proxy');
 const bad=structuredClone(entries[0]);bad.reason+=' unreviewed';const before=reads;
 assert.equal(sassInspectionEntrySourceOk({root,read,line:body.line,body,entry:bad}),false);assert.equal(reads,before);checks.push('individual invalid proof remains false');
 for(const key of ['source_census','current_compiler_scope']){
  const fixture=mkdtempSync(join(tmpdir(),'sass-review-preflight-'));
  try{
   for(const path of ['scripts/upstream-sass-inspection-admission.mjs','compatibility/rc/upstream-sass-inspection-individual-review.json',body.upstream_originals.path,body.source_census.path,body.current_compiler_scope.path]){
    mkdirSync(dirname(join(fixture,path)),{recursive:true});writeFileSync(join(fixture,path),physical(path));
   }
   const path=body[key].path,original=physical(path);writeFileSync(join(fixture,path),Buffer.concat([original,Buffer.from(' ')]));
   const value=args();value.root=fixture;value.read=p=>{reads++;writeFileSync(join(fixture,path),original);return readFileSync(join(fixture,p));};
   assert.throws(()=>sassInspectionSourceBatch(value),undefined,key+' cold corruption');assert.equal(reads,0,'cold corruption reached restoring callback');checks.push(key+' cold restore rejected before callbacks');
  }finally{rmSync(fixture,{recursive:true,force:true});}
 }
 assert.equal(getters,0);assert.equal(reads,0);
 console.log(JSON.stringify({result:'pass',checks,checks_passed:checks.length,provided_reads:reads,getters}));
}else if(group==='positive'){
 const start=performance.now(),batch=sassInspectionSourceBatch(args());
 assert.deepEqual([...batch.validated_shas].sort(),entries.map(row=>row.sha).sort());
 assert.equal(batch.scope.owned_scss_population.length,409);
 assert.equal(batch.scope.candidate.loaded_sources.length+batch.scope.current.loaded_sources.length,658);
 assert.equal(batch.fresh_compiler_execution,false);assert.equal(batch.artifact_or_audit_admission_granted,false);
 console.log(JSON.stringify({result:'pass',seconds:(performance.now()-start)/1000,decisions:6,owned_scss:409,loaded_sources:658,provided_reads:reads}));
}else if(group==='guards'){
 const start=performance.now(),value=args(),checks=[];let batch,armed=false,mode='';
 const sourceRead=p=>{
  reads++;
  if(armed&&mode==='bytes'&&p==='scripts/upstream-sass-inspection-admission.mjs'){armed=false;return Buffer.from('not the physical source');}
  if(armed&&mode==='scope-packet'&&p===body.current_compiler_scope.path){armed=false;return Buffer.from('not the physical scope packet');}
  if(armed&&mode==='census'&&p===body.source_census.path){armed=false;return Buffer.from('not the physical original census');}
  if(armed&&!['bytes','scope-packet','census'].includes(mode)){
   armed=false;
   if(mode==='input')value.entries[0].reason+=' changed during guard';
   if(mode==='scope')batch.scope.owned_scss_population[0].sha256='0'.repeat(64);
   if(mode==='reader')value.read=physical;
   if(mode==='reentry'){try{batch.assertCurrent();}catch{}}
   if(mode==='factory-reentry'){try{sassInspectionSourceBatch(value);}catch{}}
  }
  return physical(p);
 };
 value.read=sourceRead;batch=sassInspectionSourceBatch(value);
 for(const next of ['input','scope','reader','bytes','scope-packet','census','reentry','factory-reentry']){
  const reason=value.entries[0].reason,sha=batch.scope.owned_scss_population[0].sha256;
  try{mode=next;armed=true;assert.throws(()=>batch.assertCurrent(),undefined,next);checks.push(next+' rejected');}
  finally{armed=false;value.entries[0].reason=reason;value.read=sourceRead;batch.scope.owned_scss_population[0].sha256=sha;}
  batch.assertCurrent();checks.push(next+' recovered');
 }
 console.log(JSON.stringify({result:'pass',seconds:(performance.now()-start)/1000,checks,checks_passed:checks.length,decisions:6,provided_reads:reads}));
}else throw new Error('Unknown source stage probe group');
