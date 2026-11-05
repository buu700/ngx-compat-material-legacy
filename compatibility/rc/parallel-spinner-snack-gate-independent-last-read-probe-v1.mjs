/** Actual current constructors, current-byte copied fixtures only. No real source mutation/compiler. */
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {readFileSync,writeFileSync,mkdtempSync,mkdirSync,copyFileSync,rmSync,existsSync} from 'node:fs';
import {join,dirname} from 'node:path';
import {historicalContractRepairReaderSubject} from '../../scripts/historical-contract-repair-readers.mjs';
import {createSpinnerSnackGateContext} from '../../scripts/sass-spinner-snack-gate-integration.mjs';
const root=process.cwd(),hash=b=>createHash('sha256').update(b).digest('hex');
const report=JSON.parse(readFileSync(join(root,'compatibility/rc/parallel-spinner-snack-gate-independent-js-helper-controls-v1.json')));
const refs=report.lines.find(r=>r.line==='21.x').actual_provided_reader_paths,results=[];
for(const kind of ['shared-reader','new-gate-helper']){
 const paths=kind==='shared-reader'?historicalContractRepairReaderSubject({root}).bound.map(r=>r.path):refs;
 const fixture=mkdtempSync(join(root,'compatibility/rc/parallel-spinner-snack-gate-independent-last-read-fixture-'));
 try{
  for(const p of paths){const out=join(fixture,p);mkdirSync(dirname(out),{recursive:true});copyFileSync(join(root,p),out);}
  let armed=false,changed=false;const target=kind==='shared-reader'?paths.at(-1):'scripts/sass-ripple-color-contract.mjs';
  const read=p=>{const raw=readFileSync(join(fixture,p));if(armed&&p===target){armed=false;changed=true;writeFileSync(join(fixture,p),Buffer.concat([raw,Buffer.from('\n/* independent copied-only post-snapshot mutation */')]));}return raw;};
  const subject=kind==='shared-reader'?historicalContractRepairReaderSubject({root:fixture,read}):createSpinnerSnackGateContext({root:fixture,read});
  const before=readFileSync(join(fixture,target));armed=true;let accepted=true;try{subject.assertCurrent();}catch{accepted=false;}
  assert.equal(changed,true);const after=readFileSync(join(fixture,target));assert.notEqual(hash(after),hash(before));let nextRejected=false;try{subject.assertCurrent();}catch{nextRejected=true;}
  assert.equal(nextRejected,true);results.push({kind,target,accepted_guard_during_callback_physical_mutation:accepted,next_guard_rejected:nextRejected,copied_paths:paths.length,callback_returned_genuine_prechange_bytes:true,real_inputs_mutated:false});
 }finally{rmSync(fixture,{recursive:true});}
}
const output=process.argv[2];assert.ok(output&&!existsSync(output));writeFileSync(output,JSON.stringify({schema_version:1,role:'Independent actual constructor last-read callback triage on owned current-byte copies',current_sources:['scripts/historical-contract-repair-readers.mjs','scripts/sass-spinner-snack-gate-integration.mjs'].map(path=>{const raw=readFileSync(join(root,path));return {path,sha256:hash(raw),bytes:raw.length};}),results,fresh_compiles:0,packed_or_owner_credit:false},null,2)+'\n');console.log(JSON.stringify(results));
