/**
 * @license
 * Copyright Google LLC All Rights Reserved.
 * Copyright (c) 2026 Ryan Lester.
 * Use of this source code is governed by the MIT license in LICENSE.
 */
/** Whole original data and meaningful tree/blob/hunk/provenance rejection controls. */
import assert from 'node:assert/strict';
import {readFileSync,writeFileSync} from 'node:fs';
import {join} from 'node:path';
import {createHash} from 'node:crypto';
import {gunzipSync} from 'node:zlib';
import {BASE_CLASS_REMOVAL_PREFIX as PREFIX,inspectBaseClassRemovalOriginal,verifyBaseClassRemovalOriginal} from '../scripts/upstream-base-class-removal-source.mjs';
const root=process.cwd(),read=path=>readFileSync(join(root,path)),hash=raw=>createHash('sha256').update(raw).digest('hex');
const original=JSON.parse(gunzipSync(read(PREFIX+'originals.json.gz'))),census=JSON.parse(gunzipSync(read('compatibility/rc/upstream-complete-patch-census.json.gz')));
const facts=verifyBaseClassRemovalOriginal(original,census);assert.equal(facts.original_hunks_replayed,329);assert.equal(facts.original_files_authenticated,72);
const reject=fn=>assert.throws(fn,error=>error?.code==='ERR_ASSERTION');let semantic=0,cold=0,late=0;
function fault(change){const data=structuredClone(original);change(data);reject(()=>verifyBaseClassRemovalOriginal(data,census));semantic++;}
fault(d=>d.sections.pop());
fault(d=>d.complete_changed_files.splice(2,1));
fault(d=>d.sections[1].hunks.pop());
fault(d=>{const h=d.sections[1].hunks[0];h.text=h.text.replace('MatOption','ForeignOption');h.sha256=hash(h.text);});
fault(d=>{d.sections[0].after.body+='\n';d.sections[0].after.sha256=hash(d.sections[0].after.body);d.sections[0].after.bytes=Buffer.byteLength(d.sections[0].after.body);});
fault(d=>d.original_commit.raw=d.original_commit.raw.replace('unnecessary base','foreign base'));
fault(d=>d.parent_commit.sha='0'.repeat(40));
fault(d=>d.tree_objects.pop());
fault(d=>d.tagged_reference.members.pop());
fault(d=>d.tagged_reference.absent_legacy_counterparts=[]);
fault(d=>d.anonymous_blob_receipts.pop());
fault(d=>d.anonymous_blob_receipts[0].credentials_used=true);
fault(d=>d.anonymous_blob_receipts[0].url=d.anonymous_blob_receipts[0].url.replace('raw.githubusercontent.com','untrusted.example'));
fault(d=>d.anonymous_blob_receipts[0].sha256='0'.repeat(64));
fault(d=>d.capture_policy.shared_cache_modified=true);
fault(d=>d.original_source_review_complete=true);
fault(d=>d.actual_native_packed_browser_floor_or_full_audit_qualified=true);
const result=inspectBaseClassRemovalOriginal({root,read});result.assertCurrent();
assert.equal(result.bound.length,8);assert.equal(result.report.substantive_current_source_review_complete,false);assert.equal(result.report.canonical_decisions_changed,0);
for(const path of result.bound.map(ref=>ref.path)){
 const bad=Buffer.concat([read(path),Buffer.from('\n')]);reject(()=>inspectBaseClassRemovalOriginal({root,read:p=>p===path?bad:read(p)}));cold++;
 let changed=false;const current=inspectBaseClassRemovalOriginal({root,read:p=>changed&&p===path?bad:read(p)});changed=true;reject(()=>current.assertCurrent());late++;
}
const copied=structuredClone(result.bound);copied.length=0;result.assertCurrent();
const report={schema_version:1,result:'pass',line:'21.x',complete_original_files:72,original_source_files:47,original_API_golden_files:25,original_hunks_replayed:329,tagged_reference_members:143,unique_authenticated_blobs:219,authenticated_tree_objects:118,anonymous_authenticated_blob_receipts:79,object_tree_blob_hunk_and_provenance_faults_rejected:semantic,cold_source_faults_rejected:cold,late_source_faults_rejected:late,substantive_current_source_review_complete:false,canonical_decisions_changed:0,product_changes:0,actual_native_packed_browser_floor_or_full_audit_qualified:false,g11_claim:'not-passed'};
if(process.argv[2])writeFileSync(process.argv[2],JSON.stringify(report,null,2)+'\n',{flag:'wx'});console.log(JSON.stringify(report));
