/**
 * @license
 * Copyright Google LLC All Rights Reserved.
 * Copyright (c) 2026 Ryan Lester.
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.io/license
 */
import assert from 'node:assert/strict';
import {readFileSync,writeFileSync,mkdirSync,existsSync,symlinkSync} from 'node:fs';
import {createHash} from 'node:crypto';
import {dirname,join,resolve,relative} from 'node:path';
import {fileURLToPath} from 'node:url';
import {createRequire} from 'node:module';
import {gunzipSync} from 'node:zlib';
import {prepareMaterialPublicSubjects} from './material-public-subjects.mjs';
const rootDefault=resolve(dirname(fileURLToPath(import.meta.url)),'..'),require=createRequire(import.meta.url),ts=require('typescript'),hash=b=>createHash('sha256').update(b).digest('hex');
export const optionIdentityEntries=['projects/ngx-material-legacy/legacy-core/option/option.ts','projects/ngx-material-legacy/legacy-core/option/optgroup.ts'];
export function prepareOptionIdentitySubjects(root=rootDefault){
 const bytes=readFileSync(join(root,'compatibility/rc/option-identity-tagged-subject.json'));assert.equal(hash(bytes),'9bca59abfe42d35af3525acdab9ab6b923f47f0e541d566720d3443f644d3a51');const capsule=JSON.parse(bytes);
 // Authenticated against the existing immutable package subject; no alternate peer selection.
 assert.equal(capsule.canonical_material_capsule_sha256,'f4e494ce1f71c068e801d086e4017fc86ea721c842d5e7ac161d3d08d1434ae3');
 const loaded=prepareMaterialPublicSubjects(root);
 try{for(const model of loaded.models){
  const zoneRoot=dirname(require.resolve('zone.js/package.json'));symlinkSync(zoneRoot,join(model.root,'node_modules/zone.js'),'dir');model.borrowed_zone=JSON.parse(readFileSync(join(zoneRoot,'package.json'))).version;
  if(model.line!=='original')continue;
  assert.deepEqual(capsule.package,model.subject.packages.find(p=>p.name==='@angular/material'));
  const member=capsule.member,stored=readFileSync(join(root,member.path));assert.equal(member.module_path,model.packages.get('@angular/material').exports['./legacy-core'].default.slice(2));assert.equal(hash(stored),member.stored_sha256);const raw=gunzipSync(stored);assert.equal(hash(raw),member.sha256);assert.equal(raw.length,member.bytes);
  const target=join(model.root,'node_modules/@angular/material',member.module_path);assert.equal(existsSync(target),false);mkdirSync(dirname(target),{recursive:true});writeFileSync(target,raw);
  const source=ts.createSourceFile(member.module_path,raw.toString(),ts.ScriptTarget.Latest,true);assert.equal(source.parseDiagnostics.length,0);
  for(const statement of source.statements)if((ts.isImportDeclaration(statement)||ts.isExportDeclaration(statement))&&statement.moduleSpecifier)assert.ok(['@angular/core','@angular/common','@angular/material/core'].includes(statement.moduleSpecifier.text),'legacy-core static dependency escaped canonical closure');
 }
 return {...loaded,tagged_legacy_core_capsule:{path:'compatibility/rc/option-identity-tagged-subject.json',sha256:hash(bytes)}};
 }catch(error){loaded.dispose();throw error;}
}
/** Actual owned module graph emit; declaration/runtime floors are not qualified here. */
export function compileOwnedOptionIdentityModules({root=rootDefault,readSource}={}){
 const entries=optionIdentityEntries.map(path=>join(root,path)),options={target:ts.ScriptTarget.ES2022,module:ts.ModuleKind.ESNext,experimentalDecorators:true,useDefineForClassFields:false,noLib:true,noEmitOnError:false},host=ts.createCompilerHost(options),baseRead=host.readFile.bind(host);
 host.readFile=file=>file.startsWith(join(root,'projects/ngx-material-legacy')+'/')&&readSource?readSource(relative(root,file)):baseRead(file);
 const program=ts.createProgram(entries,options,host),emitted=new Map(),result=[],seen=new Set();assert.equal(program.getSyntacticDiagnostics().length,0);program.emit(undefined,(file,text)=>emitted.set(file,text));
 function visit(file){if(seen.has(file))return;seen.add(file);assert.ok(file.startsWith(join(root,'projects/ngx-material-legacy')+'/'));let compiled=emitted.get(file.slice(0,-3)+'.js');assert.equal(typeof compiled,'string','missing complete owned emitted module');const source=ts.createSourceFile(file,compiled,ts.ScriptTarget.Latest,true),edits=[];
  for(const node of source.statements)if((ts.isImportDeclaration(node)||ts.isExportDeclaration(node))&&node.moduleSpecifier&&node.moduleSpecifier.text.startsWith('.')){const base=resolve(dirname(file),node.moduleSpecifier.text),target=[base+'.ts',join(base,'index.ts')].find(existsSync);assert.ok(target);visit(target);const path=relative(dirname(file),target).replace(/\.ts$/,'.mjs');edits.push([node.moduleSpecifier.getStart(source),node.moduleSpecifier.end,JSON.stringify(path.startsWith('.')?path:'./'+path)]);}
  for(const [start,end,text] of edits.sort((a,b)=>b[0]-a[0]))compiled=compiled.slice(0,start)+text+compiled.slice(end);
  const raw=Buffer.from(readSource?readSource(relative(root,file)):readFileSync(file));result.push({path:relative(root,file),sha256:hash(raw),bytes:raw.length,compiled});
 }for(const entry of entries)visit(entry);return {modules:result.sort((a,b)=>a.path.localeCompare(b.path)),compiler:ts.version,limits:'Full owned module syntax/emit and runtime construction only. External declarations, actual Angular nodes/templates/factories, canonical compiler/Node/RxJS and packed/native floors remain unqualified.'};
}

/** The finite product repair admits only the two literals and required ownership notice. */
export const optionIdentityRepairs = [
  [
    "projects/ngx-material-legacy/legacy-core/option/option-base.ts",
    "`mat-option-${_uniqueIdCounter++}`",
    "`mat-option-${_uniqueIdCounter++}-legacy`"
  ],
  [
    "projects/ngx-material-legacy/legacy-core/option/optgroup-base.ts",
    "`mat-optgroup-label-${_uniqueOptgroupIdCounter++}`",
    "`mat-optgroup-label-${_uniqueOptgroupIdCounter++}-legacy`"
  ]
];
export const optionIdentityBeforeHashes = {
  "projects/ngx-material-legacy/legacy-core/option/option-base.ts": "91342024231daf280fe2f3465c05645b0746e7a3685c9b95e7d52d0dbc281883",
  "projects/ngx-material-legacy/legacy-core/option/optgroup-base.ts": "301e27b08e40c59d54957c2b1080f1604f4abe822ba17ecc15c0f9018cc5f668"
};
export const optionIdentityOwnershipNotice = [" * Copyright Google LLC All Rights Reserved.\n", " * Copyright Google LLC All Rights Reserved.\n * Copyright (c) 2026 Ryan Lester.\n"];
export function reverseOptionIdentitySource(path,text){
 const edit=optionIdentityRepairs.find(row=>row[0]===path);assert.ok(edit,'foreign option identity path');assert.equal(text.split(edit[2]).length,2);text=text.replace(edit[2],edit[1]);
 if(path.endsWith('optgroup-base.ts')){assert.equal(text.split(optionIdentityOwnershipNotice[1]).length,2);text=text.replace(optionIdentityOwnershipNotice[1],optionIdentityOwnershipNotice[0]);}
 assert.equal(hash(text),optionIdentityBeforeHashes[path],'unrelated option/group source change');return text;
}
