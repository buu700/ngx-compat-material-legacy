/**
 * @license
 * Copyright Google LLC All Rights Reserved.
 * Copyright (c) 2026 Ryan Lester.
 * Use of this source code is governed by the MIT license in LICENSE.
 */
/** Exact stronger-checker successor; historical metadata never replaces raw execution bytes. */
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {execFileSync} from 'node:child_process';
import {createRequire} from 'node:module';
const ts=createRequire(import.meta.url)('typescript');
export const REGISTERED_CHECKER='scripts/check-upstream-audit-disposition.mjs';
export const REGISTERED_CHECKER_BEFORE='96b287075747b100d615b9ee720fa0db2d1dfecf39545ae0dbb36504c472ce44';
export const REGISTERED_CHECKER_AFTER='4a6002153caabe102887bcd8847128818c2f7025a3d1257d97cd446f34fbf106';
const predicate='scripts/upstream-registered-source-review.mjs',predicateHash='524b9dc06153cac660f42c64039f13c7d388306ea6dfbab3bbcef168c92bfe61';
const reviewPath='compatibility/rc/checker-reference-metadata-review.json',reviewHash='b65c4822274eaf5f5ee7cfe3683e8b2e29a6867518d317e1a644cbc8b6924c62';
const hash=raw=>createHash('sha256').update(raw).digest('hex'),originals=new Map();
export function registeredSourceCheckerTransition({root,read}){
  if(!originals.has(root)){
    const env={...process.env,GIT_NO_LAZY_FETCH:'1',GIT_NO_REPLACE_OBJECTS:'1'};
    for(const name of ['GIT_DIR','GIT_WORK_TREE','GIT_INDEX_FILE','GIT_COMMON_DIR','GIT_OBJECT_DIRECTORY','GIT_ALTERNATE_OBJECT_DIRECTORIES'])delete env[name];
    originals.set(root,execFileSync('git',['--no-replace-objects','-c','gc.auto=0','-c','maintenance.auto=0','show',
      'e5f713f9d7eb088da729aec53835041dd6ffc521:'+REGISTERED_CHECKER],{cwd:root,env,maxBuffer:1024*1024}));
  }
  const before=Buffer.from(originals.get(root));assert.equal(hash(before),REGISTERED_CHECKER_BEFORE);
  let text=before.toString();
  for(const [from,to]of [
    ["import {reviewMetadataComplete,individualReviewScopeOk} from './upstream-individual-evidence-scope.mjs';",
      "import {reviewMetadataComplete,individualReviewScopeOk} from './upstream-individual-evidence-scope.mjs';\nimport {requiresRegisteredSourceReview} from './upstream-registered-source-review.mjs';"],
    ['  const sensitive = sensitiveClass(entry) ||',
      '  const sensitive = requiresRegisteredSourceReview(entry, entry.individual_proof) || sensitiveClass(entry) ||'],
  ]){assert.equal(text.split(from).length,2);text=text.replace(from,to);}
  const after=Buffer.from(text);assert.equal(hash(after),REGISTERED_CHECKER_AFTER);
  const assertCurrent=()=>{assert.equal(hash(read(REGISTERED_CHECKER)),REGISTERED_CHECKER_AFTER,'changed registered-source checker');assert.equal(hash(read(predicate)),predicateHash,'changed registered-source predicate');};
  assertCurrent();
  // This reader is private to authenticated old metadata reconstruction.
  // The shared owner continues to expose its caller's raw checker bytes.
  const beforeRead=path=>{if(path!==REGISTERED_CHECKER)return read(path);assertCurrent();return Buffer.from(before);};
  return {before,after,beforeRead,assertCurrent,bound:[{path:REGISTERED_CHECKER,sha256:REGISTERED_CHECKER_AFTER},{path:predicate,sha256:predicateHash}]};
}
function property(node,key){assert.ok(ts.isObjectLiteralExpression(node));const found=node.properties.filter(row=>row.name?.text===key);assert.equal(found.length,1);return found[0].initializer;}
/** Exactly fourteen digest string tokens; all original conclusions stay intact. */
export function refreshRegisteredCheckerReferences({root,read,before}){
  const transition=registeredSourceCheckerTransition({root,read}),raw=read(reviewPath);assert.equal(hash(raw),reviewHash);
  const review=JSON.parse(raw),data=JSON.parse(before),expected=structuredClone(data);
  const selected=data.entries.flatMap(entry=>(entry.individual_proof?.historical_behavior?.source_members??[]).flatMap((ref,index)=>
    ref.path===REGISTERED_CHECKER?[{sha:entry.sha,index}]:[]));
  assert.deepEqual(selected,review.selected_entries.map(row=>({sha:row.sha,index:row.source_member_index})));assert.equal(selected.length,14);
  const text=before.toString(),source=ts.parseJsonText('registered-checker-metadata.json',text);assert.equal(source.parseDiagnostics.length,0);
  const entries=property(source.statements[0].expression,'entries');assert.ok(ts.isArrayLiteralExpression(entries));const edits=[];
  for(const change of selected){
    const index=data.entries.findIndex(row=>row.sha===change.sha),refs=expected.entries[index].individual_proof.historical_behavior.source_members;
    assert.deepEqual(refs[change.index],{path:REGISTERED_CHECKER,sha256:REGISTERED_CHECKER_BEFORE});refs[change.index].sha256=REGISTERED_CHECKER_AFTER;
    const node=property(property(property(property(entries.elements[index],'individual_proof'),'historical_behavior'),'source_members').elements[change.index],'sha256');
    assert.equal(JSON.parse(node.getText(source)),REGISTERED_CHECKER_BEFORE);edits.push({start:node.getStart(source),end:node.end,text:JSON.stringify(REGISTERED_CHECKER_AFTER)});
  }
  let cursor=0;const chunks=[];
  for(const edit of edits.sort((a,b)=>a.start-b.start)){assert.ok(edit.start>=cursor);chunks.push(text.slice(cursor,edit.start),edit.text);cursor=edit.end;}
  chunks.push(text.slice(cursor));const after=Buffer.from(chunks.join(''));assert.deepEqual(JSON.parse(after),expected);
  transition.assertCurrent();return {before,after,metadata_tokens:14,selected,bound:[...transition.bound,{path:reviewPath,sha256:reviewHash}],assertCurrent:transition.assertCurrent};
}
