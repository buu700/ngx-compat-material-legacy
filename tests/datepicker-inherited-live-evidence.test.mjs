/** @license Copyright Google LLC All Rights Reserved. Copyright (c) 2026 Ryan Lester. MIT. */
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {datepickerCaseResults,verifyDatepickerLiveBody,datepickerOutputRecords} from '../scripts/datepicker-inherited-live-evidence.mjs';
const [zpath,fpath]=process.argv.slice(2);if(!zpath||!fpath)throw Error('expected two diagnostic result files');
const z=JSON.parse(readFileSync(zpath)),f=JSON.parse(readFileSync(fpath));const nonce=z.rows.nonce;assert.equal(f.rows.nonce,nonce);
const profile={id:'fixture-profile',browser_product:z.browser,recordHash:'r'.repeat(64)},binding={source_commit:'a'.repeat(40),source_tree:'b'.repeat(40)},library={sha256:'c'.repeat(64),bytes:42};
function result(d){return {browser:d.browser,rows:d.rows,tooling:d.tooling,bundle_inputs:[{path:'/synthetic',sha256:'d'.repeat(64)}],package_inventory_sha256:d.package_inventory_sha256};}
const results={zoneless:result(z),zoneful:result(f)},cases=datepickerCaseResults(results,nonce),body={kind:'datepicker-inherited-live-native',run_id:'run',invocation_id:'i',binding,source_commit:binding.source_commit,source_tree:binding.source_tree,artifact_sha256:library.sha256,nonce,toolchain_profile:profile.id,toolchain_record_sha256:profile.recordHash,fixture_exit_code:0,fixture_signal:null,results,all_cases:cases};
const args={binding,runId:'run',invocation:'i',library,profile};assert.deepEqual(verifyDatepickerLiveBody(body,args),cases);
const range='2d5942cb0fe86f9c3d26b1925b1d4390cfc6613b';for(const mode of ['zoneful','zoneless'])assert.equal(cases[range][mode].baseline,false);
for(const mutate of [x=>x.artifact_sha256='0'.repeat(64),x=>x.toolchain_profile='other',x=>x.fixture_exit_code=1,x=>x.results.zoneful.rows.nonce='0'.repeat(64),x=>x.all_cases[range].zoneful.baseline=true,x=>delete x.results.zoneless]){const copy=structuredClone(body);mutate(copy);assert.throws(()=>verifyDatepickerLiveBody(copy,args));}
const row={execution:'live-packed-native-datepicker',nonce,output:`datepicker-live-${nonce}.json`,sha256:'e'.repeat(64),bytes:123,run_id:'run',invocation_id:'i',ok:false};const a=datepickerOutputRecords([row,row],'run','i');assert.equal(a.length,1);assert.throws(()=>datepickerOutputRecords([row,{...row,sha256:'f'.repeat(64)}],'run','i'));assert.throws(()=>datepickerOutputRecords([{...row,nonce:'x'}],'run','i'));console.log('live raw case replay and identity controls passed; inputs are diagnostic');
