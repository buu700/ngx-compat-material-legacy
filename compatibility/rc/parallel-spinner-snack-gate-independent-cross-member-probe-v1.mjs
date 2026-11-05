/** ONE cross-member copied fixture per actual shared/NEW gate constructor. No real writes/compiler. */
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {readFileSync,writeFileSync,mkdtempSync,mkdirSync,copyFileSync,rmSync,existsSync} from 'node:fs';
import {join,dirname} from 'node:path';
import {historicalContractRepairReaderSubject} from '../../scripts/historical-contract-repair-readers.mjs';
import {createSpinnerSnackGateContext} from '../../scripts/sass-spinner-snack-gate-integration.mjs';
import {currentSpinnerSnackBridgeSourceSubject} from './parallel-spinner-snack-public-bridge-integration-source-subject.mjs';
const root=process.cwd(),hash=b=>createHash('sha256').update(b).digest('hex'),output=process.argv[2];assert.ok(output&&!existsSync(output));
const fixed=JSON.parse(readFileSync(join(root,'compatibility/rc/parallel-spinner-snack-gate-independent-js-helper-controls-v1.json'))).lines.find(r=>r.line==='21.x').actual_provided_reader_paths,results=[];
for(const kind of ['shared-reader','new-gate-helper']){
 const paths=kind==='shared-reader'?historicalContractRepairReaderSubject({root}).bound.map(r=>r.path):fixed;
 const fixture=mkdtempSync(join(root,'compatibility/rc/parallel-spinner-snack-gate-independent-cross-member-fixture-'));
 try{
  for(const p of paths){const out=join(fixture,p);mkdirSync(dirname(out),{recursive:true});copyFileSync(join(root,p),out);}
  const old=kind==='new-gate-helper'?currentSpinnerSnackBridgeSourceSubject({root:fixture}):null;
  const trigger=kind==='shared-reader'?paths.at(-1):old.bound.at(-1).path;
  const victim=kind==='shared-reader'?paths[0]:'projects/ngx-material-legacy/styles/progress-spinner/_progress-spinner-theme.scss';assert.notEqual(trigger,victim);assert.ok(paths.includes(victim));
  let armed=false,changed=false,at=-1;const trace=[];
  const read=p=>{
   const before=readFileSync(join(fixture,p));trace.push(p);
   if(armed&&trace.length-1===at){assert.equal(p,trigger);armed=false;changed=true;writeFileSync(join(fixture,victim),Buffer.concat([readFileSync(join(fixture,victim)),Buffer.from('\n/* copied-only cross-member mutation */')]));}
   const after=readFileSync(join(fixture,p));assert.ok(before.equals(after),'current-path physical postcallback reread changed');return before;
  };
  const source=kind==='shared-reader'?historicalContractRepairReaderSubject({root:fixture,read}):createSpinnerSnackGateContext({root:fixture,read});
  trace.length=0;source.assertCurrent();const ordered=trace.slice();at=ordered.lastIndexOf(trigger);assert.equal(at,ordered.length-1);assert.ok(ordered.lastIndexOf(victim)<at);
  const before=readFileSync(join(fixture,victim));trace.length=0;armed=true;let accepted=true;try{source.assertCurrent();}catch{accepted=false;}
  assert.equal(changed,true);assert.notEqual(hash(before),hash(readFileSync(join(fixture,victim))));let nextRejected=false;try{source.assertCurrent();}catch{nextRejected=true;}
  assert.equal(nextRejected,true);results.push({kind,trigger,victim,trace_length:ordered.length,trigger_position:at,last_victim_read_position:ordered.lastIndexOf(victim),
   accepted_guard_during_cross_member_mutation:accepted,next_guard_rejected:nextRejected,provided_callback_includes_successful_pre_and_post_physical_CURRENT_PATH_equality:true,
   copied_current_paths:paths.length,real_inputs_mutated:false});
 }finally{rmSync(fixture,{recursive:true});}
}
const refs=['scripts/historical-contract-repair-readers.mjs','scripts/sass-spinner-snack-gate-integration.mjs'].map(path=>{const raw=readFileSync(join(root,path));return {path,sha256:hash(raw),bytes:raw.length};});
writeFileSync(output,JSON.stringify({schema_version:1,role:'Independent actual constructor cross-member closure triage with current-path postcallback reread adapter on owned copies',current_source_refs:refs,results,fresh_compiles:0,gate_or_owner_credit:false},null,2)+'\n');console.log(JSON.stringify(results));
