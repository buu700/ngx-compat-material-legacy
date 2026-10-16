/**
 * @license
 * Copyright Google LLC All Rights Reserved.
 * Copyright (c) 2026 Ryan Lester.
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.io/license
 */
/** Four individual upstream test observation changes and their owned public peer boundaries. */
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {createRequire} from 'node:module';
import {readFileSync,writeFileSync} from 'node:fs';
import {gunzipSync} from 'node:zlib';
import {dirname,resolve} from 'node:path';
import {fileURLToPath} from 'node:url';
import {reviewCompleteSingleSpec} from './authenticated-single-spec-review.mjs';
import {candidateProductSourcePaths} from './upstream-candidate-source-evidence.mjs';
const rootDefault=resolve(dirname(fileURLToPath(import.meta.url)),'..'),ts=createRequire(import.meta.url)('typescript'),hash=bytes=>createHash('sha256').update(bytes).digest('hex');
export const PEER_TEST_SHAS=['9cd1d30839a737c2fc929f32e20242f180bc3828','d69de974a469d6ad5a3a81f60bbee54f88d0ffff','905835c0ba1cf0eb495fbab2cba0dd188f6956db','b382b60f58db8357bf93f3f45e78cdfa3c5f28d9'];
export const PEER_TEST_CAPSULES={main:{
 'compatibility/rc/spec-peer-test-source-subjects.json.gz':'23ca9d18b86e2d40c4c0fd953ff55b26383de028ab17023eac5b07e1ad8ba71f',
 'compatibility/rc/spec-peer-test-source-acquisition.json.gz':'e69744b2ab59336779d5189bc865bc19d63641a0fa71d5d0da9d9def85bbaeae'},'21.x':{
 'compatibility/rc/spec-peer-test-source-subjects.json.gz':'fe7ac15c448d514aeadecc39e80171a64af0cf5a57751301eb20219ee474b906',
 'compatibility/rc/spec-peer-test-source-acquisition.json.gz':'e47dc26507496c0028642778124eeffb29a9c769cdff3349c4937e0c88cb7226'}};
const parse=text=>{const file=ts.createSourceFile('complete-source.ts',text,ts.ScriptTarget.Latest,true);assert.equal(file.parseDiagnostics.length,0);return file;};
const collect=(file,predicate)=>{const found=[];function visit(n){if(predicate(n))found.push(n);ts.forEachChild(n,visit);}visit(file);return found;};
const itCalls=file=>collect(file,n=>ts.isCallExpression(n)&&n.expression.getText(file)==='it');
const caseNames=file=>itCalls(file).map(n=>n.arguments[0].getText(file));
const test=(file,name)=>{const found=itCalls(file).filter(n=>n.arguments[0].getText(file)==="'"+name+"'");assert.equal(found.length,1);return found[0].getText(file);};
const assertionStatements=file=>collect(file,n=>ts.isExpressionStatement(n)&&n.expression.getText(file).startsWith('expect(')).map(n=>n.getText(file));
const replace=(text,needle,value)=>{assert.equal(text.split(needle).length,2);return text.replace(needle,value);};
export function analyzePeerTestSemantics(subject){
 assert.ok(PEER_TEST_SHAS.includes(subject.sha));const before=subject.members[0].before.text,after=subject.members[0].after.text,old=parse(before),next=parse(after),index=PEER_TEST_SHAS.indexOf(subject.sha);
 const counts={before_cases:caseNames(old).length,after_cases:caseNames(next).length,before_assertions:assertionStatements(old).length,after_assertions:assertionStatements(next).length};
 if(index===0){
  let expected=replace(before,"expect(body.addEventListener).toHaveBeenCalledWith('keydown', jasmine.any(Function), false);","expect(body.addEventListener).toHaveBeenCalledWith('keydown', jasmine.any(Function), undefined);");
  expected=replace(expected,"expect(document.body.removeEventListener).toHaveBeenCalledWith(\n      'keydown',\n      jasmine.any(Function),\n    );","expect(document.body.removeEventListener).toHaveBeenCalledWith(\n      'keydown',\n      jasmine.any(Function),\n      undefined,\n    );");assert.equal(expected,after);assert.deepEqual(caseNames(old),caseNames(next));
  return {kind:'keyboard-listener-spy-argument-expectation-change',add_capture_argument:'false to undefined',remove_options_argument:'omitted to explicit undefined',changed_expectations:2,production_listener_code_changed:false,...counts};
 }
 if(index===1){
  const name='should run change detection if the click was made outside the overlay and there are `outsidePointerEvents` observers',oldTest=test(old,name),newTest=test(next,name);
  assert.deepEqual(caseNames(old),caseNames(next));assert.ok(oldTest.includes('afterRender(')&&!newTest.includes('afterRender('));assert.ok(newTest.includes("@Component({template: '{{increment()}}'})")&&newTest.includes('TestBed.createComponent(Counter);')&&newTest.includes('renders = 0;'));
  const values=text=>[...text.matchAll(/expect\(renders\)\.toEqual\((\d+)\)/g)].map(row=>Number(row[1]));assert.deepEqual(values(oldTest),[1,2,2,2]);assert.deepEqual(values(newTest),[0,1,1,1]);
  assert.ok(newTest.includes('overlayRef.outsidePointerEvents().subscribe();'));assert.equal((newTest.match(/dispatchMouseEvent\(context, 'click'\)/g)||[]).length,2);
  return {kind:'outside-pointer-test-render-observer-replacement',old_hook:'afterRender',new_observer:'template increment method',old_counts:[1,2,2,2],new_counts:[0,1,1,1],last_expectation_requires_additional_render_after_subscribe:false,neither_counter_proves_actual_owned_change_detection:true,...counts};
 }
 if(index===2){
  const oldName='should not run change detection if there are no viewChange listeners',newName='should not emit viewChange if there are no listeners',oldTest=test(old,oldName),newTest=test(next,newName);assert.deepEqual(caseNames(old).map(n=>n==="'"+oldName+"'"?"'"+newName+"'":n),caseNames(next));
  assert.ok(oldTest.includes("spyOn(appRef, 'tick')")&&oldTest.includes('expect(appRef.tick).not.toHaveBeenCalled();'));
  assert.ok(newTest.includes("spyOn(testComponent.virtualForOf.viewChange, 'next')")&&newTest.includes('expect(viewChangeSpy).not.toHaveBeenCalled();')&&!newTest.includes('appRef.tick'));
  assert.ok(newTest.includes('viewport.scrollToIndex(5);')&&newTest.includes('triggerScroll(viewport);'));
  return {kind:'viewport-global-render-assertion-replaced-by-event-assertion',old_observation:'ApplicationRef.tick',new_observation:'virtualForOf.viewChange.next',behavioral_assertions_equivalent:false,production_viewport_code_changed:false,...counts};
 }
 const removed="'should throw an error when trying to load a remote icon'";assert.deepEqual(caseNames(old).filter(name=>name!==removed),caseNames(next));assert.equal(caseNames(old).filter(name=>name===removed).length,1);assert.equal(counts.before_assertions-counts.after_assertions,1);
 assert.ok(before.includes("describe('MatIcon without HttpClientModule'")&&!after.includes("describe('MatIcon without HttpClientModule'"));assert.ok(!after.includes('wrappedErrorMessage')&&!after.includes('getMatIconNoHttpProviderError')&&!after.includes('HttpClientTestingModule'));
 assert.equal((after.match(/provideHttpClientTesting\(\)/g)||[]).length,1);
 const fixtureMetadata=file=>collect(file,n=>ts.isPropertyAssignment(n)&&n.name.getText(file)==='imports'&&ts.isArrayLiteralExpression(n.initializer)).filter(n=>n.initializer.elements.some(v=>v.getText(file)==='HttpClientTestingModule')).length;
 assert.equal(fixtureMetadata(old),12);assert.equal(fixtureMetadata(next),0);
 return {kind:'icon-private-test-http-provider-migration-and-error-regression-removal',removed_error_case:removed,removed_assertions:1,old_http_testing_import_arrays:12,new_http_testing_provider_calls:1,also_removes_nested_svg_fixture:true,not_an_icon_runtime_fix:true,...counts};
}
export function inspectPeerTestSources({root=rootDefault,readMember}={}){
 const read=readMember||((path)=>readFileSync(resolve(root,path))),version=JSON.parse(read('projects/ngx-material-legacy/package.json')).version;assert.match(version,/^(21|22)\./);const line=version.startsWith('21.')?'21.x':'main';
 const [originals,acquisition]=Object.entries(PEER_TEST_CAPSULES[line]).map(([path,digest])=>{const bytes=read(path);assert.equal(hash(bytes),digest,'peer-test original capsule changed');return JSON.parse(gunzipSync(bytes));});
 for(const packet of [originals,acquisition]){assert.equal(packet.line,line);assert.equal(hash(packet.selection.worksheet_text),packet.selection.sha256);const selection=JSON.parse(packet.selection.worksheet_text);assert.equal(selection.line,line);assert.deepEqual(selection.subjects,PEER_TEST_SHAS);assert.equal(hash(read(packet.producer.path)),packet.producer.sha256,'acquisition producer changed');}
 assert.deepEqual(originals.subjects.map(row=>row.sha),PEER_TEST_SHAS);assert.deepEqual(acquisition.subjects,PEER_TEST_SHAS);assert.equal(acquisition.private_temporary_object_view_removed,true);assert.equal(acquisition.shared_cache_written,false);assert.equal(acquisition.credentials_used_or_changed,false);
 const census=JSON.parse(gunzipSync(read('compatibility/rc/upstream-complete-patch-census.json.gz')));assert.equal(census.line,line);const subjects=originals.subjects.map(subject=>{const row=census.commits.find(row=>row.sha===subject.sha);assert.ok(row);assert.equal(row.raw_commit,subject.raw_commit);assert.deepEqual(row.complete_changed_files,subject.complete_changed_files);return {sha:subject.sha,subject:subject.subject,hunks:reviewCompleteSingleSpec(subject,PEER_TEST_SHAS),semantics:analyzePeerTestSemantics(subject)};});
 const productPaths=candidateProductSourcePaths(root),forbiddenClasses=['OverlayKeyboardDispatcher','OverlayOutsideClickDispatcher','CdkVirtualScrollViewport','MatIcon','MatIconRegistry'];let afterRenderImports=0;
 for(const path of productPaths.filter(path=>path.endsWith('.ts'))){const file=parse(read(path).toString());for(const node of collect(file,n=>ts.isClassDeclaration(n)))assert.ok(!forbiddenClasses.includes(node.name?.text),'ordinary peer class fork introduced');for(const node of file.statements.filter(ts.isImportDeclaration))if(node.moduleSpecifier.text==='@angular/core'&&node.importClause?.namedBindings&&ts.isNamedImports(node.importClause.namedBindings))afterRenderImports+=node.importClause.namedBindings.elements.filter(n=>(n.propertyName||n.name).text==='afterRender').length;}
 assert.equal(afterRenderImports,0,'removed afterRender imported by owned source');
 const auto=read('projects/ngx-material-legacy/legacy-autocomplete/internal/autocomplete-trigger-base.ts').toString(),tooltip=read('projects/ngx-material-legacy/legacy-tooltip/internal/tooltip-base.ts').toString();assert.ok(auto.includes('overlayRef.keydownEvents().subscribe(this._handlePanelKeydown)'));assert.ok(tooltip.includes('.outsidePointerEvents()'));
 const table=read('projects/ngx-material-legacy/legacy-table/table.spec.ts').toString();assert.ok(table.includes('By.directive(CdkVirtualScrollViewport)')&&table.includes('CDK_VIRTUAL_SCROLL_VIEWPORT')&&table.includes("describe('legacy tables within a consumer viewport'"));
 const icon=read('projects/ngx-material-legacy/legacy-chips/testing/chip-list-harness.spec.ts').toString();assert.ok(icon.includes("from '@angular/material/icon'")&&icon.includes('MatIconModule'));
 const render=read('projects/ngx-material-legacy/legacy-form-field/internal/after-form-field-render.ts').toString();assert.ok(render.includes('afterEveryRender(')&&render.includes('rendered?.destroy();'));
 return {schema_version:1,line,subjects,complete_original_files:4,complete_original_hunks:subjects.reduce((n,row)=>n+row.hunks.length,0),owned_public_peer_boundaries:{overlay_keyboard_and_outside_pointer_routes_reachable:true,table_public_viewport_fixture_retained:true,public_icon_module_harness_fixture_retained:true,ordinary_peer_component_or_dispatcher_forks:0,removed_afterRender_imports:0,owned_continuous_render_subscription_and_cleanup_retained:true},product_changes:0,actual_Angular_browser_native_packed_or_floor_qualified:false,g11_claim:'not-passed'};
}
if(process.argv[1]&&resolve(process.argv[1])===fileURLToPath(import.meta.url)){
 const result=inspectPeerTestSources();const out=process.argv.indexOf('--out');if(out>=0)writeFileSync(process.argv[out+1],JSON.stringify(result,null,2)+'\n',{flag:'wx'});console.log(JSON.stringify({...result,subjects:undefined}));
}
