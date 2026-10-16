/**
 * @license
 * Copyright Google LLC All Rights Reserved.
 * Copyright (c) 2026 Ryan Lester.
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.io/license
 */
/** Individual source decisions with mandatory, independently checked runtime evidence. */
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {createRequire} from 'node:module';
import {readFileSync,writeFileSync,existsSync} from 'node:fs';
import {execFileSync} from 'node:child_process';
import {gunzipSync} from 'node:zlib';
import {dirname,resolve} from 'node:path';
import {fileURLToPath,pathToFileURL} from 'node:url';
import {ARTIFACT_BEHAVIOR_KIND,artifactBehaviorRequirements} from './upstream-artifact-behavior-evidence.mjs';
import {candidateProductSourcePaths} from './upstream-candidate-source-evidence.mjs';
import {individualReviewScopeOk} from './upstream-individual-evidence-scope.mjs';
const ts=createRequire(import.meta.url)('typescript');
const rootDefault=resolve(dirname(fileURLToPath(import.meta.url)),'..');
const prefix='compatibility/rc/chip-menu-tooltip-admission-',inputPath=prefix+'inputs.json',proofPath=prefix+'source-proof.json';
const ledgerPath='compatibility/f10/disposition-ledger/ledger.json';
const pins={main:'be081b35365d33367f0295dfdb52c750cdaea4efe836899eeacc1a4d66561b56',
 '21.x':'7be7c160690ed24054fac496bffa824e2c168ad03c6911a74245216def90699a'};
const hash=b=>createHash('sha256').update(b).digest('hex'),json=x=>Buffer.from(JSON.stringify(x,null,2)+'\n');
const gitObject=(kind,text)=>createHash('sha1').update(kind+' '+Buffer.byteLength(text)+'\0').update(text).digest('hex');
const newMembers=['scripts/chip-menu-tooltip-packed-contract.mjs','scripts/upstream-artifact-behavior-evidence.mjs'];
const newBranch=" else if (registered.legacyField) {\n      demand(selected?.legacy_harness_passed === true && harness?.[registered.legacyField] === true\n        && isDeepStrictEqual(harness?.[registered.harness], selected.observation)\n        && registered.evaluate(selected.observation).result === 'pass', 'insufficient ' + registered.kind + ' observations');\n    }";
const cases={
 '86ebb9bfd55e637be1e6d0117a10e290c5247ebd':{
  name:'chip',disposition:'already-present',
  decision:'The complete four-file/six-hunk chip disabled-state fix is already implemented by the untouched Material16 legacy chip/list model. The list writes its own disabled flag separately; the chip getter combines that flag with its independently coerced input. No current chip-set class, API guard or modern component is transplanted. The maintained forms peers must execute the real legacy value accessor: the required packed case observes template-driven initialization and reactive disable/enable, actual getter and aria-disabled values, accessor identities and stable nodes. Source identity alone does not qualify those outcomes. Preserve the earlier incomplete entry and all original receipts; this completed individual source conclusion remains conditional on actual same-run packed behavior and the global release gates.',
  hunks:[
   'The original NgModel initialization regression asserts that a chip explicitly disabled by its own input stays disabled after the list form initializes. The maintained historical regression and actual packed template form retain that cause; the packed observation records both the genuine NgModel value-accessor identity and disabled/ARIA state after stabilization.',
   'The added fixture uses a named form list, ngModel null and a disabled individual chip. The packed legacy template uses the same conditions and separately exercises a reactive form with one individual and one inherited chip; this does not replace or edit an original golden.',
   'Modern chip-set synchronization moves the list write from chip.disabled to chip._chipListDisabled. Owned legacy _syncChipsState already writes _chipListDisabled without changing the independent input; the complete retained method also preserves multiple/selectability forwarding.',
   'The modern new flag starts false. Untouched16 and the current owned chip already declare the distinct list-disabled flag; no new public legacy input or consumer structure change is required.',
   'The modern disabled accessor ORs own/list state and stores only the own input. The legacy getter and coercing setter retain the same distinct-state contract, including the exact tagged16 bodies. Packed initial/disabled/enabled phases require both getters and the real rendered aria-disabled values.',
   'The modern public API guard reflects an accessor and internal flag. The legacy accessor/flag already exist in the tagged reference; no modern API mirror or extra legacy setter is introduced. Full consumer/compiler/runtime floors remain separate.',
  ]},
 '86a96c9290e3896485c6b6c0d039873652f543df':{
  name:'menu',disposition:'already-adapted',
  decision:'The complete two-file/three-hunk menu lazy-view fix is adapted to the locally owned historical menu. The earlier immediate-overlay-detach implementation could not paint an exit; that defect was repaired separately while preserving the Material16 template/style and public constructor contracts. Current semantic close releases focus/input immediately, then only the current owner detaches overlay and lazy content on void/completion; transfer cancels old removal and releases the old view before attaching the new owner. Genuine Core/RxJS constructor protocols exercise lifetime/reentry but are not native or packed qualification. The required packed case observes actual query membership, directive destruction, distinct re-created items and two-trigger transfer. All native CSS exit cases and global motion gates remain independently mandatory; no painting/timing, hydration, floor, security or G11 pass follows from this source conclusion.',
  hunks:[
   'The runtime hunk restores lazyContent.detach after owner animation completion and in the immediate other-owner path. Owned _destroyMenu now retains the rendered attachment until a valid void/completion and guards generation/ownership; _detachMenu releases only its own attachment and avoids destroying reentrant new-owner content. The separately reviewed 18 constructor cases/14 mutants cover fallback, reopen, transfer and teardown. Actual packed view destruction and all native exit rendering still have to pass.',
   'Directive and OnDestroy imports support an actual lifecycle witness in the upstream regression. The owned packed MenuDestroyProbe is instantiated alongside real legacy items inside matMenuContent and counts Angular destruction, rather than replacing ngOnDestroy with a spy or manually emitting a completion event.',
   'The original regression opens a two-item lazy menu, then requires both query disappearance and two destruction calls after close. The packed case preserves those observations, adds a second creation/destruction cycle and real shared-panel transfer, and requires connected-node counts and actual trigger output sequences. Provider-disabled packed behavior is not used to certify enabled CSS painting; the unchanged native roster remains required.',
  ]},
 '68b267dd59f3addf92a3b9f8ce9e8baa479df7f4':{
  name:'tooltip',disposition:'already-present',
  decision:'The complete one-file/two-hunk tooltip fix restores eager ViewContainerRef acquisition after a modern late-injector regression. Untouched Material16 and the owned tooltip already receive and store ViewContainerRef in the constructor, and show passes that same field to ComponentPortal. This is the same root mechanism through the historical public constructor, not an ancestry or import-only argument. The required actual packed case checks eager node/container identity before any show, genuine public portal/component instances and logical container view counts through two show/hide/reopen cycles, retaining the old disabled-empty/manual-constructor dependency checks. Both advertised minimum public portal declarations and implementations support this route. Hydration remains unclaimed: neither source inspection, synthetic validator input nor client TestBed observations certify server/client hydration. Full browser/SSR/floor and release gates remain independent of this finite runtime-required source decision.',
  hunks:[
   'The added modern inject(ViewContainerRef) field moves acquisition before hydration completes. The owned constructor already takes ViewContainerRef as its fourth dependency and forwards it through the wrapper; its field is populated before any show, including a disabled empty tooltip. Exact original16 constructor/portal ingress is retained, without importing private framework machinery.',
   'The portal construction stops performing injector.get at show time and uses the stored field. Owned show already calls new ComponentPortal(this._tooltipComponent,this._viewContainerRef); the required packed observation checks that actual public portal.viewContainerRef is the originally captured node container, with one attached logical view and none after hide on both cycles. This proves the finite eager/portal boundary when executed, while hydration support stays unclaimed.',
  ]},
};
const contextNotes={
 '1b6db8c89b00ace8aaa0e0824866acec5369635f':'The complete select focus-before-click predicate and its original three harness conditions are byte-identical. The pure new helper handles three different existing case IDs; its stronger final harness aggregate can reject more incomplete runs but cannot admit a weaker select result. Bare/form-field legacy/current focus, native backdrop, blocked/no-op paths, toggle and teardown fixtures are unchanged. Only the packed producer context and the two explicit helper/guard source dependencies are requalified.',
 '688c430fe8df09152ee59eb8a2ca62b5ba2fb81e':'The exact real-scroll fixture, registered case ID and complete select-detach evaluation are unchanged. Native CdkScrollable/close-strategy/OverlayRef/directive routing, value/focus/ARIA and event-count observations retain their original source judgments. New chip/menu/tooltip requirements add no select callback or fake scroll route; the original collector and source controls pass after exact finite source reversal.',
 'ca9c490ee30dbf7c9c147079197d0dbc0abcd611':'The OnPush fixture, owned table construction helper and both complete minimum public CdkTable sources are unchanged. The required no-data/input/view lifecycle case and installed-member/delegation predicates remain exact. The stricter producer aggregate adds three unrelated required outcomes and binds their pure helper plus the finite guard explicitly; no table renderer, source population or inherited behavior conclusion is altered.',
};
function parse(path,text){const f=ts.createSourceFile(path,text,ts.ScriptTarget.Latest,true);assert.equal(f.parseDiagnostics.length,0);return f;}
function guardProof(before,current,change){
 assert.equal(hash(before),change.before_sha256);assert.equal(hash(current),change.current_sha256);let restored=current;
 for(const [a,b]of [...change.edits].reverse()){assert.equal(restored.split(b).length,2);restored=restored.replace(b,()=>a);}assert.equal(restored,before,'complete prior guard not recovered');
 const a=parse('before.mjs',before),b=parse('current.mjs',current);
 const fn=(f,name)=>f.statements.find(n=>ts.isFunctionDeclaration(n)&&n.name?.text===name)?.getText(f);
 assert.equal(fn(a,'requiresArtifactBehavior'),fn(b,'requiresArtifactBehavior'));
 const validation=fn(b,'validateArtifactBehavior');assert.equal(validation.split(newBranch).length,2);assert.equal(validation.replace(newBranch,''),fn(a,'validateArtifactBehavior'),'original runtime predicates changed');
 const variables=f=>new Map(f.statements.filter(ts.isVariableStatement).flatMap(n=>[...n.declarationList.declarations]).map(n=>[n.name.getText(f),n.initializer]));
 const av=variables(a),bv=variables(b);
 for(const [name,node]of av){
  if(name==='scopes'){assert.equal(bv.get(name).arguments[0].elements.length,6);assert.deepEqual([...node.arguments[0].elements].map(n=>n.getText(a)),[...bv.get(name).arguments[0].elements].slice(0,3).map(n=>n.getText(b)));}
  else if(name==='producerMembers'||name==='SELECT_FOCUS_MEMBERS'){
   let text=bv.get(name).getText(b);for(const path of newMembers)assert.equal(text.split("'"+path+"'").length,2);
   text=text.split('\n').filter(line=>!newMembers.some(path=>line.includes("'"+path+"'"))).join('\n');
   assert.equal(text,node.getText(a),'source member expansion changed an earlier member');
  }else assert.equal(bv.get(name)?.getText(b),node.getText(a),'old guard declaration changed: '+name);
 }
 return {complete_previous_bytes_recovered:true,requires_predicate_identical:true,all_previous_runtime_predicates_identical:true,
  previous_registered_scopes_retained:3,finite_new_registered_scopes:3,new_explicit_dependencies:newMembers,common_packed_run_guard_unchanged:true};
}
function historicalRoles(read){
 const references=[
  ['reference/material-16.2.14/chips-keyboard-sources/chip.ts','src/material/legacy-chips/chip.ts','a3809031dbb69a835b3766f2af6052073939bab62a70161fe57e39260377fe5a'],
  ['reference/material-16.2.14/chip-blur-sources/chip-list.ts','src/material/legacy-chips/chip-list.ts','83c17cd61f9ecb8cc4dcc7947a493a78a93a6b880d3c69f9284eb39106662414'],
  ['reference/material-16.2.14/tooltip-render-sources/tooltip.ts','src/material/tooltip/tooltip.ts','14d7821fe83cdfdc8ac9d6f2f8e095a24178ad286a8f9d4eea4245e879d5501c'],
 ].map(([path,original,sha256])=>{assert.equal(hash(read(path)),sha256,'tagged16 reference changed');return {path,git_ref:'16.2.14:'+original,sha256};});
 const printer=ts.createPrinter({removeComments:true}),canonical=(n,f)=>printer.printNode(ts.EmitHint.Unspecified,n,f);
 const owned=(file,name)=>{const f=parse(file,read(file).toString()),c=f.statements.find(n=>ts.isClassDeclaration(n)&&n.name?.text===name);assert.ok(c);return {f,c};};
 const chip=owned('projects/ngx-material-legacy/legacy-chips/chip.ts','MatLegacyChip'),oldChip=owned(references[0].path,'MatLegacyChip');
 const list=owned('projects/ngx-material-legacy/legacy-chips/chip-list.ts','MatLegacyChipList'),oldList=owned(references[1].path,'MatLegacyChipList');
 const member=(subject,name,predicate)=>subject.c.members.find(n=>n.name?.getText(subject.f)===name&&predicate(n));
 for(const predicate of [ts.isGetAccessorDeclaration,ts.isSetAccessorDeclaration]){
  const a=member(chip,'disabled',predicate),b=member(oldChip,'disabled',predicate);assert.ok(a&&b);assert.equal(canonical(a.body,chip.f),canonical(b.body,oldChip.f),'historical individual disabled contract changed');
 }
 const sync=member(list,'_syncChipsState',ts.isMethodDeclaration),oldSync=member(oldList,'_syncChipsState',ts.isMethodDeclaration);
 assert.equal(canonical(sync.body,list.f),canonical(oldSync.body,oldList.f),'historical list-disabled forwarding changed');
 const tip=owned('projects/ngx-material-legacy/legacy-tooltip/internal/tooltip-base.ts','_MatTooltipBase'),oldTip=owned(references[2].path,'_MatTooltipBase');
 for(const subject of [tip,oldTip]){
  const ctor=subject.c.members.find(n=>ts.isConstructorDeclaration(n)&&n.body);assert.equal(ctor.parameters[3].name.getText(subject.f),'_viewContainerRef');assert.equal(ctor.parameters[3].type.getText(subject.f),'ViewContainerRef');
  const show=member(subject,'show',ts.isMethodDeclaration),portals=[],late=[];
  const visit=n=>{if(ts.isNewExpression(n)&&n.expression.getText(subject.f)==='ComponentPortal')portals.push(n);
   if(ts.isCallExpression(n)&&n.arguments.some(a=>ts.isIdentifier(a)&&a.text==='ViewContainerRef'))late.push(n);ts.forEachChild(n,visit);};visit(show.body);
  assert.equal(portals.length,1);assert.deepEqual(portals[0].arguments.map(n=>n.getText(subject.f)),['this._tooltipComponent','this._viewContainerRef']);assert.equal(late.length,0,'late ViewContainerRef resolution');
 }
 return {references,chip_getter_setter_and_list_forwarding_equal_to_tagged16:true,tooltip_fourth_constructor_dependency_and_stored_portal_ingress_equal_to_tagged16:true,hydration_qualified:false};
}
function replaceEntries(text,entries){
 const file=ts.parseJsonText('ledger.json',text),array=file.statements[0].expression.properties.find(p=>p.name.text==='entries').initializer,edits=[];
 for(const node of array.elements){const old=JSON.parse(node.getText(file)),next=entries.find(e=>e.sha===old.sha);if(!next)continue;
  const indent=' '.repeat(file.getLineAndCharacterOfPosition(node.getStart(file)).character);
  edits.push({start:node.getStart(file),end:node.end,text:JSON.stringify(next,null,2).replaceAll('\n','\n'+indent)});
 }assert.equal(edits.length,6);for(const e of edits.reverse())text=text.slice(0,e.start)+e.text+text.slice(e.end);return text;
}
export function inspectChipMenuTooltipJudgments({root=rootDefault,readMember}={}){
 const read=p=>readMember?readMember(p):readFileSync(resolve(root,p)),pkg=JSON.parse(read('projects/ngx-material-legacy/package.json'));
 const line=pkg.version.startsWith('21.')?'21.x':'main',input=read(inputPath);assert.equal(hash(input),pins[line],'admission source input changed');const inputs=JSON.parse(input);
 const stored=read(inputs.prior.path);assert.equal(hash(stored),inputs.prior.sha256,'prior source archive changed');const raw=gunzipSync(stored);assert.equal(hash(raw),inputs.prior.raw_sha256);const prior=JSON.parse(raw);assert.equal(prior.line,line);assert.equal(prior.entries.length,6);
 const old=new Map(prior.members.map(m=>{assert.equal(hash(m.text),m.sha256);return [m.path,Buffer.from(m.text)];}));
 for(const ref of inputs.source_evidence)assert.equal(hash(read(ref.path)),ref.sha256,'preceding packed evidence changed');
 const changeBytes=read(inputs.guard_change.path);assert.equal(hash(changeBytes),inputs.guard_change.sha256);const change=JSON.parse(changeBytes);
 const comparison=guardProof(old.get(change.path).toString(),read(change.path).toString(),change);
 const probeBytes=read(inputs.probe_change.path);assert.equal(hash(probeBytes),inputs.probe_change.sha256);const probeChange=JSON.parse(probeBytes);
 let recoveredProbe=read(probeChange.path).toString();assert.equal(hash(recoveredProbe),probeChange.current_sha256);
 for(const [a,b]of [...probeChange.edits].reverse()){assert.equal(recoveredProbe.split(b).length,2);recoveredProbe=recoveredProbe.replace(b,()=>a);}
 assert.equal(recoveredProbe,old.get(probeChange.path).toString(),'old extended probe not recovered');assert.equal(hash(recoveredProbe),probeChange.before_sha256);
 const tree=execFileSync('git',['-c','gc.auto=0','-c','maintenance.auto=0','ls-tree','-r','-z',inputs.source_parent,'--','projects/ngx-material-legacy'],{cwd:root}).toString().split('\0').filter(Boolean);
 const product=tree.map(row=>{const [meta,path]=row.split('\t'),[mode,kind,blob]=meta.split(' ');assert.equal(mode,'100644');assert.equal(kind,'blob');const bytes=read(path);assert.equal(gitObject('blob',bytes),blob,'unreviewed product change');return {path,sha256:hash(bytes),git_blob:blob};});
 assert.equal(product.length,1141);assert.deepEqual([...candidateProductSourcePaths(root)].sort(),product.map(r=>r.path).filter(p=>/\.(ts|scss|css|html)$/.test(p)).sort());
 const originals=[];
 for(const entry of prior.entries.slice(3)){
  const doc=JSON.parse(old.get(entry.evidence_report));assert.equal(doc.sha,entry.sha);assert.equal(gitObject('commit',doc.upstream_commit_object),entry.sha);
  const patch=read(doc.patch_file);assert.equal(hash(patch),doc.diff_sha256);assert.equal(doc.diff_sha256,artifactBehaviorRequirements(entry.sha).patch);
  const hunks=[];let file;
  for(const row of patch.toString().split('\n')){if(row.startsWith('diff --git '))file=row.split(' b/')[1];if(row.startsWith('@@'))hunks.push({hunk:hunks.length+1,file,header:row});}
  assert.equal(hunks.length,cases[entry.sha].hunks.length);originals.push({sha:entry.sha,patch_file:doc.patch_file,diff_sha256:doc.diff_sha256,
   upstream_commit_object_sha256:hash(doc.upstream_commit_object),paths:[...new Set(hunks.map(h=>h.file))],hunks});
 }
 const scopes=inputs.sha_ids.map(sha=>{const r=artifactBehaviorRequirements(sha);assert.ok(r);return {...r,source_members:r.members.map(path=>({path,sha256:hash(read(path))}))};});
 const cyph=inputs.cyph_snapshot;assert.equal(cyph.read_only,true);assert.equal(cyph.consumer_build_executed,false);assert.equal(cyph.members.length,3);
 const historical=historicalRoles(read);
 const base={schema_version:1,line,source_parent:inputs.source_parent,input:{path:inputPath,sha256:hash(input)},prior:inputs.prior,guard_comparison:comparison,probe_change:inputs.probe_change,all_prior_extended_probe_assertions_retained:true,
  source_evidence:inputs.source_evidence,originals,unchanged_product_members:1141,unchanged_product_population_sha256:hash(JSON.stringify(product)),scopes,cyph,historical,
  producer_sha256:hash(read('scripts/chip-menu-tooltip-admission-source-judgments.mjs')),
  individual_new_source_decisions:3,preceding_source_contexts_requalified:3,actual_runtime_or_authored_use_closures:0,
  actual_packed_native_hydration_or_floor_qualified:false,g11_claim:'not-passed'};
 const proofBytes=json(base),writes=new Map([[proofPath,proofBytes]]),entries=[],decisions=[];
 for(const [index,entry]of prior.entries.entries()){
  const current=structuredClone(entry),preceding=JSON.parse(old.get(entry.evidence_report)),scope=scopes[index],profile=cases[entry.sha];
  const docPath='compatibility/f10/disposition-ledger/evidence/closeout-chip-menu-tooltip-'+(profile?profile.name:['focus-context','detach-context','table-context'][index])+'-source-judgment.json';
  const previousRef={path:entry.evidence_report,sha256:hash(old.get(entry.evidence_report))};
  const context={source_parent:inputs.source_parent,subject_sha:entry.sha,preceding_source_review:previousRef,
   inputs:{path:inputPath,sha256:hash(input)},source_proof:{path:proofPath,sha256:hash(proofBytes)},guard_change:inputs.guard_change,
   added_source_members:scope.source_members.filter(m=>newMembers.includes(m.path)),
   original_hunks_and_prior_source_conclusions_retained:!profile,actual_runtime_qualified:false};
  let review;
  if(profile){
   const original=originals.find(r=>r.sha===entry.sha);current.final_disposition=profile.disposition;current.reason=profile.decision;
   current.files=original.paths;current.affected_branches=[line];current.review_depth='individual-compatibility';
   review={schema_version:1,line,status:'reviewed',sha:entry.sha,source_parent:inputs.source_parent,review_depth:'individual-compatibility',affected_branches:[line],
    final_disposition:profile.disposition,judgment_stage:'source-complete-runtime-required',diff_sha256:original.diff_sha256,patch_file:original.patch_file,
    complete_original_files:original.paths,complete_original_hunks:original.hunks.length,original_patch_has_test_hunk:original.paths.some(p=>p.endsWith('.spec.ts')),
    source_conclusion:profile.decision,decision:profile.decision,
    hunk_reviews:original.hunks.map((h,i)=>({...h,judgment:profile.hunks[i]})),
    branch_review:{source_line:line,minimum_framework:pkg.peerDependencies['@angular/core'].slice(1),minimum_cdk:pkg.peerDependencies['@angular/cdk'].slice(1),
     basis:'Exact own-line source and tagged16 historical ingress. Stable public peer boundaries are retained; actual supported compiler/Node/RxJS/floor executions are still required.'},
    reviewed_source_members:scope.source_members,prior_entry:entry,prior_entry_sha256:hash(JSON.stringify(entry)),prior_source_review:previousRef,
    independent_evidence:[previousRef,...inputs.source_evidence,{path:proofPath,sha256:hash(proofBytes)}],
    runtime_qualification:{required:true,qualified_by_this_document:false,check:'packed-consumer',case_ids:scope.case_ids,
     contract:'Require the captured successful current coordinator invocation, clean source, matching run/line/library/manifest, complete106 packed case roster and hashed owned output. Re-evaluate the selected structured observation, equal raw harness data and original true harness condition. No synthetic report or source status substitutes for execution.'},
    global_native_SSR_and_floor_gates_independently_required:true,hydration_claimed:false,semantic_pass:false,actual_packed_or_native_executed:false,g11_claim:'not-passed'};
   current.individual_proof={proof_kind:ARTIFACT_BEHAVIOR_KIND,diff_sha256:scope.patch,review_depth:'individual-compatibility',affected_branches:[line],decision:profile.decision,
    artifact_behavior:{kind:scope.kind,case_ids:scope.case_ids,source_members:scope.source_members}};
  }else{
   review=structuredClone(preceding);review.source_parent=inputs.source_parent;review.reviewed_source_members=scope.source_members;
   review.producer_context_source_conclusion=contextNotes[entry.sha];
   // Original independent receipts remain direct obligations. Changed producer/
   // probe references have the explicitly reviewed finite packed context.
   const allowed=new Set([change.path,'scripts/packed-consumer-aot-smoke.mjs','tests/select_focus_click_packed_contract_probe.mjs','tests/select_detach_packed_contract_probe.mjs','tests/table_onpush_packed_contract_probe.mjs','tests/upstream_artifact_extended_scope_probe.mjs']);
   for(const ref of review.independent_evidence||[])if(ref.path&&hash(read(ref.path))!==ref.sha256){assert.ok(allowed.has(ref.path),'unreviewed old independent reference change');ref.sha256=hash(read(ref.path));}
   review.independent_evidence.push(previousRef,...inputs.source_evidence,{path:proofPath,sha256:hash(proofBytes)});
   assert.deepEqual(review.hunk_reviews,preceding.hunk_reviews);assert.equal(review.source_conclusion,preceding.source_conclusion);
   assert.equal(review.semantic_pass,false);assert.equal(review.actual_packed_or_native_executed,false);
   const oldMembers=entry.individual_proof.artifact_behavior.source_members;assert.deepEqual(scope.members.filter(p=>!newMembers.includes(p)),oldMembers.map(m=>m.path));
   for(const member of oldMembers)if(member.path!=='scripts/packed-consumer-aot-smoke.mjs')assert.equal(hash(read(member.path)),member.sha256,'preceding behavior source changed');
   current.individual_proof.artifact_behavior.source_members=scope.source_members;
  }
  review.chip_menu_tooltip_context_requalification=context;
  writes.set(docPath,json(review));current.evidence_report=docPath;current.prior_dispositions=[...(current.prior_dispositions||[]),entry];
  current.source_check={kind:'individual-source-reviewed-artifact-required',diff_sha256:scope.patch,patch_path:review.patch_file,evidence_report_sha256:hash(writes.get(docPath))};
  assert.ok(individualReviewScopeOk({entry:current,proof:current.individual_proof,body:review,review,requiresIndividual:true,claimsBehavior:true}));
  entries.push(current);decisions.push({sha:entry.sha,final_disposition:current.final_disposition,review:docPath,review_sha256:hash(writes.get(docPath)),source_members:scope.source_members.length,runtime_qualified:false});
 }
 const live=JSON.parse(read(ledgerPath));assert.equal(live.entries.length,1697);
 for(const e of prior.entries){const actual=live.entries.find(r=>r.sha===e.sha),next=entries.find(r=>r.sha===e.sha);assert.ok(JSON.stringify(actual)===JSON.stringify(e)||JSON.stringify(actual)===JSON.stringify(next),'live source judgment drift');}
 return {proof:base,writes,entries,prior_entries:prior.entries,decisions};
}
export function recordChipMenuTooltipJudgments(root=rootDefault){
 const read=p=>readFileSync(resolve(root,p)),inputs=JSON.parse(read(inputPath));assert.equal(hash(read(ledgerPath)),inputs.ledger_before_sha256,'ledger changed before record');assert.equal(existsSync(resolve(root,proofPath)),false,'already recorded');
 const result=inspectChipMenuTooltipJudgments({root}),text=replaceEntries(read(ledgerPath).toString(),result.entries),updated=JSON.parse(text),before=JSON.parse(read(ledgerPath));
 const wanted=new Set(result.entries.map(e=>e.sha));assert.deepEqual(updated.entries.filter(e=>!wanted.has(e.sha)),before.entries.filter(e=>!wanted.has(e.sha)));
 for(const [path,bytes]of result.writes)writeFileSync(resolve(root,path),bytes);writeFileSync(resolve(root,ledgerPath),text);
 writeFileSync(resolve(root,prefix+'decisions.json'),json({schema_version:1,line:result.proof.line,decisions:result.decisions,actual_runtime_qualified:false,g11_claim:'not-passed'}),{flag:'wx'});
 return {line:result.proof.line,new_individual_source_decisions:3,preceding_source_contexts_requalified:3,actual_runtime_closures:0,g11_claim:'not-passed'};
}
if(process.argv[1]&&import.meta.url===pathToFileURL(resolve(process.argv[1])).href){assert.deepEqual(process.argv.slice(2),['--record']);console.log(JSON.stringify(recordChipMenuTooltipJudgments()));}
