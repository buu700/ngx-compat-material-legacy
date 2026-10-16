/**
 * @license
 * Copyright Google LLC All Rights Reserved.
 * Copyright (c) 2026 Ryan Lester.
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.io/license
 */
/** File-scoped rejection controls; complete upstream test programs are never executed. */
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {readFileSync,writeFileSync} from 'node:fs';
import {gunzipSync} from 'node:zlib';
import {dirname,resolve} from 'node:path';
import {fileURLToPath} from 'node:url';
import {inspectImportCleanupSources,importCleanupPins,authenticateImportCleanupOriginal,reviewImportCleanupFile,observeImportCleanupFile} from '../scripts/spec-import-cleanup-source-review.mjs';
const root=resolve(dirname(fileURLToPath(import.meta.url)),'..'),read=p=>readFileSync(resolve(root,p)),hash=n=>createHash('sha256').update(n).digest('hex');
const report=inspectImportCleanupSources({root}),pins=importCleanupPins({root}),originals=JSON.parse(gunzipSync(read('compatibility/rc/spec-import-cleanup-source-subjects.json.gz'))),controls=[];
function reject(id,action,pattern){assert.throws(action,pattern,id);controls.push({id,result:'rejected'});}
function replaceNode(member,side,node,replacement){const next=structuredClone(member);assert.equal(next[side].text.slice(node.start,node.end),node.raw);assert.notEqual(node.raw,replacement);next[side].text=next[side].text.slice(0,node.start)+replacement+next[side].text.slice(node.end);return next;}
for(const[index,subject]of originals.subjects.entries()){
 for(const[id,change]of[
  ['raw-commit',n=>{n.raw_commit+='\n';n.raw_commit_sha256=hash(n.raw_commit);}],
  ['missing-file',n=>{n.members.pop();n.complete_changed_files.pop();}],
  ['foreign-file',n=>{n.members[0].path='src/material/unreviewed.spec.ts';}],
  ['missing-hunk',n=>{n.original_hunks--;}],
  ['rehashed-body',n=>{const b=n.members[0].after;b.text+='\n';b.sha256=hash(b.text);b.bytes=Buffer.byteLength(b.text);}],
  ['rehashed-diff',n=>{n.diff=n.diff.replace(/^@@ /m,'@@  ');n.diff_sha256=hash(n.diff);n.diff_bytes=Buffer.byteLength(n.diff);}],
 ]){const next=structuredClone(subject);change(next);reject(subject.sha+'-'+id,()=>authenticateImportCleanupOriginal(next,pins[index]));}
 for(const[i,member]of subject.members.entries()){
  const next=structuredClone(member);next.after.text+='\n__unreviewedAction();\n';
  // All erasure inventories, bindings, cases and hooks still match. This must fail on retained program semantics.
  reject(subject.sha+'-retained-operation-'+member.path,()=>reviewImportCleanupFile(next,pins[index].files[i]),/non-scaffold program operation/);
 }
 const member=subject.members[0],pin=pins[index].files[0],imp=pin.after.records.find(n=>n.kind==='import'&&n.raw.includes('import {'));
 assert.ok(imp);reject(subject.sha+'-runtime-import-type',()=>reviewImportCleanupFile(replaceNode(member,'after',imp,imp.raw.replace('import {','import type {')),pin),/normalization operation/);
 const renamed=structuredClone(member);renamed.after.text=renamed.after.text.replace(/\bit\(/,'xit(');assert.notEqual(renamed.after.text,member.after.text);
 reject(subject.sha+'-case-mode',()=>observeImportCleanupFile(renamed),/case identities/);
 const removedPin=pins[index].files.find(n=>n.removed_bindings.length),removedMember=subject.members.find(n=>n.path===removedPin.path),unbound=structuredClone(removedMember);
 unbound.after.text+='\nvoid '+removedPin.removed_bindings[0].local+';\n';reject(subject.sha+'-unbound-removed-import',()=>observeImportCleanupFile(unbound),/unresolved use/);
}
// Exact original raw/context controls for every normalization category, including nodes whose erased children overlap.
const categories=new Map();
for(const[index,subject]of originals.subjects.entries())for(const[i,member]of subject.members.entries())for(const side of['before','after'])for(const row of pins[index].files[i][side].records)if(!categories.has(row.kind))categories.set(row.kind,{member,pin:pins[index].files[i],side,row});
for(const[kind,{member,pin,side,row}]of categories){
 let replacement;
 if(kind==='import')replacement=row.raw.replace(/from\s+(['"])([^'"]+)/,(all,quote,module)=>'from '+quote+module+'/unreviewed');
 else if(kind==='imports-metadata')replacement=row.raw.replace(/^imports/,"['imports']");
 else if(kind==='provider-shorthand')replacement=row.raw.replace('providers: providers',"['providers']: providers");
 else if(kind==='removed-unused-private-class')replacement=row.raw.replace('class ConnectedOverlayPropertyInitOrder','class UnreviewedFixture');
 else if(kind==='removed-local-helper-parameter')replacement=row.raw.replace('any[] = []','any[] = [null]');
 else if(kind==='removed-local-helper-forwarding')replacement=row.raw.replace(', declarations',', []');
 else if(kind==='CommonModule-helper-argument')replacement=row.raw.replace('CommonModule','UnreviewedModule');
 else if(kind==='hook-wrapper')replacement=row.raw.replace(/^(fakeAsync|waitForAsync)/,'unreviewedWrapper');
 else if(kind==='hook-async-modifier')replacement=row.raw.replace(/^async\s+/,'');
 else replacement=row.raw.replace('TestBed','OtherTestBed');
 assert.notEqual(replacement,row.raw,kind);reject('exact-normalization-'+kind,()=>reviewImportCleanupFile(replaceNode(member,side,row,replacement),pin));
}
const helperPin=pins[1].files.find(n=>n.local_helpers),helper=originals.subjects[1].members.find(n=>n.path===helperPin.path);
{const next=structuredClone(helper);next.before.text=next.before.text.replace(/setupTableTestApp\(([^(),\n]+)\);/,'setupTableTestApp($1, []);');assert.notEqual(next.before.text,helper.before.text);reject('local-helper-default-argument-only',()=>observeImportCleanupFile(next),/nondefault helper argument/);}
{const next=structuredClone(helper);next.before.text=next.before.text.replace('fixture = createComponent(componentType, declarations);','void declarations; fixture = createComponent(componentType, declarations);');reject('removed-helper-parameter-extra-use',()=>observeImportCleanupFile(next),/extra use/);}
{const next=structuredClone(helper);next.before.text=next.before.text.replace('component = fixture.componentInstance;','const escapedHelper = setupTableTestApp; component = fixture.componentInstance;');assert.notEqual(next.before.text,helper.before.text);reject('private-helper-cannot-escape',()=>observeImportCleanupFile(next),/helper escapes/);}
{const p=pins[1].files.find(n=>n.removed_unused_class),member=originals.subjects[1].members.find(n=>n.path===p.path),next=structuredClone(member);next.before.text+='\nvoid ConnectedOverlayPropertyInitOrder;\n';reject('removed-fixture-extra-reference',()=>observeImportCleanupFile(next));}
{const p=pins[0].files.find(n=>n.after.records.some(r=>r.kind==='imports-metadata')),member=originals.subjects[0].members.find(n=>n.path===p.path),row=p.after.records.find(n=>n.kind==='imports-metadata');
 // A normalization that would conceal an extra import is rejected by the immutable operation inventory.
 reject('erased-metadata-extra-symbol',()=>reviewImportCleanupFile(replaceNode(member,'after',row,row.raw.replace('[','[UnreviewedDependency, ')),p),/normalization operation/);
}
const result={...report,subjects:report.subjects.map(({hunks,files,cases,...n})=>n),controls:controls.length,cases:controls,normalization_categories:[...categories.keys()],source_helper_sha256:hash(read('scripts/spec-import-cleanup-source-review.mjs')),producer_sha256:hash(read('tests/spec_import_cleanup_source_probe.mjs'))};
const out=process.argv.indexOf('--out');if(out>=0)writeFileSync(process.argv[out+1],JSON.stringify(result,null,2)+'\n',{flag:'wx'});console.log(JSON.stringify({...result,cases:undefined}));
