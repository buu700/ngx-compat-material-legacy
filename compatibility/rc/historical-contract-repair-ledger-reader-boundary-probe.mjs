/**
 * @license
 * Copyright Google LLC All Rights Reserved.
 * Copyright (c) 2026 Ryan Lester.
 * Use of this source code is governed by the MIT license in LICENSE.
 */
/** Current checker / historical metadata boundary; no full upstream traversal. */
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {writeFileSync} from 'node:fs';
import {inventoryReferenceOwnerContext} from '../../scripts/inventory-reference-owner.mjs';
import {readHistoricalContractRepairOwnerMember} from '../../scripts/historical-contract-repair-readers.mjs';
const root=process.cwd(),hash=b=>createHash('sha256').update(b).digest('hex'),start=performance.now();
let altered;
const read=path=>{const b=readHistoricalContractRepairOwnerMember(root,path);return path===altered?Buffer.concat([b,Buffer.from('\n/* late mutation */\n')]):b;};
const out=process.argv[2];assert.ok(out?.startsWith('compatibility/rc/historical-contract-repair-ledger-reader-'));
const report={schema_version:1,current_full_upstream_or_snack_context_qualified:false,current_native_packed_browser_floor_or_full_audit_qualified:false,g11_claim:'not-passed'};
try{
 const packet=JSON.parse(read('compatibility/rc/c04-inventory-owner-inputs.json')),q=inventoryReferenceOwnerContext({root,read});assert.equal(q.line,'main');
 const owner=packet.after_owner.path,inventory=packet.current_inventory.path,ledger=packet.before_ledger.path,workflow=packet.historical_workflow_metadata;
 assert.equal(hash(q.metadataRead(owner)),hash(read(owner)));assert.equal(hash(q.metadataRead(owner)),packet.after_owner.sha256);
 assert.equal(hash(q.metadataRead(inventory)),packet.prior_inventory_sha256);
 assert.equal(hash(q.metadataRead(ledger)),hash(q.before));assert.equal(hash(q.metadataRead(workflow.path)),workflow.before.sha256);
 const controls=[];
 for(const path of [owner,inventory,ledger,workflow.path]){
  const before=q.metadataRead(path);altered=path;assert.throws(()=>q.metadataRead(path));assert.throws(()=>q.assertCurrent());altered=undefined;assert.ok(q.metadataRead(path).equals(before));controls.push({path,metadata_read_rejected:true,whole_subject_rejected:true});
 }
 for(const path of ['scripts/inventory-reference-owner.mjs','scripts/browser-owner-source.mjs']){altered=path;assert.throws(()=>q.assertCurrent());altered=undefined;controls.push({path,whole_subject_rejected:true});}
 q.assertCurrent();Object.assign(report,{status:'pass',line:q.line,checker_reference_is_actual_current:true,original_inventory_ledger_and_workflow_metadata_preserved:true,current_bound_inputs:q.bound,focused_CI_helper_tests:q.current_workflow_tests,controls,late_rejections:10});
}catch(e){Object.assign(report,{status:'rejected',error:e.stack});process.exitCode=1;}
report.seconds=(performance.now()-start)/1000;writeFileSync(out,JSON.stringify(report,null,2)+'\n');console.log(JSON.stringify({status:report.status,seconds:report.seconds,late_rejections:report.late_rejections,error:report.error}));
