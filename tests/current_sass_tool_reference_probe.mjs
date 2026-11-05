/**
 * @license
 * Copyright Google LLC All Rights Reserved.
 * Copyright (c) 2026 Ryan Lester.
 * Use of this source code is governed by the MIT license in LICENSE.
 */
import assert from 'node:assert/strict';
import {readFileSync,writeFileSync} from 'node:fs';
import {join} from 'node:path';
import {createHash} from 'node:crypto';
import {currentSassToolReferenceSubject} from '../scripts/current-sass-tool-references.mjs';
import {historicalContractRepairReaderSubject} from '../scripts/historical-contract-repair-readers.mjs';
const root=process.argv[2],checks=[];
const hash=raw=>createHash('sha256').update(raw).digest('hex');
const check=(name,operation)=>{operation();checks.push(name);};
const source=currentSassToolReferenceSubject({root});
check('current maintained dispatch',()=>assert.deepEqual(historicalContractRepairReaderSubject({root}).transitions,source.transitions));
check('retained old and exact current identities',()=>{
 for(const row of source.transitions){
  const before={path:row.path,...row.before},after={path:row.path,...row.after};
  assert.deepEqual(source.qualify(before),after);assert.deepEqual(source.qualify(after),after);
  assert.deepEqual(source.predecessorReference(after),before);
  assert.equal(hash(source.comparisonBytes(before)),before.sha256);
  assert.equal(hash(source.comparisonBytes(after)),after.sha256);
 }
});
const first=source.transitions[0],ref={path:first.path,...first.before};
check('unknown hash and byte length rejected',()=>{
 assert.equal(source.qualify({...ref,sha256:'0'.repeat(64)}),null);
 assert.throws(()=>source.qualify({...ref,bytes:ref.bytes+1}));
 assert.equal(source.ownsReference({...ref,bytes:ref.bytes+1}),false);
 assert.equal(source.qualify({path:'unowned-file.mjs',sha256:'0'.repeat(64)}),null);
});
check('public metadata cannot alter authority',()=>{
 const transitions=source.transitions,bound=source.bound;transitions[0].after.sha256='0'.repeat(64);bound[0].sha256='0'.repeat(64);
 assert.notEqual(source.transitions[0].after.sha256,transitions[0].after.sha256);source.assertCurrent();assert.deepEqual(source.qualify(ref),{path:first.path,...first.after});
});
check('no accessor or proxy evaluation',()=>{
 let calls=0;const value={...ref};Object.defineProperty(value,'extra',{enumerable:true,get(){calls++;throw Error('getter');}});
 assert.throws(()=>source.qualify(value));assert.throws(()=>source.qualify(new Proxy(ref,{get(){calls++;throw Error('proxy');}})));assert.equal(calls,0);
});
check('nonphysical callback rejected',()=>assert.throws(()=>currentSassToolReferenceSubject({root,read:()=>Buffer.from('wrong')})));
check('late physical mutation rejected and restored',()=>{
 const path=join(root,first.path),raw=readFileSync(path);
 try{writeFileSync(path,Buffer.concat([raw,Buffer.from('\n// changed\n')]));assert.throws(()=>source.assertCurrent());}
 finally{writeFileSync(path,raw);}
 source.assertCurrent();
});
check('last callback cannot change earlier bound file',()=>{
 const path=join(root,'scripts/current-sass-tool-references.mjs'),raw=readFileSync(path),last=source.bound.at(-1).path;let armed=false;
 const live=currentSassToolReferenceSubject({root,read:path=>{
  const bytes=readFileSync(join(root,path));if(armed&&path===last){armed=false;writeFileSync(join(root,'scripts/current-sass-tool-references.mjs'),Buffer.concat([raw,Buffer.from('\n// changed\n')]));}return bytes;
 }});
 try{armed=true;assert.throws(()=>live.assertCurrent());}finally{writeFileSync(path,raw);}
 live.assertCurrent();
});
console.log(JSON.stringify({line:source.line,transitions:source.transitions.length,transition_rows:source.transitions,bound:source.bound.length,checks,compiler_calls:0,old_constructor_executed:false,artifact_or_audit_admission_granted:false}));
