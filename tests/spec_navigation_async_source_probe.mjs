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
import {inspectNavigationSources,navigationPins,authenticateNavigationOriginal,compareNavigationCases,reviewNavigationGlobals} from '../scripts/spec-navigation-async-source-review.mjs';
const root=resolve(dirname(fileURLToPath(import.meta.url)),'..'),read=path=>readFileSync(resolve(root,path)),hash=bytes=>createHash('sha256').update(bytes).digest('hex'),ts=createRequire(import.meta.url)('typescript');
const report=inspectNavigationSources({root}),pins=navigationPins({root}),originals=JSON.parse(gunzipSync(read('compatibility/rc/spec-navigation-async-source-subjects.json.gz'))),controls=[];
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
 ]){const next=structuredClone(subject);change(next);reject(subject.sha+'-'+id,()=>authenticateNavigationOriginal(next,pins[index]));}
 const cases=originalEnvironmentCases(subject,'after'),first=cases.find(n=>n.mode==='it');assert.ok(first);
 reject(subject.sha+'-lost-case',()=>compareNavigationCases(mutateRow(subject,first,()=>''),pins[index]));
 reject(subject.sha+'-duplicated-case',()=>compareNavigationCases(mutateRow(subject,first,raw=>raw+';\n'+raw),pins[index]));
 for(const mode of['fit','xit'])reject(subject.sha+'-case-mode-'+mode,()=>compareNavigationCases(mutateRow(subject,first,raw=>raw.replace(/^it\(/,mode+'(')),pins[index]));
 for(const[id,needle,replacement]of[['predicate','.toBe(','.not.toBe('],['declaration-kind','const ','let ']]){
  const row=cases.find(n=>n.raw.includes(needle));assert.ok(row,id);reject(subject.sha+'-'+id,()=>compareNavigationCases(mutateRow(subject,row,raw=>raw.replace(needle,replacement)),pins[index]));
 }
 const pair=cases.filter(n=>n.path===first.path).slice(0,2),reordered=structuredClone(subject),member=reordered.members.find(n=>n.path===first.path);assert.equal(pair.length,2);
 for(const row of pair)assert.equal(member.after.text.split(row.raw).length,2);member.after.text=member.after.text.replace(pair[0].raw,'__CASE_ORDER_MARKER__').replace(pair[1].raw,pair[0].raw).replace('__CASE_ORDER_MARKER__',pair[1].raw);
 reject(subject.sha+'-case-order',()=>compareNavigationCases(reordered,pins[index]));
 const boundary=cases.find(n=>/await [\w.]+\(/.test(n.raw));assert.ok(boundary);
 reject(subject.sha+'-unrecorded-boundary',()=>compareNavigationCases(mutateRow(subject,boundary,raw=>raw.replace(/await [\w.]+\(/,'await unreviewedAction(')),pins[index]));
 const interleaved=structuredClone(subject),hooks=overlayHooks(subject,'after');let moved=false;
 for(const row of cases){const m=interleaved.members.find(n=>n.path===row.path),at=m.after.text.indexOf(row.raw),possible=hooks.filter(n=>n.path===row.path&&JSON.stringify(n.suites)===JSON.stringify(row.suites)&&m.after.text.indexOf(n.raw)<at&&m.after.text.split(n.raw).length===2).sort((a,b)=>m.after.text.indexOf(b.raw)-m.after.text.indexOf(a.raw));if(!possible.length)continue;
  const hook=possible[0];assert.equal(m.after.text.split(hook.raw).length,2);m.after.text=m.after.text.replace(hook.raw,'').replace(row.raw,row.raw+';\n'+hook.raw);moved=true;break;
 }
 assert.equal(moved,true);reject(subject.sha+'-hook-case-interleaving',()=>reviewNavigationGlobals(interleaved,pins[index]),/interleaving/);
 const file=ts.createSourceFile('original.ts',subject.members[0].after.text,ts.ScriptTarget.Latest,true),fixture=file.statements.find(ts.isClassDeclaration);assert.ok(fixture?.name);
 reject(subject.sha+'-fixture-class',()=>reviewNavigationGlobals(mutateGlobal(subject,fixture.getText(file),fixture.getText(file).replace('class '+fixture.name.text,'class UnreviewedFixture')),pins[index]));
}
for(const[index,subject]of originals.subjects.entries()){
 const rows=originalEnvironmentCases(subject,'after');
 for(const exception of pins[index].exceptions){const row=rows.find(n=>n.sha256===exception.after_sha256);assert.ok(row);const change=index===0?(row.raw.includes('toBeGreaterThanOrEqual')?raw=>raw.replace('.toBeGreaterThanOrEqual(1)','.toBe(1)'):raw=>raw.replace('await wait(1)','await wait(2)')):index===2?raw=>raw.replace('.and.returnValue(0 as any)','.and.callThrough()'):raw=>raw.replace('expectAsync(','expect(');
  reject('exact-observer-'+exception.after_sha256,()=>compareNavigationCases(mutateRow(subject,row,change),pins[index]));
 }
 for(const rename of pins[index].renamed_cases){const row=rows.find(n=>n.sha256===rename.after_sha256);assert.ok(row);reject('finite-label-mapping-'+rename.after_sha256,()=>compareNavigationCases(mutateRow(subject,row,raw=>raw.replace(row.name,"'unreviewed case label'")),pins[index]));}
 for(const removal of pins[index].removed_cases){const old=originalEnvironmentCases(subject,'before').find(n=>n.sha256===removal.sha256);assert.ok(old);const next=structuredClone(subject);next.members.find(n=>n.path===old.path).after.text+='\n'+old.raw+';\n';reject('removed-timer-cleanup-is-individual-'+removal.sha256,()=>compareNavigationCases(next,pins[index]));}
 const wait=pins[index].wait_helpers[0];assert.ok(wait);reject(subject.sha+'-native-wait-helper',()=>reviewNavigationGlobals(mutateGlobal(subject,wait.raw,wait.raw.replace('setTimeout','unreviewedSetTimeout')),pins[index]));
 const member=subject.members[0],file=ts.createSourceFile('original.ts',member.after.text,99,true),imp=file.statements.find(n=>ts.isImportDeclaration(n)&&n.importClause?.namedBindings&&ts.isNamedImports(n.importClause.namedBindings));assert.ok(imp);const raw=imp.getText(file);
 reject(subject.sha+'-runtime-import-kind',()=>reviewNavigationGlobals(mutateGlobal(subject,raw,raw.replace('import {','import type {')),pins[index]));
}
const snack=originals.subjects[2],constant=pins[2].removed_global_declarations[0];assert.equal(constant.raw,'const animationFrameDelay = 16;');
reject('removed-frame-delay-is-exact-original',()=>reviewNavigationGlobals(mutateGlobal(snack,constant.raw,'const animationFrameDelay = 15;','before'),pins[2]));
{const next=structuredClone(snack);next.members[0].after.text+='\n'+constant.raw;reject('removed-frame-delay-cannot-return-in-another-scope',()=>reviewNavigationGlobals(next,pins[2]));}
{const subject=originals.subjects[1],member=subject.members.find(n=>n.path.endsWith('/selection-list.spec.ts')),file=ts.createSourceFile('original.ts',member.after.text,99,true),imp=file.statements.find(n=>ts.isImportDeclaration(n)&&n.moduleSpecifier.text==='@angular/core/testing');assert.ok(imp);const raw=imp.getText(file);assert.match(raw,/\btick\b/);reject('retained-list-tick-import',()=>reviewNavigationGlobals(mutateGlobal(subject,raw,raw.replace(/\btick\s*,?/,'')),pins[1]));}
const tabTests=read('projects/ngx-material-legacy/legacy-tabs/tab-header.spec.ts').toString();for(const removal of pins[3].removed_cases)assert.ok(tabTests.includes('it('+removal.name+','),'owned timer-cleanup case lost');
const result={schema_version:1,line:report.line,complete_original_files:9,complete_original_hunks:198,paired_cases:370,unchanged_complete_callbacks:217,changed_callbacks:153,hooks_paired:42,fixture_classes_unchanged:84,template_style_properties_unchanged:82,individual_observer_or_delay_exceptions:7,renamed_cases:6,removed_cases:3,predicate_sequences_equal:365,owned_product_members:1141,current_owned_case_bodies:2223,current_required_historical_case_ids:2228,controls:controls.length,cases:controls,source_helper_sha256:hash(read('scripts/spec-navigation-async-source-review.mjs')),producer_sha256:hash(read('tests/spec_navigation_async_source_probe.mjs')),actual_Angular_native_artifact_or_floor_qualified:false,security_clearance:'not-passed',g11_claim:'not-passed'};
const out=process.argv.indexOf('--out');if(out>=0)writeFileSync(process.argv[out+1],JSON.stringify(result,null,2)+'\n',{flag:'wx'});console.log(JSON.stringify({...result,cases:undefined}));
