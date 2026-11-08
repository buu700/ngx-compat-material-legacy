/**
 * @license
 * Copyright Google LLC All Rights Reserved.
 * Copyright (c) 2026 Ryan Lester.
 * Use of this source code is governed by the MIT license in LICENSE.
 */
/** Metadata corruption tests only; no native run or canonical mutation. */
import assert from 'node:assert/strict';
import {readFileSync,writeFileSync,mkdirSync,mkdtempSync,copyFileSync,rmSync,renameSync,unlinkSync} from 'node:fs';
import {tmpdir} from 'node:os';
import {execFileSync} from 'node:child_process';
import {createHash} from 'node:crypto';
import {gunzipSync} from 'node:zlib';
import {resolve,dirname,join} from 'node:path';
import {fileURLToPath} from 'node:url';
import {prepareInventoryReferenceMetadata,prepareInventoryReferenceSourceMetadata,INVENTORY_REFERENCE_LEDGER,INVENTORY_REFERENCE_PACKET} from '../scripts/inventory-reference-proposal.mjs';
const arg=process.argv.slice(2);assert.ok(arg.length===0||arg.length===2&&arg[0]==='--cohort');
const cohort=arg.length?arg[1]:'full',match=/^(late|cold):(0|[1-9]|[12][0-9]|3[01])$/.exec(cohort),shards=32;
assert.ok(['full','boundary','sticky','images','roster'].includes(cohort)||/^boundary:[0-3]$/.test(cohort)||/^namespace:[0-2]$/.test(cohort)||/^sticky:[01]:[01]$/.test(cohort)||match&&Number(match[2])<shards,'unknown cohort');
const has=name=>cohort==='full'||cohort===name;
const baseRoot=resolve(dirname(fileURLToPath(import.meta.url)),'..'),baseRead=path=>readFileSync(resolve(baseRoot,path));
// Preserve the historical stage as a physical member in an isolated fixture;
// callback-supplied bytes may never impersonate the live physical ledger.
const bootstrap=prepareInventoryReferenceSourceMetadata({root:baseRoot,read:baseRead});
const root=mkdtempSync(join(tmpdir(),'inventory-reference-stage-'));
try {
 const gitDir=execFileSync('git',['rev-parse','--absolute-git-dir'],{cwd:baseRoot,encoding:'utf8'}).trim();writeFileSync(join(root,'.git'),'gitdir: '+gitDir+'\n');
 for(const ref of bootstrap.bound){const dest=resolve(root,ref.path);mkdirSync(dirname(dest),{recursive:true});copyFileSync(resolve(baseRoot,ref.path),dest);}
 const stagePath='compatibility/rc/c04-inventory-reference-proposal-after.json.gz';
 const stageAfter=gunzipSync(baseRead(stagePath));
 for(const [path,bytes] of [[stagePath,baseRead(stagePath)],[INVENTORY_REFERENCE_LEDGER,stageAfter]]){const dest=resolve(root,path);mkdirSync(dirname(dest),{recursive:true});writeFileSync(dest,bytes);}
 const raw=path=>readFileSync(resolve(root,path)),hash=b=>createHash('sha256').update(b).digest('hex'),beforeLive=raw(INVENTORY_REFERENCE_LEDGER);
 const stageRead=raw,cases=[];
 if(has('images')){assert.throws(()=>prepareInventoryReferenceMetadata({root,read:path=>path===INVENTORY_REFERENCE_LEDGER?Buffer.concat([raw(path),Buffer.from(' ')]):raw(path)}));cases.push('forged-ledger');}
const subject=prepareInventoryReferenceMetadata({root,read:stageRead});
const after=Buffer.from(subject.after),data=JSON.parse(after),packet=JSON.parse(raw(INVENTORY_REFERENCE_PACKET));
// Changes to any previously observed physical source or the ledger during a
// supplied callback must reject before another callback can restore it.
const selectPath='projects/ngx-material-legacy/legacy-select/select.spec.ts',selectBytes=raw(selectPath),ledgerBytes=raw(INVENTORY_REFERENCE_LEDGER);
const replace=(path,bytes)=>{const dest=resolve(root,path),next=dest+'.control';writeFileSync(next,bytes);renameSync(next,dest);};
let boundaryArmed=false,boundaryTriggered=false,boundaryTrigger=INVENTORY_REFERENCE_LEDGER,boundaryTarget=selectPath,boundaryOriginal=selectBytes;
const boundaryRead=path=>{const value=raw(path);if(boundaryArmed&&!boundaryTriggered&&path===boundaryTrigger){boundaryTriggered=true;replace(boundaryTarget,Buffer.concat([boundaryOriginal,Buffer.from(' ')]));}return value;};
const boundaryMatch=/^boundary:([0-3])$/.exec(cohort);
if(has('boundary')||boundaryMatch){
for(const [bi,mode] of ['construction','assertCurrent','verifyAfter','inverse'].entries()){
 if(boundaryMatch&&Number(boundaryMatch[1])!==bi)continue;
 boundaryArmed=false;boundaryTriggered=false;boundaryTrigger=INVENTORY_REFERENCE_LEDGER;boundaryTarget=selectPath;boundaryOriginal=selectBytes;
 const tested=mode==='construction'?null:prepareInventoryReferenceMetadata({root,read:boundaryRead});
 if(mode==='inverse'){boundaryTrigger=selectPath;boundaryTarget=INVENTORY_REFERENCE_LEDGER;boundaryOriginal=ledgerBytes;}
 boundaryArmed=true;
 try{assert.throws(()=>mode==='construction'?prepareInventoryReferenceMetadata({root,read:boundaryRead}):mode==='verifyAfter'?tested.verifyAfter(tested.after):tested.assertCurrent());assert.equal(boundaryTriggered,true);}
 finally{boundaryArmed=false;replace(selectPath,selectBytes);replace(INVENTORY_REFERENCE_LEDGER,ledgerBytes);}
 if(tested)tested.assertCurrent();cases.push('boundary:'+mode);
}
for(const [bi,[target,original]] of [[selectPath,selectBytes],[INVENTORY_REFERENCE_LEDGER,ledgerBytes]].entries()){
 if(boundaryMatch&&Number(boundaryMatch[1])!==bi)continue;
 let fired=false,restored=false;const earlyRead=path=>{const value=raw(path);if(path==='projects/ngx-material-legacy/package.json'&&!fired){fired=true;replace(target,Buffer.concat([original,Buffer.from(' ')]));}else if(fired&&!restored){restored=true;replace(target,original);}return value;};
 try{assert.throws(()=>prepareInventoryReferenceMetadata({root,read:earlyRead}));assert.equal(fired,true);assert.equal(restored,false,'early mutation rejected before next callback');}finally{replace(target,original);}
 cases.push('early:'+target);
}
// Exercise the other registered stage as a physical ledger, then restore the
// after-image before any following controls.
if(!boundaryMatch||boundaryMatch[1]==='2'){
try{replace(INVENTORY_REFERENCE_LEDGER,subject.before);const beforeStage=prepareInventoryReferenceMetadata({root,read:stageRead});assert.equal(beforeStage.current_canonical_state,'before');beforeStage.assertCurrent();assert.equal(beforeStage.verifyAfter(beforeStage.after).metadata_only,true);}
finally{replace(INVENTORY_REFERENCE_LEDGER,ledgerBytes);}
cases.push('physical-before-stage');
}
}
// A callback must not add a shim and restore it after a subsequent read.
const namespaceMatch=/^namespace:([0-2])$/.exec(cohort);
if(cohort==='full'||namespaceMatch){
 for(const [ni,mode] of ['construction','assertCurrent','verifyAfter'].entries()){
  if(namespaceMatch&&Number(namespaceMatch[1])!==ni)continue;
  const extra=resolve(root,ni===0?'testing/legacy-runner/shims/harness/guard-extra.spec.ts':'testing/legacy-runner/shims/harness/tooltip/guard-extra.spec.ts');let armed=false,fired=false,restored=false;
  const namespaceRead=path=>{const value=raw(path);if(armed&&!fired&&path==='projects/ngx-material-legacy/package.json'){fired=true;writeFileSync(extra,'extra');}else if(armed&&fired&&!restored){restored=true;unlinkSync(extra);}return value;};
  const tested=mode==='construction'?null:prepareInventoryReferenceMetadata({root,read:namespaceRead});armed=true;
  try{assert.throws(()=>mode==='construction'?prepareInventoryReferenceMetadata({root,read:namespaceRead}):mode==='assertCurrent'?tested.assertCurrent():tested.verifyAfter(tested.after));assert.equal(fired,true);assert.equal(restored,false,'namespace mutation must fail before next callback');}
  finally{armed=false;try{unlinkSync(extra);}catch(e){if(e.code!=='ENOENT')throw e;}}
  if(tested)tested.assertCurrent();cases.push('namespace:'+mode);
 }
}
// A supplied reader may catch a nested rejection; the enclosing transaction
// must still fail for construction, both assertion APIs and verification.
let reentryAction=null,reentryTriggered=false,reentrySubject;
const reentryRead=path=>{const bytes=stageRead(path);if(reentryAction&&path==='projects/ngx-material-legacy/legacy-select/select.spec.ts'&&!reentryTriggered){reentryTriggered=true;try{reentryAction();}catch{}}return bytes;};
const stickyMatch=/^sticky:([01]):([01])$/.exec(cohort);
if(has('sticky')||stickyMatch){
for(const [ci,construct] of [()=>prepareInventoryReferenceSourceMetadata({root,read:reentryRead}),()=>prepareInventoryReferenceMetadata({root,read:reentryRead})].entries()){
 if(stickyMatch&&Number(stickyMatch[1])!==ci)continue;
 if(!stickyMatch||stickyMatch[2]==='0'){reentryTriggered=false;reentryAction=()=>prepareInventoryReferenceSourceMetadata({root,read:reentryRead});assert.throws(construct);assert.equal(reentryTriggered,true);reentryAction=null;cases.push('sticky:factory:'+ci);}
 reentrySubject=construct();
 for(const [ei,entry] of [()=>reentrySubject.assertCurrent(),()=>reentrySubject.verifyAfter(Buffer.from(reentrySubject.after))].entries()){
  if(stickyMatch&&Number(stickyMatch[2])!==ei)continue;
  for(const [ni,nested] of [()=>reentrySubject.assertCurrent(),()=>reentrySubject.verifyAfter(Buffer.from(reentrySubject.after)),()=>prepareInventoryReferenceMetadata({root,read:reentryRead})].entries()){
   reentryTriggered=false;reentryAction=nested;assert.throws(entry);assert.equal(reentryTriggered,true);reentryAction=null;reentrySubject.assertCurrent();cases.push(`sticky:${ci}:${ei}:${ni}`);
  }
 }
}
}

assert.equal(subject.current_canonical_state,stageRead(INVENTORY_REFERENCE_LEDGER).equals(subject.before)?'before':'after');assert.equal(subject.canonical_owner_integration_complete,false);
assert.ok(after.equals(gunzipSync(raw('compatibility/rc/c04-inventory-reference-proposal-after.json.gz'))));
assert.equal(subject.verifyAfter(after).native_or_full_audit_credit,false);
const at=(entry,pointer)=>pointer.split('/').filter(Boolean).reduce((value,key)=>value[Array.isArray(value)?Number(key):key],entry);
// Mutate exact original bytes, then prove the parsed value is precisely the
// intended single change. This preserves unrelated ledger formatting.
const replaceOne=(text,needle,value)=>{const i=text.indexOf(needle);assert.ok(i>=0,'mutation target missing');assert.equal(text.indexOf(needle,i+needle.length),-1,'mutation target ambiguous');return text.slice(0,i)+value+text.slice(i+needle.length);};
const entryMutation=(sha,needle,value,expected)=>{const text=after.toString('utf8'),marker='\n      "sha": "'+sha+'"',start=text.indexOf(marker);assert.ok(start>=0);assert.equal(text.indexOf(marker,start+marker.length),-1);const end=text.indexOf('\n    },',start);assert.ok(end>start);const output=text.slice(0,start)+replaceOne(text.slice(start,end),needle,value)+text.slice(end);const bytes=Buffer.from(output);assert.ok(!bytes.equals(after));assert.deepEqual(JSON.parse(bytes),expected,'mutation did not produce only intended value');return bytes;};
const rootMutation=(needle,value,expected)=>{const output=replaceOne(after.toString('utf8'),needle,value),bytes=Buffer.from(output);assert.ok(!bytes.equals(after));assert.deepEqual(JSON.parse(bytes),expected,'mutation did not produce only intended value');return bytes;};

let partial=0,historical=0,other=0;
if(has('images')){
for(const update of subject.updates){
 const mutant=structuredClone(data),entry=mutant.entries.find(row=>row.sha===update.sha);
 at(entry,update.pointer).sha256=update.before_reference.sha256;
 const bytes=entryMutation(update.sha,update.after_reference.sha256,update.before_reference.sha256,mutant);assert.throws(()=>subject.verifyAfter(bytes));partial++;cases.push(`partial:${update.sha}:${update.pointer}`);
}
for(const target of subject.historical){
 const mutant=structuredClone(data),entry=mutant.entries.find(row=>row.sha===target.sha);
 at(entry,target.pointer).sha256=packet.current_inventory.sha256;
 const bytes=entryMutation(target.sha,target.reference.sha256,packet.current_inventory.sha256,mutant);assert.throws(()=>subject.verifyAfter(bytes));historical++;cases.push(`historical:${target.sha}:${target.pointer}`);
}
for(const fault of ['disposition','reason','proof','summary','G11','other-reference','unselected-entry','extra-byte']){
 const mutant=structuredClone(data),entry=mutant.entries.find(row=>row.sha===subject.updates[0].sha);let bytes;
 if(fault==='disposition'){const old=entry.final_disposition;entry.final_disposition='irrelevant';bytes=entryMutation(entry.sha,'"final_disposition": '+JSON.stringify(old),'"final_disposition": '+JSON.stringify(entry.final_disposition),mutant);}
 if(fault==='reason'){const old=entry.reason;entry.reason+=' Unreviewed conclusion.';bytes=entryMutation(entry.sha,'"reason": '+JSON.stringify(old),'"reason": '+JSON.stringify(entry.reason),mutant);}
 if(fault==='proof'){entry.individual_proof.extra_native_credit=true;bytes=entryMutation(entry.sha,'\n      "individual_proof": {','\n      "individual_proof": {\n        "extra_native_credit": true,',mutant);}
 if(fault==='summary'){const old=mutant.closed_dispositions;mutant.closed_dispositions++;bytes=rootMutation('"closed_dispositions": '+old,'"closed_dispositions": '+mutant.closed_dispositions,mutant);}
 if(fault==='G11'){const old=mutant.g11_claim;mutant.g11_claim='passed';bytes=rootMutation('\n  "g11_claim": '+JSON.stringify(old),'\n  "g11_claim": '+JSON.stringify(mutant.g11_claim),mutant);}
 if(fault==='other-reference'){
  const kind=subject.updates[0].pointer.split('/')[2],ref=entry.individual_proof[kind].source_members.find(row=>row.path!==packet.current_inventory.path),old=ref.sha256;
  ref.sha256='0'.repeat(64);bytes=entryMutation(entry.sha,old,ref.sha256,mutant);
 }
 if(fault==='unselected-entry'){const other=mutant.entries.find(row=>!subject.updates.some(update=>update.sha===row.sha)),old=other.reason;other.reason+=' Outside proposal.';bytes=entryMutation(other.sha,'"reason": '+JSON.stringify(old),'"reason": '+JSON.stringify(other.reason),mutant);}
 if(fault==='extra-byte')bytes=Buffer.concat([after,Buffer.from(' ')]);
 assert.ok(Buffer.isBuffer(bytes));
 assert.throws(()=>subject.verifyAfter(bytes));other++;cases.push(`fault:${fault}`);
}
}
let tamper=null;
const read=path=>{const value=stageRead(path);return path===tamper?Buffer.concat([value,Buffer.from(' ')]):value;};
const live=prepareInventoryReferenceMetadata({root,read});let late=0,cold=0;
for(const [index,ref] of live.bound.entries())if(has('full')||match?.[1]==='late'&&index%shards===Number(match[2])){
 tamper=ref.path;assert.throws(()=>live.assertCurrent(),undefined,'late '+tamper);late++;cases.push(ref.path);tamper=null;live.assertCurrent();
}
for(const [index,ref] of live.bound.entries())if(has('full')||match?.[1]==='cold'&&index%shards===Number(match[2])){
 tamper=ref.path;assert.throws(()=>prepareInventoryReferenceMetadata({root,read}),undefined,'cold '+tamper);cold++;cases.push(ref.path);tamper=null;
}
if(has('images')){
subject.after.fill(0);subject.bound[0].sha256='0'.repeat(64);subject.updates.length=0;subject.historical.length=0;
assert.equal(subject.verifyAfter(after).metadata_only,true);assert.ok(raw(INVENTORY_REFERENCE_LEDGER).equals(beforeLive));cases.push('immutable-output-and-ledger');
}
if(cohort!=='full'){console.log(JSON.stringify({schema_version:1,cohort,line:live.line,bound:live.bound,cases,partial,historical,other,after_sha256:hash(after),after_bytes:after.length,metadata_reference_updates:subject.metadata_reference_updates,unselected_entries_preserved:subject.unselected_entries_preserved,canonical_owner_integration_complete:subject.canonical_owner_integration_complete,native_qualified:subject.current_native_packed_browser_floor_or_full_audit_qualified,g11_claim:subject.g11_claim}));}
else console.log(JSON.stringify({schema_version:1,line:subject.line,metadata_reference_updates:partial,unselected_entries_preserved:1697-partial,
 older_historical_references_preserved:historical,partial_after_images_rejected:partial,historical_rebinding_mutants_rejected:historical,
 extra_claim_judgment_or_scope_mutants_rejected:other,cold_source_mutants_rejected:cold,late_source_mutants_rejected:late,
 bound_sources:live.bound.length,after_sha256:hash(after),after_bytes:after.length,canonical_ledger_unchanged:true,
 canonical_owner_integration_complete:false,actual_native_packed_browser_floor_or_full_audit_qualified:false,g11_claim:'not-passed'}));
} finally {rmSync(root,{recursive:true,force:true});}
