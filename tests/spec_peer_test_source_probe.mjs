/**
 * @license
 * Copyright Google LLC All Rights Reserved.
 * Copyright (c) 2026 Ryan Lester.
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.io/license
 */
/** Reject false source provenance and observation equivalence without running upstream code. */
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {execFileSync} from 'node:child_process';
import {readFileSync,writeFileSync} from 'node:fs';
import {gunzipSync} from 'node:zlib';
import {dirname,resolve} from 'node:path';
import {fileURLToPath} from 'node:url';
import {reviewCompleteSingleSpec} from '../scripts/authenticated-single-spec-review.mjs';
import {candidateProductSourcePaths} from '../scripts/upstream-candidate-source-evidence.mjs';
import {PEER_TEST_SHAS,PEER_TEST_CAPSULES,analyzePeerTestSemantics,inspectPeerTestSources} from '../scripts/spec-peer-test-source-review.mjs';
const root=resolve(dirname(fileURLToPath(import.meta.url)),'..'),read=path=>readFileSync(resolve(root,path)),hash=bytes=>createHash('sha256').update(bytes).digest('hex'),cases=[];
const analysis=inspectPeerTestSources({root}),originals=JSON.parse(gunzipSync(read('compatibility/rc/spec-peer-test-source-subjects.json.gz')));assert.equal(analysis.complete_original_hunks,22);
for(const subject of originals.subjects){
 for(const [id,mutate] of [
  ['raw-commit',row=>{row.raw_commit+='\n';row.raw_commit_sha256=hash(row.raw_commit);}],
  ['rehashed-complete-source',row=>{const value=row.members[0].after;value.text+='\n';value.sha256=hash(value.text);value.bytes=Buffer.byteLength(value.text);}],
  ['missing-hunk',row=>{row.original_hunks--;}],
  ['rehashed-malformed-hunk',row=>{row.diff=row.diff.replace(/^@@ /m,'@@  ');row.diff_sha256=hash(row.diff);row.diff_bytes=Buffer.byteLength(row.diff);}],
  ['foreign-path',row=>{row.members[0].path='src/cdk/unreviewed.spec.ts';}],
 ]){const changed=structuredClone(subject);mutate(changed);assert.throws(()=>reviewCompleteSingleSpec(changed,PEER_TEST_SHAS));cases.push({id:subject.sha+'-'+id,result:'rejected'});}
}
const semanticChanges=[
 row=>{row.members[0].after.text=row.members[0].after.text.replace("toHaveBeenCalledWith('keydown', jasmine.any(Function), undefined)","toHaveBeenCalledWith('keydown', jasmine.any(Function), true)");},
 row=>{row.members[0].after.text=row.members[0].after.text.replace('expect(renders).toEqual(0);','expect(renders).toEqual(1);');},
 row=>{row.members[0].after.text=row.members[0].after.text.replace("spyOn(testComponent.virtualForOf.viewChange, 'next')","spyOn(appRef, 'tick')");},
 row=>{row.members[0].after.text+='\nit(\'should throw an error when trying to load a remote icon\', () => {});\n';},
];
for(const [index,mutate]of semanticChanges.entries()){const changed=structuredClone(originals.subjects[index]);mutate(changed);assert.notDeepEqual(changed,originals.subjects[index]);assert.throws(()=>analyzePeerTestSemantics(changed));cases.push({id:changed.sha+'-false-observation-semantics',result:'rejected'});}
for(const path of [...Object.keys(PEER_TEST_CAPSULES[analysis.line]),'scripts/acquire-upstream-spec-originals.py']){
 const changed=Buffer.concat([read(path),Buffer.from('\n')]);assert.throws(()=>inspectPeerTestSources({root,readMember:name=>name===path?changed:read(name)}));cases.push({id:'changed-acquisition-subject-'+path,result:'rejected'});
}
for(const [path,needle,replacement]of [
 ['projects/ngx-material-legacy/legacy-autocomplete/internal/autocomplete-trigger-base.ts','overlayRef.keydownEvents().subscribe(this._handlePanelKeydown)','overlayRef.internalKeydown().subscribe(this._handlePanelKeydown)'],
 ['projects/ngx-material-legacy/legacy-tooltip/internal/tooltip-base.ts','.outsidePointerEvents()','.internalOutsideEvents()'],
 ['projects/ngx-material-legacy/legacy-table/table.spec.ts','By.directive(CdkVirtualScrollViewport)','By.directive(PrivateViewport)'],
 ['projects/ngx-material-legacy/legacy-chips/testing/chip-list-harness.spec.ts',"from '@angular/material/icon'","from '@angular/material/icon/private'"],
 ['projects/ngx-material-legacy/legacy-form-field/internal/after-form-field-render.ts','import {afterEveryRender,','import {afterRender,'],
 ['projects/ngx-material-legacy/legacy-form-field/internal/after-form-field-render.ts','rendered?.destroy();','void rendered;'],
 ['projects/ngx-material-legacy/legacy-form-field/internal/after-form-field-render.ts','export function afterFormFieldRender','class MatIcon {}\nexport function afterFormFieldRender'],
]){const before=read(path).toString(),changed=before.replace(needle,replacement);assert.notEqual(changed,before,'missing owned mutation anchor '+needle);assert.throws(()=>inspectPeerTestSources({root,readMember:name=>name===path?Buffer.from(changed):read(name)}));cases.push({id:'changed-owned-public-boundary-'+cases.length,result:'rejected'});}
assert.throws(()=>reviewCompleteSingleSpec(originals.subjects[0],[]),/unregistered original subject/);cases.push({id:'empty-original-subject-registration',result:'rejected'});
const worksheet=JSON.parse(read('compatibility/rc/spec-peer-test-source-worksheet.json')),tree=execFileSync('git',['-c','gc.auto=0','-c','maintenance.auto=0','ls-tree','-rz',worksheet.source_parent,'--','projects/ngx-material-legacy'],{cwd:root}).toString().split('\0').filter(Boolean),paths=[];
for(const member of tree){const [metadata,path]=member.split('\t'),[mode,kind,blob]=metadata.split(' ');assert.equal(mode,'100644');assert.equal(kind,'blob');const bytes=read(path);assert.equal(createHash('sha1').update('blob '+bytes.length+'\0').update(bytes).digest('hex'),blob,'unreviewed product change '+path);paths.push(path);}
assert.equal(tree.length,1141);assert.deepEqual(candidateProductSourcePaths(root).sort(),paths.filter(path=>/\.(ts|scss|css|html)$/.test(path)).sort());
const report={schema_version:1,line:analysis.line,complete_original_files:4,complete_original_hunks:22,controls:cases.length,cases,analysis,unchanged_product_members:1141,source_membership_exact:true,producer_sha256:hash(read('tests/spec_peer_test_source_probe.mjs')),helper_sha256:hash(read('scripts/spec-peer-test-source-review.mjs')),authenticator_sha256:hash(read('scripts/authenticated-single-spec-review.mjs')),actual_Angular_browser_native_packed_or_floor_qualified:false,g11_claim:'not-passed'};
const out=process.argv.indexOf('--out');if(out>=0)writeFileSync(process.argv[out+1],JSON.stringify(report,null,2)+'\n',{flag:'wx'});console.log(JSON.stringify({...report,cases:undefined,analysis:undefined}));
