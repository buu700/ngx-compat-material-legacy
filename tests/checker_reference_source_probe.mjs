/**
 * @license
 * Copyright Google LLC All Rights Reserved.
 * Copyright (c) 2026 Ryan Lester.
 * Use of this source code is governed by the MIT license in LICENSE.
 */
/** Complete source transition proof only;never executes the historical checker. */
import assert from 'node:assert/strict';
import {checkerOwnerSourceSubject} from '../scripts/checker-owner-source.mjs';
import {createHash} from 'node:crypto';
import {execFileSync} from 'node:child_process';
import {readFileSync,writeFileSync,mkdtempSync,mkdirSync,symlinkSync,rmSync,lstatSync} from 'node:fs';
import {createRequire} from 'node:module';
import {tmpdir} from 'node:os';
import {dirname,join,resolve} from 'node:path';
import {fileURLToPath} from 'node:url';
import {runInNewContext} from 'node:vm';
const ROOT=resolve(dirname(fileURLToPath(import.meta.url)),'..'),SELF='tests/checker_reference_source_probe.mjs';
const PACKET='compatibility/rc/c04-checker-reference-source-inputs.json',LEDGER='compatibility/f10/disposition-ledger/ledger.json';
const CHECKER='scripts/check-upstream-audit-disposition.mjs';
const PINS={"main":"5ed5add16c5c6e547ec3005c6d3d4c627464ec6be2fb2512050354217fe962b5","21.x":"f3baffebad455da6add898ca103f2994b61a99c049099b4d23bbfe913334179d"};
const image=readFileSync(fileURLToPath(import.meta.url)),hash=raw=>createHash('sha256').update(raw).digest('hex');
const disk=path=>readFileSync(join(ROOT,path));
function original(parent,path){
 const env={...process.env,GIT_NO_LAZY_FETCH:'1',GIT_NO_REPLACE_OBJECTS:'1'};
 for(const key of ['GIT_DIR','GIT_WORK_TREE','GIT_INDEX_FILE','GIT_COMMON_DIR','GIT_OBJECT_DIRECTORY','GIT_ALTERNATE_OBJECT_DIRECTORIES'])delete env[key];
 return execFileSync('git',['--no-replace-objects','-c','gc.auto=0','-c','maintenance.auto=0','show',parent+':'+path],{cwd:ROOT,env,maxBuffer:8*1024*1024});
}
export async function inspectCheckerSourceMetadata({read=disk}={}){
 const version=JSON.parse(read('projects/ngx-material-legacy/package.json')).version,line=version.startsWith('21.')?'21.x':version.startsWith('22.')?'main':null;assert.ok(line);
 const tools=checkerOwnerSourceSubject({root:ROOT,read});
 const bound=new Map(tools.bound.map(ref=>[ref.path,{...ref}])),member=(path,digest,bytes)=>{
  if(digest!==undefined){const qualified=tools.qualifyReference({path,sha256:digest,...(bytes===undefined?{}:{bytes})});digest=qualified.sha256;bytes=qualified.bytes;}
  const raw=read(path);assert.ok(Buffer.isBuffer(raw));if(digest)assert.equal(hash(raw),digest,'changed source input '+path);if(bytes!==undefined)assert.equal(raw.length,bytes);
  bound.set(path,{path,sha256:hash(raw),bytes:raw.length});return raw;
 };
 const packet=JSON.parse(member(PACKET,PINS[line]));assert.equal(packet.line,line);assert.equal(packet.schema_version,1);
 for(const key of ['canonical_decisions_changed'])assert.equal(packet[key],0);
 for(const key of ['canonical_ledger_changed','root_checker_changed','old_checker_executed','actual_native_packed_browser_floor_or_full_audit_qualified'])assert.equal(packet[key],false);
 assert.equal(packet.g11_claim,'not-passed');member(SELF,hash(image));
 for(const ref of packet.source_members)member(ref.path,ref.sha256,ref.bytes);
 const current=member(CHECKER,packet.current_checker.sha256,packet.current_checker.bytes);
 const cohortRaw=original(packet.source_parent,LEDGER);assert.equal(hash(cohortRaw),packet.protected_ledger.sha256);assert.equal(cohortRaw.length,packet.protected_ledger.bytes);
 const cohort=JSON.parse(cohortRaw),ledgerRaw=member(LEDGER),ledger=JSON.parse(ledgerRaw);
 const assertCurrent=()=>{tools.assertCurrent();for(const ref of bound.values()){const raw=read(ref.path);assert.equal(hash(raw),ref.sha256,'late checker source input '+ref.path);assert.equal(raw.length,ref.bytes);assert.equal(hash(disk(ref.path)),ref.sha256,'late physical source '+ref.path);}};
 // Imported current code must be the physical source just authenticated above.
 for(const ref of bound.values())assert.equal(hash(disk(ref.path)),ref.sha256,'physical source differs '+ref.path);
 const old=original(packet.old_checker.commit,CHECKER);assert.equal(hash(old),packet.old_checker.sha256);assert.equal(old.length,packet.old_checker.bytes);
 const worksheet=original(packet.source_parent,packet.worksheet_at_source_parent.path);assert.equal(hash(worksheet),packet.worksheet_at_source_parent.sha256);
 const priorWorksheet=JSON.parse(worksheet);assert.deepEqual(packet.selected_references,priorWorksheet.selected_references);assert.deepEqual(packet.current_checker,priorWorksheet.current_checker);
 let expected=old.toString();
 for(const edit of packet.literal_edits){assert.equal(expected.split(edit.before).length,2,'ambiguous source edit');assert.ok(edit.decision.length>100);expected=expected.replace(edit.before,edit.after);}
 assert.equal(current.toString(),expected,'unreviewed checker source transition');
 assert.equal(hash(packet.complete_diff),packet.complete_diff_sha256);assert.equal(packet.hunk_reviews.length,line==='21.x'?7:6);
 assert.equal(packet.complete_diff.split(/(?=^@@ )/m).slice(1).join(''),packet.hunk_reviews.map(row=>row.text).join(''));
 for(const[index,row]of packet.hunk_reviews.entries()){assert.equal(row.index,index+1);assert.equal(hash(row.text),row.sha256);assert.equal(row.header,row.text.split('\n')[0]);assert.ok(row.decision.length>100);assert.equal(row.native_or_security_acceptance_qualified,false);}
 const ts=createRequire(import.meta.url)('typescript');assert.equal(ts.version,JSON.parse(read('package.json')).devDependencies.typescript);
 const parse=(name,raw)=>{const sf=ts.createSourceFile(name,raw.toString(),ts.ScriptTarget.Latest,true,ts.ScriptKind.JS);assert.equal(sf.parseDiagnostics.length,0);return sf;};
 const before=parse('old-data.mjs',old),after=parse('current.mjs',current);
 const functions=ast=>new Map(ast.statements.filter(ts.isFunctionDeclaration).map(node=>[node.name.text,node.getText(ast)]));
 const oldFns=functions(before),newFns=functions(after),changed=[];
 for(const[name,text]of oldFns){assert.ok(newFns.has(name));if(newFns.get(name)!==text)changed.push(name);}
 assert.deepEqual(changed,['evidenceClass','individualPatchBound']);assert.deepEqual([...newFns.keys()].filter(name=>!oldFns.has(name)),['readRegularRepoBytes']);
 const policies=ast=>ast.statements.filter(ts.isVariableStatement).flatMap(node=>node.declarationList.declarations).filter(node=>['ALLOWED_FINAL','PENDING','INHERITED','BEHAVIOR','REVIEW_DEPTHS'].includes(node.name.getText(ast))).map(node=>node.getText(ast));
 assert.equal(policies(before).length,5);assert.deepEqual(policies(before),policies(after));
 const kinds=['historical_behavior','progress_csp_behavior','media_matcher_behavior','form_field_hover_behavior','content_observer_behavior','ripple_replay_behavior'];
 const derived=cohort.entries.flatMap(entry=>kinds.flatMap(kind=>(entry.individual_proof?.[kind]?.source_members??[]).filter(ref=>ref.path===CHECKER&&ref.sha256===packet.old_checker.sha256).map(ref=>({sha:entry.sha,proof_kind:kind,reference:ref,current_raw:packet.current_checker,requires_separate_qualification:true}))));
 assert.equal(ledger.entries.length,1697);assert.equal(ledger.g11_claim,'not-passed');assert.deepEqual(derived,packet.selected_references);assert.equal(derived.length,line==='21.x'?5:13);
 const build=await import('../scripts/upstream-rules-js-build-admission.mjs'),sass=await import('../scripts/upstream-sass-inspection-admission.mjs');
 const predicates=[['requiresRulesJsBuild',build.requiresRulesJsBuild],['requiresSassInspectionScope',sass.requiresSassInspectionScope]];
 const positive=[];
 for(const sha of build.RULES_JS_BUILD_SHAS){assert.equal(build.requiresRulesJsBuild({sha}),true);positive.push('build:'+sha);}
 for(const sha of sass.SASS_INSPECTION_SHAS){assert.equal(sass.requiresSassInspectionScope({sha}),true);positive.push('sass:'+sha);}
 if(line==='21.x'){
  const legacy=await import('../scripts/upstream-legacy-sass-entrypoint-admission.mjs'),testing=await import('../scripts/upstream-testing-api-21x-admission.mjs');
  const registered=await import('../scripts/upstream-registered-source-review.mjs'),registry=await import('../scripts/upstream-source-contract-registry.mjs');
  predicates.push(['requiresLegacySassEntrypointScope',legacy.requiresLegacySassEntrypointScope],['requiresTestingApi21xEntry',entry=>testing.requiresTestingApi21xEntry(entry,line,read)],['requiresRegisteredSourceReview',entry=>registered.requiresRegisteredSourceReview(entry,entry?.individual_proof)]);
  assert.equal(legacy.requiresLegacySassEntrypointScope({sha:legacy.LEGACY_SASS_ENTRYPOINT_SHA}),true);positive.push('legacy:'+legacy.LEGACY_SASS_ENTRYPOINT_SHA);
  const program=parse('testing.mjs',read('scripts/upstream-testing-api-21x-admission.mjs'));
  const patch=program.statements.filter(ts.isVariableStatement).flatMap(node=>node.declarationList.declarations).find(node=>node.name.getText(program)==='patches');assert.ok(ts.isObjectLiteralExpression(patch.initializer));assert.equal(patch.initializer.properties.length,7);
  for(const property of patch.initializer.properties){const sha=property.name.text;assert.equal(testing.requiresTestingApi21xEntry({sha},line,read),true);positive.push('testing:'+sha);}
  const registryPath='scripts/upstream-source-contract-registry.mjs',beforeRegistry=original(packet.source_parent,registryPath),registryAst=parse('registry-data.mjs',beforeRegistry);
  const definition=registryAst.statements.filter(ts.isVariableStatement).flatMap(node=>node.declarationList.declarations).find(node=>node.name.getText(registryAst)==='sourceContractDefinitions');assert.ok(ts.isArrayLiteralExpression(definition.initializer));
  const beforeDefinitions=definition.initializer.elements.map(node=>{assert.ok(ts.isObjectLiteralExpression(node));return Object.fromEntries(node.properties.map(property=>{assert.ok(ts.isPropertyAssignment(property)&&ts.isStringLiteral(property.initializer));return [property.name.getText(registryAst),property.initializer.text];}));});
  assert.equal(beforeDefinitions.length,67);
  const added=registry.sourceContractDefinitions.filter(row=>!beforeDefinitions.some(prior=>prior.sha===row.sha));assert.deepEqual(registry.sourceContractDefinitions.filter(row=>!added.includes(row)),beforeDefinitions);
  const currentRegistry=read(registryPath),qualifiedRegistry=tools.qualifyReference({path:registryPath,sha256:hash(beforeRegistry),bytes:beforeRegistry.length});assert.equal(hash(currentRegistry),qualifiedRegistry.sha256);
  const expectedAdded=hash(currentRegistry)===hash(beforeRegistry)?[]:[{sha:'f7e3ae3bd1b86d5987df57bb06d350001c592931',proof_kind:'individual-historical-legacy-removal-source-exclusion',scope_key:'legacy_removal_source_scope',module:'upstream-legacy-removal-admission.cjs'}];
  if(registry.sourceContractDefinitions.some(row=>row.sha==='3f35b12290ea4dbee4a9d82845c0964b2b4df50d'))expectedAdded.push({sha:'3f35b12290ea4dbee4a9d82845c0964b2b4df50d',proof_kind:'individual-historical-table-local-compilation-source-review',scope_key:'table_local_compilation_source_scope',module:'upstream-table-local-compilation-admission.cjs'});
  if(registry.sourceContractDefinitions.some(row=>row.sha==='55f9618b687fc0da4743a3cf27e113ceb837e151'))expectedAdded.push({sha:'55f9618b687fc0da4743a3cf27e113ceb837e151',proof_kind:'individual-historical-base-class-removal-source-review',scope_key:'base_class_removal_source_scope',module:'upstream-base-class-removal-admission.cjs'});
  assert.equal(added.length,expectedAdded.length);if(added.length)assert.deepEqual(added,expectedAdded);
  for(const row of registry.sourceContractDefinitions){
   for(const entry of [{sha:row.sha},{sha:'0'.repeat(40),individual_proof:{proof_kind:row.proof_kind}},{sha:'0'.repeat(40),individual_proof:{[row.scope_key]:{}}}]){assert.equal(registered.requiresRegisteredSourceReview(entry),true);positive.push('registered:'+row.sha);}
  }
 }
 const exclusions=[];
 for(const ref of derived){const entry=ledger.entries.find(entry=>entry.sha===ref.sha),results={};
  for(const[name,predicate]of predicates){assert.equal(predicate(entry),false,'selected row enters new guard '+name+' '+entry.sha);results[name]=false;}
  exclusions.push({sha:entry.sha,native_kind:ref.proof_kind,final_disposition:entry.final_disposition,source_predicates:results});
 }
 for(const[,predicate]of predicates){assert.equal(predicate({sha:'0'.repeat(40)}),false);assert.equal(predicate(null),false);}
 const markers=[['rules_js_build_source_scope',build.requiresRulesJsBuild],['sass_inspection',sass.requiresSassInspectionScope]];
 if(line==='21.x'){
  const legacy=await import('../scripts/upstream-legacy-sass-entrypoint-admission.mjs'),testing=await import('../scripts/upstream-testing-api-21x-admission.mjs');
  markers.push(['legacy_sass_entrypoint_scope',legacy.requiresLegacySassEntrypointScope],['testing_api_21x',entry=>testing.requiresTestingApi21xEntry(entry,line,read)]);
 }
 for(const ref of derived)for(const[key,predicate]of markers){const entry=structuredClone(ledger.entries.find(entry=>entry.sha===ref.sha));entry.individual_proof[key]={};assert.equal(predicate(entry),true,'scope marker may not be ignored');positive.push('marker:'+ref.sha+':'+key);}
 // Execute only the exact current helper,with real filesystem calls and a
 // disposable root. No historical program or complete checker is evaluated.
 const fixture=mkdtempSync(join(tmpdir(),'ngx-current-checker-reader-'));let readerCases=0;
 try{
  writeFileSync(join(fixture,'value.txt'),'current bytes\n');mkdirSync(join(fixture,'folder'));writeFileSync(join(fixture,'folder','child.txt'),'nested\n');
  symlinkSync(join(fixture,'value.txt'),join(fixture,'link'));symlinkSync(join(fixture,'folder'),join(fixture,'linked-parent'));
  const reader=runInNewContext(newFns.get('readRegularRepoBytes')+'\nreadRegularRepoBytes;',{root:fixture,join,lstatSync,readFileSync});
  assert.equal(reader('value.txt').toString(),'current bytes\n');readerCases++;assert.equal(reader('folder/child.txt').toString(),'nested\n');readerCases++;
  for(const path of ['missing.txt','missing-parent/value']){assert.throws(()=>reader(path),error=>error.code==='ENOENT');readerCases++;}
  for(const path of ['',null,0,{},'../value.txt','/value.txt','./value.txt','folder/../value.txt','folder//child.txt','folder\\child.txt']){assert.throws(()=>reader(path),error=>error.message==='unsafe source member');readerCases++;}
  for(const path of ['link','linked-parent/child.txt']){assert.throws(()=>reader(path),error=>error.message==='symlink in source member');readerCases++;}
  assert.throws(()=>reader('folder'),error=>error.message==='source member is not a regular file');readerCases++;
 }finally{rmSync(fixture,{recursive:true,force:true});}
 assertCurrent();assert.ok(disk(LEDGER).equals(ledgerRaw));
 return {bound:structuredClone([...bound.values()]),assertCurrent,protected_canonical_before:{...packet.protected_ledger},report:{schema_version:1,line,result:'pass',canonical_frame_admission_granted:false,current_ledger_sha256:hash(ledgerRaw),current_ledger_bytes:ledgerRaw.length,analysis_node:process.version,analysis_typescript:ts.version,old_checker_sha256:packet.old_checker.sha256,current_checker_sha256:packet.current_checker.sha256,
  complete_hunks:packet.hunk_reviews.length,original_functions_preserved:oldFns.size-2,changed_original_functions:changed,new_functions:['readRegularRepoBytes'],structural_policy_sets_preserved:5,
  selected_references:derived.length,per_row_guard_exclusions:exclusions,actual_guard_exclusion_checks:derived.length*predicates.length,positive_scope_routing_checks:positive.length,actual_current_reader_cases:readerCases,
  fixture_roots_removed:true,canonical_ledger_unchanged:true,root_checker_unchanged:true,old_checker_executed:false,canonical_decisions_changed:0,
  actual_complete_checker_admission_or_native_packed_browser_floor_or_full_audit_qualified:false,g11_claim:'not-passed'}};
}
// Preserve the original strict before-image source API. It is never used as
// the canonical owner's complete historical-frame admission gate.
export async function inspectCheckerSource({read=disk}={}){
 const source=await inspectCheckerSourceMetadata({read});
 const raw=read(LEDGER);assert.equal(hash(raw),source.protected_canonical_before.sha256,'unregistered strict source image');
 source.assertCurrent();return source;
}
if(process.argv[1]&&resolve(process.argv[1])===fileURLToPath(import.meta.url)){
 const args=process.argv.slice(2);let metadata=false,sourceOnly=false;
 if(args[0]==='--metadata'){metadata=true;args.shift();}
 else if(args[0]==='--source-metadata'){metadata=true;sourceOnly=true;args.shift();}
 assert.ok(args.length<=1,'expected at most one report output path');
 if(args[0]?.startsWith('-'))assert.fail('unknown option '+args[0]);
 const inspect=metadata?inspectCheckerSourceMetadata:inspectCheckerSource;
 const before=disk(LEDGER);let tamper=null;const read=path=>{const raw=disk(path);return path===tamper?Buffer.concat([raw,Buffer.from(' ')]):raw;};
 const subject=await inspect({read});let cold=0,late=0;const coldPaths=[],latePaths=[];
 if(!sourceOnly){
  for(const ref of subject.bound){tamper=ref.path;assert.throws(()=>subject.assertCurrent(),undefined,'late '+tamper);late++;latePaths.push(ref.path);tamper=null;}
  for(const ref of subject.bound){tamper=ref.path;await assert.rejects(inspect({read}),undefined,'cold '+tamper);cold++;coldPaths.push(ref.path);tamper=null;}
  assert.deepEqual(latePaths,subject.bound.map(ref=>ref.path));assert.deepEqual(coldPaths,subject.bound.map(ref=>ref.path));
 }
 subject.assertCurrent();assert.ok(before.equals(disk(LEDGER)));
 const report={...subject.report,source_execution_mode:sourceOnly?'source-metadata':'complete-regression',full_source_fault_lifetimes_executed:!sourceOnly,bound_current_paths:subject.bound.length,
  ...(sourceOnly?{}:{cold_source_faults_rejected:cold,late_source_faults_rejected:late,cold_source_fault_paths_rejected:coldPaths,late_source_fault_paths_rejected:latePaths})};
 if(args[0])writeFileSync(args[0],JSON.stringify(report,null,2)+'\n',{flag:'wx'});console.log(JSON.stringify(report));
}
