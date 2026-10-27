/**
 * @license
 * Copyright Google LLC All Rights Reserved.
 * Copyright (c) 2026 Ryan Lester.
 * Use of this source code is governed by the MIT license in LICENSE.
 */
/** Fourteen exact source-reference tokens; no new upstream or runtime conclusions. */
import assert from 'node:assert/strict';
import {execFileSync} from 'node:child_process';
import {createHash} from 'node:crypto';
import {createRequire} from 'node:module';
import {requiresTestingApi21xEntry} from './upstream-testing-api-21x-admission.mjs';
import {requiresSassInspectionScope} from './upstream-sass-inspection-admission.mjs';
import {requiresRulesJsBuild} from './upstream-rules-js-build-admission.mjs';
import {requiresLegacySassEntrypointScope} from './upstream-legacy-sass-entrypoint-admission.mjs';
const ts=createRequire(import.meta.url)('typescript');
export const CHECKER_REFERENCE_REVIEW='compatibility/rc/checker-reference-metadata-review.json';
export const CHECKER_REFERENCE_LEDGER='compatibility/f10/disposition-ledger/ledger.json';
const reviewHash='b65c4822274eaf5f5ee7cfe3683e8b2e29a6867518d317e1a644cbc8b6924c62';
const afterHash='d015c3d9cca4b9ea489da7028ab5a8bcd675adf428db3000ed60c0b2380f0e27';
const hash=raw=>createHash('sha256').update(raw).digest('hex');
// Only immutable authenticated Git objects and their parsed before-image are
// cached. Every live source, report, guard module and manifest is read afresh.
const originals=new Map(),syntax=new Map();
function original(root,commit,path){
  assert.match(commit,/^[0-9a-f]{40}$/);const key=JSON.stringify([root,commit,path]);
  if(!originals.has(key)){
    const env={...process.env,GIT_NO_LAZY_FETCH:'1',GIT_NO_REPLACE_OBJECTS:'1'};
    for(const name of ['GIT_DIR','GIT_WORK_TREE','GIT_INDEX_FILE','GIT_COMMON_DIR','GIT_OBJECT_DIRECTORY','GIT_ALTERNATE_OBJECT_DIRECTORIES'])delete env[name];
    originals.set(key,execFileSync('git',['--no-replace-objects','-c','gc.auto=0','-c','maintenance.auto=0','show',commit+':'+path],{cwd:root,env,maxBuffer:8*1024*1024}));
  }
  return Buffer.from(originals.get(key));
}
function property(node,key){
  assert.ok(ts.isObjectLiteralExpression(node));const found=node.properties.filter(row=>row.name?.text===key);
  assert.equal(found.length,1);return found[0].initializer;
}
export function reconstructReviewedChecker(review){
  const lines=review.original_checker.split(/(?<=\n)/),output=[];let cursor=0;
  assert.equal(review.complete_checker_hunk_reviews.length,6);
  for(const [index,hunk]of review.complete_checker_hunk_reviews.entries()){
    assert.equal(hunk.index,index+1);assert.equal(hash(hunk.text),hunk.sha256);
    const parts=hunk.text.split(/(?<=\n)/),header=parts.shift().trimEnd();assert.equal(header,hunk.header);
    const match=header.match(/^@@ -(\d+),(\d+) \+(\d+),(\d+) @@/);assert.ok(match);
    const from=Number(match[1])-1;assert.ok(from>=cursor);output.push(...lines.slice(cursor,from));
    const old=[],next=[];
    for(const line of parts){
      assert.ok([' ','+','-'].includes(line[0]),'unexpected checker patch record');
      if(line[0]!=='+' )old.push(line.slice(1));
      if(line[0]!=='-')next.push(line.slice(1));
    }
    assert.equal(old.length,Number(match[2]));assert.equal(next.length,Number(match[4]));
    assert.deepEqual(lines.slice(from,from+old.length),old);assert.ok(hunk.decision.length>100);
    output.push(...next);cursor=from+old.length;
  }
  output.push(...lines.slice(cursor));return output.join('');
}
export function checkerReferenceMetadata({root,read,line='21.x'}={}){
  assert.equal(line,'21.x');
  const bound=new Map();
  function member(ref){
    const raw=read(ref.path);assert.equal(hash(raw),ref.sha256,'changed checker metadata input '+ref.path);
    if(ref.bytes!==undefined)assert.equal(raw.length,ref.bytes);bound.set(ref.path,{path:ref.path,sha256:ref.sha256,bytes:raw.length});return raw;
  }
  const review=JSON.parse(member({path:CHECKER_REFERENCE_REVIEW,sha256:reviewHash}));
  const manifest='projects/ngx-material-legacy/package.json';
  assert.equal(JSON.parse(member({path:manifest,sha256:hash(original(root,review.source_parent,manifest))})).version.startsWith('21.'),true);
  assert.equal(review.line,line);assert.equal(review.status,'reviewed');assert.equal(review.metadata_reference_updates,14);
  for(const key of ['new_SHA_decisions','original_hunk_judgments_or_native_cases_changed','original_review_bytes_changed','product_changes'])assert.equal(review[key],0);
  assert.equal(review.actual_native_artifact_browser_floor_or_full_audit_qualified,false);assert.equal(review.g11_claim,'not-passed');
  assert.equal(hash(review.complete_checker_diff),review.complete_checker_diff_sha256);
  assert.equal(review.complete_checker_diff.split(/(?=^@@ )/m).slice(1).join(''),review.complete_checker_hunk_reviews.map(row=>row.text).join(''));
  const checker=review.checker,live=member({path:checker.path,sha256:checker.current_sha256,bytes:checker.current_bytes});
  for(const [commit,digest,bytes]of [[checker.old_commit,checker.old_sha256,checker.old_bytes],
    [checker.recent_commit,checker.recent_sha256,checker.recent_bytes],[checker.current_commit,checker.current_sha256,checker.current_bytes]]){
    const raw=original(root,commit,checker.path);assert.equal(hash(raw),digest);assert.equal(raw.length,bytes);
  }
  assert.equal(review.original_checker,original(root,checker.old_commit,checker.path).toString());
  assert.equal(review.current_checker,live.toString());assert.equal(reconstructReviewedChecker(review),live.toString());
  for(const ref of review.guard_modules)member(ref);assert.equal(review.guard_modules.length,4);
  const before=original(root,review.source_parent,CHECKER_REFERENCE_LEDGER);assert.equal(hash(before),review.before_ledger.sha256);
  assert.equal(before.length,review.before_ledger.bytes);const data=JSON.parse(before),expected=structuredClone(data);
  assert.equal(data.entries.length,1697);assert.equal(new Set(data.entries.map(row=>row.sha)).size,1697);
  const selected=data.entries.flatMap(row=>(row.individual_proof?.historical_behavior?.source_members??[]).flatMap((ref,index)=>ref.path===checker.path?[{sha:row.sha,index}]:[]));
  assert.deepEqual(selected,review.selected_entries.map(row=>({sha:row.sha,index:row.source_member_index})));assert.equal(selected.length,14);
  const text=before.toString(),key=hash(before);
  if(!syntax.has(key))syntax.set(key,ts.parseJsonText('immutable-checker-reference-ledger.json',text));
  const ast=syntax.get(key);assert.equal(ast.parseDiagnostics.length,0);
  const entries=property(ast.statements[0].expression,'entries');assert.ok(ts.isArrayLiteralExpression(entries));
  const edits=[];
  for(const change of review.selected_entries){
    const index=data.entries.findIndex(row=>row.sha===change.sha),entry=data.entries[index];assert.ok(index>=0);
    assert.equal(requiresTestingApi21xEntry(entry,line,read),false);assert.equal(requiresSassInspectionScope(entry),false);
    assert.equal(requiresRulesJsBuild(entry),false);assert.equal(requiresLegacySassEntrypointScope(entry),false);
    const refs=entry.individual_proof.historical_behavior.source_members;
    assert.deepEqual(refs[change.source_member_index],{path:checker.path,sha256:change.before_sha256});
    assert.ok([checker.old_sha256,checker.recent_sha256].includes(change.before_sha256));assert.equal(change.after_sha256,checker.current_sha256);
    assert.equal(entry.evidence_report,change.evidence_report.path);member(change.evidence_report);
    const node=property(property(property(entries.elements[index],'individual_proof'),'historical_behavior'),'source_members').elements[change.source_member_index];
    const digest=property(node,'sha256');assert.equal(JSON.parse(digest.getText(ast)),change.before_sha256);
    edits.push({start:digest.getStart(ast),end:digest.end,text:JSON.stringify(change.after_sha256)});
    expected.entries[index].individual_proof.historical_behavior.source_members[change.source_member_index].sha256=change.after_sha256;
  }
  let after=text;for(const edit of edits.sort((a,b)=>b.start-a.start))after=after.slice(0,edit.start)+edit.text+after.slice(edit.end);
  after=Buffer.from(after);assert.equal(after.length,before.length);assert.equal(hash(after),afterHash);assert.deepEqual(JSON.parse(after),expected);
  const assertCurrent=()=>{for(const ref of bound.values()){const raw=read(ref.path);assert.equal(hash(raw),ref.sha256,'late checker metadata input '+ref.path);assert.equal(raw.length,ref.bytes);}};
  assertCurrent();return {line,before,after,bound:structuredClone([...bound.values()]),assertCurrent,
    checker_digest_tokens:14,original_hunk_judgments_changed:0,unselected_entries_preserved:1683,individual_decisions:0};
}
