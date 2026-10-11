/**
 * @license
 * Copyright Google LLC All Rights Reserved.
 * Copyright (c) 2026 Ryan Lester.
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.io/license
 */
/** Whole authenticated public a11y modules with genuine Core and RxJS, without an Angular view. */
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {readFileSync} from 'node:fs';
import {createRequire} from 'node:module';
import {dirname,join,posix,resolve} from 'node:path';
import {fileURLToPath} from 'node:url';
import {SourceTextModule,SyntheticModule} from 'node:vm';
import {gunzipSync} from 'node:zlib';
import {elementRefSubjects} from './element-ref-use-review.mjs';
const rootDefault=resolve(dirname(fileURLToPath(import.meta.url)),'..'),require=createRequire(import.meta.url);
const hash=bytes=>createHash('sha256').update(bytes).digest('hex'),capsuleHash='97733629aa03a8faa5dfa88ccf96efa9f1cb3b40914f65efed7123870eedc0fb';
export async function keyManagerPublicSubjects(root=rootDefault){
 const bytes=readFileSync(join(root,'compatibility/rc/key-manager-public-subjects.json'));assert.equal(hash(bytes),capsuleHash);
 const capsule=JSON.parse(bytes),core=await elementRefSubjects(root),rxjs=require('rxjs'),operators=require('rxjs/operators'),models=[];
 try{
  for(const subject of capsule.subjects){
   const framework=core.models.find(m=>m.subject.line===subject.line);assert.ok(framework);assert.equal(framework.runtime.VERSION.full,subject.framework_version);
   const sources=new Map(),packages=new Map(),modules=new Map(),edges=[],bridges=new Map();
   for(const pkg of subject.packages){
    for(const member of pkg.members){const compressed=readFileSync(join(root,member.path));assert.equal(hash(compressed),member.gzip_sha256);const raw=gunzipSync(compressed);assert.equal(hash(raw),member.sha256);assert.equal(raw.length,member.bytes);const key=pkg.package+'/'+member.archive_member.replace(/^package\//,'');assert.ok(!sources.has(key));sources.set(key,raw.toString());}
    const manifest=JSON.parse(sources.get(pkg.package+'/package.json'));assert.equal(manifest.name,pkg.package);assert.equal(manifest.version,pkg.version);packages.set(pkg.package,manifest);
   }
   for(const [specifier,namespace]of [['@angular/core',framework.runtime],['rxjs',rxjs],['rxjs/operators',operators]])bridges.set(specifier,new SyntheticModule(Object.keys(namespace),function(){for(const name of Object.keys(namespace))this.setExport(name,namespace[name]);},{identifier:specifier}));
   function publicPath(specifier){const parts=specifier.split('/'),name=parts.slice(0,2).join('/'),pkg=packages.get(name);assert.ok(pkg,'unreviewed external package '+specifier);const route=parts.length===2?'.':'./'+parts.slice(2).join('/'),target=pkg.exports[route]?.default;assert.equal(typeof target,'string');return name+'/'+target.replace(/^\.\//,'');}
   function moduleFor(key){if(!modules.has(key)){assert.ok(sources.has(key),'missing complete runtime source '+key);modules.set(key,new SourceTextModule(sources.get(key),{identifier:key}));}return modules.get(key);}
   const linker=(specifier,importer)=>{
    if(bridges.has(specifier)){edges.push({from:importer.identifier,specifier,bridge:specifier});return bridges.get(specifier);}
    const target=specifier.startsWith('.')?posix.normalize(posix.join(posix.dirname(importer.identifier),specifier)):publicPath(specifier);assert.ok(!target.includes('/../'));edges.push({from:importer.identifier,specifier,target});return moduleFor(target);
   };
   // Genuine matching compiler publishes Angular's JIT facade for untouched partial declarations.
   // No package installer or build runs; unrelated component factories are not instantiated.
   const compiler=moduleFor(publicPath('@angular/compiler'));await compiler.link(linker);await compiler.evaluate();assert.equal(compiler.namespace.VERSION.full,subject.framework_version);
   const entry=moduleFor(publicPath('@angular/cdk/a11y'));await entry.link(linker);await entry.evaluate();
   const runtime=entry.namespace;for(const name of ['FocusKeyManager','ActiveDescendantKeyManager','ListKeyManager'])assert.equal(typeof runtime[name],'function');
   assert.equal(Object.getPrototypeOf(runtime.FocusKeyManager.prototype),runtime.ListKeyManager.prototype);assert.equal(Object.getPrototypeOf(runtime.ActiveDescendantKeyManager.prototype),runtime.ListKeyManager.prototype);
   models.push({subject,sources,packages,runtime,framework,public_entry:entry.identifier,edges,complete_runtime_modules:[...modules].map(([path])=>({path,sha256:hash(sources.get(path))}))});
  }
  return {models,capsule_sha256:capsuleHash,rxjs:{version:require('rxjs/package.json').version,entry_sha256:hash(readFileSync(require.resolve('rxjs'))),operators_sha256:hash(readFileSync(require.resolve('rxjs/operators'))),scope:'Borrowed host RxJS only, not runtime/family floor qualification'},dispose:core.dispose};
 }catch(error){core.dispose();throw error;}
}
