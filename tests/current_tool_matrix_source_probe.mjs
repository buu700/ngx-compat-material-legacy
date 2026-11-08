/** @license Copyright Google LLC All Rights Reserved.
 * Copyright (c) 2026 Ryan Lester. Use of this source code is governed by the MIT license in LICENSE. */
import assert from 'node:assert/strict';
import {readFileSync,writeFileSync,symlinkSync,unlinkSync,renameSync} from 'node:fs';
import {resolve} from 'node:path';
import {execFileSync} from 'node:child_process';
import {currentToolMatrixSource as make} from '../scripts/current-tool-matrix-source.mjs';
const root=resolve(process.argv[2]), source=make({root});source.assertCurrent();assert.equal(source.comparisonBytes(source.before).length,source.before.bytes);assert.equal(source.comparisonBytes(source.intermediate).length,source.intermediate.bytes);
assert.throws(()=>source.comparisonBytes({...source.before,sha256:'0'.repeat(64)}));

let hookCalls=0;for(const reference of [source.before,source.intermediate]){
 for(const field of ['path','sha256','bytes']){
  const nested={toJSON(){hookCalls++;try{make({root});}catch{}return reference[field];}};
  assert.throws(()=>source.comparisonBytes({...reference,[field]:nested}));
  const getter={...reference};Object.defineProperty(getter,field,{enumerable:true,get(){hookCalls++;throw Error('getter evaluated');}});assert.throws(()=>source.comparisonBytes(getter));
 }
 assert.throws(()=>source.comparisonBytes(new Proxy({...reference},{})));
}assert.equal(hookCalls,0);

const intermediateSha=source.intermediate.sha256;source.intermediate.sha256='0'.repeat(64);assert.throws(()=>source.comparisonBytes(source.intermediate));source.intermediate.sha256=intermediateSha;
const beforeSha=source.before.sha256;source.before.sha256='0'.repeat(64);assert.throws(()=>source.comparisonBytes(source.before));source.before.sha256=beforeSha;assert.equal(source.comparisonBytes(source.before).length,source.before.bytes);
const final=JSON.parse(readFileSync(resolve(root,'compatibility/rc/current-tool-matrix-final-product-v1.json')));const finalPaths=['compatibility/rc/current-tool-matrix-final-product-v1.json',final.predecessor_registry.path,final.current_registry.path,...final.source_transitions.flatMap(x=>[x.archive.path,x.after.path]),...final.structural_transitions.map(x=>x.archive.path)];
for(const path of [...finalPaths,'compatibility/rc/matrices/full-verify.json','compatibility/rc/current-tool-matrix-source-successor-v1.json','compatibility/rc/current-tool-matrix-input-successor-v1.json','compatibility/rc/historical-registry-before-pointer-v1.json','projects/ngx-material-legacy/legacy-autocomplete/autocomplete.spec.ts','compatibility/rc/parent-main-historical-pointer-epoch-review-v1.json','compatibility/rc/parent-main-autocomplete-pointer-state-review-v1.json','scripts/upstream-historical-behavior-evidence.mjs','testing/legacy-runner/historical-inventory.json','projects/ngx-material-legacy/legacy-input/input.spec.ts','projects/ngx-material-legacy/legacy-form-field/form-field.ts','compatibility/rc/parent-main-input-test-integrity-v2.json','compatibility/rc/parent-main-form-field-description-repair-v1.json']){
 const f=resolve(root,path),raw=readFileSync(f);
 try{writeFileSync(f,Buffer.concat([raw,Buffer.from('\n')]));assert.throws(()=>make({root}));assert.throws(()=>source.assertCurrent());}
 finally{writeFileSync(f,raw);}source.assertCurrent();
}
const historical=source.comparisonBytes(source.before);assert.throws(()=>make({root,read:path=>path===source.after.path?historical:readFileSync(resolve(root,path))}));
const inventoryPath='testing/legacy-runner/historical-inventory.json',oldInventory=execFileSync('git',['--no-replace-objects','show','1e26eefba6fa380b520ae05cb6f9ff3ea734545a:'+inventoryPath],{cwd:root});assert.throws(()=>make({root,read:path=>path===inventoryPath?oldInventory:readFileSync(resolve(root,path))}));
const file=resolve(root,source.after.path),saved=readFileSync(file);let armed=false,changed=false;
const live=make({root,read:path=>{const raw=readFileSync(resolve(root,path));if(armed&&!changed){writeFileSync(file,Buffer.concat([saved,Buffer.from('\n')]));changed=true;}return raw;}});
try{armed=true;assert.throws(()=>live.assertCurrent());assert.ok(changed);}finally{armed=false;writeFileSync(file,saved);}live.assertCurrent();
const crossPath=resolve(root,'projects/ngx-material-legacy/legacy-input/input.spec.ts'),crossSaved=readFileSync(crossPath);let crossArmed=false,crossStep=0;
const cross=make({root,read:path=>{const raw=readFileSync(resolve(root,path));if(crossArmed&&crossStep===0){writeFileSync(crossPath,Buffer.concat([crossSaved,Buffer.from('\n')]));crossStep=1;}else if(crossArmed&&crossStep===1){writeFileSync(crossPath,crossSaved);crossStep=2;}return raw;}});
try{crossArmed=true;assert.throws(()=>cross.assertCurrent());assert.equal(crossStep,1,'restoration callback must not run before rejection');}finally{crossArmed=false;writeFileSync(crossPath,crossSaved);}cross.assertCurrent();
let trigger=false,entered=false;const alias=root+'-alias';symlinkSync(root,alias,'dir');
try{
 const watched=make({root,read:path=>{const raw=readFileSync(resolve(root,path));if(trigger&&!entered){entered=true;assert.throws(()=>make({root:alias}));}return raw;}});
 trigger=true;assert.throws(()=>watched.assertCurrent(),/swallowed reentrant/);assert.ok(entered);trigger=false;watched.assertCurrent();
}finally{unlinkSync(alias);}
let called=0;const opts={};Object.defineProperty(opts,'root',{get(){called++;throw Error('getter')}});assert.throws(()=>make(opts));assert.throws(()=>make(new Proxy({root},{})));assert.equal(called,0);
const oldFile=file+'.saved';renameSync(file,oldFile);symlinkSync(oldFile,file);try{assert.throws(()=>make({root}));}finally{unlinkSync(file);renameSync(oldFile,file);}source.assertCurrent();
console.log(JSON.stringify({result:'pass',before:source.before,intermediate:source.intermediate,after:source.after,bound:source.bound}));
