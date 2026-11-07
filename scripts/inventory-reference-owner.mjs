/**
 * @license
 * Copyright Google LLC All Rights Reserved.
 * Copyright (c) 2026 Ryan Lester.
 * Use of this source code is governed by the MIT license in LICENSE.
 */
/** Exact terminal metadata integration. Historical tool images are compared as data, never executed. */
import assert from 'node:assert/strict';
import {checkerReferenceOwnerContext} from './checker-reference-owner.mjs';
import {browserReferenceOwnerContext} from './browser-reference-owner.mjs';
import {inventoryRcAcceptanceSourceSuccessor} from './inventory-rc-acceptance-source-successor.mjs';
import {readCheckerOwnerMember} from './checker-owner-source.mjs';
import {createHash} from 'node:crypto';
import {execFileSync} from 'node:child_process';
import {readFileSync} from 'node:fs';
import {fileURLToPath} from 'node:url';
import {prepareInventoryReferenceSourceMetadata,INVENTORY_REFERENCE_LEDGER as LEDGER,INVENTORY_REFERENCE_PATH as INVENTORY} from './inventory-reference-proposal.mjs';
import {readEvidenceMember} from './upstream-packed-run-evidence.mjs';
import {readHistoricalContractRepairOwnerMember} from './historical-contract-repair-readers.mjs';
import {inventoryFiniteToolSuccessor} from './inventory-finite-tool-successor.mjs';
const PATH='scripts/inventory-reference-owner.mjs',OWNER='scripts/packed-upstream-ledger-epoch.mjs';
const PACKET='compatibility/rc/c04-inventory-owner-inputs.json';
const PINS={"main":"97db675e4fda1c6dd4a7f056159bd47e2aa963dddb9dff3da1af537ae062d15a","21.x":"0d9dfac3813a6dc60644a090a2173ce56eaed1bcbdb32c2be29ce53f32413cdc"};
const image=readFileSync(fileURLToPath(import.meta.url)),hash=raw=>createHash('sha256').update(raw).digest('hex');
const historicalMetadataReaders=new WeakSet();
function original(root,parent,path){
 const env={...process.env,GIT_NO_LAZY_FETCH:'1',GIT_NO_REPLACE_OBJECTS:'1'};
 for(const key of ['GIT_DIR','GIT_WORK_TREE','GIT_INDEX_FILE','GIT_COMMON_DIR','GIT_OBJECT_DIRECTORY','GIT_ALTERNATE_OBJECT_DIRECTORIES'])delete env[key];
 return execFileSync('git',['--no-replace-objects','-c','gc.auto=0','-c','maintenance.auto=0','show',parent+':'+path],{cwd:root,env,maxBuffer:16*1024*1024});
}
/** Exact inventory and native binding-list implementation metadata. No old
 * program executes and no runtime/native observations are substituted. */
function titleMeasurementCurrentSubject(root,scope,source){
 const packetRaw=readEvidenceMember(root,PACKET);assert.equal(hash(packetRaw),PINS['21.x']);
 const packet=JSON.parse(packetRaw);assert.equal(packet.line,'21.x');
 const path='scripts/upstream-dialog-title-native-evidence.mjs';
 const transitions=packet.historical_handler_metadata.filter(row=>row.after.path===path);assert.equal(transitions.length,1);
 const transition=transitions[0],before=original(root,transition.before_parent,path);
 assert.equal(hash(before),transition.before.sha256);assert.equal(before.length,transition.before.bytes);
 let expected=before.toString();for(const edit of transition.literal_edits){assert.equal(expected.split(edit.before).length,2);expected=expected.replace(edit.before,edit.after);}
 assert.equal(hash(expected),transition.after.sha256);assert.equal(Buffer.byteLength(expected),transition.after.bytes);
 const native=readEvidenceMember(root,path);assert.equal(native.toString(),expected);
 const priorInventory=original(root,source.verifier.source_parent,INVENTORY);
 const current=source.bound.find(ref=>ref.path===INVENTORY);assert.ok(current);
 const previous=new Map(),references=new Map([[INVENTORY,current],[path,transition.after]]);
 for(const[member,ref]of references){
  const prior=scope.input_members.filter(row=>row.path===member);assert.equal(prior.length,1);previous.set(member,prior[0]);
  const old=member===INVENTORY?{sha256:hash(priorInventory),bytes:priorInventory.length}:transition.before;
  assert.equal(prior[0].sha256,old.sha256);assert.equal(prior[0].bytes,old.bytes);
 }
 const assertCurrent=()=>{
  source.assertCurrent();assert.equal(hash(readEvidenceMember(root,PACKET)),hash(packetRaw));
  for(const ref of references.values()){const raw=readEvidenceMember(root,ref.path);assert.equal(hash(raw),ref.sha256);assert.equal(raw.length,ref.bytes);}
 };
 assertCurrent();return {references,previous,assertCurrent};
}
function originalTitleMeasurement(root,value){
 const path='compatibility/rc/21x-c04-dialog-title-replacement-canonical-qualified-owner-source-measurement.json';
 const report=readEvidenceMember(root,path);
 assert.equal(hash(report),'5911c0c1d0b72c3990a1be798132f970f65bd37aa480da5b00ab93c804d47985');
 const scope=structuredClone(value);assert.deepEqual(scope,JSON.parse(report),'not the immutable original title measurement');
 assert.equal(scope.line,'21.x');assert.equal(scope.fresh_lifecycle_executed,true);
 assert.equal(scope.actual_native_artifact_browser_floor_or_full_audit_qualified,false);return scope;
}
/** Return metadata for the original whole-report comparison only. Actual
 * current measurements/readers remain raw and must match the complete model. */
export function titleMeasurementForHistoricalComparison({root,actual,expected}={}){
 actual=structuredClone(actual);expected=originalTitleMeasurement(root,expected);
 const source=prepareInventoryReferenceSourceMetadata({root});assert.equal(source.line,'21.x');
 const subject=titleMeasurementCurrentSubject(root,expected,source),derived=structuredClone(expected);
 derived.input_members=derived.input_members.map(ref=>subject.references.has(ref.path)?{...ref,...subject.references.get(ref.path)}:ref);
 subject.assertCurrent();assert.deepEqual(actual,derived,'fresh title measurement differs beyond the exact qualified metadata transitions');
 const comparison=structuredClone(actual);
 comparison.input_members=comparison.input_members.map(ref=>subject.previous.has(ref.path)?{...subject.previous.get(ref.path)}:ref);
 subject.assertCurrent();return comparison;
}
/** Advance raw source bindings; only the internally registered metadata reader
 * can continue using an authenticated old binding for the preserved stages. */
export function titleMeasurementSourceReferences({root,read,scope}={}){
 scope=originalTitleMeasurement(root,scope);
 const source=prepareInventoryReferenceSourceMetadata({root});assert.equal(source.line,'21.x');
 const subject=titleMeasurementCurrentSubject(root,scope,source);
 const refs=scope.input_members.map(ref=>{
  const current=subject.references.get(ref.path);if(!current)return {...ref};
  const raw=read(ref.path);
  if(hash(raw)===current.sha256){assert.equal(raw.length,current.bytes);return {...ref,...current};}
  assert.ok(historicalMetadataReaders.has(read),'historical source bytes require the private metadata reader');
  assert.equal(hash(raw),ref.sha256);assert.equal(raw.length,ref.bytes);return {...ref};
 });
 subject.assertCurrent();return refs;
}
/** Fresh focused orchestration checks, never an Actions or product result. */
function verifyCurrentWorkflow(root,workflow){
 const program=`import contextlib,io,json,sys,unittest
from pathlib import Path
root=Path.cwd();sys.path.insert(0,str(root));log=io.StringIO()
loader=unittest.TestLoader()
suite=loader.discover(str(root/'tests'),pattern='test_helper_ci.py')
def cases(suite):
 for item in suite:
  if isinstance(item,unittest.TestSuite):yield from cases(item)
  else:yield item
ids=[case.id()for case in cases(suite)]
assert not loader.errors,loader.errors
assert len(ids)==len(set(ids))==14,ids
with contextlib.redirect_stdout(log),contextlib.redirect_stderr(log):
 result=unittest.TextTestRunner(stream=log,verbosity=2).run(suite)
report={'result':'pass'if result.wasSuccessful()and not result.skipped else'fail','tests_run':result.testsRun,'test_ids':ids,'skipped':len(result.skipped),'full_Actions_execution_qualified':False}
print(json.dumps(report))
if report['result']!='pass':sys.stderr.write(log.getvalue());sys.exit(1)
`;
 const result=JSON.parse(execFileSync('python3',['-B','-c',program],{cwd:root,encoding:'utf8',maxBuffer:1024*1024,timeout:120000}));
 assert.equal(result.result,'pass');assert.equal(result.tests_run,14);assert.equal(result.test_ids.length,14);
 assert.equal(new Set(result.test_ids).size,14);assert.equal(result.skipped,0);assert.equal(result.full_Actions_execution_qualified,false);
 const source_regressions=workflow.source_test_expectations.map(expected=>{
  const output=JSON.parse(execFileSync(process.execPath,[expected.path],{cwd:root,encoding:'utf8',maxBuffer:1024*1024,timeout:120000}));
  assert.equal(output.cases,expected.cases,'current CI source cases changed '+expected.path);
  assert.equal(output.mutants_rejected,expected.mutants_rejected,'current CI source mutants changed '+expected.path);
  assert.equal(output.node,process.version);
  return {path:expected.path,cases:output.cases,mutants_rejected:output.mutants_rejected,source_only:true};
 });
 return {...result,source_regressions,full_Actions_execution_qualified:false};
}
export function inventoryReferenceOwnerContext({root,read=path=>readCheckerOwnerMember(root,path)}={}){
 const version=JSON.parse(read('projects/ngx-material-legacy/package.json')).version;
 const line=version.startsWith('21.')?'21.x':version.startsWith('22.')?'main':null;assert.ok(line);
 const rc=inventoryRcAcceptanceSourceSuccessor({root,read});
 const tool=inventoryFiniteToolSuccessor({root,line,read});
 const bound=new Map([...rc.bound,...tool.bound].map(ref=>[ref.path,{...ref}]));
 let active=false;const idle=()=>assert.equal(active,false,'reentrant inventory owner consumption');
 const member=(path,expected)=>{
  idle();
  if(expected){const first=rc.qualify({path,sha256:expected})??{path,sha256:expected};expected=(tool.qualify(first)??first).sha256;}
  const physical=readHistoricalContractRepairOwnerMember(root,path),raw=read(path);assert.ok(Buffer.isBuffer(raw)&&physical.equals(raw),'nonphysical inventory owner input '+path);assert.ok(physical.equals(readHistoricalContractRepairOwnerMember(root,path)),'inventory owner input changed during callback '+path);
  if(expected)assert.equal(hash(raw),expected,'changed inventory owner input '+path);
  const ref={path,sha256:hash(raw),bytes:raw.length},prior=bound.get(path);if(prior)assert.deepEqual(ref,prior,'changed repeated inventory owner input '+path);else bound.set(path,ref);return raw;
 };
 const packetRaw=member(PACKET,PINS[line]),packet=JSON.parse(packetRaw);assert.equal(packet.line,line);assert.equal(packet.schema_version,1);
 assert.equal(packet.old_functions_executed_as_current_compiled_code,true);assert.equal(packet.old_program_execution,false);
 for(const key of ['source_admissions_changed','canonical_dispositions_changed','product_changes'])assert.equal(packet[key],0);
 assert.equal(packet.actual_native_packed_browser_floor_or_full_audit_qualified,false);assert.equal(packet.g11_claim,'not-passed');
 member(PATH,hash(image));
 const oldOwner=original(root,packet.source_parent,OWNER);assert.equal(hash(oldOwner),packet.before_owner.sha256);assert.equal(oldOwner.length,packet.before_owner.bytes);
 let ownerExpected=oldOwner.toString();
 for(const edit of packet.owner_literal_edits){assert.equal(ownerExpected.split(edit.before).length,2,'ambiguous owner edit');ownerExpected=ownerExpected.replace(edit.before,edit.after);}
 assert.equal(hash(ownerExpected),packet.after_owner.sha256);assert.equal(Buffer.byteLength(ownerExpected),packet.after_owner.bytes);
 const owner=member(OWNER,packet.after_owner.sha256);assert.equal(owner.toString(),ownerExpected);
 assert.equal(hash(readEvidenceMember(root,OWNER)),packet.after_owner.sha256,'actual loaded owner path differs from qualified code');
 for(const prior of packet.source_members){const first=rc.qualify(prior)??prior,ref=tool.qualify(first)??first,raw=member(ref.path,ref.sha256);assert.equal(raw.length,ref.bytes);}
 const historicalHandlers=new Map();
 for(const transition of packet.historical_handler_metadata){
  assert.equal(line,'21.x');assert.ok(['scripts/upstream-dialog-title-admission.cjs','scripts/upstream-dialog-title-native-evidence.mjs'].includes(transition.after.path));
  assert.equal(transition.before.path,transition.after.path);
  const before=original(root,transition.before_parent,transition.before.path);
  assert.equal(hash(before),transition.before.sha256);assert.equal(before.length,transition.before.bytes);
  let expected=before.toString();
  for(const edit of transition.literal_edits){assert.equal(expected.split(edit.before).length,2,'ambiguous handler edit');expected=expected.replace(edit.before,edit.after);}
  assert.equal(hash(expected),transition.after.sha256);assert.equal(Buffer.byteLength(expected),transition.after.bytes);
  const current=member(transition.after.path,transition.after.sha256);assert.equal(current.toString(),expected);
  assert.equal(hash(readEvidenceMember(root,transition.after.path)),transition.after.sha256,'actual current handler differs');
  historicalHandlers.set(transition.after.path,{before:Buffer.from(before),after:transition.after});
 }
 assert.equal(historicalHandlers.size,line==='21.x'?2:0);
 const workflow=packet.historical_workflow_metadata;
 assert.equal(workflow.path,'.github/workflows/ci.yml');assert.equal(workflow.fresh_current_orchestration_test_methods,14);
 assert.equal(workflow.full_Actions_execution_qualified,false);
 const oldWorkflow=original(root,workflow.before_parent,workflow.path),newWorkflow=original(root,workflow.after_commit,workflow.path);
 for(const[raw,ref]of [[oldWorkflow,workflow.before],[newWorkflow,workflow.after]]){
  assert.equal(ref.path,workflow.path);assert.equal(hash(raw),ref.sha256);assert.equal(raw.length,ref.bytes);
 }
 assert.deepEqual(tool.workflow.before,workflow.after);
 const currentWorkflowRef=tool.workflow.current,currentWorkflow=read(workflow.path);
 assert.equal(currentWorkflowRef.path,workflow.path);assert.equal(hash(currentWorkflow),currentWorkflowRef.sha256);
 assert.equal(currentWorkflow.length,currentWorkflowRef.bytes);
 assert.ok(currentWorkflow.equals(readEvidenceMember(root,workflow.path)),'nonphysical current workflow');
 const qualifiedCI=JSON.parse(member(workflow.qualified_transition.path,workflow.qualified_transition.sha256));
 assert.equal(qualifiedCI.source_parent,workflow.before_parent);assert.equal(qualifiedCI.line,line);
 for(const flag of ['actual_Actions_run_executed','full_helper_suite_executed','full_product_native_packed_browser_peer_floor_or_independent_audit_qualified'])assert.equal(qualifiedCI[flag],false);
 for(const ref of qualifiedCI.source_subjects)assert.ok(packet.source_members.some(row=>JSON.stringify(row)===JSON.stringify(ref)),'unbound current CI subject '+ref.path);
 const oldText=oldWorkflow.toString(),newText=newWorkflow.toString();
 assert.equal(newText.split('jobs:\n')[0],oldText.split('jobs:\n')[0]);
 assert.equal(newText.split('  packed-consumer-aot:\n')[1],oldText.split('  packed-consumer-aot:\n')[1]);
 const source=prepareInventoryReferenceSourceMetadata({root,read});
 assert.equal(source.line,line);assert.equal(hash(source.before),packet.before_ledger.sha256);assert.equal(hash(source.after),packet.after_ledger.sha256);
 assert.equal(source.metadata_reference_updates,packet.metadata_entries);assert.equal(source.canonical_owner_integration_complete,false);
 for(const ref of source.bound)bound.set(ref.path,{...ref});
 const oldInventory=original(root,source.verifier.source_parent,INVENTORY);
 assert.equal(hash(oldInventory),packet.prior_inventory_sha256);assert.equal(source.verifier.before_inventory_sha256,packet.prior_inventory_sha256);
 const requiredCI=['.github/workflows/ci.yml','scripts/helper_ci.py','tests/test_helper_ci.py','tests/test_packed_upstream_ledger_epoch.py',
  'compatibility/rc/c04-retained-ledger-phases-stage-population.json',line==='main'?'scripts/rc-verify-lite.py':'scripts/run-helper-checks.py'];
 if(line==='main')requiredCI.push('scripts/rc_acceptance.py','scripts/historical_inventory_source.py');
 const ciRefs=requiredCI.map(path=>{const ref=bound.get(path)??packet.source_members.find(row=>row.path===path);assert.ok(ref,'missing current CI source '+path);return ref;});
 const assertPhysicalCI=()=>{for(const ref of ciRefs){const raw=readEvidenceMember(root,ref.path);assert.equal(hash(raw),ref.sha256,'actual current CI source changed '+ref.path);assert.equal(raw.length,ref.bytes);}};
 const checker=checkerReferenceOwnerContext({root,read});assert.ok(checker.before.equals(source.after));
 for(const ref of checker.bound)bound.set(ref.path,{...ref});
 const browser=browserReferenceOwnerContext({root,read});assert.ok(browser.before.equals(checker.after));
 for(const ref of browser.bound)bound.set(ref.path,{...ref});
 const currentLedger=member(LEDGER),applied=currentLedger.equals(source.after)||checker.applied||browser.applied;
 // The original owner validates all old complete frames. Only this exact
 // independently derived after-image maps to its qualified predecessor.
 const sweep=()=>{for(const ref of bound.values()){const raw=readHistoricalContractRepairOwnerMember(root,ref.path);assert.equal(hash(raw),ref.sha256,'physical inventory owner input '+ref.path);assert.equal(raw.length,ref.bytes);}};
 const assertCurrent=()=>{idle();active=true;try{sweep();
  tool.assertCurrent();rc.assertCurrent();source.assertCurrent();checker.assertCurrent();browser.assertCurrent();assertPhysicalCI();
  for(const ref of bound.values()){const actual=readHistoricalContractRepairOwnerMember(root,ref.path),raw=read(ref.path);assert.ok(Buffer.isBuffer(raw)&&actual.equals(raw),'nonphysical inventory owner input '+ref.path);assert.ok(actual.equals(readHistoricalContractRepairOwnerMember(root,ref.path)),'inventory owner input changed during callback '+ref.path);assert.equal(hash(actual),ref.sha256,'late inventory owner input '+ref.path);assert.equal(actual.length,ref.bytes);}
  browser.assertSurfacePhysical();browser.assertFormPhysical();rc.assertPhysical();sweep();}finally{active=false;}
 };
 const metadataRead=path=>{
  const handler=historicalHandlers.get(path);if(handler){assert.equal(hash(read(path)),handler.after.sha256,'changed current title handler');return Buffer.from(handler.before);}
  if(path===INVENTORY){assert.equal(hash(read(path)),source.verifier.current_inventory_sha256,'changed current inventory metadata');return Buffer.from(oldInventory);}
  if(path===workflow.path){assert.equal(hash(read(path)),currentWorkflowRef.sha256,'changed current workflow');return Buffer.from(oldWorkflow);}
  if(path===OWNER&&line==='main'){const current=read(path);assert.equal(hash(current),packet.after_owner.sha256,'changed current owner code');return current;}
  if(path===LEDGER){const raw=read(path);assert.equal(hash(raw),hash(currentLedger),'late canonical metadata image change');return applied?Buffer.from(source.before):raw;}
  return read(path);
 };
 function wrapPrepared(prior){
  assertCurrent();assert.ok(prior.canonical_after.equals(source.before),'prior owner did not derive the exact inventory stage predecessor');
  const priorBound=new Map(prior.bound),currentBound=new Map(prior.bound);
  for(const path of [OWNER,INVENTORY,LEDGER])if(currentBound.has(path))currentBound.set(path,hash(read(path)));
  for(const ref of bound.values())currentBound.set(ref.path,ref.sha256);
  const assertPrior=()=>{
   assertCurrent();prior.assertCurrent?.();prior.prior_metadata_assert_current?.();
   for(const[path,digest]of priorBound)assert.equal(hash(metadataRead(path)),digest,'changed preserved prior source binding '+path);
   assertCurrent();
  };
  const native=prior.native_spec_source;
  const nativeBound=native.bound.map(ref=>({...ref,sha256:currentBound.get(ref.path)??ref.sha256,bytes:read(ref.path).length}));
  const stage={before:Buffer.from(source.before),after:Buffer.from(source.after),metadata_entries:packet.metadata_entries,
   source_reference_updates:packet.metadata_entries,individual_decisions:0,assertCurrent,
   source_scope_only:true,current_native_or_packed_or_floor_qualified:false};
  assertPrior();return browser.wrapPrepared(checker.wrapPrepared({...prior,canonical_after:Buffer.from(source.after),bound:currentBound,
   inventory_reference_stage:stage,native_spec_source:{...native,bound:nativeBound,assertCurrent:()=>{assertCurrent();native.assertCurrent();assertCurrent();}},
   prior_metadata_assert_current:assertPrior,assertCurrent:assertPrior}));
 }
 assertCurrent();const currentWorkflowTests=verifyCurrentWorkflow(root,tool.workflow);assertCurrent();
 historicalMetadataReaders.add(metadataRead);
 return {line,metadataRead,wrapPrepared,assertCurrent,applied,checker,browser,metadata_entries:packet.metadata_entries,current_workflow_tests:structuredClone(currentWorkflowTests),
  before:Buffer.from(source.before),after:Buffer.from(source.after),bound:structuredClone([...bound.values()]),
  canonical_dispositions_changed:0,current_native_packed_or_floor_or_g11_credit:false};
}
