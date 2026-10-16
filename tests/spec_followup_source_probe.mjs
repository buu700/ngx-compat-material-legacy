/**
 * @license
 * Copyright Google LLC All Rights Reserved.
 * Copyright (c) 2026 Ryan Lester.
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.io/license
 */
/** Mutated provenance, false semantic classifications and weakened current regressions fail. */
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {execFileSync} from 'node:child_process';
import {readFileSync,writeFileSync} from 'node:fs';
import {gunzipSync} from 'node:zlib';
import {dirname,resolve} from 'node:path';
import {fileURLToPath} from 'node:url';
import {FOLLOWUP_CAPSULES,FOLLOWUP_TAGGED_SOURCES,reviewFollowupOriginal,analyzeFollowupSemantics,inspectSpecFollowup} from '../scripts/spec-followup-source-review.mjs';
const root=resolve(dirname(fileURLToPath(import.meta.url)),'..'),read=path=>readFileSync(resolve(root,path)),hash=bytes=>createHash('sha256').update(bytes).digest('hex'),cases=[];
const analysis=inspectSpecFollowup({root});assert.equal(analysis.complete_original_hunks,16);assert.equal(analysis.actual_Angular_browser_native_packed_or_floor_qualified,false);
const originals=JSON.parse(gunzipSync(read('compatibility/rc/spec-followup-source-subjects.json.gz')));
for(const subject of originals.subjects){
 for(const [id,mutate] of [
  ['raw-commit',row=>{row.raw_commit+='\n';row.raw_commit_sha256=hash(row.raw_commit);}],
  ['rehashed-complete-source',row=>{const value=row.members[0].after;value.text+='\n';value.sha256=hash(value.text);value.bytes=Buffer.byteLength(value.text);}],
  ['missing-hunk',row=>{row.original_hunks--;}],
  ['rehashed-malformed-hunk',row=>{row.diff=row.diff.replace(/^@@ /m,'@@  ');row.diff_sha256=hash(row.diff);row.diff_bytes=Buffer.byteLength(row.diff);}],
  ['foreign-path',row=>{row.members[0].path='src/material/unreviewed.spec.ts';}],
 ]){const changed=structuredClone(subject);mutate(changed);assert.throws(()=>reviewFollowupOriginal(changed));cases.push({id:subject.sha+'-'+id,result:'rejected'});}
}
const semanticChanges=[
 row=>{row.members[0].after.text=row.members[0].before.text;},
 row=>{row.diff=row.diff.replace('+      flush();','+      fixture.checkNoChanges();');},
 row=>{row.members[0].after.text=row.members[0].after.text.replace("it('should have tick marks'","it('weakened tick test'");},
 row=>{row.members[0].after.text+='\nit(\'should move focus to the last chip when the focused chip was deleted inside a component with animations\', () => {});\n';},
];
for(const [index,mutate]of semanticChanges.entries()){const changed=structuredClone(originals.subjects[index]);mutate(changed);assert.notDeepEqual(changed,originals.subjects[index]);assert.throws(()=>analyzeFollowupSemantics(changed));cases.push({id:changed.sha+'-false-semantic-scope',result:'rejected'});}
for(const path of [...Object.keys(FOLLOWUP_CAPSULES),...Object.keys(FOLLOWUP_TAGGED_SOURCES),'scripts/acquire-spec-followup-originals.py']){
 const changed=Buffer.concat([read(path),Buffer.from('\n')]);assert.throws(()=>inspectSpecFollowup({root,readMember:name=>name===path?changed:read(name)}));cases.push({id:'changed-immutable-subject-'+path,result:'rejected'});
}
const auto='projects/ngx-material-legacy/legacy-autocomplete/autocomplete.spec.ts',chips='projects/ngx-material-legacy/legacy-chips/chip-list.spec.ts',slider='projects/ngx-material-legacy/legacy-slider/slider.spec.ts';
for(const [path,needle,replacement]of [
 [auto,"it('should reposition the panel when the amount of options changes', fakeAsync(","it('changed reposition test', fakeAsync("],
 [chips,"'should move focus to the last chip when the focused chip was deleted inside a' +","'deleted legacy regression' +"],
 ['projects/ngx-material-legacy/internal/testing/owned-animation-modules.ts',"useValue: 'BrowserAnimations'","useValue: 'NoopAnimations'"],
 [slider,"expect(ticksElement.style.backgroundSize).toBe('30% 2px');","expect(ticksElement.style.backgroundSize).toBe('31% 2px');"],
 ['projects/ngx-material-legacy/legacy-slider/slider.ts','this._tickIntervalPercent / 2','this._tickIntervalPercent / 3'],
 ['projects/ngx-material-legacy/legacy-slider/slider.ts','export class MatLegacySlider','class MatBottomSheet {}\nexport class MatLegacySlider'],
 ['projects/ngx-material-legacy/tsconfig.lib.json','"**/*.spec.ts"','"**/*.unreviewed.ts"'],
]){const before=read(path).toString(),changed=before.replace(needle,replacement);assert.notEqual(changed,before,'mutation anchor missing '+needle);assert.throws(()=>inspectSpecFollowup({root,readMember:name=>name===path?Buffer.from(changed):read(name)}));cases.push({id:'changed-owned-contract-'+path+'-'+cases.length,result:'rejected'});}
const worksheet=JSON.parse(read('compatibility/rc/spec-followup-source-worksheet.json')),tree=execFileSync('git',['-c','gc.auto=0','-c','maintenance.auto=0','ls-tree','-rz',worksheet.source_parent,'--','projects/ngx-material-legacy'],{cwd:root}).toString().split('\0').filter(Boolean);
for(const member of tree){const[metadata,path]=member.split('\t'),[mode,kind,blob]=metadata.split(' ');assert.equal(mode,'100644');assert.equal(kind,'blob');const bytes=read(path);assert.equal(createHash('sha1').update('blob '+bytes.length+'\0').update(bytes).digest('hex'),blob,'unrelated product changed '+path);}
assert.equal(tree.length,1141);
const report={schema_version:1,line:analysis.line,complete_original_files:4,complete_original_hunks:16,controls:cases.length,cases,analysis,unchanged_product_members:1141,actual_Angular_browser_native_packed_or_floor_qualified:false,producer_sha256:hash(read('tests/spec_followup_source_probe.mjs')),helper_sha256:hash(read('scripts/spec-followup-source-review.mjs')),g11_claim:'not-passed'};
const out=process.argv.indexOf('--out');if(out>=0)writeFileSync(process.argv[out+1],JSON.stringify(report,null,2)+'\n',{flag:'wx'});
console.log(JSON.stringify({...report,cases:undefined,analysis:undefined}));
