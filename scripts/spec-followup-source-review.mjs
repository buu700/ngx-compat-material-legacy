/**
 * @license
 * Copyright Google LLC All Rights Reserved.
 * Copyright (c) 2026 Ryan Lester.
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.io/license
 */
/** Four complete original test changes; source applicability never proves browser execution. */
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {createRequire} from 'node:module';
import {readFileSync,writeFileSync} from 'node:fs';
import {gunzipSync} from 'node:zlib';
import {dirname,resolve} from 'node:path';
import {fileURLToPath} from 'node:url';
import {candidateProductSourcePaths} from './upstream-candidate-source-evidence.mjs';
const rootDefault=resolve(dirname(fileURLToPath(import.meta.url)),'..'),ts=createRequire(import.meta.url)('typescript');
const hash=bytes=>createHash('sha256').update(bytes).digest('hex');
const gitHash=(kind,bytes)=>createHash('sha1').update(kind+' '+Buffer.byteLength(bytes)+'\0').update(bytes).digest('hex');
export const FOLLOWUP_SHAS=['d5aa679213590279b0d3c8270b5bf47ef787f443','58a30cfa4627a9e4875304aa2116654c08382a0b','da8b1f9aacd826060372d46e528658cc789122c6','9e1ee2f5be93aedc4ac4525f011a422a4ec7d325'];
export const FOLLOWUP_CAPSULES={
 'compatibility/rc/spec-followup-source-subjects.json.gz':'8b3c61b0a41b00743aa7783f83d071f462b6bba248d14f5f72a18e0b0cdbf1f5',
 'compatibility/rc/spec-followup-source-acquisition.json.gz':'2e3b3d4d1868e0bcceb2420458087014cd7ccec7f2a8bb326390433ca082de08'};
// Both complete local copies were compared to their original Git blob IDs in
// the untouched df60e733c60e572ba538f6ad0ceff3e63e527b53 tag, without fetching.
export const FOLLOWUP_TAGGED_SOURCES={
 'reference/material-16.2.14/chips-keyboard-sources/chip-list.spec.ts':{git_blob:'b1542837a323317a0dd246678299086d341efe9d',sha256:'a64a9468dd842c9a944c381b466d135497baa7d25f1d7503b5a1aefd0e363053'},
 'reference/material-16.2.14/value-accessor-token-sources/legacy-slider/slider.ts':{git_blob:'c95851983fc48af3ea67cda6340e797c4cfdd395',sha256:'e923bb96cd3ca35f8bd0697e3ab797f934103cfb6d8b4cae022f4183d45fd1c9'}};
const parse=text=>{const file=ts.createSourceFile('complete-source.ts',text,ts.ScriptTarget.Latest,true);assert.equal(file.parseDiagnostics.length,0);return file;};
const collect=(file,predicate)=>{const values=[];function visit(node){if(predicate(node))values.push(node);ts.forEachChild(node,visit);}visit(file);return values;};
const caseNames=file=>collect(file,n=>ts.isCallExpression(n)&&n.expression.getText(file)==='it').map(n=>n.arguments[0].getText(file));
const assertions=file=>collect(file,n=>ts.isExpressionStatement(n)&&n.expression.getText(file).startsWith('expect(')).map(n=>n.getText(file));
const method=(file,className,name)=>{const cls=file.statements.find(n=>ts.isClassDeclaration(n)&&n.name?.text===className);assert.ok(cls);const members=cls.members.filter(n=>ts.isMethodDeclaration(n)&&n.name.getText(file)===name);assert.equal(members.length,1);return members[0].getText(file);};
export function reviewFollowupOriginal(subject){
 assert.ok(FOLLOWUP_SHAS.includes(subject.sha));assert.equal(gitHash('commit',subject.raw_commit),subject.sha);assert.equal(hash(subject.raw_commit),subject.raw_commit_sha256);
 const metadata=subject.raw_commit.split('\n\n')[0].split('\n');assert.deepEqual(metadata.filter(row=>row.startsWith('parent ')).map(row=>row.slice(7)),subject.parents);assert.ok(metadata.includes('tree '+subject.tree));
 assert.equal(subject.members.length,1);assert.equal(subject.complete_changed_files.length,1);const member=subject.members[0],identity=subject.complete_changed_files[0];assert.equal(member.path,identity.path);assert.ok(member.path.endsWith('.spec.ts'));
 for(const side of ['before','after']){const raw=member[side];assert.equal(hash(raw.text),raw.sha256);assert.equal(Buffer.byteLength(raw.text),raw.bytes);assert.equal(gitHash('blob',raw.text),raw.git_blob);assert.equal(raw.git_blob,identity[side+'_blob']);}
 assert.equal(hash(subject.diff),subject.diff_sha256);assert.equal(Buffer.byteLength(subject.diff),subject.diff_bytes);
 const lines=subject.diff.split('\n');assert.equal(lines[0],`diff --git a/${member.path} b/${member.path}`);assert.equal(lines[1],`index ${member.before.git_blob}..${member.after.git_blob} 100644`);assert.equal(lines[2],'--- a/'+member.path);assert.equal(lines[3],'+++ b/'+member.path);
 const before=member.before.text.split('\n'),result=[],hunks=[];let at=4,cursor=0;
 while(at<lines.length-1){const start=at,header=lines[at++].match(/^@@ -(\d+)(?:,(\d+))? \+(\d+)(?:,(\d+))? @@/);assert.ok(header);
  const offset=Number(header[1])-1;assert.ok(offset>=cursor);result.push(...before.slice(cursor,offset));cursor=offset;assert.equal(result.length,Number(header[3])-1);let removed=0,added=0;
  while(at<lines.length-1&&!lines[at].startsWith('@@ ')){const prefix=lines[at][0],text=lines[at].slice(1);assert.ok([' ','-','+'].includes(prefix));if(prefix!=='+'){assert.equal(before[cursor++],text);removed++;}if(prefix!=='-'){result.push(text);added++;}at++;}
  assert.equal(removed,header[2]===undefined?1:Number(header[2]));assert.equal(added,header[4]===undefined?1:Number(header[4]));hunks.push({path:member.path,header:lines[start],sha256:hash(lines.slice(start,at).join('\n')+'\n')});
 }result.push(...before.slice(cursor));assert.equal(result.join('\n'),member.after.text);assert.equal(hunks.length,subject.original_hunks);return hunks;
}
export function analyzeFollowupSemantics(subject){
 const {before,after}=subject.members[0],old=parse(before.text),next=parse(after.text),index=FOLLOWUP_SHAS.indexOf(subject.sha);assert.ok(index>=0);
 const counts={before_cases:caseNames(old).length,after_cases:caseNames(next).length,before_assertions:assertions(old).length,after_assertions:assertions(next).length};
 const changedLines=side=>subject.diff.split('\n').filter(row=>row.startsWith(side)&&!row.startsWith(side.repeat(3))).map(row=>row.slice(1).trim()).filter(Boolean);
 if(index===0){
  const needle="        // Safari seems to require an extra round that other browsers don't.\n        await new Promise(r => setTimeout(r));\n        fixture.detectChanges();";
  assert.equal(before.text.split(needle).length,2);assert.equal(before.text.replace(needle,needle+'\n        await new Promise(r => setTimeout(r));\n        fixture.detectChanges();'),after.text);
  assert.deepEqual(caseNames(old),caseNames(next));assert.deepEqual(assertions(old),assertions(next));return {kind:'async-test-render-synchronization',added_timer_render_pairs:1,assertions_and_case_names_preserved:true,runtime_scheduling_change:true,...counts};
 }
 if(index===1){
  assert.ok(changedLines('-').every(row=>row==='flushMicrotasks();'));assert.ok(changedLines('+').every(row=>row==='flush();'||row==='viewContainerFixture.detectChanges();'));
  assert.deepEqual(caseNames(old),caseNames(next));assert.deepEqual(assertions(old),assertions(next));return {kind:'focus-test-timer-and-render-synchronization',removed_microtask_flushes:changedLines('-').length,added_timer_flushes:changedLines('+').filter(row=>row==='flush();').length,added_render_passes:changedLines('+').filter(row=>row==='viewContainerFixture.detectChanges();').length,focus_assertions_preserved:true,runtime_scheduling_change:true,...counts};
 }
 if(index===2){
  assert.deepEqual(changedLines('-'),[]);const previous=caseNames(old),actual=caseNames(next);assert.deepEqual(actual.slice(0,previous.length),previous);assert.deepEqual(actual.slice(previous.length),["'should have tick marks'","'should have the correct number of ticks'","'should position the tick marks correctly'"]);
  assert.ok(after.text.includes('const spacing = 2.94;')&&after.text.includes("'.mdc-slider__tick-mark--active'"));assert.ok(after.text.includes('<input matSliderThumb>')&&after.text.includes('[showTickMarks]="true"'));assert.ok(!before.text.includes('class SliderWithTickMarks'));
  return {kind:'modern-slider-discrete-tick-regressions',added_cases:3,added_fixture:'SliderWithTickMarks',modern_private_array_and_element_geometry:true,commented_TODOs_are_not_executed_tests:true,...counts};
 }
 const removedName="'should move focus to the last chip when the focused chip was deleted inside a component with animations'";
 assert.deepEqual(caseNames(old).filter(name=>name!==removedName),caseNames(next));assert.equal(caseNames(old).filter(name=>name===removedName).length,1);
 assert.ok(before.text.includes('class StandardChipGridWithAnimations')&&!after.text.includes('StandardChipGridWithAnimations'));assert.ok(before.text.includes("import {animate, style, transition, trigger} from '@angular/animations';")&&!after.text.includes("from '@angular/animations'"));
 assert.equal(counts.before_assertions-counts.after_assertions,1);assert.ok(subject.diff.includes('-          expect(document.activeElement).toBe(primaryActions[primaryActions.length - 2]);'));
 return {kind:'modern-chip-grid-animation-regression-removal',removed_case:removedName,removed_fixture:'StandardChipGridWithAnimations',removed_assertions:1,animation_import_and_union_type_removed:true,not_type_only:true,...counts};
}
export function inspectSpecFollowup({root=rootDefault,readMember}={}){
 const read=readMember||((path)=>readFileSync(resolve(root,path))),capsules=Object.entries(FOLLOWUP_CAPSULES).map(([path,digest])=>{const raw=read(path);assert.equal(hash(raw),digest,'follow-up capsule changed');return JSON.parse(gunzipSync(raw));});
 const [originals,acquisition]=capsules;assert.deepEqual(originals.subjects.map(row=>row.sha),FOLLOWUP_SHAS);assert.deepEqual(acquisition.subjects,FOLLOWUP_SHAS);assert.equal(acquisition.shared_cache_written,false);assert.equal(acquisition.private_temporary_object_view_removed,true);assert.equal(acquisition.credentials_used_or_changed,false);
 assert.equal(hash(read(acquisition.producer.path)),acquisition.producer.sha256,'acquisition producer changed');
 const version=JSON.parse(read('projects/ngx-material-legacy/package.json')).version;assert.match(version,/^(21|22)\./);const line=version.startsWith('21.')?'21.x':'main',census=JSON.parse(gunzipSync(read('compatibility/rc/upstream-complete-patch-census.json.gz')));assert.equal(census.line,line);
 for(const [path,identity]of Object.entries(FOLLOWUP_TAGGED_SOURCES)){const bytes=read(path);assert.equal(hash(bytes),identity.sha256,'tagged follow-up reference changed');assert.equal(gitHash('blob',bytes),identity.git_blob);}
 const subjects=originals.subjects.map(subject=>{const row=census.commits.find(row=>row.sha===subject.sha);assert.ok(row);assert.equal(row.raw_commit,subject.raw_commit);assert.deepEqual(row.complete_changed_files,subject.complete_changed_files);return {sha:subject.sha,subject:subject.subject,hunks:reviewFollowupOriginal(subject),semantics:analyzeFollowupSemantics(subject)};});
 const auto=read('projects/ngx-material-legacy/legacy-autocomplete/autocomplete.spec.ts').toString(),chips=read('projects/ngx-material-legacy/legacy-chips/chip-list.spec.ts').toString(),slider=read('projects/ngx-material-legacy/legacy-slider/slider.spec.ts').toString();
 assert.ok(auto.includes("it('should reposition the panel when the amount of options changes', fakeAsync("));assert.ok(auto.includes("By.css('.mat-form-field')")&&auto.includes("const inputReference = formField.querySelector('.mat-form-field-flex');"));assert.ok(!auto.includes('const flushPosition = async'));
 assert.ok(chips.includes('StandardChipListWithAnimations, [], LEGACY_ENABLED_ANIMATIONS'));assert.ok(chips.includes("'should move focus to the last chip when the focused chip was deleted inside a' +"));assert.ok(chips.includes('Engine-free removal is synchronous. This fixture does not declare an animation trigger.'));assert.ok(chips.includes("expect(chipListInstance._keyManager.activeItemIndex).toBe(chips.length - 1);"));
 const tagged=read('reference/material-16.2.14/chips-keyboard-sources/chip-list.spec.ts').toString();assert.ok(tagged.includes("trigger('dummyAnimation'")&&tagged.includes('StandardChipListWithAnimations, [], BrowserAnimationsModule'));
 const provider=read('projects/ngx-material-legacy/internal/testing/owned-animation-modules.ts').toString();assert.ok(provider.includes("useValue: 'BrowserAnimations'"));assert.ok(!/import .*from ['"]@angular\/(animations|platform-browser\/animations)/.test(provider));
 assert.ok(slider.includes("describe('slider with auto ticks'")&&slider.includes("describe('slider with set tick interval'"));assert.ok(slider.includes("expect(ticksElement.style.backgroundSize).toBe('30% 2px');")&&slider.includes("expect(ticksElement.style.backgroundSize).toBe('18% 2px');"));assert.ok(!slider.includes('showTickMarks')&&!slider.includes('matSliderThumb'));
 const ownedSlider=parse(read('projects/ngx-material-legacy/legacy-slider/slider.ts').toString()),taggedSlider=parse(read('reference/material-16.2.14/value-accessor-token-sources/legacy-slider/slider.ts').toString());
 for(const name of ['_getTicksStyles','_getTicksContainerStyles','_updateTickIntervalPercent'])assert.equal(method(ownedSlider,'MatLegacySlider',name),method(taggedSlider,'MatLegacySlider',name),'historical complete tick method changed '+name);
 const products=candidateProductSourcePaths(root);assert.ok(products.length>1000);
 for(const path of products.filter(path=>path.endsWith('.ts'))){const text=read(path).toString();assert.ok(!/class\s+Mat(?:Legacy)?BottomSheet\b/.test(text),'owned bottom-sheet runtime introduced');}
 assert.ok(JSON.parse(read('projects/ngx-material-legacy/tsconfig.lib.json')).exclude.includes('**/*.spec.ts'));
 return {schema_version:1,line,subjects,complete_original_files:4,complete_original_hunks:subjects.reduce((n,row)=>n+row.hunks.length,0),
  owned_comparison:{autocomplete_original_reposition_case_retained:true,autocomplete_modern_async_timing_is_not_legacy_fakeAsync_equivalence:true,chip_original_removal_focus_case_retained:true,chip_current_fixture_declares_real_engine_animation:false,chip_actual_animation_context_or_native_focus_not_qualified:true,slider_historical_interval_cases_and_three_complete_methods_preserved:true,modern_tick_DOM_or_3px_padding_not_a_legacy_oracle:true,owned_bottom_sheet_runtime_classes:0,ordinary_bottom_sheet_public_peer_and_Sass_obligations_preserved:true},
  actual_Angular_browser_native_packed_or_floor_qualified:false,product_changes:0,g11_claim:'not-passed'};
}
if(process.argv[1]&&resolve(process.argv[1])===fileURLToPath(import.meta.url)){
 const result=inspectSpecFollowup();const out=process.argv.indexOf('--out');if(out>=0)writeFileSync(process.argv[out+1],JSON.stringify(result,null,2)+'\n',{flag:'wx'});
 console.log(JSON.stringify({...result,subjects:undefined}));
}
