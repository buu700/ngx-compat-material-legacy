/**
 * @license
 * Copyright Google LLC All Rights Reserved.
 * Copyright (c) 2026 Ryan Lester.
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.io/license
 */
/** Genuine table namespaces,including the untouched tagged legacy-table reference. */
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {readFileSync,writeFileSync,mkdirSync} from 'node:fs';
import {createRequire} from 'node:module';
import {join,dirname,posix} from 'node:path';
import {gunzipSync} from 'node:zlib';
import {prepareCdkModuleTypePublicSubjects,cdkModuleTypePublicRoute} from './cdk-module-type-public-subjects.mjs';
const ts=createRequire(import.meta.url)('typescript'),hash=b=>createHash('sha256').update(b).digest('hex');
export const TABLE_CALLER_SUBJECTS='compatibility/rc/table-caller-public-subjects.json';
const capsuleHash='57d7ae63d7887c9c596bce3c40b88a3c13319672b575b6715990aae73c362942';
export function tableCallerPublicClosure(model,kind) {
 const roots=['@angular/cdk/table',...(model.line==='original'?['@angular/material/legacy-table']:[])];
 const members=new Map(),edges=[],external=new Set(),dynamic=[];
 function visit(ref){if(ref.external){external.add(ref.external);return;}const key=ref.key;if(members.has(key))return;const text=model.sources.get(key);assert.equal(typeof text,'string','missing complete CDK dependency '+key);const source=ts.createSourceFile(key,text,ts.ScriptTarget.Latest,true);assert.equal(source.parseDiagnostics.length,0);members.set(key,{key,sha256:hash(text),bytes:Buffer.byteLength(text)});
  function add(spec){let target;if(spec.startsWith('.')){let path=posix.normalize(posix.join(posix.dirname(key),kind==='types'?spec.replace(/\.js$/,'.d.ts'):spec));assert.ok(!path.startsWith('../')&&!posix.isAbsolute(path));if(kind==='types'&&!model.sources.has(path)){const candidates=[path+'.d.ts',path+'/index.d.ts'].filter(p=>model.sources.has(p));assert.equal(candidates.length,1,'missing relative CDK declaration '+path);path=candidates[0];}target={key:path};}else target=cdkModuleTypePublicRoute(model,spec,kind);edges.push({from:key,specifier:spec,...target});visit(target);}
  for(const n of source.statements)if((ts.isImportDeclaration(n)||ts.isExportDeclaration(n))&&n.moduleSpecifier)add(n.moduleSpecifier.text);
  function nested(n){if(kind==='types'&&ts.isImportTypeNode(n)&&ts.isLiteralTypeNode(n.argument)&&ts.isStringLiteral(n.argument.literal))add(n.argument.literal.text);if(ts.isCallExpression(n)&&n.expression.kind===ts.SyntaxKind.ImportKeyword)dynamic.push({key,expression:n.getText(source)});ts.forEachChild(n,nested);}nested(source);
 }
 for(const spec of roots)visit(cdkModuleTypePublicRoute(model,spec,kind));assert.equal(dynamic.length,0,'unqualified dynamic CDK dependency');return {roots,members:[...members.values()].sort((a,b)=>a.key.localeCompare(b.key)),edges,external:[...external].sort()};
}
export function prepareTableCallerPublicSubjects(root) {
 const bytes=readFileSync(join(root,TABLE_CALLER_SUBJECTS));assert.equal(hash(bytes),capsuleHash,'changed table public subject capsule');const capsule=JSON.parse(bytes),base=prepareCdkModuleTypePublicSubjects(root);
 try{assert.deepEqual(capsule.base,base.cdk_module_type_capsule);assert.equal(capsule.material_base_sha256,base.capsule_hash);assert.deepEqual(capsule.subjects.map(s=>s.line),base.models.map(m=>m.line));
  for(const model of base.models){const subject=capsule.subjects.find(s=>s.line===model.line);assert.deepEqual(subject.archives,model.subject.packages.filter(p=>p.name==='@angular/cdk'||(model.line==='original'&&['@angular/material','@angular/animations'].includes(p.name))));
   for(const m of subject.additions){assert.equal(m.path,'compatibility/rc/table-caller-public-sources/'+m.sha256+'.gz');assert.ok(m.package==='@angular/cdk'||(model.line==='original'&&['@angular/material','@angular/animations'].includes(m.package)));assert.ok(m.key.startsWith(m.package+'/'));assert.equal(m.archive_member,'package/'+m.key.slice(m.package.length+1));assert.equal(model.sources.has(m.key),false);const stored=readFileSync(join(root,m.path));assert.equal(hash(stored),m.stored_sha256);const raw=gunzipSync(stored);assert.equal(hash(raw),m.sha256);assert.equal(raw.length,m.bytes);model.sources.set(m.key,raw.toString());const target=join(model.root,'node_modules',m.key);mkdirSync(dirname(target),{recursive:true});writeFileSync(target,raw);}
   for(const kind of ['runtime','types'])assert.deepEqual(tableCallerPublicClosure(model,kind),subject.closures[kind]);model.table_caller_subject=subject;
   // The whole owned source also imports coercion. Retain its existing exact
   // declaration capsule rather than synthesizing ambient declarations.
   const coercionPath='compatibility/rc/coercion-public-subjects.json',coercionBytes=readFileSync(join(root,coercionPath));assert.equal(hash(coercionBytes),'be5c12b5d9829221410bb9b1ce490f247cf1992059fcd1893a1a5b7f90b86d86');const coercion=JSON.parse(coercionBytes).subjects.find(s=>s.line===model.line);assert.equal(coercion.version,model.packages.get('@angular/cdk').version);assert.equal(coercion.archive_sha256,subject.archives.find(p=>p.name==='@angular/cdk').archive_sha256);
   for(const member of coercion.declarations){const raw=readFileSync(join(root,member.path));assert.equal(hash(raw),member.sha256);assert.equal(raw.length,member.bytes);const memberPath=model.line==='original'?'coercion/index.d.ts':'types/'+member.path.split('/').at(-1).replace(/^cdk-[0-9.]+-/,'');const canonical=coercion.members.find(m=>m.path===memberPath);assert.ok(canonical);assert.equal(canonical.sha256,member.sha256);const key='@angular/cdk/'+memberPath;if(model.sources.has(key))assert.equal(model.sources.get(key),raw.toString());else{model.sources.set(key,raw.toString());const target=join(model.root,'node_modules',key);mkdirSync(dirname(target),{recursive:true});writeFileSync(target,raw);}}
   model.table_caller_coercion={path:coercionPath,sha256:hash(coercionBytes),declarations:coercion.declarations};
  }return {...base,table_caller_capsule:{path:TABLE_CALLER_SUBJECTS,sha256:capsuleHash}};
 }catch(e){base.dispose();throw e;}
}
