/**
 * @license
 * Copyright Google LLC All Rights Reserved.
 * Copyright (c) 2026 Ryan Lester.
 * Use of this source code is governed by the MIT license in LICENSE.
 */
/** Twelve source-only review successors for the seven exact Sass notices. */
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {execFileSync} from 'node:child_process';
import {readEvidenceMember} from './upstream-packed-run-evidence.mjs';
import {sassWrapperNoticeSubject,SASS_NOTICE_PACKET,SASS_NOTICE_READERS} from './sass-wrapper-notice-subject.mjs';

export const SASS_NOTICE_METADATA_PARENT='a9976c96ba09af54754f1e3ec4cb4a98cd5ba49b';
export const SASS_NOTICE_METADATA_PACKET='compatibility/rc/sass-wrapper-notice-ledger-successor.json';
export const SASS_NOTICE_METADATA_ROSTER='compatibility/rc/sass-wrapper-notice-remaining-source-metadata.json';
export const SASS_NOTICE_METADATA_LEDGER='compatibility/f10/disposition-ledger/ledger.json';
const beforeHash='892cccca548a6f5b26821906561c5ea46ce127e443b96cf566ea48d27673f84b';
const rosterHash='cb1c405a09dc0d55cf493eb72122f8069b97cad10fbe216b30cde4a1864d935c';
const hash=raw=>createHash('sha256').update(raw).digest('hex');
const json=value=>Buffer.from(JSON.stringify(value,null,2)+'\n');
const objects=new Map();
function original(root,path){
  const key=root+'\0'+path;
  if(!objects.has(key)){
    const env={...process.env,GIT_NO_LAZY_FETCH:'1',GIT_NO_REPLACE_OBJECTS:'1'};
    for(const k of ['GIT_DIR','GIT_WORK_TREE','GIT_INDEX_FILE','GIT_COMMON_DIR','GIT_OBJECT_DIRECTORY','GIT_ALTERNATE_OBJECT_DIRECTORIES'])delete env[k];
    objects.set(key,execFileSync('git',['--no-replace-objects','-c','gc.auto=0','-c','maintenance.auto=0','show',SASS_NOTICE_METADATA_PARENT+':'+path],
      {cwd:root,env,maxBuffer:8*1024*1024}));
  }
  return Buffer.from(objects.get(key));
}

export function sassWrapperNoticeMetadata({root,read=p=>readEvidenceMember(root,p)}={}){
  assert.equal(process.versions.node,JSON.parse(read('toolchain-lock.json')).repository.node);
  assert.ok(JSON.parse(read('projects/ngx-material-legacy/package.json')).version.startsWith('22.'));
  const notices=sassWrapperNoticeSubject({root,read,line:'main'});
  const bound=new Map(notices.bound.map(ref=>[ref.path,{...ref}]));
  function member(path,expected){
    readEvidenceMember(root,path);const raw=read(path);
    assert.equal(hash(raw),expected,'changed notice metadata input '+path);
    const ref={path,sha256:hash(raw),bytes:raw.length};bound.set(path,ref);return {raw,ref};
  }
  const roster=JSON.parse(member(SASS_NOTICE_METADATA_ROSTER,rosterHash).raw);
  assert.equal(hash(original(root,SASS_NOTICE_METADATA_ROSTER)),rosterHash);
  const before=original(root,SASS_NOTICE_METADATA_LEDGER);assert.equal(hash(before),beforeHash);
  assert.equal(roster.ledger_subject.sha256,beforeHash);assert.equal(roster.ledger_subject.bytes,before.length);
  assert.equal(roster.line,'main');assert.equal(roster.selected_row_count,12);assert.equal(roster.source_evidence_reference_count,20);
  const source=JSON.parse(read(SASS_NOTICE_PACKET)),sourceRef=bound.get(SASS_NOTICE_PACKET),readerRef=bound.get(SASS_NOTICE_READERS);
  assert.deepEqual(roster.source_delta,sourceRef);
  const changed=new Map(source.subjects.map(row=>[row.path,row]));
  const ledger=JSON.parse(before);assert.equal(ledger.entries.length,1697);
  const selected=ledger.entries.filter(entry=>entry.individual_proof?.source_evidence?.some(ref=>changed.has(ref.path)));
  assert.deepEqual(selected.map(row=>row.sha),roster.selected_rows.map(row=>row.sha));
  const reports=[],entries=[];let sourceReferences=0,reportReferences=0,reportDigests=0,originalHunks=0;
  for(const subject of roster.selected_rows){
    const prior=ledger.entries.find(row=>row.sha===subject.sha);assert.equal(prior.evidence_report,subject.evidence_report);
    assert.equal(prior.final_disposition,'do-not-adopt');assert.equal(prior.g11_claim,'not-passed');
    assert.equal(prior.individual_proof.proof_kind,'individual-complete-spec-source-applicability');
    const priorBytes=original(root,prior.evidence_report),priorReview=member(prior.evidence_report,hash(priorBytes));
    const body=JSON.parse(priorReview.raw);assert.equal(body.sha,prior.sha);assert.equal(body.line,'main');
    assert.equal(body.status,'reviewed');assert.equal(body.g11_claim,'not-passed');
    assert.deepEqual(body.individual_proof,prior.individual_proof);
    const patch=typeof body.diff==='string'?Buffer.from(body.diff):member(body.patch_file,hash(original(root,body.patch_file))).raw;
    assert.equal(hash(patch),body.diff_sha256);assert.equal(body.hunk_reviews.length,body.original_hunks);
    originalHunks+=body.original_hunks;
    const affected=prior.individual_proof.source_evidence.filter(ref=>changed.has(ref.path));
    assert.deepEqual(affected.map(ref=>({path:ref.path,before_sha256:ref.sha256,after_sha256:changed.get(ref.path).after.sha256})),subject.affected_notice_references);
    function refresh(ref){
      const row=changed.get(ref.path);if(!row)return structuredClone(ref);
      assert.equal(ref.sha256,row.before.sha256);const current=notices.qualify(ref);
      return {...ref,sha256:current.sha256,...(ref.bytes===undefined?{}:{bytes:current.bytes})};
    }
    const current=structuredClone(prior),review=structuredClone(body);
    const context={role:'Exact silent-comment source metadata only; inherited review fields describe the original review epoch.',
      source_parent:SASS_NOTICE_METADATA_PARENT,prior_entry_sha256:hash(json(prior)),prior_review:{...priorReview.ref},
      source_delta:{...sourceRef},source_reader_delta:{...readerRef},source_evidence_references_updated:affected.length,
      original_hunks_judgments_dispositions_and_native_requirements_preserved:true,
      actual_Angular_native_artifact_rendered_or_floor_executed:false,g11_claim:'not-passed'};
    current.individual_proof.source_evidence=current.individual_proof.source_evidence.map(refresh);
    current.individual_proof.silent_Sass_notice_source_successor=structuredClone(context);
    review.individual_proof=structuredClone(current.individual_proof);
    const reportAffected=review.independent_source_evidence.filter(ref=>changed.has(ref.path));
    assert.deepEqual(reportAffected,affected);
    review.independent_source_evidence=review.independent_source_evidence.map(refresh);
    review.silent_Sass_notice_source_successor=structuredClone(context);
    const path='compatibility/f10/disposition-ledger/evidence/closeout-sass-notice-source-'+prior.sha+'.json';
    const raw=json(review),ref={path,sha256:hash(raw),bytes:raw.length};
    current.evidence_report=path;
    if(typeof current.source_check==='object'){
      assert.equal(current.source_check.evidence_report_sha256,priorReview.ref.sha256);
      current.source_check.evidence_report_sha256=ref.sha256;reportDigests++;
    }else assert.equal(typeof current.source_check,'string');
    reports.push({sha:prior.sha,path,raw,body:review,ref});
    entries.push({sha:prior.sha,before_entry_sha256:hash(json(prior)),prior_review:priorReview.ref,current_review:ref,
      reference_updates:affected.length,after_entry:current});
    sourceReferences+=affected.length;reportReferences+=reportAffected.length;
  }
  assert.equal(sourceReferences,20);assert.equal(reportReferences,20);assert.equal(reportDigests,4);assert.equal(originalHunks,474);
  const assertCurrent=()=>{notices.assertCurrent();for(const ref of bound.values()){
    const bytes=read(ref.path);assert.equal(hash(bytes),ref.sha256,'late notice metadata input '+ref.path);assert.equal(bytes.length,ref.bytes);
  }};
  assertCurrent();return {line:'main',before:Buffer.from(before),entries,reports,bound:structuredClone([...bound.values()]),assertCurrent,
    selected_source_reviews:12,source_reference_updates:20,report_reference_updates:20,report_digest_updates:4,
    original_hunks_preserved:474,disposition_or_original_review_judgments_changed:0,current_native_artifact_floor_or_G11_credit:false};
}
