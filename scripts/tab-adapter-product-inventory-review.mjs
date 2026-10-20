/**
 * @license
 * Copyright Google LLC All Rights Reserved.
 * Copyright (c) 2026 Ryan Lester.
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.io/license
 */
/** Exact source-population successors; original decisions and native gates stay required. */
import assert from 'node:assert/strict';
import {coreViewRolePreviousReader} from './core-view-use-current-roles-context.mjs';
import {readFileSync,writeFileSync} from 'node:fs';
import {createHash} from 'node:crypto';
import {execFileSync} from 'node:child_process';
import {createRequire} from 'node:module';
import {gunzipSync} from 'node:zlib';
import {join,resolve} from 'node:path';
import {pathToFileURL} from 'node:url';
import {isDeepStrictEqual} from 'node:util';
import {candidateProductSourcePaths} from './upstream-candidate-source-evidence.mjs';
import {qualifyIndependentTabProductDelta} from './tab-adapter-product-inventory-context.mjs';
import {buildScopeEvidenceOk} from './upstream-build-scope-evidence.mjs';
import {testConsolidationBatchOk,testConsolidationEntryOk} from './upstream-test-consolidation-evidence.mjs';
import {reviewSliderInputScope,sliderInputScopeEvidenceOk} from './upstream-slider-input-scope.mjs';
import {reviewSliderRangeScope,sliderRangeEvidenceOk} from './upstream-slider-range-followups.mjs';
import {reviewSliderThumbDestroyScope,sliderThumbDestroyEvidenceOk} from './upstream-slider-thumb-destroy-scope.mjs';
import {reviewBazelBuildContext,bazelBuildEvidenceOk} from './upstream-bazel-build-scope.mjs';
import {modernChipSourceContext,modernChipSourceProof,modernChipScopeEvidenceOk} from './upstream-modern-chip-scope.mjs';
import {chipEditSourceBody,chipEditSourceProof,chipEditScopeEvidenceOk} from './upstream-chip-edit-scope.mjs';
import {chipInputApiSourceBody,chipInputApiSourceProof,chipInputApiScopeEvidenceOk} from './upstream-chip-input-api-scope.mjs';
import {chipModernizationSourceBody,chipModernizationSourceProof,chipModernizationScopeEvidenceOk} from './upstream-chip-modernization-scope.mjs';
import {chipLifecycleSourceBody,chipLifecycleSourceProof,chipLifecycleScopeEvidenceOk} from './upstream-chip-lifecycle-admission.mjs';
import {authoredUseReviewEvidence} from './authored-use-inventory.mjs';
import {historicalBehaviorRequirements,validateHistoricalBehavior} from './upstream-historical-behavior-evidence.mjs';
const ts=createRequire(import.meta.url)('typescript'),hash=b=>createHash('sha256').update(b).digest('hex'),json=v=>JSON.stringify(v,null,2)+'\n';
export const INVENTORY_PRIOR='compatibility/rc/tab-adapter-product-inventory-prior.json.gz';
const pins={main:'a17526c90dbe1048ba0e5241d044b40465118bfc1492dde04f057419f6713aeb','21.x':'9e92fa6a3a5901bb8efeadd4d579bdd71b9e6dd88c59aaa70ce6e42d5e79e1fe'};
const prefix='compatibility/rc/tab-adapter-product-inventory-',ledgerPath='compatibility/f10/disposition-ledger/ledger.json',defaultRead=root=>p=>readFileSync(join(root,p));
const families={
 'invalid-build-scope':['build',14], 'invalid-test-consolidation-scope':['test-consolidation',32],
 'invalid-slider-input-scope':['slider-input',3], 'invalid-slider-range-followup-scope':['slider-range',4],
 'invalid-slider-thumb-destroy-scope':['slider-destroy',1], 'invalid-bazel-build-only-scope':['bazel',2],
 'invalid-modern-chip-source-scope':['modern-chip',3], 'invalid-chip-edit-source-scope':['chip-edit',3],
 'invalid-chip-input-api-source-scope':['chip-input-api',3], 'invalid-chip-modernization-source-scope':['chip-modernization',3],
 'invalid-chip-lifecycle-source-scope':['chip-lifecycle',7],
};
const api={
 'modern-chip':{context:modernChipSourceContext,proof:modernChipSourceProof,validate:modernChipScopeEvidenceOk},
 'chip-edit':{body:chipEditSourceBody,proof:chipEditSourceProof,validate:chipEditScopeEvidenceOk},
 'chip-input-api':{body:chipInputApiSourceBody,proof:chipInputApiSourceProof,validate:chipInputApiScopeEvidenceOk},
 'chip-modernization':{body:chipModernizationSourceBody,proof:chipModernizationSourceProof,validate:chipModernizationScopeEvidenceOk},
};
function git(root,commit,path){return execFileSync('git',['--no-replace-objects','-c','gc.auto=0','-c','maintenance.auto=0','show',commit+':'+path],{cwd:root,maxBuffer:16*1024*1024,env:{...process.env,GIT_NO_LAZY_FETCH:'1'}});}
export function tabAdapterInventoryPrior({root=process.cwd(),read=defaultRead(root)}={}){
 const raw=read(INVENTORY_PRIOR),line=Object.keys(pins).find(k=>hash(raw)===pins[k]);assert.ok(line,'changed tab inventory prior');const prior=JSON.parse(gunzipSync(raw));assert.equal(prior.line,line);assert.equal(prior.selected.length,75);assert.equal(prior.reports.length,11);assert.equal(prior.code_preimages.length,6);assert.equal(prior.native_shas.length,3);
 for(const m of [prior.ledger,...prior.reports,...prior.code_preimages,...prior.product_delta_sources,...prior.qualifications]){assert.equal(hash(m.text),m.sha256);assert.equal(hash(git(root,prior.source_parent,m.path)),m.sha256,'unbound inventory preimage '+m.path);}return prior;
}
function onlyFields(before,after,fields,label){const expected=structuredClone(before);for(const field of fields)expected[field]=after[field];assert.equal(isDeepStrictEqual(after,expected),true,'unqualified context delta '+label);}
function parseRows(text){const source=ts.parseJsonText('ledger.json',text);assert.equal(source.parseDiagnostics.length,0);const array=source.statements[0].expression.properties.find(p=>p.name.text==='entries').initializer;return {source,array};}
export function computeTabAdapterInventoryWrites({root=process.cwd(),read=defaultRead(root)}={}){
 const prior=tabAdapterInventoryPrior({root,read}),qualification=qualifyIndependentTabProductDelta({root,read}),oldLedger=JSON.parse(prior.ledger.text),entries=new Map(),writes=new Map(),notes=[];
 const worksheet=JSON.parse(read('compatibility/rc/tab-adapter-product-inventory-worksheet.json')),all=execFileSync('git',['--no-replace-objects','-c','gc.auto=0','ls-files','projects/ngx-material-legacy'],{cwd:root,encoding:'utf8',env:{...process.env,GIT_NO_LAZY_FETCH:'1'}}).trim().split('\n'),paths=candidateProductSourcePaths(root).sort(),source=()=>paths;
 assert.equal(all.length,1142);assert.equal(paths.length,1029);const changed=qualification.delta[0],added=qualification.delta[1];
 function populationDelta(before,after,label){const expected=before.map(m=>m.path===changed.path?{...m,sha256:changed.sha256,...(Object.hasOwn(m,'bytes')?{bytes:changed.bytes}:{})}:m);assert.ok(!before.some(m=>m.path===added.path));const fresh=after.find(m=>m.path===added.path);assert.ok(fresh);assert.equal(fresh.sha256,added.sha256);assert.ok(Object.keys(fresh).every(k=>['path','sha256','bytes'].includes(k)));expected.push(fresh);expected.sort((a,b)=>a.path<b.path?-1:a.path>b.path?1:0);assert.equal(isDeepStrictEqual(after,expected),true,'unqualified population change '+label);return after;}
 function modernDelta(before,after,label){populationDelta(before.production_and_test_typescript_members,after.production_and_test_typescript_members,label);onlyFields(before,after,['production_and_test_typescript_members'],label);return after;}
 function contextDelta(before,after,label){const expected=structuredClone(before);for(const key of ['modern_type_boundary','current_legacy_owner_boundary','current_legacy_contract'])if(before[key])expected[key]=contextDelta(before[key],after[key],label+'.'+key);for(const key of ['production_and_test_typescript_members','authored_TS_and_resource_members'])if(before[key])expected[key]=populationDelta(before[key],after[key],label+'.'+key);if(before.approved_focus_source_epoch){const epoch=structuredClone(before.approved_focus_source_epoch);epoch.inputs=after.approved_focus_source_epoch.inputs;epoch.current_raw_focus_contract.all_other_product_reference_fixture_members_preserved--;epoch.current_raw_focus_contract.independent_product_delta=qualification;assert.equal(isDeepStrictEqual(epoch,after.approved_focus_source_epoch),true,'unqualified focus epoch delta '+label);expected.approved_focus_source_epoch=epoch;}assert.equal(isDeepStrictEqual(after,expected),true,'unqualified nested chip context delta '+label);return after;}
 for(const [reason,[family,count]]of Object.entries(families)){
  const subjects=worksheet.source_failures.filter(r=>r.reason===reason);assert.equal(subjects.length,count);const previousPaths=[...new Set(subjects.map(r=>r.evidence_report))];assert.equal(previousPaths.length,1);const member=prior.reports.find(r=>r.path===previousPaths[0]);assert.ok(member);assert.equal(hash(read(member.path)),member.sha256,'original inventory report changed');const old=JSON.parse(member.text);let body=structuredClone(old),proof;
  if(family==='build'){
   const c=body.candidate_context;assert.deepEqual([...c.tracked_product_paths,added.path].sort(),all);assert.deepEqual(c.product_members.map(m=>m.path),c.tracked_product_paths);for(const m of c.product_members){assert.equal(hash(read(m.path)),m.path===changed.path?changed.sha256:m.sha256);if(m.path===changed.path)assert.equal(m.sha256,changed.before_sha256);}c.tracked_product_paths=all;c.tracked_product_paths_sha256=hash(all.join('\n')+'\n');c.product_members=all.map(path=>({path,sha256:hash(read(path)),bytes:read(path).length}));
  }else if(family==='test-consolidation'){
   assert.equal(body.candidate_context.path,worksheet.source_failures.find(r=>r.reason==='invalid-build-scope').evidence_report);body.candidate_context={path:prefix+'build.json',sha256:hash(writes.get(prefix+'build.json'))};for(const m of body.historical_suite_context)assert.equal(hash(read(m.path)),m.sha256);
  }else if(family==='slider-input'){
   const value=reviewSliderInputScope(read,source,prior.line);onlyFields(body.source_scope,value,['product_source_files','product_source_population_sha256'],family);body.source_scope=value;
  }else if(family==='slider-range'){
   const value=reviewSliderRangeScope(read,source,prior.line);onlyFields(body.source_scope,value,['producer_sha256','source_members','product_source_population_sha256'],family);body.source_scope=value;
  }else if(family==='slider-destroy'){
   const value=reviewSliderThumbDestroyScope(read,source,prior.line),expected=structuredClone(body.source_scope);expected.retained_architecture.product_source_files=value.retained_architecture.product_source_files;expected.retained_architecture.product_source_population_sha256=value.retained_architecture.product_source_population_sha256;assert.deepEqual(value,expected);body.source_scope=value;
  }else if(family==='bazel'){
   const value=reviewBazelBuildContext(read,()=>all,prior.line);onlyFields(body.candidate_context,value,['product_paths','product_members','product_population_sha256'],family);body.candidate_context=value;
  }else if(family==='modern-chip'){
   const value=modernChipSourceContext(read,paths);modernDelta(body.candidate_context,value,family);body.candidate_context=value;proof=row=>modernChipSourceProof(row.original_analysis,value,row.decision);
  }else if(family==='chip-lifecycle'){
   body=chipLifecycleSourceBody(read,root,prior.line);assert.deepEqual(body.reviews,old.reviews,'chip lifecycle original judgments changed');proof=row=>chipLifecycleSourceProof(row.original_analysis,body.candidate_context,row.decision,historicalBehaviorRequirements(row.sha),read);
  }else{
   body=api[family].body(read,paths,prior.line);assert.deepEqual(body.reviews,old.reviews,'chip original judgments changed '+family);contextDelta(old.candidate_context,body.candidate_context,family);proof=row=>api[family].proof(row.original_analysis,body.candidate_context,row.decision);
  }
  if(body.reviews)assert.deepEqual(body.reviews,old.reviews,'original individual reviews changed '+family);else for(const field of ['hunk_reviews','diff','diff_sha256','decision','prior_entry'])assert.deepEqual(body[field],old[field]);
  const path=prefix+family+'.json',bytes=Buffer.from(json(body));writes.set(path,bytes);
  for(const subject of subjects){const before=prior.selected.find(e=>e.sha===subject.sha);assert.ok(before);const entry=structuredClone(before);entry.evidence_report=path;if(entry.source_check?.evidence_report_sha256)entry.source_check.evidence_report_sha256=hash(bytes);if(proof){const row=body.reviews.find(r=>r.sha===entry.sha);assert.ok(row);entry.individual_proof=proof(row);}entries.set(entry.sha,entry);notes.push({sha:entry.sha,family,previous_report:{path:member.path,sha256:member.sha256},current_report:{path,sha256:hash(bytes)},original_disposition:entry.final_disposition,original_hunks_and_judgments_preserved:true,raw_current_population_requalified:true,actual_native_packed_or_floor_qualified:false});}
 }
 const auxiliaryPath=prefix+'authored-prior.json.gz',auxRaw=read(auxiliaryPath),auxPins={main:'6e09600062bd86cc5ad57e32d46d5525e162962db64e4a9b03e231525bb28888','21.x':'f7a78f23736d03aa7c504dce7fe39e4990e16365b0c73cffb41611cb13559ad5'};assert.equal(hash(auxRaw),auxPins[prior.line]);const aux=JSON.parse(gunzipSync(auxRaw));for(const m of [aux.ledger,aux.report]){assert.equal(hash(m.text),m.sha256);assert.equal(hash(git(root,aux.source_parent,m.path)),m.sha256);}assert.equal(hash(read(aux.report.path)),aux.report.sha256);assert.equal(hash(read('projects/ngx-material-legacy/'+aux.case.file)),aux.case.candidate_source_sha256);
 const evidence=new Map(aux.case.independent_evidence.map(m=>[m.path,m]));evidence.set('scripts/chip-focus-contract.mjs',{path:'scripts/chip-focus-contract.mjs',sha256:hash(read('scripts/chip-focus-contract.mjs'))});for(const m of [aux.selected.source_review,{path:auxiliaryPath,sha256:hash(auxRaw)},qualification.inputs,...[prefix+'focus-inputs.json','scripts/tab-adapter-product-inventory-context.mjs'].map(path=>({path,sha256:hash(read(path))}))])evidence.set(m.path,m);
 const currentCase={...aux.case,decision:aux.case.decision+' The current raw focus inspector now explicitly qualifies the independently tested tab body/adapter source delta. The chip class, all NgZone accesses and the original focus/blur lifetime remain byte-identical; the inspector still hashes every remaining product/reference/fixture member and requires the same original focus protocol. This rebinds evidence only and grants no native,packed,floor or G11 credit.',prior_source_context:{review:aux.selected.source_review,case:aux.case},independent_evidence:[...evidence.values()]},authReviewPath='compatibility/f10/authored-use-reviews/tab-adapter-chip-focus-context-boundary.json',authReview=Buffer.from(json({schema_version:1,line:prior.line,status:'reviewed',criteria:'Exactly one unchanged NgZone caller; its independent raw focus-inspector evidence is requalified after the separately proven tab inventory delta.',reviews:[currentCase],g11_claim:'not-passed'}));writes.set(authReviewPath,authReview);
 const frozen=ts.parseJsonText('frozen.json',aux.ledger.text),nodes=frozen.statements[0].expression.properties.find(p=>p.name.text==='symbol_uses').initializer.elements,matches=nodes.filter(n=>{const row=JSON.parse(n.getText(frozen));return row.file===aux.selected.file&&row.module===aux.selected.module&&row.symbol===aux.selected.symbol;});assert.equal(matches.length,1);const selectedNode=matches[0],next={...aux.selected,source_review:{path:authReviewPath,sha256:hash(authReview)},source_review_history:[...(aux.selected.source_review_history??[]),{prior_source_review:aux.selected.source_review,source_parent:prior.source_parent,reason:'Unchanged chip NgZone use; raw focus inspector source-context successor only.'}]};writes.set(aux.ledger.path,Buffer.from(aux.ledger.text.slice(0,selectedNode.getStart(frozen))+JSON.stringify(next,null,2).replaceAll('\n','\n    ')+aux.ledger.text.slice(selectedNode.end)));
 assert.equal(entries.size,75);const parsed=parseRows(prior.ledger.text),replacements=[];for(const node of parsed.array.elements){const row=JSON.parse(node.getText(parsed.source)),entry=entries.get(row.sha);if(entry)replacements.push({start:node.getStart(parsed.source),end:node.end,text:JSON.stringify(entry,null,2).replaceAll('\n','\n    ')});}assert.equal(replacements.length,75);let ledgerText=prior.ledger.text;for(const r of replacements.sort((a,b)=>b.start-a.start))ledgerText=ledgerText.slice(0,r.start)+r.text+ledgerText.slice(r.end);writes.set(ledgerPath,Buffer.from(ledgerText));
 return {prior,qualification,writes,entries,notes,all,paths};
}
export function validateTabAdapterInventoryScopes({root=process.cwd(),read=defaultRead(root),entries,selected}={}){
 const prior=tabAdapterInventoryPrior({root,read}),worksheet=JSON.parse(read('compatibility/rc/tab-adapter-product-inventory-worksheet.json'));entries??=JSON.parse(read(ledgerPath)).entries;selected??=worksheet.source_failures;const all=execFileSync('git',['--no-replace-objects','ls-files','projects/ngx-material-legacy'],{cwd:root,encoding:'utf8'}).trim().split('\n'),paths=candidateProductSourcePaths(root).sort(),source=()=>paths,cache=new Map(),results=[];
 for(const s of selected){const entry=entries.find(e=>e.sha===s.sha);assert.ok(entry);const body=JSON.parse(read(entry.evidence_report)),family=families[s.reason][0];let ok=false;
  if(family==='build')ok=buildScopeEvidenceOk(body,entry,read,all);
  else if(family==='test-consolidation'){if(!cache.has(entry.evidence_report))cache.set(entry.evidence_report,testConsolidationBatchOk(body,read,all));ok=testConsolidationEntryOk(body,entry,read,cache.get(entry.evidence_report));}
  else if(family==='slider-input')ok=sliderInputScopeEvidenceOk(body,entry,read,source,prior.line);
  else if(family==='slider-range')ok=sliderRangeEvidenceOk(body,entry,read,source,prior.line);
  else if(family==='slider-destroy')ok=sliderThumbDestroyEvidenceOk(body,entry,read,source,prior.line);
  else if(family==='bazel')ok=bazelBuildEvidenceOk(body,entry,read,()=>all,prior.line);
  else if(family==='chip-lifecycle')ok=chipLifecycleScopeEvidenceOk(body,entry,read,root,prior.line,historicalBehaviorRequirements);
  else ok=api[family].validate(body,entry,read,paths,prior.line);
  results.push({sha:entry.sha,family,ok});
 }return results;
}
export function inspectTabAdapterInventory({root=process.cwd(),read=defaultRead(root),validateAll=true}={}){
 read=coreViewRolePreviousReader({root,read});
 const built=computeTabAdapterInventoryWrites({root,read});for(const[path,bytes]of built.writes)assert.equal(hash(read(path)),hash(bytes),'changed exact inventory successor '+path);const authored=authoredUseReviewEvidence(JSON.parse(read('compatibility/f10/authored-dependency-dispositions.json')),built.prior.line,read,hash);assert.equal(authored.reviewed,1464);assert.equal(authored.insufficient,0);const results=validateAll?validateTabAdapterInventoryScopes({root,read}):[];assert.ok(results.every(r=>r.ok),'raw current source scope failed: '+results.filter(r=>!r.ok).map(r=>r.sha).join(','));const native=[];const ledger=JSON.parse(read(ledgerPath));for(const sha of built.prior.native_shas){const entry=ledger.entries.find(e=>e.sha===sha),result=validateHistoricalBehavior({root,entry,proof:entry.individual_proof,request:{line:built.prior.line}});assert.deepEqual(result,{ok:false,detail:'missing coordinator run'});native.push({sha,result});}
 return {schema_version:1,line:built.prior.line,source_scoped_SHA_reviews_requalified:75,authored_evidence_bindings_requalified:1,authored_source_insufficient:0,individual_original_judgments_preserved:75,original_reports_preserved:11,unrelated_SHA_rows_preserved:1622,qualified_independent_product_changes:2,qualified_new_source_files:1,raw_scope_results:results,raw_native_profiles:native,new_semantic_closures:0,actual_native_packed_or_floor_qualified:false,g11_claim:'not-passed'};
}
if(process.argv[1]&&import.meta.url===pathToFileURL(resolve(process.argv[1])).href){const mode=process.argv[2];assert.ok(['--prepare','--inspect'].includes(mode));if(mode==='--prepare'){const built=computeTabAdapterInventoryWrites();for(const[path,bytes]of built.writes)if(path!==ledgerPath&&path!=='compatibility/f10/authored-dependency-dispositions.json')writeFileSync(path,bytes,{flag:'wx'});writeFileSync('/tmp/tab-adapter-ledger-'+(built.prior.line==='main'?'main':'21')+'.json',built.writes.get(ledgerPath),{flag:'wx'});writeFileSync('/tmp/tab-adapter-frozen-'+(built.prior.line==='main'?'main':'21')+'.json',built.writes.get('compatibility/f10/authored-dependency-dispositions.json'),{flag:'wx'});writeFileSync('/tmp/tab-adapter-judgments-'+(built.prior.line==='main'?'main':'21')+'.json',json(built.notes),{flag:'wx'});console.log(JSON.stringify({line:built.prior.line,reports:built.writes.size-2,metadata_writes_prepared:2,ledger_write:'prepared separately',subjects:built.entries.size}));}else console.log(JSON.stringify(inspectTabAdapterInventory()));}
