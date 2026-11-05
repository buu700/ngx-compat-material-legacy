/**
 * @license
 * Copyright Google LLC All Rights Reserved.
 * Copyright (c) 2026 Ryan Lester.
 * Use of this source code is governed by the MIT license in LICENSE.
 */
/** Actual 21.x constructors in a private, explicitly enrolled source fixture. */
import assert from 'node:assert/strict';
import {readFileSync,writeFileSync} from 'node:fs';
import {join} from 'node:path';
import {createHash} from 'node:crypto';
import {legacyRemovalOwnerSourceSubject} from '../scripts/legacy-removal-owner-source.mjs';
import {tableLocalCompilationOwnerSourceSubject} from '../scripts/table-local-compilation-owner-source.mjs';
import {readHistoricalContractRepairMember} from '../scripts/historical-contract-repair-source.mjs';
const root=process.cwd(),group=process.argv[2];assert.ok(['table','baseline','constructor','final'].includes(group));
const disk=path=>readHistoricalContractRepairMember(root,path),hash=bytes=>createHash('sha256').update(bytes).digest('hex');
const child='scripts/tabs-finite-source-successor.mjs',packetPath='compatibility/rc/21x-legacy-removal-admission-owner-inputs.json';
const packet=JSON.parse(disk(packetPath)),refs=[...packet.code_transitions.map(row=>row.after),...packet.source_members];
assert.equal(refs.length,25);const drift=Buffer.from('\n// disposable legacy batch fault\n'),saved=new Map();
let calls=0,onRead=()=>{},transform=(path,bytes)=>bytes;
const read=path=>{calls++;const raw=disk(path);onRead(path);return transform(path,raw);};
const reset=()=>{calls=0;onRead=()=>{};transform=(path,bytes)=>bytes;};
const fault=path=>{const before=disk(path);assert.ok(!saved.has(path));saved.set(path,before);writeFileSync(join(root,path),Buffer.concat([before,drift]));};
const restore=()=>{for(const[path,before] of saved){const now=disk(path);assert.ok(now.equals(before)||now.equals(Buffer.concat([before,drift])),'foreign bytes preserved '+path);if(!now.equals(before))writeFileSync(join(root,path),before);}saved.clear();reset();};
const targetError=(fn,path)=>assert.throws(fn,error=>String(error?.message).includes(path),'expected targeted rejection '+path);
const isStaticMember=()=>{const stack=String(new Error().stack).split('\n');const i=stack.findIndex(row=>/at read \([^\n]*legacy_static_reference_batch_probe\.mjs:/.test(row));return i>=0&&/at member \([^\n]*legacy-removal-owner-source\.mjs:/.test(stack[i+1]??'')&&/at staticMember \([^\n]*legacy-removal-owner-source\.mjs:/.test(stack[i+2]??'');};
try{
 if(group==='table'){
  const table=tableLocalCompilationOwnerSourceSubject({root,read});assert.equal(typeof table.legacyStaticReferences,'function');reset();
  const results=table.legacyStaticReferences(refs);assert.ok(Array.isArray(results));assert.equal(results.length,refs.length);
  const missingRefs=refs.filter(ref=>!table.bound.some(item=>item.path===ref.path));
  const missingBound=missingRefs.map(ref=>ref.path);
  const missingClassification=missingRefs.map(ref=>{const raw=disk(ref.path),predecessor=table.predecessorReference(ref),qualified=table.qualifyReference(ref);return {path:ref.path,owned:table.ownsReference(ref),predecessor_unchanged:JSON.stringify(predecessor)===JSON.stringify(ref),qualified_unchanged:JSON.stringify(qualified)===JSON.stringify(ref),physical_match:hash(raw)===ref.sha256&&(ref.bytes===undefined||raw.length===ref.bytes)};});
  let eligible=0;for(let i=0;i<refs.length;i++)if(results[i]){
   eligible++;const result=results[i];assert.deepEqual(result.reference,refs[i]);
   assert.deepEqual(result.qualified,table.qualifyReference(refs[i]));assert.ok(result.comparison.equals(table.comparisonBytes(refs[i])));
  }
  assert.ok(eligible>0,'no actual eligible legacy refs reached');
  const registry='scripts/upstream-source-contract-registry.mjs',unknown={path:'tests/not-a-source-member.mjs',sha256:'0'.repeat(64),bytes:1};
  const swapped=structuredClone(refs);[swapped[0],swapped[1]]=[swapped[1],swapped[0]];
  const bad=structuredClone(refs),selected=results.findIndex(Boolean);bad[selected].sha256='0'.repeat(64);
  const current=structuredClone(refs);current[selected]=structuredClone(results[selected].qualified);
  for(const foreign of [[unknown], [...refs,unknown],swapped,bad,current])assert.throws(()=>table.legacyStaticReferences(foreign));
  assert.ok(Buffer.isBuffer(table.registryComparisonBytes()));
  const registryRef={path:registry,sha256:hash(disk(registry)),bytes:disk(registry).length};
  assert.equal(table.qualifyReference(registryRef).path,registry);
  assert.equal(table.qualifyReference(results[selected].qualified).path,refs[selected].path);
  table.assertCurrent();
  console.log(JSON.stringify({result:'pass',group,actual_table:true,rows:refs.length,eligible,fallback:refs.length-eligible,successor_bound_missing:missingBound,missing_classification:missingClassification,ordered_comparison_data:true,foreign_reordered_modified_batch_rejected:true,genuine_registry_and_current_reference:true,full_owner_pass:false}));
 }else{
  let visited=[],batchCallbacks=0;onRead=path=>{if(isStaticMember())visited.push(path);if(String(new Error().stack).includes('legacyStaticReferences'))batchCallbacks++;};
  const baseline=legacyRemovalOwnerSourceSubject({root,read});assert.deepEqual(visited,refs.map(r=>r.path),'actual constructor row order');reset();
  if(group==='final'){
   const uncovered='compatibility/rc/21x-legacy-removal-admission-individual-review.json',outcomes=[];
   for(const target of [uncovered,child]){
    let rows=0,changed=false,error;onRead=()=>{if(isStaticMember()&&++rows===refs.length){changed=true;fault(target);}};
    try{legacyRemovalOwnerSourceSubject({root,read});assert.fail('expected final persistent fault');}catch(e){error=e;}
    assert.ok(changed&&rows===refs.length,'last row was not reached');assert.ok(String(error?.message).includes(target),'wrong fault '+String(error));
    outcomes.push({path:target,rows,reason:String(error.message),stack_mentions_final:/\bfinal\b/.test(String(error.stack))});restore();
   }
   console.log(JSON.stringify({result:'pass',group,actual_legacy_constructor:true,static_rows:refs.length,last_row_faults:outcomes,full_owner_pass:false}));
  }else if(group==='baseline'){console.log(JSON.stringify({result:'pass',group,actual_legacy_constructor:true,static_rows:refs.length,ordered_actual_row_reads:true,actual_batch_callbacks:batchCallbacks,fast_path_observed:batchCallbacks>0,full_owner_pass:false}));}
  else {
  assert.ok(batchCallbacks>0,'actual legacy constructor did not use its table batch');
  // The source is only in the child graph, not the 25 outer legacy rows.
  assert.ok(!refs.some(ref=>ref.path===child));assert.ok(baseline.bound.some(ref=>ref.path===child));
  let staticCallbacks=0;fault(child);onRead=()=>{if(isStaticMember())staticCallbacks++;};
  targetError(()=>legacyRemovalOwnerSourceSubject({root,read}),child);assert.equal(staticCallbacks,0);restore();
  const uncovered='compatibility/rc/21x-legacy-removal-admission-individual-review.json';
  assert.ok(refs.some(ref=>ref.path===uncovered));fault(uncovered);let uncoveredRows=0;onRead=()=>{if(isStaticMember())uncoveredRows++;};
  targetError(()=>legacyRemovalOwnerSourceSubject({root,read}),uncovered);assert.equal(uncoveredRows,0);restore();
  let uncoveredChanged=false;onRead=()=>{if(isStaticMember()&&!uncoveredChanged){uncoveredChanged=true;fault(uncovered);}};
  targetError(()=>legacyRemovalOwnerSourceSubject({root,read}),uncovered);assert.ok(uncoveredChanged);restore();
  let changed=false,outerRows=0;onRead=()=>{if(isStaticMember()){outerRows++;if(!changed){changed=true;fault(child);}}};
  targetError(()=>legacyRemovalOwnerSourceSubject({root,read}),child);assert.ok(changed);assert.ok(outerRows>0);restore();
  // Every packet row is exercised as a fresh supplied mismatch at its actual call site.
  for(let i=0;i<refs.length;i++){
   let index=0,reached=false;transform=(path,raw)=>{if(isStaticMember()&&index++===i){reached=true;assert.equal(path,refs[i].path);return Buffer.concat([raw,drift]);}return raw;};
   assert.throws(()=>legacyRemovalOwnerSourceSubject({root,read}));assert.ok(reached,'row not reached '+i);reset();
  }
  let nestedError,inside=false;onRead=()=>{if(!inside){inside=true;try{baseline.assertCurrent();}catch(e){nestedError=e;}}};
  baseline.assertCurrent();assert.match(nestedError?.message??'',/reentrant/i);reset();
  const sentinel=new Error('legacy callback sentinel');onRead=()=>{throw sentinel;};assert.throws(baseline.assertCurrent,error=>error===sentinel);reset();baseline.assertCurrent();
  console.log(JSON.stringify({result:'pass',group,actual_legacy_constructor:true,static_rows:refs.length,ordered_actual_row_reads:true,actual_batch_callbacks:batchCallbacks,child_cold_before_rows:true,later_child_fault_rejected:true,uncovered_cold_and_late_rejected:true,per_row_mismatches_rejected:refs.length,reentry_exception_same_context_recovery:true,full_owner_pass:false}));
  }
 }
}finally{restore();}
