/**
 * @license
 * Copyright Google LLC All Rights Reserved.
 * Copyright (c) 2026 Ryan Lester.
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.io/license
 */
/** Finite tagged classic focus/state contract; source evidence grants no native execution credit. */
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {readFileSync} from 'node:fs';
import {createRequire} from 'node:module';
import {dirname,join,resolve} from 'node:path';
import {fileURLToPath} from 'node:url';
import {gunzipSync} from 'node:zlib';
const rootDefault=resolve(dirname(fileURLToPath(import.meta.url)),'..');
const ts=createRequire(import.meta.url)('typescript');
const hash=bytes=>createHash('sha256').update(bytes).digest('hex');
export const CHIP_LIST_SOURCE='projects/ngx-material-legacy/legacy-chips/chip-list.ts';
export const CHIP_LIST_REFERENCE='reference/material-16.2.14/chip-blur-sources/chip-list.ts';
export const CHIP_LIST_ORIGINALS='compatibility/rc/chip-list-contract-originals.json.gz';
const referenceHash='83c17cd61f9ecb8cc4dcc7947a493a78a93a6b880d3c69f9284eb39106662414';
const originalHash='2de2e7e9bf24371b59527492a0e964562010e2f8afdc44df56fa9cf3ab86a5b5';
const priorHashes={main:'1c7784738aa8b96ba3e5915100d35f7ca9e72160317d98eabba13b2260482481','21.x':'3efd31db185a9d88da1b513c68fa7a388a641fcafafcafaa46c0541eb2220551'};
export const CHIP_LIST_SHAS=Object.freeze(['e69b2b09efaf577cd5fe92b70808479f975913af','2861a306aebc54eafe4a72b4a53860d8612af5d4','8980ad584c7ab7d8a0553528cbff88958e94a22a']);
const printer=ts.createPrinter({removeComments:true});
const print=(node,source)=>printer.printNode(ts.EmitHint.Unspecified,node,source).trim();
function parsed(text,name='MatLegacyChipList'){
 const source=ts.createSourceFile('chip-list.ts',text,ts.ScriptTarget.Latest,true);
 assert.equal(source.parseDiagnostics.length,0,'invalid chip-list source');
 const owners=source.statements.filter(n=>ts.isClassDeclaration(n)&&n.name?.text===name);
 assert.equal(owners.length,1,'ambiguous chip-list owner');
 return {source,owner:owners[0]};
}
export function chipListMember(text,name,kind=ts.SyntaxKind.MethodDeclaration){
 const {source,owner}=parsed(text),members=owner.members.filter(n=>n.kind===kind&&n.name?.getText(source)===name);
 assert.equal(members.length,1,'missing or ambiguous chip-list member '+name);
 return {source,node:members[0],text:members[0].getText(source),canonical:print(members[0],source)};
}
export function readChipListPrior(root=rootDefault){
 const bytes=readFileSync(join(root,'compatibility/rc/chip-list-contract-prior.json.gz'));
 const data=JSON.parse(gunzipSync(bytes));assert.equal(hash(bytes),priorHashes[data.line],'changed chip-list prior');
 assert.equal(hash(data.ledger_text),data.ledger_sha256);
 for(const row of data.sources)assert.equal(hash(row.text),row.sha256);
 return data;
}
export function readChipListOriginals(root=rootDefault){
 const bytes=readFileSync(join(root,CHIP_LIST_ORIGINALS));assert.equal(hash(bytes),originalHash,'changed original chip patches');
 const data=JSON.parse(gunzipSync(bytes));assert.deepEqual(data.subjects.map(s=>s.sha),CHIP_LIST_SHAS);
 for(const row of data.subjects){
  assert.equal(hash(row.diff),row.diff_sha256);assert.equal(hash(row.raw_commit),row.raw_commit_sha256);
  assert.equal(row.members.length,1);assert.equal(row.members[0].path,'src/material/chips/chip-grid.ts');
  for(const side of ['before','after']){const member=row.members[0][side],raw=Buffer.from(member.text);assert.equal(hash(raw),member.sha256);assert.equal(createHash('sha1').update(Buffer.concat([Buffer.from('blob '+raw.length+'\0'),raw])).digest('hex'),member.git_blob);}
 }
 return data;
}
export function inspectChipListFocusContract({root=rootDefault,readSource}={}){
 const read=path=>readSource?readSource(path):readFileSync(join(root,path),'utf8');
 const reference=read(CHIP_LIST_REFERENCE);assert.equal(hash(reference),referenceHash,'changed tagged reference');
 const current=read(CHIP_LIST_SOURCE),originals=readChipListOriginals(root);
 for(const name of ['focus','_focusInput','_syncChipsState'])assert.equal(chipListMember(current,name).canonical,chipListMember(reference,name).canonical,'classic '+name+' differs from untouched tag');
 assert.equal(chipListMember(current,'disabled',ts.SyntaxKind.GetAccessor).canonical,chipListMember(reference,'disabled',ts.SyntaxKind.GetAccessor).canonical,'disabled getter differs from tag');
 const setter=chipListMember(current,'disabled',ts.SyntaxKind.SetAccessor),oldSetter=chipListMember(reference,'disabled',ts.SyntaxKind.SetAccessor);
 const actual=setter.node.body.statements.map(n=>print(n,setter.source));
 assert.deepEqual(actual,[...oldSetter.node.body.statements.map(n=>print(n,oldSetter.source)),'this.stateChanges.next();'],'disabled setter must only append its notification after propagation');
 assert.equal(setter.node.parameters.length,oldSetter.node.parameters.length);
 assert.equal(print(setter.node.parameters[0],setter.source),print(oldSetter.node.parameters[0],oldSetter.source),'disabled input contract changed');
 const base=text=>{const {source}=parsed(text),nodes=source.statements.filter(ts.isVariableStatement).flatMap(n=>[...n.declarationList.declarations]).filter(n=>n.name.getText(source)==='_MatChipListBase');assert.equal(nodes.length,1);return print(nodes[0],source);};
 assert.equal(base(current),base(reference),'local stateChanges base differs from tagged Subject boundary');
 return {reference:{path:CHIP_LIST_REFERENCE,sha256:referenceHash},source:{path:CHIP_LIST_SOURCE,sha256:hash(current)},methods:['focus','_focusInput','_syncChipsState'],disabled_delta:'one appended stateChanges.next() after synchronous propagation',original_subjects:originals.subjects.map(s=>({sha:s.sha,diff_sha256:s.diff_sha256})),actual_native_packed_or_floor_qualified:false};
}
/** Whole actual methods, no hand-written replacement implementation. Receiver item/DOM roles remain protocols. */
export function replayChipListClass(source){
 const members=['focus','_focusInput'].map(name=>chipListMember(source,name).text).join('\n');
 const output=ts.transpileModule('class Replay {\n'+members+'\n}',{compilerOptions:{target:ts.ScriptTarget.ES2022,module:ts.ModuleKind.ESNext},reportDiagnostics:true});
 assert.equal(output.diagnostics?.length??0,0);
 return Function(output.outputText+'; return Replay;')();
}
