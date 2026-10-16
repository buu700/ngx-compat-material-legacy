/**
 * @license
 * Copyright Google LLC All Rights Reserved.
 * Copyright (c) 2026 Ryan Lester.
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.io/license
 */
/** Provenance, exact full patch semantics, retained coverage and public floor-source controls. */
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {execFileSync} from 'node:child_process';
import {readFileSync,writeFileSync} from 'node:fs';
import {gunzipSync} from 'node:zlib';
import {dirname,resolve} from 'node:path';
import {fileURLToPath} from 'node:url';
import {reviewCompleteSingleSpec} from '../scripts/authenticated-single-spec-review.mjs';
import {candidateProductSourcePaths} from '../scripts/upstream-candidate-source-evidence.mjs';
import {CONTROL_SOURCE_SHAS,CONTROL_SOURCE_CAPSULES,reviewAddedControlSpec,analyzeControlSourceSemantics,inspectControlTestSources} from '../scripts/spec-control-test-source-review.mjs';
const root=resolve(dirname(fileURLToPath(import.meta.url)),'..'),read=path=>readFileSync(resolve(root,path)),hash=bytes=>createHash('sha256').update(bytes).digest('hex'),cases=[];
const analysis=inspectControlTestSources({root}),originals=JSON.parse(gunzipSync(read('compatibility/rc/spec-control-test-source-subjects.json.gz')));assert.equal(analysis.complete_original_hunks,18);
const authenticate=subject=>subject.sha===CONTROL_SOURCE_SHAS[0]?reviewAddedControlSpec(subject):reviewCompleteSingleSpec(subject,CONTROL_SOURCE_SHAS);
for(const subject of originals.subjects){
 for(const [id,mutate]of [
  ['raw-commit',row=>{row.raw_commit+='\n';row.raw_commit_sha256=hash(row.raw_commit);}],
  ['rehashed-complete-source',row=>{const after=row.members[0].after;after.text+='\n';after.sha256=hash(after.text);after.bytes=Buffer.byteLength(after.text);}],
  ['missing-hunk',row=>{row.original_hunks--;}],
  ['rehashed-malformed-hunk',row=>{row.diff=row.diff.replace(/^@@ /m,'@@  ');row.diff_sha256=hash(row.diff);row.diff_bytes=Buffer.byteLength(row.diff);}],
  ['foreign-path',row=>{row.members[0].path='src/cdk/unreviewed.spec.ts';}],
 ]){const changed=structuredClone(subject);mutate(changed);assert.throws(()=>authenticate(changed));cases.push({id:subject.sha+'-'+id,result:'rejected'});}
}
for(const [id,mutate]of [
 ['invented-before-file',row=>{row.members[0].before.text='// invented original\n';row.members[0].before.sha256=hash(row.members[0].before.text);row.members[0].before.bytes=Buffer.byteLength(row.members[0].before.text);}],
 ['modified-status-for-added-file',row=>{row.complete_changed_files[0].status='M';}],
 ['extra-changed-file',row=>{row.complete_changed_files.push({...row.complete_changed_files[0],path:'src/material/table/hidden.ts'});}],
]){const changed=structuredClone(originals.subjects[0]);mutate(changed);assert.throws(()=>reviewAddedControlSpec(changed));cases.push({id:'added-file-'+id,result:'rejected'});}
for(const [index,needle,replacement]of [
 [0,"'001'","'123'"],
 [1,'    fixture.detectChanges();\n    const trigger = fixture.componentInstance.trigger;', '    const trigger = fixture.componentInstance.trigger;'],
 [2,'fixture.componentInstance.secondItemDisabled = true;','items[1].componentInstance.disabled = true;'],
 [3,'patchElementFocus(midItemAction);','void midItemAction;'],
]){const changed=structuredClone(originals.subjects[index]),text=changed.members[0].after.text;changed.members[0].after.text=text.replace(needle,replacement);assert.notEqual(changed.members[0].after.text,text);assert.throws(()=>analyzeControlSourceSemantics(changed));cases.push({id:changed.sha+'-false-patch-semantics',result:'rejected'});}
for(const path of [...Object.keys(CONTROL_SOURCE_CAPSULES[analysis.line]),'scripts/acquire-upstream-spec-originals.py']){
 const bytes=Buffer.concat([read(path),Buffer.from('\n')]);assert.throws(()=>inspectControlTestSources({root,readMember:name=>name===path?bytes:read(name)}));cases.push({id:'changed-original-capture-'+path,result:'rejected'});
}
for(const [path,needle,replacement]of [
 ['projects/ngx-material-legacy/legacy-table/table-data-source.spec.ts',"'001'","'002'"],
 ['projects/ngx-material-legacy/legacy-autocomplete/autocomplete.spec.ts','fixture.componentInstance.filteredStates = fixture.componentInstance.states = [];\n    fixture.detectChanges();','fixture.componentInstance.filteredStates = fixture.componentInstance.states = [];'],
 ['projects/ngx-material-legacy/legacy-menu/menu.spec.ts','items[1].componentInstance.disabled = true;','fixture.componentInstance.secondItemDisabled = true;'],
 ['testing/legacy-runner/init-test-env.ts','providers: [provideZoneChangeDetection()]','providers: [provideZoneChangeDetection(), provideCheckNoChangesConfig({exhaustive: true})]'],
 ['projects/ngx-material-legacy/legacy-chips/chip-list.spec.ts','expect(manager.activeItemIndex).toEqual(lastIndex - 1);','expect(manager.activeItemIndex).toEqual(lastIndex + 1);'],
 ['projects/ngx-material-legacy/legacy-chips/chip.ts','this._elementRef.nativeElement.focus();','void this._elementRef.nativeElement;'],
 ['projects/ngx-material-legacy/internal/testing/owned-animation-modules.ts',"from '@angular/core'","from '@angular/platform-browser/animations'"],
]){const before=read(path).toString(),changed=before.replace(needle,replacement);assert.notEqual(changed,before);assert.throws(()=>inspectControlTestSources({root,readMember:name=>name===path?Buffer.from(changed):read(name)}),undefined,path);cases.push({id:'changed-owned-coverage-'+cases.length,result:'rejected'});}
for(const floor of analysis.public_floor_source)for(const [member,needle,replacement]of [
 [floor.runtime,'const USE_EXHAUSTIVE_CHECK_NO_CHANGES_DEFAULT = false;','const USE_EXHAUSTIVE_CHECK_NO_CHANGES_DEFAULT = true;'],
 [floor.types,'declare const ANIMATION_MODULE_TYPE','/** @deprecated */\ndeclare const ANIMATION_MODULE_TYPE'],
]){const before=read(member.path).toString(),changed=before.replace(needle,replacement);assert.notEqual(changed,before);assert.throws(()=>inspectControlTestSources({root,readMember:name=>name===member.path?Buffer.from(changed):read(name)}));cases.push({id:'changed-exact-public-floor-source-'+floor.line+'-'+member.path,result:'rejected'});}
assert.throws(()=>reviewCompleteSingleSpec(originals.subjects[1],[]),/unregistered original subject/);cases.push({id:'empty-original-subject-registration',result:'rejected'});
const worksheet=JSON.parse(read('compatibility/rc/spec-control-test-source-worksheet.json')),tree=execFileSync('git',['--no-replace-objects','-c','gc.auto=0','-c','maintenance.auto=0','ls-tree','-rz',worksheet.current_source_parent,'--','projects/ngx-material-legacy'],{cwd:root,env:{...process.env,GIT_NO_LAZY_FETCH:'1'}}).toString().split('\0').filter(Boolean),paths=[];
for(const member of tree){const [metadata,path]=member.split('\t'),[mode,kind,blob]=metadata.split(' ');assert.equal(mode,'100644');assert.equal(kind,'blob');const bytes=read(path);assert.equal(createHash('sha1').update('blob '+bytes.length+'\0').update(bytes).digest('hex'),blob,'unreviewed product change '+path);paths.push(path);}
assert.equal(paths.length,1141);assert.deepEqual(candidateProductSourcePaths(root).sort(),paths.filter(path=>/\.(ts|scss|css|html)$/.test(path)).sort());assert.equal(cases.length,42);
const report={schema_version:1,line:analysis.line,complete_original_files:4,complete_original_hunks:18,controls:cases.length,cases,analysis,unchanged_product_members:1141,source_membership_exact:true,producer_sha256:hash(read('tests/spec_control_test_source_probe.mjs')),helper_sha256:hash(read('scripts/spec-control-test-source-review.mjs')),authenticator_sha256:hash(read('scripts/authenticated-single-spec-review.mjs')),actual_new_Angular_cases_executed:false,actual_Angular_browser_native_packed_or_floor_qualified:false,g11_claim:'not-passed'};
const out=process.argv.indexOf('--out');if(out>=0)writeFileSync(process.argv[out+1],JSON.stringify(report,null,2)+'\n',{flag:'wx'});console.log(JSON.stringify({...report,cases:undefined,analysis:undefined}));
