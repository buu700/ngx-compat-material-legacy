/** Copyright Google LLC All Rights Reserved.
 * Copyright (c) 2026 Ryan Lester. MIT license; see LICENSE. */
/** Narrow copied-fixture closure controls; no producer or compiler execution. */
import assert from 'node:assert/strict';
import {readFileSync,writeFileSync,mkdirSync,mkdtempSync,copyFileSync,rmSync} from 'node:fs';
import {join,dirname} from 'node:path';
import {createHash} from 'node:crypto';
import {historicalContractRepairReaderSubject} from '../../scripts/historical-contract-repair-readers.mjs';
const root=process.cwd(),P='compatibility/rc/parallel-spinner-snack-public-bridge-gate-successor-',read=p=>readFileSync(join(root,p)),hash=b=>createHash('sha256').update(b).digest('hex');
const baseline=historicalContractRepairReaderSubject({root,read}),last=baseline.bound.at(-1).path,earlier=baseline.bound[0].path,transition=baseline.transitions.find(r=>r.path===last);assert.ok(transition);assert.notEqual(last,earlier);
const outcomes=[];
function withFixture(run){const fixture=mkdtempSync(join(root,P+'global-physical-fixture-'));try{for(const ref of baseline.bound){const out=join(fixture,ref.path);mkdirSync(dirname(out),{recursive:true});copyFileSync(join(root,ref.path),out);}return run(fixture);}finally{rmSync(fixture,{recursive:true});}}
const add=(fixture,path)=>{const file=join(fixture,path);writeFileSync(file,Buffer.concat([readFileSync(file),Buffer.from('\n/* copied closure mutation */')]));};
for(const route of ['constructor','assertCurrent','qualify','predecessorReference','comparisonBytes'])for(const target of [last,earlier])withFixture(fixture=>{
 let armed=route==='constructor',changed=0;
 const callback=path=>{const raw=readFileSync(join(fixture,path));if(armed&&path===last){armed=false;changed++;add(fixture,target);}return raw;};
 let subject,error;try{subject=historicalContractRepairReaderSubject({root:fixture,read:callback});if(route!=='constructor'){armed=true;if(route==='assertCurrent')subject[route]();else subject[route]({path:last,...transition.before});}}catch(e){error=String(e);}
 assert.equal(changed,1);assert.ok(error,'source mutation was accepted: '+route+' '+target);outcomes.push({route,callback:'genuine-before-copy-mutation',target,rejected:true});
});
for(const route of ['qualify','predecessorReference','comparisonBytes'])withFixture(fixture=>{
 const subject=historicalContractRepairReaderSubject({root:fixture,read:path=>readFileSync(join(fixture,path))});let called=0;
 const ref={path:last,...transition.before};Object.defineProperty(ref,'extra',{enumerable:true,get(){called++;add(fixture,earlier);return 'metadata';}});
 assert.throws(()=>subject[route](ref));assert.equal(called,1);outcomes.push({route,callback:'metadata-copy-mutates-earlier-source',target:earlier,rejected:true});
});
withFixture(fixture=>{
 let getterCalls=0;const callback=path=>{const raw=readFileSync(join(fixture,path));Object.defineProperty(raw,'equals',{get(){getterCalls++;throw Error('caller equals getter executed');}});return raw;};
 const subject=historicalContractRepairReaderSubject({root:fixture,read:callback});subject.assertCurrent();for(const route of ['qualify','predecessorReference','comparisonBytes'])assert.ok(subject[route]({path:last,...transition.before}));assert.equal(getterCalls,0);outcomes.push({route:'all-positive-routes',caller_buffer_equals_getter_calls:getterCalls,accepted:true});
});
baseline.assertCurrent();const out={schema_version:1,role:'Trusted whole-bound final physical sweep controls against actual shared reader',line:baseline.line,bound_count:baseline.bound.length,current_reader:{path:'scripts/historical-contract-repair-readers.mjs',sha256:hash(read('scripts/historical-contract-repair-readers.mjs')),bytes:read('scripts/historical-contract-repair-readers.mjs').length},outcomes,rejections:outcomes.filter(r=>r.rejected).length,real_inputs_mutated:false,compiler_executed:false,full_owner_executed:false,g11_claim:'not-passed'};writeFileSync(process.argv[2],JSON.stringify(out,null,2)+'\n',{flag:'wx'});console.log(JSON.stringify({line:out.line,bound_count:out.bound_count,rejections:out.rejections,caller_buffer_equals_getter_calls:0}));
