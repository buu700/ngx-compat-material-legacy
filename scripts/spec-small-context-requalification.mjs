/**
 * @license
 * Copyright Google LLC All Rights Reserved.
 * Copyright (c) 2026 Ryan Lester.
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.io/license
 */
/** Exact fixture/inventory delta; original decisions and actual runtime gates stay intact. */
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {execFileSync} from 'node:child_process';
import {createRequire} from 'node:module';
import {existsSync,lstatSync,readdirSync,readFileSync,writeFileSync} from 'node:fs';
import {dirname,resolve} from 'node:path';
import {fileURLToPath} from 'node:url';
import {buildScopeEvidenceOk} from './upstream-build-scope-evidence.mjs';
import {testConsolidationBatchOk,testConsolidationEntryOk} from './upstream-test-consolidation-evidence.mjs';
import {reviewSliderInputScope,sliderInputScopeEvidenceOk} from './upstream-slider-input-scope.mjs';
import {reviewSliderThumbDestroyScope,sliderThumbDestroyEvidenceOk} from './upstream-slider-thumb-destroy-scope.mjs';
import {reviewBazelBuildContext,bazelBuildEvidenceOk} from './upstream-bazel-build-scope.mjs';
import {testImportOwnershipContext,testImportBatchOk,testImportEntryOk} from './upstream-test-import-cleanup-evidence.mjs';
import {artifactBehaviorRequirements} from './upstream-artifact-behavior-evidence.mjs';
import {historicalBehaviorRequirements} from './upstream-historical-behavior-evidence.mjs';
import {progressCspRequirements} from './upstream-progress-csp-evidence.mjs';
import {generatedIdentityRequirements} from './upstream-generated-identity-evidence.mjs';
import {bidiBehaviorRequirements} from './upstream-bidi-evidence.mjs';
import {selectionBehaviorRequirements} from './upstream-selection-evidence.mjs';
import {formFieldHoverRequirements} from './upstream-form-field-hover-evidence.mjs';
import {tabCompletionRequirements} from './upstream-tab-completion-evidence.mjs';
import {rippleReplayRequirements} from './upstream-ripple-replay-evidence.mjs';
import {inspectSpecSmallSources,GROUPED_FIXTURE_PATH} from './spec-small-source-review.mjs';
import {authoredUseReviewEvidence} from './authored-use-inventory.mjs';
import {scanCurrentAuthoredUses,currentAuthoredUseAdmission} from './authored-current-use-inventory.mjs';
const rootDefault=resolve(dirname(fileURLToPath(import.meta.url)),'..'),ts=createRequire(import.meta.url)('typescript');
export const SPEC_CONTEXT_INPUTS='compatibility/rc/spec-small-context-inputs.json';
const pins={main:'517745e4e287814633468cb8ab5b75bfb79083d2e98047941863c3f77d34bad0','21.x':'bd405a528bd41ec8279ab9356d2c8e39316a873faf47ca40e71c23d02f4c963c'};
export const SPEC_CONTEXT_SCOPE_PATHS=['closeout-fourteen-build-scope-review','closeout-test-consolidation-source-review',
 'closeout-three-slider-input-source-review','closeout-slider-thumb-destroy-review','closeout-bazel-build-only-review',
 'closeout-thirty-one-test-import-source-review'].map(name=>'compatibility/f10/disposition-ledger/evidence/'+name+'.json');
const inventoryPath='testing/legacy-runner/historical-inventory.json',ledgerPath='compatibility/f10/disposition-ledger/ledger.json';
const proofPath='compatibility/rc/spec-small-context-proof.json';
const hash=bytes=>createHash('sha256').update(bytes).digest('hex'),blob=bytes=>createHash('sha1').update('blob '+bytes.length+'\0').update(bytes).digest('hex');
const json=value=>Buffer.from(JSON.stringify(value,null,2)+'\n');
const functions={artifact:artifactBehaviorRequirements,historical:historicalBehaviorRequirements,csp:progressCspRequirements,
 identity:generatedIdentityRequirements,bidi:bidiBehaviorRequirements,selection:selectionBehaviorRequirements,
 hover:formFieldHoverRequirements,tabs:tabCompletionRequirements,ripple:rippleReplayRequirements};
function git(root,args){const env={...process.env,GIT_NO_LAZY_FETCH:'1',GIT_NO_REPLACE_OBJECTS:'1'};
 for(const key of ['GIT_DIR','GIT_WORK_TREE','GIT_INDEX_FILE','GIT_COMMON_DIR','GIT_OBJECT_DIRECTORY','GIT_ALTERNATE_OBJECT_DIRECTORIES'])delete env[key];
 return execFileSync('git',['--no-replace-objects','-c','gc.auto=0','-c','maintenance.auto=0',...args],{cwd:root,env,maxBuffer:16*1024*1024});}
function frame(root,reference){
 assert.match(reference.commit,/^[a-f0-9]{40}$/);assert.equal(git(root,['rev-parse',reference.commit+'^{tree}']).toString().trim(),reference.tree);
 const raw=git(root,['ls-tree','-rz',reference.commit]);assert.equal(hash(raw),reference.tree_listing_sha256);const result=new Map();
 for(const value of raw.toString().split('\0').filter(Boolean)){const [meta,path]=value.split('\t'),[mode,kind,id]=meta.split(' ');
  assert.ok(path&&!path.startsWith('/')&&!path.includes('\\')&&path.split('/').every(p=>p&&p!=='.'&&p!=='..'&&p!=='.git'));assert.equal(kind,'blob');assert.ok(['100644','100755'].includes(mode));assert.ok(!result.has(path));result.set(path,{path,mode,blob:id});}
 assert.equal(result.size,reference.members);return result;
}
function productMembership(root){const paths=[];function visit(relative){for(const item of readdirSync(resolve(root,relative),{withFileTypes:true})){
 const path=relative+'/'+item.name;if(item.name==='node_modules')continue;assert.ok(!item.isSymbolicLink(),'linked product member');if(item.isDirectory())visit(path);else{assert.ok(item.isFile());paths.push(path);}
 }}visit('projects/ngx-material-legacy');return paths.sort();}
function patchFields(text,changes){
 const file=ts.parseJsonText('review.json',text);assert.equal(file.parseDiagnostics.length,0);const edits=[];
 for(const [name,value]of Object.entries(changes)){const node=file.statements[0].expression.properties.find(p=>p.name.text===name);assert.ok(node,'missing review field '+name);
  const indent=' '.repeat(file.getLineAndCharacterOfPosition(node.getStart(file)).character);edits.push({start:node.initializer.getStart(file),end:node.initializer.end,text:JSON.stringify(value,null,2).replaceAll('\n','\n'+indent)});}
 for(const edit of edits.sort((a,b)=>b.start-a.start))text=text.slice(0,edit.start)+edit.text+text.slice(edit.end);return text;
}
function patchRows(text,updates){const file=ts.parseJsonText('ledger.json',text);assert.equal(file.parseDiagnostics.length,0);const array=file.statements[0].expression.properties.find(p=>p.name.text==='entries').initializer,edits=[];
 for(const node of array.elements){const row=JSON.parse(node.getText(file)),next=updates.get(row.sha);if(!next)continue;const indent=' '.repeat(file.getLineAndCharacterOfPosition(node.getStart(file)).character);
  edits.push({start:node.getStart(file),end:node.end,text:JSON.stringify(next,null,2).replaceAll('\n','\n'+indent)});}
 assert.equal(edits.length,updates.size);for(const edit of edits.reverse())text=text.slice(0,edit.start)+edit.text+text.slice(edit.end);return Buffer.from(text);
}
function appendContext(text,value){assert.equal(Object.hasOwn(JSON.parse(text),'spec_fixture_context_requalification'),false);const at=text.lastIndexOf('\n}');assert.ok(at>0);return Buffer.from(text.slice(0,at)+',\n  "spec_fixture_context_requalification": '+JSON.stringify(value,null,2).replaceAll('\n','\n  ')+text.slice(at));}
const noPopulation=value=>Object.fromEntries(Object.entries(value).filter(([name])=>name!=='product_source_population_sha256'));

/** The inventory tracks current source bytes; tagged identities and execution claims never change. */
export function reviewSpecInventoryDelta(before,after,{previousSourceSha,currentSourceSha,controls,parent}){
 const previous=JSON.parse(before),next=JSON.parse(after),changed=structuredClone(next);
 assert.deepEqual(previous.counts,next.counts);assert.equal(previous.rows.length,57);assert.equal(next.rows.length,57);
 const index=previous.rows.findIndex(row=>row.candidate===GROUPED_FIXTURE_PATH);assert.ok(index>=0);
 const old=previous.rows[index],row=changed.rows[index];assert.equal(row.candidate,GROUPED_FIXTURE_PATH);assert.equal(old.candidate_sha256,previousSourceSha);assert.equal(row.candidate_sha256,currentSourceSha);
 assert.equal(row.prior_candidate_snapshots.length,old.prior_candidate_snapshots.length+1);
 const saved=row.prior_candidate_snapshots.pop();assert.equal(saved.candidate_sha256,previousSourceSha);assert.equal(saved.adaptation,old.adaptation);assert.deepEqual(saved.execution,old.execution);assert.equal(saved.current_source_binding,false);assert.equal(typeof saved.reason,'string');
 row.candidate_sha256=previousSourceSha;const updates=changed.candidate_snapshot.member_refreshes,original=previous.candidate_snapshot.member_refreshes;assert.equal(updates.length,original.length+1);
 const update=updates.pop();assert.equal(update.source_parent,parent);assert.equal(update.path,GROUPED_FIXTURE_PATH);assert.equal(update.previous_candidate_sha256,previousSourceSha);assert.equal(update.current_candidate_sha256,currentSourceSha);assert.deepEqual(update.source_controls,controls);
 assert.deepEqual(changed,previous,'unreviewed historical inventory change');return {historical_paths:57,tagged_identities_and_execution_claims_preserved:true,candidate_source_bindings_changed:1};
}

/** Actual original validators, with exact before/proposed inputs; no surrogate acceptance predicate. */
export function validateSpecContextScopes({documents,entries,read,productPaths,line}){
 const selected=path=>entries.filter(row=>row.evidence_report===path);assert.deepEqual(SPEC_CONTEXT_SCOPE_PATHS.map(path=>selected(path).length),[14,32,3,1,2,31]);
 const sourcePaths=productPaths.filter(path=>/\.(ts|scss|css|html)$/.test(path)).sort();
 for(const entry of selected(SPEC_CONTEXT_SCOPE_PATHS[0]))assert.ok(buildScopeEvidenceOk(documents[0],entry,read,productPaths),'build context rejected');
 const consolidation=testConsolidationBatchOk(documents[1],read,productPaths);assert.equal(consolidation,true,'consolidation context rejected');
 for(const entry of selected(SPEC_CONTEXT_SCOPE_PATHS[1]))assert.ok(testConsolidationEntryOk(documents[1],entry,read,consolidation),'consolidation entry rejected');
 for(const entry of selected(SPEC_CONTEXT_SCOPE_PATHS[2]))assert.ok(sliderInputScopeEvidenceOk(documents[2],entry,read,()=>sourcePaths,line),'slider input context rejected');
 for(const entry of selected(SPEC_CONTEXT_SCOPE_PATHS[3]))assert.ok(sliderThumbDestroyEvidenceOk(documents[3],entry,read,()=>sourcePaths,line),'slider destruction context rejected');
 for(const entry of selected(SPEC_CONTEXT_SCOPE_PATHS[4]))assert.ok(bazelBuildEvidenceOk(documents[4],entry,read,()=>productPaths,line),'Bazel context rejected');
 const imports=testImportBatchOk(documents[5],read,line);assert.equal(imports,true,'test import context rejected');
 for(const entry of selected(SPEC_CONTEXT_SCOPE_PATHS[5]))assert.ok(testImportEntryOk(documents[5],entry,read,imports),'test import entry rejected');
 return {source_scope_rows:83,scope_groups:[14,32,3,1,2,31]};
}
export function assertSpecContextMetadataState({previous,writes,read,has}){
 for(const path of new Set([...previous.keys(),...writes.keys()])){const before=previous.get(path),next=writes.get(path);
  if(before)assert.ok(read(path).equals(before)||(next&&read(path).equals(next)),'live context metadata changed '+path);
  else if(has(path))assert.ok(next&&read(path).equals(next),'new context metadata changed '+path);}
}

export function inspectSpecContextRequalification({root=rootDefault,readMember}={}){
 const read=readMember||((path)=>{const resolved=resolve(root,path);assert.ok(!lstatSync(resolved).isSymbolicLink());return readFileSync(resolved);});
 const inputBytes=read(SPEC_CONTEXT_INPUTS),inputs=JSON.parse(inputBytes);assert.equal(hash(inputBytes),pins[inputs.line],'context input changed');const line=inputs.line;
 const beforeFrame=frame(root,inputs.before_frame),currentFrame=frame(root,inputs.current_frame),mutable=new Set([ledgerPath,...SPEC_CONTEXT_SCOPE_PATHS]),beforeCache=new Map();
 // Check the live complete repair graph before any historical reads. Only the
 // finite proposal metadata and session progress can differ; neither original
 // source nor other caller data is silently replaced by the before graph.
 for(const member of currentFrame.values()){if(mutable.has(member.path)||member.path==='compatibility/rc/session-handoff.json')continue;
  assert.equal(blob(read(member.path)),member.blob,'unreviewed current context source '+member.path);}
 const oldRead=path=>{if(beforeCache.has(path))return beforeCache.get(path);const member=beforeFrame.get(path);assert.ok(member,'uncaptured preceding source '+path);
  const special=mutable.has(path)||[GROUPED_FIXTURE_PATH,inventoryPath].includes(path),bytes=special?git(root,['show',inputs.before_frame.commit+':'+path]):read(path);
  assert.equal(blob(bytes),member.blob,'preceding source changed '+path);beforeCache.set(path,bytes);return bytes;};
 const productPaths=[...currentFrame.keys()].filter(path=>path.startsWith('projects/ngx-material-legacy/')).sort();assert.equal(productPaths.length,1141);assert.deepEqual(productMembership(root),productPaths);
 for(const path of productPaths)if(path!==GROUPED_FIXTURE_PATH)assert.equal(currentFrame.get(path).blob,beforeFrame.get(path)?.blob,'unrelated committed product change');
 for(const ref of inputs.implementation_evidence)assert.equal(hash(read(ref.path)),ref.sha256,'fixture implementation evidence changed '+ref.path);
 assert.deepEqual(inputs.reviewed_delta.map(row=>row.path),[GROUPED_FIXTURE_PATH,inventoryPath]);
 for(const delta of inputs.reviewed_delta){assert.equal(hash(oldRead(delta.path)),delta.before_sha256);assert.equal(hash(read(delta.path)),delta.current_sha256);}
 const fixture=inspectSpecSmallSources({root,readMember:read});assert.equal(fixture.fixture_repair.applied,true);assert.equal(fixture.fixture_repair.before_sha256,hash(oldRead(GROUPED_FIXTURE_PATH)));
 const {proposed_source,...fixtureAnalysis}=fixture,controls=JSON.parse(read('compatibility/rc/spec-small-source-controls.json'));
 assert.equal(controls.controls,48);assert.equal(controls.original_case_ids_order_and_names_unchanged,true);assert.equal(controls.derived_historical_cases,2220);assert.equal(controls.discovery_controls,5);
 assert.equal(controls.helper_sha256,hash(read('scripts/spec-small-source-review.mjs')));assert.equal(controls.producer_sha256,hash(read('tests/spec_small_source_probe.mjs')));assert.deepEqual(controls.analysis,fixtureAnalysis);
 const inventory=reviewSpecInventoryDelta(oldRead(inventoryPath),read(inventoryPath),{previousSourceSha:hash(oldRead(GROUPED_FIXTURE_PATH)),currentSourceSha:hash(read(GROUPED_FIXTURE_PATH)),controls:{path:'compatibility/rc/spec-small-source-controls.json',sha256:hash(read('compatibility/rc/spec-small-source-controls.json'))},parent:inputs.before_frame.commit});
 const beforeLedgerBytes=oldRead(ledgerPath),beforeLedger=JSON.parse(beforeLedgerBytes);assert.equal(beforeLedger.entries.length,1697);
 const originalDocuments=SPEC_CONTEXT_SCOPE_PATHS.map(path=>JSON.parse(oldRead(path))),sourceEntries=beforeLedger.entries.filter(row=>SPEC_CONTEXT_SCOPE_PATHS.includes(row.evidence_report));
 validateSpecContextScopes({documents:originalDocuments,entries:sourceEntries,read:oldRead,productPaths,line});
 assert.equal(inputs.runtime_requirements.length,20);assert.equal(new Set(inputs.runtime_requirements.map(row=>row.sha)).size,20);
 for(const registered of inputs.runtime_requirements)assert.deepEqual(functions[registered.kind](registered.sha,line),registered.definition,'runtime requirement changed');
 const context={schema_version:1,line,source_parent:inputs.current_frame.commit,qualified_reference_parent:inputs.before_frame.commit,
  inputs:{path:SPEC_CONTEXT_INPUTS,sha256:hash(inputBytes)},reviewed_delta:inputs.reviewed_delta,fixture_controls:{path:'compatibility/rc/spec-small-source-controls.json',sha256:hash(read('compatibility/rc/spec-small-source-controls.json'))},
  unchanged_other_product_members:1140,changed_private_fixture_data_names:3,historical_paths:57,case_identities_order_names:2220,discovery_controls:5,
  all_original_hunks_decisions_and_runtime_requirements_preserved:true,new_source_decisions_or_authored_use_closures:0,
  scope:'Only three private test-data keys and their explicit current source snapshot differ. Complete tagged templates, states/label values, all cases/assertions, all other product sources and all production peer uses stay exact. The48 source/semantic/adapter controls support this finite source repair. Current packed/native/floor qualification remains mandatory.',actual_native_packed_or_floor_qualified:false,g11_claim:'not-passed'};
 const previous=new Map([ledgerPath,...SPEC_CONTEXT_SCOPE_PATHS].map(path=>[path,oldRead(path)])),writes=new Map(),documents=structuredClone(originalDocuments);
 const save=(index,changes)=>{writes.set(SPEC_CONTEXT_SCOPE_PATHS[index],appendContext(patchFields(oldRead(SPEC_CONTEXT_SCOPE_PATHS[index]).toString(),changes),context));documents[index]=JSON.parse(writes.get(SPEC_CONTEXT_SCOPE_PATHS[index]));};
 const tracked=productPaths.map(path=>{const bytes=read(path);return {path,sha256:hash(bytes),bytes:bytes.length};});
 const build={...documents[0].candidate_context,source_commit:inputs.current_frame.commit,source_tree:inputs.current_frame.tree,product_members:tracked};save(0,{candidate_context:build});
 const consolidation={...documents[1].candidate_context,sha256:hash(writes.get(SPEC_CONTEXT_SCOPE_PATHS[0]))};
 const historical=documents[1].historical_suite_context.map(ref=>{assert.equal(hash(oldRead(ref.path)),ref.sha256);return {...ref,sha256:hash(read(ref.path))};});save(1,{candidate_context:consolidation,historical_suite_context:historical});
 const slider=reviewSliderInputScope(read,()=>productPaths.filter(path=>/\.(ts|scss|css|html)$/.test(path)),line);assert.deepEqual(noPopulation(slider),noPopulation(documents[2].source_scope));save(2,{source_scope:slider});
 const thumb=reviewSliderThumbDestroyScope(read,()=>productPaths.filter(path=>/\.(ts|scss|css|html)$/.test(path)),line);
 assert.deepEqual({...thumb,retained_architecture:noPopulation(thumb.retained_architecture)},{...documents[3].source_scope,retained_architecture:noPopulation(documents[3].source_scope.retained_architecture)});save(3,{source_scope:thumb});
 const bazel=reviewBazelBuildContext(read,()=>productPaths,line);
 assert.deepEqual({...bazel,product_members:[],product_population_sha256:null},{...documents[4].candidate_context,product_members:[],product_population_sha256:null});save(4,{candidate_context:bazel});
 const ownership=testImportOwnershipContext(read,line),oldOwnership=documents[5].ownership_context;
 assert.deepEqual({...ownership,inputs:[]},{...oldOwnership,inputs:[]});assert.deepEqual(ownership.inputs.map(row=>row.path),oldOwnership.inputs.map(row=>row.path));save(5,{ownership_context:ownership});
 const updates=new Map();for(const old of sourceEntries){const entry=structuredClone(old);if(entry.source_check!==undefined){assert.equal(typeof entry.source_check,'object');entry.source_check.evidence_report_sha256=hash(writes.get(entry.evidence_report));}updates.set(entry.sha,entry);}
 const proof={schema_version:1,...context,inventory_delta:inventory,source_scopes_requalified:83,native_source_bindings_requalified:20,authored_use_receipts_changed:0,
  fixture_analysis:{path:'compatibility/rc/spec-small-source-review.json',sha256:hash(read('compatibility/rc/spec-small-source-review.json'))},
  producer:{path:'scripts/spec-small-context-requalification.mjs',sha256:hash(read('scripts/spec-small-context-requalification.mjs'))}};writes.set(proofPath,json(proof));const proofRef={path:proofPath,sha256:hash(writes.get(proofPath))};
 const reader=path=>writes.get(path)||read(path),refresh=ref=>{assert.equal(hash(oldRead(ref.path)),ref.sha256,'preceding native receipt stale '+ref.path);const digest=hash(reader(ref.path));
  if(digest!==ref.sha256)assert.ok(inputs.reviewed_delta.some(row=>row.path===ref.path)||writes.has(ref.path),'changed native receipt outside reviewed delta');return {...ref,sha256:digest};};
 for(const registered of inputs.runtime_requirements){const old=beforeLedger.entries.find(row=>row.sha===registered.sha);assert.ok(old&&!updates.has(old.sha));const entry=structuredClone(old),scope=entry.individual_proof[registered.field];
  assert.deepEqual(scope.source_members.map(row=>row.path).sort(),registered.definition.members.slice().sort());scope.source_members=scope.source_members.map(refresh);
  const oldReviewBytes=oldRead(old.evidence_report),review=structuredClone(JSON.parse(oldReviewBytes));previous.set(old.evidence_report,oldReviewBytes);
  review.individual_proof=structuredClone(entry.individual_proof);if(Array.isArray(review.reviewed_source_members))review.reviewed_source_members=review.reviewed_source_members.map(refresh);
  review.independent_evidence=[...(review.independent_evidence||[]).map(refresh),proofRef];review.spec_fixture_context_requalification={...context,prior_entry:old,prior_review:{path:old.evidence_report,sha256:hash(oldReviewBytes)},original_branch_hunk_and_behavior_judgments_preserved:true};
  const path='compatibility/f10/disposition-ledger/evidence/closeout-spec-fixture-context-'+entry.sha+'.json';writes.set(path,json(review));entry.evidence_report=path;updates.set(entry.sha,entry);
 }
 assert.equal(updates.size,103);writes.set(ledgerPath,patchRows(beforeLedgerBytes.toString(),updates));
 validateSpecContextScopes({documents,entries:[...updates.values()].filter(row=>SPEC_CONTEXT_SCOPE_PATHS.includes(row.evidence_report)),read:reader,productPaths,line});
 const afterLedger=JSON.parse(writes.get(ledgerPath));assert.deepEqual(afterLedger.entries.map(row=>[row.sha,row.final_disposition]),beforeLedger.entries.map(row=>[row.sha,row.final_disposition]));
 for(const row of afterLedger.entries)if(!updates.has(row.sha))assert.deepEqual(row,beforeLedger.entries.find(old=>old.sha===row.sha));
 const frozen=JSON.parse(read('compatibility/f10/authored-dependency-dispositions.json')),current=JSON.parse(read('compatibility/f10/authored-dependency-current-dispositions.json'));
 const frozenEvidence=authoredUseReviewEvidence(frozen,line,reader,hash);assert.equal(frozenEvidence.reviewed,1446);assert.equal(frozenEvidence.insufficient,0);
 const active=scanCurrentAuthoredUses({root}),admission=currentAuthoredUseAdmission({root,current:active,frozen:JSON.parse(read('compatibility/f10/authored-dependency-inventory-seed.json')).symbol_uses,candidate:current,line,readMember:reader});
 assert.equal(admission.source_snapshot_valid,true);assert.equal(admission.review_evidence.reviewed,178);assert.equal(admission.review_evidence.insufficient,0);
 assertSpecContextMetadataState({previous,writes,read,has:path=>existsSync(resolve(root,path))});
 return {line,proof,inputs,previous,writes,beforeLedger,updates,productPaths,source_scope_rows:83,native_source_bindings:20,frozenEvidence,currentAdmission:admission,
  all1697_dispositions_and_authored_use_statuses_preserved:true,actual_native_packed_or_floor_qualified:false,g11_claim:'not-passed'};
}
if(process.argv[1]&&resolve(process.argv[1])===fileURLToPath(import.meta.url)){
 const result=inspectSpecContextRequalification();if(process.argv.includes('--write'))for(const [path,bytes]of result.writes)if(!existsSync(resolve(rootDefault,path))||!readFileSync(resolve(rootDefault,path)).equals(bytes))writeFileSync(resolve(rootDefault,path),bytes);
 console.log(JSON.stringify({line:result.line,source_scope_rows:83,native_source_bindings:20,proposed_writes:result.writes.size,applied:process.argv.includes('--write'),all1697_dispositions_and_authored_use_statuses_preserved:true,actual_native_packed_or_floor_qualified:false,g11_claim:'not-passed'}));
}
