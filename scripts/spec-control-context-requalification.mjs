/**
 * @license
 * Copyright Google LLC All Rights Reserved.
 * Copyright (c) 2026 Ryan Lester.
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.io/license
 */
/** Requalify only the authenticated two-case/inventory delta; retain every original verdict and runtime gate. */
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {execFileSync} from 'node:child_process';
import {createRequire} from 'node:module';
import {existsSync,lstatSync,readdirSync,readFileSync,writeFileSync} from 'node:fs';
import {gunzipSync} from 'node:zlib';
import {dirname,join,resolve} from 'node:path';
import {fileURLToPath} from 'node:url';
import {SPEC_CONTEXT_SCOPE_PATHS,validateSpecContextScopes,assertSpecContextMetadataState} from './spec-small-context-requalification.mjs';
import {reviewSliderInputScope} from './upstream-slider-input-scope.mjs';
import {reviewSliderThumbDestroyScope} from './upstream-slider-thumb-destroy-scope.mjs';
import {reviewBazelBuildContext} from './upstream-bazel-build-scope.mjs';
import {testImportOwnershipContext} from './upstream-test-import-cleanup-evidence.mjs';
import {artifactBehaviorRequirements} from './upstream-artifact-behavior-evidence.mjs';
import {historicalBehaviorRequirements} from './upstream-historical-behavior-evidence.mjs';
import {progressCspRequirements} from './upstream-progress-csp-evidence.mjs';
import {generatedIdentityRequirements} from './upstream-generated-identity-evidence.mjs';
import {bidiBehaviorRequirements} from './upstream-bidi-evidence.mjs';
import {selectionBehaviorRequirements} from './upstream-selection-evidence.mjs';
import {formFieldHoverRequirements} from './upstream-form-field-hover-evidence.mjs';
import {tabCompletionRequirements} from './upstream-tab-completion-evidence.mjs';
import {rippleReplayRequirements} from './upstream-ripple-replay-evidence.mjs';
import {inspectControlTestRepair,CONTROL_TEST_ADDITIONS} from './spec-control-test-repair.mjs';
import {deriveHistoricalRoster} from './historical-case-roster.mjs';
import {authoredUseReviewEvidence} from './authored-use-inventory.mjs';
import {scanCurrentAuthoredUses,currentAuthoredUseAdmission} from './authored-current-use-inventory.mjs';
const rootDefault=resolve(dirname(fileURLToPath(import.meta.url)),'..'),ts=createRequire(import.meta.url)('typescript');
export const CONTROL_CONTEXT_INPUTS='compatibility/rc/spec-control-context-inputs.json';
export const CONTROL_CONTEXT_SCOPE_PATHS=SPEC_CONTEXT_SCOPE_PATHS;
const pins={main:'c68029f9ff43fb4c47f58cfa21c9924400f1fbdd142c54c37457399272685fbb','21.x':'802868cd4c19cbad3bd7e037c4b95702c3a1b9e778b296e98deb5e1129cf7239'};
const inventoryPath='testing/legacy-runner/historical-inventory.json',ledgerPath='compatibility/f10/disposition-ledger/ledger.json',proofPath='compatibility/rc/spec-control-context-proof.json';
const hash=bytes=>createHash('sha256').update(bytes).digest('hex'),blob=bytes=>createHash('sha1').update('blob '+Buffer.byteLength(bytes)+'\0').update(bytes).digest('hex');
const json=value=>Buffer.from(JSON.stringify(value,null,2)+'\n');
const functions={artifact:artifactBehaviorRequirements,historical:historicalBehaviorRequirements,csp:progressCspRequirements,identity:generatedIdentityRequirements,bidi:bidiBehaviorRequirements,selection:selectionBehaviorRequirements,hover:formFieldHoverRequirements,tabs:tabCompletionRequirements,ripple:rippleReplayRequirements};
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
function appendContext(text,value){assert.equal(Object.hasOwn(JSON.parse(text),'control_case_context_requalification'),false);const at=text.lastIndexOf('\n}');assert.ok(at>0);return Buffer.from(text.slice(0,at)+',\n  "control_case_context_requalification": '+JSON.stringify(value,null,2).replaceAll('\n','\n  ')+text.slice(at));}
const noPopulation=value=>Object.fromEntries(Object.entries(value).filter(([name])=>name!=='product_source_population_sha256'));
const identities=roster=>roster.cases.map(({case_id,historical_path,full_name,index,kind})=>({case_id,historical_path,full_name,index,kind}));
function exactKeys(value,keys){assert.deepEqual(Object.keys(value).sort(),keys.slice().sort());}
export function reviewControlInventoryDelta(before,after,{rows,parent,sourceProof}){
 assert.equal(rows.length,2);assert.equal(new Set(rows.map(row=>row.path)).size,2);const previous=JSON.parse(before),changed=JSON.parse(after);assert.equal(previous.rows.length,57);assert.equal(changed.rows.length,57);assert.deepEqual(previous.counts,changed.counts);
 const updates=changed.candidate_snapshot.member_refreshes;assert.equal(updates.length,previous.candidate_snapshot.member_refreshes.length+2);const added=updates.splice(-2);
 for(const [index,source]of rows.entries()){
  const old=previous.rows.find(row=>row.candidate===source.path),row=changed.rows.find(row=>row.candidate===source.path);assert.ok(old&&row);assert.equal(old.candidate_sha256,source.before_sha256);assert.equal(row.candidate_sha256,source.after_sha256);assert.equal(row.prior_candidate_snapshots.length,old.prior_candidate_snapshots.length+1);
  const saved=row.prior_candidate_snapshots.pop();exactKeys(saved,['candidate_sha256','adaptation','execution','current_source_binding','reason']);assert.equal(saved.candidate_sha256,old.candidate_sha256);assert.equal(saved.adaptation,old.adaptation);assert.deepEqual(saved.execution,old.execution);assert.equal(saved.current_source_binding,false);assert.ok(typeof saved.reason==='string'&&saved.reason.length>40);row.candidate_sha256=old.candidate_sha256;
  const refresh=added[index];exactKeys(refresh,['source_parent','path','previous_candidate_sha256','current_candidate_sha256','reason','source_proof']);assert.equal(refresh.source_parent,parent);assert.equal(refresh.path,source.path);assert.equal(refresh.previous_candidate_sha256,source.before_sha256);assert.equal(refresh.current_candidate_sha256,source.after_sha256);assert.deepEqual(refresh.source_proof,sourceProof);assert.ok(typeof refresh.reason==='string'&&refresh.reason.length>40);
 }
 assert.deepEqual(changed,previous,'unreviewed inventory delta');return {historical_paths:57,candidate_source_bindings_changed:2,tagged_identities_and_execution_claims_preserved:true};
}
function sortValues(text){
 const file=ts.createSourceFile('sort.spec.ts',text,ts.ScriptTarget.Latest,true);assert.equal(file.parseDiagnostics.length,0);const found=[];function visit(node){if(ts.isCallExpression(node)&&node.expression.getText(file)==='it'&&node.arguments[0].text===CONTROL_TEST_ADDITIONS[0].name)found.push(node);ts.forEachChild(node,visit);}visit(file);assert.equal(found.length,1);
 const statement=found[0].arguments[1].body.statements[0];assert.ok(ts.isExpressionStatement(statement)&&ts.isCallExpression(statement.expression));assert.equal(statement.expression.expression.getText(file),'testSortWithValues');const array=statement.expression.arguments[0];assert.ok(ts.isArrayLiteralExpression(array));return array.elements.map(node=>{assert.ok(ts.isStringLiteral(node)||ts.isNumericLiteral(node));return ts.isStringLiteral(node)?node.text:Number(node.text);});
}
export function inspectControlContextRequalification({root=rootDefault,readMember}={}){
 const read=readMember||((path)=>{assert.ok(path&&!path.startsWith('/')&&!path.includes('\\')&&path.split('/').every(part=>part&&part!=='.'&&part!=='..'));let cursor=root;assert.ok(lstatSync(root).isDirectory()&&!lstatSync(root).isSymbolicLink());for(const part of path.split('/')){cursor=join(cursor,part);assert.ok(!lstatSync(cursor).isSymbolicLink(),'linked context member '+path);}assert.ok(lstatSync(cursor).isFile());return readFileSync(cursor);});
 const rawInputs=read(CONTROL_CONTEXT_INPUTS),inputs=JSON.parse(rawInputs);assert.ok(Object.hasOwn(pins,inputs.line));assert.equal(hash(rawInputs),pins[inputs.line],'control context input changed');const line=inputs.line;
 assert.deepEqual(inputs.mutable_progress_paths,['compatibility/rc/session-handoff.json','compatibility/rc/remaining-native-admission-worksheet.json']);assert.equal(inputs.all_original_hunks_decisions_and_native_requirements_preserved,true);assert.equal(inputs.new_source_decisions_or_authored_use_closures,0);assert.equal(inputs.actual_native_packed_or_floor_qualified,false);
 const beforeFrame=frame(root,inputs.before_frame),currentFrame=frame(root,inputs.current_frame),mutable=new Set([ledgerPath,...CONTROL_CONTEXT_SCOPE_PATHS]),progress=new Set(inputs.mutable_progress_paths),delta=new Set(inputs.reviewed_delta.map(row=>row.path)),beforeCache=new Map();
 for(const member of currentFrame.values()){if(mutable.has(member.path)||progress.has(member.path))continue;assert.equal(blob(read(member.path)),member.blob,'unreviewed current context source '+member.path);}
 const oldRead=path=>{if(beforeCache.has(path))return beforeCache.get(path);const member=beforeFrame.get(path);assert.ok(member,'uncaptured preceding source '+path);const special=mutable.has(path)||delta.has(path)||progress.has(path),bytes=special?git(root,['show',inputs.before_frame.commit+':'+path]):read(path);assert.equal(blob(bytes),member.blob,'preceding source changed '+path);beforeCache.set(path,bytes);return bytes;};
 const products=[...currentFrame.keys()].filter(path=>path.startsWith('projects/ngx-material-legacy/')).sort();assert.equal(products.length,1141);assert.deepEqual(productMembership(root),products);assert.deepEqual(inputs.reviewed_delta.map(row=>row.path),[...CONTROL_TEST_ADDITIONS.map(row=>row.path),inventoryPath]);
 for(const path of products)if(!delta.has(path))assert.equal(currentFrame.get(path).blob,beforeFrame.get(path)?.blob,'unrelated committed product change');
 for(const ref of inputs.implementation_evidence)assert.equal(hash(read(ref.path)),ref.sha256,'regression implementation evidence changed '+ref.path);
 for(const changed of inputs.reviewed_delta){assert.equal(hash(oldRead(changed.path)),changed.before_sha256);assert.equal(hash(read(changed.path)),changed.current_sha256);}
 const repair=inspectControlTestRepair({root,readMember:read});assert.equal(repair.line,line);assert.equal(repair.source_parent,inputs.before_frame.commit);assert.ok(repair.rows.every(row=>row.applied));
 const sourceProof=JSON.parse(read('compatibility/rc/spec-control-test-repair-source-proof.json'));assert.deepEqual(sourceProof,{...repair,rows:repair.rows.map(({source,...row})=>row),producer_sha256:hash(read('scripts/spec-control-test-repair.mjs'))});
 const prior=JSON.parse(gunzipSync(read('compatibility/rc/spec-control-test-repair-prior.json.gz')));assert.equal(prior.line,line);assert.deepEqual(prior.frame,inputs.before_frame);assert.deepEqual(prior.before_members.map(row=>row.path),inputs.reviewed_delta.map(row=>row.path));for(const row of prior.before_members){assert.equal(hash(row.text),row.sha256);assert.equal(row.text,oldRead(row.path).toString());}
 const currentRoster=deriveHistoricalRoster(root),beforeIdentities=prior.before_roster.cases,currentIdentities=identities(currentRoster),oldIds=new Set(beforeIdentities.map(row=>row.case_id));assert.equal(beforeIdentities.length,2220);assert.equal(oldIds.size,2220);assert.equal(currentIdentities.length,2222);assert.deepEqual(currentIdentities.filter(row=>oldIds.has(row.case_id)),beforeIdentities);assert.deepEqual(currentRoster.discovery_negative_ids,prior.before_roster.discovery_negative_ids);assert.equal(currentRoster.discovery_negative_ids.length,5);const additional=currentIdentities.filter(row=>!oldIds.has(row.case_id));assert.equal(additional.length,2);for(const row of repair.rows)assert.ok(additional.some(test=>test.full_name===[...row.describe_path,row.name].join(' > ')));
 const recordedRoster=JSON.parse(read('compatibility/rc/spec-control-test-repair-roster.json'));assert.equal(recordedRoster.original_cases_preserved,2220);assert.equal(recordedRoster.current_cases,2222);assert.deepEqual(recordedRoster.additional,additional);assert.deepEqual(recordedRoster.discovery_negative_ids,currentRoster.discovery_negative_ids);assert.equal(recordedRoster.parser.sha256,hash(read(recordedRoster.parser.path)));
 const originals=JSON.parse(gunzipSync(read('compatibility/rc/spec-control-test-source-subjects.json.gz'))),original=originals.subjects.find(row=>row.sha===CONTROL_TEST_ADDITIONS[0].subject);assert.ok(original&&original.members.length===1);assert.equal(blob(original.members[0].after.text),'a3bb5b0129964020b6fdaab7644772930bb89668');const sort=JSON.parse(read('compatibility/rc/spec-control-test-repair-sort-diagnostic.json'));assert.equal(sort.line,line);assert.deepEqual(sortValues(original.members[0].after.text),sortValues(read(CONTROL_TEST_ADDITIONS[0].path).toString()));assert.deepEqual(sort.input,sortValues(original.members[0].after.text));assert.deepEqual(sort.actual,sort.input);assert.equal(sort.whole_owned_class_and_facade_executed,true);assert.equal(sort.genuine_public_CDK_DataSource_parent,true);assert.equal(sort.mutant.rejected,true);assert.notDeepEqual(sort.mutant.observed,sort.input);assert.equal(sort.temporary_directory_removed,true);assert.equal(sort.actual_Angular_view_native_packed_or_floor_qualified,false);assert.equal(sort.runtime.canonical_or_floor_qualified,false);assert.equal(sort.producer_sha256,hash(read('tests/spec_control_sort_probe.mjs')));for(const ref of sort.sources)assert.equal(hash(read(ref.path)),ref.sha256);
 const sourceProofRef={path:'compatibility/rc/spec-control-test-repair-source-proof.json',sha256:hash(read('compatibility/rc/spec-control-test-repair-source-proof.json'))};const inventory=reviewControlInventoryDelta(oldRead(inventoryPath),read(inventoryPath),{rows:repair.rows,parent:inputs.before_frame.commit,sourceProof:sourceProofRef});
 const beforeLedgerBytes=oldRead(ledgerPath),beforeLedger=JSON.parse(beforeLedgerBytes);assert.equal(beforeLedger.entries.length,1697);const originalDocuments=CONTROL_CONTEXT_SCOPE_PATHS.map(path=>JSON.parse(oldRead(path))),scopeEntries=beforeLedger.entries.filter(row=>CONTROL_CONTEXT_SCOPE_PATHS.includes(row.evidence_report));validateSpecContextScopes({documents:originalDocuments,entries:scopeEntries,read:oldRead,productPaths:products,line});
 assert.equal(inputs.runtime_requirements.length,20);assert.equal(new Set(inputs.runtime_requirements.map(row=>row.sha)).size,20);for(const row of inputs.runtime_requirements)assert.deepEqual(functions[row.kind](row.sha,line),row.definition,'runtime requirement changed');
 const genericActual=beforeLedger.entries.filter(entry=>Array.isArray(entry.individual_proof?.source_evidence)&&entry.individual_proof.source_evidence.some(ref=>hash(read(ref.path))!==ref.sha256)).map(row=>row.sha).sort();assert.equal(genericActual.length,10);assert.deepEqual(genericActual,inputs.generic_source_shas);
 const context={schema_version:1,line,source_parent:inputs.current_frame.commit,qualified_reference_parent:inputs.before_frame.commit,inputs:{path:CONTROL_CONTEXT_INPUTS,sha256:hash(rawInputs)},reviewed_delta:inputs.reviewed_delta,source_proof:sourceProofRef,unchanged_other_product_members:1139,original_cases_preserved:2220,additional_cases:2,current_case_cells:2227,all_original_hunks_decisions_and_runtime_definitions_preserved:true,new_source_decisions_or_authored_use_closures:0,scope:'Only two appended candidate cases and their exact two-row inventory update differ. Preserve every prior case/body/template, all production resources and all original source judgments. This is source-context qualification, never actual Angular/native/packed/floor or complete G11 admission.',actual_native_packed_or_floor_qualified:false,g11_claim:'not-passed'};
 const previous=new Map([ledgerPath,...CONTROL_CONTEXT_SCOPE_PATHS].map(path=>[path,oldRead(path)])),writes=new Map(),documents=structuredClone(originalDocuments);
 const save=(index,changes)=>{writes.set(CONTROL_CONTEXT_SCOPE_PATHS[index],appendContext(patchFields(oldRead(CONTROL_CONTEXT_SCOPE_PATHS[index]).toString(),changes),context));documents[index]=JSON.parse(writes.get(CONTROL_CONTEXT_SCOPE_PATHS[index]));};
 const tracked=products.map(path=>{const bytes=read(path);return {path,sha256:hash(bytes),bytes:bytes.length};});save(0,{candidate_context:{...documents[0].candidate_context,source_commit:inputs.current_frame.commit,source_tree:inputs.current_frame.tree,product_members:tracked}});
 const historical=documents[1].historical_suite_context.map(ref=>{assert.equal(hash(oldRead(ref.path)),ref.sha256);return {...ref,sha256:hash(read(ref.path))};});save(1,{candidate_context:{...documents[1].candidate_context,sha256:hash(writes.get(CONTROL_CONTEXT_SCOPE_PATHS[0]))},historical_suite_context:historical});
 const sourcePaths=()=>products.filter(path=>/\.(ts|scss|css|html)$/.test(path));const slider=reviewSliderInputScope(read,sourcePaths,line);assert.deepEqual(noPopulation(slider),noPopulation(documents[2].source_scope));save(2,{source_scope:slider});
 const thumb=reviewSliderThumbDestroyScope(read,sourcePaths,line);assert.deepEqual({...thumb,retained_architecture:noPopulation(thumb.retained_architecture)},{...documents[3].source_scope,retained_architecture:noPopulation(documents[3].source_scope.retained_architecture)});save(3,{source_scope:thumb});
 const bazel=reviewBazelBuildContext(read,()=>products,line);assert.deepEqual({...bazel,product_members:[],product_population_sha256:null},{...documents[4].candidate_context,product_members:[],product_population_sha256:null});save(4,{candidate_context:bazel});
 const ownership=testImportOwnershipContext(read,line);assert.deepEqual({...ownership,inputs:[]},{...documents[5].ownership_context,inputs:[]});assert.deepEqual(ownership.inputs.map(row=>row.path),documents[5].ownership_context.inputs.map(row=>row.path));save(5,{ownership_context:ownership});
 const updates=new Map();for(const old of scopeEntries){const entry=structuredClone(old);if(entry.source_check!==undefined){assert.equal(typeof entry.source_check,'object');entry.source_check.evidence_report_sha256=hash(writes.get(entry.evidence_report));}updates.set(entry.sha,entry);}
 const proof={schema_version:1,...context,inventory_delta:inventory,source_scopes_requalified:83,native_source_bindings_requalified:20,generic_source_evidence_records_requalified:10,generic_source_shas:inputs.generic_source_shas,authored_use_receipts_changed:0,scope_documents:CONTROL_CONTEXT_SCOPE_PATHS.map(path=>({path,sha256:hash(writes.get(path))})),producer:{path:'scripts/spec-control-context-requalification.mjs',sha256:hash(read('scripts/spec-control-context-requalification.mjs'))}};writes.set(proofPath,json(proof));const proofRef={path:proofPath,sha256:hash(writes.get(proofPath))};
 const reader=path=>writes.get(path)||read(path),refresh=ref=>{assert.equal(hash(oldRead(ref.path)),ref.sha256,'preceding source receipt stale '+ref.path);const digest=hash(reader(ref.path));if(digest!==ref.sha256)assert.ok(delta.has(ref.path)||writes.has(ref.path),'changed receipt outside reviewed delta');return {...ref,sha256:digest};};
 const entryRef=old=>({sha:old.sha,ledger_path:ledgerPath,ledger_commit:inputs.before_frame.commit,entry_sha256:hash(json(old))});
 for(const registered of inputs.runtime_requirements){const old=beforeLedger.entries.find(row=>row.sha===registered.sha);assert.ok(old&&!updates.has(old.sha));const entry=structuredClone(old),scope=entry.individual_proof[registered.field];assert.deepEqual(scope.source_members.map(row=>row.path).sort(),registered.definition.members.slice().sort());scope.source_members=scope.source_members.map(refresh);
  const oldBytes=oldRead(old.evidence_report),review=structuredClone(JSON.parse(oldBytes));previous.set(old.evidence_report,oldBytes);review.individual_proof=structuredClone(entry.individual_proof);if(Array.isArray(review.reviewed_source_members))review.reviewed_source_members=review.reviewed_source_members.map(refresh);review.independent_evidence=[...(review.independent_evidence||[]).map(refresh),proofRef];review.control_case_context_requalification={...context,qualification_proof:proofRef,prior_entry:entryRef(old),prior_review:{path:old.evidence_report,sha256:hash(oldBytes)},original_branch_hunk_and_behavior_judgments_preserved:true};const path='compatibility/f10/disposition-ledger/evidence/closeout-control-case-context-'+old.sha+'.json';writes.set(path,json(review));entry.evidence_report=path;updates.set(old.sha,entry);
 }
 for(const sha of inputs.generic_source_shas){const old=beforeLedger.entries.find(row=>row.sha===sha);assert.ok(old&&!updates.has(sha));const entry=structuredClone(old),oldBytes=oldRead(old.evidence_report),review=structuredClone(JSON.parse(oldBytes));previous.set(old.evidence_report,oldBytes);assert.deepEqual(review.individual_proof,old.individual_proof);entry.individual_proof.source_evidence=entry.individual_proof.source_evidence.map(refresh);entry.individual_proof.current_source_context=proofRef;review.individual_proof=structuredClone(entry.individual_proof);review.independent_source_evidence=[...review.independent_source_evidence.map(refresh),proofRef];review.control_case_context_requalification={...context,qualification_proof:proofRef,prior_entry:entryRef(old),prior_review:{path:old.evidence_report,sha256:hash(oldBytes)},original_branch_hunk_and_behavior_judgments_preserved:true};const path='compatibility/f10/disposition-ledger/evidence/closeout-control-case-context-'+sha+'.json';writes.set(path,json(review));entry.evidence_report=path;updates.set(sha,entry);}
 assert.equal(updates.size,113);assert.equal(writes.size,37);writes.set(ledgerPath,patchRows(beforeLedgerBytes.toString(),updates));assert.equal(writes.size,38);
 validateSpecContextScopes({documents,entries:[...updates.values()].filter(row=>CONTROL_CONTEXT_SCOPE_PATHS.includes(row.evidence_report)),read:reader,productPaths:products,line});
 const afterLedger=JSON.parse(writes.get(ledgerPath));assert.deepEqual(afterLedger.entries.map(row=>[row.sha,row.final_disposition]),beforeLedger.entries.map(row=>[row.sha,row.final_disposition]));for(const row of afterLedger.entries)if(!updates.has(row.sha))assert.deepEqual(row,beforeLedger.entries.find(old=>old.sha===row.sha));
 const frozen=JSON.parse(read('compatibility/f10/authored-dependency-dispositions.json')),current=JSON.parse(read('compatibility/f10/authored-dependency-current-dispositions.json')),frozenEvidence=authoredUseReviewEvidence(frozen,line,reader,hash);assert.equal(frozenEvidence.reviewed,1446);assert.equal(frozenEvidence.insufficient,0);const active=scanCurrentAuthoredUses({root}),admission=currentAuthoredUseAdmission({root,current:active,frozen:JSON.parse(read('compatibility/f10/authored-dependency-inventory-seed.json')).symbol_uses,candidate:current,line,readMember:reader});assert.equal(admission.source_snapshot_valid,true);assert.equal(admission.review_evidence.reviewed,178);assert.equal(admission.review_evidence.insufficient,0);
 assertSpecContextMetadataState({previous,writes,read,has:path=>existsSync(resolve(root,path))});
 return {line,inputs,proof,previous,writes,beforeLedger,updates,productPaths:products,repair,inventory,beforeInventory:oldRead(inventoryPath),currentInventory:read(inventoryPath),sourceProofRef,frozenEvidence,currentAdmission:admission,source_scope_rows:83,native_source_bindings:20,generic_source_records:10,all1697_dispositions_and_authored_statuses_preserved:true,actual_native_packed_or_floor_qualified:false,g11_claim:'not-passed'};
}
if(process.argv[1]&&resolve(process.argv[1])===fileURLToPath(import.meta.url)){
 const result=inspectControlContextRequalification();if(process.argv.includes('--write'))for(const [path,bytes]of result.writes)if(!existsSync(resolve(rootDefault,path))||!readFileSync(resolve(rootDefault,path)).equals(bytes))writeFileSync(resolve(rootDefault,path),bytes);console.log(JSON.stringify({line:result.line,source_scope_rows:83,native_source_bindings:20,generic_source_records:10,proposed_writes:38,applied:process.argv.includes('--write'),all1697_dispositions_and_authored_statuses_preserved:true,actual_native_packed_or_floor_qualified:false,g11_claim:'not-passed'}));
}
