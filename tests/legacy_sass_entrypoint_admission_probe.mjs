/**
 * @license
 * Copyright Google LLC All Rights Reserved.
 * Copyright (c) 2026 Ryan Lester.
 * Use of this source code is governed by the MIT license in LICENSE.
 */
/** One exact reviewed source decision; does not apply the canonical ledger. */
import assert from 'node:assert/strict';
import {readFileSync,writeFileSync} from 'node:fs';
import {join} from 'node:path';
import {LEGACY_SASS_ENTRYPOINT_SHA,LEGACY_SASS_ENTRYPOINT_REVIEW,requiresLegacySassEntrypointScope,
  legacySassEntrypointProof,inspectLegacySassEntrypointReview,
  legacySassEntrypointEntrySourceOk,legacySassEntrypointEntryEvidenceOk} from '../scripts/upstream-legacy-sass-entrypoint-admission.mjs';
const root=process.cwd(),read=path=>readFileSync(join(root,path));
const review=JSON.parse(read(LEGACY_SASS_ENTRYPOINT_REVIEW));
const before=JSON.parse(read('compatibility/f10/disposition-ledger/ledger.json')).entries.find(row=>row.sha===LEGACY_SASS_ENTRYPOINT_SHA);
assert.ok(before&&['needs-individual-review','not-applicable'].includes(before.final_disposition));
const entry={...structuredClone(before),final_disposition:'not-applicable',reason:review.decision,
  review_depth:'individual-compatibility',evidence_report:LEGACY_SASS_ENTRYPOINT_REVIEW,
  individual_proof:legacySassEntrypointProof(review)};
if(before.final_disposition==='not-applicable')assert.deepEqual(before,entry);
const args={root,read,entry,body:review,line:'21.x'};
assert.equal(requiresLegacySassEntrypointScope(before),true);
assert.equal(legacySassEntrypointEntrySourceOk(args),true);
assert.equal(legacySassEntrypointEntryEvidenceOk(args),true);
const q=inspectLegacySassEntrypointReview({root,read,line:'21.x'});assert.ok(q.bound.size>409);
const rejected=[];
for(const [id,change]of [
  ['wrong-SHA',row=>row.sha='0'.repeat(40)],
  ['inherited-instead-of-source-exclusion',row=>row.final_disposition='inherited'],
  ['truncated-frozen-paths',row=>row.files=row.files.slice(0,3)],
  ['stripped-required-scope',row=>delete row.individual_proof.legacy_sass_entrypoint_scope],
  ['forged-review-pointer',row=>row.individual_proof.legacy_sass_entrypoint_scope.review.sha256='0'.repeat(64)],
  ['wrong-branch',row=>row.affected_branches=['main']],
  ['claimed-G11-pass',row=>row.g11_claim='passed'],
]){
  const bad=structuredClone(entry);change(bad);assert.equal(requiresLegacySassEntrypointScope(bad),true);
  assert.equal(legacySassEntrypointEntrySourceOk({...args,entry:bad}),false);rejected.push(id);
}
for(const path of [LEGACY_SASS_ENTRYPOINT_REVIEW,review.upstream_originals.path,
  review.current_compiler_scope.path,'compatibility/rc/oracles/material-16.2.14-sass-api.json',
  'projects/ngx-material-legacy/_index.scss','projects/ngx-material-legacy/styles/core/theming/_palette.scss',
  'projects/ngx-material-legacy/schematics/migrate-legacy/sass-rewrite.js']){
  const corrupt=name=>name===path?Buffer.concat([read(name),Buffer.from(' ')]):read(name);
  assert.equal(legacySassEntrypointEntrySourceOk({...args,read:corrupt}),false);rejected.push('changed-input:'+path);
}
assert.equal(legacySassEntrypointEntrySourceOk({...args,line:'main'}),false);rejected.push('main-cannot-borrow-21x-source-scope');
let changed=false;const live=path=>changed&&path==='projects/ngx-material-legacy/styles/core/theming/_palette.scss'?
  Buffer.concat([read(path),Buffer.from(' ')]):read(path);
assert.equal(legacySassEntrypointEntryEvidenceOk({...args,read:live}),true);
changed=true;assert.equal(legacySassEntrypointEntryEvidenceOk({...args,read:live}),false);rejected.push('late-source-change-after-measurement-cache');
const report={schema_version:1,line:'21.x',positive_source_and_fresh_compiler_admission:true,
  rejection_controls:rejected.length,rejected,reviewed_original_paths:180,reviewed_original_hunks:194,
  canonical_dispositions_changed:0,actual_native_artifact_browser_full_Sass_floor_or_audit_qualified:false,g13_claim:'not-passed'};
if(process.argv[2])writeFileSync(process.argv[2],JSON.stringify(report,null,2)+'\n',{flag:'wx'});
console.log(JSON.stringify(report));
