/**
 * @license
 * Copyright Google LLC All Rights Reserved.
 * Copyright (c) 2026 Ryan Lester.
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.io/license
 */
/** Exact published CDK public module closures; original capsules stay immutable. */
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {readFileSync,writeFileSync,mkdirSync} from 'node:fs';
import {createRequire} from 'node:module';
import {join,dirname,posix} from 'node:path';
import {gunzipSync} from 'node:zlib';
import {prepareMaterialPublicSubjects} from './material-public-subjects.mjs';
const ts=createRequire(import.meta.url)('typescript'),hash=b=>createHash('sha256').update(b).digest('hex');
export const CDK_MODULE_TYPE_SUBJECTS='compatibility/rc/cdk-module-type-public-subjects.json';
const capsuleHash='687a9cc652a3e3cdf9edf0c988efade4ad491e3e41d2e4a74df6874869201f56';
const roots=['@angular/cdk','@angular/cdk/observers','@angular/cdk/scrolling','@angular/cdk/text-field','@angular/cdk/layout'];
export function cdkModuleTypePublicRoute(model,spec,kind) {
 const parts=spec.split('/'),name=parts.slice(0,2).join('/'),suffix=parts.slice(2).join('/'),pkg=model.packages.get(name);
 if(!pkg){assert.ok(['rxjs','rxjs/operators','tslib'].includes(spec),'unsupported external CDK dependency '+spec);return {external:spec};}
 const entry=pkg.exports[suffix?'./'+suffix:'.'];assert.ok(entry,'missing genuine public route '+spec);
 function choose(value){if(typeof value==='string')return value;if(value&&typeof value==='object')for(const key of kind==='types'?['types','import','default']:['import','default'])if(key in value){const result=choose(value[key]);if(result)return result;}}
 const target=choose(entry);assert.equal(typeof target,'string');assert.ok(target.startsWith('./')&&!target.split('/').includes('..'));return {key:name+'/'+target.slice(2)};
}
export function cdkModuleTypePublicClosure(model,kind) {
 const members=new Map(),edges=[],external=new Set(),dynamic=[];
 function visit(ref){if(ref.external){external.add(ref.external);return;}const key=ref.key;if(members.has(key))return;const text=model.sources.get(key);assert.equal(typeof text,'string','missing complete CDK dependency '+key);const source=ts.createSourceFile(key,text,ts.ScriptTarget.Latest,true);assert.equal(source.parseDiagnostics.length,0);members.set(key,{key,sha256:hash(text),bytes:Buffer.byteLength(text)});
  function add(spec){let target;if(spec.startsWith('.')){let path=posix.normalize(posix.join(posix.dirname(key),kind==='types'?spec.replace(/\.js$/,'.d.ts'):spec));assert.ok(!path.startsWith('../')&&!posix.isAbsolute(path));if(kind==='types'&&!model.sources.has(path)){const candidates=[path+'.d.ts',path+'/index.d.ts'].filter(p=>model.sources.has(p));assert.equal(candidates.length,1,'missing relative CDK declaration '+path);path=candidates[0];}target={key:path};}else target=cdkModuleTypePublicRoute(model,spec,kind);edges.push({from:key,specifier:spec,...target});visit(target);}
  for(const n of source.statements)if((ts.isImportDeclaration(n)||ts.isExportDeclaration(n))&&n.moduleSpecifier)add(n.moduleSpecifier.text);
  function nested(n){if(kind==='types'&&ts.isImportTypeNode(n)&&ts.isLiteralTypeNode(n.argument)&&ts.isStringLiteral(n.argument.literal))add(n.argument.literal.text);if(ts.isCallExpression(n)&&n.expression.kind===ts.SyntaxKind.ImportKeyword)dynamic.push({key,expression:n.getText(source)});ts.forEachChild(n,nested);}nested(source);
 }
 for(const spec of roots)visit(cdkModuleTypePublicRoute(model,spec,kind));assert.equal(dynamic.length,0,'unqualified dynamic CDK dependency');return {roots,members:[...members.values()].sort((a,b)=>a.key.localeCompare(b.key)),edges,external:[...external].sort()};
}
export function prepareCdkModuleTypePublicSubjects(root) {
 const bytes=readFileSync(join(root,CDK_MODULE_TYPE_SUBJECTS));assert.equal(hash(bytes),capsuleHash,'changed CDK module/type subject capsule');const capsule=JSON.parse(bytes),base=prepareMaterialPublicSubjects(root);
 try{assert.equal(capsule.base.sha256,base.capsule_hash);assert.deepEqual(capsule.subjects.map(s=>s.line),base.models.map(m=>m.line));
  for(const model of base.models){const subject=capsule.subjects.find(s=>s.line===model.line);assert.deepEqual(subject.cdk_archive,model.subject.packages.find(p=>p.name==='@angular/cdk'));
   for(const m of subject.additions){assert.equal(m.path,'compatibility/rc/cdk-module-type-public-sources/'+m.sha256+'.gz');assert.ok(m.key.startsWith('@angular/cdk/'));assert.equal(m.archive_member,'package/'+m.key.slice('@angular/cdk/'.length));assert.equal(model.sources.has(m.key),false);const stored=readFileSync(join(root,m.path));assert.equal(hash(stored),m.stored_sha256);const raw=gunzipSync(stored);assert.equal(hash(raw),m.sha256);assert.equal(raw.length,m.bytes);model.sources.set(m.key,raw.toString());const target=join(model.root,'node_modules',m.key);mkdirSync(dirname(target),{recursive:true});writeFileSync(target,raw);}
   for(const kind of ['runtime','types'])assert.deepEqual(cdkModuleTypePublicClosure(model,kind),subject.closures[kind]);model.cdk_module_type_subject=subject;
  }return {...base,cdk_module_type_capsule:{path:CDK_MODULE_TYPE_SUBJECTS,sha256:capsuleHash}};
 }catch(e){base.dispose();throw e;}
}
