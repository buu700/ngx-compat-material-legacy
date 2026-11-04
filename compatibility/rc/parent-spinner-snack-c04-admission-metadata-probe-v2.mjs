/** Pure canonical metadata controls; no source producer or compiler run. */
import assert from 'node:assert/strict';
import {createRequire} from 'node:module';
import {readFileSync,writeFileSync} from 'node:fs';
import {createHash} from 'node:crypto';
import {resolve,join} from 'node:path';
const root=resolve(process.argv[2]),output=resolve(process.argv[3]);
assert.ok(output.startsWith(join(root,'compatibility/rc/parent-spinner-snack-c04-admission-')));
const require=createRequire(import.meta.url),hash=b=>createHash('sha256').update(b).digest('hex');
const packet=JSON.parse(readFileSync(join(root,'compatibility/rc/parent-spinner-snack-c04-admission-source-edits-v2.json')));
const ledger=JSON.parse(readFileSync(join(root,'compatibility/f10/disposition-ledger/ledger.json'))),results=[];
let positives=0,rejections=0;
for(const row of packet.paths){
 const raw=readFileSync(join(root,row.path));assert.equal(hash(raw),row.after_sha256);assert.equal(raw.length,row.after_bytes);
 const mod=require(join(root,row.path));
 const reviewName=Object.keys(mod).find(key=>key.endsWith('_REVIEW')&&typeof mod[key]==='string');assert.ok(reviewName);
 const body=JSON.parse(readFileSync(join(root,mod[reviewName]))),shas=body.reviews.map(review=>review.sha);
 for(const sha of shas){
  const entry=ledger.entries.find(entry=>entry.sha===sha),review=body.reviews.find(review=>review.sha===sha);assert.ok(entry);
  assert.equal(mod.metadataOk({entry,body,review,proof:entry.individual_proof}),true,sha);positives++;
 }
 const entry=ledger.entries.find(entry=>entry.sha===shas[0]),review=body.reviews[0];
 const alteredEntry=structuredClone(entry);alteredEntry.reason+=' unexpected';
 assert.equal(mod.metadataOk({entry:alteredEntry,body,review,proof:entry.individual_proof}),false);rejections++;
 const alteredProof=structuredClone(entry.individual_proof);alteredProof.diff_sha256='0'.repeat(64);
 assert.equal(mod.metadataOk({entry,body,review,proof:alteredProof}),false);rejections++;
 const alteredReview=structuredClone(review);alteredReview.diff_sha256='0'.repeat(64);
 assert.equal(mod.metadataOk({entry,body,review:alteredReview,proof:entry.individual_proof}),false);rejections++;
 results.push({path:row.path,sha256:hash(raw),bytes:raw.length,canonical_rows:shas.length,canonical_proof_preserved:true,negative_controls:3});
}
const result={schema_version:1,status:'pure-metadata-controls-pass',node:process.version,canonical_rows:positives,rejected_metadata_controls:rejections,results,
 actual_source_producer_or_composed_owner_executed:false,actual_compiler_packed_rendered_floor_or_audit_qualified:false,canonical_changes_applied:false,g11_claim:'not-passed'};
writeFileSync(output,JSON.stringify(result,null,2)+'\n',{flag:'wx'});console.log(JSON.stringify({status:result.status,positives,rejections}));
