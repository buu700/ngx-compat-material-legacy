/**
 * @license
 * Copyright Google LLC All Rights Reserved.
 * Copyright (c) 2026 Ryan Lester.
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.io/license
 */
/** Genuine public overlay namespaces and complete original/minimum dependency closures. */
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {readFileSync,writeFileSync,mkdirSync} from 'node:fs';
import {createRequire} from 'node:module';
import {join,dirname,posix} from 'node:path';
import {gunzipSync} from 'node:zlib';
import {prepareCdkModuleTypePublicSubjects,cdkModuleTypePublicRoute} from './cdk-module-type-public-subjects.mjs';
const ts=createRequire(import.meta.url)('typescript'),hash=b=>createHash('sha256').update(b).digest('hex');
export const OVERLAY_CALLER_SUBJECTS='compatibility/rc/overlay-caller-public-subjects.json';
const capsuleHash='89788447db12d51e57539e67d4d855d9735fc363d8fb7ecbc1c1a13188c11d9f';
export function overlayCallerPublicClosure(model,kind) {
 const roots=['@angular/cdk/overlay'];
 const members=new Map(),edges=[],external=new Set(),dynamic=[];
 function visit(ref){if(ref.external){external.add(ref.external);return;}const key=ref.key;if(members.has(key))return;const text=model.sources.get(key);assert.equal(typeof text,'string','missing complete CDK dependency '+key);const source=ts.createSourceFile(key,text,ts.ScriptTarget.Latest,true);assert.equal(source.parseDiagnostics.length,0);members.set(key,{key,sha256:hash(text),bytes:Buffer.byteLength(text)});
  function add(spec){let target;if(spec.startsWith('.')){let path=posix.normalize(posix.join(posix.dirname(key),kind==='types'?spec.replace(/\.js$/,'.d.ts'):spec));assert.ok(!path.startsWith('../')&&!posix.isAbsolute(path));if(kind==='types'&&!model.sources.has(path)){const candidates=[path+'.d.ts',path+'/index.d.ts'].filter(p=>model.sources.has(p));assert.equal(candidates.length,1,'missing relative CDK declaration '+path);path=candidates[0];}target={key:path};}else target=cdkModuleTypePublicRoute(model,spec,kind);edges.push({from:key,specifier:spec,...target});visit(target);}
  for(const n of source.statements)if((ts.isImportDeclaration(n)||ts.isExportDeclaration(n))&&n.moduleSpecifier)add(n.moduleSpecifier.text);
  function nested(n){if(kind==='types'&&ts.isImportTypeNode(n)&&ts.isLiteralTypeNode(n.argument)&&ts.isStringLiteral(n.argument.literal))add(n.argument.literal.text);if(ts.isCallExpression(n)&&n.expression.kind===ts.SyntaxKind.ImportKeyword)dynamic.push({key,expression:n.getText(source)});ts.forEachChild(n,nested);}nested(source);
 }
 for(const spec of roots)visit(cdkModuleTypePublicRoute(model,spec,kind));assert.equal(dynamic.length,0,'unqualified dynamic CDK dependency');return {roots,members:[...members.values()].sort((a,b)=>a.key.localeCompare(b.key)),edges,external:[...external].sort()};
}
export function prepareOverlayCallerPublicSubjects(root) {
 const bytes=readFileSync(join(root,OVERLAY_CALLER_SUBJECTS));assert.equal(hash(bytes),capsuleHash,'changed overlay public subject capsule');const capsule=JSON.parse(bytes),base=prepareCdkModuleTypePublicSubjects(root);
 try{assert.deepEqual(capsule.base,base.cdk_module_type_capsule);assert.equal(capsule.material_base_sha256,base.capsule_hash);assert.deepEqual(capsule.subjects.map(s=>s.line),base.models.map(m=>m.line));
  for(const model of base.models){const subject=capsule.subjects.find(s=>s.line===model.line);assert.deepEqual(subject.archives,model.subject.packages.filter(p=>p.name==='@angular/cdk'));
   for(const m of subject.additions){assert.equal(m.path,'compatibility/rc/overlay-caller-public-sources/'+m.sha256+'.gz');assert.ok(m.package==='@angular/cdk');assert.ok(m.key.startsWith(m.package+'/'));assert.equal(m.archive_member,'package/'+m.key.slice(m.package.length+1));assert.equal(model.sources.has(m.key),false);const stored=readFileSync(join(root,m.path));assert.equal(hash(stored),m.stored_sha256);const raw=gunzipSync(stored);assert.equal(hash(raw),m.sha256);assert.equal(raw.length,m.bytes);model.sources.set(m.key,raw.toString());const target=join(model.root,'node_modules',m.key);mkdirSync(dirname(target),{recursive:true});writeFileSync(target,raw);}
   for(const kind of ['runtime','types'])assert.deepEqual(overlayCallerPublicClosure(model,kind),subject.closures[kind]);model.overlay_caller_subject=subject;

  }return {...base,overlay_caller_capsule:{path:OVERLAY_CALLER_SUBJECTS,sha256:capsuleHash}};
 }catch(e){base.dispose();throw e;}
}
