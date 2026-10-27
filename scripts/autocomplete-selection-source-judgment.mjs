/**
 * @license
 * Copyright Google LLC All Rights Reserved.
 * Copyright (c) 2026 Ryan Lester.
 * Use of this source code is governed by the MIT license in LICENSE.
 */
/** Three separate complete source judgments; registered native gates stay mandatory. */
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {gunzipSync} from 'node:zlib';
import {readEvidenceMember} from './upstream-packed-run-evidence.mjs';
import {HISTORICAL_BEHAVIOR_KIND,historicalBehaviorRequirements} from './upstream-historical-behavior-evidence.mjs';
import {autocompleteSelectionNativeSubject,SELECTION_NATIVE_SHAS,SELECTION_NATIVE_PACKET} from './autocomplete-selection-native-subject.mjs';

const hash=raw=>createHash('sha256').update(raw).digest('hex');
const decisions=[
  'The complete two-file/two-hunk reactive-reset change is present in the owned legacy trigger. Programmatic null or undefined clears the previous selected option quietly through the owned value-assignment path. The later null-only condition is retained: zero, false, empty string and an empty display result must not be treated as a missing model. The original intermediate falsy-display guard is therefore not copied. The strengthened existing native reset test first selects an actual option, then requires silent selected-state cleanup and exactly one null CVA write. Current whole-method Forms/RxJS diagnostics support this source judgment; actual Angular DI/rendering, packed behavior and runtime/compiler/RxJS/peer floors remain separate mandatory executions.',
  'The complete two-file/five-hunk attachment change is present in the owned legacy trigger. The four trigger hunks capture the required-selection value only on a genuine overlay attachment, before subsequent input, and preserve it through repeated open calls and option-list hide/reshow. The fifth hunk corrects an API-guard comment and does not change a public signature. Existing named native tests require retained model/selection while typing, one chosen-value publication, one unmatched-text reset after filtering and safe closure with no options. Current whole-method Forms/RxJS diagnostics support this source judgment; actual Angular DI/rendering, packed behavior and runtime/compiler/RxJS/peer floors remain separate mandatory executions.',
  'The complete two-file/three-hunk typing/reset change is present in the owned legacy trigger. Optional nonempty typing quietly deselects a selected option when its displayed value no longer matches; displayWith receives the selected option value, retaining the correction to the original intermediate object argument. Required selection remains selected while typing until choice or dismissal. Programmatic cleanup is keyed to a nullish model, preserving non-null falsy values. The strengthened existing native cases require required-selection retention/reset, direct nonempty typing with display callback identity and quiet deselection, and reactive selected-state cleanup. Current whole-method Forms/RxJS diagnostics support this source judgment; actual Angular DI/rendering, packed behavior and runtime/compiler/RxJS/peer floors remain separate mandatory executions.',
];
export const selectionSourceReviewPath=sha=>'compatibility/f10/disposition-ledger/evidence/closeout-autocomplete-selection-'+sha+'-individual-source-judgment.json';

export function autocompleteSelectionSourceJudgments({root,read=p=>readEvidenceMember(root,p),line}={}){
  const native=autocompleteSelectionNativeSubject({root,read,line});line=native.line;
  const bound=new Map(native.bound.map(ref=>[ref.path,{...ref}]));
  function member(ref){const raw=read(ref.path);assert.equal(hash(raw),ref.sha256,'changed selection source evidence '+ref.path);
    if(ref.bytes!==undefined)assert.equal(raw.length,ref.bytes);bound.set(ref.path,{path:ref.path,sha256:hash(raw),bytes:raw.length});return raw;}
  const proposals=native.proposals,diagnostic=JSON.parse(gunzipSync(member(proposals.current_diagnostics)));
  member(proposals.diagnostic_producer);member(proposals.originals_intake_producer);
  assert.equal(diagnostic.line,line);assert.equal(diagnostic.node,process.version);assert.equal(diagnostic.typescript,proposals.private_typescript);
  assert.equal(diagnostic.actual_installed_minimum_source_matched_line,line);assert.equal(diagnostic.cases_per_source,14);
  assert.equal(diagnostic.actual.length,14);assert.ok(diagnostic.actual.every(row=>row.result==='pass'));
  assert.equal(diagnostic.peers.length,2);assert.ok(diagnostic.peers.every(row=>row.rows.length===14&&row.rows.every(c=>c.result==='pass')));
  assert.equal(diagnostic.mutants.length,9);assert.ok(diagnostic.mutants.every(row=>row.result==='rejected'&&row.failed_case_ids.length));
  assert.equal(diagnostic.source.path,native.packet.current_product_subjects[0].path);
  assert.equal(diagnostic.source.sha256,native.packet.current_product_subjects[0].sha256);
  assert.equal(diagnostic.original_observations.length,6);assert.equal(diagnostic.actual_native_artifact_or_floor_executed,false);
  assert.equal(diagnostic.g11_claim,'not-passed');
  const reports=SELECTION_NATIVE_SHAS.map((sha,index)=>{
    const definition=historicalBehaviorRequirements(sha);assert.deepEqual(definition,native.requirements[index][1]);
    const original=native.originals.commits.find(row=>row.sha===sha),review=proposals.reviews[index];
    const body={schema_version:1,line,sha,status:'reviewed',final_disposition:'already-adapted',review_depth:'individual-compatibility',
      reviewer:'Codex primary implementer; independent complete audit remains separate',
      diff:original.diff,diff_sha256:definition.patch,original_files:original.original_files,original_hunks:original.original_hunks,
      hunk_reviews:review.complete_original_hunk_reviews,decision:decisions[index],
      original_source_archive:native.packet.original_subjects,original_source_proposals:native.packet.source_proposals,
      current_owned_sources:native.packet.current_product_subjects,
      native_contract_proposal:bound.get(SELECTION_NATIVE_PACKET),native_contract_controls:bound.get('compatibility/rc/autocomplete-selection-native-contract-controls.json'),
      diagnostic:bound.get(proposals.current_diagnostics.path),diagnostic_producer:bound.get(proposals.diagnostic_producer.path),
      private_node:process.version,private_typescript:diagnostic.typescript,source_protocol_cases_per_source:14,source_protocol_retained_minima:2,source_protocol_mutants_rejected:9,
      source_protocol_scope:diagnostic.scope,original_before_after_observations:review.actual_original_observations,
      required_named_native_cases:definition.cases,complete_historical_case_count:2236,
      consumer_TS_HTML_CSS_SCSS_changes_required:false,actual_native_browser_artifact_or_floor_executed:false,g11_claim:'not-passed'};
    const sourceMembers=definition.members.map(path=>{const bytes=read(path),ref={path,sha256:hash(bytes),bytes:bytes.length};bound.set(path,ref);return {path,sha256:ref.sha256};});
    const proof={proof_kind:HISTORICAL_BEHAVIOR_KIND,review_depth:'individual-compatibility',diff_sha256:definition.patch,
      affected_branches:[line],decision:body.decision,historical_behavior:{kind:definition.kind,case_ids:definition.cases.map(row=>row.case_id),source_members:sourceMembers}};
    return {sha,path:selectionSourceReviewPath(sha),body,proof,original_paths:original.members.map(row=>row.path)};
  });
  const assertCurrent=()=>{native.assertCurrent();for(const ref of bound.values()){const bytes=read(ref.path);assert.equal(hash(bytes),ref.sha256,'late selection source evidence '+ref.path);assert.equal(bytes.length,ref.bytes);}};
  assertCurrent();return {line,reports,bound:structuredClone([...bound.values()]),assertCurrent,native_artifact_floor_or_G11_credit:false};
}
