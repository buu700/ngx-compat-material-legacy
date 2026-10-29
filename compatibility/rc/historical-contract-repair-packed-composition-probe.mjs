/**
 * @license
 * Copyright Google LLC All Rights Reserved.
 * Copyright (c) 2026 Ryan Lester.
 * Use of this source code is governed by the MIT license in LICENSE.
 */
/** Source composition and late rejection controls; no current artifact execution. */
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {writeFileSync} from 'node:fs';
import {gunzipSync} from 'node:zlib';
import {qualifyPackedProductSourceRepairs} from '../../scripts/packed-product-source-recovery.mjs';
import {readHistoricalContractRepairOwnerMember} from '../../scripts/historical-contract-repair-readers.mjs';
const root=process.cwd(),hash=b=>createHash('sha256').update(b).digest('hex'),start=performance.now();
const out=process.argv[2];assert.ok(out?.startsWith('compatibility/rc/historical-contract-repair-packed-'));
let altered;
const read=path=>{const raw=readHistoricalContractRepairOwnerMember(root,path);return path===altered?Buffer.concat([raw,Buffer.from('\n/* late test mutation */\n')]):raw;};
const record={schema_version:1,probe:'packed-contract-composition',current_artifact_execution_qualified:false,g11_claim:'not-passed'};
try{
 const product=JSON.parse(read('compatibility/rc/snack-dom-source-context-product-inputs.json'));
 const context=JSON.parse(read('compatibility/rc/snack-dom-source-context-inputs.json'));
 const historyRaw=read(context.history_product.path);assert.equal(hash(historyRaw),context.history_product.sha256);
 const history=JSON.parse(gunzipSync(historyRaw)),contract=JSON.parse(read('compatibility/rc/historical-contract-repair-source-inputs.json'));
 const q=qualifyPackedProductSourceRepairs({root,read,line:product.line,data:product.packed_repairs,history,registry:product});
 assert.equal(q.preimages.size,16);assert.equal(q.contract_preimages.size,5);
 assert.deepEqual(q.historical_packed_targets,product.packed_repairs.targets);
 assert.equal(q.packed_execution_evidence_scope,'historical-only');assert.equal(q.current_artifact_execution_qualified,false);
 assert.equal(q.current_coordinator_native_or_floor_qualified,false);
 assert.equal(q.historical_contract_source_targets.length,4);
 for(const target of q.targets)assert.equal(hash(read(target.path)),target.sha256);
 for(const image of contract.images){assert.equal(hash(read(image.path)),image.after.sha256);assert.equal(hash(q.contract_preimages.get(image.path)),image.before.sha256);}
 const paths=[...new Set([...q.preimages.keys(),...q.contract_preimages.keys()])];assert.equal(paths.length,20);
 const controls=[];
 for(const path of paths){
  const comparison=q.read(path),saved=Buffer.from(comparison);comparison[0]^=1;assert.ok(q.read(path).equals(saved),'comparison read did not return a copy');
  altered=path;
  assert.throws(()=>q.read(path),undefined,'late comparison read admitted '+path);
  assert.throws(()=>q.assertCurrent(),undefined,'whole-subject late guard admitted '+path);
  altered=undefined;assert.ok(q.read(path).equals(saved));controls.push({path,comparison_read_rejected:true,whole_subject_rejected:true,returned_buffer_isolated:true});
 }
 q.assertCurrent();
 Object.assign(record,{status:'pass',line:product.line,immutable_product_population:history.product_members.length,original_packed_targets:q.historical_packed_targets,current_packed_targets:q.targets,current_contract_source_targets:q.historical_contract_source_targets,historical_source:q.source,historical_artifact:q.artifact,original_preimages:16,contract_preimages:5,late_paths:paths.length,late_rejections:controls.length*2,controls});
}catch(e){Object.assign(record,{status:'rejected',error:e.stack});process.exitCode=1;}
record.seconds=(performance.now()-start)/1000;writeFileSync(out,JSON.stringify(record,null,2)+'\n');console.log(JSON.stringify({status:record.status,line:record.line,seconds:record.seconds,late_rejections:record.late_rejections,error:record.error}));
