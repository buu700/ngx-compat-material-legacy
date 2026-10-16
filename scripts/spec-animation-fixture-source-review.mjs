/**
 * @license
 * Copyright Google LLC All Rights Reserved.
 * Copyright (c) 2026 Ryan Lester.
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.io/license
 */
/** Individually reviewed animation fixture changes; source applicability only, with no native/clock/lifecycle equivalence. */
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {createRequire} from 'node:module';
import {readFileSync,writeFileSync} from 'node:fs';
import {gunzipSync} from 'node:zlib';
import {dirname,resolve} from 'node:path';
import {fileURLToPath} from 'node:url';
import {reviewCompleteSingleSpec} from './authenticated-single-spec-review.mjs';
import {originalEnvironmentCases} from './spec-test-environment-source-review.mjs';
import {projectImportCleanup} from './spec-import-cleanup-source-review.mjs';
import {overlayHooks} from './spec-overlay-async-source-review.mjs';
import {inspectChipEmptyRepair} from './spec-stability-chip-repair.mjs';
import {deriveHistoricalRoster} from './historical-case-roster.mjs';
const ts=createRequire(import.meta.url)('typescript'),rootDefault=resolve(dirname(fileURLToPath(import.meta.url)),'..');
const hash=bytes=>createHash('sha256').update(bytes).digest('hex');
export const ANIMATION_FIXTURE_SHAS=['bc0c443e569975e4ddd16a2659104a0e790587e4','f60e17f3d176803a2d807f5a50b598809072eb12'];
const pinPath='compatibility/rc/spec-animation-fixture-source-observation-pins-v2.json.gz',pinSha='f76c9d2e0f4055b2356781a927caf35dee9164e8b4e0cfd2898005942dbb4b2b';
const capsulePins={"main": ["99b0639c14d8b475ce5f2a27853e0191f5c04ae92b0bc1c126a975344bb4701f", "b4bbeb0792578ca2ce10b83a5fc623ea4df41876694de6850ff822d5e164ae69"], "21.x": ["737e1ddc3ed54a701b44173a258464f09edbef8861d9b7b8f32a817e087d5ad0", "8284cd42920a90385e6217beef79e35c279c22ef02ce8e69e31be85be582311b"]};
const parse=text=>{const file=ts.createSourceFile('original.spec.ts',text,ts.ScriptTarget.Latest,true);assert.equal(file.parseDiagnostics.length,0);return file;};
function collect(node,predicate){const rows=[];function visit(n){if(predicate(n))rows.push(n);ts.forEachChild(n,visit);}visit(node);return rows;}
function semantic(n){const c=[];ts.forEachChild(n,x=>{c.push(semantic(x));});return[n.kind,n.isTypeOnly??null,ts.isVariableDeclarationList(n)?n.flags&(ts.NodeFlags.Const|ts.NodeFlags.Let):null,ts.isIdentifier(n)?n.text:ts.isLiteralExpression(n)?n.text:null,c];}
const callName=(n,f)=>ts.isCallExpression(n)?n.expression.getText(f):'';
function insideHook(n,f){for(let p=n.parent;p;p=p.parent)if(ts.isCallExpression(p)&&['beforeEach','afterEach','beforeAll','afterAll'].includes(callName(p,f)))return true;return false;}
function importSlot(n,f){if(!(ts.isPropertyAssignment(n)||ts.isShorthandPropertyAssignment(n))||n.name.getText(f)!=='imports'||!ts.isObjectLiteralExpression(n.parent))return false;const call=n.parent.parent;if(!ts.isCallExpression(call))return false;const name=callName(call,f);return['Component','NgModule','Directive'].includes(name)||name.endsWith('.configureTestingModule');}
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

const helperScopes={
 [ANIMATION_FIXTURE_SHAS[0]]:{'src/material/chips/chip-grid.spec.ts':['createComponent'],'src/material/input/input.spec.ts':['configureTestingModule']},
 [ANIMATION_FIXTURE_SHAS[1]]:{'src/material/chips/chip-grid.spec.ts':['createComponent'],'src/material/core/ripple/ripple.spec.ts':['createTestComponent'],'src/material/menu/menu.spec.ts':['createComponent']},
};
const modes=['it','fit','xit','beforeEach','afterEach','beforeAll','afterAll'];
function sourceScopes(node,file){const scopes=[];for(let p=node.parent;p;p=p.parent)if(ts.isCallExpression(p)&&['describe','fdescribe','xdescribe'].includes(callName(p,file)))scopes.unshift(p.arguments[0].getText(file));return scopes;}
const insideRegistration=(node,file)=>{for(let p=node.parent;p;p=p.parent)if(ts.isCallExpression(p)&&modes.includes(callName(p,file)))return true;return false;};
/** Partition reviewed registrations/helpers from the complete remaining program. This is no runtime-equivalence projection. */
export function projectAnimationGlobals(member,side,sha,{retainRegistrations=false,includeText=false}={}){
 const file=parse(member[side].text),records=[],helpers=helperScopes[sha]?.[member.path]||[];
 function capture(kind,node){let child=node;const ancestry=[];for(let p=node.parent;p;p=p.parent){const children=[];ts.forEachChild(p,n=>{children.push(n);});ancestry.unshift([ts.SyntaxKind[p.kind],children.indexOf(child)]);child=p;}
  records.push({kind,start:node.getStart(file),end:node.end,parent:ts.SyntaxKind[node.parent.kind],ancestry,sha256:hash(node.getText(file))});
 }
 const result=ts.transform(file,[context=>{const visit=node=>{
  if(!retainRegistrations&&ts.isExpressionStatement(node)&&ts.isCallExpression(node.expression)&&modes.includes(callName(node.expression,file))){capture('reviewed-registration',node);return undefined;}
  if(ts.isImportDeclaration(node)){capture('original-import',node);return undefined;}
  if(ts.isFunctionDeclaration(node)&&helpers.includes(node.name?.text)){capture('individual-private-helper',node);return undefined;}
  if(importSlot(node,file)){capture('fixture-imports-metadata',node);return undefined;}
  if(ts.isObjectLiteralExpression(node)&&node.properties.some(n=>ts.isPropertyAssignment(n)&&n.name.getText(file)==='provide'&&n.initializer.getText(file)==='MATERIAL_ANIMATIONS')){
   assert.deepEqual(node.properties.map(n=>n.name.getText(file)),['provide','useValue']);const value=node.properties[1].initializer;
   assert.ok(ts.isObjectLiteralExpression(value));assert.equal(value.properties.length,1);assert.equal(value.properties[0].name.getText(file),'animationsDisabled');assert.equal(value.properties[0].initializer.kind,ts.SyntaxKind.TrueKeyword);
   capture('disabled-animation-fixture-provider',node);return undefined;
  }
  if((ts.isPropertyAssignment(node)||ts.isShorthandPropertyAssignment(node))&&node.name.getText(file)==='providers'&&ts.isObjectLiteralExpression(node.parent)&&ts.isCallExpression(node.parent.parent)&&callName(node.parent.parent,file).endsWith('.configureTestingModule')){
   const next=ts.visitEachChild(node,visit,context);let value=ts.isShorthandPropertyAssignment(next)?next.name:next.initializer;
   if(ts.isArrayLiteralExpression(value)&&value.elements.length===0){capture('empty-fixture-providers',node);return undefined;}
   if(ts.isArrayLiteralExpression(value)&&value.elements.length===1&&ts.isSpreadElement(value.elements[0])){capture('single-spread-fixture-providers',node);value=value.elements[0].expression;}
   if(ts.isShorthandPropertyAssignment(node)){capture('shorthand-fixture-providers',node);return ts.factory.createPropertyAssignment('providers',value);}
   return ts.factory.updatePropertyAssignment(next,next.name,value);
  }
  if(sha===ANIMATION_FIXTURE_SHAS[1]&&member.path==='src/material/chips/chip-grid.spec.ts'&&side==='before'&&ts.isVariableStatement(node)&&node.declarationList.declarations.length===1&&!insideRegistration(node,file)){
   const d=node.declarationList.declarations[0],n=d.name.getText(file),type=d.type?.getText(file),scope=JSON.stringify(sourceScopes(node,file));
   if(![JSON.stringify(["'MatChipGrid'","'StandardChipGrid'","'focus behaviors'"]),JSON.stringify(["'MatChipGrid'","'FormFieldChipGrid'"]),JSON.stringify(["'MatChipGrid'","'with chip remove'"])].includes(scope))return ts.visitEachChild(node,visit,context);
   if((n==='fixture'&&['ComponentFixture<StandardChipGrid>','ComponentFixture<FormFieldChipGrid>','ComponentFixture<ChipGridWithRemove>'].includes(type))||(n==='trailingActions'&&type==='NodeListOf<HTMLElement>')){assert.equal(d.initializer,undefined);capture('relocated-chip-fixture-variable',node);return undefined;}
  }
  return ts.visitEachChild(node,visit,context);
 };return node=>ts.visitNode(node,visit);}]);
 const projected=result.transformed[0],row={fingerprint:hash(JSON.stringify(semantic(projected))),records,...(includeText?{text:ts.createPrinter({removeComments:true}).printFile(projected)}:{})};result.dispose();return row;
}
function sourceHelpers(member,side,sha,model){
 const {file,checker,identifiers}=model,names=helperScopes[sha]?.[member.path]||[];
 const rows=collect(file,n=>ts.isFunctionDeclaration(n)&&names.includes(n.name?.text)).map(node=>{
  assert.equal(node.modifiers?.some(n=>n.kind===ts.SyntaxKind.ExportKeyword)||false,false,'private fixture helper became public');
  const symbol=checker.getSymbolAtLocation(node.name),references=identifiers.filter(n=>n!==node.name&&checker.getSymbolAtLocation(n)===symbol);
  const calls=references.map(n=>{assert.ok(ts.isCallExpression(n.parent)&&n.parent.expression===n,'private helper escapes');return{start:n.parent.getStart(file),sha256:hash(n.parent.getText(file)),arguments:n.parent.arguments.map(n=>n.getText(file))};});
  return{name:node.name.text,raw:node.getText(file),sha256:hash(node.getText(file)),parameters:node.parameters.map(n=>({raw:n.getText(file),name:n.name.getText(file),type:n.type?.getText(file)||null,initializer:n.initializer?.getText(file)||null})),calls};
 });assert.equal(rows.length,names.length);return rows;
}
const rippleNames=["'should not mutate the global options when NoopAnimationsModule is present'","'should not mutate the global options when animations are disabled'"];
function caseIdentity(row){return row.path==='src/material/core/ripple/ripple.spec.ts'&&rippleNames.includes(row.name)?JSON.stringify([row.path,row.mode,row.suites,'reviewed ripple disabled-animation case']):row.key;}
export function observeAnimationFixtureFile(member,sha){
 assert.ok(ANIMATION_FIXTURE_SHAS.includes(sha));const a=bindingModel(member,'before'),b=bindingModel(member,'after'),subject={members:[member]};
 const before=projectAnimationGlobals(member,'before',sha),after=projectAnimationGlobals(member,'after',sha);
 const casesBefore=originalEnvironmentCases(subject,'before'),casesAfter=originalEnvironmentCases(subject,'after');assert.deepEqual(casesBefore.map(caseIdentity),casesAfter.map(caseIdentity),'case identity/mode/order changed');
 const cases=casesBefore.map((old,i)=>{const next=casesAfter[i],predicates=predicateExpressions(old.raw),nextPredicates=predicateExpressions(next.raw);assert.deepEqual(predicates,nextPredicates,'predicate expressions changed');const unchanged=old.callback_sha256===next.callback_sha256,oldProjection=unchanged?{callback_sha256:old.callback_sha256,unchanged_complete_callback:true}:projectReviewedRegistration(member.path,old.raw,sha,'before'),newProjection=unchanged?{callback_sha256:next.callback_sha256,unchanged_complete_callback:true}:projectReviewedRegistration(member.path,next.raw,sha,'after');return{path:member.path,suites:old.suites,mode:old.mode,name:old.name,after_name:next.name,before_sha256:old.sha256,after_sha256:next.sha256,unchanged_complete_callback:old.callback_sha256===next.callback_sha256,predicates,fixture_setup_projection_equal:oldProjection.callback_sha256===newProjection.callback_sha256,before_setup_projection:oldProjection,after_setup_projection:newProjection};});
 const templates=file=>collect(file,n=>ts.isPropertyAssignment(n)&&['template','styles','templateUrl','styleUrl','styleUrls'].includes(n.name.getText(file))).map(n=>({property:n.name.getText(file),sha256:hash(n.getText(file))}));
 const oldTemplates=templates(a.file);assert.deepEqual(oldTemplates,templates(b.file),'template/style property changed');
 const classes=file=>collect(file,ts.isClassDeclaration).map(n=>({name:n.name?.text,sha256:hash(n.getText(file))})),oldClasses=classes(a.file),newClasses=classes(b.file);assert.deepEqual(oldClasses,newClasses,'fixture class changed');
 const removed=a.bindings.filter(n=>!b.bindings.some(q=>bindingKey(n)===bindingKey(q))),added=b.bindings.filter(n=>!a.bindings.some(q=>bindingKey(n)===bindingKey(q)));
 for(const [bindings,projection] of [[removed,before],[added,after]])for(const binding of bindings)for(const ref of binding.references)assert.ok(projection.records.some(n=>n.kind!=='original-import'&&n.start<=ref.start&&n.end>=ref.end),'changed binding escapes reviewed source partition');
 const unresolved=[];for(const binding of removed)for(const n of b.identifiers.filter(n=>n.text===binding.local)){if(ts.isPropertyAccessExpression(n.parent)&&n.parent.name===n)continue;if((ts.isPropertyAssignment(n.parent)||ts.isPropertySignature(n.parent)||ts.isMethodDeclaration(n.parent))&&n.parent.name===n)continue;if(ts.isImportSpecifier(n.parent)||ts.isImportClause(n.parent))continue;if(!b.checker.getSymbolAtLocation(n))unresolved.push({name:binding.local,start:n.getStart(b.file)});}assert.deepEqual(unresolved,[],'removed binding remains unresolved');
 return{path:member.path,before,after,cases,unresolved_removed_names:unresolved,hooks_before:overlayHooks(subject,'before').map(({raw,...n})=>({...n,projection:projectReviewedRegistration(member.path,raw,sha,'before')})),hooks_after:overlayHooks(subject,'after').map(({raw,...n})=>({...n,projection:projectReviewedRegistration(member.path,raw,sha,'after')})),before_bindings:a.bindings,after_bindings:b.bindings,removed_bindings:removed,added_bindings:added,classes:oldClasses,templates:oldTemplates,helpers_before:sourceHelpers(member,'before',sha,a),helpers_after:sourceHelpers(member,'after',sha,b)};
}
export function reviewAnimationFixtureFile(member,sha,pin){
 assert.equal(pin.path,member.path);for(const side of ['before','after'])assert.deepEqual(projectAnimationGlobals(member,side,sha).records,pin[side].records,'unreviewed original source partition/context');
 const a=projectAnimationGlobals(member,'before',sha),b=projectAnimationGlobals(member,'after',sha);assert.equal(a.fingerprint,b.fingerprint,'unreviewed non-scaffold global program change '+member.path);
 const observed=observeAnimationFixtureFile(member,sha);
 assert.equal(observed.before.fingerprint,observed.after.fingerprint,'unreviewed non-scaffold global program change '+member.path);
 assert.deepEqual(observed,pin,'complete original source partition, binding, context or raw reviewed body changed '+member.path);return observed;
}

function registrationCallback(raw){const file=parse(raw),call=file.statements[0]?.expression;assert.ok(ts.isCallExpression(call));let callback=call.arguments[['it','fit','xit'].includes(callName(call,file))?1:0];if(ts.isCallExpression(callback)&&['fakeAsync','waitForAsync'].includes(callName(callback,file)))callback=callback.arguments[0];assert.ok(ts.isArrowFunction(callback)||ts.isFunctionExpression(callback));return{file,callback,call};}
function predicateExpressions(raw){const{file,callback}=registrationCallback(raw);return collect(callback.body,n=>ts.isExpressionStatement(n)&&collect(n,x=>ts.isCallExpression(x)&&(['expect','expectAsync'].includes(callName(x,file))||/^expect[A-Z]\w*$/.test(callName(x,file)))).length>0).map(n=>hash(JSON.stringify(semantic(n.expression))));}
function projectReviewedRegistration(path,raw,sha,side){
 const member={path,[side]:{text:raw}},stage=projectAnimationGlobals(member,side,sha,{retainRegistrations:true,includeText:true});
 const projected=projectImportCleanup({path,[side]:{text:stage.text}},side);
  // The frozen scaffold projector returns a full registration hash. Independently project the callback to ignore the one reviewed ripple label rename.
 const callbackSource=registrationCallback(stage.text),bodyText=callbackSource.callback.getText(callbackSource.file);
 // Use an it shell so case fakeAsync wrappers are not treated as hook-only timing cleanup.
 const mode=['it','fit','xit'].includes(callName(callbackSource.call,callbackSource.file))?'it':null;
 const callbackProjection=mode?projectImportCleanup({path,[side]:{text:'it("reviewed callback",'+bodyText+');'}},side):projected;
 return{callback_sha256:callbackProjection.fingerprint,original_stage_records:stage.records,scaffold_records:projected.records.map(({raw,...n})=>n)};
}
export function inspectAnimationHelperCalls(files,sha){
 const byPath=new Map(files.map(n=>[n.path,n])),chip=byPath.get('src/material/chips/chip-grid.spec.ts');assert.ok(chip);
 const a=chip.helpers_before[0],b=chip.helpers_after[0];
 if(sha===ANIMATION_FIXTURE_SHAS[0]){
  assert.equal(a.calls.length,9);assert.equal(b.calls.length,9);assert.equal(a.parameters[1].initializer,'NoopAnimationsModule');
  const normalized=a.calls.map(n=>{assert.ok([1,3].includes(n.arguments.length));if(n.arguments.length===3){assert.equal(n.arguments[1],'undefined');assert.equal(n.arguments[2],"'rtl'");return[n.arguments[0],n.arguments[2]];}return n.arguments;});
  assert.deepEqual(normalized,b.calls.map(n=>n.arguments));const input=byPath.get('src/material/input/input.spec.ts');assert.ok(input);assert.equal(input.helpers_before[0].calls.length,1);assert.deepEqual(input.helpers_before[0].calls.map(n=>n.arguments),input.helpers_after[0].calls.map(n=>n.arguments));
  assert.deepEqual(input.helpers_before[0].calls[0].arguments,['component','{providers, imports, declarations}']);
  return{reviewed_private_helper_pairs:2,chip_default_animation_parameter_removed:true,one_direction_argument_shift:true,input_animation_option_never_forwarded_by_sole_caller:true,retained_NoopAnimationsModule_exception_calls:0};
 }
 assert.equal(a.calls.length,9);assert.equal(b.calls.length,21);assert.equal(b.parameters[2].initializer,'[]');
 const chipNoops=b.calls.filter(n=>n.arguments.length===3);assert.equal(chipNoops.length,7);for(const call of chipNoops)assert.deepEqual(call.arguments.slice(1),['undefined','[NoopAnimationsModule]']);
 const ripple=byPath.get('src/material/core/ripple/ripple.spec.ts');assert.ok(ripple);const ra=ripple.helpers_before[0],rb=ripple.helpers_after[0];assert.equal(ra.calls.length,6);assert.equal(rb.calls.length,6);assert.deepEqual(ra.calls.map(n=>n.arguments.slice(0,2)),rb.calls.map(n=>n.arguments.slice(0,2)));
 assert.equal(ra.calls.filter(n=>n.arguments.length===3).length,1);assert.equal(rb.calls.filter(n=>n.arguments.length===3).length,1);assert.equal(ra.parameters[2].name,'extraImports');assert.equal(rb.parameters[2].name,'extraProviders');assert.equal(rb.parameters[2].type,'Provider[]');
 const menu=byPath.get('src/material/menu/menu.spec.ts');assert.ok(menu);const ma=menu.helpers_before[0],mb=menu.helpers_after[0];assert.equal(ma.calls.length,83);assert.equal(mb.calls.length,83);assert.deepEqual(ma.calls.map(n=>n.arguments),mb.calls.map(n=>n.arguments.slice(0,3)));
 const menuNoops=mb.calls.filter(n=>n.arguments.length===4);assert.equal(menuNoops.length,1);assert.equal(menuNoops[0].arguments[3],'[NoopAnimationsModule]');assert.equal(mb.parameters[3].initializer,'[]');
 return{reviewed_private_helper_pairs:3,chip_setup_moves_to_fifteen_cases:true,chip_NoopAnimationsModule_exception_calls:7,menu_NoopAnimationsModule_exception_calls:1,ripple_extra_imports_become_providers:true,retained_NoopAnimationsModule_exception_calls:8,actual_focus_or_destruction_equivalence_proved:false};
}

export function authenticateAnimationFixtureOriginal(subject,pins){
 assert.equal(subject.sha,pins.sha);assert.deepEqual(subject.members.map(n=>n.path),pins.paths);assert.deepEqual(subject.complete_changed_files.map(n=>n.path),pins.paths);assert.equal(hash(subject.diff),pins.diff_sha256);assert.equal(subject.diff_sha256,pins.diff_sha256);assert.equal(subject.raw_commit_sha256,pins.raw_commit_sha256);
 const parts=subject.diff.split(/(?=^diff --git )/m).filter(Boolean),hunks=[];assert.equal(parts.length,pins.paths.length);
 for(const[i,member]of subject.members.entries()){const identity=subject.complete_changed_files[i],diff=parts[i];assert.equal(identity.status,'M');assert.equal(identity.before_mode,'100644');assert.equal(identity.after_mode,'100644');hunks.push(...reviewCompleteSingleSpec({...subject,members:[member],complete_changed_files:[identity],diff,diff_sha256:hash(diff),diff_bytes:Buffer.byteLength(diff),original_hunks:(diff.match(/^@@ /gm)||[]).length},ANIMATION_FIXTURE_SHAS));}
 assert.equal(hunks.length,pins.original_hunks);assert.equal(subject.original_hunks,hunks.length);return hunks;
}
export function animationFixturePins({root=rootDefault,readMember}={}){const read=readMember||(path=>readFileSync(resolve(root,path))),bytes=read(pinPath);assert.equal(hash(bytes),pinSha);const data=JSON.parse(gunzipSync(bytes));assert.deepEqual(data.subjects.map(n=>n.sha),ANIMATION_FIXTURE_SHAS);return data.subjects;}


export function inspectAnimationFixtureSources({root=rootDefault,readMember}={}){const read=readMember||(path=>readFileSync(resolve(root,path))),line=JSON.parse(read('projects/ngx-material-legacy/package.json')).version.startsWith('21.')?'21.x':'main',pins=animationFixturePins({root,readMember:read});
 const paths=['compatibility/rc/spec-animation-fixture-source-subjects.json.gz','compatibility/rc/spec-animation-fixture-source-acquisition.json.gz'];const[originals,acquisition]=paths.map((path,i)=>{const bytes=read(path);assert.equal(hash(bytes),capsulePins[line][i]);return JSON.parse(gunzipSync(bytes));});assert.deepEqual(originals.subjects.map(n=>n.sha),ANIMATION_FIXTURE_SHAS);assert.deepEqual(acquisition.subjects,ANIMATION_FIXTURE_SHAS);
 for(const packet of[originals,acquisition]){assert.equal(packet.line,line);assert.equal(hash(read(packet.producer.path)),packet.producer.sha256);assert.equal(hash(packet.selection.worksheet_text),packet.selection.sha256);assert.deepEqual(JSON.parse(packet.selection.worksheet_text).subjects,ANIMATION_FIXTURE_SHAS);}assert.equal(acquisition.shared_cache_written,false);assert.equal(acquisition.credentials_used_or_changed,false);assert.equal(acquisition.upstream_or_candidate_source_executed,false);assert.equal(acquisition.private_temporary_object_view_removed,true);
 const censusPath='compatibility/rc/upstream-complete-patch-census.json.gz',censusBytes=read(censusPath),census=JSON.parse(gunzipSync(censusBytes));assert.equal(originals.source_inventory.sha256,hash(censusBytes));assert.equal(census.line,line);assert.equal(census.commits.length,1697);const identities=[];
 for(const subject of originals.subjects){const row=census.commits.find(n=>n.sha===subject.sha);assert.equal(subject.raw_commit,row.raw_commit);assert.deepEqual(subject.complete_changed_files,row.complete_changed_files);for(const member of subject.members)for(const side of['before','after'])identities.push({commit:subject.sha,path:member.path,side,revision:side==='before'?subject.parents[0]:subject.sha,git_blob:member[side].git_blob,sha256:member[side].sha256,bytes:member[side].bytes});}assert.deepEqual(acquisition.members.map(({source,url,...row})=>{assert.ok(['existing-cache','immutable-upstream-raw'].includes(source));assert.equal(typeof url==='string',source==='immutable-upstream-raw');return row;}),identities);
 assert.equal(hash(read('scripts/authenticated-single-spec-review.mjs')),'001ff69797a4c85027cec3b2ee06fac31e8eb64e59dcf4b41872631b1e09421c');
 assert.equal(hash(read('scripts/spec-test-environment-source-review.mjs')),'372019625c8c3a2a48c1af3a12b1f4016528750835be96e3fb169e18d48aaadd');
 assert.equal(hash(read('scripts/spec-overlay-async-source-review.mjs')),'aac40828833dd41be945ecb74a88c012b27f2b5f2020f1e4725314a74f3bc723');
 assert.equal(hash(read('scripts/spec-import-cleanup-source-review.mjs')),'8a280aea6af1dedf548ddfb1a85534c1d977b80027e4d8140cf50aaf68e78e98');
 const subjects=originals.subjects.map((subject,index)=>{
  const pin=pins[index],hunks=authenticateAnimationFixtureOriginal(subject,pin),files=subject.members.map((m,i)=>reviewAnimationFixtureFile(m,subject.sha,pin.files[i]));
  const cases=files.flatMap(n=>n.cases),changed=cases.filter(n=>!n.unchanged_complete_callback);
  assert.deepEqual(changed.map(({predicates,before_setup_projection,after_setup_projection,unchanged_complete_callback,...n})=>n),pin.changed_callback_reviews.map(({decision,actual_native_behavior_equivalence_proved,...n})=>n));
  const retained=[],removed=[];
  for(const file of files){const after=new Map(file.hooks_after.map(n=>[n.key,n])),before=new Map(file.hooks_before.map(n=>[n.key,n]));assert.equal(after.size,file.hooks_after.length);assert.equal(before.size,file.hooks_before.length);
   assert.ok([...after.keys()].every(n=>before.has(n)),'unreviewed added hook');
   for(const old of file.hooks_before){const next=after.get(old.key);if(!next){const ref=pin.removed_hook_reviews.find(n=>n.path===old.path&&n.key===old.key&&n.sha256===old.sha256);assert.ok(ref,'unreviewed removed hook');removed.push(ref);continue;}
    const equal=old.projection.callback_sha256===next.projection.callback_sha256,exception=pin.hook_exceptions.find(n=>n.key===old.key&&n.path===old.path);if(exception){assert.equal(old.sha256,exception.before_sha256);assert.equal(next.sha256,exception.after_sha256);assert.equal(equal,false);}else assert.equal(equal,true,'unreviewed hook non-scaffold change');
    retained.push({path:old.path,key:old.key,before_sha256:old.sha256,after_sha256:next.sha256,setup_projection_equal:equal,individual_source_exception:!!exception});
   }
  }
  assert.deepEqual(removed,pin.removed_hook_reviews);const helper_call_review=inspectAnimationHelperCalls(files,subject.sha);
  const actualHelpers=files.flatMap(f=>f.helpers_before.map((a,i)=>({path:f.path,name:a.name,before_sha256:a.sha256,after_sha256:f.helpers_after[i].sha256})));assert.deepEqual(actualHelpers,pin.private_helper_reviews.map(({decision,...n})=>n));
  return{sha:subject.sha,complete_original_files:files.length,complete_original_hunks:hunks.length,hunks,files,changed_callback_reviews:pin.changed_callback_reviews,removed_hook_reviews:removed,private_helper_reviews:pin.private_helper_reviews,retained_hooks:retained,helper_call_review,
   paired_cases:cases.length,unchanged_complete_callbacks:cases.filter(n=>n.unchanged_complete_callback).length,changed_callbacks:changed.length,renamed_cases:cases.filter(n=>n.name!==n.after_name).length,fixture_setup_projection_equal_cases:cases.filter(n=>n.fixture_setup_projection_equal).length,
   individual_callback_source_exceptions:cases.filter(n=>!n.fixture_setup_projection_equal).length,hooks_before:files.reduce((k,n)=>k+n.hooks_before.length,0),hooks_after:files.reduce((k,n)=>k+n.hooks_after.length,0),hooks_paired:retained.length,removed_hooks:removed.length,individual_hook_source_exceptions:retained.filter(n=>n.individual_source_exception).length,
   fixture_classes_unchanged:files.reduce((k,n)=>k+n.classes.length,0),template_style_properties_unchanged:files.reduce((k,n)=>k+n.templates.length,0),removed_bindings:files.reduce((k,n)=>k+n.removed_bindings.length,0),added_bindings:files.reduce((k,n)=>k+n.added_bindings.length,0),
   actual_Angular_native_artifact_or_floor_qualified:false};
 });
 const keys=['paired_cases','unchanged_complete_callbacks','changed_callbacks','renamed_cases','fixture_setup_projection_equal_cases','individual_callback_source_exceptions','hooks_before','hooks_after','hooks_paired','removed_hooks','individual_hook_source_exceptions','fixture_classes_unchanged','template_style_properties_unchanged','removed_bindings','added_bindings'];
 const counts=Object.fromEntries(keys.map(k=>[k,subjects.reduce((sum,n)=>sum+n[k],0)]));
 assert.deepEqual(counts,{paired_cases:2383,unchanged_complete_callbacks:2352,changed_callbacks:31,renamed_cases:1,fixture_setup_projection_equal_cases:2365,individual_callback_source_exceptions:18,hooks_before:283,hooks_after:279,hooks_paired:279,removed_hooks:4,individual_hook_source_exceptions:1,fixture_classes_unchanged:439,template_style_properties_unchanged:427,removed_bindings:61,added_bindings:29});
 assert.equal(subjects.reduce((k,n)=>k+n.helper_call_review.reviewed_private_helper_pairs,0),5);assert.equal(subjects[1].helper_call_review.retained_NoopAnimationsModule_exception_calls,8);
 const product=inspectChipEmptyRepair({root,readMember:read}),roster=deriveHistoricalRoster(root);assert.equal(roster.ids.length+roster.discovery_negative_ids.length,2228);
 const context=JSON.parse(read('compatibility/rc/spec-stability-context-checkpoint.json'));for(const ref of context.output_metadata)if(ref.path!=='compatibility/f10/disposition-ledger/ledger.json')assert.equal(hash(read(ref.path)),ref.sha256);
 return{schema_version:1,line,subjects,complete_original_files:61,complete_original_bodies:122,complete_original_hunks:178,...counts,private_helper_pairs:5,retained_NoopAnimationsModule_exception_calls:8,relocated_chip_variable_declarations:4,owned_product_members:product.product_members,current_owned_case_bodies:2223,current_required_historical_case_ids:2228,required_consumer_CSS_SCSS_changes:0,actual_Angular_native_artifact_or_floor_qualified:false,security_clearance:'not-passed',g11_claim:'not-passed'};
}
if(process.argv[1]&&resolve(process.argv[1])===fileURLToPath(import.meta.url)){
 const report=inspectAnimationFixtureSources(),out=process.argv.indexOf('--out');if(out>=0)writeFileSync(process.argv[out+1],JSON.stringify(report,null,2)+'\n',{flag:'wx'});
 console.log(JSON.stringify({...report,subjects:report.subjects.map(({hunks,files,changed_callback_reviews,removed_hook_reviews,private_helper_reviews,retained_hooks,...summary})=>summary)}));
}
