/** @license Copyright Google LLC All Rights Reserved. Copyright (c) 2026 Ryan Lester. MIT. */
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {execFileSync} from 'node:child_process';
import {readFileSync,writeFileSync,copyFileSync,mkdtempSync,mkdirSync,rmSync} from 'node:fs';
import {tmpdir} from 'node:os';
import {join,dirname} from 'node:path';
import {browserOwnerSourceSubject} from '../scripts/browser-owner-source.mjs';
import {browserReferenceOwnerContext as make} from '../scripts/browser-reference-owner.mjs';
import {inspectBrowserReferenceSource} from '../scripts/browser-reference-source.mjs';

const canonical=process.cwd(),initial=browserOwnerSourceSubject({root:canonical});
const root=mkdtempSync(join(tmpdir(),'browser-metadata-private-ownership-'));
const LEDGER='compatibility/f10/disposition-ledger/ledger.json';
const CAPSULE='compatibility/rc/main-browser-private-owner-source-routing-v13.json';
const modules=['scripts/browser-reference-source.mjs','scripts/browser-reference-proposal.mjs','scripts/browser-reference-owner.mjs'];
const guards=['scripts/browser-zone-source-successor.mjs','scripts/browser-surface-source-successor.mjs','scripts/browser-form-zone-source-successor.mjs'];
const programs=['scripts/browser-required-cells.mjs','scripts/browser-surface-families.mjs','scripts/browser-form-families.mjs'];
const hash=raw=>createHash('sha256').update(raw).digest('hex');
try{
 const copy=path=>{const target=join(root,path);mkdirSync(dirname(target),{recursive:true});copyFileSync(join(canonical,path),target);};
 const tracked=execFileSync('git',['ls-files','-z'],{cwd:canonical,maxBuffer:32*1024*1024}).toString().split('\0').filter(Boolean);
 for(const path of tracked)copy(path);
 for(const ref of initial.bound)copy(ref.path);
 for(const path of [CAPSULE,'compatibility/rc/worksheets/browser-metadata-private-ownership-v13.md','node_modules/typescript/package.json','node_modules/typescript/lib/typescript.js'])copy(path);
 writeFileSync(join(root,'.git'),'gitdir: '+execFileSync('git',['rev-parse','--absolute-git-dir'],{cwd:canonical}).toString().trim()+'\n');
 const physical=path=>readFileSync(join(root,path));
 let target=null,kind='',calls=0,targetCalls=0,restorePath=null,reenter=null,reentryCalls=0,reentryError;
 const sentinel=new Error('browser metadata reader sentinel');
 const read=path=>{
  calls++;
  if(path===restorePath){targetCalls++;writeFileSync(join(root,path),saved.get(path));restorePath=null;}
  if(path===CAPSULE&&reenter){const action=reenter;reenter=null;reentryCalls++;try{action();}catch(error){reentryError=error;}}
  const raw=physical(path);if(path!==target)return raw;
  if(kind==='exception')throw sentinel;
  return kind==='nonbuffer'?{}:Buffer.concat([raw,Buffer.from(' ')]);
 };
 const saved=new Map([...new Set([...modules,...guards,LEDGER,CAPSULE,'scripts/browser-required-cells.mjs','scripts/browser-surface-families.mjs','scripts/browser-form-families.mjs'])].map(path=>[path,physical(path)]));
 const context=make({root,read}),before=Buffer.from(context.before),after=Buffer.from(context.after),bound=structuredClone(context.bound);
 const checks=[],check=(name,run)=>{run();checks.push(name);};
 const prior=(overrides={})=>({canonical_after:Buffer.from(before),bound:new Map([['caller-prior','prior-digest']]),...overrides});
 const corrupt=path=>writeFileSync(join(root,path),Buffer.concat([saved.get(path),Buffer.from(' ')]));
 const restore=path=>writeFileSync(join(root,path),saved.get(path));
 check('authenticated complete images and metadata',()=>{
  assert.equal(hash(before),initial.packet.before_ledger.sha256);assert.equal(hash(after),initial.packet.after_ledger.sha256);
  assert.equal(context.metadata_entries,18);assert.equal(context.selected_entries,9);assert.equal(context.applied,physical(LEDGER).equals(after));
  assert.equal(context.canonical_frame_admission_granted,false);assert.equal(context.current_native_packed_or_floor_or_g11_credit,false);
 });
 check('public context shape',()=>assert.deepEqual(Object.keys(context).sort(),['line','before','after','applied','metadata_entries','selected_entries','bound','assertCurrent','assertSurfacePhysical','assertFormPhysical','wrapPrepared','canonical_frame_admission_granted','current_native_packed_or_floor_or_g11_credit'].sort()));
 check('wrapper rejects other complete prior image',()=>assert.throws(()=>context.wrapPrepared(prior({canonical_after:Buffer.concat([before,Buffer.from(' ')])}))));
 check('wrapper preserves distinct prior hooks and bindings',()=>{
  let a=0,b=0;const x=context.wrapPrepared(prior({assertCurrent(){a++;},prior_metadata_assert_current(){b++;}}));
  assert.ok(a>0&&b>0);a=0;b=0;x.assertCurrent();assert.ok(a>0&&b>0);
  assert.equal(x.bound.get('caller-prior'),'prior-digest');for(const ref of bound)assert.equal(x.bound.get(ref.path),ref.sha256);
  assert.ok(x.canonical_after.equals(after));assert.ok(x.browser_reference_stage.before.equals(before));assert.ok(x.browser_reference_stage.after.equals(after));
  assert.equal(x.browser_reference_stage.metadata_entries,18);assert.equal(x.browser_reference_stage.selected_entries,9);assert.equal(x.browser_reference_stage.individual_decisions,0);assert.equal(x.browser_reference_stage.source_scope_only,true);assert.equal(x.browser_reference_stage.current_native_or_packed_or_floor_qualified,false);
 });
 for(const hook of ['assertCurrent','prior_metadata_assert_current'])check('prior '+hook+' exception identity and recovery',()=>{
  assert.throws(()=>context.wrapPrepared(prior({[hook](){throw sentinel;}})),error=>error===sentinel);context.assertCurrent();
 });
 check('fresh output and public snapshot isolation',()=>{
  const x=context.wrapPrepared(prior()),y=context.wrapPrepared(prior());assert.notStrictEqual(x.canonical_after,y.canonical_after);
  x.canonical_after.fill(0);x.browser_reference_stage.before.fill(0);x.browser_reference_stage.after.fill(0);context.before.fill(0);context.after.fill(0);context.bound.length=0;
  assert.ok(y.canonical_after.equals(after));assert.ok(y.browser_reference_stage.before.equals(before));assert.ok(y.browser_reference_stage.after.equals(after));y.assertCurrent();context.assertCurrent();assert.ok(context.wrapPrepared(prior()).canonical_after.equals(after));
 });
 for(const path of [...modules,CAPSULE,LEDGER,...guards,...programs])check('provided forged and non-buffer values rejected: '+path,()=>{
  try{target=path;for(const mode of ['buffer','nonbuffer']){kind=mode;assert.throws(()=>context.assertCurrent());}}
  finally{target=null;}context.assertCurrent();
 });
 check('provided reader exception identity and recovery',()=>{
  try{target=modules[0];kind='exception';assert.throws(()=>context.assertCurrent(),error=>error===sentinel);}finally{target=null;}context.assertCurrent();
 });
 check('cold zone preflight rejects with no provided callbacks',()=>{
  const path='scripts/browser-required-cells.mjs';try{corrupt(path);calls=0;assert.throws(()=>make({root,read}));assert.equal(calls,0);}finally{restore(path);}context.assertCurrent();
 });
 for(const path of modules)check('cold module corruption rejected before target callback: '+path,()=>{
  try{corrupt(path);targetCalls=0;restorePath=path;assert.throws(()=>make({root,read}));assert.equal(targetCalls,0);assert.equal(restorePath,path);}
  finally{restorePath=null;restore(path);}context.assertCurrent();
 });
 for(const [guard,path] of [['assertSurfacePhysical','scripts/browser-surface-families.mjs'],['assertFormPhysical','scripts/browser-form-families.mjs']])check(guard+' rejects physical drift without callbacks',()=>{
  try{corrupt(path);calls=0;assert.throws(()=>context[guard]());assert.equal(calls,0);}finally{restore(path);}context[guard]();context.assertCurrent();
 });
 check('warm physical drift and recovery',()=>{
  const path=modules[0];context.assertCurrent();try{corrupt(path);assert.throws(()=>context.assertCurrent());}finally{restore(path);}context.assertCurrent();
 });
 check('receiver cannot replace captured guard closures',()=>{
  const original=context.assertCurrent,wrap=context.wrapPrepared;try{context.assertCurrent=()=>{};target=modules[0];kind='buffer';assert.throws(()=>wrap.call({assertCurrent(){}},prior()));assert.throws(()=>original.call({assertCurrent(){}}));}
  finally{target=null;context.assertCurrent=original;}context.assertCurrent();
 });
 for(const [name,action] of [['assertCurrent',()=>context.assertCurrent()],['wrapPrepared',()=>context.wrapPrepared(prior())],['new inspection',()=>inspectBrowserReferenceSource({root,read})]])check('caught nested '+name+' poisons outer transaction and recovers',()=>{
  reentryCalls=0;reentryError=undefined;reenter=action;
  try{assert.throws(()=>context.assertCurrent());assert.equal(reentryCalls,1);assert.ok(reentryError instanceof Error);}finally{reenter=null;}
  context.assertCurrent();
 });
 check('nonphysical ledger rejected and fresh genuine contexts independent',()=>{
  const virtual=Buffer.concat([physical(LEDGER),Buffer.from(' ')]);
  assert.throws(()=>make({root,read:path=>path===LEDGER?Buffer.from(virtual):physical(path)}));
  const fresh=make({root,read:physical});assert.notStrictEqual(fresh,context);assert.equal(fresh.applied,physical(LEDGER).equals(after));assert.ok(fresh.before.equals(before));assert.ok(fresh.after.equals(after));assert.ok(fresh.bound.length>0);fresh.assertCurrent();
  fresh.bound.length=0;fresh.before.fill(0);fresh.after.fill(0);fresh.assertCurrent();context.assertCurrent();
 });
 assert.equal(checks.length,31);
 console.log(JSON.stringify({result:'pass',checks,checks_passed:checks.length,bound:bound.length,before_sha256:hash(before),after_sha256:hash(after),genuine_producer_and_fresh_verifier:true,historical_program_executed:false,artifact_or_audit_admission_granted:false,g11_claim:'not-passed'}));
}finally{rmSync(root,{recursive:true,force:true});}
