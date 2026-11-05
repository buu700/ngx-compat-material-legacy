/**
 * @license
 * Copyright Google LLC All Rights Reserved.
 * Copyright (c) 2026 Ryan Lester.
 * Use of this source code is governed by the MIT license in LICENSE.
 */
/** Before/after controls for actual callback-final and intrinsic equality guards. */
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {existsSync, readFileSync, writeFileSync} from 'node:fs';
import {join} from 'node:path';
import admission from '../scripts/upstream-base-class-removal-admission.cjs';
import {baseClassRemovalCanonicalFrameSubject, baseClassRemovalOwnerSourceSubject} from '../scripts/base-class-removal-owner-source.mjs';
import {baseClassRemovalOwnerContext, BASE_CLASS_REMOVAL_LEDGER as LEDGER,
  BASE_CLASS_REMOVAL_REGISTRY as REGISTRY} from '../scripts/base-class-removal-canonical-stage.mjs';
assert.equal(process.versions.node, '24.21.0');
const root=process.cwd(),mode=process.argv[2],out=process.argv[3];
assert.ok(['--before','--after'].includes(mode));
assert.match(out??'',/^compatibility\/rc\/parent-base-class-owner-implementation-[a-z0-9-]+\.json$/);
assert.equal(existsSync(join(root,out)),false);
const STAGE='scripts/base-class-removal-canonical-stage.mjs',PACKET='compatibility/rc/21x-base-class-removal-admission-owner-inputs-v1.json';
const disk=p=>readFileSync(join(root,p)),hash=b=>createHash('sha256').update(b).digest('hex');
const protectedPaths=[LEDGER,REGISTRY,'compatibility/rc/21x-remaining-disposition-worksheet.json',STAGE,PACKET];
const protectedBefore=protectedPaths.map(path=>({path,sha256:hash(disk(path)),bytes:disk(path).length}));
const results=[];const observe=(id,operation)=>{let error=null;try{operation();}catch(e){error=String(e.stack);}
 const result={id,rejected:error!==null,error};results.push(result);return result;};
const frame=baseClassRemovalCanonicalFrameSubject({root,read:disk});
let armed=false;
const finalStage=disk(STAGE),late=baseClassRemovalCanonicalFrameSubject({root,read:p=>{
 const raw=disk(p);if(armed&&p===REGISTRY){armed=false;writeFileSync(join(root,STAGE),Buffer.concat([finalStage,Buffer.from('\n// callback-final drift\n')]));}return raw;
}});
try{armed=true;observe('final-registry-callback-cannot-mutate-earlier-stage',()=>late.assertCurrent());}
finally{writeFileSync(join(root,STAGE),finalStage);}
late.assertCurrent();
let changedStage=false;
try{observe('same-path-physical-reread-rejects-before-later-callback-restoration',()=>baseClassRemovalCanonicalFrameSubject({root,read:p=>{
 const raw=disk(p);if(p===STAGE&&!changedStage){changedStage=true;writeFileSync(join(root,STAGE),Buffer.concat([finalStage,Buffer.from('\n// transient stage drift\n') ]));}
 if(p===REGISTRY&&changedStage)writeFileSync(join(root,STAGE),finalStage);
 return raw;
}}));}finally{writeFileSync(join(root,STAGE),finalStage);}
for(const getter of [false,true]){
 let getterReads=0;
 const row=observe(getter?'supplied-Buffer-equals-getter-cannot-forge-physical-bytes':'supplied-Buffer-own-equals-cannot-forge-physical-bytes',()=>baseClassRemovalCanonicalFrameSubject({root,read:p=>{
  if(p!==PACKET)return disk(p);const wrong=Buffer.from('forged-nonphysical');
  if(getter)Object.defineProperty(wrong,'equals',{get(){getterReads++;return()=>true;}});else wrong.equals=()=>true;
  return wrong;
 }}));row.equals_getter_reads=getterReads;
 if(mode==='--after')assert.equal(getterReads,0,'supplied equals getter was evaluated');
}
for(const target of ['inspector','sourceGuard','frameGuard']){
 let current,trigger=false,reads=0;const originalInspector=admission.inspectSource;
 const callback=p=>{const raw=disk(p);if(trigger&&p===REGISTRY&&++reads===2){
  if(target==='inspector')admission.inspectSource=(...a)=>originalInspector(...a);
  if(target==='sourceGuard')current.source.assertCurrent=()=>{};
  if(target==='frameGuard')current.frames.assertCurrent=()=>{};
 }return raw;};
 current=baseClassRemovalOwnerSourceSubject({root,read:callback});
 const originalSource=current.source.assertCurrent,originalFrame=current.frames.assertCurrent;
 try{trigger=true;observe('final-source-callback-cannot-replace-'+target,()=>current.assertCurrent());assert.equal(reads,2);}
 finally{trigger=false;admission.inspectSource=originalInspector;current.source.assertCurrent=originalSource;current.frames.assertCurrent=originalFrame;}
 current.assertCurrent();
}
for(const target of ['priorGuard','metadataGuard','nativeSubject','priorLedger']){
 let trigger=false,reads=0,prior;
 const callback=p=>{const raw=disk(p);if(trigger&&p===REGISTRY&&++reads===4){
  if(target==='priorGuard')prior.assertCurrent=()=>{};
  if(target==='metadataGuard')prior.prior_metadata_assert_current=()=>{};
  if(target==='nativeSubject')prior.native_spec_source={...prior.native_spec_source};
  if(target==='priorLedger')prior.canonical_after=Buffer.from('wrong-prior-ledger');
 }return raw;};
 const owner=baseClassRemovalOwnerContext({root,read:callback});
 prior={canonical_after:Buffer.from(owner.before),bound:new Map(),assertCurrent:()=>{},prior_metadata_assert_current:()=>{},native_spec_source:{bound:[],assertCurrent:()=>{}}};
 const wrapped=owner.wrapPrepared(prior),original={...prior};
 try{trigger=true;observe('final-owner-callback-cannot-replace-'+target,()=>wrapped.assertCurrent());assert.equal(reads,4);}
 finally{trigger=false;Object.assign(prior,original);}
 wrapped.assertCurrent();
}
{
 const owner=baseClassRemovalOwnerContext({root,read:disk});
 const wrong=Buffer.from('forged-prior-ledger');wrong.equals=()=>true;
 observe('prior-ledger-own-equals-cannot-bypass-exact-complete-before-image',()=>owner.wrapPrepared({canonical_after:wrong,bound:new Map(),assertCurrent:()=>{},prior_metadata_assert_current:()=>{},native_spec_source:{bound:[],assertCurrent:()=>{}}}));
}
assert.deepEqual(protectedPaths.map(path=>({path,sha256:hash(disk(path)),bytes:disk(path).length})),protectedBefore);
if(mode==='--after')for(const row of results)assert.equal(row.rejected,true,row.id+' accepted');
else for(const row of results)assert.equal(row.rejected,false,'before-fix reproduction did not reach expected vulnerable success: '+row.id+' '+row.error);
const report={schema_version:2,mode,status:mode==='--before'?'independent-guard-gaps-reproduced-before-fix':'callback-final-intrinsic-and-identity-controls-pass',node:process.version,
 cases:results.length,results,protected_refs_before_and_after:protectedBefore,canonical_files_changed:false,owned_stage_mutations_restored:true,
 actual_precursor42669_source_constructed:true,actual_full_composed_owner_executed:false,actual_physical42770_pair_executed:false,
 current_native_packed_browser_floor_or_full_audit_qualified:false,g11_claim:'not-passed'};
writeFileSync(join(root,out),JSON.stringify(report,null,2)+'\n');console.log(JSON.stringify({status:report.status,cases:results.length,out}));
