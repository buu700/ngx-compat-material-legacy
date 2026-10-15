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
import {dirname,join,resolve,posix} from 'node:path';
import {fileURLToPath} from 'node:url';
import {createRequire} from 'node:module';
import {gunzipSync} from 'node:zlib';
import {prepareMaterialPublicSubjects} from './material-public-subjects.mjs';
const rootDefault=resolve(dirname(fileURLToPath(import.meta.url)),'..'),require=createRequire(import.meta.url),ts=require('typescript'),hash=b=>createHash('sha256').update(b).digest('hex');
export function prepareRemainingIdentitySubjects(root=rootDefault){
 const path='compatibility/rc/remaining-identity-public-subjects.json',bytes=readFileSync(join(root,path));assert.equal(hash(bytes),'c3600dff7acf9eeb0a0bbd0fd893273e392592fc1bae06110fb792ffe673a8fc');const capsule=JSON.parse(bytes),loaded=prepareMaterialPublicSubjects(root);
 try{for(const model of loaded.models){const subject=capsule.subjects.find(s=>s.line===model.line);assert.ok(subject);for(const pkg of subject.packages)assert.deepEqual(pkg,model.subject.packages.find(p=>p.name===pkg.name));
  for(const member of subject.members){let raw;if(member.path){assert.equal(member.path,'compatibility/rc/remaining-identity-runtime-sources/'+member.sha256+'.gz');const stored=readFileSync(join(root,member.path));assert.equal(hash(stored),member.stored_sha256);raw=gunzipSync(stored);}else{assert.ok(model.sources.has(member.key));raw=Buffer.from(model.sources.get(member.key));}assert.equal(hash(raw),member.sha256);assert.equal(raw.length,member.bytes);assert.ok(!member.key.split('/').includes('..'));const target=join(model.root,'node_modules',member.key);if(existsSync(target))assert.deepEqual(readFileSync(target),raw);else{mkdirSync(dirname(target),{recursive:true});writeFileSync(target,raw);}if(model.sources.has(member.key))assert.equal(model.sources.get(member.key),raw.toString());else model.sources.set(member.key,raw.toString());}
  const route=spec=>{const parts=spec.split('/'),pkg=parts.slice(0,2).join('/'),rest=parts.slice(2).join('/'),value=model.packages.get(pkg)?.exports[rest?'./'+rest:'.'];assert.ok(value);const pick=v=>typeof v==='string'?v:['import','default'].map(k=>v?.[k]).filter(Boolean).map(pick).find(Boolean);return pkg+'/'+pick(value).replace(/^\.\//,'');};
  const members=new Map(subject.members.map(m=>[m.key,m])),seen=new Set(),edges=[],external=new Set();
  function visit(key){if(seen.has(key))return;assert.ok(members.has(key),'incomplete genuine runtime closure '+key);seen.add(key);const source=ts.createSourceFile(key,model.sources.get(key),ts.ScriptTarget.Latest,true);assert.equal(source.parseDiagnostics.length,0);for(const node of source.statements)if((ts.isImportDeclaration(node)||ts.isExportDeclaration(node))&&node.moduleSpecifier){const spec=node.moduleSpecifier.text;if(!spec.startsWith('.')&&!spec.startsWith('@angular/')){assert.ok(['rxjs','rxjs/operators','tslib'].includes(spec));external.add(spec);continue;}const next=spec.startsWith('.')?posix.normalize(posix.join(posix.dirname(key),spec)):route(spec);edges.push({from:key,specifier:spec,to:next});visit(next);}}
  for(const spec of subject.roots)visit(route(spec));assert.equal(seen.size,members.size);assert.deepEqual(edges,subject.edges);assert.deepEqual([...external].sort(),subject.external);
  const zoneRoot=dirname(require.resolve('zone.js/package.json'));symlinkSync(zoneRoot,join(model.root,'node_modules/zone.js'),'dir');model.borrowed_zone=JSON.parse(readFileSync(join(zoneRoot,'package.json'))).version;model.remaining_identity_subject=subject;
 }
 return {...loaded,runtime_capsule:{path,sha256:hash(bytes)}};
 }catch(error){loaded.dispose();throw error;}
}
