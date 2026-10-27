/**
 * @license
 * Copyright Google LLC All Rights Reserved.
 * Copyright (c) 2026 Ryan Lester.
 * Use of this source code is governed by the MIT license in LICENSE.
 */
/** Exact reference successors for 65 historical wrapper receipts; no new source decisions. */
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {execFileSync} from 'node:child_process';
import {readEvidenceMember} from './upstream-packed-run-evidence.mjs';
export const CONSUMER_WRAPPER_LEDGER='compatibility/f10/disposition-ledger/ledger.json';
export const CONSUMER_WRAPPER_TRANSPORT='compatibility/rc/historical-consumer-wrapper-successor.json';
export const CONSUMER_WRAPPER_QUALIFICATION='compatibility/rc/historical-consumer-wrapper-transport-qualification.json';
export const CONSUMER_WRAPPER_PACKET='compatibility/rc/historical-consumer-wrapper-ledger-successor.json';
const subjects={
  main:{parent:'35688ab4bfe88de585342f194f3463f409c03cbc',before:'bee1639e775904d7d7a5a6434b6e025455a7be03851a80e83cb66d29a0320df2',transport:'a1f9d4e3455d6c8ffc74bbbfefa69b001c0db6a091c3edfefab57999e7c3d0b4'},
  '21.x':{parent:'0b04eb7edafa94c1545d419a2b5455f5a95030c7',before:'04d7e2bf4ec9801b28b2fb5093a2d748427801b2fc3d9cbcbc88e38369b44271',transport:'fa2aa9675b856020dd4e24791d74684ce47513bfd248d81b21e1d61775200502'},
};
const hash=raw=>createHash('sha256').update(raw).digest('hex'),json=value=>Buffer.from(JSON.stringify(value,null,2)+'\n');
const immutable=new Map();
function original(root,parent,path){
  const key=JSON.stringify([root,parent,path]);
  if(!immutable.has(key)){
    const env={...process.env,GIT_NO_LAZY_FETCH:'1',GIT_NO_REPLACE_OBJECTS:'1'};
    for(const name of ['GIT_DIR','GIT_WORK_TREE','GIT_INDEX_FILE','GIT_COMMON_DIR','GIT_OBJECT_DIRECTORY','GIT_ALTERNATE_OBJECT_DIRECTORIES'])delete env[name];
    immutable.set(key,execFileSync('git',['--no-replace-objects','-c','gc.auto=0','-c','maintenance.auto=0','show',parent+':'+path],{cwd:root,env,maxBuffer:16*1024*1024}));
  }
  return Buffer.from(immutable.get(key));
}
function entrySpans(text){
  const marker='"entries": [',start=text.indexOf(marker);assert.ok(start>=0);let cursor=start+marker.length;const spans=[];
  for(;;){
    while(/[\s,]/.test(text[cursor]??''))cursor++;
    if(text[cursor]===']')return spans;
    assert.equal(text[cursor],'{','invalid canonical ledger entry start');const from=cursor,stack=[];let quoted=false;
    do{
      const char=text[cursor++];assert.notEqual(char,undefined,'unterminated canonical ledger entry');
      if(quoted){if(char==='\\')cursor++;else if(char==='"')quoted=false;continue;}
      if(char==='"')quoted=true;else if(char==='{'||char==='[')stack.push(char==='{'?'}':']');
      else if(char==='}'||char===']')assert.equal(stack.pop(),char,'invalid canonical ledger structure');
    }while(stack.length);
    spans.push({start:from,end:cursor});
  }
}
/** Formatting only: callers must independently qualify every replacement. */
export function replaceHistoricalConsumerEntries(before,entries){
  const ledger=JSON.parse(before),replacements=new Map(entries.map(row=>[row.sha,row]));
  assert.equal(replacements.size,entries.length,'duplicate metadata replacement');
  assert.equal(new Set(ledger.entries.map(row=>row.sha)).size,ledger.entries.length,'duplicate original entry');
  const text=before.toString(),parts=[],spans=entrySpans(text);let last=0,applied=0;
  assert.equal(spans.length,ledger.entries.length);
  for(const [index,prior]of ledger.entries.entries()){
    const span=spans[index];assert.deepEqual(JSON.parse(text.slice(span.start,span.end)),prior);
    if(replacements.has(prior.sha)){
      const next=replacements.get(prior.sha);assert.equal(next.after_entry.sha,prior.sha);
      parts.push(text.slice(last,span.start),JSON.stringify(next.after_entry,null,2).replace(/\n/g,'\n    '));last=span.end;applied++;
    }
  }
  assert.equal(applied,entries.length,'unknown metadata replacement');parts.push(text.slice(last));
  const after=Buffer.from(parts.join('')),expected=structuredClone(ledger);
  for(const row of entries)expected.entries[expected.entries.findIndex(entry=>entry.sha===row.sha)]=row.after_entry;
  assert.deepEqual(JSON.parse(after),expected);return after;
}

export function historicalConsumerWrapperMetadata({root,read=path=>readEvidenceMember(root,path),line}={}){
  const version=JSON.parse(read('projects/ngx-material-legacy/package.json')).version;
  const actual=version.startsWith('21.')?'21.x':version.startsWith('22.')?'main':null;line??=actual;assert.equal(line,actual);assert.ok(line);
  const subject=subjects[line],bound=new Map();
  function member(path,expected){
    readEvidenceMember(root,path);const raw=read(path);if(expected)assert.equal(hash(raw),expected,'changed wrapper metadata input '+path);
    const ref={path,sha256:hash(raw),bytes:raw.length};bound.set(path,ref);return {raw,ref};
  }
  const retained=path=>member(path,hash(original(root,subject.parent,path)));
  const transportMember=member(CONSUMER_WRAPPER_TRANSPORT,subject.transport),transport=JSON.parse(transportMember.raw);
  assert.equal(transport.line,line);assert.equal(transport.source_parent,subject.parent);assert.equal(transport.wrappers.length,23);
  assert.equal(transport.original_assertion_or_timeout_changes,0);assert.equal(transport.original_Node_probe_sources_and_assertions_unchanged,true);
  assert.equal(transport.canonical_entries,65);assert.equal(transport.original_hunks_to_preserve,7770);assert.equal(transport.new_upstream_SHA_decisions,0);
  assert.equal(transport.actual_native_artifact_browser_floor_or_full_audit_qualified,false);
  const wrappers=new Map();
  for(const row of transport.wrappers){
    const prior=original(root,subject.parent,row.path);assert.equal(hash(prior),row.before.sha256);assert.equal(prior.length,row.before.bytes);
    let after=prior.toString();assert.equal(row.literal_edits.length,2);
    for(const edit of row.literal_edits){assert.equal(after.split(edit.before).length,2);after=after.replace(edit.before,edit.after);}
    assert.equal(hash(after),row.after.sha256);assert.equal(Buffer.byteLength(after),row.after.bytes);
    assert.equal(member(row.path,row.after.sha256).raw.toString(),after);assert.equal(row.normalized_Python_AST_equal,true);
    retained(row.probe);wrappers.set(row.path,row);
  }
  assert.equal(wrappers.size,23);
  const qualifiedMember=member(CONSUMER_WRAPPER_QUALIFICATION),qualified=JSON.parse(qualifiedMember.raw);
  assert.equal(qualified.line,line);assert.equal(qualified.wrapper_successor.sha256,transportMember.ref.sha256);
  assert.equal(qualified.transport_methods_passed,23);assert.equal(qualified.transport_methods_failed,0);
  assert.equal(qualified.original_assertions_constants_names_and_timeouts_preserved,true);
  assert.equal(qualified.actual_native_artifact_browser_floor_or_full_audit_qualified,false);
  for(const ref of qualified.bound_inputs)assert.deepEqual(member(ref.path,ref.sha256).ref,ref);
  const pre=retained(transport.pre_transport_current_contract_qualification.path);
  assert.equal(pre.ref.sha256,transport.pre_transport_current_contract_qualification.sha256);
  const current=JSON.parse(pre.raw);assert.equal(current.source_contract_consumers_covered,15);
  assert.equal(current.required_full_case_ids,2236);assert.equal(current.shared_current_source_owner_used,true);
  assert.equal(current.actual_Angular_native_artifact_browser_floor_or_full_audit_qualified,false);
  const before=original(root,subject.parent,CONSUMER_WRAPPER_LEDGER);assert.equal(hash(before),subject.before);
  assert.deepEqual(transport.ledger_before_reference_refresh,{path:CONSUMER_WRAPPER_LEDGER,sha256:hash(before),bytes:before.length});
  const ledger=JSON.parse(before);assert.equal(ledger.entries.length,1697);
  const selected=ledger.entries.filter(row=>row.individual_proof?.source_evidence?.some(ref=>wrappers.has(ref.path)));
  assert.deepEqual(selected.map(row=>row.sha),transport.canonical_reference_refresh_required.map(row=>row.sha));assert.equal(selected.length,65);
  const entries=[],reports=[];let hunks=0;
  for(const transition of transport.canonical_reference_refresh_required){
    const prior=ledger.entries.find(row=>row.sha===transition.sha);assert.equal(hash(json(prior)),transition.before_entry_sha256);
    assert.equal(prior.final_disposition,transition.final_disposition);assert.equal(prior.g11_claim,'not-passed');
    const oldReview=retained(prior.evidence_report);assert.deepEqual(oldReview.ref,transition.prior_review);
    const body=JSON.parse(oldReview.raw);assert.deepEqual(body.individual_proof,prior.individual_proof);
    assert.deepEqual(body.independent_source_evidence,prior.individual_proof.source_evidence);
    const originalHunks=member(transition.original_hunk_review_subject.path,transition.original_hunk_review_subject.sha256);
    assert.equal(originalHunks.raw.equals(original(root,subject.parent,originalHunks.ref.path)),true);
    const hunkBody=JSON.parse(originalHunks.raw);assert.equal(hunkBody.hunk_reviews.length,transition.original_hunks);hunks+=transition.original_hunks;
    if(!body.hunk_reviews){assert.deepEqual(body.historical_source_review,hunkBody);assert.equal(body.original_source_review.sha256,originalHunks.ref.sha256);}
    member(body.patch_file,body.diff_sha256);
    const entry=structuredClone(prior),review=structuredClone(body);
    for(const change of transition.source_reference_changes){
      const old=prior.individual_proof.source_evidence[change.index],wrapper=wrappers.get(old.path);assert.ok(wrapper);
      assert.deepEqual(old,change.before);assert.equal(old.sha256,wrapper.before.sha256);
      assert.deepEqual(change.after,{...old,sha256:wrapper.after.sha256});
      entry.individual_proof.source_evidence[change.index]=structuredClone(change.after);
      review.independent_source_evidence[change.index]=structuredClone(change.after);
    }
    assert.equal(transition.source_reference_changes.length,1);
    const context={role:'Exact historical wrapper reference metadata; inherited source fields retain their recorded original epoch.',
      source_parent:subject.parent,prior_entry_sha256:transition.before_entry_sha256,prior_review:oldReview.ref,
      wrapper_transport:transportMember.ref,transport_qualification:qualifiedMember.ref,
      pre_transport_current_contract_qualification:pre.ref,original_hunk_review_subject:originalHunks.ref,
      original_hunk_judgments_dispositions_and_native_requirements_preserved:true,
      actual_native_artifact_browser_floor_or_full_audit_qualified:false,g11_claim:'not-passed'};
    entry.individual_proof.historical_consumer_wrapper_successor=structuredClone(context);
    review.individual_proof=structuredClone(entry.individual_proof);review.historical_consumer_wrapper_successor=structuredClone(context);
    const path='compatibility/f10/disposition-ledger/evidence/closeout-historical-consumer-wrapper-'+prior.sha+'.json';
    const raw=json(review),ref={path,sha256:hash(raw),bytes:raw.length};entry.evidence_report=path;
    assert.equal(entry.source_check.evidence_report_sha256,oldReview.ref.sha256);entry.source_check.evidence_report_sha256=ref.sha256;
    reports.push({sha:prior.sha,path,raw,body:review,ref});entries.push({sha:prior.sha,before_entry_sha256:transition.before_entry_sha256,prior_review:oldReview.ref,current_review:ref,after_entry:entry});
  }
  assert.equal(hunks,7770);
  // Scan the original entry sequence once. Repeated full-ledger string
  // replacements would allocate the multi-megabyte ledger 65 times per check.
  const after=replaceHistoricalConsumerEntries(before,entries);
  const assertCurrent=()=>{for(const ref of bound.values()){const raw=read(ref.path);assert.equal(hash(raw),ref.sha256,'late historical consumer metadata input '+ref.path);assert.equal(raw.length,ref.bytes);}};
  assertCurrent();return {line,before,after,entries,reports,bound:structuredClone([...bound.values()]),assertCurrent,
    metadata_entries:65,source_reference_updates:65,report_reference_updates:65,report_digest_updates:65,
    original_hunks_preserved:7770,original_dispositions_or_hunk_judgments_changed:0,individual_decisions:0,
    current_native_artifact_floor_or_G11_credit:false};
}
