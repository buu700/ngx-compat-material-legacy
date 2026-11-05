/** ONE parent-requested actual C04 entry copied-fixture oldSubject callback reachability control. */
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {readFileSync,writeFileSync,mkdtempSync,mkdirSync,copyFileSync,rmSync,existsSync} from 'node:fs';
import {join,dirname} from 'node:path';
import {spinnerSnackC04Source} from '../../scripts/sass-spinner-snack-c04-source.mjs';
const root=process.cwd(),hash=b=>createHash('sha256').update(b).digest('hex'),output=process.argv[2];assert.ok(output&&!existsSync(output));
const sourcePaths=['scripts/sass-spinner-snack-c04-source.mjs','scripts/historical-contract-repair-readers.mjs','compatibility/rc/parallel-spinner-snack-public-bridge-integration-source-subject.mjs'];
const refs=sourcePaths.map(path=>{const raw=readFileSync(join(root,path));return {path,sha256:hash(raw),bytes:raw.length};});
const real=spinnerSnackC04Source({root,read:p=>readFileSync(join(root,p))}),paths=real.bound.map(r=>r.path),target=real.bridge.bound.at(-1).path;
const fixture=mkdtempSync(join(root,'compatibility/rc/parallel-spinner-snack-gate-independent-c04-last-read-fixture-'));
try{
 for(const p of paths){const out=join(fixture,p);mkdirSync(dirname(out),{recursive:true});copyFileSync(join(root,p),out);}
 let armed=false,changed=false,at=-1;const trace=[];
 const read=p=>{const raw=readFileSync(join(fixture,p));trace.push(p);if(armed&&trace.length-1===at){assert.equal(p,target);armed=false;changed=true;writeFileSync(join(fixture,p),Buffer.concat([raw,Buffer.from('\n/* copied-only C04 oldSubject last-source callback */')]));}return raw;};
 const context=spinnerSnackC04Source({root:fixture,read});trace.length=0;context.assertCurrent();const ordered=trace.slice();at=ordered.lastIndexOf(target);assert.ok(at>=0);assert.equal(ordered.slice(at+1).includes(target),false);
 const before=readFileSync(join(fixture,target));trace.length=0;armed=true;let accepted=true;try{context.assertCurrent();}catch{accepted=false;}
 assert.equal(changed,true);assert.notEqual(hash(readFileSync(join(fixture,target))),hash(before));let nextRejected=false;try{context.assertCurrent();}catch{nextRejected=true;}
 assert.equal(nextRejected,true);for(const ref of refs){const raw=readFileSync(join(root,ref.path));assert.equal(hash(raw),ref.sha256);assert.equal(raw.length,ref.bytes);}
 const report={schema_version:1,role:'ONE independent actual C04 entry frozen oldSubject last-source callback proof on owned current-byte copies',target,copied_paths:paths.length,
  actual_ordered_read_trace:ordered,target_occurrences:ordered.filter(p=>p===target).length,target_last_position:at,trace_length:ordered.length,
  remaining_later_callbacks:ordered.length-at-1,later_callbacks_never_reread_target:!ordered.slice(at+1).includes(target),
  accepted_guard_during_callback_physical_mutation:accepted,next_guard_rejected:nextRejected,callback_returned_genuine_prechange_bytes:true,
  current_sources:refs,real_inputs_mutated:false,fresh_compiles:0,full_owner_or_gate_executed:false};
 writeFileSync(output,JSON.stringify(report,null,2)+'\n');console.log(JSON.stringify({target,copied_paths:paths.length,trace_length:ordered.length,target_last_position:at,later_callbacks:ordered.length-at-1,accepted,nextRejected}));
}finally{rmSync(fixture,{recursive:true});}
