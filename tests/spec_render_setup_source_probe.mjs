/**
 * @license
 * Copyright Google LLC All Rights Reserved.
 * Copyright (c) 2026 Ryan Lester.
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.io/license
 */
/** Reject incomplete multi-file patches, weakened observations and unproven peer assumptions. */
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {execFileSync} from 'node:child_process';
import {readFileSync,writeFileSync} from 'node:fs';
import {gunzipSync} from 'node:zlib';
import {dirname,resolve} from 'node:path';
import {fileURLToPath} from 'node:url';
import {candidateProductSourcePaths} from '../scripts/upstream-candidate-source-evidence.mjs';
import {RENDER_SETUP_CAPSULES,authenticateRenderSetupPatch,analyzeRenderSetupSemantics,inspectRenderSetupSources} from '../scripts/spec-render-setup-source-review.mjs';
const root=resolve(dirname(fileURLToPath(import.meta.url)),'..'),read=path=>readFileSync(resolve(root,path)),hash=bytes=>createHash('sha256').update(bytes).digest('hex'),cases=[];
const analysis=inspectRenderSetupSources({root}),originals=JSON.parse(gunzipSync(read('compatibility/rc/spec-render-setup-source-subjects.json.gz')));assert.equal(analysis.complete_original_hunks,19);
for(const subject of originals.subjects)for(const [id,mutate]of [
 ['raw-commit',row=>{row.raw_commit+='\n';row.raw_commit_sha256=hash(row.raw_commit);}],
 ['rehashed-original-after-body',row=>{const raw=row.members[0].after;raw.text+='\n';raw.sha256=hash(raw.text);raw.bytes=Buffer.byteLength(raw.text);}],
 ['missing-hunk',row=>{row.original_hunks--;}],
 ['rehashed-malformed-hunk',row=>{row.diff=row.diff.replace(/^@@ /m,'@@  ');row.diff_sha256=hash(row.diff);row.diff_bytes=Buffer.byteLength(row.diff);}],
 ['foreign-path',row=>{row.members[0].path='src/cdk/unreviewed.spec.ts';}],
]){const changed=structuredClone(subject);mutate(changed);assert.throws(()=>authenticateRenderSetupPatch(changed));cases.push({id:subject.sha+'-'+id,result:'rejected'});}
for(const subject of originals.subjects.filter(row=>row.members.length>1))for(const [id,mutate]of [
 ['omitted-complete-file',row=>{row.complete_changed_files.pop();}],
 ['omitted-full-body',row=>{row.members.pop();}],
 ['reordered-member-population',row=>{row.members.reverse();row.complete_changed_files.reverse();}],
]){const changed=structuredClone(subject);mutate(changed);assert.throws(()=>authenticateRenderSetupPatch(changed));cases.push({id:subject.sha+'-'+id,result:'rejected'});}
for(const [index,member,needle,replacement]of [
 [0,0,"spyOn(fixture.componentInstance.itemInstances.first, '_hasFocus').and.callFake(() => true);",'void fixture.componentInstance;'],
 [1,1,"return fixture.nativeElement.querySelector('.cdk-overlay-popover');","return fixture.nativeElement.querySelector('.cdk-overlay-connected-position-bounding-box');"],
 [2,0,'createNgModule(','createNgModuleRef('],
 [3,0,'class NativeHtmlTableAppOnPush','class OtherTableFixture'],
]){const changed=structuredClone(originals.subjects[index]),before=changed.members[member].after.text;changed.members[member].after.text=before.replace(needle,replacement);assert.notEqual(changed.members[member].after.text,before);assert.throws(()=>analyzeRenderSetupSemantics(changed));cases.push({id:changed.sha+'-false-full-file-semantics',result:'rejected'});}
for(const path of [...Object.keys(RENDER_SETUP_CAPSULES[analysis.line]),'scripts/acquire-upstream-spec-originals.py']){
 const bytes=Buffer.concat([read(path),Buffer.from('\n')]);assert.throws(()=>inspectRenderSetupSources({root,readMember:name=>name===path?bytes:read(name)}));cases.push({id:'changed-original-capture-'+path,result:'rejected'});
}
for(const [path,needle,replacement,all=false]of [
 ['projects/ngx-material-legacy/legacy-menu/menu.spec.ts',"expect(document.activeElement)\n      .withContext('opening the menu should focus the first item')", "expect(items[0])\n      .withContext('opening the menu should focus the first item')"],
 ['projects/ngx-material-legacy/legacy-menu/internal/menu-item-base.ts','this._document.activeElement === this._getHostElement()','true'],
 ['projects/ngx-material-legacy/legacy-autocomplete/autocomplete.spec.ts','overlayContainerElement.querySelector(','unrelatedElement.querySelector(',true],
 ['projects/ngx-material-legacy/legacy-select/select.spec.ts','overlayContainerElement.querySelector(','unrelatedElement.querySelector(',true],
 ['projects/ngx-material-legacy/legacy-dialog/dialog.spec.ts','const ngModuleRef = createNgModule(','const ngModuleRef = createNgModuleRef('],
 ['projects/ngx-material-legacy/legacy-dialog/dialog.spec.ts','/* parentInjector */ this._injector,','/* parentInjector */ undefined,'],
 ['projects/ngx-material-legacy/legacy-table/table.spec.ts','class NativeHtmlTableApp {','class OtherNativeTable {'],
 ['projects/ngx-material-legacy/legacy-menu/menu-item.ts',"from '@angular/core';","from '@angular/core';\nimport {createNgModuleRef} from '@angular/core';"],
]){const before=read(path).toString(),changed=all?before.replaceAll(needle,replacement):before.replace(needle,replacement);assert.notEqual(changed,before,path);assert.throws(()=>inspectRenderSetupSources({root,readMember:name=>name===path?Buffer.from(changed):read(name)}),undefined,path);cases.push({id:'changed-owned-observation-'+cases.length,result:'rejected'});}
for(const floor of analysis.exact_peer_sources)for(const member of [floor.core_types,floor.overlay_runtime]){
 const changed=Buffer.concat([read(member.path),Buffer.from('\n')]);assert.throws(()=>inspectRenderSetupSources({root,readMember:name=>name===member.path?changed:read(name)}));cases.push({id:'changed-authenticated-floor-source-'+member.path,result:'rejected'});
}
for(const path of ['compatibility/rc/material-public-subjects.json','compatibility/rc/autocomplete-landscape-cdk-sources/identities.json']){
 const changed=Buffer.concat([read(path),Buffer.from(' ')]);assert.throws(()=>inspectRenderSetupSources({root,readMember:name=>name===path?changed:read(name)}));cases.push({id:'changed-peer-descriptor-'+path,result:'rejected'});
}
assert.throws(()=>authenticateRenderSetupPatch({...originals.subjects[0],sha:'0'.repeat(40)}),/unregistered/);cases.push({id:'unregistered-original',result:'rejected'});
const worksheet=JSON.parse(read('compatibility/rc/spec-render-setup-source-worksheet.json')),tree=execFileSync('git',['--no-replace-objects','-c','gc.auto=0','-c','maintenance.auto=0','ls-tree','-rz',worksheet.source_parent,'--','projects/ngx-material-legacy'],{cwd:root,env:{...process.env,GIT_NO_LAZY_FETCH:'1'}}).toString().split('\0').filter(Boolean),paths=[];
for(const member of tree){const [metadata,path]=member.split('\t'),[mode,kind,blob]=metadata.split(' ');assert.equal(mode,'100644');assert.equal(kind,'blob');const bytes=read(path);assert.equal(createHash('sha1').update('blob '+bytes.length+'\0').update(bytes).digest('hex'),blob,'unreviewed product change '+path);paths.push(path);}
assert.equal(paths.length,1141);assert.deepEqual(candidateProductSourcePaths(root).sort(),paths.filter(path=>/\.(ts|scss|css|html)$/.test(path)).sort());assert.equal(cases.length,48);
const report={schema_version:1,line:analysis.line,complete_original_files:7,complete_original_hunks:19,controls:cases.length,cases,analysis,unchanged_product_members:1141,source_membership_exact:true,producer_sha256:hash(read('tests/spec_render_setup_source_probe.mjs')),helper_sha256:hash(read('scripts/spec-render-setup-source-review.mjs')),authenticator_sha256:hash(read('scripts/authenticated-single-spec-review.mjs')),actual_Angular_browser_native_packed_or_floor_qualified:false,g11_claim:'not-passed'};
const out=process.argv.indexOf('--out');if(out>=0)writeFileSync(process.argv[out+1],JSON.stringify(report,null,2)+'\n',{flag:'wx'});console.log(JSON.stringify({...report,cases:undefined,analysis:undefined}));
