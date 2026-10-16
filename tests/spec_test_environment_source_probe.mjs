/**
 * @license
 * Copyright Google LLC All Rights Reserved.
 * Copyright (c) 2026 Ryan Lester.
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.io/license
 */
/** Complete original authentication and strict boundaries for only the two zone source decisions. */
import assert from 'node:assert/strict';import {createHash} from 'node:crypto';import {execFileSync} from 'node:child_process';import {readFileSync,writeFileSync} from 'node:fs';import {gunzipSync} from 'node:zlib';import {dirname,resolve} from 'node:path';import {fileURLToPath} from 'node:url';
import {candidateProductSourcePaths} from '../scripts/upstream-candidate-source-evidence.mjs';
import {ENV_SHAS,ENV_CAPSULES,authenticateTestEnvironmentPatch,originalEnvironmentCases,reviewZoneException,analyzeZoneEnvironment,inspectTestEnvironmentSources} from '../scripts/spec-test-environment-source-review.mjs';
const root=resolve(dirname(fileURLToPath(import.meta.url)),'..'),read=path=>readFileSync(resolve(root,path)),hash=bytes=>createHash('sha256').update(bytes).digest('hex'),cases=[];
const analysis=inspectTestEnvironmentSources({root}),originals=JSON.parse(gunzipSync(read('compatibility/rc/spec-test-environment-source-subjects.json.gz')));assert.equal(analysis.complete_original_hunks,1347);
for(const subject of originals.subjects)for(const [id,mutate]of [
 ['raw-commit',row=>{row.raw_commit+='\n';row.raw_commit_sha256=hash(row.raw_commit);}],
 ['rehashed-after-source',row=>{const raw=row.members[0].after;raw.text+='\n';raw.sha256=hash(raw.text);raw.bytes=Buffer.byteLength(raw.text);}],
 ['missing-hunk',row=>{row.original_hunks--;}],
 ['rehashed-malformed-hunk',row=>{row.diff=row.diff.replace(/^@@ /m,'@@  ');row.diff_sha256=hash(row.diff);row.diff_bytes=Buffer.byteLength(row.diff);}],
 ['foreign-path',row=>{row.members[0].path='src/cdk/unreviewed.spec.ts';}],
]){const changed=structuredClone(subject);mutate(changed);assert.throws(()=>authenticateTestEnvironmentPatch(changed));cases.push({id:subject.sha+'-'+id,result:'rejected'});}
for(const subject of originals.subjects)for(const [id,mutate]of [
 ['omitted-complete-file',row=>{row.complete_changed_files.pop();}],
 ['omitted-full-body',row=>{row.members.pop();}],
 ['reordered-file-population',row=>{row.members.reverse();row.complete_changed_files.reverse();}],
]){const changed=structuredClone(subject);mutate(changed);assert.throws(()=>authenticateTestEnvironmentPatch(changed));cases.push({id:subject.sha+'-'+id,result:'rejected'});}
for(const subject of originals.subjects)for(const [offset,identity]of subject.complete_changed_files.entries())if(identity.status==='A')for(const [id,mutate]of [
 ['invented-before-file',row=>{row.members[offset].before.text='// invented\n';row.members[offset].before.sha256=hash(row.members[offset].before.text);row.members[offset].before.bytes=Buffer.byteLength(row.members[offset].before.text);}],
 ['modified-before-mode',row=>{row.complete_changed_files[offset].before_mode='100644';}],
]){const changed=structuredClone(subject);mutate(changed);assert.throws(()=>authenticateTestEnvironmentPatch(changed));cases.push({id:subject.sha+'-'+identity.path+'-'+id,result:'rejected'});}
for(const subject of originals.subjects.slice(0,2))for(const [id,mutate]of [
 ['focused-test-mode',row=>{row.members[0].after.text=row.members[0].after.text.replace("it('","fit('");}],
 ['changed-normalized-assertion',row=>{row.members[0].after.text=row.members[0].after.text.replace('.toBe(','.not.toBe(');}],
 ['unreviewed-global-function',row=>{row.members[0].after.text+='\nfunction unreviewedGlobalOperation() { return true; }\n';}],
]){const changed=structuredClone(subject);mutate(changed);assert.notDeepEqual(changed,subject);assert.throws(()=>analyzeZoneEnvironment(changed));cases.push({id:subject.sha+'-'+id,result:'rejected'});}
for(const subject of originals.subjects.slice(0,2)){
 const before=originalEnvironmentCases(subject,'before'),after=originalEnvironmentCases(subject,'after');
 for(const row of analyzeZoneEnvironment(subject).individual_observation_or_scheduling_changes){const old=before.find(n=>n.sha256===row.before_sha256),next=after.find(n=>n.sha256===row.after_sha256),changed={...next,raw:next.raw+'\n'};changed.sha256=hash(changed.raw);assert.throws(()=>reviewZoneException(old,changed));cases.push({id:'rehashed-individual-observation-'+row.path+'-'+row.suites.join('/')+'-'+row.name,result:'rejected'});}
 const changed=structuredClone(subject),zone=changed.members.find(n=>n.path.endsWith('.zone.spec.ts'));zone.after.text+='\n'+after.find(n=>n.path===zone.path).raw+';\n';assert.throws(()=>analyzeZoneEnvironment(changed));cases.push({id:subject.sha+'-duplicate-or-extra-zone-case',result:'rejected'});
}
{
 const subject=originals.subjects[1],changed=structuredClone(subject),casesAfter=originalEnvironmentCases(subject,'after'),row=casesAfter.find(n=>n.name==="'should set content offset to bottom of content'"&&n.suites.includes("'with append only'")),member=changed.members.find(n=>n.path===row.path);assert.ok(row.raw.includes('.toBe(0)'));member.after.text=member.after.text.replace(row.raw,row.raw.replace('.toBe(0)','.toBe(10)'));assert.throws(()=>analyzeZoneEnvironment(changed));cases.push({id:'same-name-different-suite-offset-is-not-merged',result:'rejected'});
}
for(const [index,path,needle,replacement,id,side='after']of [
 [1,'src/cdk/scrolling/virtual-scroll-viewport.spec.ts','tick(16); // flush animation frame','tick(17); // flush animation frame','unreviewed-animation-frame-duration'],
 [0,'src/cdk/drag-drop/directives/test-utils.spec.ts','element: Element,','element: HTMLElement,','changed-extracted-helper-parameter'],
 [0,'src/cdk/drag-drop/directives/test-utils.spec.ts','flush();','unreviewedFlush();','changed-extracted-helper-operation'],
 [1,'src/cdk/scrolling/scrollable.spec.ts','{provide: NgZone, useFactory: () => new NgZone({})}','{provide: NgZone, useFactory: () => new NgZone({}), unreviewed: true}','foreign-provider-option-is-not-normalized-away','before'],
]){const changed=structuredClone(originals.subjects[index]),member=changed.members.find(n=>n.path===path),text=member[side].text;member[side].text=text.replace(needle,replacement);assert.notEqual(member[side].text,text,needle);assert.throws(()=>analyzeZoneEnvironment(changed));cases.push({id,result:'rejected'});}
for(const path of [...Object.keys(ENV_CAPSULES[analysis.line]),'scripts/acquire-upstream-spec-originals.py']){
 const bytes=Buffer.concat([read(path),Buffer.from('\n')]);assert.throws(()=>inspectTestEnvironmentSources({root,readMember:name=>name===path?bytes:read(name)}));cases.push({id:'changed-original-capture-'+path,result:'rejected'});
}
for(const [path,needle,replacement]of [
 ['testing/legacy-runner/init-test-env.ts','providers: [provideZoneChangeDetection()]','providers: []'],
 ['scripts/browser-required-cells.mjs','provideZonelessChangeDetection','unreviewedZonelessProvider'],
 ['projects/ngx-material-legacy/legacy-menu/internal/menu-item-base.ts','this._focusMonitor.monitor(this._elementRef, false)','this._focusMonitor.internalMonitor(this._elementRef, false)'],
 ['projects/ngx-material-legacy/legacy-table/table.spec.ts','By.directive(CdkVirtualScrollViewport)','By.directive(PrivateViewport)'],
 ['projects/ngx-material-legacy/legacy-menu/internal/menu-item-base.ts','export class _LegacyMenuItemBase','class CdkPortalOutlet {}\nexport class _LegacyMenuItemBase'],
]){const before=read(path).toString(),changed=before.replaceAll(needle,replacement);assert.notEqual(changed,before,path);assert.throws(()=>inspectTestEnvironmentSources({root,readMember:name=>name===path?Buffer.from(changed):read(name)}),undefined,path);cases.push({id:'changed-owned-environment-boundary-'+cases.length,result:'rejected'});}
assert.throws(()=>authenticateTestEnvironmentPatch({...originals.subjects[0],sha:'0'.repeat(40)}),/unregistered/);cases.push({id:'unregistered-source-original',result:'rejected'});
assert.throws(()=>analyzeZoneEnvironment(originals.subjects[2]),/standalone source phase remains pending/);cases.push({id:'standalone-census-is-not-zone-source-admission',result:'rejected'});
const worksheet=JSON.parse(read('compatibility/rc/spec-test-environment-source-worksheet.json')),tree=execFileSync('git',['--no-replace-objects','-c','gc.auto=0','-c','maintenance.auto=0','ls-tree','-rz',worksheet.source_parent,'--','projects/ngx-material-legacy'],{cwd:root,env:{...process.env,GIT_NO_LAZY_FETCH:'1'}}).toString().split('\0').filter(Boolean),paths=[];
for(const member of tree){const [metadata,path]=member.split('\t'),[mode,kind,blob]=metadata.split(' ');assert.equal(mode,'100644');assert.equal(kind,'blob');const bytes=read(path);assert.equal(createHash('sha1').update('blob '+bytes.length+'\0').update(bytes).digest('hex'),blob,'unreviewed product change '+path);paths.push(path);}
assert.equal(paths.length,1141);assert.deepEqual(candidateProductSourcePaths(root).sort(),paths.filter(path=>/\.(ts|scss|css|html)$/.test(path)).sort());assert.equal(cases.length,73);
const report={schema_version:1,line:analysis.line,all_four_originals_authenticated:true,complete_original_files:36,complete_original_hunks:1347,qualified_zone_source_decisions:2,qualified_zone_hunks:672,zone_static_it_occurrences:645,zone_moves_preserved:6,individual_case_changes_reviewed:6,global_programs_checked:13,extracted_helpers_checked:12,scheduler_helpers_reviewed:2,standalone_decisions_pending:2,standalone_hunks_pending:675,controls:cases.length,cases,analysis,unchanged_product_members:1141,source_membership_exact:true,producer_sha256:hash(read('tests/spec_test_environment_source_probe.mjs')),helper_sha256:hash(read('scripts/spec-test-environment-source-review.mjs')),authenticator_sha256:hash(read('scripts/authenticated-single-spec-review.mjs')),actual_Angular_browser_native_packed_or_floor_qualified:false,g11_claim:'not-passed'};
const out=process.argv.indexOf('--out');if(out>=0)writeFileSync(process.argv[out+1],JSON.stringify(report,null,2)+'\n',{flag:'wx'});console.log(JSON.stringify({...report,cases:undefined,analysis:undefined}));
