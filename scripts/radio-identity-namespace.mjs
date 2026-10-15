/**
 * @license
 * Copyright Google LLC All Rights Reserved.
 * Copyright (c) 2026 Ryan Lester.
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.io/license
 */
import assert from 'node:assert/strict';
import {readFileSync,writeFileSync,mkdirSync,existsSync} from 'node:fs';
import {createHash} from 'node:crypto';
import {dirname,join,resolve,posix} from 'node:path';
import {fileURLToPath} from 'node:url';
import {gunzipSync} from 'node:zlib';
import {createRequire} from 'node:module';
import {prepareRadioDispatcherSubjects} from './radio-dispatcher-use-review.mjs';
const require=createRequire(import.meta.url),ts=require('typescript');
const rootDefault=resolve(dirname(fileURLToPath(import.meta.url)),'..');
export const radioIdentityPath='projects/ngx-material-legacy/legacy-radio/internal/radio-base.ts';
export const radioIdentityEdits=[
  ['`mat-radio-group-${nextUniqueId++}`','`mat-radio-group-${nextUniqueId++}-legacy`'],
  ['`mat-radio-${++nextUniqueId}`','`mat-radio-${++nextUniqueId}-legacy`'],
];
const hash=b=>createHash('sha256').update(b).digest('hex');
export function reverseRadioIdentityNamespace(text){
  for(const [before,after] of radioIdentityEdits){assert.equal(text.split(after).length,2,'radio identity change must be unique');text=text.replace(after,before);}
  return text;
}
export function inspectRadioIdentityNamespace({root=rootDefault,readSource}={}){
  const worksheet=JSON.parse(readFileSync(join(root,'compatibility/rc/radio-identity-namespace-worksheet.json')));
  const text=(readSource?readSource(radioIdentityPath):readFileSync(join(root,radioIdentityPath))).toString();
  assert.equal(hash(reverseRadioIdentityNamespace(text)),worksheet.product_subject.before_sha256,'radio repair exceeds its two literal spans');
  return {path:radioIdentityPath,before_sha256:worksheet.product_subject.before_sha256,candidate_sha256:hash(text),edits:radioIdentityEdits};
}
export function prepareRadioIdentitySubjects(root=rootDefault){
  const path='compatibility/rc/radio-peer-runtime-subjects.json',bytes=readFileSync(join(root,path));
  assert.equal(hash(bytes),'eab7d84753a79c014310f022daeb1e54b4700ac7f44f15d1a69cba4fce6e1329');
  const capsule=JSON.parse(bytes),loaded=prepareRadioDispatcherSubjects(root);
  try{for(const model of loaded.models){
    const subject=capsule.subjects.find(s=>s.line===model.line);assert.ok(subject);
    for(const pkg of subject.packages)assert.deepEqual(pkg,model.subject.packages.find(p=>p.name===pkg.name));
    for(const member of subject.members){
      let raw;if(member.path){assert.equal(member.path,'compatibility/rc/radio-peer-runtime-source-members/'+member.sha256+'.gz');const stored=readFileSync(join(root,member.path));assert.equal(hash(stored),member.stored_sha256);raw=gunzipSync(stored);}
      else {assert.ok(model.sources.has(member.key),'missing reused framework member');raw=Buffer.from(model.sources.get(member.key));}
      assert.equal(hash(raw),member.sha256);assert.equal(raw.length,member.bytes);
      const target=join(model.root,'node_modules',member.key);assert.ok(!member.key.split('/').includes('..'));
      if(existsSync(target))assert.deepEqual(readFileSync(target),raw);else{mkdirSync(dirname(target),{recursive:true});writeFileSync(target,raw);}
      if(model.sources.has(member.key))assert.equal(model.sources.get(member.key),raw.toString());else model.sources.set(member.key,raw.toString());
    }
    const members=new Map(subject.members.map(m=>[m.key,m])),seen=new Set(),edges=[],external=new Set();
    const route=spec=>{const parts=spec.split('/'),pkg=parts.slice(0,2).join('/'),rest=parts.slice(2).join('/'),value=model.packages.get(pkg)?.exports[rest?'./'+rest:'.'];assert.ok(value,'missing public radio export');const pick=v=>typeof v==='string'?v:['import','default'].map(k=>v?.[k]).filter(Boolean).map(pick).find(Boolean);return pkg+'/'+pick(value).replace(/^\.\//,'');};
    function visit(key){if(seen.has(key))return;assert.ok(members.has(key),'incomplete public radio closure '+key);seen.add(key);const source=ts.createSourceFile(key,model.sources.get(key),ts.ScriptTarget.Latest,true);assert.equal(source.parseDiagnostics.length,0);
      for(const node of source.statements)if((ts.isImportDeclaration(node)||ts.isExportDeclaration(node))&&node.moduleSpecifier){const spec=node.moduleSpecifier.text;if(!spec.startsWith('.')&&!spec.startsWith('@angular/')){assert.ok(['rxjs','rxjs/operators','tslib'].includes(spec));external.add(spec);continue;}const next=spec.startsWith('.')?posix.normalize(posix.join(posix.dirname(key),spec)):route(spec);edges.push({from:key,specifier:spec,to:next});visit(next);}}
    for(const spec of subject.roots)visit(route(spec));assert.equal(seen.size,members.size);assert.deepEqual(edges,subject.edges);assert.deepEqual([...external].sort(),subject.external);model.radio_runtime_subject=subject;
  }
  return {...loaded,radio_runtime_capsule:{path,sha256:hash(bytes)}};
  }catch(error){loaded.dispose();throw error;}
}
