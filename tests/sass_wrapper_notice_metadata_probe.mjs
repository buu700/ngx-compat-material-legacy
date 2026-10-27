/**
 * @license
 * Copyright Google LLC All Rights Reserved.
 * Copyright (c) 2026 Ryan Lester.
 * Use of this source code is governed by the MIT license in LICENSE.
 */
/** Exact current metadata, original receipt integrity and late-change controls. */
import assert from 'node:assert/strict';
import {readFileSync,writeFileSync} from 'node:fs';
import {createHash} from 'node:crypto';
import {dirname,join,resolve} from 'node:path';
import {fileURLToPath} from 'node:url';
import {packedUpstreamLedgerEpoch} from '../scripts/packed-upstream-ledger-epoch.mjs';
import {sassWrapperNoticeMetadata,SASS_NOTICE_METADATA_PACKET,SASS_NOTICE_METADATA_ROSTER,SASS_NOTICE_METADATA_LEDGER} from '../scripts/sass-wrapper-notice-metadata.mjs';

const root=resolve(dirname(fileURLToPath(import.meta.url)),'..'),read=p=>readFileSync(join(root,p));
const hash=raw=>createHash('sha256').update(raw).digest('hex'),bytes=v=>Buffer.from(JSON.stringify(v,null,2)+'\n');
const source=sassWrapperNoticeMetadata({root,read}),epoch=packedUpstreamLedgerEpoch({root,read}),positive=[],rejected=[];
assert.equal(source.original_hunks_preserved,474);assert.equal(source.source_reference_updates,20);
assert.equal(source.reports.length,12);assert.equal(source.disposition_or_original_review_judgments_changed,0);
positive.push('twelve-reviews-474-original-hunks-and-twenty-exact-source-reference-updates');
assert.equal(epoch.sass_notice_metadata_entries_applied,12);assert.equal(epoch.sass_notice_metadata_source_references_applied,20);
assert.equal(epoch.individual_decisions_applied,13);assert.equal(epoch.current_native_packed_or_floor_or_g11_credit,false);
positive.push('metadata-successor-does-not-add-an-upstream-disposition-or-native-credit');
const packet=JSON.parse(read(SASS_NOTICE_METADATA_PACKET));
for(const path of [SASS_NOTICE_METADATA_PACKET,packet.code_subject.path,...source.reports.map(row=>row.path)])
  assert.equal(epoch.read(path).equals(read(path)),true);
positive.push('all-current-receipts-and-code-stay-raw-through-the-historical-ledger-reader');
const previous=packedUpstreamLedgerEpoch({root,read:p=>p===SASS_NOTICE_METADATA_LEDGER?source.before:read(p)});
assert.equal(previous.sass_notice_metadata_entries_applied,0);assert.equal(previous.selection_native_decisions_applied,3);
positive.push('earlier-complete-source-state-cannot-claim-the-new-metadata-successor');
for(const entry of source.entries){
  assert.equal(read(entry.prior_review.path).length,entry.prior_review.bytes);
  assert.equal(hash(read(entry.prior_review.path)),entry.prior_review.sha256);
}
positive.push('every-original-individual-review-remains-byte-for-byte-intact');
epoch.sass_notice_metadata_entries_applied=0;epoch.projected_metadata_paths.length=0;
assert.equal(epoch.read(source.reports[0].path).equals(read(source.reports[0].path)),true);
positive.push('public-result-metadata-cannot-alter-the-private-current-source-checks');

function reject(id,corrupt){assert.throws(()=>packedUpstreamLedgerEpoch({root,read:corrupt}),undefined,id);rejected.push(id);}
const review=source.reports[0],style=source.entries[0].after_entry.individual_proof.source_evidence.find(ref=>ref.path.endsWith('/_button-toggle-theme.scss')).path;
for(const [id,path]of [['changed-packet',SASS_NOTICE_METADATA_PACKET],['changed-metadata-builder',packet.code_subject.path],
  ['changed-current-review',review.path],['changed-original-review',source.entries[0].prior_review.path],
  ['extra-Sass-source-edit',style],['changed-finite-roster',SASS_NOTICE_METADATA_ROSTER]])
  reject(id,p=>p===path?Buffer.concat([read(p),Buffer.from(' ')]):read(p));
const ledger=JSON.parse(read(SASS_NOTICE_METADATA_LEDGER)),original=JSON.parse(source.before);
const partial=structuredClone(ledger),selected=partial.entries.findIndex(row=>row.sha===source.entries[0].sha);
partial.entries[selected]=original.entries[selected];
reject('partial-source-metadata-update',p=>p===SASS_NOTICE_METADATA_LEDGER?bytes(partial):read(p));
const disposition=structuredClone(ledger);disposition.entries[selected].final_disposition='already-adapted';
reject('new-disposition-hidden-in-metadata',p=>p===SASS_NOTICE_METADATA_LEDGER?bytes(disposition):read(p));
const unrelated=structuredClone(ledger);unrelated.entries.find(row=>!source.entries.some(change=>change.sha===row.sha)).reason+=' Unreviewed.';
reject('unrelated-ledger-entry-changed',p=>p===SASS_NOTICE_METADATA_LEDGER?bytes(unrelated):read(p));
for(const [id,change]of [
  ['original-hunk-removed',body=>body.hunk_reviews.pop()],
  ['wrong-current-source-reference',body=>body.individual_proof.source_evidence.find(ref=>ref.path===style).sha256='0'.repeat(64)],
  ['unexecuted-native-claim',body=>body.silent_Sass_notice_source_successor.actual_Angular_native_artifact_rendered_or_floor_executed=true],
]){const changed=structuredClone(review.body);change(changed);reject(id,p=>p===review.path?bytes(changed):read(p));}
for(const path of [SASS_NOTICE_METADATA_PACKET,packet.code_subject.path,review.path,source.entries[0].prior_review.path]){
  let late=false;const live=packedUpstreamLedgerEpoch({root,read:p=>late&&p===path?Buffer.concat([read(p),Buffer.from(' ')]):read(p)});
  live.sass_notice_metadata_entries_applied=0;late=true;
  assert.throws(()=>live.read(SASS_NOTICE_METADATA_LEDGER));rejected.push('late-change/'+path);
}
const report={schema_version:1,line:'main',role:'Finite source-metadata integrity controls; no full audit or native gate credit.',
  positive,rejected,metadata_entries:12,source_references:20,report_reference_updates:20,report_digest_updates:4,
  original_hunks_preserved:474,original_disposition_decisions:13,new_SHA_decisions:0,
  source_packet:{path:SASS_NOTICE_METADATA_PACKET,sha256:hash(read(SASS_NOTICE_METADATA_PACKET))},
  coordinator:{path:'scripts/packed-upstream-ledger-epoch.mjs',sha256:hash(read('scripts/packed-upstream-ledger-epoch.mjs'))},
  producer:{path:'tests/sass_wrapper_notice_metadata_probe.mjs',sha256:hash(read('tests/sass_wrapper_notice_metadata_probe.mjs'))},
  actual_native_artifact_floor_or_G11_qualified:false};
assert.equal(positive.length,6);assert.equal(rejected.length,16);
if(process.argv[2])writeFileSync(process.argv[2],JSON.stringify(report,null,2)+'\n',{flag:'wx'});
console.log(JSON.stringify({positive:positive.length,rejected:rejected.length,metadata_entries:12,source_references:20,
  original_hunks_preserved:474,new_SHA_decisions:0,native_or_G11_qualified:false}));
