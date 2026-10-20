/**
 * @license
 * Copyright Google LLC All Rights Reserved.
 * Copyright (c) 2026 Ryan Lester.
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.io/license
 */
/** Deterministic current source successors; no new decisions or runtime credit. */
import assert from 'node:assert/strict';
import {readFileSync,writeFileSync} from 'node:fs';
import {createHash} from 'node:crypto';
import {createRequire} from 'node:module';
import {execFileSync} from 'node:child_process';
import {join,resolve} from 'node:path';
import {pathToFileURL} from 'node:url';
import {isDeepStrictEqual} from 'node:util';
import {currentCoreRoleOccurrences} from './core-view-use-current-roles.mjs';
import {dialogPortalPrior,DIALOG_PORTAL_SOURCE} from './dialog-portal-failure-recovery.mjs';
import {portalRolePrior,preparePortalRoleReview} from './portal-caller-roles.mjs';
import {tableCoercionPrior,tableCoercionFacts,TABLE_COERCION_REVIEW} from './table-coercion-caller-roles.mjs';
import {prepareMaterialPublicSubjects} from './material-public-subjects.mjs';
import {coercionBehavior} from './coercion-pure-use-review.mjs';
import {platformCallerPrior,inspectPlatformCallerReview,PLATFORM_CALLER_REVIEW} from './platform-caller-roles.mjs';
import {coreTokenCallerPrior,inspectCoreTokenCallerReview,CORE_TOKEN_CALLER_REVIEW} from './core-token-caller-roles.mjs';
import {remainingCorePrior,inspectRemainingCoreReview,REMAINING_CORE_REVIEW} from './remaining-core-caller-roles.mjs';
import {materialCorePrior,inspectMaterialCoreReview,MATERIAL_CORE_REVIEW} from './material-core-caller-roles.mjs';
import {cdkModuleTypePrior,inspectCdkModuleTypeReview,CDK_MODULE_TYPE_REVIEW} from './cdk-module-type-caller-roles.mjs';
import {layoutServicePrior,inspectLayoutServiceReview,LAYOUT_SERVICE_REVIEW} from './layout-service-caller-roles.mjs';
import {snackDomContextPrior,qualifyIndependentSnackProductDelta,SNACK_SOURCE,SNACK_SOURCE_CONTEXT_INPUTS} from './snack-dom-source-context.mjs';
import {candidateProductSourcePaths} from './upstream-candidate-source-evidence.mjs';
import {reviewSliderInputScope} from './upstream-slider-input-scope.mjs';
import {reviewSliderRangeScope} from './upstream-slider-range-followups.mjs';
import {reviewSliderThumbDestroyScope} from './upstream-slider-thumb-destroy-scope.mjs';
import {reviewBazelBuildContext} from './upstream-bazel-build-scope.mjs';
import {modernChipSourceContext,modernChipSourceProof} from './upstream-modern-chip-scope.mjs';
import {chipEditSourceBody,chipEditSourceProof} from './upstream-chip-edit-scope.mjs';
import {chipInputApiSourceBody,chipInputApiSourceProof} from './upstream-chip-input-api-scope.mjs';
import {chipModernizationSourceBody,chipModernizationSourceProof} from './upstream-chip-modernization-scope.mjs';
import {chipLifecycleSourceBody,chipLifecycleSourceProof} from './upstream-chip-lifecycle-admission.mjs';
import {historicalBehaviorRequirements} from './upstream-historical-behavior-evidence.mjs';
import {scanCurrentAuthoredUses,currentAuthoredUseAdmission} from './authored-current-use-inventory.mjs';
const hash=b=>createHash('sha256').update(b).digest('hex'),json=v=>JSON.stringify(v,null,2)+'\n',ts=createRequire(import.meta.url)('typescript'),rawRead=root=>p=>readFileSync(join(root,p));
export const SNACK_CONTEXT_RECIPE='compatibility/rc/snack-dom-source-context-deltas.json';
const prefix='compatibility/rc/snack-dom-source-context-',authPath='compatibility/f10/authored-use-reviews/snack-dom-source-context.json';
const api={'chip-edit':[chipEditSourceBody,chipEditSourceProof],'chip-input-api':[chipInputApiSourceBody,chipInputApiSourceProof],'chip-modernization':[chipModernizationSourceBody,chipModernizationSourceProof]};
function equal(a,b,label){assert.equal(isDeepStrictEqual(a,b),true,label);}
function differences(a,b,path='$',out=[]){if(isDeepStrictEqual(a,b))return out;if(a&&b&&typeof a==='object'&&typeof b==='object'&&Array.isArray(a)===Array.isArray(b)){for(const key of new Set([...Object.keys(a),...Object.keys(b)]))differences(a[key],b[key],path+'.'+key,out);}else out.push({path,...(a===undefined?{}:{before:a}),...(b===undefined?{}:{after:b})});return out;}
function replaceRows(member,key,replacements,id){const source=ts.parseJsonText(member.path,member.text);assert.equal(source.parseDiagnostics.length,0);const nodes=source.statements[0].expression.properties.find(p=>p.name.text===key).initializer.elements;const edits=[];for(const node of nodes){const row=JSON.parse(node.getText(source)),next=replacements.get(id(row));if(next)edits.push({start:node.getStart(source),end:node.end,text:JSON.stringify(next,null,2).replaceAll('\n','\n    ')});}assert.equal(edits.length,replacements.size);let text=member.text;for(const e of edits.sort((a,b)=>b.start-a.start))text=text.slice(0,e.start)+e.text+text.slice(e.end);return Buffer.from(text);}
const useId=r=>JSON.stringify([r.file,r.module,r.symbol]);
/** Replay the immutable pure-helper evidence from repository-owned package bytes. */
export async function inspectPortableTableCoercion({root=process.cwd(),read=rawRead(root)}={}){
 const authenticated=snackDomContextPrior({root,read}),catalog=JSON.parse(read(SNACK_SOURCE_CONTEXT_INPUTS)),ref=catalog.additional_caller_review_members.find(m=>m.path===TABLE_COERCION_REVIEW);assert.ok(ref);assert.equal(hash(read(TABLE_COERCION_REVIEW)),ref.sha256);
 const {prior,facts}=tableCoercionFacts({root,read}),body=JSON.parse(read(TABLE_COERCION_REVIEW)),subjects=JSON.parse(read('compatibility/rc/coercion-public-subjects.json')),models=[];assert.equal(authenticated.line,prior.line);
 assert.equal(body.line,prior.line);assert.equal(body.status,'reviewed');assert.equal(body.reviews.length,3);
 for(const fact of facts){const review=body.reviews.find(r=>useId(r)===useId(fact));assert.ok(review);assert.equal(review.candidate_source_sha256,fact.candidate_source_sha256);equal(review.source_role,fact.source_role);equal(review.complete_setters,fact.setters);for(const m of review.independent_evidence)assert.equal(hash(read(m.path)),m.sha256);}
 const loaded=prepareMaterialPublicSubjects(root);try{
  for(const model of loaded.models){const subject=subjects.subjects.find(s=>s.line===model.line),recorded=body.public_subjects.find(s=>s.line===model.line);assert.ok(subject&&recorded);assert.equal(model.packages.get('@angular/cdk').version,subject.version);assert.equal(recorded.version,subject.version);assert.equal(recorded.signature,'(value: any): boolean');assert.equal(recorded.stable_public_export,true);
   const pkg=model.packages.get('@angular/cdk');assert.equal(pkg.exports['./coercion'].default,'./'+subject.public_entry);assert.equal(pkg.exports['./coercion'].types,'./'+subject.public_types);
   const runtimeMember=subject.members.find(m=>m.path===subject.public_entry),typeMember=subject.members.find(m=>m.path===subject.public_types);assert.ok(runtimeMember&&typeMember);assert.equal(hash(model.sources.get('@angular/cdk/'+subject.public_entry)),runtimeMember.sha256,'portable coercion runtime differs from original evidence');assert.equal(subject.declarations[0].sha256,typeMember.sha256);
   const declarations=[];for(const member of subject.declarations){assert.ok(!member.path.startsWith('/'),'declarations must be repository-owned');const bytes=read(member.path);assert.equal(hash(bytes),member.sha256);assert.equal(bytes.length,member.bytes);const source=ts.createSourceFile(member.path,bytes.toString(),ts.ScriptTarget.Latest,true);assert.equal(source.parseDiagnostics.length,0);for(const node of source.statements)if(ts.isFunctionDeclaration(node)&&node.name?.text==='coerceBooleanProperty')declarations.push({source,node});}assert.equal(declarations.length,1);const {source,node}=declarations[0];assert.equal(hash(node.getText(source)),recorded.declaration_sha256);assert.ok(!ts.getJSDocTags(node).some(t=>['deprecated','docs-private','breaking-change'].includes(t.tagName.text)));
   const runtime=await import(pathToFileURL(join(model.root,'node_modules/@angular/cdk',subject.public_entry)).href);assert.equal(typeof runtime.coerceBooleanProperty,'function');models.push({line:model.line,runtime});
  }
  const tagged=models.find(m=>m.line==='original'),behavior=models.filter(m=>m!==tagged).map(m=>({line:m.line,...coercionBehavior(m.runtime,tagged.runtime)}));equal(behavior,body.public_behavior,'portable genuine normalization changed');return body;
 }finally{loaded.dispose();}
}
export async function computeSnackContextWrites({root=process.cwd(),read=rawRead(root),acceptRecipe=false}={}){
 const prior=snackDomContextPrior({root,read}),qualification=qualifyIndependentSnackProductDelta({root,read}),writes=new Map(),entries=new Map(),recipe=[],reports=new Map(prior.reports.map(m=>[m.path,m]));
 const all=execFileSync('git',['--no-replace-objects','-c','gc.auto=0','ls-files','projects/ngx-material-legacy'],{cwd:root,encoding:'utf8'}).trim().split('\n'),paths=candidateProductSourcePaths(root).sort(),sourcePaths=()=>paths;
 assert.equal(all.length,1142);assert.equal(paths.length,1029);
 function store(path,old,body){if(old.reviews)equal(body.reviews,old.reviews,'original complete reviews changed '+path);for(const key of ['hunk_reviews','diff','diff_sha256','decision','prior_entry','final_disposition'])if(Object.hasOwn(old,key))equal(body[key],old[key],'original judgment changed '+path+'.'+key);recipe.push({path,deltas:differences(old,body)});const bytes=Buffer.from(json(body));writes.set(path,bytes);return bytes;}
 for(const member of prior.reports.filter(m=>m.path.startsWith('compatibility/rc/tab-adapter-product-inventory-'))){
  assert.equal(hash(read(member.path)),member.sha256);const old=JSON.parse(member.text),family=member.path.slice('compatibility/rc/tab-adapter-product-inventory-'.length,-5),path=prefix+family+'.json';let body=structuredClone(old),proof;
  if(family==='build'){equal(body.candidate_context.tracked_product_paths,all,'product membership changed');const changed=body.candidate_context.product_members.filter(m=>hash(read(m.path))!==m.sha256);equal(changed.map(m=>m.path).sort(),[SNACK_SOURCE,DIALOG_PORTAL_SOURCE].sort(),'unexpected build context product deltas');for(const m of changed)assert.equal(m.sha256,(m.path===SNACK_SOURCE?qualification.delta:qualification.dialog.delta).before_sha256);body.candidate_context.product_members=all.map(path=>({path,sha256:hash(read(path)),bytes:read(path).length}));}
  else if(family==='test-consolidation'){body.candidate_context={path:prefix+'build.json',sha256:hash(writes.get(prefix+'build.json'))};for(const m of body.historical_suite_context)assert.equal(hash(read(m.path)),m.sha256);}
  else if(family==='slider-input')body.source_scope=reviewSliderInputScope(read,sourcePaths,prior.line);
  else if(family==='slider-range')body.source_scope=reviewSliderRangeScope(read,sourcePaths,prior.line);
  else if(family==='slider-destroy')body.source_scope=reviewSliderThumbDestroyScope(read,sourcePaths,prior.line);
  else if(family==='bazel')body.candidate_context=reviewBazelBuildContext(read,()=>all,prior.line);
  else if(family==='modern-chip'){body.candidate_context=modernChipSourceContext(read,paths);proof=row=>modernChipSourceProof(row.original_analysis,body.candidate_context,row.decision);}
  else if(family==='chip-lifecycle'){body=chipLifecycleSourceBody(read,root,prior.line);proof=row=>chipLifecycleSourceProof(row.original_analysis,body.candidate_context,row.decision,historicalBehaviorRequirements(row.sha),read);}
  else{assert.ok(api[family]);body=api[family][0](read,paths,prior.line);proof=row=>api[family][1](row.original_analysis,body.candidate_context,row.decision);}
  const bytes=store(path,old,body);
  for(const before of prior.selected.filter(e=>e.evidence_report===member.path)){const entry=structuredClone(before);entry.evidence_report=path;if(entry.source_check?.evidence_report_sha256)entry.source_check.evidence_report_sha256=hash(bytes);if(proof){const row=body.reviews.find(r=>r.sha===entry.sha);assert.ok(row);entry.individual_proof=proof(row);}entries.set(entry.sha,entry);}
 }
 assert.equal(entries.size,75);
 for(const before of prior.native.filter(e=>e.individual_proof.generated_identity_behavior)){
  const member=reports.get(before.evidence_report);assert.equal(hash(read(member.path)),member.sha256);const old=JSON.parse(member.text),entry=structuredClone(before),body=structuredClone(old),scope=entry.individual_proof.generated_identity_behavior;
  const changed=scope.source_members.filter(m=>hash(read(m.path))!==m.sha256);assert.equal(changed.length,1);assert.equal(changed[0].path,SNACK_SOURCE);assert.equal(changed[0].sha256,qualification.delta.before_sha256);changed[0].sha256=qualification.delta.sha256;
  equal(scope.case_ids,before.individual_proof.generated_identity_behavior.case_ids);body.individual_proof=structuredClone(entry.individual_proof);body.snack_dom_source_requalification={qualification,prior_review:{path:member.path,sha256:member.sha256},original_hunks_judgment_and_runtime_requirement_preserved:true,actual_native_packed_or_floor_qualified:false};
  const path=prefix+'native-'+entry.sha+'.json',bytes=store(path,old,body);entry.evidence_report=path;entry.source_check.evidence_report_sha256=hash(bytes);entries.set(entry.sha,entry);
 }
 assert.equal(entries.size,78);
 const dialog=dialogPortalPrior(root,read),portal=portalRolePrior({root,read}),cases=[],authRows=new Map(),addedRows=new Map();
 assert.equal(dialog.line,prior.line);assert.equal(portal.line,prior.line);
 for(const member of dialog.source_reviews){assert.equal(hash(read(member.path)),member.sha256,'changed original dialog review');reports.set(member.path,member);}
 const rebound=[...prior.authored_rows.map(row=>({row,parent:prior.source_parent})),...dialog.selected_closed_source_rows.map(({ledger,...row})=>({row,parent:dialog.source_parent}))];assert.equal(rebound.length,27);assert.equal(new Set(rebound.map(x=>useId(x.row))).size,27);
 for(const {row,parent} of rebound){const member=reports.get(row.source_review.path);assert.ok(member);assert.equal(hash(read(member.path)),member.sha256);const matches=JSON.parse(member.text).reviews.filter(r=>useId(r)===useId(row));assert.equal(matches.length,1);const before=matches[0],current=structuredClone(before),path='projects/ngx-material-legacy/'+row.file,isSnack=path===SNACK_SOURCE,isDialog=path===DIALOG_PORTAL_SOURCE;
  assert.equal(before.candidate_source_sha256,isSnack?qualification.delta.before_sha256:isDialog?qualification.dialog.delta.before_sha256:hash(read(path)));current.candidate_source_sha256=hash(read(path));current.prior_source_context={review:row.source_review,case:before};
  current.decision+=isDialog?' The independently tested three-callback portal repair now uses the stable direct component/template attachment methods and restores historical DOM failure ownership. The original role conclusion remains; complete current caller members are recorded where the original review used them. The160-case public proof supports these changed operations,without granting whole inherited dialog API,focus,component,native,packed or floor equivalence.':' The independently tested public snack DOM dispatch and host recovery repair changes only attachDomPortal. The other31 complete class members,constructors,imports and product resources remain identical. This successor retains the original role decision and evidence; it does not qualify full component,native,packed or floor execution.';
  if(isDialog&&before.source_role)current.source_role=currentCoreRoleOccurrences(read(path).toString(),row);
  const evidence=new Map(current.independent_evidence.map(m=>[m.path,m]));if(!isSnack&&!isDialog){assert.ok(evidence.has('scripts/chip-focus-contract.mjs'));for(const path of ['scripts/chip-focus-contract.mjs','scripts/tab-adapter-product-inventory-context.mjs']){assert.ok(evidence.has(path));evidence.set(path,{path,sha256:hash(read(path))});}}
  const q=isDialog?qualification.dialog:qualification;
  for(const m of [q.qualification,{path:isDialog?'compatibility/rc/dialog-portal-failure-recovery-prior.json.gz':'compatibility/rc/snack-dom-source-context-prior.json.gz',sha256:hash(read(isDialog?'compatibility/rc/dialog-portal-failure-recovery-prior.json.gz':'compatibility/rc/snack-dom-source-context-prior.json.gz'))}])evidence.set(m.path,m);
  current.independent_evidence=[...evidence.values()];current.portal_source_requalification={qualification:q,original_complete_case_preserved:true,current_source_roles_recomputed:!!(isDialog&&before.source_role),actual_native_packed_or_floor_qualified:false};cases.push(current);
 }
 const authBytes=Buffer.from(json({schema_version:1,line:prior.line,status:'reviewed',criteria:'Twenty-seven existing source-bound roles requalified:eleven snack,one chip NgZone,fifteen dialog. Both independently tested portal repairs preserve the recorded scopes; complete original cases remain embedded and original reports stay untouched.',reviews:cases,new_semantic_closures:0,actual_native_packed_or_floor_qualified:false,g11_claim:'not-passed'}));writes.set(authPath,authBytes);
 const reboundRows=new Map();for(const {row,parent} of rebound)reboundRows.set(useId(row),{...row,source_review:{path:authPath,sha256:hash(authBytes)},source_review_history:[...(row.source_review_history??[]),{source_parent:parent,prior_source_review:row.source_review,reason:'Exact independently qualified portal callback source successor; original complete role retained.'}]});
 const portalPath='compatibility/f10/authored-use-reviews/portal-caller-roles.json',portalBody=preparePortalRoleReview({root,read,typeProofPath:'compatibility/rc/portal-caller-roles-public-'+(prior.line==='main'?'main':'21')+'.json'});equal(JSON.parse(read(portalPath)),portalBody,'changed individual portal review');
 const closureRows=new Map();for(const selected of portal.selected){const row=selected.original_row;assert.equal(row.disposition,'open');closureRows.set(useId(row),{...row,status:'reviewed',disposition:'closed',source_review:{path:portalPath,sha256:hash(read(portalPath))}});}
 const additionalReviews=[];
 for(const [preparePrior,inspect,path,count]of [[tableCoercionPrior,inspectPortableTableCoercion,TABLE_COERCION_REVIEW,3],[platformCallerPrior,inspectPlatformCallerReview,PLATFORM_CALLER_REVIEW,4],[coreTokenCallerPrior,inspectCoreTokenCallerReview,CORE_TOKEN_CALLER_REVIEW,5],[remainingCorePrior,inspectRemainingCoreReview,REMAINING_CORE_REVIEW,16],[materialCorePrior,inspectMaterialCoreReview,MATERIAL_CORE_REVIEW,37],[cdkModuleTypePrior,inspectCdkModuleTypeReview,CDK_MODULE_TYPE_REVIEW,14],[layoutServicePrior,inspectLayoutServiceReview,LAYOUT_SERVICE_REVIEW,13]]){
  const prepared=preparePrior({root,read}),review=await inspect({root,read});assert.equal(prepared.line,prior.line);assert.equal(review.reviews.length,count);const ref={path,sha256:hash(read(path))};
  const originals=new Map(prior.ledgers.filter(m=>m.path.includes("authored-dependency-")).map(m=>[m.path,JSON.parse(m.text).symbol_uses]));
  for(const selected of prepared.selected){const row=selected.original_row,old=originals.get(selected.ledger).find(r=>useId(r)===useId(row)),currentCase=review.reviews.find(r=>useId(r)===useId(row));assert.ok(old&&currentCase);assert.equal(row.disposition,'open');assert.equal(old.disposition,'open');assert.equal(currentCase.candidate_source_sha256,hash(read('projects/ngx-material-legacy/'+row.file)));assert.equal(closureRows.has(useId(row)),false);closureRows.set(useId(row),{...row,status:'reviewed',disposition:'closed',source_review:ref});}
  additionalReviews.push({...ref,individual_source_closures:count,source_parent:prepared.source_parent,...(path===REMAINING_CORE_REVIEW?{frozen_source_closures:9,additional_source_closures:7}:path===MATERIAL_CORE_REVIEW?{frozen_source_closures:16,additional_source_closures:21}:path===CDK_MODULE_TYPE_REVIEW?{frozen_source_closures:12,additional_source_closures:2}:path===LAYOUT_SERVICE_REVIEW?{frozen_source_closures:11,additional_source_closures:2}:{})});
 }
 assert.equal(additionalReviews.reduce((n,r)=>n+r.individual_source_closures,0),92);
 const shaLedger=prior.ledgers.find(m=>m.path.includes('disposition-ledger/')),frozen=prior.ledgers.find(m=>m.path.endsWith('/authored-dependency-dispositions.json')),added=prior.ledgers.find(m=>m.path.endsWith('/authored-dependency-current-dispositions.json'));
 const current=scanCurrentAuthoredUses({root}),oldAdded=JSON.parse(added.text),frozenRows=JSON.parse(frozen.text).symbol_uses,currentRows=new Map(current.symbol_uses.map(row=>[useId(row),row]));
 for(const row of frozenRows){const replacement=reboundRows.get(useId(row))??closureRows.get(useId(row));if(replacement)authRows.set(useId(row),replacement);}
 for(const row of oldAdded.symbol_uses){const fresh=currentRows.get(useId(row));assert.ok(fresh);if(row.file!=='legacy-dialog/internal/dialog-container-base.ts'){assert.equal(row.candidate_source_sha256,fresh.candidate_source_sha256);equal(row.occurrences,fresh.occurrences);if(!closureRows.has(useId(row)))continue;}
  const replacement=reboundRows.get(useId(row))??closureRows.get(useId(row))??row;addedRows.set(useId(row),{...replacement,candidate_source_sha256:fresh.candidate_source_sha256,occurrences:fresh.occurrences});
 }
 assert.equal(authRows.size,82);assert.equal(addedRows.size,67);assert.equal(closureRows.size,117);
 // Header and source snapshot edits are explicit,finite and reversible in preservation tests.
 function fields(bytes,path,updates){const text=bytes.toString(),source=ts.parseJsonText(path,text),properties=source.statements[0].expression.properties,edits=updates.map(([key,value])=>{const node=properties.find(p=>p.name.text===key).initializer;return {start:node.getStart(source),end:node.end,text:JSON.stringify(value,null,2)};});let result=text;for(const e of edits.sort((a,b)=>b.start-a.start))result=result.slice(0,e.start)+e.text+result.slice(e.end);return Buffer.from(result);}
 writes.set(shaLedger.path,replaceRows(shaLedger,'entries',entries,r=>r.sha));
 writes.set(frozen.path,fields(replaceRows(frozen,'symbol_uses',authRows,useId),frozen.path,[['reviewed_uses',1558],['open_uses',178],['note','Frozen1736-use denominator retained. Twenty portal,nine remaining Core,16 Material-core,12 CDK module/type and11 layout/media/scroll caller decisions integrated; existing27 source bindings retain their qualified snack/dialog contexts. Valid reviewed uses1558; open178. Native,packed,consumer,floors and G11 remain separate.']]));
 writes.set(added.path,fields(replaceRows(added,'symbol_uses',addedRows,useId),added.path,[['current_source_population_sha256',current.source_population_sha256],['source_snapshot_history',[...(oldAdded.source_snapshot_history??[]),{source_parent:prior.source_parent,prior_source_population_sha256:oldAdded.current_source_population_sha256,current_source_population_sha256:current.source_population_sha256,reason:'Exact independently qualified snack/dialog callbacks; all1965 current routes and315 additional obligations retained. All27 additional dialog source snapshots refreshed; five individually reviewed portal roles,12 coercion/Platform/Core caller roles,seven remaining Core,21 Material-core,two CDK module/type and two layout/media/scroll additional roles closed.',new_semantic_closures:49}]]]));
 const admission=currentAuthoredUseAdmission({current,frozen:JSON.parse(writes.get(frozen.path)).symbol_uses,candidate:JSON.parse(writes.get(added.path)),line:prior.line,readMember:p=>writes.get(p)??read(p)});assert.equal(admission.source_snapshot_valid,true);assert.equal(admission.current_uses,1965);assert.equal(admission.current_source_files,532);assert.equal(admission.additional_uses,315);assert.equal(admission.inventory.complete,true);assert.equal(admission.review_evidence.reviewed,243);assert.equal(admission.review_evidence.insufficient,0);
 const recipeBytes=Buffer.from(json({schema_version:1,line:prior.line,source_parent:prior.source_parent,original_reports_and_judgments_preserved:true,reviewed_context_deltas:recipe,additional_individual_caller_reviews:additionalReviews,new_semantic_closures:117,g11_claim:'not-passed'}));if(!acceptRecipe)assert.equal(hash(read(SNACK_CONTEXT_RECIPE)),hash(recipeBytes),'unreviewed source context differences');writes.set(SNACK_CONTEXT_RECIPE,recipeBytes);assert.equal(writes.size,19);
 return {prior,dialog,portal,qualification,writes,entries,recipe,authRows,addedRows,reboundRows,closureRows,additionalReviews};
}
if(process.argv[1]&&import.meta.url===pathToFileURL(resolve(process.argv[1])).href){assert.equal(process.argv[2],'--prepare');const built=await computeSnackContextWrites({acceptRecipe:true});for(const[path,bytes]of built.writes){if(path.includes('authored-dependency-')||path.endsWith('disposition-ledger/ledger.json'))writeFileSync(path,bytes);else writeFileSync(path,bytes);}console.log(JSON.stringify({line:built.prior.line,writes:built.writes.size,SHA_rows:built.entries.size,authored_bindings:27,additional_caller_closures:92,remaining_Core_closures:16,Material_core_closures:37,CDK_module_type_closures:14,layout_service_closures:13,new_semantic_closures:117}));}
