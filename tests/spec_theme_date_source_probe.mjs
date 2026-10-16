/**
 * @license
 * Copyright Google LLC All Rights Reserved.
 * Copyright (c) 2026 Ryan Lester.
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.io/license
 */
/** Full original membership, semantic normalization and retained M2/harness boundary controls. */
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {execFileSync} from 'node:child_process';
import {readFileSync,writeFileSync} from 'node:fs';
import {gunzipSync} from 'node:zlib';
import {dirname,resolve} from 'node:path';
import {fileURLToPath} from 'node:url';
import {candidateProductSourcePaths} from '../scripts/upstream-candidate-source-evidence.mjs';
import {THEME_DATE_CAPSULES,authenticateThemeDatePatch,analyzeThemeDateSemantics,inspectThemeDateSources} from '../scripts/spec-theme-date-source-review.mjs';
const root=resolve(dirname(fileURLToPath(import.meta.url)),'..'),read=path=>readFileSync(resolve(root,path)),hash=bytes=>createHash('sha256').update(bytes).digest('hex'),cases=[];
const analysis=inspectThemeDateSources({root}),originals=JSON.parse(gunzipSync(read('compatibility/rc/spec-theme-date-source-subjects.json.gz')));assert.equal(analysis.complete_original_hunks,94);
for(const subject of originals.subjects)for(const [id,mutate]of [
 ['raw-commit',row=>{row.raw_commit+='\n';row.raw_commit_sha256=hash(row.raw_commit);}],
 ['rehashed-original-after-body',row=>{const raw=row.members[0].after;raw.text+='\n';raw.sha256=hash(raw.text);raw.bytes=Buffer.byteLength(raw.text);}],
 ['missing-hunk',row=>{row.original_hunks--;}],
 ['rehashed-malformed-hunk',row=>{row.diff=row.diff.replace(/^@@ /m,'@@  ');row.diff_sha256=hash(row.diff);row.diff_bytes=Buffer.byteLength(row.diff);}],
 ['foreign-path',row=>{row.members[0].path='src/cdk/unreviewed.spec.ts';}],
]){const changed=structuredClone(subject);mutate(changed);assert.throws(()=>authenticateThemeDatePatch(changed));cases.push({id:subject.sha+'-'+id,result:'rejected'});}
for(const subject of originals.subjects.filter(row=>row.members.length>1))for(const [id,mutate]of [
 ['omitted-complete-file',row=>{row.complete_changed_files.pop();}],
 ['omitted-full-body',row=>{row.members.pop();}],
 ['reordered-population',row=>{row.members.reverse();row.complete_changed_files.reverse();}],
]){const changed=structuredClone(subject);mutate(changed);assert.throws(()=>authenticateThemeDatePatch(changed));cases.push({id:subject.sha+'-'+id,result:'rejected'});}
for(const [id,mutate]of [
 ['invented-before-file',row=>{row.members[0].before.text='// invented original\n';row.members[0].before.sha256=hash(row.members[0].before.text);row.members[0].before.bytes=Buffer.byteLength(row.members[0].before.text);}],
 ['modified-status-for-added-file',row=>{row.complete_changed_files[0].status='M';}],
 ['hidden-production-file',row=>{row.complete_changed_files.push({...row.complete_changed_files[0],path:'src/material/core/hidden.ts'});}],
]){const changed=structuredClone(originals.subjects[0]);mutate(changed);assert.throws(()=>authenticateThemeDatePatch(changed));cases.push({id:'added-M3-'+id,result:'rejected'});}
for(const [index,needle,replacement]of [
 [0,"startsWith('--')","startsWith('')"],
 [1,'...bDate, 13, 0, 0','...bDate, 14, 0, 0'],
 [2,'expect(','unreviewedExpectation('],
 [3,'animationsDisabled: true','animationsDisabled: false'],
]){const changed=structuredClone(originals.subjects[index]),before=changed.members[0].after.text;changed.members[0].after.text=before.replace(needle,replacement);assert.notEqual(changed.members[0].after.text,before);assert.throws(()=>analyzeThemeDateSemantics(changed));cases.push({id:changed.sha+'-false-test-semantics',result:'rejected'});}
for(const [id,path,needle,replacement]of [
 ['unexpected-factory-argument',originals.subjects[3].members[0].path,'provideNativeDateAdapter()','provideNativeDateAdapter(unreviewedFormats)'],
 ['changed-locale-override','src/material/datepicker/datepicker.spec.ts',"useValue: 'de-DE'","useValue: 'fr-FR'"],
 ['changed-provider-import',originals.subjects[3].members[0].path,'provideNativeDateAdapter','unreviewedNativeDateProvider'],
]){const changed=structuredClone(originals.subjects[3]),member=changed.members.find(row=>row.path===path),before=member.after.text;member.after.text=before.replace(needle,replacement);assert.notEqual(member.after.text,before);assert.throws(()=>analyzeThemeDateSemantics(changed));cases.push({id:'provider-normalization-'+id,result:'rejected'});}
{
 const changed=structuredClone(originals.subjects[2]),member=changed.members[0],before=member.after.text;member.after.text=before.replace('imports: [\n    MatDateRangeInput,','imports: [\n    UnreviewedDateRangeInput,');assert.notEqual(member.after.text,before);assert.throws(()=>analyzeThemeDateSemantics(changed));cases.push({id:'standalone-metadata-scope-is-not-unchecked',result:'rejected'});
}
for(const path of [...Object.keys(THEME_DATE_CAPSULES[analysis.line]),'scripts/acquire-upstream-spec-originals.py']){
 const bytes=Buffer.concat([read(path),Buffer.from('\n')]);assert.throws(()=>inspectThemeDateSources({root,readMember:name=>name===path?bytes:read(name)}));cases.push({id:'changed-original-capture-'+path,result:'rejected'});
}
for(const path of ['compatibility/rc/material-public-subjects.json',...analysis.exact_public_peers.flatMap(row=>[row.types.path,row.runtime.path])]){
 const bytes=Buffer.concat([read(path),Buffer.from('\n')]);assert.throws(()=>inspectThemeDateSources({root,readMember:name=>name===path?bytes:read(name)}));cases.push({id:'changed-exact-public-peer-source-'+path,result:'rejected'});
}
for(const [path,needle,replacement]of [
 ['projects/ngx-material-legacy/_index.scss',"@forward './styles/core/theming/theming' show","@forward '@angular/material' show"],
 ['projects/ngx-material-legacy/styles/core/theming/_theming.scss','@function define-palette(','@function replaced-palette('],
 ['projects/ngx-material-legacy/styles/legacy-button/_button-theme.scss','background-color: theming.get-color-from-palette($primary)','unreviewed-property: theming.get-color-from-palette($primary)'],
 ['scripts/m3-rendered-coexistence.mjs',"'current-then-legacy'","'unreviewed-order'"],
 ['projects/ngx-material-legacy/legacy-form-field/testing/form-field-harness.spec.ts',"import {MatNativeDateModule} from '@angular/material/core'","import {OtherDateModule} from '@angular/material/core'"],
 ['testing/legacy-runner/shims/harness/form-field/shared.spec.ts','declarations: [FormFieldHarnessTest]','declarations: []'],
 ['testing/legacy-runner/shims/harness/form-field/shared.spec.ts','[matDatepicker]="datepicker"','[unreviewedDatepicker]="datepicker"'],
 ['projects/ngx-material-legacy/legacy-form-field/testing/form-field-harness.spec.ts',"describe('Non-MDC-based MatFormFieldHarness'","class NativeDateAdapter {}\n\ndescribe('Non-MDC-based MatFormFieldHarness'"],
]){const before=read(path).toString(),changed=before.replace(needle,replacement);assert.notEqual(changed,before,path);assert.throws(()=>inspectThemeDateSources({root,readMember:name=>name===path?Buffer.from(changed):read(name)}),undefined,path);cases.push({id:'changed-owned-M2-or-fixture-contract-'+cases.length,result:'rejected'});}
assert.throws(()=>authenticateThemeDatePatch({...originals.subjects[0],sha:'0'.repeat(40)}),/unregistered/);cases.push({id:'unregistered-original',result:'rejected'});
const worksheet=JSON.parse(read('compatibility/rc/spec-theme-date-source-worksheet.json')),tree=execFileSync('git',['--no-replace-objects','-c','gc.auto=0','-c','maintenance.auto=0','ls-tree','-rz',worksheet.source_parent,'--','projects/ngx-material-legacy'],{cwd:root,env:{...process.env,GIT_NO_LAZY_FETCH:'1'}}).toString().split('\0').filter(Boolean),paths=[];
for(const member of tree){const [metadata,path]=member.split('\t'),[mode,kind,blob]=metadata.split(' ');assert.equal(mode,'100644');assert.equal(kind,'blob');const bytes=read(path);assert.equal(createHash('sha1').update('blob '+bytes.length+'\0').update(bytes).digest('hex'),blob,'unreviewed product change '+path);paths.push(path);}
assert.equal(paths.length,1141);assert.deepEqual(candidateProductSourcePaths(root).sort(),paths.filter(path=>/\.(ts|scss|css|html)$/.test(path)).sort());assert.equal(cases.length,57);
const report={schema_version:1,line:analysis.line,complete_original_files:22,complete_original_hunks:94,controls:cases.length,cases,analysis,unchanged_product_members:1141,source_membership_exact:true,producer_sha256:hash(read('tests/spec_theme_date_source_probe.mjs')),helper_sha256:hash(read('scripts/spec-theme-date-source-review.mjs')),authenticator_sha256:hash(read('scripts/authenticated-single-spec-review.mjs')),actual_Angular_Sass_browser_native_packed_or_floor_qualified:false,g11_claim:'not-passed'};
const out=process.argv.indexOf('--out');if(out>=0)writeFileSync(process.argv[out+1],JSON.stringify(report,null,2)+'\n',{flag:'wx'});console.log(JSON.stringify({...report,cases:undefined,analysis:undefined}));
