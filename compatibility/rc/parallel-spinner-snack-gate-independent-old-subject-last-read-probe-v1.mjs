/** ONE parent-requested actual oldSubject→C02→NEWgate copied-fixture callback window. */
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {readFileSync,writeFileSync,mkdtempSync,mkdirSync,copyFileSync,rmSync,existsSync} from 'node:fs';
import {join,dirname} from 'node:path';
import {createSpinnerSnackGateContext} from '../../scripts/sass-spinner-snack-gate-integration.mjs';
import {currentSpinnerSnackBridgeSourceSubject} from './parallel-spinner-snack-public-bridge-integration-source-subject.mjs';
const root=process.cwd(),hash=b=>createHash('sha256').update(b).digest('hex'),output=process.argv[2];assert.ok(output&&!existsSync(output));
const oldReport=JSON.parse(readFileSync(join(root,'compatibility/rc/parallel-spinner-snack-gate-independent-js-helper-controls-v1.json'))),paths=oldReport.lines.find(r=>r.line==='21.x').actual_provided_reader_paths;
const fixture=mkdtempSync(join(root,'compatibility/rc/parallel-spinner-snack-gate-independent-old-last-read-fixture-'));
try{
 for(const p of paths){const out=join(fixture,p);mkdirSync(dirname(out),{recursive:true});copyFileSync(join(root,p),out);}
 const old=currentSpinnerSnackBridgeSourceSubject({root:fixture}),target=old.bound.at(-1).path;
 const trace=[];let armed=false,changed=false,position=-1;
 const read=p=>{const raw=readFileSync(join(fixture,p));trace.push(p);if(armed&&trace.length-1===position){assert.equal(p,target);armed=false;changed=true;writeFileSync(join(fixture,p),Buffer.concat([raw,Buffer.from('\n/* independent copied-only LAST oldSubject callback */')]));}return raw;};
 const context=createSpinnerSnackGateContext({root:fixture,read});trace.length=0;context.assertCurrent();const ordered=trace.slice();position=ordered.lastIndexOf(target);assert.ok(position>=0);assert.equal(position,ordered.length-1,'actual oldSubject last boundmember is not final NEWgate read');
 const before=readFileSync(join(fixture,target));trace.length=0;armed=true;let accepted=true;try{context.assertCurrent();}catch{accepted=false;}
 assert.equal(changed,true);assert.notEqual(hash(readFileSync(join(fixture,target))),hash(before));let nextRejected=false;try{context.assertCurrent();}catch{nextRejected=true;}
 assert.equal(nextRejected,true);const report={schema_version:1,role:'ONE independent actual last oldSubject member reached via frozenC02 and NEWgate assertion on owned current-byte copies',
  target,actual_ordered_read_trace:ordered,trace_length:ordered.length,last_mutation_position:position,target_occurrences:ordered.filter(p=>p===target).length,
  accepted_guard_during_final_callback_physical_mutation:accepted,next_guard_rejected:nextRejected,callback_returned_genuine_prechange_bytes:true,copied_paths:paths.length,
  real_inputs_mutated:false,fresh_compiles:0,gate_or_owner_credit:false,current_sources:['scripts/sass-spinner-snack-gate-integration.mjs','scripts/sass-spinner-snack-bridge-contract.mjs','compatibility/rc/parallel-spinner-snack-public-bridge-integration-source-subject.mjs'].map(path=>{const raw=readFileSync(join(root,path));return {path,sha256:hash(raw),bytes:raw.length};})};
 writeFileSync(output,JSON.stringify(report,null,2)+'\n');console.log(JSON.stringify({target,trace_length:ordered.length,last_mutation_position:position,target_occurrences:report.target_occurrences,accepted,nextRejected,real_inputs_mutated:false}));
}finally{rmSync(fixture,{recursive:true});}
