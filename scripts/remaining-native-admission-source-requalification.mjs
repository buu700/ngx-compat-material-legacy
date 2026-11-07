/**
 * @license
 * Copyright Google LLC All Rights Reserved.
 * Copyright (c) 2026 Ryan Lester.
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.io/license
 */
/** Finite source requalification. Historical judgments and runtime requirements stay intact. */
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {createRequire} from 'node:module';
import {execFileSync} from 'node:child_process';
import {readFileSync,writeFileSync,existsSync} from 'node:fs';
import {gunzipSync} from 'node:zlib';
import {dirname,resolve} from 'node:path';
import {fileURLToPath,pathToFileURL} from 'node:url';
import {candidateProductSourcePaths} from './upstream-candidate-source-evidence.mjs';
import {buildScopeEvidenceOk} from './upstream-build-scope-evidence.mjs';
import {testConsolidationBatchOk,testConsolidationEntryOk} from './upstream-test-consolidation-evidence.mjs';
import {reviewSliderInputScope,sliderInputScopeEvidenceOk} from './upstream-slider-input-scope.mjs';
import {reviewSliderThumbDestroyScope,sliderThumbDestroyEvidenceOk} from './upstream-slider-thumb-destroy-scope.mjs';
import {reviewBazelBuildContext,bazelBuildEvidenceOk} from './upstream-bazel-build-scope.mjs';
import {artifactBehaviorRequirements} from './upstream-artifact-behavior-evidence.mjs';
import {historicalBehaviorRequirements} from './upstream-historical-behavior-evidence.mjs';
import {progressCspRequirements} from './upstream-progress-csp-evidence.mjs';
import {generatedIdentityRequirements} from './upstream-generated-identity-evidence.mjs';
import {bidiBehaviorRequirements} from './upstream-bidi-evidence.mjs';
import {selectionBehaviorRequirements} from './upstream-selection-evidence.mjs';
import {authoredUseReviewEvidence} from './authored-use-inventory.mjs';
import {scanCurrentAuthoredUses,currentAuthoredUseAdmission} from './authored-current-use-inventory.mjs';
const ts=createRequire(import.meta.url)('typescript'),rootDefault=resolve(dirname(fileURLToPath(import.meta.url)),'..');
export const REMAINING_NATIVE_SOURCE_INPUTS='compatibility/rc/remaining-native-admission-source-inputs.json';
const pins={main:'cac82c2c3b1df2b94d1c7ee1a9b6e7e2a7af4204cce0720c75eb7d20b8c3190d','21.x':'4fc2837d8522c891df277eda3cf3a63cf56f6c657e4ae5c113390f7d943da727'};
const productPrefix='projects/ngx-material-legacy/',tab=productPrefix+'legacy-tabs/internal/tab-body-base.ts';
const ledgerPath='compatibility/f10/disposition-ledger/ledger.json',frozenPath='compatibility/f10/authored-dependency-dispositions.json';
const currentPath='compatibility/f10/authored-dependency-current-dispositions.json';
const proofPath='compatibility/rc/remaining-native-admission-source-proof.json',rolesPath='compatibility/rc/remaining-native-admission-tab-public-roles.json';
const rolePath='compatibility/f10/authored-use-reviews/remaining-native-tab-requalified-boundaries.json';
const names=['closeout-fourteen-build-scope-review','closeout-test-consolidation-source-review','closeout-three-slider-input-source-review',
  'closeout-slider-thumb-destroy-review','closeout-bazel-build-only-review'];
const scopePaths=names.map(name=>'compatibility/f10/disposition-ledger/evidence/'+name+'.json');
const hash=bytes=>createHash('sha256').update(bytes).digest('hex'),json=value=>Buffer.from(JSON.stringify(value,null,2)+'\n');
const key=row=>JSON.stringify([row.file,row.module,row.symbol]);
const noPopulation=value=>Object.fromEntries(Object.entries(value).filter(([name])=>name!=='product_source_population_sha256'));
const insertion=`      const content = this._contentElement?.nativeElement;
      if (content?.style.visibility === 'hidden') {
        // The historical hidden-style selector uses display:none. Reveal the
        // attached content at its old offscreen transform before Angular applies
        // the centered class; otherwise the browser cannot start a transition.
        content.style.removeProperty('visibility');
        content.getBoundingClientRect();
      }
      if (this._pendingTransition !== transition || this._destroyed) {
        return;
      }
`;
function patchJson(text,replacements){
  const file=ts.parseJsonText('review.json',text);assert.equal(file.parseDiagnostics.length,0);
  const object=file.statements[0].expression,edits=[];
  for(const[name,value]of Object.entries(replacements)){
    const property=object.properties.find(node=>node.name.text===name);assert.ok(property,'missing JSON field '+name);
    const indent=' '.repeat(file.getLineAndCharacterOfPosition(property.getStart(file)).character);
    edits.push({start:property.initializer.getStart(file),end:property.initializer.end,text:JSON.stringify(value,null,2).replaceAll('\n','\n'+indent)});
  }
  for(const edit of edits.sort((a,b)=>b.start-a.start))text=text.slice(0,edit.start)+edit.text+text.slice(edit.end);
  return text;
}
function patchRows(text,field,updates){
  const file=ts.parseJsonText('rows.json',text),array=file.statements[0].expression.properties.find(node=>node.name.text===field).initializer,edits=[];
  for(const node of array.elements){const row=JSON.parse(node.getText(file)),value=updates.get(field==='entries'?row.sha:key(row));if(!value)continue;
    const indent=' '.repeat(file.getLineAndCharacterOfPosition(node.getStart(file)).character);
    edits.push({start:node.getStart(file),end:node.end,text:JSON.stringify(value,null,2).replaceAll('\n','\n'+indent)});
  }
  assert.equal(edits.length,updates.size);
  for(const edit of edits.reverse())text=text.slice(0,edit.start)+edit.text+text.slice(edit.end);return Buffer.from(text);
}
function appendContext(text,context){
  const position=text.lastIndexOf('\n}');assert.ok(position>0);
  return Buffer.from(text.slice(0,position)+',\n  "remaining_native_context_requalification": '+JSON.stringify(context,null,2).replaceAll('\n','\n  ')+text.slice(position));
}

/** Whole-source delta plus independently checker-bound original public import roles. */
export function reviewTabLayoutRoles(beforeText,currentText,rows){
  assert.equal(currentText.split(insertion).length,2,'unexpected tab layout insertion');
  assert.equal(currentText.replace(insertion,''),beforeText,'unreviewed tab source delta');
  const parse=text=>{const file=ts.createSourceFile(tab,text,ts.ScriptTarget.Latest,true);assert.equal(file.parseDiagnostics.length,0);return file;};
  const before=parse(beforeText),current=parse(currentText);
  const print=(node,file)=>node.getText(file);
  const owner=file=>file.statements.find(node=>ts.isClassDeclaration(node)&&node.name?.text==='_MatTabBodyBase');
  const previous=owner(before),next=owner(current);assert.ok(previous&&next);
  assert.equal(before.text.slice(previous.getStart(before),previous.members.pos),current.text.slice(next.getStart(current),next.members.pos),'tab metadata/heritage changed');
  assert.equal(previous.members.length,next.members.length);let unchanged=0;
  for(const[index,member]of previous.members.entries()){
    const other=next.members[index];assert.equal(member.kind,other.kind);assert.equal(member.name?.getText(before),other.name?.getText(current));
    if(member.name?.getText(before)==='_startTransition'){
      assert.ok(member.modifiers.some(node=>node.kind===ts.SyntaxKind.PrivateKeyword));
      assert.equal(before.text.slice(member.getStart(before),member.body.getStart(before)),current.text.slice(other.getStart(current),other.body.getStart(current)));
    }else{assert.equal(member.getText(before),other.getText(current),'tab member changed');unchanged++;}
  }
  const collect=(file,row)=>{
    const imports=file.statements.filter(ts.isImportDeclaration).filter(node=>node.moduleSpecifier.text===row.module)
      .flatMap(node=>(node.importClause?.namedBindings?.elements||[]).filter(item=>(item.propertyName||item.name).text===row.symbol).map(item=>({node,item})));
    assert.equal(imports.length,1,'missing public tab import');const {node,item}=imports[0];
    const host={getSourceFile:name=>name===tab?file:undefined,getDefaultLibFileName:()=>'',writeFile:()=>{},getCurrentDirectory:()=>'',getDirectories:()=>[],
      fileExists:name=>name===tab,readFile:name=>name===tab?file.text:undefined,getCanonicalFileName:name=>name,useCaseSensitiveFileNames:()=>true,getNewLine:()=> '\n'};
    const checker=ts.createProgram([tab],{noResolve:true,noLib:true},host).getTypeChecker(),binding=checker.getSymbolAtLocation(item.name),references=[];assert.ok(binding);
    const visit=n=>{if(ts.isIdentifier(n)&&n!==item.name&&checker.getSymbolAtLocation(n)===binding)references.push({kind:ts.SyntaxKind[n.parent.kind],text:print(n.parent,file)});ts.forEachChild(n,visit);};visit(file);
    return {module:row.module,symbol:row.symbol,local:item.name.text,type_only:!!(node.importClause.isTypeOnly||item.isTypeOnly),references};
  };
  assert.equal(rows.length,13);assert.equal(new Set(rows.map(key)).size,13);
  const roles=rows.map(row=>{const prior=collect(before,row),actual=collect(current,row);assert.deepEqual(actual,prior,'public tab binding role changed');return {file:row.file,...actual};});
  return {before_sha256:hash(beforeText),current_sha256:hash(currentText),changed_private_method:'_startTransition',inserted_text:insertion,
    whole_source_recovered_exactly:true,unchanged_members:unchanged,public_constructor_and_metadata_unchanged:true,roles,
    new_native_dom_operations:['ElementRef<HTMLElement>.nativeElement','HTMLElement.style.visibility','CSSStyleDeclaration.removeProperty(visibility)','HTMLElement.getBoundingClientRect()'],
    scope:'Only the existing public ElementRef payload is unwrapped. Standard owned HTMLElement layout/style operations stage the incoming pane; no new upstream import, API, decorator or constructor flag. Lifecycle/style diagnostics remain distinct from packed/native qualification.'};
}

/** Historical inputs may remain byte-identical or equal this exact proposed
 * state. Caller-supplied corruption is never replaced with a frozen subject. */
export function assertRemainingNativeMetadataState({root=rootDefault,previous,writes,read}){
  const paths=new Set([...previous.keys(),...writes.keys()]);
  for(const path of paths){
    if(!path.startsWith('compatibility/f10/'))continue;
    const before=previous.get(path),next=writes.get(path);
    if(before)assert.ok(read(path).equals(before)||(next&&read(path).equals(next)),'live source review/disposition changed: '+path);
    else if(existsSync(resolve(root,path)))assert.ok(next&&read(path).equals(next),'new source review changed: '+path);
  }
}

export function inspectRemainingNativeSourceRequalification({root=rootDefault,readMember}={}){
  const read=path=>readMember?readMember(path):readFileSync(resolve(root,path));
  const inputBytes=read(REMAINING_NATIVE_SOURCE_INPUTS),inputs=JSON.parse(inputBytes);assert.equal(hash(inputBytes),pins[inputs.line],'native source inputs changed');
  const load=ref=>{const bytes=read(ref.path);assert.equal(hash(bytes),ref.sha256,'native preceding archive changed');const data=JSON.parse(gunzipSync(bytes));
    assert.equal(data.line,inputs.line);assert.equal(data.source_parent,inputs.release_reference_parent);return data;};
  const prior=load(inputs.prior),supplement=load(inputs.supplement),line=inputs.line;
  const previous=new Map();for(const row of [...prior.members,...prior.review_subjects,...supplement.source_members,...supplement.review_subjects]){
    assert.equal(hash(row.text),row.sha256,'preceding source/review bytes changed');if(previous.has(row.path))assert.equal(previous.get(row.path).toString(),row.text);previous.set(row.path,Buffer.from(row.text));
  }
  const oldRead=path=>previous.get(path)||read(path),writes=new Map();
  for(const ref of [...inputs.current_sources,...inputs.implementation_evidence])assert.equal(hash(read(ref.path)),ref.sha256,'tested current source/evidence changed: '+ref.path);
  const currentSourcePaths=new Set(inputs.current_sources.map(row=>row.path));
  for(const row of prior.members)if(!currentSourcePaths.has(row.path))assert.equal(hash(read(row.path)),row.sha256,'unreviewed preceding source change: '+row.path);
  assert.equal(JSON.parse(read(productPrefix+'package.json')).version.startsWith('21.')?'21.x':'main',line);
  const implementation=Object.fromEntries(inputs.implementation_evidence.map(ref=>[ref.path,ref]));
  const lifecycle=JSON.parse(read('compatibility/rc/remaining-native-admission-tab-lifecycle.json'));
  assert.equal(lifecycle.source_sha256,hash(read(tab)));assert.equal(lifecycle.passed,29);assert.equal(lifecycle.failed,0);assert.equal(lifecycle.mutants.length,12);
  const dispatch=JSON.parse(read('compatibility/rc/remaining-native-admission-root-dispatch-controls.json'));
  assert.equal(dispatch.actual_root_cli_cases,25);assert.equal(dispatch.root_sha256,hash(read('scripts/check-upstream-audit-disposition.mjs')));
  assert.equal(dispatch.actual_native_packed_or_floor_qualified,false);
  const oldLedger=JSON.parse(oldRead(ledgerPath)),oldFrozen=JSON.parse(oldRead(frozenPath)),oldCurrent=JSON.parse(oldRead(currentPath));
  assert.equal(oldLedger.entries.length,1697);assert.equal(oldFrozen.symbol_uses.length,1736);assert.equal(oldCurrent.symbol_uses.length,308);
  const affected=[...oldFrozen.symbol_uses,...oldCurrent.symbol_uses].filter(row=>row.file==='legacy-tabs/internal/tab-body-base.ts'&&row.status==='reviewed'&&row.disposition==='closed');
  assert.equal(affected.length,13);assert.equal(authoredUseReviewEvidence({symbol_uses:affected},line,oldRead,hash).insufficient,0);
  const roles=reviewTabLayoutRoles(oldRead(tab).toString(),read(tab).toString(),affected);writes.set(rolesPath,json({schema_version:1,line,...roles,actual_packed_native_or_floor_qualified:false}));
  const tracked=execFileSync('git',['-c','gc.auto=0','-c','maintenance.auto=0','ls-tree','-r','-z',inputs.release_reference_parent,'--','projects/ngx-material-legacy'],{cwd:root})
    .toString().split('\0').filter(Boolean).map(record=>{const[meta,path]=record.split('\t'),[mode,kind,blob]=meta.split(' '),bytes=read(path);
      assert.equal(mode,'100644');assert.equal(kind,'blob');if(path!==tab)assert.equal(createHash('sha1').update('blob '+bytes.length+'\0').update(bytes).digest('hex'),blob,'unreviewed product change: '+path);
      return {path,sha256:hash(bytes),bytes:bytes.length};});
  assert.equal(tracked.length,1141);const productPaths=tracked.map(row=>row.path),sourcePaths=candidateProductSourcePaths(root);
  assert.deepEqual(sourcePaths.sort(),productPaths.filter(path=>/\.(ts|scss|css|html)$/.test(path)).sort());
  const referenceDocs=scopePaths.map(path=>JSON.parse(oldRead(path))),[build,,slider,thumb,bazel]=referenceDocs;
  assert.deepEqual(build.candidate_context.tracked_product_paths,productPaths);
  for(const ref of [...build.candidate_context.files,...bazel.candidate_context.files,...bazel.candidate_context.pack_module_graph]){
    assert.equal(hash(read(ref.path)),ref.sha256,'build input/module changed');assert.equal(read(ref.path).length,ref.bytes);
  }
  const sourceEntries=oldLedger.entries.filter(entry=>scopePaths.includes(entry.evidence_report));assert.equal(sourceEntries.length,52);
  function validateScopes(documents,entries,reader){
    const selected=path=>entries.filter(entry=>entry.evidence_report===path);assert.deepEqual(scopePaths.map(path=>selected(path).length),[14,32,3,1,2]);
    for(const entry of selected(scopePaths[0]))assert.ok(buildScopeEvidenceOk(documents[0],entry,reader,productPaths),'build scope rejected');
    const batch=testConsolidationBatchOk(documents[1],reader,productPaths);assert.equal(batch,true,'consolidation scope rejected');
    for(const entry of selected(scopePaths[1]))assert.ok(testConsolidationEntryOk(documents[1],entry,reader,batch));
    for(const entry of selected(scopePaths[2]))assert.ok(sliderInputScopeEvidenceOk(documents[2],entry,reader,()=>sourcePaths,line),'slider input scope rejected');
    for(const entry of selected(scopePaths[3]))assert.ok(sliderThumbDestroyEvidenceOk(documents[3],entry,reader,()=>sourcePaths,line),'slider destroy scope rejected');
    for(const entry of selected(scopePaths[4]))assert.ok(bazelBuildEvidenceOk(documents[4],entry,reader,()=>productPaths,line),'Bazel scope rejected');
  }
  validateScopes(referenceDocs,sourceEntries,oldRead);
  const changed=prior.members.filter(row=>hash(read(row.path))!==row.sha256).map(row=>({path:row.path,before_sha256:row.sha256,current_sha256:hash(read(row.path))}));
  const context={schema_version:1,line,source_parent:inputs.source_parent,release_reference_parent:inputs.release_reference_parent,
    inputs:{path:REMAINING_NATIVE_SOURCE_INPUTS,sha256:hash(inputBytes)},prior:inputs.prior,
    changed_product:[{path:tab,before_sha256:hash(oldRead(tab)),current_sha256:hash(read(tab))}],unchanged_product_members:1140,
    original_decisions_hunks_and_analyses_retained:true,public_tab_boundary_roles:13,implementation_evidence:inputs.implementation_evidence,
    scope:'The exact11-line private incoming-pane layout insertion changes no package membership, peer import/API, constructor, decorator, build input or resource. Original build/test/slider exclusions remain unchanged; no new upstream/runtime/security decision.',
    actual_native_packed_or_floor_qualified:false,g11_claim:'not-passed'};
  const proposed=structuredClone(referenceDocs);
  proposed[0].candidate_context={...build.candidate_context,source_commit:inputs.source_parent,
    source_tree:execFileSync('git',['rev-parse',inputs.source_parent+'^{tree}'],{cwd:root,encoding:'utf8'}).trim(),product_members:tracked};
  const save=(index,field)=>writes.set(scopePaths[index],appendContext(patchJson(oldRead(scopePaths[index]).toString(),{[field]:proposed[index][field]}),context));
  save(0,'candidate_context');proposed[1].candidate_context.sha256=hash(writes.get(scopePaths[0]));save(1,'candidate_context');
  proposed[2].source_scope=reviewSliderInputScope(read,()=>sourcePaths,line);assert.deepEqual(noPopulation(proposed[2].source_scope),noPopulation(slider.source_scope));save(2,'source_scope');
  proposed[3].source_scope=reviewSliderThumbDestroyScope(read,()=>sourcePaths,line);
  assert.deepEqual({...proposed[3].source_scope,retained_architecture:noPopulation(proposed[3].source_scope.retained_architecture)},
    {...thumb.source_scope,retained_architecture:noPopulation(thumb.source_scope.retained_architecture)});save(3,'source_scope');
  proposed[4].candidate_context=reviewBazelBuildContext(read,()=>productPaths,line);
  assert.deepEqual({...proposed[4].candidate_context,product_members:[],product_population_sha256:null},
    {...bazel.candidate_context,product_members:[],product_population_sha256:null});save(4,'candidate_context');
  const entries=new Map();for(const previousEntry of sourceEntries){const entry=structuredClone(previousEntry);
    if(entry.source_check!==undefined){assert.equal(typeof entry.source_check,'object');entry.source_check.evidence_report_sha256=hash(writes.get(entry.evidence_report));}
    entries.set(entry.sha,entry);}
  const proof={schema_version:1,line,inputs:{path:REMAINING_NATIVE_SOURCE_INPUTS,sha256:hash(inputBytes)},source_parent:inputs.source_parent,
    original_source_references:inputs.prior,original_review_supplement:inputs.supplement,source_changes:changed,tab_layout_roles:{path:rolesPath,sha256:hash(writes.get(rolesPath))},
    implementation_evidence:inputs.implementation_evidence,source_scope_rows_requalified:52,runtime_contexts_requalified:17,authored_use_receipts_requalified:13,
    original_source_decisions_hunks_and_role_judgments_preserved:true,new_source_decisions:0,new_authored_use_closures:0,
    producer:{path:'scripts/remaining-native-admission-source-requalification.mjs',sha256:hash(read('scripts/remaining-native-admission-source-requalification.mjs'))},
    actual_packed_native_or_floor_qualified:false,g11_claim:'not-passed'};
  writes.set(proofPath,json(proof));const proofRef={path:proofPath,sha256:hash(writes.get(proofPath))};
  const functions={'artifact-behavior':artifactBehaviorRequirements,'historical-behavior':historicalBehaviorRequirements,
    'progress-csp':progressCspRequirements,'generated-identity':generatedIdentityRequirements,bidi:bidiBehaviorRequirements,selection:selectionBehaviorRequirements};
  const scopeFields={'artifact-behavior':'artifact_behavior','historical-behavior':'historical_behavior','progress-csp':'progress_csp_behavior',
    'generated-identity':'generated_identity_behavior',bidi:'bidi_behavior',selection:'selection_behavior'};
  const reader=path=>writes.get(path)||read(path);
  const refresh=ref=>{const before=oldRead(ref.path),now=reader(ref.path);assert.equal(hash(before),ref.sha256,'preceding receipt was stale: '+ref.path);
    if(hash(now)===ref.sha256)return {...ref};assert.ok(previous.has(ref.path)||writes.has(ref.path),'changed receipt outside source scope');return {...ref,sha256:hash(now)};};
  assert.equal(prior.before_requirements.length,17);
  for(const registered of prior.before_requirements){
    const definition=functions[registered.kind](registered.sha,line);assert.deepEqual(definition,registered.definition,'existing runtime requirements changed');
    const beforeEntry=prior.entries.find(row=>row.sha===registered.sha),entry=structuredClone(beforeEntry),field=scopeFields[registered.kind];
    const scope=entry.individual_proof[field];assert.ok(scope);assert.deepEqual(scope.source_members.map(row=>row.path).sort(),definition.members.slice().sort());
    scope.source_members=scope.source_members.map(refresh);
    const beforeReview=JSON.parse(oldRead(beforeEntry.evidence_report)),review=structuredClone(beforeReview);
    review.individual_proof=structuredClone(entry.individual_proof);
    if(Array.isArray(review.reviewed_source_members))review.reviewed_source_members=review.reviewed_source_members.map(refresh);
    review.independent_evidence=[...(review.independent_evidence||[]).map(refresh),proofRef];
    review.remaining_native_context_requalification={...context,prior_review:{path:beforeEntry.evidence_report,sha256:hash(oldRead(beforeEntry.evidence_report))},
      prior_individual_proof:beforeEntry.individual_proof,original_hunk_and_branch_judgments_retained:true};
    const path='compatibility/f10/disposition-ledger/evidence/closeout-native-context-'+entry.sha+'.json';writes.set(path,json(review));entry.evidence_report=path;
    entries.set(entry.sha,entry);
  }
  const reviewed=[];for(const row of affected){
    const body=JSON.parse(oldRead(row.source_review.path));assert.equal(hash(oldRead(row.source_review.path)),row.source_review.sha256);
    const match=body.reviews.filter(value=>key(value)===key(row));assert.equal(match.length,1);const review=structuredClone(match[0]);
    assert.equal(review.candidate_source_sha256,hash(oldRead(tab)));review.candidate_source_sha256=hash(read(tab));
    review.prior_source_review=row.source_review;
    review.decision+=' Current native-admission source requalification: the complete constructor, metadata, all original public import binding/reference roles and every member outside the private _startTransition body remain exact. The eleven-line insertion unwraps the existing ElementRef<HTMLElement> payload and stages its visibility/layout before height measurement. New standard DOM operations preserve the existing public wrapper type; no peer call or DI flag is added. The29 lifecycle cases/12mutants and limited native CSS diagnostic support this finite change. Current packed/native execution remains independently mandatory; no new use or upstream SHA is closed.';
    review.independent_evidence=[...review.independent_evidence.map(refresh),proofRef,{path:rolesPath,sha256:hash(writes.get(rolesPath))},
      implementation['compatibility/rc/remaining-native-admission-tab-lifecycle.json'],implementation['compatibility/rc/remaining-native-admission-tab-cyph-style-sanity.json']];
    reviewed.push(review);
  }
  writes.set(rolePath,json({schema_version:1,line,status:'reviewed',scope:'Exact existing13 tab public import boundaries after the bounded private layout insertion; no complete component/native/floor qualification.',
    prior_reviews_preserved:true,new_authored_use_closures:0,reviews:reviewed}));
  const roleRef={path:rolePath,sha256:hash(writes.get(rolePath))};
  const nextRole=row=>({...row,source_review:roleRef,source_review_history:[...(row.source_review_history||[]),{source_parent:inputs.source_parent,
    prior_source_review:row.source_review,reason:'Exact current tab private layout source delta requalified; original public import/DI/type judgment retained without new closure.'}]});
  const affectedKeys=new Set(affected.map(key)),frozenRows=new Map(oldFrozen.symbol_uses.filter(row=>affectedKeys.has(key(row))).map(row=>[key(row),nextRole(row)]));
  writes.set(frozenPath,patchRows(oldRead(frozenPath).toString(),'symbol_uses',frozenRows));
  const active=scanCurrentAuthoredUses({root,readSource:path=>read(path).toString()}),activeByKey=new Map(active.symbol_uses.map(row=>[key(row),row])),currentRows=new Map();
  for(const row of oldCurrent.symbol_uses){const actual=activeByKey.get(key(row));assert.ok(actual);let next=affectedKeys.has(key(row))?nextRole(row):structuredClone(row);
    assert.deepEqual(actual.occurrences,row.occurrences,'peer import occurrence changed');
    if(row.file==='legacy-tabs/internal/tab-body-base.ts')next.candidate_source_sha256=actual.candidate_source_sha256;else assert.equal(row.candidate_source_sha256,actual.candidate_source_sha256,'unrelated current peer source changed');
    if(JSON.stringify(next)!==JSON.stringify(row))currentRows.set(key(row),next);
  }
  let currentText=patchRows(oldRead(currentPath).toString(),'symbol_uses',currentRows).toString();
  currentText=patchJson(currentText,{current_source_population_sha256:active.source_population_sha256});writes.set(currentPath,Buffer.from(currentText));
  writes.set(ledgerPath,patchRows(oldRead(ledgerPath).toString(),'entries',entries));
  validateScopes(scopePaths.map(path=>JSON.parse(writes.get(path))),sourceEntries.map(row=>entries.get(row.sha)),reader);
  const frozenEvidence=authoredUseReviewEvidence(JSON.parse(writes.get(frozenPath)),line,reader,hash);assert.equal(frozenEvidence.insufficient,0);assert.equal(frozenEvidence.reviewed,1446);
  const admission=currentAuthoredUseAdmission({root,current:active,frozen:JSON.parse(read('compatibility/f10/authored-dependency-inventory-seed.json')).symbol_uses,
    candidate:JSON.parse(writes.get(currentPath)),line,readMember:reader});assert.equal(admission.source_snapshot_valid,true);assert.equal(admission.review_evidence.insufficient,0);assert.equal(admission.review_evidence.reviewed,178);
  assertRemainingNativeMetadataState({root,previous,writes,read});
  return {schema_version:1,line,proof,roles,source_scope_rows:52,authored_rows:13,runtime_contexts:17,frozenEvidence,currentAdmission:admission,writes,
    actual_native_packed_or_floor_qualified:false,g11_claim:'not-passed'};
}

if(process.argv[1]&&resolve(process.argv[1])===fileURLToPath(import.meta.url)){
  const result=inspectRemainingNativeSourceRequalification();
  if(process.argv.includes('--write'))for(const[path,bytes]of result.writes){const file=resolve(rootDefault,path);if(!existsSync(file)||!readFileSync(file).equals(bytes))writeFileSync(file,bytes);}
  console.log(JSON.stringify({line:result.line,source_scope_rows:result.source_scope_rows,authored_rows:result.authored_rows,runtime_contexts:result.runtime_contexts,
    writes:result.writes.size,applied:process.argv.includes('--write'),actual_native_packed_or_floor_qualified:false,g11_claim:'not-passed'}));
}
