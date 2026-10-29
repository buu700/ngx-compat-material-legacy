/**
 * @license
 * Copyright Google LLC All Rights Reserved.
 * Copyright (c) 2026 Ryan Lester.
 * Use of this source code is governed by the MIT license in LICENSE.
 */
/** Exact tool/body/assertion preservation and finite cold/late source controls. */
import assert from 'node:assert/strict';
import {readFileSync,writeFileSync} from 'node:fs';
import {createHash} from 'node:crypto';
import {execFileSync} from 'node:child_process';
import ts from 'typescript';
import {tableLocalCompilationOwnerSourceSubject} from '../../scripts/table-local-compilation-owner-source.mjs';
import {tableLocalCompilationOwnerContext} from '../../scripts/table-local-compilation-canonical-stage.mjs';
const root=process.cwd(),prefix='compatibility/rc/21x-table-local-compilation-admission-',hash=raw=>createHash('sha256').update(raw).digest('hex'),disk=path=>readFileSync(root+'/'+path);
const beforeLedger=disk('compatibility/f10/disposition-ledger/ledger.json'),beforeRegistry=disk('scripts/upstream-source-contract-registry.mjs');
let changed=null;const read=path=>{const raw=disk(path);return changed===path?Buffer.concat([raw,Buffer.from('\n')]):raw;};
const tools=tableLocalCompilationOwnerSourceSubject({root,read}),context=tableLocalCompilationOwnerContext({root,read}),packet=tools.packet;
const env={...process.env,GIT_NO_LAZY_FETCH:'1',GIT_NO_REPLACE_OBJECTS:'1'};for(const name of ['GIT_DIR','GIT_WORK_TREE','GIT_INDEX_FILE','GIT_COMMON_DIR','GIT_OBJECT_DIRECTORY','GIT_ALTERNATE_OBJECT_DIRECTORIES'])delete env[name];
const original=path=>execFileSync('git',['--no-replace-objects','-c','gc.auto=0','show',packet.source_parent+':'+path],{cwd:root,env,maxBuffer:16*1024*1024});
const renames={preparePackedUpstreamLedger:'prepareBeforeTableLocalCompilationLedger',packedUpstreamLedgerEpoch:'epochBeforeTableLocalCompilationLedger',qualifyCanonicalToolReference:'qualifyBeforeTableLocalCompilationToolReference'};
const parse=(path,raw)=>{const sf=ts.createSourceFile(path,raw.toString(),ts.ScriptTarget.Latest,true,ts.ScriptKind.JS);assert.equal(sf.parseDiagnostics.length,0);return sf;};
const functions=sf=>new Map(sf.statements.filter(ts.isFunctionDeclaration).map(node=>[node.name.text,node]));
const adaptations=[
 ["assert.equal(hash(comparison),ref.sha256,'changed legacy owner code '+ref.path)","assert.equal(hash(raw),ref.sha256,'changed legacy owner code '+ref.path)"],
 ['assert.equal(comparison.length,ref.bytes)','assert.equal(raw.length,ref.bytes)'],
 ["assert.ok(physical.equals(readEvidenceMember(root,path)),'nonphysical registry comparison source')","assert.ok(raw.equals(readEvidenceMember(root,path)),'nonphysical registry comparison source')"],
 ["assert.ok(comparisonRegistry.equals(registryBefore)||comparisonRegistry.equals(registryAfter),'unqualified legacy source registry')","assert.ok(actualRegistry.equals(registryBefore)||actualRegistry.equals(registryAfter),'unqualified legacy source registry')"],
 ['assert.equal(added.length,expectedAdded.length)','assert.equal(added.length,hash(currentRegistry)===hash(beforeRegistry)?0:1)'],
 ["assert.deepEqual(added,expectedAdded)","assert.deepEqual(added,[{sha:'f7e3ae3bd1b86d5987df57bb06d350001c592931',proof_kind:'individual-historical-legacy-removal-source-exclusion',scope_key:'legacy_removal_source_scope',module:'upstream-legacy-removal-admission.cjs'}])"],
 ['assert.ok(read(LEDGER).equals(currentLedger))','assert.ok(read(LEDGER).equals(physicalLedger))'],
 ['assert.ok(read(REGISTRY).equals(currentRegistry))','assert.ok(read(REGISTRY).equals(physicalRegistry))'],
 ['assert.equal(iterationTools.predecessorData(REGISTRY,read(REGISTRY)).equals(registryAfter),true)','assert.equal(read(REGISTRY).equals(registryAfter),true)'],
 ["assert.equal(sourceContractDefinitions.length-(sourceContractDefinitions.some(row=>row.sha==='3f35b12290ea4dbee4a9d82845c0964b2b4df50d')?1:0),68)",'assert.equal(sourceContractDefinitions.length,68)'],
 ["assert.equal(epoch.individual_decisions_applied-epoch.legacy_removal_source_decisions_applied-epoch.table_local_compilation_source_decisions_applied,input.line==='21.x'?88:13)","assert.equal(epoch.individual_decisions_applied-epoch.legacy_removal_source_decisions_applied,input.line==='21.x'?88:13)"],
];
const normalizedCalls=sf=>{const calls=new Map();function visit(node){if(ts.isCallExpression(node)&&ts.isPropertyAccessExpression(node.expression)&&node.expression.expression.getText(sf)==='assert'){
 let text=node.getText(sf);for(const[from,to]of adaptations)if(text===from)text=to;calls.set(text,(calls.get(text)??0)+1);
 }ts.forEachChild(node,visit);}visit(sf);return calls;};
const preservation=[];let oldAssertions=0;
for(const row of packet.code_transitions){
 const before=original(row.before.path);assert.equal(hash(before),row.before.sha256);assert.equal(hash(disk(row.after.path)),row.after.sha256);
 assert.deepEqual(tools.qualifyReference(row.before),row.after);assert.ok(tools.comparisonBytes(row.before).equals(before));assert.ok(tools.comparisonBytes(row.after).equals(disk(row.after.path)));assert.deepEqual(tools.predecessorReference(row.after),row.before);
 if(row.after.path.endsWith('.py'))continue;
 const a=parse('prior-data.mjs',before),b=parse(row.after.path,disk(row.after.path)),old=normalizedCalls(a),current=normalizedCalls(b);
 let kept=0;for(const[text,count]of old){assert.ok((current.get(text)??0)>=count,'lost original assertion '+row.after.path+' '+text);kept+=count;}
 const oldFns=functions(a),currentFns=functions(b);for(const name of oldFns.keys())assert.ok(currentFns.has(name),'lost original function '+name);
 const bodyIdentities=[];
 if(row.after.path==='scripts/packed-upstream-ledger-epoch.mjs')for(const[name,node]of oldFns){const current=currentFns.get(renames[name]??name);assert.ok(current);assert.equal(current.body.getText(b),node.body.getText(a),'changed original owner body '+name);bodyIdentities.push(name);}
 if(['scripts/legacy-removal-canonical-stage.mjs','scripts/table-local-compilation-canonical-stage.mjs'].includes(row.after.path))for(const[name,node]of oldFns)if(name.startsWith('apply')||name.endsWith('RegistrySuccessor')){assert.equal(currentFns.get(name).getText(b),node.getText(a),'changed strict pure stage '+name);bodyIdentities.push(name);}
 preservation.push({path:row.after.path,original_assertions_preserved:kept,original_functions_retained:oldFns.size,byte_identical_original_function_bodies:bodyIdentities});oldAssertions+=kept;
}
const faults=['scripts/table-local-compilation-owner-source.mjs','scripts/legacy-removal-owner-source.mjs','scripts/legacy-removal-canonical-stage.mjs','scripts/packed-upstream-ledger-epoch.mjs','scripts/table-local-compilation-canonical-stage.mjs',prefix+'owner-inputs.json',prefix+'source-contract-proposal-qualification.json','tests/checker_reference_source_probe.mjs','tests/browser_reference_owner_probe.mjs','tests/table_local_compilation_owner_source.py','projects/ngx-material-legacy/legacy-table/row.ts','node_modules/@angular/cdk/types/table.d.ts'];
let cold=0,late=0;for(const path of faults){changed=path;assert.throws(()=>tableLocalCompilationOwnerContext({root,read}),undefined,'cold '+path);cold++;assert.throws(()=>context.assertCurrent(),undefined,'late '+path);late++;changed=null;}
const ledger='compatibility/f10/disposition-ledger/ledger.json',unknownRead=path=>path===ledger?Buffer.concat([disk(path),Buffer.from('\n')]):disk(path),unknown=tableLocalCompilationOwnerContext({root,read:unknownRead});assert.equal(unknown.applied,false);assert.ok(unknown.metadataRead(ledger).equals(unknownRead(ledger)));
const first=packet.code_transitions[0];assert.throws(()=>tools.qualifyReference({...first.before,sha256:'0'.repeat(64)}));
const boundPaths=context.bound.length;tools.packet.code_transitions.length=0;context.bound.length=0;context.after.fill(0);tools.assertCurrent();context.assertCurrent();
assert.ok(disk(ledger).equals(beforeLedger));assert.ok(disk('scripts/upstream-source-contract-registry.mjs').equals(beforeRegistry));
const report={schema_version:1,result:'pass',line:'21.x',code_transitions:packet.code_transition_count,source_preservation:preservation,original_JS_assertions_preserved:oldAssertions,finite_JS_assertion_adaptations:adaptations,actual_source_scope_bound:context.source_facts,current_bound_paths:boundPaths,cold_source_faults_rejected:cold,late_source_faults_rejected:late,unknown_ledger_bytes_not_translated:true,public_copies_cannot_disable_private_guards:true,old_program_executed:false,canonical_ledger_unchanged:true,complete_prepare_or_epoch_executed:false,actual_native_packed_browser_floor_or_full_audit_qualified:false,g11_claim:'not-passed'};
assert.equal(process.argv.length,3);writeFileSync(process.argv[2],JSON.stringify(report,null,2)+'\n',{flag:'wx'});console.log(JSON.stringify({result:'pass',old_JS_assertions:oldAssertions,cold,late,code_transitions:packet.code_transition_count}));
