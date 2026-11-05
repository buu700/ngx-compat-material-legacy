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
const root=process.cwd(),group=process.argv[2];assert.ok(['table','baseline','constructor','final','retention','parent-overwrite'].includes(group));
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
 if(group==='parent-overwrite'){
  const table=tableLocalCompilationOwnerSourceSubject({root,read});
  const parent=legacyRemovalOwnerSourceSubject({root,read});
  const tableRefs=new Map(table.bound.map(ref=>[ref.path,ref]));
  const candidate=table.packet.source_members.map(ref=>tableRefs.get(ref.path)).find(ref=>ref&&Number.isSafeInteger(ref.bytes)&&!table.ownsReference(ref)&&parent.bound.some(row=>row.path===ref.path&&row.sha256===ref.sha256&&row.bytes===ref.bytes));
  assert.ok(candidate,'no genuine inherited unowned table packet reference found');
  assert.equal(hash(disk(candidate.path)),candidate.sha256);
  reset();parent.assertCurrent();const callbackCount=calls;assert.ok(callbackCount>0);reset();
  let outerCalls=0,nestedCalls=0,inside=false,reached=false,updatedRef,error;
  onRead=()=>{
   if(inside){nestedCalls++;return;}
   outerCalls++;
   if(outerCalls!==callbackCount)return;
   reached=true;inside=true;
   try{
    fault(candidate.path);const altered=disk(candidate.path);updatedRef={...candidate,sha256:hash(altered),bytes:altered.length};
    assert.ok(parent.comparisonBytes(updatedRef).equals(altered));
    writeFileSync(join(root,candidate.path),saved.get(candidate.path));
    assert.equal(hash(disk(candidate.path)),candidate.sha256);
   }finally{inside=false;}
  };
  try{parent.assertCurrent();assert.fail('expected parent physical mismatch');}catch(e){error=e;}
  assert.ok(reached&&outerCalls===callbackCount,'last original callback not reached');assert.ok(updatedRef,'genuine comparison API did not update');
  assert.ok(String(error?.message).includes('physical legacy source '+candidate.path),'wrong parent fault '+String(error));
  assert.match(String(error.stack),/\bfinal\b/);
  reset();assert.ok(parent.comparisonBytes(candidate).equals(disk(candidate.path)));reset();parent.assertCurrent();
  console.log(JSON.stringify({result:'pass',group,actual_parent:true,target:candidate.path,original_callbacks:outerCalls,nested_api_callbacks:nestedCalls,physical_restored_before_final:true,parent_live_overwrite_rejected_in_final:true,actual_api_recovery:true,full_owner_pass:false}));
 }else if(group==='retention'){
  const table=tableLocalCompilationOwnerSourceSubject({root,read});
  const other=tableLocalCompilationOwnerSourceSubject({root,read});
  assert.equal(typeof table.retainsReferences,'function');assert.ok(table.guardNode&&other.guardNode);
  const inherited=structuredClone(table.bound),node=table.guardNode;assert.ok(inherited.length>0);reset();
  assert.equal(table.retainsReferences(inherited,node),true);assert.equal(table.retainsReferences(inherited,other.guardNode),false);
  const wrongHash=structuredClone(inherited);wrongHash[0].sha256='0'.repeat(64);
  const wrongSize=structuredClone(inherited);wrongSize[0].bytes++;
  const unknown=[...inherited,{path:'tests/not-a-source-member.mjs',sha256:'0'.repeat(64),bytes:1}];
  for(const invalid of [wrongHash,wrongSize,unknown,new Proxy(inherited,{})])assert.equal(table.retainsReferences(invalid,node),false);
  let getterCalls=0;const accessor={get path(){getterCalls++;return inherited[0].path;},sha256:inherited[0].sha256,bytes:inherited[0].bytes};
  assert.equal(table.retainsReferences([accessor],node),false);assert.equal(getterCalls,0);
  assert.equal(calls,0,'retention metadata unexpectedly invoked supplied reader');
  // A real comparison on a previously unbound, unowned packet ref can append it
  // to the actual private table map, without any synthetic state hook.
  const extra=refs.find(ref=>!inherited.some(row=>row.path===ref.path)&&!table.ownsReference(ref));
  assert.ok(extra,'expected a genuine unbound unowned reference');
  assert.ok(table.comparisonBytes(extra).equals(disk(extra.path)));reset();
  assert.equal(table.retainsReferences(inherited,node),true);
  const extended=[...inherited,extra];assert.equal(table.retainsReferences(extended,node),true);
  assert.equal(calls,0);
  let overwriteSupported=false,overwriteError=null;fault(extra.path);const changed=disk(extra.path),updated={...extra,sha256:hash(changed),bytes:changed.length};
  try{
   try{table.comparisonBytes(updated);overwriteSupported=true;}catch(error){assert.equal(error?.code,'ERR_ASSERTION');overwriteError=String(error.message);}
   if(overwriteSupported){assert.equal(table.retainsReferences(extended,node),false);assert.equal(table.retainsReferences([...inherited,updated],node),true);}
  }finally{restore();}
  table.comparisonBytes(extra);reset();assert.equal(table.retainsReferences(extended,node),true);table.assertCurrent();reset();
  const parent=legacyRemovalOwnerSourceSubject({root,read});reset();
  parent.assertCurrent();const callbackCount=calls;assert.ok(callbackCount>0);reset();
  const local='compatibility/rc/21x-legacy-removal-admission-individual-review.json',outcomes=[];
  for(const target of [child,local]){
   assert.ok(parent.bound.some(ref=>ref.path===target));let reached=false,error;
   onRead=()=>{if(calls===callbackCount){reached=true;fault(target);}};
   try{parent.assertCurrent();assert.fail('expected persistent fault');}catch(e){error=e;}
   assert.ok(reached,'final callback not reached');assert.ok(String(error?.message).includes(target),'wrong fault '+String(error));
   outcomes.push({path:target,callbacks:callbackCount,reason:String(error.message),stack_mentions_final:/\bfinal\b/.test(String(error.stack))});restore();parent.assertCurrent();reset();
  }
  console.log(JSON.stringify({result:'pass',group,actual_table_and_legacy:true,retention_exact_node_and_mismatch_checks:true,private_map_genuine_addition:true,private_map_genuine_overwrite_supported:overwriteSupported,private_map_overwrite_rejection:overwriteError,metadata_reader_callbacks:0,parent_last_callback_faults:outcomes,full_owner_pass:false}));
 }else if(group==='table'){
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
