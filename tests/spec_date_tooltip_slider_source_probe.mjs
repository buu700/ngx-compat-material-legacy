/**
 * @license
 * Copyright Google LLC All Rights Reserved.
 * Copyright (c) 2026 Ryan Lester.
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.io/license
 */
/** Complete immutable source and rejected mutations; no original spec execution. */
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {createRequire} from 'node:module';
import {readFileSync,writeFileSync} from 'node:fs';
import {gunzipSync} from 'node:zlib';
import {dirname,resolve} from 'node:path';
import {fileURLToPath} from 'node:url';
import {originalEnvironmentCases} from '../scripts/spec-test-environment-source-review.mjs';
import {overlayHooks} from '../scripts/spec-overlay-async-source-review.mjs';
import {inspectDateTooltipSliderSources,dateTooltipSliderPins,authenticateDateTooltipSliderOriginal,compareDateTooltipSliderCases,reviewDateTooltipSliderGlobals} from '../scripts/spec-date-tooltip-slider-source-review.mjs';
const root=resolve(dirname(fileURLToPath(import.meta.url)),'..'),read=path=>readFileSync(resolve(root,path)),hash=bytes=>createHash('sha256').update(bytes).digest('hex'),ts=createRequire(import.meta.url)('typescript');
const report=inspectDateTooltipSliderSources({root}),pins=dateTooltipSliderPins({root}),originals=JSON.parse(gunzipSync(read('compatibility/rc/spec-date-tooltip-slider-source-subjects.json.gz'))),controls=[];
function reject(id,action,pattern){assert.throws(action,pattern,id);controls.push({id,result:'rejected'});}
function mutateRow(subject,row,change,side='after'){
 const next=structuredClone(subject),member=next.members.find(n=>n.path===row.path),text=member[side].text;assert.equal(text.split(row.raw).length,2,'ambiguous raw row');const replaced=change(row.raw);assert.notEqual(replaced,row.raw);member[side].text=text.replace(row.raw,replaced);return next;
}
function mutateGlobal(subject,needle,replacement){const next=structuredClone(subject),member=next.members.find(n=>n.after.text.includes(needle));assert.ok(member,needle);assert.notEqual(needle,replacement);member.after.text=member.after.text.replace(needle,replacement);return next;}
for(const[index,subject]of originals.subjects.entries()){
 for(const[id,change]of[
  ['raw-commit',n=>{n.raw_commit+='\n';n.raw_commit_sha256=hash(n.raw_commit);}],
  ['missing-file',n=>{n.members.pop();n.complete_changed_files.pop();}],
  ['foreign-file',n=>{n.members[0].path='src/material/unreviewed.spec.ts';}],
  ['missing-hunk',n=>{n.original_hunks--;}],
  ['rehashed-body',n=>{const b=n.members[0].after;b.text+='\n';b.sha256=hash(b.text);b.bytes=Buffer.byteLength(b.text);}],
  ['rehashed-diff',n=>{n.diff=n.diff.replace(/^@@ /m,'@@  ');n.diff_sha256=hash(n.diff);n.diff_bytes=Buffer.byteLength(n.diff);}],
 ]){const next=structuredClone(subject);change(next);reject(subject.sha+'-'+id,()=>authenticateDateTooltipSliderOriginal(next,pins[index]));}
 const cases=originalEnvironmentCases(subject,'after'),first=cases.find(n=>n.mode==='it');assert.ok(first);
 reject(subject.sha+'-lost-case',()=>compareDateTooltipSliderCases(mutateRow(subject,first,()=>''),pins[index]));
 reject(subject.sha+'-duplicated-case',()=>compareDateTooltipSliderCases(mutateRow(subject,first,raw=>raw+';\n'+raw),pins[index]));
 for(const mode of['fit','xit'])reject(subject.sha+'-case-mode-'+mode,()=>compareDateTooltipSliderCases(mutateRow(subject,first,raw=>raw.replace(/^it\(/,mode+'(')),pins[index]));
 for(const[id,needle,replacement]of[['predicate','.toBe(','.not.toBe('],['declaration-kind','const ','let ']]){
  const row=cases.find(n=>n.raw.includes(needle));assert.ok(row,id);reject(subject.sha+'-'+id,()=>compareDateTooltipSliderCases(mutateRow(subject,row,raw=>raw.replace(needle,replacement)),pins[index]));
 }
 const pair=cases.filter(n=>n.path===first.path).slice(0,2),reordered=structuredClone(subject),member=reordered.members.find(n=>n.path===first.path);assert.equal(pair.length,2);
 for(const row of pair)assert.equal(member.after.text.split(row.raw).length,2);member.after.text=member.after.text.replace(pair[0].raw,'__CASE_ORDER_MARKER__').replace(pair[1].raw,pair[0].raw).replace('__CASE_ORDER_MARKER__',pair[1].raw);
 reject(subject.sha+'-case-order',()=>compareDateTooltipSliderCases(reordered,pins[index]));
 const boundary=cases.find(n=>(index===2?/await (?:slideToValue|setValueByClick)\(/:/await wait\(\d+\)/).test(n.raw));assert.ok(boundary);
 reject(subject.sha+'-unrecorded-boundary',()=>compareDateTooltipSliderCases(mutateRow(subject,boundary,raw=>index===2?raw.replace(/await (slideToValue|setValueByClick)\(/,'await unreviewedAction('):raw.replace(/await wait\((\d+)\)/,'await wait(123456)')),pins[index]));
 const interleaved=structuredClone(subject),hooks=overlayHooks(subject,'after');let moved=false;
 for(const row of cases){const m=interleaved.members.find(n=>n.path===row.path),at=m.after.text.indexOf(row.raw),possible=hooks.filter(n=>n.path===row.path&&JSON.stringify(n.suites)===JSON.stringify(row.suites)&&m.after.text.indexOf(n.raw)<at&&m.after.text.split(n.raw).length===2).sort((a,b)=>m.after.text.indexOf(b.raw)-m.after.text.indexOf(a.raw));if(!possible.length)continue;
  const hook=possible[0];assert.equal(m.after.text.split(hook.raw).length,2);m.after.text=m.after.text.replace(hook.raw,'').replace(row.raw,row.raw+';\n'+hook.raw);moved=true;break;
 }
 assert.equal(moved,true);reject(subject.sha+'-hook-case-interleaving',()=>reviewDateTooltipSliderGlobals(interleaved,pins[index]),/interleaving/);
 const file=ts.createSourceFile('original.ts',subject.members[0].after.text,ts.ScriptTarget.Latest,true),fixture=file.statements.find(ts.isClassDeclaration);assert.ok(fixture?.name);
 reject(subject.sha+'-fixture-class',()=>reviewDateTooltipSliderGlobals(mutateGlobal(subject,fixture.getText(file),fixture.getText(file).replace('class '+fixture.name.text,'class UnreviewedFixture')),pins[index]));
}
for(const[index,subject]of originals.subjects.entries())for(const exception of pins[index].exceptions){
 const row=originalEnvironmentCases(subject,'after').find(n=>n.path===exception.path&&n.name===exception.name&&JSON.stringify(n.suites)===JSON.stringify(exception.suites));assert.ok(row);
 const needle=index===0?'.toBe(': /\b10\b/.exec(row.raw)?.[0];assert.ok(needle&&row.raw.includes(needle));
 reject('exact-observer-or-delay-'+exception.after_sha256,()=>compareDateTooltipSliderCases(mutateRow(subject,row,raw=>raw.replace(needle,index===0?'.not.toBe(':'11')),pins[index]));
}
for(const index of[0,1]){
 const subject=originals.subjects[index];reject(subject.sha+'-native-wait-helper',()=>reviewDateTooltipSliderGlobals(mutateGlobal(subject,'setTimeout(resolve, milliseconds)','setTimeout(resolve, 0)'),pins[index]));
}
const slider=originals.subjects[2];
for(const promotion of pins[2].fixture_promotions){
 const row=overlayHooks(slider,'after').find(n=>n.sha256===promotion.after_sha256);assert.ok(row);
 reject('fixture-promotion-initializer-'+promotion.after_sha256,()=>reviewDateTooltipSliderGlobals(mutateRow(slider,row,raw=>raw.replace('createComponent(','createOtherComponent(')),pins[2]));
 const old=overlayHooks(slider,'before').find(n=>n.sha256===promotion.before_sha256);assert.ok(old);
 reject('fixture-promotion-declaration-kind-'+promotion.before_sha256,()=>reviewDateTooltipSliderGlobals(mutateRow(slider,old,raw=>raw.replace('const fixture','let fixture'),'before'),pins[2]));
}
reject('fixture-promotion-enclosing-binding',()=>reviewDateTooltipSliderGlobals(mutateGlobal(slider,'let fixture: ComponentFixture<any>;','let otherFixture: ComponentFixture<any>;'),pins[2]));
for(const functionName of['setValueByClick','slideToValue','getCoordsForValue']){
 const member=slider.members.find(n=>n.path.endsWith('/slider.spec.ts')),file=ts.createSourceFile('slider.spec.ts',member.after.text,ts.ScriptTarget.Latest,true);let node;
 const visit=n=>{if(ts.isFunctionDeclaration(n)&&n.name?.text===functionName)node=n;ts.forEachChild(n,visit);};visit(file);assert.ok(node?.body);
 const raw=node.getText(file),changed=raw.slice(0,-1)+'unreviewedOperation();\n}';
 reject('slider-geometry-or-dispatch-helper-'+functionName,()=>reviewDateTooltipSliderGlobals(mutateGlobal(slider,raw,changed),pins[2]));
}
for(const[index,binding]of[[1,'fakeAsync'],[2,'waitForAsync']]){
 const subject=originals.subjects[index],member=subject.members.find(n=>n.path.endsWith(index===1?'/tooltip.spec.ts':'/slider.spec.ts')),file=ts.createSourceFile('original.ts',member.after.text,ts.ScriptTarget.Latest,true),declaration=file.statements.find(n=>ts.isImportDeclaration(n)&&n.moduleSpecifier.text==='@angular/core/testing');assert.ok(declaration);
 const raw=declaration.getText(file);assert.match(raw,new RegExp('\\b'+binding+'\\b'));const changed=raw.replace(new RegExp('\\b'+binding+'\\s*,?'), '');assert.notEqual(changed,raw);
 reject('retained-public-testing-import-'+binding,()=>reviewDateTooltipSliderGlobals(mutateGlobal(subject,raw,changed),pins[index]));
 reject('runtime-import-kind-'+binding,()=>reviewDateTooltipSliderGlobals(mutateGlobal(subject,raw,raw.replace('import {','import type {')),pins[index]));
}
const result={schema_version:1,line:report.line,complete_original_files:7,complete_original_hunks:239,paired_cases:413,unchanged_complete_callbacks:177,changed_callbacks:236,hooks_paired:67,fixture_classes_unchanged:74,template_style_properties_unchanged:98,individual_observer_or_delay_exceptions:8,promoted_fixture_bindings:2,predicate_sequences_equal:411,owned_product_members:1141,current_owned_case_bodies:2223,current_required_historical_case_ids:2228,controls:controls.length,cases:controls,source_helper_sha256:hash(read('scripts/spec-date-tooltip-slider-source-review.mjs')),producer_sha256:hash(read('tests/spec_date_tooltip_slider_source_probe.mjs')),actual_Angular_native_artifact_or_floor_qualified:false,security_clearance:'not-passed',g11_claim:'not-passed'};
const out=process.argv.indexOf('--out');if(out>=0)writeFileSync(process.argv[out+1],JSON.stringify(result,null,2)+'\n',{flag:'wx'});console.log(JSON.stringify({...result,cases:undefined}));
