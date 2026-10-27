/**
 * @license
 * Copyright Google LLC All Rights Reserved.
 * Copyright (c) 2026 Ryan Lester.
 * Use of this source code is governed by the MIT license in LICENSE.
 */
/** Four recorded wrapper-reference successors; no new upstream decisions. */
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {execFileSync} from 'node:child_process';
import {readEvidenceMember} from './upstream-packed-run-evidence.mjs';

export const HISTORICAL_WRAPPER_PACKET='compatibility/rc/historical-chip-source-wrapper-ledger-successor.json';
export const HISTORICAL_WRAPPER_LEDGER='compatibility/f10/disposition-ledger/ledger.json';
export const HISTORICAL_WRAPPER_TRANSPORT='compatibility/rc/historical-chip-source-wrapper-successor.json';
const subjects={
  main:{parent:'1faf3f64ac8a9e7f2f0f8dd28c2b61c166c80538',before:'6d8eefe966fc691b233fb4cb99533ba7135c575eb79905ba100fe56f32e0b6e7',transport:'2e6324398def110088c9a513312a9e8977aaf26ba6ee2c00f65c1d2d713ce9ef'},
  '21.x':{parent:'8e3f12f6626edc5fcf87fa65175da16dfe58677b',before:'92f3a309bccd6907f9c92cbfd9b85379f416847ab48c945aba6e38234e718022',transport:'7c54a1d66d1e3f65b24a4f74129344d18a6e2bf9631c54e0b735005d0c1d5131'},
};
const shas=['cb820b1d8a8d942965790b75b48c21e345c86219','45582795cc29c3bcb1265b7f6c541b165be3ef9d','f35961a095dc2fbee6bfeb09878a82d391932cf7','96503186a6316cf2811eaa885f64cb5ab1ffed6e'];
const hash=bytes=>createHash('sha256').update(bytes).digest('hex'),json=v=>Buffer.from(JSON.stringify(v,null,2)+'\n');
const objects=new Map();
function original(root,parent,path){
  const key=JSON.stringify([root,parent,path]);
  if(!objects.has(key)){
    const env={...process.env,GIT_NO_LAZY_FETCH:'1',GIT_NO_REPLACE_OBJECTS:'1'};
    for(const k of ['GIT_DIR','GIT_WORK_TREE','GIT_INDEX_FILE','GIT_COMMON_DIR','GIT_OBJECT_DIRECTORY','GIT_ALTERNATE_OBJECT_DIRECTORIES'])delete env[k];
    objects.set(key,execFileSync('git',['--no-replace-objects','-c','gc.auto=0','-c','maintenance.auto=0','show',parent+':'+path],{cwd:root,env,maxBuffer:8*1024*1024}));
  }
  return Buffer.from(objects.get(key));
}

export function historicalChipWrapperMetadata({root,read=p=>readEvidenceMember(root,p),line}={}){
  const version=JSON.parse(read('projects/ngx-material-legacy/package.json')).version;
  const actual=version.startsWith('21.')?'21.x':version.startsWith('22.')?'main':null;line??=actual;assert.equal(line,actual);
  assert.ok(Object.hasOwn(subjects,line));assert.equal(process.versions.node,JSON.parse(read('toolchain-lock.json')).repository.node);
  const subject=subjects[line],bound=new Map();
  function member(path,expected){
    readEvidenceMember(root,path);const raw=read(path);assert.equal(hash(raw),expected,'changed historical wrapper metadata subject '+path);
    const ref={path,sha256:hash(raw),bytes:raw.length};bound.set(path,ref);return {raw,ref};
  }
  function retained(path){const before=original(root,subject.parent,path);return member(path,hash(before));}
  const transportMember=member(HISTORICAL_WRAPPER_TRANSPORT,subject.transport),transport=JSON.parse(transportMember.raw);
  assert.equal(hash(original(root,subject.parent,HISTORICAL_WRAPPER_TRANSPORT)),subject.transport);
  assert.equal(transport.line,line);assert.equal(transport.schema_version,1);
  assert.equal(transport.original_assertions_or_constants_removed,0);assert.equal(transport.Python_test_names_changed,0);
  assert.equal(transport.product_TS_HTML_CSS_SCSS_or_native_case_changes,0);assert.equal(transport.new_upstream_SHA_decisions,0);
  assert.equal(transport.actual_Angular_native_artifact_rendered_or_floor_qualified,false);assert.equal(transport.g11_claim,'not-passed');
  assert.deepEqual(transport.wrappers.map(row=>row.path),['surface','form','navigation'].map(f=>'tests/test_spec_'+f+'_async_source.py'));
  for(const row of transport.wrappers){
    const before=original(root,transport.source_parent,row.path);assert.equal(hash(before),row.before.sha256);assert.equal(before.length,row.before.bytes);
    let after=before.toString();assert.equal(row.literal_edits.length,2);
    for(const edit of row.literal_edits){assert.equal(after.split(edit.before).length,2);after=after.replace(edit.before,edit.after);}
    assert.equal(hash(after),row.after.sha256);assert.equal(Buffer.byteLength(after),row.after.bytes);
    assert.equal(member(row.path,row.after.sha256).raw.toString(),after,'unreviewed wrapper assertion change');
  }
  for(const path of ['scripts/historical-chip-reference-fixture.py','scripts/run-historical-source-inspector.mjs',
    'scripts/historical-chip-current-subject.mjs','tests/historical_chip_current_rejection_probe.mjs','tests/test_historical_chip_source_subject.py'])retained(path);
  const qualificationMember=retained('compatibility/rc/historical-chip-source-inspector-qualification.json'),qualification=JSON.parse(qualificationMember.raw);
  assert.equal(qualification.line,line);assert.equal(qualification.integration_tests_passed,5);
  assert.equal(qualification.remaining_canonical_reference_successors,4);assert.equal(qualification.full_verify_lite_pass_claimed,false);
  assert.equal(qualification.g11_claim,'not-passed');assert.equal(qualification.g13_claim,'not-passed');
  assert.deepEqual(qualification.historical_probe_controls_per_family,{surface:88,form:77,navigation:91});
  for(const [index,ref]of qualification.historical_replays.entries()){
    const bytes=retained(ref.path);assert.deepEqual(bytes.ref,ref);const replay=JSON.parse(bytes.raw);
    assert.equal(replay.line,line);assert.equal(replay.family,['surface','form','navigation'][index]);
    assert.equal(replay.historical_subject.reference_commit,transport.historical_reference);
    assert.equal(replay.historical_subject.original_probe_source_unchanged,true);assert.equal(replay.historical_subject.all_selected_members_rehashed,true);
    assert.equal(replay.current_source_qualified,false);assert.equal(replay.historical_report.controls,[88,77,91][index]);
    const path='tests/spec_'+replay.family+'_async_source_probe.mjs';
    assert.equal(hash(original(root,transport.historical_reference,path)),replay.historical_report.producer_sha256);
    retained(path);assert.equal(hash(read(path)),replay.historical_report.producer_sha256);
  }
  for(const ref of [qualification.current_source_qualification,qualification.current_source_timing,qualification.historical_bytes_rejected_as_current,qualification.integration_tests]){
    assert.deepEqual(retained(ref.path).ref,ref);
  }
  const current=JSON.parse(read(qualification.current_source_qualification.path));assert.equal(current.line,line);
  assert.equal(current.current_subject.product_members,1142);assert.equal(current.current_subject.required_full_case_ids,2236);
  assert.equal(current.current_subject.authenticated_historical_reset_method_equal,true);
  assert.equal(current.current_subject.required_empty_query_regression.complete_case_body_unchanged,true);
  assert.equal(current.actual_Angular_native_artifact_rendered_or_floor_qualified,false);
  for(const ref of [current.producer,current.current_subject.source_owner])assert.equal(retained(ref.path).ref.sha256,ref.sha256);
  const previousCoordinator=current.current_subject.source_coordinator;
  assert.equal(hash(original(root,subject.parent,previousCoordinator.path)),previousCoordinator.sha256);
  // This is the authenticated pre-metadata qualification. Current product bytes
  // remain checked by the shared source owner; no old coordinator is replayed.
  for(const ref of [current.current_subject.actual_chip_source,current.current_subject.actual_chip_spec])assert.deepEqual(retained(ref.path).ref,ref);
  const before=original(root,subject.parent,HISTORICAL_WRAPPER_LEDGER);assert.equal(hash(before),subject.before);
  assert.deepEqual(transport.ledger_before_reference_refresh,{path:HISTORICAL_WRAPPER_LEDGER,sha256:hash(before),bytes:before.length});
  const ledger=JSON.parse(before),nav=transport.wrappers[2];assert.equal(ledger.entries.length,1697);
  const selected=ledger.entries.filter(row=>row.individual_proof?.source_evidence?.some(ref=>ref.path===nav.path));
  assert.deepEqual(selected.map(row=>row.sha),shas);assert.deepEqual(transport.canonical_reference_refresh_required.map(row=>row.sha),shas);
  const entries=[],reports=[];let hunks=0;
  for(const selected of transport.canonical_reference_refresh_required){
    const prior=ledger.entries.find(row=>row.sha===selected.sha);assert.equal(hash(json(prior)),selected.before_entry_sha256);
    assert.equal(prior.evidence_report,selected.evidence_report);assert.equal(prior.final_disposition,'do-not-adopt');
    assert.equal(prior.individual_proof.proof_kind,'individual-complete-spec-source-applicability');assert.equal(prior.g11_claim,'not-passed');
    const priorReview=retained(prior.evidence_report),body=JSON.parse(priorReview.raw);assert.deepEqual(body.individual_proof,prior.individual_proof);
    assert.equal(body.sha,prior.sha);assert.equal(body.line,line);assert.equal(body.status,'reviewed');assert.equal(body.g11_claim,'not-passed');
    assert.equal(body.hunk_reviews.length,body.original_hunks);hunks+=body.original_hunks;
    const patch=retained(body.patch_file);assert.equal(hash(patch.raw),body.diff_sha256);
    const indices=prior.individual_proof.source_evidence.flatMap((ref,i)=>ref.path===nav.path?[i]:[]);
    assert.deepEqual(indices,[selected.reference_index]);const index=indices[0],old=prior.individual_proof.source_evidence[index];
    assert.deepEqual(old,selected.before_reference);assert.equal(old.sha256,nav.before.sha256);
    const next={...old,sha256:nav.after.sha256};assert.deepEqual(next,selected.after_reference);
    const context={role:'Exact original-source wrapper transport metadata; inherited review fields retain their original epoch.',
      source_parent:subject.parent,prior_entry_sha256:hash(json(prior)),prior_review:priorReview.ref,
      wrapper_delta:transportMember.ref,pre_metadata_source_qualification:qualificationMember.ref,
      original_hunk_judgments_dispositions_and_native_requirements_preserved:true,
      source_reference_updates:1,actual_Angular_native_artifact_rendered_or_floor_qualified:false,g11_claim:'not-passed'};
    const entry=structuredClone(prior),review=structuredClone(body);entry.individual_proof.source_evidence[index]=next;
    entry.individual_proof.historical_source_wrapper_successor=structuredClone(context);review.individual_proof=structuredClone(entry.individual_proof);
    assert.deepEqual(review.independent_source_evidence[index],old);review.independent_source_evidence[index]=structuredClone(next);
    review.historical_source_wrapper_successor=structuredClone(context);
    const path='compatibility/f10/disposition-ledger/evidence/closeout-historical-source-wrapper-'+prior.sha+'.json',raw=json(review),ref={path,sha256:hash(raw),bytes:raw.length};
    entry.evidence_report=path;assert.equal(entry.source_check.evidence_report_sha256,priorReview.ref.sha256);entry.source_check.evidence_report_sha256=ref.sha256;
    reports.push({sha:prior.sha,path,raw,body:review,ref});entries.push({sha:prior.sha,before_entry_sha256:hash(json(prior)),prior_review:priorReview.ref,current_review:ref,after_entry:entry});
  }
  assert.equal(hunks,198);
  const assertCurrent=()=>{for(const ref of bound.values()){const raw=read(ref.path);assert.equal(hash(raw),ref.sha256,'late historical wrapper metadata subject '+ref.path);assert.equal(raw.length,ref.bytes);}};
  assertCurrent();return {line,before:Buffer.from(before),entries,reports,bound:structuredClone([...bound.values()]),assertCurrent,
    metadata_entries:4,source_reference_updates:4,report_reference_updates:4,report_digest_updates:4,original_hunks_preserved:198,
    original_dispositions_or_hunk_judgments_changed:0,current_native_artifact_floor_or_G11_credit:false};
}
