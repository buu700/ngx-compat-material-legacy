/**
 * @license
 * Copyright Google LLC All Rights Reserved.
 * Copyright (c) 2026 Ryan Lester.
 * Use of this source code is governed by the MIT license in LICENSE.
 */
/** Transport metadata stays finite and cannot waive original/native checks. */
import assert from 'node:assert/strict';
import {readFileSync,writeFileSync} from 'node:fs';
import {createHash} from 'node:crypto';
import {dirname,join,resolve} from 'node:path';
import {fileURLToPath} from 'node:url';
import {packedUpstreamLedgerEpoch} from '../scripts/packed-upstream-ledger-epoch.mjs';
import {historicalChipWrapperMetadata,HISTORICAL_WRAPPER_PACKET,HISTORICAL_WRAPPER_LEDGER,HISTORICAL_WRAPPER_TRANSPORT} from '../scripts/historical-chip-wrapper-metadata.mjs';
const root=resolve(dirname(fileURLToPath(import.meta.url)),'..'),read=p=>readFileSync(join(root,p)),hash=b=>createHash('sha256').update(b).digest('hex');
const source=historicalChipWrapperMetadata({root,read}),packet=JSON.parse(read(HISTORICAL_WRAPPER_PACKET)),positive=[],rejected=[];
assert.equal(source.metadata_entries,4);assert.equal(source.original_hunks_preserved,198);assert.equal(source.original_dispositions_or_hunk_judgments_changed,0);
positive.push('four-wrapper-references-preserve-198-original-hunk-judgments-and-dispositions');
// Reconstruct this exact metadata-only checkpoint before later source decisions.
let fixture=source.before.toString();const fixtureRows=JSON.parse(source.before).entries;
for(const change of source.entries){
  const prior=fixtureRows.find(row=>row.sha===change.sha),from=JSON.stringify(prior,null,2).replace(/\n/g,'\n    '),to=JSON.stringify(change.after_entry,null,2).replace(/\n/g,'\n    ');
  assert.equal(fixture.split(from).length,2);fixture=fixture.replace(from,to);
}
const checkpoint=Buffer.from(fixture);assert.equal(hash(checkpoint),packet.after_sha256);assert.equal(checkpoint.length,packet.after_bytes);
const epoch=packedUpstreamLedgerEpoch({root,read:p=>p===HISTORICAL_WRAPPER_LEDGER?checkpoint:read(p)});assert.equal(epoch.historical_wrapper_metadata_entries_applied,4);
assert.equal(epoch.historical_wrapper_metadata_references_applied,4);assert.equal(epoch.individual_decisions_applied,source.line==='main'?13:20);
assert.equal(epoch.current_native_packed_or_floor_or_g11_credit,false);
positive.push('metadata-stage-adds-no-upstream-decision-or-native-credit');
for(const ref of [packet.code_subject,source.reports[0].ref])assert.equal(epoch.read(ref.path).equals(read(ref.path)),true);
positive.push('current-code-and-receipts-remain-raw-through-historical-ledger-reader');
const prior=packedUpstreamLedgerEpoch({root,read:p=>p===HISTORICAL_WRAPPER_LEDGER?source.before:read(p)});
assert.equal(prior.historical_wrapper_metadata_entries_applied,0);assert.equal(prior.selection_native_decisions_applied,3);
positive.push('earlier-metadata-stage-cannot-claim-wrapper-reference-successors');
function ownerReject(id,corrupt){assert.throws(()=>packedUpstreamLedgerEpoch({root,read:corrupt}),undefined,id);rejected.push(id);}
for(const [id,path]of [['changed-ledger-packet',HISTORICAL_WRAPPER_PACKET],['changed-metadata-code',packet.code_subject.path],['changed-current-review',source.reports[0].path]])
  ownerReject(id,p=>p===path?Buffer.concat([read(p),Buffer.from(' ')]):read(p));
const ledger=JSON.parse(read(HISTORICAL_WRAPPER_LEDGER)),before=JSON.parse(source.before),index=ledger.entries.findIndex(row=>row.sha===source.entries[0].sha);
const partial=structuredClone(ledger);partial.entries[index]=before.entries[index];
ownerReject('partial-wrapper-metadata',p=>p===HISTORICAL_WRAPPER_LEDGER?Buffer.from(JSON.stringify(partial)):read(p));
const disposition=structuredClone(ledger);disposition.entries[index].final_disposition='already-adapted';
ownerReject('new-decision-hidden-in-metadata',p=>p===HISTORICAL_WRAPPER_LEDGER?Buffer.from(JSON.stringify(disposition)):read(p));
const transport=JSON.parse(read(HISTORICAL_WRAPPER_TRANSPORT));
for(const path of [...transport.wrappers.map(row=>row.path),source.entries[0].prior_review.path,
  'compatibility/rc/historical-chip-navigation-source-replay.json','compatibility/rc/historical-chip-current-source-qualification.json',
  HISTORICAL_WRAPPER_TRANSPORT,JSON.parse(read(source.entries[0].prior_review.path)).patch_file]){
  assert.throws(()=>historicalChipWrapperMetadata({root,read:p=>p===path?Buffer.concat([read(p),Buffer.from(' ')]):read(p)}));
  rejected.push('changed-authenticated-subject/'+path);
}
{
  let late=false;const path=source.reports[0].path,live=packedUpstreamLedgerEpoch({root,read:p=>late&&p===path?Buffer.concat([read(p),Buffer.from(' ')]):read(p)});
  live.historical_wrapper_metadata_entries_applied=0;late=true;assert.throws(()=>live.read(HISTORICAL_WRAPPER_LEDGER));rejected.push('late-current-wrapper-review');
}
{
  let late=false;const path=transport.wrappers[2].path,live=historicalChipWrapperMetadata({root,read:p=>late&&p===path?Buffer.concat([read(p),Buffer.from(' ')]):read(p)});
  live.bound.length=0;late=true;assert.throws(()=>live.assertCurrent());rejected.push('late-wrapper-source-with-mutated-public-metadata');
}
assert.equal(positive.length,4);assert.equal(rejected.length,15);
const report={schema_version:1,line:source.line,positive,rejected,metadata_entries:4,source_reference_updates:4,original_hunks_preserved:198,new_upstream_SHA_decisions:0,
  packet:{path:HISTORICAL_WRAPPER_PACKET,sha256:hash(read(HISTORICAL_WRAPPER_PACKET))},
  coordinator:{path:'scripts/packed-upstream-ledger-epoch.mjs',sha256:hash(read('scripts/packed-upstream-ledger-epoch.mjs'))},
  producer:{path:'tests/historical_chip_wrapper_metadata_probe.mjs',sha256:hash(read('tests/historical_chip_wrapper_metadata_probe.mjs'))},
  actual_native_artifact_floor_or_G11_qualified:false};
if(process.argv[2])writeFileSync(process.argv[2],JSON.stringify(report,null,2)+'\n',{flag:'wx'});
console.log(JSON.stringify({line:source.line,positive:positive.length,rejected:rejected.length,metadata_entries:4,original_hunks_preserved:198,native_or_G11_qualified:false}));
