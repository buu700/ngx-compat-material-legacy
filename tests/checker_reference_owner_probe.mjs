/**
 * @license
 * Copyright Google LLC All Rights Reserved.
 * Copyright (c) 2026 Ryan Lester.
 * Use of this source code is governed by the MIT license in LICENSE.
 */
/** Source-only controls or one real prepare+epoch invocation;no product run. */
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {execFileSync} from 'node:child_process';
import {readFileSync,writeFileSync} from 'node:fs';
import {createRequire} from 'node:module';
import {dirname,join,resolve} from 'node:path';
import {fileURLToPath} from 'node:url';
import {checkerOwnerSourceSubject} from '../scripts/checker-owner-source.mjs';
import {inventoryReferenceOwnerContext} from '../scripts/inventory-reference-owner.mjs';
const root=resolve(dirname(fileURLToPath(import.meta.url)),'..'),disk=path=>readFileSync(join(root,path));
const LEDGER='compatibility/f10/disposition-ledger/ledger.json',OWNER='scripts/packed-upstream-ledger-epoch.mjs',hash=raw=>createHash('sha256').update(raw).digest('hex');
const mode=process.argv[2];assert.ok(['--source','--runtime'].includes(mode));assert.ok(process.argv.length<=4);
const input=JSON.parse(disk('compatibility/rc/c04-checker-owner-inputs.json')),beforeLive=disk(LEDGER),ts=createRequire(import.meta.url)('typescript');
const getOriginal=path=>execFileSync('git',['--no-replace-objects','show',input.source_parent+':'+path],{cwd:root,maxBuffer:8*1024*1024});
const parse=(path,raw)=>{const sf=ts.createSourceFile(path,raw.toString(),ts.ScriptTarget.Latest,true,ts.ScriptKind.JS);assert.equal(sf.parseDiagnostics.length,0);return sf;};
const calls=node=>{const counts=new Map();const visit=child=>{if(ts.isCallExpression(child)&&ts.isPropertyAccessExpression(child.expression)&&ts.isIdentifier(child.expression.expression)&&child.expression.expression.text==='assert'){let key=child.getText();if(child.expression.name.text==='rejects'&&ts.isCallExpression(child.arguments[0])&&ts.isIdentifier(child.arguments[0].expression)&&child.arguments[0].expression.text==='inspect')key=key.replace('assert.rejects(inspect(', 'assert.rejects(inspectCheckerSource(');counts.set(key,(counts.get(key)??0)+1);}ts.forEachChild(child,visit);};visit(node);return counts;};
let tamper=null;const read=path=>{const raw=disk(path);return path===tamper?Buffer.concat([raw,Buffer.from(' ')]):raw;};
if(mode==='--source'){
 const owner=getOriginal(OWNER);assert.ok(owner.equals(disk(OWNER)),'actual public owner code changed');
 const ownerAst=parse(OWNER,owner),sourcePreservation=[];
 for(const path of ['scripts/inventory-reference-owner.mjs','scripts/checker-reference-proposal.mjs','tests/checker_reference_source_probe.mjs']){
  const before=parse('before.mjs',getOriginal(path)),after=parse('after.mjs',disk(path));
  const oldFns=before.statements.filter(ts.isFunctionDeclaration),newFns=after.statements.filter(ts.isFunctionDeclaration);
  const oldCounts=calls(before),newCounts=calls(after);let count=0;
  for(const[key,n]of oldCounts){assert.ok((newCounts.get(key)??0)>=n,'old assertion removed '+path+' '+key);count+=n;}
  const unchanged=[];
  for(const old of oldFns){const current=newFns.find(node=>node.name?.text===old.name?.text);assert.ok(current,'missing original function '+path+' '+old.name?.text);
   if(current.getText(after)===old.getText(before))unchanged.push(old.name.text);
  }
  if(path.endsWith('checker-reference-proposal.mjs'))for(const name of ['deriveCheckerReferenceMetadata','prepareCheckerReferenceMetadata'])assert.ok(unchanged.includes(name));
  if(path.endsWith('inventory-reference-owner.mjs'))for(const name of ['verifyCurrentWorkflow','titleMeasurementForHistoricalComparison','titleMeasurementSourceReferences'])assert.ok(unchanged.includes(name));
  sourcePreservation.push({path,old_assertions_preserved:count,unchanged_original_functions:unchanged});
 }
 const context=inventoryReferenceOwnerContext({root,read});assert.ok(context.checker.before.equals(context.after));
 assert.equal(hash(context.checker.after),input.after_ledger.sha256);assert.equal(context.checker.applied,beforeLive.equals(context.checker.after));
 assert.equal(context.checker.canonical_frame_admission_granted,false);assert.equal(context.current_native_packed_or_floor_or_g11_credit,false);
 const tools=checkerOwnerSourceSubject({root,read});let cold=0,late=0;
 for(const ref of context.bound){tamper=ref.path;assert.throws(()=>context.assertCurrent(),undefined,'late '+ref.path);late++;tamper=null;}
 for(const ref of tools.bound){tamper=ref.path;assert.throws(()=>inventoryReferenceOwnerContext({root,read}),undefined,'cold '+ref.path);cold++;tamper=null;}
 context.assertCurrent();const unknownRead=path=>path===LEDGER?Buffer.concat([disk(path),Buffer.from(' ')]):disk(path);
 const unknown=inventoryReferenceOwnerContext({root,read:unknownRead});assert.equal(unknown.applied,false);assert.equal(unknown.checker.applied,false);assert.ok(unknown.metadataRead(LEDGER).equals(unknownRead(LEDGER)));
 const source=await import('./checker_reference_source_probe.mjs');
 if(hash(beforeLive)===input.before_ledger.sha256){const strict=await source.inspectCheckerSource();assert.equal(strict.report.canonical_frame_admission_granted,false);}
 else await assert.rejects(source.inspectCheckerSource(),undefined,'strict original source API accepts no new terminal image');
 context.bound.length=0;context.before.fill(0);context.after.fill(0);context.checker.bound.length=0;context.checker.before.fill(0);context.checker.after.fill(0);context.assertCurrent();
 assert.ok(disk(LEDGER).equals(beforeLive));
 const report={schema_version:1,line:input.line,mode:'source-only',actual_owner_byte_identical:true,original_owner_top_level_statements:ownerAst.statements.length,
  source_preservation:sourcePreservation,cold_current_tool_mutants_rejected:cold,late_all_source_mutants_rejected:late,
  unknown_frame_not_translated:true,source_context_grants_no_canonical_admission:true,strict_original_source_API_retained:true,
  current_native_packed_or_floor_or_g11_credit:false,canonical_ledger_unchanged:true,actual_complete_owner_or_retained_roster_executed:false,g11_claim:'not-passed'};
 if(process.argv[3])writeFileSync(process.argv[3],JSON.stringify(report,null,2)+'\n',{flag:'wx'});console.log(JSON.stringify(report));
}else{
 const api=await import('../scripts/packed-upstream-ledger-epoch.mjs'),started=performance.now();
 const prepared=api.preparePackedUpstreamLedger({root,read}),prepareSeconds=(performance.now()-started)/1000;
 assert.equal(hash(prepared.canonical_after),input.after_ledger.sha256);assert.ok(prepared.canonical_after.equals(disk(LEDGER)));
 assert.equal(hash(prepared.inventory_reference_stage.after),input.before_ledger.sha256);
 assert.equal(hash(prepared.checker_reference_stage.before),input.before_ledger.sha256);assert.equal(hash(prepared.checker_reference_stage.after),input.after_ledger.sha256);
 assert.equal(prepared.checker_reference_stage.metadata_entries,input.line==='21.x'?5:13);assert.equal(prepared.checker_reference_stage.individual_decisions,0);prepared.assertCurrent();
 const epochStart=performance.now(),epoch=api.packedUpstreamLedgerEpoch({root,read}),epochSeconds=(performance.now()-epochStart)/1000;
 assert.equal(epoch.individual_decisions_applied,input.line==='21.x'?88:13);assert.equal(epoch.inventory_reference_metadata_applied,true);
 assert.deepEqual(epoch.projected_metadata_paths,[LEDGER]);assert.equal(epoch.current_native_packed_or_floor_or_g11_credit,false);
 const context=inventoryReferenceOwnerContext({root,read});assert.equal(context.checker.applied,true);const raw=api.packedUpstreamLedgerRawRead({root,read:epoch.read});assert.equal(raw,read);
 let paths=0;for(const ref of context.bound){if(ref.path===LEDGER)continue;
  assert.ok(epoch.read(ref.path).equals(disk(ref.path)),'public read hid current '+ref.path);assert.ok(epoch.raw(ref.path).equals(disk(ref.path)));assert.ok(raw(ref.path).equals(disk(ref.path)));paths++;
 }
 for(const path of [OWNER,LEDGER,'scripts/checker-reference-proposal.mjs','scripts/inventory-reference-owner.mjs','scripts/check-upstream-audit-disposition.mjs','tests/checker_reference_source_probe.mjs'])assert.equal(prepared.bound.get(path),hash(disk(path)));
 assert.ok(!epoch.read(LEDGER).equals(disk(LEDGER)));assert.ok(raw(LEDGER).equals(disk(LEDGER)));
 let controls=0;for(const path of [LEDGER,OWNER,'scripts/checker-owner-source.mjs','scripts/checker-reference-owner.mjs','scripts/inventory-reference-owner.mjs','scripts/checker-reference-proposal.mjs','tests/checker_reference_source_probe.mjs','tests/test_checker_reference_source.py','compatibility/rc/c04-checker-owner-inputs.json','scripts/check-upstream-audit-disposition.mjs','testing/legacy-runner/historical-inventory.json']){
  tamper=path;assert.throws(()=>epoch.assertCurrent(),undefined,'real late '+path);controls++;tamper=null;
 }
 epoch.assertCurrent();prepared.assertCurrent();assert.ok(disk(LEDGER).equals(beforeLive));
 const report={schema_version:1,line:input.line,mode:'actual-composite-owner',actual_prepare_and_epoch_called:true,
  prepare_seconds:Number(prepareSeconds.toFixed(3)),epoch_seconds:Number(epochSeconds.toFixed(3)),source_admissions:epoch.individual_decisions_applied,
  checker_metadata_entries:prepared.checker_reference_stage.metadata_entries,preserved_inventory_metadata_entries:prepared.inventory_reference_stage.metadata_entries,
  current_context_bound_sources:context.bound.length,public_current_paths:paths,public_historical_projection_paths:epoch.projected_metadata_paths,actual_epoch_late_controls_rejected:controls,
  canonical_ledger_unchanged_during_probe:true,current_native_packed_or_floor_or_g11_credit:false,full_retained_roster_executed:false,g11_claim:'not-passed'};
 if(process.argv[3])writeFileSync(process.argv[3],JSON.stringify(report,null,2)+'\n',{flag:'wx'});console.log(JSON.stringify(report));
}
