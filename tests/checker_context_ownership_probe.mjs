/** @license Copyright Google LLC All Rights Reserved. Copyright (c) 2026 Ryan Lester. MIT. */
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {execFileSync} from 'node:child_process';
import {readFileSync,writeFileSync,copyFileSync,mkdtempSync,mkdirSync,rmSync} from 'node:fs';
import {tmpdir} from 'node:os';
import {join,dirname} from 'node:path';
import {checkerOwnerSourceSubject} from '../scripts/checker-owner-source.mjs';
import {checkerReferenceOwnerContext as make} from '../scripts/checker-reference-owner.mjs';

const canonical=process.cwd(),initial=checkerOwnerSourceSubject({root:canonical});
const root=mkdtempSync(join(tmpdir(),'checker-context-ownership-'));
const LEDGER='compatibility/f10/disposition-ledger/ledger.json';
const OWNER='scripts/checker-reference-owner.mjs';
const hash=raw=>createHash('sha256').update(raw).digest('hex');
try{
 const copy=path=>{const target=join(root,path);mkdirSync(dirname(target),{recursive:true});copyFileSync(join(canonical,path),target);};
 for(const ref of initial.bound)copy(ref.path);
 const proposal=JSON.parse(readFileSync(join(canonical,'compatibility/rc/c04-checker-reference-proposal.json')));
 for(const ref of [...proposal.source_members,proposal.qualified_source_inputs,proposal.after_image])copy(ref.path);
 // The verifier also imports modules with their own import-time data inputs.
 // Use the complete tracked source tree and the real pinned compiler so its
 // subprocess executes the same source/data population in this isolated root.
 const tracked=execFileSync('git',['ls-files','-z'],{cwd:canonical,maxBuffer:16*1024*1024}).toString().split('\0').filter(Boolean);
 for(const path of tracked)copy(path);
 for(const path of ['node_modules/typescript/package.json','node_modules/typescript/lib/typescript.js'])copy(path);
 writeFileSync(join(root,'.git'),'gitdir: '+execFileSync('git',['rev-parse','--absolute-git-dir'],{cwd:canonical}).toString().trim()+'\n');
 const physical=path=>readFileSync(join(root,path)),ownerBytes=physical(OWNER);
 let target=null,kind='',calls=0,restore=false;
 const sentinel=new Error('actual checker context reader sentinel');
 const read=path=>{
  calls++;if(restore){restore=false;writeFileSync(join(root,OWNER),ownerBytes);}
  const value=physical(path);if(path!==target)return value;
  if(kind==='exception')throw sentinel;
  return kind==='nonbuffer'?{}:Buffer.concat([value,Buffer.from(' ')]);
 };
 const context=make({root,read}),before=Buffer.from(context.before),after=Buffer.from(context.after),bound=structuredClone(context.bound);
 const checks=[],check=(name,run)=>{run();checks.push(name);};
 const prior=(overrides={})=>({canonical_after:Buffer.from(before),bound:new Map([['caller-prior','prior-digest']]),...overrides});
 check('exact authenticated before and after images',()=>{
  assert.equal(hash(before),initial.packet.before_ledger.sha256);assert.equal(hash(after),initial.packet.after_ledger.sha256);
  assert.equal(context.metadata_entries,13);assert.equal(context.applied,physical(LEDGER).equals(after));
  assert.equal(context.canonical_frame_admission_granted,false);assert.equal(context.current_native_packed_or_floor_or_g11_credit,false);
 });
 check('public context shape retained',()=>assert.deepEqual(Object.keys(context).sort(),['after','applied','assertCurrent','before','bound','canonical_frame_admission_granted','current_native_packed_or_floor_or_g11_credit','line','metadata_entries','wrapPrepared'].sort()));
 check('wrapper rejects wrong complete prior image',()=>{
  const wrong=Buffer.concat([before,Buffer.from(' ')]);
  assert.throws(()=>context.wrapPrepared(prior({canonical_after:wrong})));
 });
 check('wrapper forwards both prior guards and retains prior bindings',()=>{
  let current=0,metadata=0;const x=context.wrapPrepared(prior({assertCurrent(){current++;},prior_metadata_assert_current(){metadata++;}}));
  assert.ok(current>0&&metadata>0);current=0;metadata=0;x.assertCurrent();assert.ok(current>0&&metadata>0);
  assert.equal(x.bound.get('caller-prior'),'prior-digest');for(const ref of bound)assert.equal(x.bound.get(ref.path),ref.sha256);
  assert.ok(x.canonical_after.equals(after));assert.ok(x.checker_reference_stage.before.equals(before));assert.ok(x.checker_reference_stage.after.equals(after));
  assert.equal(x.checker_reference_stage.metadata_entries,13);assert.equal(x.checker_reference_stage.individual_decisions,0);
  assert.equal(x.checker_reference_stage.source_scope_only,true);assert.equal(x.checker_reference_stage.current_native_or_packed_or_floor_qualified,false);
 });
 for(const hook of ['assertCurrent','prior_metadata_assert_current'])check('prior '+hook+' exception identity and recovery',()=>{
  assert.throws(()=>context.wrapPrepared(prior({[hook](){throw sentinel;}})),error=>error===sentinel);context.assertCurrent();
 });
 check('fresh wrapped buffers do not mutate private images',()=>{
  const x=context.wrapPrepared(prior()),y=context.wrapPrepared(prior());assert.notStrictEqual(x.canonical_after,y.canonical_after);
  x.canonical_after.fill(0);x.checker_reference_stage.before.fill(0);x.checker_reference_stage.after.fill(0);
  assert.ok(y.canonical_after.equals(after));assert.ok(y.checker_reference_stage.before.equals(before));y.assertCurrent();
 });
 check('public context snapshots cannot mutate source guards',()=>{
  context.before.fill(0);context.after.fill(0);context.bound.length=0;context.assertCurrent();assert.ok(context.wrapPrepared(prior()).canonical_after.equals(after));
 });
 for(const path of [OWNER,'scripts/checker-reference-proposal.mjs','compatibility/rc/main-checker-context-source-routing-v12.json',LEDGER])check('forged and non-buffer source rejection '+path,()=>{
  target=path;for(const mode of ['buffer','nonbuffer']){kind=mode;assert.throws(()=>context.assertCurrent());}
  target=null;context.assertCurrent();
 });
 check('cold physical drift rejects before restoring callback',()=>{
  try{writeFileSync(join(root,OWNER),Buffer.concat([ownerBytes,Buffer.from(' ')]));restore=true;calls=0;assert.throws(()=>context.assertCurrent());assert.equal(calls,0);assert.equal(restore,true);}
  finally{restore=false;writeFileSync(join(root,OWNER),ownerBytes);}context.assertCurrent();
 });
 check('warm physical drift and clean recovery',()=>{
  context.assertCurrent();try{writeFileSync(join(root,OWNER),Buffer.concat([ownerBytes,Buffer.from(' ')]));assert.throws(()=>context.assertCurrent());}
  finally{writeFileSync(join(root,OWNER),ownerBytes);}context.assertCurrent();
 });
 check('provided reader exception identity and recovery',()=>{
  target=OWNER;kind='exception';assert.throws(()=>context.assertCurrent(),error=>error===sentinel);target=null;context.assertCurrent();
 });
 check('nonphysical ledger rejected and independent genuine owner unchanged',()=>{
  const virtual=Buffer.concat([physical(LEDGER),Buffer.from(' ')]);
  assert.throws(()=>make({root,read:path=>path===LEDGER?Buffer.from(virtual):physical(path)}),/nonphysical current tool input compatibility\/f10\/disposition-ledger\/ledger\.json/);
  const fresh=make({root,read:physical});assert.notStrictEqual(fresh,context);
  assert.equal(fresh.applied,physical(LEDGER).equals(after));assert.ok(fresh.before.equals(before));assert.ok(fresh.after.equals(after));assert.ok(fresh.bound.length>0);fresh.assertCurrent();
  fresh.bound.length=0;fresh.before.fill(0);fresh.after.fill(0);fresh.assertCurrent();context.assertCurrent();
 });
 assert.equal(checks.length,16);
 console.log(JSON.stringify({result:'pass',checks,checks_passed:checks.length,bound:bound.length,before_sha256:hash(before),after_sha256:hash(after),genuine_producer_and_fresh_verifier:true,historical_program_executed:false,artifact_or_audit_admission_granted:false,g11_claim:'not-passed'}));
}finally{rmSync(root,{recursive:true,force:true});}
