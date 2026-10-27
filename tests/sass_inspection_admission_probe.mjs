/**
 * @license
 * Copyright Google LLC All Rights Reserved.
 * Copyright (c) 2026 Ryan Lester.
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.io/license
 */
/** Six bounded source decisions; real root CLI controls are separate. */
import assert from 'node:assert/strict';
import {readFileSync,writeFileSync} from 'node:fs';
import {createHash} from 'node:crypto';
import {dirname,join,resolve} from 'node:path';
import {fileURLToPath} from 'node:url';
import {SASS_INSPECTION_SHAS,requiresSassInspectionScope,sassInspectionProof,sassInspectionEntryEvidenceOk} from '../scripts/upstream-sass-inspection-admission.mjs';
const root=resolve(dirname(fileURLToPath(import.meta.url)),'..'),read=path=>readFileSync(join(root,path));
const hash=raw=>createHash('sha256').update(raw).digest('hex');
const reportPath='compatibility/rc/upstream-sass-inspection-individual-review.json',body=JSON.parse(read(reportPath));
const ledger=JSON.parse(read('compatibility/f10/disposition-ledger/ledger.json')),line=body.line,cases=[],rejected=[];
let applied=0;
const entries=body.reviews.map(row=>{
 const prior=ledger.entries.find(entry=>entry.sha===row.sha);assert.ok(prior);
 const proof=sassInspectionProof(row,line);
 if(prior.individual_proof?.sass_inspection){applied++;assert.equal(prior.final_disposition,'do-not-adopt');assert.deepEqual(prior.individual_proof,proof);}
 else assert.equal(hash(JSON.stringify(prior,null,2)+'\n'),row.prior_entry_sha256);
 const entry={...prior,final_disposition:'do-not-adopt',reason:row.decision,review_depth:row.review_depth,
  affected_branches:[line],evidence_report:reportPath,individual_proof:proof,
  ...(Object.hasOwn(prior,'patch_sha256')?{patch_sha256:row.diff_sha256}:{})};
 assert.equal(requiresSassInspectionScope(entry),true);assert.equal(requiresSassInspectionScope({sha:entry.sha}),true);
 assert.equal(sassInspectionEntryEvidenceOk({root,read,entry,body,line}),true,'source entry '+row.sha);
 cases.push('individual-source-and-current-compiler/'+row.sha);return entry;
});
for(const entry of entries){const bad=structuredClone(entry);delete bad.individual_proof;
 assert.equal(requiresSassInspectionScope(bad),true);assert.equal(sassInspectionEntryEvidenceOk({root,read,entry:bad,body,line}),false);
 rejected.push('missing-proof/'+entry.sha);}
const entry=entries[0];
for(const [id,change]of [
 ['wrong-final-disposition',row=>row.final_disposition='inherited'],
 ['wrong-diff',row=>row.individual_proof.diff_sha256='0'.repeat(64)],
 ['wrong-source-SHA',row=>row.individual_proof.sass_inspection.sha='0'.repeat(40)],
 ['wrong-proof-branch',row=>row.individual_proof.affected_branches=[line==='main'?'21.x':'main']],
 ['wrong-decision',row=>row.reason+=' Unreviewed.'],
 ['wrong-files',row=>row.files=[]],
 ['other-readable-report',row=>row.evidence_report='README.md'],
]){const bad=structuredClone(entry);change(bad);assert.equal(sassInspectionEntryEvidenceOk({root,read,entry:bad,body,line}),false);rejected.push(id);}
for(const [id,path]of [
 ['changed-review',reportPath],['changed-original-capture',body.upstream_originals.path],
 ['changed-recorded-compiler',body.current_compiler_scope.path],
 ['changed-current-facade','projects/ngx-material-legacy/_index.scss'],
 ['changed-bridge','projects/ngx-material-legacy/styles/bridges/_companion-overrides.scss'],
]){const corrupt=p=>p===path?Buffer.concat([read(p),Buffer.from('\n// unreviewed\n')]):read(p);
 assert.equal(sassInspectionEntryEvidenceOk({root,read:corrupt,entry,body,line}),false);rejected.push(id);}
assert.equal(sassInspectionEntryEvidenceOk({root,read,entry,body,line:line==='main'?'21.x':'main'}),false);rejected.push('wrong-measurement-line');
assert.ok(applied===0||applied===6,'partial canonical Sass admission');
assert.deepEqual(entries.map(row=>row.sha),SASS_INSPECTION_SHAS);
const summary={line,result:'pass',cases,rejected,individual_reviews:6,original_hunks:49,
 canonical_applied:applied===6,root_mandatory_SHA_hook_covered:false,
 fresh_compiler_measurement_executed:true,full_Sass_native_floor_or_G11_qualified:false,
 producer_sha256:hash(read('tests/sass_inspection_admission_probe.mjs'))};
if(process.argv[2])writeFileSync(process.argv[2],JSON.stringify({summary,entries},null,2)+'\n',{flag:'wx'});
console.log(JSON.stringify(summary));
