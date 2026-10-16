/**
 * @license
 * Copyright Google LLC All Rights Reserved.
 * Copyright (c) 2026 Ryan Lester.
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.io/license
 */
/** Complete immutable import/setup changes only. No compiler, render, clock or lifetime equivalence. */
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {createRequire} from 'node:module';
import {readFileSync,writeFileSync} from 'node:fs';
import {gunzipSync} from 'node:zlib';
import {dirname,resolve} from 'node:path';
import {fileURLToPath} from 'node:url';
import {reviewCompleteSingleSpec} from './authenticated-single-spec-review.mjs';
import {originalEnvironmentCases} from './spec-test-environment-source-review.mjs';
import {overlayHooks} from './spec-overlay-async-source-review.mjs';
import {inspectChipEmptyRepair} from './spec-stability-chip-repair.mjs';
import {deriveHistoricalRoster} from './historical-case-roster.mjs';
const ts=createRequire(import.meta.url)('typescript'),rootDefault=resolve(dirname(fileURLToPath(import.meta.url)),'..');
const hash=bytes=>createHash('sha256').update(bytes).digest('hex');
export const IMPORT_CLEANUP_SHAS=['fa0f514fce6a166cf38eb4c31e90959c932f97b6','409948f39781c74dc2f69c1501180a17b10492a2'];
const pinPath='compatibility/rc/spec-import-cleanup-source-observation-pins.json.gz',pinSha='a9367b7fe6a1bb1fb4966df598d26add2709a0a1b47605033a069e0c911fbd5f';
const capsulePins={main:['80cfd49fe7b7c0d1bdcbdaa08dba7ec018ce95a62d19b1abd50dc5b634b698c5','ecd828fc3ca54d38ffbcdff33ddd747205fd3589e9893de2841b11a7dbe3d9a9'],
 '21.x':['9785e77eef18ea086f840e241395285729a97c350f26eaca04b318ec429c36fa','c27032c1a6f633aaf1f42e5aba89dc3b51430a0df10d94be6aa195156372dcd1']};
const parse=text=>{const file=ts.createSourceFile('original.spec.ts',text,ts.ScriptTarget.Latest,true);assert.equal(file.parseDiagnostics.length,0);return file;};
function collect(node,predicate){const rows=[];function visit(n){if(predicate(n))rows.push(n);ts.forEachChild(n,visit);}visit(node);return rows;}
function semantic(n){const c=[];ts.forEachChild(n,x=>{c.push(semantic(x));});return[n.kind,n.isTypeOnly??null,ts.isVariableDeclarationList(n)?n.flags&(ts.NodeFlags.Const|ts.NodeFlags.Let):null,ts.isIdentifier(n)?n.text:ts.isLiteralExpression(n)?n.text:null,c];}
const callName=(n,f)=>ts.isCallExpression(n)?n.expression.getText(f):'';
function insideHook(n,f){for(let p=n.parent;p;p=p.parent)if(ts.isCallExpression(p)&&['beforeEach','afterEach','beforeAll','afterAll'].includes(callName(p,f)))return true;return false;}
function importSlot(n,f){if(!(ts.isPropertyAssignment(n)||ts.isShorthandPropertyAssignment(n))||n.name.getText(f)!=='imports'||!ts.isObjectLiteralExpression(n.parent))return false;const call=n.parent.parent;if(!ts.isCallExpression(call))return false;const name=callName(call,f);return['Component','NgModule','Directive'].includes(name)||name.endsWith('.configureTestingModule');}
export function projectImportCleanup(m,side){const f=parse(m[side].text),records=[];
 function capture(kind,n,extra={}){const ancestry=[];let child=n;for(let p=n.parent;p;p=p.parent){const children=[];ts.forEachChild(p,x=>{children.push(x);});ancestry.unshift([ts.SyntaxKind[p.kind],children.indexOf(child)]);child=p;}
  records.push({kind,start:n.getStart(f),end:n.end,parent:ts.SyntaxKind[n.parent.kind],ancestry,sha256:hash(n.getText(f)),raw:n.getText(f),...extra});}
const changed=ts.transform(f,[context=>{const visit=n=>{
 if(ts.isImportDeclaration(n)){capture('import',n);return undefined;}
 if(importSlot(n,f)){capture('imports-metadata',n);return undefined;}
 if(side==='before'&&m.path==='src/cdk/overlay/overlay-directives.zone.spec.ts'&&ts.isClassDeclaration(n)&&n.name?.text==='ConnectedOverlayPropertyInitOrder'){capture('removed-unused-private-class',n);return undefined;}

 if(side==='before'&&m.path==='src/cdk-experimental/table-scroll-container/table-scroll-container.spec.ts'&&ts.isFunctionDeclaration(n)&&['createComponent','setupTableTestApp'].includes(n.name?.text)){capture('removed-local-helper-parameter',n);return ts.visitEachChild(ts.factory.updateFunctionDeclaration(n,n.modifiers,n.asteriskToken,n.name,n.typeParameters,n.parameters.filter(p=>p.name.getText(f)!=='declarations'),n.type,n.body),visit,context);}
 if(side==='before'&&m.path==='src/cdk-experimental/table-scroll-container/table-scroll-container.spec.ts'&&ts.isCallExpression(n)&&callName(n,f)==='createComponent'&&n.arguments.length===2){capture('removed-local-helper-forwarding',n);return ts.visitEachChild(ts.factory.updateCallExpression(n,n.expression,n.typeArguments,[n.arguments[0]]),visit,context);}
 if(side==='before'&&m.path==='src/cdk/a11y/focus-trap/event-listener-inert-strategy.spec.ts'&&ts.isPropertyAssignment(n)&&n.name.getText(f)==='providers'&&n.initializer.getText(f)==='providers'){capture('provider-shorthand',n);return ts.factory.createShorthandPropertyAssignment('providers');}
 if(ts.isCallExpression(n)&&n.expression.getText(f)==='setupComponent'&&n.arguments.length===2&&ts.isArrayLiteralExpression(n.arguments[1])&&n.arguments[1].elements.length===1&&n.arguments[1].elements[0].getText(f)==='CommonModule'){capture('CommonModule-helper-argument',n);return ts.visitEachChild(ts.factory.updateCallExpression(n,n.expression,n.typeArguments,[n.arguments[0]]),visit,context);}
 if(ts.isCallExpression(n)&&['fakeAsync','waitForAsync'].includes(callName(n,f))&&insideHook(n,f)){assert.equal(n.arguments.length,1);capture('hook-wrapper',n,{wrapper:callName(n,f)});return ts.visitNode(n.arguments[0],visit);}
 if(ts.isArrowFunction(n)&&insideHook(n,f)){if(n.modifiers?.some(x=>x.kind===ts.SyntaxKind.AsyncKeyword))capture('hook-async-modifier',n);const next=ts.visitEachChild(n,visit,context);let body=next.body;if(ts.isCallExpression(body)&&callName(body,f)==='TestBed.configureTestingModule'&&ts.isObjectLiteralExpression(body.arguments[0])&&body.arguments[0].properties.length===0){capture('empty-expression-hook-body',n);body=ts.factory.createBlock([],false);}return ts.factory.updateArrowFunction(next,next.modifiers?.filter(n=>n.kind!==ts.SyntaxKind.AsyncKeyword),next.typeParameters,next.parameters,next.type,next.equalsGreaterThanToken,body);}
 if((ts.isExpressionStatement(n)||ts.isReturnStatement(n))&&n.expression&&ts.isCallExpression(n.expression)&&callName(n.expression,f)==='TestBed.configureTestingModule'&&(insideHook(n,f)||m.path==='src/cdk-experimental/table-scroll-container/table-scroll-container.spec.ts')){
  const next=ts.visitEachChild(n,visit,context);if(ts.isObjectLiteralExpression(next.expression.arguments[0])&&next.expression.arguments[0].properties.length===0){capture('empty-testing-module-call',n);return undefined;}return next;
 }
 if(ts.isExpressionStatement(n)&&ts.isCallExpression(n.expression)&&['beforeEach','afterEach','beforeAll','afterAll'].includes(callName(n.expression,f))){const next=ts.visitEachChild(n,visit,context),callback=next.expression.arguments[0];if(ts.isArrowFunction(callback)&&ts.isBlock(callback.body)&&callback.body.statements.length===0){capture('empty-hook',n);return undefined;}return next;}
 return ts.visitEachChild(n,visit,context);
 };return n=>ts.visitNode(n,visit);}]);const result=changed.transformed[0],row={fingerprint:hash(JSON.stringify(semantic(result))),records};changed.dispose();return row;}

/** Resolve local binding identity without importing any upstream or candidate module. */
function bindingModel(member,side){
 const file=parse(member[side].text),options={noResolve:true,noLib:true},host=ts.createCompilerHost(options);
 host.getSourceFile=p=>p==='original.spec.ts'?file:undefined;host.fileExists=p=>p==='original.spec.ts';host.readFile=p=>p==='original.spec.ts'?member[side].text:undefined;
 const checker=ts.createProgram(['original.spec.ts'],options,host).getTypeChecker(),identifiers=collect(file,ts.isIdentifier),bindings=[];
 for(const declaration of file.statements.filter(ts.isImportDeclaration)){
  const clause=declaration.importClause;if(!clause)continue;const names=[];
  if(clause.name)names.push({node:clause.name,exported:'default',type_only:clause.isTypeOnly});
  if(clause.namedBindings){if(ts.isNamedImports(clause.namedBindings))for(const item of clause.namedBindings.elements)names.push({node:item.name,exported:(item.propertyName||item.name).text,type_only:clause.isTypeOnly||item.isTypeOnly});else names.push({node:clause.namedBindings.name,exported:'*',type_only:clause.isTypeOnly});}
  for(const {node,exported,type_only} of names){const symbol=checker.getSymbolAtLocation(node);assert.ok(symbol);
   bindings.push({module:declaration.moduleSpecifier.text,exported,local:node.text,type_only:!!type_only,references:identifiers.filter(n=>n!==node&&checker.getSymbolAtLocation(n)===symbol).map(n=>({start:n.getStart(file),end:n.end,parent:ts.SyntaxKind[n.parent.kind]}))});
  }
 }
 return{file,checker,identifiers,bindings};
}
const bindingKey=n=>JSON.stringify([n.module,n.exported,n.local,n.type_only]);
function localHelperProof(model,side){
 const {file,checker,identifiers}=model,rows=[];
 for(const helper of collect(file,n=>ts.isFunctionDeclaration(n)&&['createComponent','setupTableTestApp'].includes(n.name?.text))){
  assert.equal(helper.modifiers?.some(n=>n.kind===ts.SyntaxKind.ExportKeyword)||false,false);
  assert.equal(helper.parameters.length,side==='before'?2:1);
  const symbol=checker.getSymbolAtLocation(helper.name),references=identifiers.filter(n=>n!==helper.name&&checker.getSymbolAtLocation(n)===symbol);
  const calls=references.map(n=>{assert.ok(ts.isCallExpression(n.parent)&&n.parent.expression===n,'local helper escapes');const call=n.parent;const forwarded=side==='before'&&helper.name.text==='createComponent'&&call.arguments.length===2;
   assert.equal(call.arguments.length,forwarded?2:1,'nondefault helper argument');if(forwarded)assert.equal(call.arguments[1].getText(file),'declarations');
   return{start:call.getStart(file),sha256:hash(call.getText(file)),forwarded};});
  let parameter=null;if(side==='before'){const n=helper.parameters[1];assert.equal(n.name.getText(file),'declarations');assert.equal(n.type.getText(file),'any[]');assert.ok(ts.isArrayLiteralExpression(n.initializer));assert.equal(n.initializer.elements.length,0);
   const parameterSymbol=checker.getSymbolAtLocation(n.name),uses=identifiers.filter(x=>x!==n.name&&checker.getSymbolAtLocation(x)===parameterSymbol);assert.equal(uses.length,1,'removed parameter has extra use');
   const use=uses[0];if(helper.name.text==='createComponent')assert.ok(ts.isSpreadElement(use.parent)&&ts.isArrayLiteralExpression(use.parent.parent));else assert.ok(ts.isCallExpression(use.parent)&&callName(use.parent,file)==='createComponent');
   parameter={sha256:hash(n.getText(file)),reference_start:use.getStart(file),reference_parent:ts.SyntaxKind[use.parent.kind]};
  }
  rows.push({name:helper.name.text,sha256:hash(helper.getText(file)),parameter,calls});
 }
 assert.equal(rows.length,2);return rows;
}
/** Original observation, not a self-approved expectation: persisted pins are immutable. */
export function observeImportCleanupFile(member){
 const before=projectImportCleanup(member,'before'),after=projectImportCleanup(member,'after'),a=bindingModel(member,'before'),b=bindingModel(member,'after');
 const removed=a.bindings.filter(n=>!b.bindings.some(q=>bindingKey(n)===bindingKey(q))),added=b.bindings.filter(n=>!a.bindings.some(q=>bindingKey(n)===bindingKey(q)));
 // Every reference to a changed import must lie in a specifically recorded original scaffold node.
 for(const [side,bindings,projection] of [['before',removed,before],['after',added,after]])for(const binding of bindings)for(const ref of binding.references)assert.ok(projection.records.some(n=>n.kind!=='import'&&n.start<=ref.start&&n.end>=ref.end),'changed binding escapes enumerated fixture setup '+side+' '+binding.local);
 const unresolved=[];for(const binding of removed)for(const n of b.identifiers.filter(n=>n.text===binding.local)){
  if(ts.isPropertyAccessExpression(n.parent)&&n.parent.name===n)continue;
  if((ts.isPropertyAssignment(n.parent)||ts.isPropertySignature(n.parent)||ts.isMethodDeclaration(n.parent))&&n.parent.name===n)continue;
  if(ts.isImportSpecifier(n.parent)||ts.isImportClause(n.parent))continue;
  if(!b.checker.getSymbolAtLocation(n))unresolved.push({name:binding.local,start:n.getStart(b.file)});
 }assert.deepEqual(unresolved,[],'removed import leaves unresolved use');
 const subject={members:[member]},caseRows=side=>originalEnvironmentCases(subject,side).map(({raw,...n})=>n),hookRows=side=>overlayHooks(subject,side).map(({raw,...n})=>n);
 const casesBefore=caseRows('before'),casesAfter=caseRows('after');assert.deepEqual(casesBefore.map(n=>n.key),casesAfter.map(n=>n.key),'case identities/modes/order changed');
 const removedClass=before.records.find(n=>n.kind==='removed-unused-private-class');
 if(removedClass){const cls=collect(a.file,ts.isClassDeclaration).find(n=>n.getStart(a.file)===removedClass.start);assert.ok(cls);assert.equal(cls.modifiers?.some(n=>n.kind===ts.SyntaxKind.ExportKeyword)||false,false);const symbol=a.checker.getSymbolAtLocation(cls.name);const references=a.identifiers.filter(n=>n!==cls.name&&a.checker.getSymbolAtLocation(n)===symbol);assert.equal(references.length,1);for(const n of references)assert.ok(before.records.some(r=>r.kind==='imports-metadata'&&r.start<=n.getStart(a.file)&&r.end>=n.end),'removed fixture is used outside removed setup metadata');}
 const propertyRows=(file,filter)=>collect(file,n=>ts.isPropertyAssignment(n)&&['template','styles','templateUrl','styleUrl','styleUrls'].includes(n.name.getText(file))&&(!filter||n.getStart(file)<filter.start||n.end>filter.end)).map(n=>({property:n.name.getText(file),sha256:hash(n.getText(file))}));
 const templatesBefore=propertyRows(a.file,removedClass),templatesAfter=propertyRows(b.file);assert.deepEqual(templatesBefore,templatesAfter,'retained template/style changed');
 const helperFile=member.path==='src/cdk-experimental/table-scroll-container/table-scroll-container.spec.ts';
 return{path:member.path,before,after,before_bindings:a.bindings,after_bindings:b.bindings,removed_bindings:removed,added_bindings:added,unresolved_removed_names:unresolved,cases_before:casesBefore,cases_after:casesAfter,hooks_before:hookRows('before'),hooks_after:hookRows('after'),retained_templates:templatesBefore,removed_unused_class:removedClass?{sha256:removedClass.sha256,sole_reference_in_removed_setup_metadata:true,no_test_instance_reference:true}:null,local_helpers:helperFile?{before:localHelperProof(a,'before'),after:localHelperProof(b,'after')}:null};
}
export function reviewImportCleanupFile(member,pin){
 assert.equal(member.path,pin.path);
 for(const side of ['before','after'])assert.deepEqual(projectImportCleanup(member,side).records,pin[side].records,'unreviewed original normalization operation/context '+side+' '+member.path);
 const observed=observeImportCleanupFile(member);
 for(const key of ['before_bindings','after_bindings','removed_bindings','added_bindings','unresolved_removed_names','cases_before','cases_after','hooks_before','hooks_after','retained_templates','removed_unused_class','local_helpers'])assert.deepEqual(observed[key],pin[key],'original '+key+' changed '+member.path);
 assert.equal(observed.before.fingerprint,observed.after.fingerprint,'non-scaffold program operation or registration changed '+member.path);
 assert.equal(observed.before.fingerprint,pin.before.fingerprint,'retained original program changed '+member.path);return observed;
}
export function authenticateImportCleanupOriginal(subject,pins){
 assert.equal(subject.sha,pins.sha);assert.deepEqual(subject.members.map(n=>n.path),pins.paths);assert.deepEqual(subject.complete_changed_files.map(n=>n.path),pins.paths);assert.equal(hash(subject.diff),pins.diff_sha256);assert.equal(subject.diff_sha256,pins.diff_sha256);assert.equal(subject.raw_commit_sha256,pins.raw_commit_sha256);
 const parts=subject.diff.split(/(?=^diff --git )/m).filter(Boolean),hunks=[];assert.equal(parts.length,pins.paths.length);
 for(const[i,member]of subject.members.entries()){const identity=subject.complete_changed_files[i],diff=parts[i];assert.equal(identity.status,'M');assert.equal(identity.before_mode,'100644');assert.equal(identity.after_mode,'100644');hunks.push(...reviewCompleteSingleSpec({...subject,members:[member],complete_changed_files:[identity],diff,diff_sha256:hash(diff),diff_bytes:Buffer.byteLength(diff),original_hunks:(diff.match(/^@@ /gm)||[]).length},IMPORT_CLEANUP_SHAS));}
 assert.equal(hunks.length,pins.original_hunks);assert.equal(subject.original_hunks,hunks.length);return hunks;
}
export function importCleanupPins({root=rootDefault,readMember}={}){const read=readMember||(path=>readFileSync(resolve(root,path))),bytes=read(pinPath);assert.equal(hash(bytes),pinSha);const data=JSON.parse(gunzipSync(bytes));assert.deepEqual(data.subjects.map(n=>n.sha),IMPORT_CLEANUP_SHAS);return data.subjects;}

export function inspectImportCleanupSources({root=rootDefault,readMember}={}){const read=readMember||(path=>readFileSync(resolve(root,path))),line=JSON.parse(read('projects/ngx-material-legacy/package.json')).version.startsWith('21.')?'21.x':'main',pins=importCleanupPins({root,readMember:read});
 const paths=['compatibility/rc/spec-import-cleanup-source-subjects.json.gz','compatibility/rc/spec-import-cleanup-source-acquisition.json.gz'];const[originals,acquisition]=paths.map((path,i)=>{const bytes=read(path);assert.equal(hash(bytes),capsulePins[line][i]);return JSON.parse(gunzipSync(bytes));});assert.deepEqual(originals.subjects.map(n=>n.sha),IMPORT_CLEANUP_SHAS);assert.deepEqual(acquisition.subjects,IMPORT_CLEANUP_SHAS);
 for(const packet of[originals,acquisition]){assert.equal(packet.line,line);assert.equal(hash(read(packet.producer.path)),packet.producer.sha256);assert.equal(hash(packet.selection.worksheet_text),packet.selection.sha256);assert.deepEqual(JSON.parse(packet.selection.worksheet_text).subjects,IMPORT_CLEANUP_SHAS);}assert.equal(acquisition.shared_cache_written,false);assert.equal(acquisition.credentials_used_or_changed,false);assert.equal(acquisition.upstream_or_candidate_source_executed,false);assert.equal(acquisition.private_temporary_object_view_removed,true);
 const censusPath='compatibility/rc/upstream-complete-patch-census.json.gz',censusBytes=read(censusPath),census=JSON.parse(gunzipSync(censusBytes));assert.equal(originals.source_inventory.sha256,hash(censusBytes));assert.equal(census.line,line);assert.equal(census.commits.length,1697);const identities=[];
 for(const subject of originals.subjects){const row=census.commits.find(n=>n.sha===subject.sha);assert.equal(subject.raw_commit,row.raw_commit);assert.deepEqual(subject.complete_changed_files,row.complete_changed_files);for(const member of subject.members)for(const side of['before','after'])identities.push({commit:subject.sha,path:member.path,side,revision:side==='before'?subject.parents[0]:subject.sha,git_blob:member[side].git_blob,sha256:member[side].sha256,bytes:member[side].bytes});}assert.deepEqual(acquisition.members.map(({source,url,...row})=>{assert.ok(['existing-cache','immutable-upstream-raw'].includes(source));assert.equal(typeof url==='string',source==='immutable-upstream-raw');return row;}),identities);
 assert.equal(hash(read('scripts/authenticated-single-spec-review.mjs')),'001ff69797a4c85027cec3b2ee06fac31e8eb64e59dcf4b41872631b1e09421c');
 assert.equal(hash(read('scripts/spec-test-environment-source-review.mjs')),'372019625c8c3a2a48c1af3a12b1f4016528750835be96e3fb169e18d48aaadd');
 assert.equal(hash(read('scripts/spec-overlay-async-source-review.mjs')),'aac40828833dd41be945ecb74a88c012b27f2b5f2020f1e4725314a74f3bc723');
 const subjects=originals.subjects.map((subject,index)=>{
  const hunks=authenticateImportCleanupOriginal(subject,pins[index]);
  const files=subject.members.map((m,i)=>reviewImportCleanupFile(m,pins[index].files[i]));
  const cases=files.flatMap(n=>n.cases_before.map((old,i)=>({path:n.path,key:old.key,before_sha256:old.sha256,after_sha256:n.cases_after[i].sha256,complete_callback_semantics_equal:old.callback_sha256===n.cases_after[i].callback_sha256})));
  return{sha:subject.sha,complete_original_files:files.length,complete_original_hunks:hunks.length,hunks,files,cases,
   paired_cases:cases.length,unchanged_complete_callbacks:cases.filter(n=>n.complete_callback_semantics_equal).length,
   hooks_before:files.reduce((k,n)=>k+n.hooks_before.length,0),hooks_after:files.reduce((k,n)=>k+n.hooks_after.length,0),
   retained_template_style_properties:files.reduce((k,n)=>k+n.retained_templates.length,0),
   removed_bindings:files.reduce((k,n)=>k+n.removed_bindings.length,0),added_bindings:files.reduce((k,n)=>k+n.added_bindings.length,0),
   removed_private_fixture_classes:files.filter(n=>n.removed_unused_class).length,local_helper_signature_changes:files.reduce((k,n)=>k+(n.local_helpers?2:0),0),
   all_non_scaffold_program_operations_and_registration_order_equal:true,actual_Angular_native_artifact_or_floor_qualified:false};
 });
 assert.deepEqual(subjects.map(n=>[n.complete_original_files,n.complete_original_hunks,n.paired_cases,n.unchanged_complete_callbacks,n.hooks_before,n.hooks_after,n.retained_template_style_properties,n.removed_bindings,n.added_bindings,n.removed_private_fixture_classes,n.local_helper_signature_changes]),[[16,96,595,593,67,67,125,16,1,0,0],[46,92,1054,1053,189,163,101,17,0,1,2]]);
 const product=inspectChipEmptyRepair({root,readMember:read}),roster=deriveHistoricalRoster(root);assert.equal(roster.ids.length+roster.discovery_negative_ids.length,2228);
 const context=JSON.parse(read('compatibility/rc/spec-stability-context-checkpoint.json'));for(const ref of context.output_metadata)if(ref.path!=='compatibility/f10/disposition-ledger/ledger.json')assert.equal(hash(read(ref.path)),ref.sha256);
 return{schema_version:1,line,subjects,complete_original_files:62,complete_original_bodies:124,complete_original_hunks:188,paired_cases:1649,unchanged_complete_callbacks:1646,changed_callbacks:3,hooks_before:256,hooks_after:230,retained_template_style_properties:226,removed_bindings:33,added_bindings:1,removed_private_fixture_classes:1,local_helper_signature_changes:2,owned_product_members:product.product_members,current_owned_case_bodies:2223,current_required_historical_case_ids:2228,required_consumer_CSS_SCSS_changes:0,actual_Angular_native_artifact_or_floor_qualified:false,security_clearance:'not-passed',g11_claim:'not-passed'};
}
if(process.argv[1]&&resolve(process.argv[1])===fileURLToPath(import.meta.url)){
 const report=inspectImportCleanupSources(),out=process.argv.indexOf('--out');if(out>=0)writeFileSync(process.argv[out+1],JSON.stringify(report,null,2)+'\n',{flag:'wx'});
 console.log(JSON.stringify({...report,subjects:report.subjects.map(({hunks,files,cases,...summary})=>summary)}));
}
