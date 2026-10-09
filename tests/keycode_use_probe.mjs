/**
 * @license
 * Copyright Google LLC All Rights Reserved.
 * Copyright (c) 2026 Ryan Lester.
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.io/license
 */
/** Exact public literal/helper and authored binding checks; no component/native audit credit. */
import assert from 'node:assert/strict';
import {readFileSync,writeFileSync,existsSync} from 'node:fs';
import {dirname,resolve,join} from 'node:path';
import {fileURLToPath,pathToFileURL} from 'node:url';
import {reviewKeycodeUses,modifierBehavior} from '../scripts/keycode-use-review.mjs';
const root=resolve(dirname(fileURLToPath(import.meta.url)),'..'),read=file=>readFileSync(join(root,file),'utf8'),subjects=JSON.parse(read('compatibility/rc/keycode-declaration-subjects.json'));
const report=await reviewKeycodeUses({root});assert.equal(report.uses,58);assert.equal(report.files,14);assert.equal(report.names.length,16);assert.equal(report.runtime_override_used,false);assert.equal(report.source_override_used,false);
const original=await import(pathToFileURL(join(subjects.subjects.find(s=>s.line==='original').runtime_root,'fesm2022/keycodes.mjs')).href),mutations=[];
for(const [id,implementation]of [
 ['always-false',()=>false],['always-true',()=>true],
 ['ignores-requested-modifiers',event=>event.altKey||event.shiftKey||event.ctrlKey||event.metaKey],
 ['wrong-default-order',(event,...modifiers)=>modifiers.length?modifiers.some(m=>event[m]):event.metaKey||event.ctrlKey||event.shiftKey||event.altKey],
 ['wrong-selected-flag',(event,...modifiers)=>modifiers.length?modifiers.some(()=>event.altKey):event.altKey||event.shiftKey||event.ctrlKey||event.metaKey],
 ['eager-default-getters',(event,...modifiers)=>{const values=[event.altKey,event.shiftKey,event.ctrlKey,event.metaKey];return modifiers.length?modifiers.some(m=>event[m]):values.some(Boolean);}],
]){
 assert.throws(()=>modifierBehavior(implementation,original.hasModifierKey),/modifier result differs|getter order/);mutations.push({id,result:'rejected'});
}
for(const line of ['main','21.x']){
 const subject=subjects.subjects.find(s=>s.line===line),runtime=await import(pathToFileURL(join(subject.runtime_root,subject.public_entry)).href);
 await assert.rejects(reviewKeycodeUses({root,runtimeOverrides:{[line]:{...runtime,ESCAPE:28}}}),/runtime keycode literal differs/);mutations.push({id:line+':changed-runtime-escape',result:'rejected'});
 for(const change of [s=>s.version='99.0.0',s=>s.archive_sha256='0'.repeat(64),s=>s.declaration_sha256='0'.repeat(64),s=>s.members=[],s=>s.members[0].sha256='0'.repeat(64)]){
  const bad=structuredClone(subjects);change(bad.subjects.find(s=>s.line===line));await assert.rejects(reviewKeycodeUses({root,subjectData:bad}));mutations.push({id:line+':changed-subject-'+mutations.length,result:'rejected'});
 }
}
const file='projects/ngx-material-legacy/legacy-dialog/dialog-ref.ts',text=read(file);
for(const [id,changed,pattern]of [
 ['runtime-constant-misuse',text+'\nconsole.log(ESCAPE);\n',/unsupported keycode reference/],
 ['helper-alias-reference',text+'\nconst borrowedHelper=hasModifierKey;\n',/unsupported modifier helper reference/],
 ['unknown-modifier-name',text.replace('!hasModifierKey(event)','!hasModifierKey(event, "unknown")'),/nonliteral\/unknown modifier selector/],
 ['dynamic-modifier-name',text.replace('!hasModifierKey(event)','!hasModifierKey(event, event.type)'),/nonliteral\/unknown modifier selector/],
 ['duplicate-import',text+"\nimport {ESCAPE as Duplicate} from '@angular/cdk/keycodes';\n",/missing\/ambiguous/],
 ['missing-import',text.replace("import {ESCAPE, hasModifierKey} from '@angular/cdk/keycodes';",''),/missing\/ambiguous/],
]){
 assert.notEqual(changed,text);await assert.rejects(reviewKeycodeUses({root,readSource:p=>p===file?changed:read(p)}),pattern);mutations.push({id,result:'rejected'});
}
assert.equal(mutations.length,24);report.mutations=mutations;
const args=process.argv.slice(2);if(args.length){assert.equal(args.length,2);assert.equal(args[0],'--report');assert.equal(existsSync(args[1]),false);writeFileSync(args[1],JSON.stringify(report,null,2)+'\n');}
console.log(JSON.stringify({uses:report.uses,files:report.files,literal_names:15,helper_cases_each_peer:report.behaviors[0].cases,mutations:mutations.length}));
