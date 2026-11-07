/**
 * @license
 * Copyright Google LLC All Rights Reserved.
 * Copyright (c) 2026 Ryan Lester.
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.io/license
 */
/** Finite review of contexts changed by the owned menu exit repair. */
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {createRequire} from 'node:module';
import {readFileSync,writeFileSync,existsSync} from 'node:fs';
import {gunzipSync} from 'node:zlib';
import {execFileSync} from 'node:child_process';
import {dirname,resolve} from 'node:path';
import {fileURLToPath,pathToFileURL} from 'node:url';
import {buildScopeEvidenceOk} from './upstream-build-scope-evidence.mjs';
import {testConsolidationBatchOk,testConsolidationEntryOk} from './upstream-test-consolidation-evidence.mjs';
import {reviewSliderInputScope,sliderInputScopeEvidenceOk} from './upstream-slider-input-scope.mjs';
import {reviewSliderThumbDestroyScope,sliderThumbDestroyEvidenceOk} from './upstream-slider-thumb-destroy-scope.mjs';
import {reviewBazelBuildContext,bazelBuildEvidenceOk} from './upstream-bazel-build-scope.mjs';
import {candidateProductSourcePaths} from './upstream-candidate-source-evidence.mjs';
import {authoredUseReviewEvidence} from './authored-use-inventory.mjs';
import {scanCurrentAuthoredUses,currentAuthoredUseAdmission} from './authored-current-use-inventory.mjs';
const ts=createRequire(import.meta.url)('typescript');
const defaultRoot=resolve(dirname(fileURLToPath(import.meta.url)),'..');
const hash=bytes=>createHash('sha256').update(bytes).digest('hex');
const json=value=>Buffer.from(JSON.stringify(value,null,2)+'\n');
const key=row=>JSON.stringify([row.file,row.module,row.symbol]);
export const MENU_EXIT_CONTEXT_INPUTS='compatibility/rc/menu-exit-context-inputs.json';
const inputHashes={main:'0892b8b0fb8b01e2b8a4f0481f2f9a3250962e2dbbd660e9095b6bd7e15cce2f',
 '21.x':'fdc0ce2ee21fefca6fbd31b8e8ac87812c163260bf47e20f01e976fadbb8f55a'};
const trigger='projects/ngx-material-legacy/legacy-menu/internal/menu-trigger-base.ts';
const frozenPath='compatibility/f10/authored-dependency-dispositions.json';
const currentPath='compatibility/f10/authored-dependency-current-dispositions.json';
const ledgerPath='compatibility/f10/disposition-ledger/ledger.json';
const diagnosticPath='compatibility/rc/menu-exit-context-roles.json';
const reviewPath='compatibility/f10/authored-use-reviews/menu-exit-requalified-boundaries.json';
const proofPath='compatibility/rc/menu-exit-context-source-proof.json';
const prefix='compatibility/f10/disposition-ledger/evidence/';
const names=['closeout-fourteen-build-scope-review','closeout-test-consolidation-source-review',
 'closeout-three-slider-input-source-review','closeout-slider-thumb-destroy-review','closeout-bazel-build-only-review'];
const paths=names.map(name=>prefix+name+'.json');
const noPopulation=value=>Object.fromEntries(Object.entries(value).filter(([k])=>k!=='product_source_population_sha256'));
const parse=text=>{const f=ts.createSourceFile(trigger,text,ts.ScriptTarget.Latest,true);assert.equal(f.parseDiagnostics.length,0);return f;};
const printer=ts.createPrinter({removeComments:true});
const canonical=(node,file)=>printer.printNode(ts.EmitHint.Unspecified,node,file);

/** Replace only designated JSON values, preserving unrelated original bytes. */
function patchJson(text,replacements){
 const source=ts.parseJsonText('context.json',text);assert.equal(source.parseDiagnostics.length,0);
 const object=source.statements[0].expression;assert.ok(ts.isObjectLiteralExpression(object));
 const edits=[];
 for(const [name,value]of Object.entries(replacements)){
  const prop=object.properties.find(p=>p.name.text===name);assert.ok(prop,'missing JSON field '+name);
  const indent=' '.repeat(source.getLineAndCharacterOfPosition(prop.getStart(source)).character);
  edits.push({start:prop.initializer.getStart(source),end:prop.initializer.end,
   text:JSON.stringify(value,null,2).replaceAll('\n','\n'+indent)});
 }
 for(const edit of edits.sort((a,b)=>b.start-a.start))text=text.slice(0,edit.start)+edit.text+text.slice(edit.end);
 return text;
}
function patchRows(text,field,updates){
 const source=ts.parseJsonText('rows.json',text),object=source.statements[0].expression;
 const array=object.properties.find(p=>p.name.text===field)?.initializer;assert.ok(ts.isArrayLiteralExpression(array));
 const edits=[];
 for(const node of array.elements){const row=JSON.parse(node.getText(source)),next=updates.get(field==='entries'?row.sha:key(row));if(!next)continue;
  const indent=' '.repeat(source.getLineAndCharacterOfPosition(node.getStart(source)).character);
  edits.push({start:node.getStart(source),end:node.end,text:JSON.stringify(next,null,2).replaceAll('\n','\n'+indent)});
 }
 assert.equal(edits.length,updates.size);
 for(const edit of edits.reverse())text=text.slice(0,edit.start)+edit.text+text.slice(edit.end);
 return text;
}

/** Exact alias binding/reference roles, plus all unchanged members/signatures. */
export function reviewMenuExitRoles(beforeText,currentText,rows){
 const before=parse(beforeText),current=parse(currentText);
 const imports=file=>file.statements.filter(ts.isImportDeclaration).map(n=>canonical(n,file));
 const removed="import { _MatMenuContentBase } from './menu-content-base';";
 assert.deepEqual(imports(current),imports(before).filter(s=>s!==removed),'import identities changed');
 const cls=file=>file.statements.find(n=>ts.isClassDeclaration(n)&&n.name?.text==='_MatMenuTriggerBase');
 const oldClass=cls(before),newClass=cls(current);assert.ok(oldClass&&newClass);
 const header=(n,f)=>f.text.slice(n.getStart(f),n.members.pos);
 assert.equal(header(oldClass,before),header(newClass,current),'class metadata or heritage changed');
 const memberKey=(n,f)=>`${ts.SyntaxKind[n.kind]}:${n.name?.getText(f)||''}`;
 const oldMembers=new Map(),newMembers=new Map();
 for(const [f,c,map]of [[before,oldClass,oldMembers],[current,newClass,newMembers]])for(const m of c.members){
  const k=memberKey(m,f);map.set(k,[...(map.get(k)||[]),m]);
 }
 const changed=['SetAccessor:menu','MethodDeclaration:ngOnDestroy','MethodDeclaration:openMenu',
  'MethodDeclaration:_destroyMenu','MethodDeclaration:_setIsMenuOpen','MethodDeclaration:_createOverlay'];
 const added=['PropertyDeclaration:_pendingRemoval','PropertyDeclaration:_keydownSubscription','PropertyDeclaration:_attachedMenu',
  'PropertyDeclaration:_menuGeneration','PropertyDeclaration:_destroyed','PropertyDeclaration:_closedMenus','MethodDeclaration:_detachMenu'];
 assert.deepEqual([...newMembers.keys()].filter(k=>!oldMembers.has(k)),added,'unexpected class member');
 for(const k of added)assert.ok(newMembers.get(k).every(m=>m.modifiers?.some(n=>n.kind===ts.SyntaxKind.PrivateKeyword)),'new private member lost its boundary');
 let unchanged=0;
 for(const [k,old]of oldMembers){const now=newMembers.get(k);assert.ok(now,'removed class member');assert.equal(now.length,old.length);
  for(const [i,m]of old.entries()){
   if(changed.includes(k))assert.equal(before.text.slice(m.getStart(before),m.body.getStart(before)),
    current.text.slice(now[i].getStart(current),now[i].body.getStart(current)),'member signature changed');
   else {assert.equal(m.getText(before),now[i].getText(current),'unchanged member changed: '+k);unchanged++;}
  }
 }
 const top=file=>file.statements.filter(n=>!ts.isImportDeclaration(n)&&n!==cls(file)).map(n=>canonical(n,file));
 assert.deepEqual(top(current).filter(s=>!s.startsWith('const MENU_PANEL_OWNERS =')),top(before),'unreviewed top-level source');
 const collect=(file,module,symbol)=>{
  const clause=file.statements.filter(ts.isImportDeclaration).filter(n=>n.moduleSpecifier.text===module)
   .flatMap(n=>(n.importClause?.namedBindings?.elements||[]).map(item=>({item,typeOnly:n.importClause.isTypeOnly||item.isTypeOnly})))
   .filter(({item})=>(item.propertyName||item.name).text===symbol);
  assert.equal(clause.length,1,'missing or ambiguous import binding '+symbol);
  const {item,typeOnly}=clause[0];
  const host={getSourceFile:name=>name===trigger?file:undefined,getDefaultLibFileName:()=>'',writeFile:()=>{},
   getCurrentDirectory:()=>'',getDirectories:()=>[],fileExists:name=>name===trigger,readFile:name=>name===trigger?file.text:undefined,
   getCanonicalFileName:name=>name,useCaseSensitiveFileNames:()=>true,getNewLine:()=> '\n'};
  const checker=ts.createProgram([trigger],{noResolve:true,noLib:true},host).getTypeChecker();
  const binding=checker.getSymbolAtLocation(item.name);assert.ok(binding);
  const references=[];
  const visit=node=>{if(ts.isIdentifier(node)&&node!==item.name&&checker.getSymbolAtLocation(node)===binding){
   let owner=node;while(owner&&!ts.isParameter(owner)&&!ts.isPropertyDeclaration(owner)&&!ts.isVariableDeclaration(owner))owner=owner.parent;
   references.push({parent:ts.SyntaxKind[node.parent.kind],expression:canonical(node.parent,file),owner:owner?.name?.getText(file)||null});
  }ts.forEachChild(node,visit);};visit(file);
  return {module,symbol,local:item.name.text,type_only:typeOnly,references};
 };
 assert.equal(rows.length,29);assert.equal(new Set(rows.map(key)).size,29);
 const roles=rows.map(row=>{
  const module=row.symbol==='MatMenuPanel'?'./menu-panel':row.module;
  const old=collect(before,module,row.symbol),now=collect(current,module,row.symbol);
  const oldRefs=old.references.map(r=>JSON.stringify(r));const remaining=now.references.slice();
  for(const ref of oldRefs){const i=remaining.findIndex(r=>JSON.stringify(r)===ref);assert.ok(i>=0,'original reference role changed: '+row.symbol);remaining.splice(i,1);}
  if(row.symbol==='MatMenuPanel'){
   assert.equal(now.type_only,true);assert.deepEqual(remaining.map(r=>r.owner),['MENU_PANEL_OWNERS','_attachedMenu','_closedMenus','menu']);
   assert.ok(remaining.every(r=>r.parent==='TypeReference'&&r.expression==='MatMenuPanel'),'owned panel escaped erased positions');
  }else assert.deepEqual(remaining,[],'new public import role: '+row.symbol);
  assert.deepEqual({...now,references:[]},{...old,references:[]},'changed import kind');
  if(row.symbol==='InjectionToken')assert.equal(now.references.length,0,'removed token acquired runtime use');
  return {file:row.file,module:row.module,symbol:row.symbol,import_binding:{module,local:now.local,type_only:now.type_only},
   preceding_references:old.references,current_references:now.references,additional_owned_erased_references:remaining};
 });
 return {unchanged_members:unchanged,changed_method_bodies:changed,added_private_members:added,roles};
}
const roleNotes={
 FocusMonitor:'All four constructor annotations and the complete focus method remain exact, including the genuine public focusVia call and program fallback. Closing now snapshots the input origin before output/focus reentry; the tested ownership/generation guards prevent an old close from disturbing a new menu.',
 FocusOrigin:'The Exclude<FocusOrigin, program | null> field and focus parameter annotations are unchanged. _destroyMenu copies _openedBy before callbacks and resets the field first; focus uses the captured value or program. This is the same public literal/type contract with bounded reentrant lifetime handling.',
 EventEmitter:'All four output annotations, two genuine EventEmitter<void> constructions and compatibility aliases remain exact. The close subscription now uses the public observer next/complete form; completion releases the attached view and prevents opening a destroyed panel. Current genuine Core/RxJS constructor protocols exercise completion/reentry, while actual 21.x and floor qualification remain pending.',
 MatMenuPanel:'The removed peer panel stays replaced by the historical locally owned type-only import. All original type roles remain; four new erased positions describe the ownership WeakMap, attached-menu field, closed-panel WeakSet and private detach parameter. No current peer panel or peer runtime token is restored. The owned panel declaration, public alias and consumer signatures are unchanged.',
 InjectionToken:'The import remains unused: checker-bound references are zero before and after the repair. No token construction, injection or runtime metadata role was introduced. Preserve the existing removed-use conclusion; this does not qualify other live tokens in the trigger.',
 ChangeDetectorRef:'The inject(ChangeDetectorRef) initializer and complete existing markForCheck receiver remain exact. The new close/reopen guard returns before stale highlight/change detection work; no service method, constructor role or injection flag changed.',
 Directive:'The complete public Directive invocation, standalone flag and every host binding/listener string remain exact. The exit fix adds private state and changes six owned method bodies; it changes no registration, selector, template or style contract.',
 ElementRef:'Every ElementRef<HTMLElement> constructor position and the complete constructor, focus, mouse and touch methods remain exact. No new native-element access or public wrapper construction was introduced by the exit state.',
};
function note(symbol){
 if(roleNotes[symbol])return roleNotes[symbol];
 if(['Input','Output','Inject','Optional','Self'].includes(symbol))return `Every checker-bound ${symbol} annotation expression and the complete constructor/property declaration carrying it remain exact. Public aliases, DI tokens/flags and optional/self metadata are unchanged; the lifecycle fix operates behind those existing boundaries. Actual Angular node/provider/query and packed behavior remain separate.`;
 if(['AfterContentInit','OnDestroy'].includes(symbol))return `The ${symbol} heritage type remains identical and erased. The existing constructor and public lifecycle signatures are exact; owned destruction now cancels pending subscriptions and detaches only its own view. This preserves the finite public type boundary without treating protocol teardown as native Angular lifecycle qualification.`;
 if(['ENTER','LEFT_ARROW','RIGHT_ARROW','SPACE'].includes(symbol))return `Every ${symbol} keycode reference and the entire existing key handler remain exact. The new overlay subscription lifetime removes a closed menu from keyboard dispatch and subscribes once on reopen; no key value, shortcut, focus policy or public import role changes. Genuine native interaction remains required.`;
 if(['isFakeMousedownFromScreenReader','isFakeTouchstartFromScreenReader','normalizePassiveListenerOptions'].includes(symbol))return `Every ${symbol} binding and helper call remains exact, as do the complete mouse/touch handlers, passive options initializer and listener registration/removal parameters. The earlier original/minimum helper judgment is retained only for this finite boundary; complete rendered accessibility and event behavior still require native qualification.`;
 return `Every ${symbol} import/type reference and its containing constructor, field or positioning method remains exact. The complete unchanged positioning/direction methods preserve the earlier public minimum identity and erasure judgment. Private menu ownership state adds no new use of this peer symbol; full native/packed and advertised floor evidence remain separate.`;
}

export async function inspectMenuExitContext({root=defaultRoot,readMember}={}){
 const read=path=>readMember?readMember(path):readFileSync(resolve(root,path));
 const line=JSON.parse(read('projects/ngx-material-legacy/package.json')).version.startsWith('21.')?'21.x':'main';
 const bytes=read(MENU_EXIT_CONTEXT_INPUTS);assert.equal(hash(bytes),inputHashes[line],'context input changed');const inputs=JSON.parse(bytes);
 assert.equal(inputs.line,line);assert.equal(inputs.source_scope_rows,52);assert.equal(inputs.authored_rows,29);
 assert.deepEqual(inputs.reports,[...paths].sort());
 const stored=read(inputs.prior_contexts.path);assert.equal(hash(stored),inputs.prior_contexts.sha256,'context archive changed');
 const raw=gunzipSync(stored);assert.equal(hash(raw),inputs.prior_contexts.raw_sha256);const prior=JSON.parse(raw);
 assert.equal(prior.line,line);assert.equal(prior.entries.length,52);assert.equal(prior.authored_rows.length,29);
 assert.equal(hash(prior.trigger_before),inputs.trigger.before_sha256);assert.equal(hash(read(trigger)),inputs.trigger.current_sha256,'tested menu trigger changed');
 assert.equal(hash(prior.frozen_before_text),inputs.frozen_before_sha256);assert.equal(hash(prior.current_before_text),inputs.current_dispositions_before_sha256);
 const oldDocs=new Map([...prior.reports,...prior.authored_review_documents].map(r=>{assert.equal(hash(r.text),r.sha256);return [r.path,Buffer.from(r.text)];}));
 const oldRead=path=>path===trigger?Buffer.from(prior.trigger_before):oldDocs.get(path)||read(path);
 for(const ref of inputs.evidence)assert.equal(hash(read(ref.path)),ref.sha256,'implementation evidence changed');
 const protocol=JSON.parse(read(inputs.evidence[1].path)),native=JSON.parse(read(inputs.evidence[2].path));
 assert.equal(protocol.line,line);assert.deepEqual(protocol.failures,[]);assert.equal(protocol.cases.length,18);assert.ok(protocol.cases.every(c=>c.result==='pass'));
 assert.equal(protocol.mutations.length,14);assert.ok(protocol.mutations.every(m=>m.rejected));
 assert.equal(protocol.native_or_packed_or_floor_qualified,false);assert.equal(protocol.producer_sha256,hash(read('tests/menu_overlay_exit_probe.mjs')));
 assert.equal(native.line,line);assert.equal(native.validator_controls,210);assert.equal(native.menu_mode_cases,18);assert.equal(native.actual_native_or_artifact_or_floor_executed,false);
 for(const member of [...protocol.source_members,...native.source_members])assert.equal(hash(read(member.path)),member.sha256,'tested implementation/producer drift');
 const docs=paths.map(p=>JSON.parse(oldDocs.get(p))),[build,consolidation,slider,thumb,bazel]=docs;
 const tracked=execFileSync('git',['-c','gc.auto=0','-c','maintenance.auto=0','ls-files','projects/ngx-material-legacy'],{cwd:root,encoding:'utf8'}).trim().split('\n');
 assert.equal(tracked.length,1141);assert.deepEqual(tracked,build.candidate_context.tracked_product_paths);
 assert.deepEqual(tracked,bazel.candidate_context.product_paths);
 const changed=[];
 for(const member of build.candidate_context.product_members){const old=oldRead(member.path),now=read(member.path);
  assert.equal(hash(old),member.sha256,'unreviewed product change: '+member.path);assert.equal(old.length,member.bytes);
  if(hash(now)!==member.sha256)changed.push({path:member.path,before_sha256:member.sha256,current_sha256:hash(now)});
 }
 assert.deepEqual(changed.map(m=>m.path),[trigger]);
 for(const member of [...build.candidate_context.files,...bazel.candidate_context.files,...bazel.candidate_context.pack_module_graph]){
  const now=read(member.path);assert.equal(hash(now),member.sha256,'build input/module changed: '+member.path);assert.equal(now.length,member.bytes);
 }
 const product=()=>candidateProductSourcePaths(root);
 const validate=(values,entries,reader)=>{
  const selected=path=>entries.filter(e=>e.evidence_report===path);
  assert.deepEqual(paths.map(p=>selected(p).length),[14,32,3,1,2]);
  for(const e of selected(paths[0]))assert.ok(buildScopeEvidenceOk(values[0],e,reader,tracked),'build source scope rejected');
  const cb=testConsolidationBatchOk(values[1],reader,tracked);assert.equal(cb,true,'consolidation source scope rejected');
  for(const e of selected(paths[1]))assert.ok(testConsolidationEntryOk(values[1],e,reader,cb));
  for(const e of selected(paths[2]))assert.ok(sliderInputScopeEvidenceOk(values[2],e,reader,product,line),'slider input source scope rejected');
  for(const e of selected(paths[3]))assert.ok(sliderThumbDestroyEvidenceOk(values[3],e,reader,product,line),'slider destroy source scope rejected');
  for(const e of selected(paths[4]))assert.ok(bazelBuildEvidenceOk(values[4],e,reader,()=>tracked,line),'Bazel source scope rejected');
 };
 const ledger=JSON.parse(read(ledgerPath));assert.equal(ledger.entries.length,1697);
 const oldLedger={...ledger,entries:ledger.entries.map(e=>prior.entries.find(p=>p.sha===e.sha)||e)};
 validate(docs,prior.entries,path=>path===ledgerPath?json(oldLedger):oldRead(path));
 const context={schema_version:1,line,source_parent:inputs.source_parent,changed,
  unchanged_product_members:1140,unchanged_build_inputs:11,unchanged_extended_build_inputs:13,
  unchanged_pack_module_graph:bazel.candidate_context.pack_module_graph,prior_contexts:inputs.prior_contexts,
  inputs:{path:MENU_EXIT_CONTEXT_INPUTS,sha256:hash(bytes)},implementation_evidence:inputs.evidence,
  original_decisions_hunks_and_analyses_retained:true,
  scope:'Only the independently tested owned menu trigger exit implementation changed. No build/compiler/Bazel/docs/demo/localize input or product membership changed. Preserve original exclusions, not a new runtime/security judgment.',
  actual_native_packed_or_floor_qualified:false,g11_claim:'not-passed'};
 const proposed=structuredClone(docs),[b,c,s,t,z]=proposed;
 b.candidate_context={...b.candidate_context,source_commit:inputs.source_parent,
  source_tree:execFileSync('git',['rev-parse',inputs.source_parent+'^{tree}'],{cwd:root,encoding:'utf8'}).trim(),
  product_members:tracked.map(path=>{const a=read(path);return {path,sha256:hash(a),bytes:a.length};})};
 const nextDocs=new Map();
 const save=i=>{let text=patchJson(oldDocs.get(paths[i]).toString(),i===0||i===1||i===4?{candidate_context:proposed[i].candidate_context}:{source_scope:proposed[i].source_scope});
  const pos=text.lastIndexOf('\n}');assert.ok(pos>0);text=text.slice(0,pos)+',\n  "menu_exit_context_requalification": '+JSON.stringify(context,null,2).replaceAll('\n','\n  ')+text.slice(pos);
  const value=JSON.parse(text);assert.deepEqual({...value,menu_exit_context_requalification:undefined},{...proposed[i],menu_exit_context_requalification:undefined});nextDocs.set(paths[i],Buffer.from(text));};
 save(0);c.candidate_context.sha256=hash(nextDocs.get(paths[0]));save(1);
 s.source_scope=reviewSliderInputScope(read,product,line);assert.deepEqual(noPopulation(s.source_scope),noPopulation(slider.source_scope));save(2);
 t.source_scope=reviewSliderThumbDestroyScope(read,product,line);
 assert.deepEqual({...t.source_scope,retained_architecture:noPopulation(t.source_scope.retained_architecture)},
  {...thumb.source_scope,retained_architecture:noPopulation(thumb.source_scope.retained_architecture)});save(3);
 z.candidate_context=reviewBazelBuildContext(read,()=>tracked,line);
 assert.deepEqual({...z.candidate_context,product_members:[],product_population_sha256:null},
  {...bazel.candidate_context,product_members:[],product_population_sha256:null});save(4);
 const entries=structuredClone(prior.entries);for(const e of entries)if(e.source_check)e.source_check.evidence_report_sha256=hash(nextDocs.get(e.evidence_report));
 const proposedLedger={...ledger,entries:ledger.entries.map(e=>entries.find(p=>p.sha===e.sha)||e)};
 const proposedRead=path=>nextDocs.get(path)||(path===ledgerPath?json(proposedLedger):read(path));
 validate(paths.map(p=>JSON.parse(nextDocs.get(p))),entries,proposedRead);
 for(const path of paths)assert.ok(read(path).equals(oldDocs.get(path))||read(path).equals(nextDocs.get(path)),'live source review changed');
 for(const e of prior.entries){const live=ledger.entries.find(r=>r.sha===e.sha);assert.ok(JSON.stringify(live)===JSON.stringify(e)||JSON.stringify(live)===JSON.stringify(entries.find(r=>r.sha===e.sha)),'live ledger judgment changed');}
 const oldFrozen=JSON.parse(prior.frozen_before_text),oldCurrent=JSON.parse(prior.current_before_text);
 assert.deepEqual(oldFrozen.symbol_uses.filter(r=>prior.authored_rows.some(a=>key(a)===key(r))),prior.authored_rows);
 const beforeReviews=authoredUseReviewEvidence({symbol_uses:prior.authored_rows},line,oldRead,hash);assert.equal(beforeReviews.reviewed,29);assert.equal(beforeReviews.insufficient,0,'prior authored evidence rejected');
 const roles=reviewMenuExitRoles(prior.trigger_before,read(trigger).toString(),prior.authored_rows);
 const diagnostic={schema_version:1,line,source_parent:inputs.source_parent,inputs_sha256:hash(bytes),
  before_sha256:inputs.trigger.before_sha256,current_sha256:hash(read(trigger)),...roles,
  original_public_boundaries_retained:true,new_owned_panel_positions:4,
  constructor_protocol_cases:18,constructor_corruption_controls:14,native_validator_controls:210,
  producer_sha256:hash(read('scripts/menu-exit-context-requalification.mjs')),
  actual_native_packed_or_floor_qualified:false,g11_claim:'not-passed'};
 nextDocs.set(diagnosticPath,json(diagnostic));
 const reviews=prior.authored_rows.map(row=>{
  const old=JSON.parse(oldDocs.get(row.source_review.path)).reviews.find(r=>key(r)===key(row));
  assert.equal(old.candidate_source_sha256,inputs.trigger.before_sha256);
  return {file:row.file,module:row.module,symbol:row.symbol,conclusion:old.conclusion,
   candidate_source_sha256:inputs.trigger.current_sha256,reviewer:'Codex finite menu exit context review',
   decision:note(row.symbol)+' Retain only the preceding finite source/API conclusion. Prior receipts are preserved; no full component, native/browser, packed artifact, compiler/Node/RxJS floor, security or G11 pass follows.',
   independent_evidence:[row.source_review,{path:MENU_EXIT_CONTEXT_INPUTS,sha256:hash(bytes)},
    {path:diagnosticPath,sha256:hash(nextDocs.get(diagnosticPath))},inputs.evidence[0]]};
 });
 nextDocs.set(reviewPath,json({schema_version:1,line,status:'reviewed',reviews,g11_claim:'not-passed'}));
 const selected=new Map(prior.authored_rows.map(r=>{const next=structuredClone(r);next.source_review={path:reviewPath,sha256:hash(nextDocs.get(reviewPath))};
  next.source_review_history=[...(next.source_review_history||[]),{source_parent:inputs.source_parent,prior_source_review:r.source_review,
   reason:'Explicit source-role review after tested menu exit repair; retain old judgments/receipts and qualify only their finite current bindings.'}];return [key(r),next];}));
 const frozenText=patchRows(prior.frozen_before_text,'symbol_uses',selected),frozen=JSON.parse(frozenText);
 nextDocs.set(frozenPath,Buffer.from(frozenText));
 const oldScan=scanCurrentAuthoredUses({root,readSource:oldRead}),current=scanCurrentAuthoredUses({root,readSource:read});
 assert.equal(oldCurrent.current_source_population_sha256,oldScan.source_population_sha256);
 assert.deepEqual(current.symbol_uses.map(key),oldScan.symbol_uses.map(key));assert.equal(current.symbol_uses.length,1958);assert.equal(current.source_files.length,531);
 assert.deepEqual(current.source_files.filter(r=>r.path!==trigger),oldScan.source_files.filter(r=>r.path!==trigger));
 nextDocs.set(currentPath,Buffer.from(patchJson(prior.current_before_text,{current_source_population_sha256:current.source_population_sha256})));
 const authoredRead=path=>nextDocs.get(path)||read(path);
 const admitted=currentAuthoredUseAdmission({root,current,frozen:oldFrozen.symbol_uses,candidate:JSON.parse(nextDocs.get(currentPath)),line,readMember:authoredRead});
 assert.equal(admitted.source_snapshot_valid,true);assert.equal(admitted.inventory.complete,true);assert.equal(admitted.additional_uses,308);assert.equal(admitted.removed_seed_uses,86);
 assert.equal(admitted.review_evidence.reviewed,178);assert.equal(admitted.inventory.open,130);assert.equal(admitted.review_evidence.insufficient,0);assert.equal(admitted.ready,false);
 const reviewed=authoredUseReviewEvidence(frozen,line,authoredRead,hash);assert.equal(reviewed.reviewed,1446);assert.equal(reviewed.insufficient,0);
 for(const path of [frozenPath,currentPath]){
  const old=path===frozenPath?Buffer.from(prior.frozen_before_text):Buffer.from(prior.current_before_text);
  assert.ok(read(path).equals(old)||read(path).equals(nextDocs.get(path)),'live authored disposition changed');
 }
 return {schema_version:1,line,source_parent:inputs.source_parent,context,source_scope_rows:52,authored_rows:29,
  diagnostic,current_admission:admitted,frozen_review_evidence:reviewed,
  sensitive_context_findings:[
   {sha:'b5d4de9794cd6c826a9a2d4fb27e7e9e3cb884ac',finding:'The compiler rootDir/LogicalProjectStrategy patch stays absent; unchanged compiler/package/lock/ng-packagr inputs still have no patchedDependencies. Runtime menu ownership introduces no compiler path or option.'},
   {sha:'ae9678df4b22be90ae27cec25224e364e91963f5',finding:'All six non-Bazel demo/dev-app/localize hunk analyses remain exact. The menu fix adds no source entrypoint or localize initialization; the same explicit project/tsconfig excludes those upstream routes.'},
   {sha:'5d27e7c0b454ef721b7a4dfdf99e18884f690378',finding:'The original highlight.js require/default-import hunk remains confined to the upstream documentation generator. The maintained two-module pack graph and every build input are exact; menu lifecycle state adds no docs route.'},
   {sha:'e500a8ea9ad5043dd2775b39e395204b5cbdb78b',finding:'The default/default2 Bazel merge still has no maintained execution path. Full product membership is identical, all unrelated source/style bytes match, and the owned trigger change adds no Bazel rule, macro or release wrapper.'},
   {sha:'ba5cf3d06ebfbb2bf945378cf0f786e68abeab6a',finding:'The complete 157-path/332-hunk ts_project review remains exact: Starlark syntax, three JSON configurations and five erased test annotations retain their original analysis. No upstream test/Bazel/config graph enters the unchanged maintained ng-packagr/npm path through private menu state.'},
  ],entries,documents:[...nextDocs].map(([path,bytes])=>({path,text:bytes.toString(),sha256:hash(bytes)})),
  new_sha_or_authored_use_closures:0,actual_native_packed_or_floor_qualified:false,g11_claim:'not-passed'};
}
export async function recordMenuExitContext(root=defaultRoot){
 const read=path=>readFileSync(resolve(root,path)),inputs=JSON.parse(read(MENU_EXIT_CONTEXT_INPUTS));
 for(const [path,sha]of [[ledgerPath,inputs.ledger_before_sha256],[frozenPath,inputs.frozen_before_sha256],[currentPath,inputs.current_dispositions_before_sha256]])assert.equal(hash(read(path)),sha,'state changed before recording');
 assert.equal(existsSync(resolve(root,proofPath)),false,'already recorded');
 const result=await inspectMenuExitContext({root});
 const ledgerText=patchRows(read(ledgerPath).toString(),'entries',new Map(result.entries.map(e=>[e.sha,e])));
 const original=JSON.parse(read(ledgerPath)),updated=JSON.parse(ledgerText);
 const strip=e=>{const x=structuredClone(e);if(x.source_check)delete x.source_check.evidence_report_sha256;return x;};
 assert.deepEqual(updated.entries.map(strip),original.entries.map(strip));
 for(const d of result.documents)writeFileSync(resolve(root,d.path),d.text);
 writeFileSync(resolve(root,ledgerPath),ledgerText);
 const report={...result,producer_sha256:hash(read('scripts/menu-exit-context-requalification.mjs')),
  requalified_reports:result.documents.map(({path,sha256})=>({path,sha256}))};delete report.documents;delete report.entries;
 writeFileSync(resolve(root,proofPath),json(report),{flag:'wx'});
 return {line:result.line,source_scope_rows:52,authored_rows:29,new_closures:0,g11_claim:'not-passed'};
}
if(process.argv[1]&&import.meta.url===pathToFileURL(resolve(process.argv[1])).href){
 assert.deepEqual(process.argv.slice(2),['--record']);console.log(JSON.stringify(await recordMenuExitContext()));
}
