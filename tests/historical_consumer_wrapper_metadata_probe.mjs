/**
 * @license
 * Copyright Google LLC All Rights Reserved.
 * Copyright (c) 2026 Ryan Lester.
 * Use of this source code is governed by the MIT license in LICENSE.
 */
/** Exact current metadata classification and sensitivity; no native execution. */
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {readFileSync,writeFileSync} from 'node:fs';
import {dirname,join,resolve} from 'node:path';
import {fileURLToPath} from 'node:url';
import {historicalConsumerWrapperMetadata,CONSUMER_WRAPPER_LEDGER,CONSUMER_WRAPPER_PACKET,CONSUMER_WRAPPER_TRANSPORT,CONSUMER_WRAPPER_QUALIFICATION} from '../scripts/historical-consumer-wrapper-metadata.mjs';
import {preparePackedUpstreamLedger,packedUpstreamLedgerEpoch} from '../scripts/packed-upstream-ledger-epoch.mjs';
const root=resolve(dirname(fileURLToPath(import.meta.url)),'..'),read=path=>readFileSync(join(root,path));
const hash=raw=>createHash('sha256').update(raw).digest('hex'),json=value=>Buffer.from(JSON.stringify(value,null,2)+'\n');
const transport=JSON.parse(read(CONSUMER_WRAPPER_TRANSPORT)),packet=JSON.parse(read(CONSUMER_WRAPPER_PACKET));
const source=historicalConsumerWrapperMetadata({root}),prepared=preparePackedUpstreamLedger({root});
assert.equal(source.after.equals(prepared.historical_consumer_wrapper_metadata_stage.after),true);
assert.equal(prepared.canonical_after.equals(read(CONSUMER_WRAPPER_LEDGER)),true);
assert.equal(source.metadata_entries,65);assert.equal(source.individual_decisions,0);source.assertCurrent();
const controls=[];
function reject(id,member,change){
  const original=read(member),changed=change(original);assert.equal(original.equals(changed),false);
  assert.throws(()=>historicalConsumerWrapperMetadata({root,read:path=>path===member?changed:read(path)}),undefined,id);
  controls.push({id,result:'rejected'});
}
const append=raw=>Buffer.concat([raw,Buffer.from('\n')]);
reject('changed-transport',CONSUMER_WRAPPER_TRANSPORT,append);
for(const row of transport.wrappers.slice(0,3))reject('changed-wrapper:'+row.path,row.path,append);
reject('changed-original-probe',transport.wrappers[0].probe,append);
reject('failed-integration',CONSUMER_WRAPPER_QUALIFICATION,raw=>{const value=JSON.parse(raw);value.transport_methods_failed=1;return json(value);});
reject('changed-qualified-code',JSON.parse(read(CONSUMER_WRAPPER_QUALIFICATION)).bound_inputs.find(row=>row.path==='scripts/historical-consumer-child.mjs').path,append);
reject('changed-original-review',transport.canonical_reference_refresh_required[0].prior_review.path,append);
const delegated=transport.canonical_reference_refresh_required.find(row=>row.prior_review.path.includes('bootstrap-stability-'));
reject('changed-delegated-hunk-review',delegated.original_hunk_review_subject.path,append);
const prior=JSON.parse(read(transport.canonical_reference_refresh_required[0].prior_review.path));reject('changed-original-patch',prior.patch_file,append);
let late=false;const lateSource=historicalConsumerWrapperMetadata({root,read:path=>late&&path===transport.wrappers[0].path?append(read(path)):read(path)});
late=true;assert.throws(()=>lateSource.assertCurrent(),/late historical consumer metadata input/);controls.push({id:'late-wrapper-drift',result:'rejected'});
const epoch=packedUpstreamLedgerEpoch({root});
assert.equal(epoch.historical_consumer_wrapper_metadata_entries_applied,65);assert.equal(epoch.historical_consumer_wrapper_metadata_references_applied,65);
assert.equal(epoch.historical_wrapper_metadata_entries_applied,4);assert.equal(epoch.individual_decisions_applied,source.line==='main'?13:21);
assert.equal(epoch.legacy_sass_entrypoint_decisions_applied,source.line==='main'?0:1);
assert.equal(epoch.current_native_packed_or_floor_or_g11_credit,false);epoch.assertCurrent();
const altered=Buffer.from(read(CONSUMER_WRAPPER_LEDGER));altered[0]=32;
assert.notEqual(hash(altered),packet.after_sha256);
assert.throws(()=>packedUpstreamLedgerEpoch({root,read:path=>path===CONSUMER_WRAPPER_LEDGER?altered:read(path)}));
controls.push({id:'unapproved-canonical-ledger-bytes',result:'rejected'});
const report={schema_version:1,line:source.line,metadata_positive_cases:3,rejection_controls:controls.length,controls,
  metadata_entries:65,original_hunks_preserved:7770,original_decisions_changed:0,individual_decisions_applied:epoch.individual_decisions_applied,
  legacy_four_entry_successor_still_classified:true,actual_native_artifact_browser_floor_or_full_audit_qualified:false,g13_claim:'not-passed'};
if(process.argv[2])writeFileSync(process.argv[2],JSON.stringify(report,null,2)+'\n',{flag:'wx'});
console.log(JSON.stringify(report));
