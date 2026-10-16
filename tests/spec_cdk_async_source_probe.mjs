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
import {inspectCdkAsyncSources,cdkAsyncPins,authenticateCdkAsyncOriginal,compareCdkAsyncCases,reviewCdkAsyncGlobals} from '../scripts/spec-cdk-async-source-review.mjs';
const root=resolve(dirname(fileURLToPath(import.meta.url)),'..'),read=path=>readFileSync(resolve(root,path)),hash=bytes=>createHash('sha256').update(bytes).digest('hex'),ts=createRequire(import.meta.url)('typescript');
const report=inspectCdkAsyncSources({root}),pins=cdkAsyncPins({root}),originals=JSON.parse(gunzipSync(read('compatibility/rc/spec-cdk-async-source-subjects.json.gz'))),controls=[];
function reject(id,action,pattern){assert.throws(action,pattern,id);controls.push({id,result:'rejected'});}
function mutateRow(subject,row,change,side='after'){
 const next=structuredClone(subject),member=next.members.find(n=>n.path===row.path),text=member[side].text;assert.equal(text.split(row.raw).length,2,'ambiguous raw row');const replaced=change(row.raw);assert.notEqual(replaced,row.raw);member[side].text=text.replace(row.raw,replaced);return next;
}
function mutateGlobal(subject,needle,replacement,side='after'){const next=structuredClone(subject),member=next.members.find(n=>n[side].text.includes(needle));assert.ok(member,needle);assert.notEqual(needle,replacement);member[side].text=member[side].text.replace(needle,replacement);return next;}
for(const[index,subject]of originals.subjects.entries()){
 for(const[id,change]of[
  ['raw-commit',n=>{n.raw_commit+='\n';n.raw_commit_sha256=hash(n.raw_commit);}],
  ['missing-file',n=>{n.members.pop();n.complete_changed_files.pop();}],
  ['foreign-file',n=>{n.members[0].path='src/material/unreviewed.spec.ts';}],
  ['missing-hunk',n=>{n.original_hunks--;}],
  ['rehashed-body',n=>{const b=n.members[0].after;b.text+='\n';b.sha256=hash(b.text);b.bytes=Buffer.byteLength(b.text);}],
  ['rehashed-diff',n=>{n.diff=n.diff.replace(/^@@ /m,'@@  ');n.diff_sha256=hash(n.diff);n.diff_bytes=Buffer.byteLength(n.diff);}],
 ]){const next=structuredClone(subject);change(next);reject(subject.sha+'-'+id,()=>authenticateCdkAsyncOriginal(next,pins[index]));}
 const cases=originalEnvironmentCases(subject,'after'),first=cases.find(n=>n.mode==='it');assert.ok(first);
 reject(subject.sha+'-lost-case',()=>compareCdkAsyncCases(mutateRow(subject,first,()=>''),pins[index]));
 reject(subject.sha+'-duplicated-case',()=>compareCdkAsyncCases(mutateRow(subject,first,raw=>raw+';\n'+raw),pins[index]));
 for(const mode of['fit','xit'])reject(subject.sha+'-case-mode-'+mode,()=>compareCdkAsyncCases(mutateRow(subject,first,raw=>raw.replace(/^it\(/,mode+'(')),pins[index]));
 for(const[id,needle,replacement]of[['predicate','.toBe(','.not.toBe('],['declaration-kind','const ','let ']]){
  const row=cases.find(n=>n.raw.includes(needle));assert.ok(row,id);reject(subject.sha+'-'+id,()=>compareCdkAsyncCases(mutateRow(subject,row,raw=>raw.replace(needle,replacement)),pins[index]));
 }
 const pair=cases.filter(n=>n.path===first.path).slice(0,2),reordered=structuredClone(subject),member=reordered.members.find(n=>n.path===first.path);assert.equal(pair.length,2);
 for(const row of pair)assert.equal(member.after.text.split(row.raw).length,2);member.after.text=member.after.text.replace(pair[0].raw,'__CASE_ORDER_MARKER__').replace(pair[1].raw,pair[0].raw).replace('__CASE_ORDER_MARKER__',pair[1].raw);
 reject(subject.sha+'-case-order',()=>compareCdkAsyncCases(reordered,pins[index]));
 const boundary=cases.find(n=>/await /.test(n.raw));assert.ok(boundary);
 reject(subject.sha+'-unrecorded-boundary',()=>compareCdkAsyncCases(mutateRow(subject,boundary,raw=>/await [\w.]+\(/.test(raw)?raw.replace(/await [\w.]+\(/,'await unreviewedAction('):raw.replace('setTimeout(','unreviewedSetTimeout(')),pins[index]));
 const interleaved=structuredClone(subject),hooks=overlayHooks(subject,'after');let moved=false;
 for(const row of cases){const m=interleaved.members.find(n=>n.path===row.path),at=m.after.text.indexOf(row.raw),possible=hooks.filter(n=>n.path===row.path&&JSON.stringify(n.suites)===JSON.stringify(row.suites)&&m.after.text.indexOf(n.raw)<at&&m.after.text.split(n.raw).length===2).sort((a,b)=>m.after.text.indexOf(b.raw)-m.after.text.indexOf(a.raw));if(!possible.length)continue;
  const hook=possible[0];assert.equal(m.after.text.split(hook.raw).length,2);m.after.text=m.after.text.replace(hook.raw,'').replace(row.raw,row.raw+';\n'+hook.raw);moved=true;break;
 }
 assert.equal(moved,true);reject(subject.sha+'-hook-case-interleaving',()=>reviewCdkAsyncGlobals(interleaved,pins[index]),/interleaving/);
 const file=ts.createSourceFile('original.ts',subject.members[0].after.text,ts.ScriptTarget.Latest,true),fixture=file.statements.find(ts.isClassDeclaration);assert.ok(fixture?.name);
 reject(subject.sha+'-fixture-class',()=>reviewCdkAsyncGlobals(mutateGlobal(subject,fixture.getText(file),fixture.getText(file).replace('class '+fixture.name.text,'class UnreviewedFixture')),pins[index]));
}
for(const[index,subject]of originals.subjects.entries()){
 const rows=originalEnvironmentCases(subject,'after');
 for(const exception of pins[index].exceptions){const row=rows.find(n=>n.sha256===exception.after_sha256);assert.ok(row);const change=row.raw.includes('viewportRuler.change(10)')?raw=>raw.replace('viewportRuler.change(10)','viewportRuler.change(1337)'):row.raw.includes('templateCacheSize = 1')?raw=>raw.replace('templateCacheSize = 1','templateCacheSize = 2'):raw=>raw.replace('.toBeRejectedWithError(','.not.toBeRejectedWithError(');
  reject('exact-error-deadline-or-cache-observer-'+exception.after_sha256,()=>compareCdkAsyncCases(mutateRow(subject,row,change),pins[index]));
 }
 for(const rename of pins[index].renamed_cases){const row=rows.find(n=>n.sha256===rename.after_sha256);assert.ok(row);reject('finite-label-mapping-'+rename.after_sha256,()=>compareCdkAsyncCases(mutateRow(subject,row,raw=>raw.replace(row.name,"'unreviewed case label'")),pins[index]));}
 for(const removal of pins[index].removed_cases){const old=originalEnvironmentCases(subject,'before').find(n=>n.sha256===removal.sha256);assert.ok(old);const next=structuredClone(subject);next.members.find(n=>n.path===old.path).after.text+='\n'+old.raw+';\n';reject('removed-overlay-timeout-case-is-individual-'+removal.sha256,()=>compareCdkAsyncCases(next,pins[index]));}
 for(const wait of pins[index].wait_helpers)reject(subject.sha+'-native-wait-helper-'+wait.sha256,()=>reviewCdkAsyncGlobals(mutateGlobal(subject,wait.raw,wait.raw.replace('setTimeout','unreviewedSetTimeout')),pins[index]));
 for(const helper of pins[index].changed_initialization_scroll_helpers){const row={path:helper.path,raw:helper.raw};reject('complete-local-frame-scroll-helper-'+helper.sha256,()=>reviewCdkAsyncGlobals(mutateRow(subject,row,raw=>raw.slice(0,-1)+'unreviewedOperation();\n}',helper.side),pins[index]));}
 const file=ts.createSourceFile('original.ts',subject.members[0].after.text,99,true),imp=file.statements.find(n=>ts.isImportDeclaration(n)&&n.importClause?.namedBindings&&ts.isNamedImports(n.importClause.namedBindings));assert.ok(imp);const raw=imp.getText(file);
 reject(subject.sha+'-runtime-import-kind',()=>reviewCdkAsyncGlobals(mutateGlobal(subject,raw,raw.replace('import {','import type {')),pins[index]));
}
const table=originals.subjects[1],scroll=originals.subjects[2],layout=originals.subjects[0],zone='src/cdk/scrolling/virtual-scroll-viewport.zone.spec.ts';
reject('retained-table-fakeAsync-binding',()=>reviewCdkAsyncGlobals(mutateGlobal(table,'ComponentFixture, fakeAsync, flush, TestBed','ComponentFixture, flush, TestBed'),pins[1]));
reject('finite-table-import-order',()=>reviewCdkAsyncGlobals(mutateGlobal(table,'ComponentFixture, fakeAsync, flush, TestBed','TestBed, fakeAsync, flush, ComponentFixture'),pins[1]));
reject('exact-twenty-ms-debounce-constant',()=>reviewCdkAsyncGlobals(mutateGlobal(layout,'const debounceTime = 20;','const debounceTime = 21;'),pins[0]));
{const next=structuredClone(layout);next.members[0].after.text=next.members[0].after.text.replace('const debounceTime = 20;','')+'\nconst debounceTime = 20;';reject('debounce-constant-cannot-move-scope',()=>reviewCdkAsyncGlobals(next,pins[0]));}
{const next=structuredClone(scroll),member=next.members.find(n=>n.path===zone);assert.ok(member.before.text.includes('animationFrameScheduler.flush();'));member.before.text=member.before.text.replace('animationFrameScheduler.flush();','animationFrameScheduler.flush(1);');reject('exact-zone-scheduler-flush-source',()=>reviewCdkAsyncGlobals(next,pins[2]));}
{const next=structuredClone(scroll);next.members.find(n=>n.path===zone).after.text+="\nimport {animationFrameScheduler} from 'rxjs';";reject('removed-scheduler-import-cannot-return-after',()=>reviewCdkAsyncGlobals(next,pins[2]));}
{const next=structuredClone(table);next.members[0].after.text+='\nfunction ordinaryFlush() { response.flush("unreviewed"); }';reject('unrelated-flush-is-not-a-clock-boundary',()=>reviewCdkAsyncGlobals(next,pins[1]));}
{const helper=pins[1].changed_initialization_scroll_helpers.find(n=>n.side==='after'&&n.name==='createVirtualScroll');assert.ok(helper&&helper.raw.includes('Promise<'));reject('local-Promise-result-wrapper-is-exact',()=>reviewCdkAsyncGlobals(mutateGlobal(table,helper.raw,helper.raw.replace('Promise<','PromiseLike<')),pins[1]));}
const result={schema_version:1,line:report.line,complete_original_files:11,complete_original_hunks:110,paired_cases:406,unchanged_complete_callbacks:287,changed_callbacks:119,hooks_paired:50,fixture_classes_unchanged:65,template_style_properties_unchanged:68,individual_observer_or_delay_exceptions:4,renamed_cases:1,removed_cases:3,initialization_scroll_helper_bodies:12,added_debounce_constants:1,local_scheduler_flush_source_statements:2,local_async_result_type_wrappers:1,predicate_sequences_equal:403,owned_product_members:1141,current_owned_case_bodies:2223,current_required_historical_case_ids:2228,controls:controls.length,cases:controls,source_helper_sha256:hash(read('scripts/spec-cdk-async-source-review.mjs')),producer_sha256:hash(read('tests/spec_cdk_async_source_probe.mjs')),actual_Angular_native_artifact_or_floor_qualified:false,security_clearance:'not-passed',g11_claim:'not-passed'};
const out=process.argv.indexOf('--out');if(out>=0)writeFileSync(process.argv[out+1],JSON.stringify(result,null,2)+'\n',{flag:'wx'});console.log(JSON.stringify({...result,cases:undefined}));
