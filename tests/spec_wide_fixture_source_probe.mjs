/**
 * @license
 * Copyright Google LLC All Rights Reserved.
 * Copyright (c) 2026 Ryan Lester.
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.io/license
 */
/** Authenticated source controls; no original fixtures or Angular renderer executed. */
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {readFileSync,writeFileSync} from 'node:fs';
import {gunzipSync} from 'node:zlib';
import {dirname,resolve} from 'node:path';
import {fileURLToPath} from 'node:url';
import {inspectWideFixtureSources,authenticateWideOriginal,reviewWideMember,projectWideProgram,wideRegistrations} from '../scripts/spec-wide-fixture-source-review.mjs';
const root=resolve(dirname(fileURLToPath(import.meta.url)),'..'),read=path=>readFileSync(resolve(root,path)),hash=bytes=>createHash('sha256').update(bytes).digest('hex');
const report=inspectWideFixtureSources({root}),originals=JSON.parse(gunzipSync(read('compatibility/rc/spec-wide-fixture-source-subjects.json.gz'))),controls=[];
function reject(id,action){assert.throws(action,undefined,id);controls.push({id,result:'rejected'});}
for(const [index,subject]of originals.subjects.entries()){
 for(const [id,mutate]of [
  ['raw-commit',n=>{n.raw_commit+='\n';n.raw_commit_sha256=hash(n.raw_commit);}],
  ['missing-file',n=>{n.members.pop();n.complete_changed_files.pop();}],
  ['foreign-file',n=>{n.members[0].path='src/material/unreviewed.spec.ts';}],
  ['missing-hunk',n=>{n.original_hunks--;}],
  ['rehashed-body',n=>{n.members[0].after.text+='\n';n.members[0].after.sha256=hash(n.members[0].after.text);n.members[0].after.bytes=Buffer.byteLength(n.members[0].after.text);}],
  ['rehashed-diff',n=>{n.diff=n.diff.replace(/^@@ /m,'@@  ');n.diff_sha256=hash(n.diff);n.diff_bytes=Buffer.byteLength(n.diff);}],
 ]){const changed=structuredClone(subject);mutate(changed);reject(subject.sha+'-'+id,()=>authenticateWideOriginal(changed));}
 for(const [id,needle,replacement]of [
  ['predicate','.toBe(','.not.toBe('],['declaration-kind','const ','let '],['case-mode','it(','fit('],
  ['hook-order','beforeEach(','afterEach('],['new-compilation-boundary','beforeEach(','TestBed.compileComponents();\nbeforeEach('],
 ]){
  const member=subject.members.find(n=>n.after.text.includes(needle));assert.ok(member,id);const changed=structuredClone(member);
  changed.after.text=changed.after.text.replace(needle,replacement);reject(subject.sha+'-'+id,()=>reviewWideMember(changed,index));
 }
 const candidate=subject.members.find(n=>n.after.text.includes('template: `'));
 assert.ok(candidate);const template=structuredClone(candidate);template.after.text=template.after.text.replace('template: `','template: `changed ');
 reject(subject.sha+'-template-source',()=>reviewWideMember(template,index));
 const styled=subject.members.find(n=>n.after.text.includes('styles: `')||n.after.text.includes("styles: ['"));assert.ok(styled);
 const style=structuredClone(styled),needle=style.after.text.includes('styles: `')?'styles: `':"styles: ['";
 style.after.text=style.after.text.replace(needle,needle+'changed ');reject(subject.sha+'-style-source',()=>reviewWideMember(style,index));
}
const compile=originals.subjects[0],standalone=originals.subjects[1];
const overlay=compile.members.find(n=>n.path==='src/cdk/overlay/overlay.spec.ts');assert.ok(overlay.after.text.includes('expect(() => TestBed.compileComponents()).not.toThrow();'));
{
 const changed=structuredClone(overlay);changed.after.text=changed.after.text.replace('expect(() => TestBed.compileComponents()).not.toThrow();','expect(() => TestBed).not.toThrow();');
 reject('retained-compiler-availability-predicate',()=>reviewWideMember(changed,0));
}
const list=compile.members.find(n=>n.path==='src/material/list/testing/list-harness.spec.ts');
{
 const changed=structuredClone(list);assert.ok(changed.after.text.includes('beforeEach(async () =>'));
 changed.after.text=changed.after.text.replace('beforeEach(async () =>','beforeEach(() =>');reject('retained-async-hook-is-not-normalized-away',()=>reviewWideMember(changed,0));
}
{
 const member=compile.members.find(n=>wideRegistrations(n,'before').some(row=>row.mode==='xit'));assert.ok(member);
 const changed=structuredClone(member);changed.after.text=changed.after.text.replace('xit(','it(');reject('disabled-autocomplete-case-is-retained-as-disabled',()=>reviewWideMember(changed,0));
}
for(const [id,needle,replacement]of [
 ['reset-boundary','resetTestingModule()','resetTestingModuleChanged()'],
 ['provider-override','overrideProvider(','overrideProviderChanged('],
]){
 const member=compile.members.find(n=>n.after.text.includes(needle));assert.ok(member,id);const changed=structuredClone(member);
 changed.after.text=changed.after.text.replace(needle,replacement);reject(id+'-preserved-with-compiler-chain-removal',()=>reviewWideMember(changed,0));
}
{
 const member=standalone.members.find(n=>n.before.text.includes("from '@angular/core'"));assert.ok(member);
 const changed=structuredClone(member);changed.before.text=changed.before.text.replace("from '@angular/core'","from 'foreign-core'");
 reject('standalone-removal-requires-actual-public-core-decorator',()=>projectWideProgram(changed,1));
}
{
 const member=standalone.members[0],changed=structuredClone(member);changed.before.text+='\nconst outside = {standalone: true};\n';
 reject('standalone-property-outside-decorator-is-not-a-default-change',()=>projectWideProgram(changed,1));
}
assert.equal(report.subjects[0].retentions.length,5);assert.equal(report.subjects[0].disabled_cases_preserved.length,1);
assert.equal(report.subjects[0].setup_cleanup_hooks_paired,690);assert.equal(report.subjects[1].setup_cleanup_hooks_paired,526);
assert.equal(report.subjects.flatMap(n=>n.files).reduce((sum,n)=>sum+n.template_style_properties_preserved.length,0),1441);
const output={schema_version:1,line:report.line,controls:controls.length,cases:controls,
 complete_original_files:362,complete_original_bodies:724,complete_original_hunks:841,static_cases_paired:8119,
 hooks_paired:1216,changed_case_callbacks:24,unchanged_case_callbacks:8095,template_style_properties_preserved:1441,
 compiler_calls_removed:302,async_hook_modifiers_removed:51,async_hooks_retained:4,compiler_assertion_retained:1,
 standalone_true_properties_removed:553,Component_metadata_removals:543,Directive_metadata_removals:10,disabled_cases_preserved:1,
 owned_product_members:1141,current_owned_cases_preserved:2223,required_consumer_CSS_SCSS_changes:0,
 source_producer_sha256:hash(read('scripts/spec-wide-fixture-source-review.mjs')),producer_sha256:hash(read('tests/spec_wide_fixture_source_probe.mjs')),
 actual_Angular_native_artifact_or_floor_qualified:false,security_clearance:'not-passed',g11_claim:'not-passed'};
const out=process.argv.indexOf('--out');if(out>=0)writeFileSync(process.argv[out+1],JSON.stringify(output,null,2)+'\n',{flag:'wx'});
console.log(JSON.stringify({...output,cases:undefined}));
