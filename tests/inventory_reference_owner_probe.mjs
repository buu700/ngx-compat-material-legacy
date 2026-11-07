/**
 * @license
 * Copyright Google LLC All Rights Reserved.
 * Copyright (c) 2026 Ryan Lester.
 * Use of this source code is governed by the MIT license in LICENSE.
 */
/** Source/context controls or one composite genuine prepare+epoch check. No browser/product run. */
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {execFileSync} from 'node:child_process';
import {readFileSync} from 'node:fs';
import {createRequire} from 'node:module';
import {dirname,resolve} from 'node:path';
import {fileURLToPath} from 'node:url';
import {inventoryReferenceOwnerContext,titleMeasurementForHistoricalComparison,titleMeasurementSourceReferences} from '../scripts/inventory-reference-owner.mjs';
const root=resolve(dirname(fileURLToPath(import.meta.url)),'..'),read=path=>readFileSync(resolve(root,path));
const hash=raw=>createHash('sha256').update(raw).digest('hex');
const mode=process.argv[2];assert.ok(['--source','--runtime'].includes(mode));assert.equal(process.argv.length,3);
const ledger='compatibility/f10/disposition-ledger/ledger.json',owner='scripts/packed-upstream-ledger-epoch.mjs',inventory='testing/legacy-runner/historical-inventory.json';
const packet=JSON.parse(read('compatibility/rc/c04-inventory-owner-inputs.json')),line=packet.line;
const canonicalBefore=read(ledger);
if(mode==='--source'){
 const ts=createRequire(import.meta.url)('typescript');assert.equal(ts.version,JSON.parse(read('package.json')).devDependencies.typescript);
 const env={...process.env,GIT_NO_LAZY_FETCH:'1',GIT_NO_REPLACE_OBJECTS:'1'};
 for(const key of ['GIT_DIR','GIT_WORK_TREE','GIT_INDEX_FILE','GIT_COMMON_DIR','GIT_OBJECT_DIRECTORY','GIT_ALTERNATE_OBJECT_DIRECTORIES'])delete env[key];
 const before=execFileSync('git',['--no-replace-objects','show',packet.source_parent+':'+owner],{cwd:root,env,maxBuffer:1024*1024});
 assert.equal(hash(before),packet.before_owner.sha256);
 const parse=(name,raw)=>{const sf=ts.createSourceFile(name,raw.toString(),ts.ScriptTarget.Latest,true,ts.ScriptKind.JS);assert.equal(sf.parseDiagnostics.length,0);return sf;};
 const old=parse('before.mjs',before),current=parse('after.mjs',read(owner));
 const extraImport=n=>ts.isImportDeclaration(n)&&n.moduleSpecifier.text==='./inventory-reference-owner.mjs';
 const wrapperNames=['preparePackedUpstreamLedger','packedUpstreamLedgerEpoch',...(line==='21.x'?['qualifyCanonicalToolReference']:[])];
 const wrapper=n=>ts.isFunctionDeclaration(n)&&wrapperNames.includes(n.name?.text);
 const preserved=current.statements.filter(n=>!extraImport(n)&&!wrapper(n));
 assert.equal(current.statements.filter(extraImport).length,1);assert.equal(current.statements.filter(wrapper).length,wrapperNames.length);
 assert.equal(preserved.length,old.statements.length);
 for(const[index,node]of preserved.entries()){
  let text=node.getText(current);
  if(ts.isFunctionDeclaration(node)&&node.name?.text==='prepareBeforeInventoryReferenceLedger')text=text.replace('function prepareBeforeInventoryReferenceLedger','export function preparePackedUpstreamLedger');
  if(ts.isFunctionDeclaration(node)&&node.name?.text==='qualifyBeforeInventoryReferenceToolReference')text=text.replace('function qualifyBeforeInventoryReferenceToolReference','export function qualifyCanonicalToolReference');
  if(ts.isFunctionDeclaration(node)&&node.name?.text==='epochBeforeInventoryReferenceLedger'){
   text=text.replace('function epochBeforeInventoryReferenceLedger','export function packedUpstreamLedgerEpoch');
   if(line==='main')text=text.replace('const prepared = prepareBeforeInventoryReferenceLedger({root, read});','const prepared = preparePackedUpstreamLedger({root, read});');
  }
  assert.equal(text,old.statements[index].getText(old),'original owner statement changed at index '+index);
 }
 let tamper=null;const liveRead=path=>{const raw=read(path);return path===tamper?Buffer.concat([raw,Buffer.from(' ')]):raw;};
 const subject=inventoryReferenceOwnerContext({root,read:liveRead});
 assert.equal(hash(subject.metadataRead(inventory)),packet.prior_inventory_sha256);
 assert.equal(hash(subject.metadataRead(owner)),packet.after_owner.sha256);
 assert.equal(subject.current_native_packed_or_floor_or_g11_credit,false);
 assert.equal(subject.current_workflow_tests.tests_run,14);assert.equal(subject.current_workflow_tests.skipped,0);
 assert.equal(hash(subject.metadataRead('.github/workflows/ci.yml')),packet.historical_workflow_metadata.before.sha256);
 let titleMetadataControls=0;
 if(line==='21.x'){
  const path='compatibility/rc/21x-c04-dialog-title-replacement-canonical-qualified-owner-source-measurement.json';
  const expected=JSON.parse(read(path)),actual=structuredClone(expected);
  const index=actual.input_members.findIndex(ref=>ref.path===inventory),original=structuredClone(actual.input_members[index]);
  actual.input_members[index]={...original,sha256:packet.current_inventory.sha256,bytes:packet.current_inventory.bytes};
  const nativePath='scripts/upstream-dialog-title-native-evidence.mjs',nativeIndex=actual.input_members.findIndex(ref=>ref.path===nativePath);
  const nativeBefore={...actual.input_members[nativeIndex]},nativeAfter=packet.historical_handler_metadata.find(row=>row.after.path===nativePath).after;
  actual.input_members[nativeIndex]={...nativeBefore,...nativeAfter};
  assert.deepEqual(titleMeasurementForHistoricalComparison({root,actual,expected}),expected);
  const currentRefs=titleMeasurementSourceReferences({root,read,scope:expected});
  assert.deepEqual(currentRefs[index],actual.input_members[index]);
  const historicalRefs=titleMeasurementSourceReferences({root,read:subject.metadataRead,scope:expected});assert.deepEqual(historicalRefs[index],original);
  // Only the registered internal callback may expose the old metadata binding.
  const oldInventory=subject.metadataRead(inventory),oldRead=path=>path===inventory?Buffer.from(oldInventory):read(path);
  assert.throws(()=>titleMeasurementSourceReferences({root,read:oldRead,scope:expected}));titleMetadataControls++;
  const changedRead=path=>path===inventory?Buffer.concat([read(path),Buffer.from(' ')]):read(path);
  assert.throws(()=>titleMeasurementSourceReferences({root,read:changedRead,scope:expected}));titleMetadataControls++;

  const mutations=[
   value=>value.result='fail',value=>value.line='main',value=>value.fresh_lifecycle_executed=false,
   value=>value.actual_native_artifact_browser_floor_or_full_audit_qualified=true,value=>value.g11_claim='passed',
   value=>value.graph.source_members[0].sha256='0'.repeat(64),value=>value.input_members[0].sha256='0'.repeat(64),
   value=>value.input_members[index].path+='-foreign',value=>value.input_members[index].sha256=original.sha256,
   value=>value.input_members[index].bytes=original.bytes,value=>value.input_members.splice(index,1),
   value=>value.input_members.push({...value.input_members[index]}),
   value=>value.input_members[nativeIndex].sha256=nativeBefore.sha256,
   value=>value.input_members[nativeIndex].bytes=nativeBefore.bytes,
  ];
  for(const mutate of mutations){const changed=structuredClone(actual);mutate(changed);assert.throws(()=>titleMeasurementForHistoricalComparison({root,actual:changed,expected}));titleMetadataControls++;}
  const changedExpected=structuredClone(expected);changedExpected.result='fail';
  assert.throws(()=>titleMeasurementForHistoricalComparison({root,actual,expected:changedExpected}));titleMetadataControls++;
  assert.deepEqual(JSON.parse(read(path)),expected);assert.deepEqual(actual.input_members[index],{...original,sha256:packet.current_inventory.sha256,bytes:packet.current_inventory.bytes});
  assert.equal(hash(subject.metadataRead('scripts/upstream-dialog-title-admission.cjs')),packet.historical_handler_metadata[0].before.sha256);
 }
 let cold=0,late=0;
 for(const ref of subject.bound){tamper=ref.path;assert.throws(()=>subject.assertCurrent(),undefined,'late '+tamper);late++;tamper=null;}
 subject.assertCurrent();
 for(const ref of subject.bound){if(ref.path===ledger)continue;tamper=ref.path;assert.throws(()=>inventoryReferenceOwnerContext({root,read:liveRead}),undefined,'cold '+tamper);cold++;tamper=null;}
 // A source context never substitutes for the real owner's complete frame gate.
 const unknownRead=path=>path===ledger?Buffer.concat([read(path),Buffer.from(' ')]):read(path);
 assert.throws(()=>inventoryReferenceOwnerContext({root,read:unknownRead}),/nonphysical inventory owner input/);
 subject.bound.length=0;subject.before.fill(0);subject.after.fill(0);subject.assertCurrent();
 assert.ok(read(ledger).equals(canonicalBefore));
 console.log(JSON.stringify({schema_version:1,line,mode:'source-only',original_top_level_statements_preserved:old.statements.length,
  original_owner_functions_preserved:old.statements.filter(ts.isFunctionDeclaration).length,
  added_imports:1,added_public_wrappers:wrapperNames.length,cold_source_mutants_rejected:cold,late_source_mutants_rejected:late,
  fresh_current_workflow_tests:subject.current_workflow_tests.tests_run,title_metadata_controls_rejected:titleMetadataControls,
  old_frame_admission_deferred_to_real_owner:true,nonphysical_ledger_rejected:true,canonical_ledger_unchanged:true,
  actual_owner_compiler_native_or_full_product_execution:false,g11_claim:'not-passed'}));
}else{
 let tamper=null;const liveRead=path=>{const raw=read(path);return path===tamper?Buffer.concat([raw,Buffer.from(' ')]):raw;};
 const api=await import('../scripts/packed-upstream-ledger-epoch.mjs');
 const started=performance.now();
 const prepared=api.preparePackedUpstreamLedger({root,read:liveRead});const prepareSeconds=(performance.now()-started)/1000;
 assert.equal(hash(prepared.inventory_reference_stage.after),packet.after_ledger.sha256);assert.ok(prepared.canonical_after.equals(read(ledger)));
 assert.equal(prepared.inventory_reference_stage.metadata_entries,packet.metadata_entries);
 assert.equal(prepared.inventory_reference_stage.source_reference_updates,packet.metadata_entries);
 assert.equal(prepared.inventory_reference_stage.individual_decisions,0);prepared.assertCurrent();
 for(const path of [owner,inventory,ledger])assert.equal(prepared.bound.get(path),hash(read(path)));
 const epochStart=performance.now(),epoch=api.packedUpstreamLedgerEpoch({root,read:liveRead}),epochSeconds=(performance.now()-epochStart)/1000;
 assert.equal(epoch.individual_decisions_applied,line==='21.x'?88:13);
 assert.equal(epoch.inventory_reference_metadata_applied,true);assert.equal(epoch.inventory_reference_metadata_entries,packet.metadata_entries);
 assert.deepEqual(epoch.projected_metadata_paths,[ledger]);assert.equal(epoch.current_native_packed_or_floor_or_g11_credit,false);
 const context=inventoryReferenceOwnerContext({root,read:liveRead});const raw=api.packedUpstreamLedgerRawRead({root,read:epoch.read});assert.equal(raw,liveRead);
 let publicCurrentPaths=0;
 for(const ref of context.bound){
  if(ref.path===ledger)continue;
  assert.ok(epoch.read(ref.path).equals(read(ref.path)),'historical bytes exposed through public read '+ref.path);
  assert.ok(epoch.raw(ref.path).equals(read(ref.path)));assert.ok(raw(ref.path).equals(read(ref.path)));publicCurrentPaths++;
 }
 assert.ok(!epoch.read(ledger).equals(read(ledger)));assert.ok(raw(ledger).equals(read(ledger)));
 let controls=0;
 const latePaths=[ledger,inventory,owner,'scripts/inventory-reference-owner.mjs','scripts/inventory-reference-proposal.mjs',
  'compatibility/rc/c04-inventory-owner-inputs.json','scripts/historical_inventory_rebinding.py','projects/ngx-material-legacy/legacy-autocomplete/autocomplete.spec.ts',
  '.github/workflows/ci.yml','scripts/helper_ci.py','tests/test_helper_ci.py'];
 if(line==='21.x')latePaths.push('scripts/upstream-dialog-title-admission.cjs','scripts/upstream-dialog-title-native-evidence.mjs');
 for(const path of latePaths){
  tamper=path;assert.throws(()=>epoch.assertCurrent(),undefined,'real late source '+path);controls++;tamper=null;
 }
 epoch.assertCurrent();prepared.assertCurrent();assert.ok(read(ledger).equals(canonicalBefore));
 console.log(JSON.stringify({schema_version:1,line,mode:'actual-composite-owner',prepare_seconds:Number(prepareSeconds.toFixed(3)),epoch_seconds:Number(epochSeconds.toFixed(3)),
  actual_prepare_and_epoch_called:true,source_admissions:epoch.individual_decisions_applied,metadata_entries:epoch.inventory_reference_metadata_entries,
  current_owner_inventory_and_ledger_bindings_verified:true,current_context_bound_sources:context.bound.length,
  fresh_current_workflow_tests:context.current_workflow_tests.tests_run,public_current_paths:publicCurrentPaths,public_historical_projection_paths:epoch.projected_metadata_paths,
  actual_epoch_late_controls_rejected:controls,canonical_ledger_unchanged_during_probe:true,
  current_native_packed_or_floor_or_g11_credit:false,full_retained_roster_executed:false,g11_claim:'not-passed'}));
}
