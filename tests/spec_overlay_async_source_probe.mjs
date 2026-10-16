/**
 * @license
 * Copyright Google LLC All Rights Reserved.
 * Copyright (c) 2026 Ryan Lester.
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.io/license
 */
/** Immutable source and strict rejected mutations; no Angular rendering or original test execution. */
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {createRequire} from 'node:module';
import {readFileSync,writeFileSync} from 'node:fs';
import {gunzipSync} from 'node:zlib';
import {dirname,resolve} from 'node:path';
import {fileURLToPath} from 'node:url';
import {originalEnvironmentCases} from '../scripts/spec-test-environment-source-review.mjs';
import {inspectOverlayAsyncSources,overlayOriginalPins,authenticateOverlayOriginal,compareOverlayCases,reviewOverlayGlobals,overlayHooks,projectOverlayNode,OVERLAY_LOOP_CASES} from '../scripts/spec-overlay-async-source-review.mjs';
const root=resolve(dirname(fileURLToPath(import.meta.url)),'..'),read=path=>readFileSync(resolve(root,path)),hash=bytes=>createHash('sha256').update(bytes).digest('hex'),ts=createRequire(import.meta.url)('typescript');
const report=inspectOverlayAsyncSources({root}),pins=overlayOriginalPins({root}),originals=JSON.parse(gunzipSync(read('compatibility/rc/spec-overlay-async-source-subjects.json.gz'))),controls=[];
function reject(id,action,pattern){assert.throws(action,pattern,id);controls.push({id,result:'rejected'});}
function mutateCase(subject,row,change,side='after'){
 const next=structuredClone(subject),member=next.members.find(n=>n.path===row.path),text=member[side].text;assert.equal(text.split(row.raw).length,2,'ambiguous source case');const replaced=change(row.raw);assert.notEqual(replaced,row.raw);member[side].text=text.replace(row.raw,replaced);return next;
}
for(const[index,subject]of originals.subjects.entries()){
 for(const[id,change]of[
  ['raw-commit',n=>{n.raw_commit+='\n';n.raw_commit_sha256=hash(n.raw_commit);}],
  ['missing-file',n=>{n.members.pop();n.complete_changed_files.pop();}],
  ['foreign-file',n=>{n.members[0].path='src/material/unreviewed.spec.ts';}],
  ['missing-hunk',n=>{n.original_hunks--;}],
  ['rehashed-body',n=>{const body=n.members[0].after;body.text+='\n';body.sha256=hash(body.text);body.bytes=Buffer.byteLength(body.text);}],
  ['rehashed-diff',n=>{n.diff=n.diff.replace(/^@@ /m,'@@  ');n.diff_sha256=hash(n.diff);n.diff_bytes=Buffer.byteLength(n.diff);}],
 ]){const next=structuredClone(subject);change(next);reject(subject.sha+'-'+id,()=>authenticateOverlayOriginal(next,pins[index]));}
 const cases=originalEnvironmentCases(subject,'after'),first=cases.find(n=>n.mode==='it');assert.ok(first);
 reject(subject.sha+'-lost-case',()=>compareOverlayCases(mutateCase(subject,first,()=>''),pins[index]));
 reject(subject.sha+'-duplicated-case',()=>compareOverlayCases(mutateCase(subject,first,raw=>raw+';\n'+raw),pins[index]));
 for(const mode of['fit','xit'])reject(subject.sha+'-changed-mode-'+mode,()=>compareOverlayCases(mutateCase(subject,first,raw=>raw.replace(/^it\(/,mode+'(')),pins[index]));
 for(const[id,needle,replacement]of[['predicate','.toBe(','.not.toBe('],['declaration-kind','const ','let ']]){
  const row=cases.find(n=>n.raw.includes(needle));assert.ok(row,id);reject(subject.sha+'-'+id,()=>compareOverlayCases(mutateCase(subject,row,raw=>raw.replace(needle,replacement)),pins[index]));
 }
 const pair=cases.filter(n=>n.path===first.path).slice(0,2);assert.equal(pair.length,2);const reordered=structuredClone(subject),member=reordered.members.find(n=>n.path===first.path);
 for(const row of pair)assert.equal(member.after.text.split(row.raw).length,2);member.after.text=member.after.text.replace(pair[0].raw,'__CASE_ORDER_MARKER__').replace(pair[1].raw,pair[0].raw).replace('__CASE_ORDER_MARKER__',pair[1].raw);
 reject(subject.sha+'-reordered-case',()=>compareOverlayCases(reordered,pins[index]));
 const waitCase=cases.find(n=>/await wait\(\d+\)/.test(n.raw));assert.ok(waitCase);reject(subject.sha+'-unrecorded-native-deadline',()=>compareOverlayCases(mutateCase(subject,waitCase,raw=>raw.replace(/await wait\((\d+)\)/,(_,value)=>'await wait('+(Number(value)+12345)+')')),pins[index]));
 const interleaved=structuredClone(subject),hooks=overlayHooks(subject,'after');let moved=false;
 for(const row of cases){const m=interleaved.members.find(n=>n.path===row.path),at=m.after.text.indexOf(row.raw);const possible=hooks.filter(n=>n.path===row.path&&JSON.stringify(n.suites)===JSON.stringify(row.suites)&&m.after.text.indexOf(n.raw)<at).sort((a,b)=>m.after.text.indexOf(b.raw)-m.after.text.indexOf(a.raw));if(!possible.length)continue;
  const hook=possible[0];assert.equal(m.after.text.split(hook.raw).length,2);m.after.text=m.after.text.replace(hook.raw,'').replace(row.raw,row.raw+';\n'+hook.raw);moved=true;break;
 }
 assert.equal(moved,true);reject(subject.sha+'-hook-case-interleaving',()=>reviewOverlayGlobals(interleaved,pins[index]),/interleaving/);
}
{
 const subject=originals.subjects[1],row=originalEnvironmentCases(subject,'after').find(n=>n.raw.includes('await wait(1000);'));assert.ok(row);
 // Both waits occur in the immutable source vocabulary; pair identity still
 // rejects silently changing a recorded native deadline into another one.
 reject('raw-pair-protects-deadline-even-if-both-statements-are-known',()=>compareOverlayCases(mutateCase(subject,row,raw=>raw.replace('await wait(1000);','await wait(1337);')),pins[1]),/ordered raw original pair changed/);
}
for(const[index,needle,replacement,id]of[
 [0,"selector: 'simple-menu'","selector: 'changed-menu'",'private-menu-selector-not-normalized-away'],
 [3,'options = signal<string[]>([])','options = signal<string[]>(["changed"])','signal-fixture-initial-value'],
 [3,'@for (option of options(); track option)','@for (option of otherOptions(); track option)','signal-template-call'],
 [3,"this.options.set(['One'])","this.options.set(['Two'])",'signal-fixture-timeout-assignment'],
 [0,'setTimeout(resolve, milliseconds)','setTimeout(resolve, 0)','native-wait-helper'],
 [0,'import {ComponentFixture, TestBed}', 'import type {ComponentFixture, TestBed}', 'runtime-import-not-erased-as-formatting'],
]){
 const subject=structuredClone(originals.subjects[index]),member=subject.members.find(n=>n.after.text.includes(needle));assert.ok(member,id);member.after.text=member.after.text.replace(needle,replacement);reject(id,()=>reviewOverlayGlobals(subject,pins[index]));
}
const dialog=originals.subjects[2],auto=originals.subjects[3];
{
 const row=originalEnvironmentCases(dialog,'after').find(n=>n.name==="'should focus the first focusable element on open'");assert.ok(row);
 reject('added-dialog-focus-predicate-is-exact',()=>compareOverlayCases(mutateCase(dialog,row,raw=>raw.replace(".toBe('INPUT')",".toBe('BUTTON')")),pins[2]));
}
{
 const removed=originalEnvironmentCases(auto,'before').find(n=>n.name==="'should set the active item properly after filtering in fakeAsync'");assert.ok(removed);const next=structuredClone(auto);next.members[0].after.text+='\n'+removed.raw+';\n';reject('deleted-upstream-fakeAsync-case-is-individually-accounted-for',()=>compareOverlayCases(next,pins[3]));
}
for(const[index,name,needle,replacement,id]of[
 [1,"'should be able to provide default values through an injection token'",'foods[0].value','foods[1].value','default-value-and-second-open-setup'],
 [2,"'should re-focus trigger element when dialog closes'",'await wait(100);','await wait(0);','refocus-lifecycle-boundary'],
 [3,"'should not throw on init, even if the panel is not defined'","setValue('Something')","setValue('Changed')",'removed-nonthrow-observer-retains-exact-actions'],
 [3,"'should show the panel when the options are initialized later within a component with OnPush change detection'",'await wait(1500);','await wait(100);','OnPush-delay-native-deadline'],
]){
 const subject=originals.subjects[index],row=originalEnvironmentCases(subject,'after').find(n=>n.name===name);assert.ok(row&&row.raw.includes(needle),id);reject(id,()=>compareOverlayCases(mutateCase(subject,row,raw=>raw.replace(needle,replacement)),pins[index]));
}
{
 const rows=originalEnvironmentCases(auto,'after'),loop=rows.find(n=>n.name===OVERLAY_LOOP_CASES[0]);assert.ok(loop);
 reject('fixed-loop-value-order',()=>compareOverlayCases(mutateCase(auto,loop,raw=>raw.replace('of [1, 2, 3]','of [1, 3, 2]')),pins[3]));
 const duplicate=report.subjects[3].pairs.filter(n=>n.name===OVERLAY_LOOP_CASES[2]);assert.equal(duplicate.length,2);
 assert.equal(duplicate.filter(n=>n.before.loops.length===0&&n.after.loops.length===0).length,1,'same-name scope was incorrectly converted');
 const file=ts.createSourceFile('used-binder.ts','for (const _ of [1, 2, 3]) { consume(_); }',ts.ScriptTarget.Latest,true);
 reject('loop-binder-cannot-be-discarded-when-used',()=>projectOverlayNode(file,file,pins[3],{allowLoops:true}),/loop binder is used/);
}
assert.equal(report.subjects.flatMap(n=>n.pairs).filter(n=>n.individual_exception).length,4);
assert.equal(report.subjects.flatMap(n=>n.pairs).flatMap(n=>n.before.loops).length,6);
const result={schema_version:1,line:report.line,complete_original_files:6,complete_original_hunks:550,paired_cases:667,added_cases:1,removed_cases:1,exact_label_mappings:2,
 unchanged_complete_callbacks:220,changed_paired_callbacks:447,hooks_paired:52,fixture_classes:108,changed_fixture_classes:4,template_style_properties:102,changed_private_template_properties:1,
 explicit_nonboundary_exceptions:4,predicate_sequences_equal:665,reviewed_loop_conversions:6,reviewed_loop_action_iterations:27,owned_product_members:1141,current_owned_case_bodies:2223,current_required_historical_case_ids:2228,
 controls:controls.length,cases:controls,source_helper_sha256:hash(read('scripts/spec-overlay-async-source-review.mjs')),producer_sha256:hash(read('tests/spec_overlay_async_source_probe.mjs')),
 actual_Angular_native_artifact_or_floor_qualified:false,security_clearance:'not-passed',g11_claim:'not-passed'};
const out=process.argv.indexOf('--out');if(out>=0)writeFileSync(process.argv[out+1],JSON.stringify(result,null,2)+'\n',{flag:'wx'});console.log(JSON.stringify({...result,cases:undefined}));
