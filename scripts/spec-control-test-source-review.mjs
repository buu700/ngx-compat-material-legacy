/**
 * @license
 * Copyright Google LLC All Rights Reserved.
 * Copyright (c) 2026 Ryan Lester.
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.io/license
 */
/** Four complete original patches; source applicability only, never Angular/runtime admission. */
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {createRequire} from 'node:module';
import {readFileSync,writeFileSync} from 'node:fs';
import {gunzipSync} from 'node:zlib';
import {dirname,resolve} from 'node:path';
import {fileURLToPath} from 'node:url';
import {reviewCompleteSingleSpec} from './authenticated-single-spec-review.mjs';
import {inspectControlTestRepair} from './spec-control-test-repair.mjs';
const rootDefault=resolve(dirname(fileURLToPath(import.meta.url)),'..'),ts=createRequire(import.meta.url)('typescript');
const hash=bytes=>createHash('sha256').update(bytes).digest('hex'),gitHash=(kind,bytes)=>createHash('sha1').update(kind+' '+Buffer.byteLength(bytes)+'\0').update(bytes).digest('hex');
export const CONTROL_SOURCE_SHAS=['307ad0c8abf346232796e17ca7b05e4673ef9ac5','86a5ab09440815c360adcae82d8662c718ba9974','830e39ee983fcee507d3f42362b36d734cac8132','4de4b29e1e974a27798bf54630cc5125bafeb0ca'];
export const CONTROL_SOURCE_CAPSULES={main:{
 'compatibility/rc/spec-control-test-source-subjects.json.gz':'3333b248abb4429d8ff74c7293365141e4f93ee077a9835c001e8821c1e115da',
 'compatibility/rc/spec-control-test-source-acquisition.json.gz':'fb0626d0ed27ef4c7c87787aa99a4f7bff863c99b2cb956cdcf8d494791f263a'},'21.x':{
 'compatibility/rc/spec-control-test-source-subjects.json.gz':'e76c3271dc2e955f2898ca16dec6dbfa6133a636315d35c8a7dc14b4c4c10492',
 'compatibility/rc/spec-control-test-source-acquisition.json.gz':'20568c7e2815647cbf834a7fb709165c1cbb933f74a061b05bd88485d8453eba'}};
const parse=text=>{const file=ts.createSourceFile('complete-source.ts',text,ts.ScriptTarget.Latest,true);assert.equal(file.parseDiagnostics.length,0);return file;};
const collect=(file,predicate)=>{const result=[];function visit(n){if(predicate(n))result.push(n);ts.forEachChild(n,visit);}visit(file);return result;};
const itCalls=file=>collect(file,n=>ts.isCallExpression(n)&&n.expression.getText(file)==='it');
const names=file=>itCalls(file).map(n=>n.arguments[0].getText(file));
const test=(file,name)=>{const found=itCalls(file).filter(n=>n.arguments[0].getText(file)==="'"+name+"'");assert.equal(found.length,1);return found[0].getText(file);};
const replace=(text,needle,value)=>{assert.equal(text.split(needle).length,2,'non-unique original edit '+needle);return text.replace(needle,value);};
/** Added-file counterpart to the unchanged modified-file authenticator. */
export function reviewAddedControlSpec(subject){
 assert.equal(subject.sha,CONTROL_SOURCE_SHAS[0]);assert.equal(gitHash('commit',subject.raw_commit),subject.sha);assert.equal(hash(subject.raw_commit),subject.raw_commit_sha256);
 const metadata=subject.raw_commit.split('\n\n')[0].split('\n');assert.deepEqual(metadata.filter(v=>v.startsWith('parent ')).map(v=>v.slice(7)),subject.parents);assert.equal(subject.parents.length,1);assert.ok(metadata.includes('tree '+subject.tree));
 assert.equal(subject.members.length,1);assert.equal(subject.complete_changed_files.length,1);const member=subject.members[0],identity=subject.complete_changed_files[0];
 assert.equal(member.path,'src/material/table/table-data-source.spec.ts');assert.equal(member.path,identity.path);assert.equal(identity.status,'A');assert.equal(identity.before_mode,'000000');assert.equal(identity.after_mode,'100644');
 assert.deepEqual(member.before,{git_blob:'0'.repeat(40),sha256:hash(''),bytes:0,text:''});assert.equal(identity.before_blob,'0'.repeat(40));
 const raw=member.after;assert.equal(hash(raw.text),raw.sha256);assert.equal(Buffer.byteLength(raw.text),raw.bytes);assert.equal(gitHash('blob',raw.text),raw.git_blob);assert.equal(raw.git_blob,identity.after_blob);assert.equal(raw.git_blob,'a3bb5b0129964020b6fdaab7644772930bb89668');
 assert.equal(hash(subject.diff),subject.diff_sha256);assert.equal(Buffer.byteLength(subject.diff),subject.diff_bytes);
 const lines=subject.diff.split('\n');assert.deepEqual(lines.slice(0,6),[`diff --git a/${member.path} b/${member.path}`,'new file mode 100644',`index ${'0'.repeat(40)}..${raw.git_blob}`,'--- /dev/null','+++ b/'+member.path,'@@ -0,0 +1,99 @@']);
 assert.equal(lines.length,106);assert.equal(lines.at(-1),'');assert.ok(lines.slice(6,-1).every(v=>v.startsWith('+')));assert.equal(lines.slice(6,-1).map(v=>v.slice(1)).join('\n')+'\n',raw.text);assert.equal(subject.original_hunks,1);
 return [{path:member.path,header:lines[5],sha256:hash(lines.slice(5,-1).join('\n')+'\n')}];
}
export function analyzeControlSourceSemantics(subject){
 assert.ok(CONTROL_SOURCE_SHAS.includes(subject.sha));const before=subject.members[0].before.text,after=subject.members[0].after.text,old=parse(before),next=parse(after),index=CONTROL_SOURCE_SHAS.indexOf(subject.sha);
 const counts={before_cases:names(old).length,after_cases:names(next).length};
 if(index===0){
  assert.equal(before,'');assert.equal(counts.after_cases,7);const item=test(next,'should be able to correctly sort an array of strings and numbers with left zero');assert.ok(item.includes("'001'")&&item.includes("'2'")&&item.includes('testSortWithValues('));
  for(const name of ['should be able to correctly sort an array of numbers','should be able to correctly sort an array of string','should be able to correctly sort an array of strings and numbers','should unsubscribe from the re-render stream when disconnected','should re-subscribe to the sort stream when re-connecting after being disconnected','should update filteredData even if the data source is disconnected'])test(next,name);
  assert.ok(after.includes('sortData(reversedData, sort)')&&after.includes('expect(sortedData).toEqual(data);'));
  return {kind:'added-seven-case-sort-and-subscription-spec',added_file_not_modified_file:true,existing_owned_analogues:6,missing_owned_leading_zero_case:1,production_algorithm_changed:false,private_modern_setup_adopted:false,...counts};
 }
 if(index===1){
  let expected=replace(before,"import {MatOption, MatOptionSelectionChange} from '../core';\nimport {MatFormField, MatFormFieldModule} from '../form-field';\nimport {MatInputModule} from '../input';\n",'');
  expected=replace(expected,"import {map, startWith} from 'rxjs/operators';", "import {map, startWith} from 'rxjs/operators';\nimport {MatOption, MatOptionSelectionChange} from '../core';\nimport {MatFormField, MatFormFieldModule} from '../form-field';\nimport {MatInputModule} from '../input';");
  expected=replace(expected,'const fixture = createComponent(AutocompleteWithoutOptions);\n    const trigger','const fixture = createComponent(AutocompleteWithoutOptions);\n    fixture.detectChanges();\n    const trigger');
  expected=replace(expected,'{ static: true }','{static: true}');assert.ok(expected.endsWith('\n\n'));expected=expected.slice(0,-1);assert.equal(expected,after);assert.deepEqual(names(old),names(next));
  const item=test(next,'should not throw errors when closing without options');assert.ok(item.indexOf('fixture.detectChanges();')<item.indexOf('const trigger'));assert.ok(item.includes('trigger.openPanel();')&&item.includes('trigger.closePanel()'));
  return {kind:'initialize-empty-autocomplete-fixture-before-trigger-read',meaningful_detect_changes_insertions:1,other_hunks:'import order and ViewChild whitespace',owned_analogous_case_added:true,fixture_template_changed:false,...counts};
 }
 if(index===2){
  let expected=replace(before,'  provideCheckNoChangesConfig,\n','');expected=replace(expected,'          provideCheckNoChangesConfig({exhaustive: false}),\n','');
  expected=replace(expected,'items[1].componentInstance.disabled = true;','fixture.componentInstance.secondItemDisabled = true;');expected=replace(expected,'item.componentInstance.disabled = true;','fixture.componentInstance.firstItemDisabled = true;');
  expected=replace(expected,'[matMenuTriggerFor]="levelOne"\n        #levelOneTrigger','[matMenuTriggerFor]="levelOne"\n        [disabled]="firstItemDisabled"\n        #levelOneTrigger');expected=replace(expected,'#levelOneTrigger="matMenuTrigger">One</button>\n      <button mat-menu-item>Two</button>','#levelOneTrigger="matMenuTrigger">One</button>\n      <button mat-menu-item [disabled]="secondItemDisabled">Two</button>');
  expected=replace(expected,'  showLazy = false;\n}', '  showLazy = false;\n\n  firstItemDisabled = false;\n  secondItemDisabled = false;\n}');assert.equal(expected,after);assert.deepEqual(names(old),names(next));
  return {kind:'private-nested-menu-exhaustive-check-enablement',removed_local_exhaustive_false_override:1,disabled_assignments_moved_to_bound_fixture_fields:2,fixture_disabled_bindings_added:2,public_disabled_API_changed:false,...counts};
 }
 let expected=replace(before,"import {NoopAnimationsModule} from '@angular/platform-browser/animations';\n",'');
 const todo=/^[ \t]*\/\/ TODO\(crisbeto\): this test fails without the NoopAnimationsModule for some reason\.\n[ \t]*\/\/ It can indicate a deeper issue with the chips\.\n/gm;
 assert.equal((expected.match(todo)||[]).length,6);expected=expected.replace(todo,'');
 assert.equal((expected.match(/, undefined, \[NoopAnimationsModule\]/g)||[]).length,7);expected=expected.replaceAll(', undefined, [NoopAnimationsModule]','');
 expected=replace(expected,"          const midItem = chips.get(2)!;\n\n          // Focus the middle item\n          midItem.focus();", "          const midItemAction = primaryActions[2];\n          patchElementFocus(midItemAction);\n\n          // Focus the middle item\n          midItemAction.focus();\n          fixture.changeDetectorRef.markForCheck();\n          fixture.detectChanges();");
 expected=replace(expected,"          // Focus the last item\n          chips.last.focus();", "          const lastAction = primaryActions[primaryActions.length - 1];\n\n          // Focus the last item\n          patchElementFocus(lastAction);\n          lastAction.focus();\n          fixture.changeDetectorRef.markForCheck();\n          fixture.detectChanges();");assert.equal(expected,after);assert.deepEqual(names(old),names(next));
 return {kind:'modern-chip-grid-noop-module-removal-and-action-focus-setup',module_import_removed:1,explicit_noop_module_call_arguments_removed:7,focus_setup_moves_host_to_primary_action:2,extra_mark_and_render_pairs:2,removed_todo_comments:6,production_chip_focus_changed:false,...counts};
}
export function inspectControlSourcePublicFloors(read){
 const descriptor=read('compatibility/rc/material-public-subjects.json');assert.equal(hash(descriptor),'f4e494ce1f71c068e801d086e4017fc86ea721c842d5e7ac161d3d08d1434ae3');const packet=JSON.parse(descriptor),rows=[];
 for(const line of ['main','21.x']){
  const subject=packet.subjects.find(row=>row.line===line),version=line==='main'?'22.1.7':'21.2.23';assert.equal(subject.packages.find(row=>row.name==='@angular/core').version,version);
  const text=module=>{const member=subject.members.find(row=>row.package==='@angular/core'&&row.module_path===module);assert.ok(member);const stored=read(member.path);assert.equal(hash(stored),member.stored_sha256);const bytes=member.compression==='gzip'?gunzipSync(stored):stored;assert.equal(bytes.length,member.bytes);assert.equal(hash(bytes),member.sha256);return {member,text:bytes.toString()};};
  const runtime=text('fesm2022/_debug_node-chunk.mjs'),types=text('types/core.d.ts');assert.ok(runtime.text.includes('const USE_EXHAUSTIVE_CHECK_NO_CHANGES_DEFAULT = false;'));assert.ok(runtime.text.includes('UseExhaustiveCheckNoChanges, USE_EXHAUSTIVE_CHECK_NO_CHANGES_DEFAULT'));
  const declaration=parse(types.text),token=collect(declaration,n=>ts.isVariableDeclaration(n)&&n.name.getText(declaration)==='ANIMATION_MODULE_TYPE');assert.equal(token.length,1);const statement=token[0].parent.parent,comments=statement.jsDoc||[];assert.ok(comments.some(c=>c.getText(declaration).includes('@publicApi')));assert.ok(comments.every(c=>!c.getText(declaration).includes('@deprecated')));
  rows.push({line,core_version:version,exhaustive_check_default:false,public_animation_module_type_deprecated:false,runtime:{path:runtime.member.path,sha256:runtime.member.sha256},types:{path:types.member.path,sha256:types.member.sha256},static_source_only:true,actual_floor_executed:false});
 }return rows;
}
export function inspectControlTestSources({root=rootDefault,readMember}={}){
 const read=readMember||((path)=>readFileSync(resolve(root,path))),version=JSON.parse(read('projects/ngx-material-legacy/package.json')).version;assert.match(version,/^(21|22)\./);const line=version.startsWith('21.')?'21.x':'main';
 const [originals,acquisition]=Object.entries(CONTROL_SOURCE_CAPSULES[line]).map(([path,digest])=>{const bytes=read(path);assert.equal(hash(bytes),digest,'control-test source capsule changed');return JSON.parse(gunzipSync(bytes));});
 for(const packet of [originals,acquisition]){assert.equal(packet.line,line);assert.equal(hash(packet.selection.worksheet_text),packet.selection.sha256);const selection=JSON.parse(packet.selection.worksheet_text);assert.equal(selection.line,line);assert.deepEqual(selection.subjects,CONTROL_SOURCE_SHAS);assert.equal(hash(read(packet.producer.path)),packet.producer.sha256,'acquisition producer changed');}
 assert.deepEqual(originals.subjects.map(row=>row.sha),CONTROL_SOURCE_SHAS);assert.deepEqual(acquisition.subjects,CONTROL_SOURCE_SHAS);assert.equal(acquisition.private_temporary_object_view_removed,true);assert.equal(acquisition.shared_cache_written,false);assert.equal(acquisition.credentials_used_or_changed,false);
 const census=JSON.parse(gunzipSync(read('compatibility/rc/upstream-complete-patch-census.json.gz')));assert.equal(census.line,line);
 const subjects=originals.subjects.map(subject=>{const row=census.commits.find(row=>row.sha===subject.sha);assert.ok(row);assert.equal(row.raw_commit,subject.raw_commit);assert.deepEqual(row.complete_changed_files,subject.complete_changed_files);return {sha:subject.sha,subject:subject.subject,hunks:subject.sha===CONTROL_SOURCE_SHAS[0]?reviewAddedControlSpec(subject):reviewCompleteSingleSpec(subject,CONTROL_SOURCE_SHAS),semantics:analyzeControlSourceSemantics(subject)};});
 const repair=inspectControlTestRepair({root,readMember:read});assert.ok(repair.rows.every(row=>row.applied),'owned regressions missing or changed');
 const table=parse(read(repair.rows[0].path).toString()),originalTable=parse(originals.subjects[0].members[0].after.text);assert.deepEqual(names(table).sort(),names(originalTable).sort(),'owned table coverage differs');for(const original of itCalls(originalTable)){const name=original.arguments[0].text;assert.equal(test(table,name),test(originalTable,name),'owned sort/subscription assertion differs');}const sortBody=file=>{const found=collect(file,n=>ts.isFunctionDeclaration(n)&&n.name?.text==='testSortWithValues');assert.equal(found.length,1);return found[0].body.statements.map(n=>n.getText(file));};assert.deepEqual(sortBody(table),sortBody(originalTable),'sort helper assertions differ');
 const menu=read('projects/ngx-material-legacy/legacy-menu/menu.spec.ts').toString(),menuFile=parse(menu),bootstrap=read('testing/legacy-runner/init-test-env.ts').toString();
 for(const text of [menu,bootstrap])assert.ok(!/provideCheckNoChangesConfig|UseExhaustiveCheckNoChanges|exhaustive\s*:/.test(text),'owned menu runner exhaustive setting changed');
 for(const [name,assignment] of [['should close submenu when hovering over disabled sibling item','items[1].componentInstance.disabled = true;'],['should not open submenu when hovering over disabled trigger','item.componentInstance.disabled = true;']]){const item=test(menuFile,name);assert.ok(item.includes(assignment)&&item.includes('_handleMouseEnter()')&&item.includes('fixture.detectChanges();'));}
 const menuItem=read('projects/ngx-material-legacy/legacy-menu/menu-item.ts').toString();assert.ok(menuItem.includes('changeDetection: ChangeDetectionStrategy.OnPush'));assert.ok(menuItem.includes("'[attr.aria-disabled]': 'disabled.toString()'"));
 const chips=read('projects/ngx-material-legacy/legacy-chips/chip-list.spec.ts').toString(),chipSource=read('projects/ngx-material-legacy/legacy-chips/chip.ts').toString();assert.ok(!chips.includes('NoopAnimationsModule')&&!chips.includes('primaryActions')&&!chips.includes('patchElementFocus'));
 const chipsFile=parse(chips),nextChip=test(chipsFile,'should focus the next item'),previousChip=test(chipsFile,'should focus the previous item');assert.ok(nextChip.includes('midItem.focus();')&&nextChip.includes('expect(manager.activeItemIndex).toEqual(2);'));assert.ok(previousChip.includes('lastItem.focus();')&&previousChip.includes('expect(manager.activeItemIndex).toEqual(lastIndex - 1);'));assert.ok(chipSource.includes('this._elementRef.nativeElement.focus();'));
 const providers=read('projects/ngx-material-legacy/internal/testing/owned-animation-modules.ts').toString(),providerFile=parse(providers);assert.ok(providerFile.statements.filter(ts.isImportDeclaration).every(n=>n.moduleSpecifier.text==='@angular/core'));assert.ok(providers.includes('provide: ANIMATION_MODULE_TYPE')&&providers.includes("useValue: 'NoopAnimations'")&&providers.includes("useValue: 'BrowserAnimations'"));assert.ok(chips.includes('animations: Provider = LEGACY_NOOP_ANIMATIONS'));
 return {schema_version:1,line,subjects,complete_original_files:4,complete_original_hunks:subjects.reduce((n,row)=>n+row.hunks.length,0),owned_coverage:{sort_original_cases:7,existing_sort_cases_preserved:6,leading_zero_case_added:true,empty_options_initialized_case_added:true,all_retained_case_bodies_and_templates_preserved:repair.existing_case_bodies_order_and_templates_preserved},owned_menu:{two_imperative_disabled_hover_cases_preserved:true,no_exhaustive_setting_in_spec_or_bootstrap:true,default_false_is_static_inference_only:true,actual_disabled_hover_behavior_executed:false},owned_chips:{host_focus_and_keymanager_assertions_preserved:true,modern_primary_action_fixture_absent:true,noop_engine_module_absent_from_owned_chip_spec:true,animation_token_provider_is_not_engine_or_real_animated_host_proof:true},public_floor_source:inspectControlSourcePublicFloors(read),product_changes_in_this_review:0,actual_new_Angular_cases_executed:false,actual_Angular_browser_native_packed_or_floor_qualified:false,g11_claim:'not-passed'};
}
if(process.argv[1]&&resolve(process.argv[1])===fileURLToPath(import.meta.url)){
 const result=inspectControlTestSources(),out=process.argv.indexOf('--out');if(out>=0)writeFileSync(process.argv[out+1],JSON.stringify(result,null,2)+'\n',{flag:'wx'});console.log(JSON.stringify({...result,subjects:undefined}));
}
