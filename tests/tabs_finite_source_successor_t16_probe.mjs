/**
 * @license
 * Copyright Google LLC All Rights Reserved.
 * Copyright (c) 2026 Ryan Lester.
 * Use of this source code is governed by the MIT license in LICENSE.
 */
/** Scratch-only actual base-class frame preflight; no canonical owner run. */
import assert from 'node:assert/strict';
import {readFileSync,writeFileSync} from 'node:fs';
import {createRequire} from 'node:module';
import {join} from 'node:path';
import {pathToFileURL} from 'node:url';
import {createHash} from 'node:crypto';
const root=process.cwd(),mode=process.argv[2];
assert.ok(['baseline','cached-image','cached-function'].includes(mode));
const helper='scripts/tabs-finite-source-successor.mjs',file=join(root,helper);
const before=readFileSync(file),hash=b=>createHash('sha256').update(b).digest('hex');
const originalHash=hash(before),require=createRequire(join(root,'package.json'));
const identities=Object.fromEntries([helper,'scripts/base-class-removal-owner-source.mjs','scripts/upstream-base-class-removal-admission.cjs','compatibility/rc/parent-base-admission-tabs-source-successor-v1.json','tests/tabs_finite_source_successor_t16_probe.mjs','tests/tabs_finite_source_successor_t16_runner.py'].map(path=>[path,hash(readFileSync(join(root,path)))]));
let forwarded=0,marker='';
if(mode==='cached-image'){
 const old='function git(root,commit,path){';
 assert.equal(before.toString().split(old).length,2);
 const altered=Buffer.from(before.toString().replace(old,old+'/* scratch stale image */'));
 try{
  writeFileSync(file,altered);
  const cached=await import(pathToFileURL(file).href);
  assert.equal(cached.tabsFiniteSourceLoadedImage.sha256,hash(altered));
  assert.notEqual(cached.tabsFiniteSourceLoadedImage.sha256,originalHash);
 }finally{writeFileSync(file,before);}
 marker='loadedSourceReferences';
}else if(mode==='cached-function'){
 const actual=require(file),path=require.resolve(file),oldCache=require.cache[path];
 assert.ok(oldCache,'expected actual Node module cache entry');
 const original=actual.tabsFiniteSourceSuccessor;
 const fake=function tabsFiniteSourceSuccessor(...args){forwarded++;return Reflect.apply(original,this,args);};
 // Only the scratch process loader is changed: the source and captured image remain exact.
 require.cache[path]={...oldCache,exports:{...actual,tabsFiniteSourceSuccessor:fake}};
 assert.equal(require(file).tabsFiniteSourceSuccessor,fake);
 marker='loadedProducerFunctionSha256';
}
assert.ok(readFileSync(file).equals(before),'helper disk bytes not restored');
const owner=await import(pathToFileURL(join(root,'scripts/base-class-removal-owner-source.mjs')).href);
const sentinel=new Error('bounded callback milestone'),calls=[];
try{
 owner.baseClassRemovalCanonicalFrameSubject({root,read:path=>{calls.push(path);throw sentinel;}});
 assert.fail('expected bounded callback sentinel or targeted guard rejection');
}catch(error){
 if(mode==='baseline'){assert.equal(error,sentinel);assert.equal(calls.length,1);}
 else {assert.equal(error?.code,'ERR_ASSERTION');assert.match(error.message,new RegExp(marker));assert.equal(calls.length,0);}
}
assert.equal(forwarded,0);assert.ok(readFileSync(file).equals(before));
console.log(JSON.stringify({result:'pass',mode,identities,helper_sha256:originalHash,marker,callbacks:calls.length,
 forwarded,physical_restored:true,callback_milestone_only:mode==='baseline',full_owner_executed:false}));
