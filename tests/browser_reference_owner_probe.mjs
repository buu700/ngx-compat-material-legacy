/**
 * @license
 * Copyright Google LLC All Rights Reserved.
 * Copyright (c) 2026 Ryan Lester.
 * Use of this source code is governed by the MIT license in LICENSE.
 */
/** Exact source controls or one real composite owner run; no product/browser run. */
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {execFileSync} from 'node:child_process';
import {readFileSync,writeFileSync} from 'node:fs';
import {createRequire} from 'node:module';
import {dirname,join,resolve} from 'node:path';
import {fileURLToPath} from 'node:url';
import {browserOwnerSourceSubject} from '../scripts/browser-owner-source.mjs';
import {legacyRemovalOwnerSourceSubject} from '../scripts/legacy-removal-owner-source.mjs';
import {legacyRemovalOwnerContext} from '../scripts/legacy-removal-canonical-stage.mjs';
import {tableLocalCompilationOwnerContext} from '../scripts/table-local-compilation-canonical-stage.mjs';
import {inventoryReferenceOwnerContext} from '../scripts/inventory-reference-owner.mjs';
import {currentCanonicalTestFrame} from './current_sass_canonical_test_scope.mjs';
const root=resolve(dirname(fileURLToPath(import.meta.url)),'..'),disk=path=>readFileSync(join(root,path)),hash=raw=>createHash('sha256').update(raw).digest('hex');
const LEDGER='compatibility/f10/disposition-ledger/ledger.json',OWNER='scripts/packed-upstream-ledger-epoch.mjs';
const mode=process.argv[2];assert.ok(['--source','--runtime'].includes(mode));assert.ok(process.argv.length<=4);
const input=JSON.parse(disk('compatibility/rc/c04-browser-owner-inputs.json')),beforeLive=disk(LEDGER),ts=createRequire(import.meta.url)('typescript');
let tamper=null;const read=path=>{const raw=disk(path);return path===tamper?Buffer.concat([raw,Buffer.from(' ')]):raw;};
const original=path=>execFileSync('git',['--no-replace-objects','show',input.source_parent+':'+path],{cwd:root,maxBuffer:8*1024*1024});
// These externally constructed contexts stay on the actual physical source lane.
const currentFrame=currentCanonicalTestFrame({root,read});
const legacyTools=legacyRemovalOwnerSourceSubject({root,read}),table=tableLocalCompilationOwnerContext({root,read}),legacy=legacyRemovalOwnerContext({root,read});
const stageRead=read;
// Retain the old caller assertions as authenticated program DATA; never execute it.
const historicalEnv={...process.env,GIT_NO_LAZY_FETCH:'1',GIT_NO_REPLACE_OBJECTS:'1'};
for(const key of ['GIT_DIR','GIT_WORK_TREE','GIT_INDEX_FILE','GIT_COMMON_DIR','GIT_OBJECT_DIRECTORY','GIT_ALTERNATE_OBJECT_DIRECTORIES'])delete historicalEnv[key];
const historicalProbe=execFileSync('git',['--no-replace-objects','-c','gc.auto=0','-c','maintenance.auto=0','show','d8ab97315b6c77b83f42c2bebcf63b2984fff255:tests/browser_reference_owner_probe.mjs'],{cwd:root,env:historicalEnv,maxBuffer:1024*1024});
assert.equal(hash(historicalProbe),'4f5d024bfd072129ec819374131795fb3d77e3e6e419d5d1617eade28ff25463');assert.equal(historicalProbe.length,13406);
for(const statement of ['assert.equal(unknown.applied,false);','assert.equal(unknown.browser.applied,false);','assert.ok(unknown.metadataRead(LEDGER).equals(unknownRead(LEDGER)));','assert.equal(context.browser.applied,true);','assert.ok(prepared.canonical_after.equals(disk(LEDGER)));'])assert.equal(historicalProbe.toString().split(statement).length,2);
if(mode==='--source'){
 const ownerBefore={path:OWNER,sha256:hash(original(OWNER)),bytes:original(OWNER).length};
 assert.ok(original(OWNER).equals(legacyTools.comparisonBytes(ownerBefore)),'public owner before-image changed');
 assert.equal(hash(disk(OWNER)),legacyTools.qualifyReference(ownerBefore).sha256);
 const parse=(path,raw)=>{const sf=ts.createSourceFile(path,raw.toString(),ts.ScriptTarget.Latest,true,ts.ScriptKind.JS);assert.equal(sf.parseDiagnostics.length,0);return sf;};
 const calls=sf=>{const found=new Map();function visit(node){if(ts.isCallExpression(node)&&ts.isPropertyAccessExpression(node.expression)&&node.expression.expression.getText(sf)==='assert'){
  let key=node.getText(sf);
  key=key.replace('tools.comparisonBytes(row.after)','member(row.after)');
  key=key.replace('legacyTools.comparisonBytes(row.after)','member(row.after)');
  key=key.replace('legacyTools.comparisonBytes(packet.after_owner).toString()','owner.toString()');
  key=key.replace('legacyTools.qualifyReference(packet.after_owner).sha256','packet.after_owner.sha256');
  key=key.replace('assert.equal(hash(prepared.checker_reference_stage.after),input.after_ledger.sha256)','assert.equal(hash(prepared.canonical_after),input.after_ledger.sha256)');
  key=key.replace('assert.equal(context.checker.applied||context.browser.applied,true)','assert.equal(context.checker.applied,true)');
  key=key.replace('stageRead(LEDGER).equals(subject.before)?','beforeLive.equals(subject.before)?');
  found.set(key,(found.get(key)??0)+1);
 }ts.forEachChild(node,visit);}visit(sf);return found;};
 const preservation=[];
 for(const row of input.code_transitions){
  if(row.after.path.endsWith('.py'))continue;
  const before=parse('old-data.mjs',original(row.before.path)),after=parse(row.after.path,disk(row.after.path)),old=calls(before),current=calls(after);let count=0;
  for(const[key,n]of old){assert.ok((current.get(key)??0)>=n,'old assertion removed '+row.after.path+' '+key);count+=n;}
  const functions=sf=>new Map(sf.statements.filter(ts.isFunctionDeclaration).map(node=>[node.name.text,node.getText(sf)])),a=functions(before),b=functions(after);
  for(const name of a.keys())assert.ok(b.has(name),'missing old function '+name);
  const unchanged=[...a.keys()].filter(name=>a.get(name)===b.get(name));
  const pure=row.after.path.endsWith('browser-reference-proposal.mjs')?['deriveBrowserReferenceMetadata','prepareBrowserReferenceMetadata']:row.after.path.endsWith('inventory-reference-owner.mjs')?['verifyCurrentWorkflow','titleMeasurementForHistoricalComparison','titleMeasurementSourceReferences']:row.after.path.endsWith('checker-owner-source.mjs')?['readCheckerOwnerMember','original']:[];
  for(const name of pure)assert.ok(unchanged.includes(name),'changed preserved function '+name);
  preservation.push({path:row.after.path,old_assertions_preserved:count,unchanged_original_functions:unchanged});
 }
 assert.equal(preservation.length,6);
 const tools=browserOwnerSourceSubject({root,read}),context=inventoryReferenceOwnerContext({root,read:stageRead});
 assert.ok(context.browser.before.equals(context.checker.after));assert.equal(hash(context.browser.after),input.after_ledger.sha256);
 assert.equal(context.browser.applied,stageRead(LEDGER).equals(context.browser.after));assert.equal(context.browser.canonical_frame_admission_granted,false);
 let cold=0,late=0;
 for(const ref of tools.bound){tamper=ref.path;assert.throws(()=>browserOwnerSourceSubject({root,read}),undefined,'cold '+ref.path);cold++;tamper=null;}
 for(const ref of context.bound){tamper=ref.path;assert.throws(()=>context.assertCurrent(),undefined,'late '+ref.path);late++;tamper=null;}
 context.assertCurrent();
 const unknownRead=path=>path===LEDGER?Buffer.concat([disk(path),Buffer.from(' ')]):disk(path);
 // The current strict physical source gate rejects this callback outright.
 assert.throws(()=>inventoryReferenceOwnerContext({root,read:unknownRead}),error=>error?.code==='ERR_ASSERTION'&&error.message.includes('nonphysical base-class frame input '+LEDGER));
 const {packedUpstreamLedgerEpoch:rejectNonphysicalEpoch}=await import('../scripts/packed-upstream-ledger-epoch.mjs');
 assert.throws(()=>rejectNonphysicalEpoch({root,read:unknownRead}),error=>error?.code==='ERR_ASSERTION'&&error.message.includes('nonphysical canonical input '+LEDGER));
 context.bound.length=0;context.before.fill(0);context.after.fill(0);context.browser.bound.length=0;context.browser.before.fill(0);context.browser.after.fill(0);context.assertCurrent();
 context.assertCurrent();legacy.assertCurrent();table.assertCurrent();currentFrame.assertCurrent();assert.ok(disk(LEDGER).equals(beforeLive));
 const report={schema_version:1,line:input.line,mode:'source-only',actual_owner_byte_identical:false,before_owner_byte_identical:true,current_owner_successor_authenticated:true,code_transitions:8,source_preservation:preservation,cold_current_tool_mutants_rejected:cold,late_all_source_mutants_rejected:late,unknown_frame_not_translated:true,current_nonphysical_callback_rejected:true,current_nonphysical_callbacks_rejected:2,historical_unknown_passthrough_assertions_authenticated_as_DATA:true,source_context_grants_no_canonical_admission:true,public_snapshots_do_not_change_private_guards:true,canonical_ledger_unchanged:true,actual_complete_owner_or_retained_roster_executed:false,current_native_packed_or_floor_or_g11_credit:false,g11_claim:'not-passed'};
 if(process.argv[3])writeFileSync(process.argv[3],JSON.stringify(report,null,2)+'\n',{flag:'wx'});console.log(JSON.stringify(report));
}else{
 const api=await import('../scripts/packed-upstream-ledger-epoch.mjs');process.stderr.write('complete owner prepare started\n');const start=performance.now(),prepared=api.preparePackedUpstreamLedger({root,read}),prepareSeconds=(performance.now()-start)/1000;
 assert.equal(hash(prepared.browser_reference_stage.after),input.after_ledger.sha256);
 const baseStage=prepared.base_class_removal_stage,tableStage=prepared.table_local_compilation_stage,legacyStage=prepared.legacy_removal_stage,browserStage=prepared.browser_reference_stage;
 assert.ok(baseStage.before.equals(tableStage.after));assert.ok(tableStage.before.equals(legacyStage.after));assert.ok(legacyStage.before.equals(browserStage.after));
 assert.ok(prepared.canonical_after.equals(baseStage.after));
 assert.equal(baseStage.physically_applied,currentFrame.base_class_decisions===1);
 assert.ok((baseStage.physically_applied?baseStage.after:baseStage.before).equals(disk(LEDGER)));
 assert.ok(prepared.legacy_removal_stage.after.equals(legacy.after));assert.equal(prepared.legacy_removal_stage.individual_decisions,1);
 assert.equal(hash(prepared.checker_reference_stage.after),input.before_ledger.sha256);assert.equal(hash(prepared.browser_reference_stage.before),input.before_ledger.sha256);assert.equal(hash(prepared.browser_reference_stage.after),input.after_ledger.sha256);
 assert.equal(prepared.browser_reference_stage.metadata_entries,input.line==='main'?18:16);assert.equal(prepared.browser_reference_stage.selected_entries,input.line==='main'?9:8);assert.equal(prepared.browser_reference_stage.individual_decisions,0);prepared.assertCurrent();
 process.stderr.write('complete owner prepare passed;epoch started\n');
 const started=performance.now(),epoch=api.packedUpstreamLedgerEpoch({root,read}),epochSeconds=(performance.now()-started)/1000;
 assert.equal(epoch.individual_decisions_applied,currentFrame.individual_source_reviews);assert.equal(epoch.base_class_removal_source_decisions_applied,currentFrame.base_class_decisions);assert.equal(epoch.individual_decisions_applied-epoch.legacy_removal_source_decisions_applied-epoch.table_local_compilation_source_decisions_applied-epoch.base_class_removal_source_decisions_applied,input.line==='21.x'?88:13);assert.equal(epoch.table_local_compilation_source_decisions_applied,1);assert.ok(prepared.table_local_compilation_stage.after.equals(table.after));assert.equal(epoch.legacy_removal_source_decisions_applied,1);assert.equal(epoch.inventory_reference_metadata_applied,true);assert.deepEqual(epoch.projected_metadata_paths,[LEDGER]);assert.equal(epoch.current_native_packed_or_floor_or_g11_credit,false);
 process.stderr.write('complete owner epoch passed;public routes and late controls started\n');
 const context=inventoryReferenceOwnerContext({root,read});assert.equal(context.browser.applied,false);assert.ok(browserStage.before.equals(context.browser.before));assert.ok(browserStage.after.equals(context.browser.after));const raw=api.packedUpstreamLedgerRawRead({root,read:epoch.read});assert.equal(raw,read);
 let paths=0;for(const ref of context.bound){if(ref.path===LEDGER)continue;assert.ok(epoch.read(ref.path).equals(disk(ref.path)),'public read hid current '+ref.path);assert.ok(epoch.raw(ref.path).equals(disk(ref.path)));assert.ok(raw(ref.path).equals(disk(ref.path)));paths++;}
 for(const path of [OWNER,LEDGER,'scripts/browser-owner-source.mjs','scripts/browser-reference-owner.mjs','scripts/browser-reference-source.mjs','scripts/browser-reference-proposal.mjs','scripts/checker-owner-source.mjs','scripts/inventory-reference-owner.mjs'])assert.equal(prepared.bound.get(path),hash(disk(path)));
 assert.ok(!epoch.read(LEDGER).equals(disk(LEDGER)));assert.ok(raw(LEDGER).equals(disk(LEDGER)));
 let controls=0;for(const path of [LEDGER,OWNER,'scripts/browser-owner-source.mjs','scripts/browser-reference-owner.mjs','scripts/browser-reference-source.mjs','scripts/browser-reference-proposal.mjs','scripts/checker-owner-source.mjs','scripts/inventory-reference-owner.mjs','compatibility/rc/c04-browser-owner-inputs.json','compatibility/rc/c04-browser-reference-proposal.json','scripts/check-upstream-audit-disposition.mjs','testing/legacy-runner/historical-inventory.json']){
  tamper=path;assert.throws(()=>epoch.assertCurrent(),undefined,'real late '+path);controls++;tamper=null;
 }
 const priorControls=controls;assert.equal(priorControls,12);
 for(const path of ['scripts/upstream-source-contract-registry.mjs','scripts/legacy-removal-canonical-stage.mjs','scripts/legacy-removal-owner-source.mjs','scripts/upstream-legacy-removal-source.mjs','scripts/upstream-legacy-removal-admission.cjs','compatibility/rc/21x-legacy-removal-admission-original-complete.diff','compatibility/rc/21x-legacy-removal-admission-owner-inputs.json','compatibility/rc/21x-legacy-removal-source-originals.json.gz']){tamper=path;assert.throws(()=>epoch.assertCurrent(),undefined,'new real late '+path);controls++;tamper=null;}
 const priorTableControls=controls;assert.equal(priorTableControls,20);
 for(const path of ['scripts/table-local-compilation-canonical-stage.mjs','scripts/table-local-compilation-owner-source.mjs','scripts/upstream-table-local-compilation-admission.cjs','compatibility/rc/21x-table-local-compilation-admission-owner-inputs.json','compatibility/rc/21x-table-local-compilation-source-compiler.json','compatibility/rc/21x-table-local-compilation-admission-source-contract-proposal-qualification.json']){tamper=path;assert.throws(()=>epoch.assertCurrent(),undefined,'table real late '+path);controls++;tamper=null;}
 epoch.assertCurrent();prepared.assertCurrent();context.assertCurrent();legacy.assertCurrent();table.assertCurrent();currentFrame.assertCurrent();assert.ok(disk(LEDGER).equals(beforeLive));
 const report={schema_version:1,line:input.line,mode:'actual-composite-owner',actual_prepare_and_epoch_called:true,prepare_seconds:Number(prepareSeconds.toFixed(3)),epoch_seconds:Number(epochSeconds.toFixed(3)),source_admissions:epoch.individual_decisions_applied,preserved_source_admissions:epoch.individual_decisions_applied-epoch.legacy_removal_source_decisions_applied-epoch.table_local_compilation_source_decisions_applied-epoch.base_class_removal_source_decisions_applied,base_class_removal_source_admissions:epoch.base_class_removal_source_decisions_applied,external_browser_context_physically_applied:context.browser.applied,historical_browser_stage_relation_verified:true,table_local_compilation_source_admissions:epoch.table_local_compilation_source_decisions_applied,legacy_removal_source_admissions:epoch.legacy_removal_source_decisions_applied,browser_metadata_entries:prepared.browser_reference_stage.metadata_entries,selected_entries:prepared.browser_reference_stage.selected_entries,preserved_checker_metadata_entries:prepared.checker_reference_stage.metadata_entries,preserved_inventory_metadata_entries:prepared.inventory_reference_stage.metadata_entries,current_context_bound_sources:context.bound.length,public_current_paths:paths,public_historical_projection_paths:epoch.projected_metadata_paths,actual_epoch_late_controls_rejected:controls,table_epoch_late_controls_rejected:controls-priorTableControls,preserved_legacy_epoch_late_controls_rejected:priorTableControls,preserved_epoch_late_controls_rejected:priorControls,canonical_ledger_unchanged_during_probe:true,current_native_packed_or_floor_or_g11_credit:false,full_retained_roster_executed:false,g11_claim:'not-passed'};
 if(process.argv[3])writeFileSync(process.argv[3],JSON.stringify(report,null,2)+'\n',{flag:'wx'});console.log(JSON.stringify(report));
}
