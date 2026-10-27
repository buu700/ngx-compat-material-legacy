/**
 * @license
 * Copyright Google LLC All Rights Reserved.
 * Copyright (c) 2026 Ryan Lester.
 * Use of this source code is governed by the MIT license in LICENSE.
 */
/** One branch-native global-Sass exclusion; no inherited/native/floor credit. */
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {readFileSync,realpathSync} from 'node:fs';
import {join} from 'node:path';
import {gunzipSync} from 'node:zlib';
import {candidateProductSourcePaths} from './upstream-candidate-source-evidence.mjs';
import {measureLegacySassEntrypointScope} from './measure-legacy-sass-entrypoint-scope.mjs';
export const LEGACY_SASS_ENTRYPOINT_SHA='86e9e524c3234f44eece21632048cd4290e5f3f4';
export const LEGACY_SASS_ENTRYPOINT_REVIEW='compatibility/rc/21x-c04-sass-entrypoint-individual-review.json';
const reviewSha='e9173324c715f86a8784ae133f598d1b320c5cbbcdab21757623c3648a49a1ea';
const diffSha='a939a0f4eed396376268ba2cdfaee50caf97d586cb3e5b42472e8738fd3cbd39';
const hash=raw=>createHash('sha256').update(raw).digest('hex');
const measurements=new WeakMap();
export function requiresLegacySassEntrypointScope(entry){
  return entry?.sha===LEGACY_SASS_ENTRYPOINT_SHA||entry?.individual_proof?.legacy_sass_entrypoint_scope!==undefined;
}
export function legacySassEntrypointProof(review){
  assert.equal(review.sha,LEGACY_SASS_ENTRYPOINT_SHA);assert.equal(review.line,'21.x');
  return {proof_kind:'individual-legacy-sass-default-module-exclusion',diff_sha256:diffSha,
    review_depth:'individual-compatibility',affected_branches:['21.x'],decision:review.decision,
    legacy_sass_entrypoint_scope:{sha:LEGACY_SASS_ENTRYPOINT_SHA,
      review:{path:LEGACY_SASS_ENTRYPOINT_REVIEW,sha256:reviewSha},source_scope_only:true,
      actual_native_artifact_browser_floor_or_audit_qualified:false}};
}
export function inspectLegacySassEntrypointReview({root,read,line='21.x'}={}){
  assert.equal(line,'21.x');
  assert.equal(JSON.parse(read('projects/ngx-material-legacy/package.json')).version.startsWith('21.'),true);
  const bound=new Map();
  function member(ref){
    assert.ok(ref.path&&!ref.path.startsWith('/')&&!ref.path.includes('\\')&&ref.path.split('/').every(part=>part&&part!=='.'&&part!=='..'));
    const raw=read(ref.path);assert.equal(hash(raw),ref.sha256,'changed entrypoint review input '+ref.path);
    if(ref.bytes!==undefined)assert.equal(raw.length,ref.bytes);bound.set(ref.path,ref.sha256);return raw;
  }
  const body=JSON.parse(member({path:LEGACY_SASS_ENTRYPOINT_REVIEW,sha256:reviewSha}));
  assert.equal(body.schema_version,1);assert.equal(body.line,line);assert.equal(body.sha,LEGACY_SASS_ENTRYPOINT_SHA);
  assert.equal(body.status,'reviewed');assert.equal(body.review_depth,'individual-compatibility');
  assert.deepEqual(body.affected_branches,['21.x']);assert.equal(body.proposed_final_disposition,'not-applicable');
  assert.equal(body.source_review_complete,true);assert.equal(body.source_scope_only,true);
  assert.equal(body.actual_native_artifact_browser_full_Sass_floor_or_audit_qualified,false);
  assert.equal(body.g11_claim,'not-passed');assert.equal(body.g13_claim,'not-passed');
  const original=JSON.parse(gunzipSync(member(body.upstream_originals)));
  const commit=Buffer.from(original.raw_commit);
  assert.equal(createHash('sha1').update('commit '+commit.length+'\0').update(commit).digest('hex'),LEGACY_SASS_ENTRYPOINT_SHA);
  assert.equal(original.sha,LEGACY_SASS_ENTRYPOINT_SHA);assert.equal(hash(original.diff),diffSha);
  assert.equal(body.diff,original.diff);assert.equal(body.diff_sha256,diffSha);
  assert.equal(original.sections.map(row=>row.patch).join(''),original.diff);
  assert.deepEqual(original.complete_changed_files,original.sections.map(row=>row.path));
  assert.deepEqual(body.full_original_paths,original.complete_changed_files);assert.equal(body.full_original_paths.length,180);
  const hunks=original.sections.flatMap(section=>{
    assert.equal(hash(section.patch),section.patch_sha256);
    const parts=section.patch.split(/(?=^@@ )/m).slice(1);assert.equal(parts.length,section.hunks.length);
    return parts.map((text,index)=>{
      assert.equal(text,section.hunks[index].text);assert.equal(hash(text),section.hunks[index].sha256);
      return {path:section.path,hunk_index:index+1,header:text.split('\n')[0],hunk_sha256:hash(text)};
    });
  });assert.equal(hunks.length,194);assert.equal(body.whole_original_hunk_reviews.length,194);
  body.whole_original_hunk_reviews.forEach((row,index)=>{
    for(const key of Object.keys(hunks[index]))assert.equal(row[key],hunks[index][key]);
    assert.equal(row.original_upstream_suite_executed,false);assert.ok(row.decision.length>100);
  });
  const module=original.unchanged_module_entry;
  assert.equal(module.before,module.after);assert.equal(hash(module.before),module.before_sha256);
  assert.equal(hash(module.after),module.after_sha256);assert.deepEqual(body.unchanged_upstream_module_entry,
    {path:module.path,before_sha256:module.before_sha256,after_sha256:module.after_sha256});
  const inventory=JSON.parse(member(body.inventory_scope_explanation.inventory));
  assert.equal(inventory.inventory_role,'research-only');assert.equal(inventory.selects_release_baseline,false);
  const selected=body.full_original_paths.filter(path=>inventory.audit_paths.some(prefix=>path===prefix||path.startsWith(prefix+'/')));
  assert.deepEqual(selected,body.frozen_seed_paths);assert.equal(selected.length,111);
  const identity=JSON.parse(member(body.authentic_oracle_identity));
  const scopeRaw=member(body.current_compiler_scope),scope=JSON.parse(scopeRaw);
  assert.equal(scope.line,line);assert.equal(scope.result,'pass');assert.equal(scope.current_compiler_scope.entry_override_used,false);
  const oracle=JSON.parse(member(scope.current_compiler_scope.oracle));
  member({path:oracle.provenance.lock_path,sha256:oracle.provenance.lock_sha256});
  assert.equal(identity.root_index_sha256,oracle.provenance.index_sha256);
  assert.equal(identity.reference_environment_lock_sha256,oracle.provenance.lock_sha256);
  assert.equal(scope.historical_default_variables_matched,47);assert.deepEqual(scope.oracle_member_counts,{variables:47,functions:25,mixins:286});
  assert.deepEqual(scope.missing_historical_members,[]);assert.deepEqual(scope.removed_global_entrypoint_loads,[]);
  assert.equal(scope.migration_positive.length,3);assert.equal(scope.migration_refusals.length,3);
  assert.equal(scope.packed_export_execution,false);assert.equal(scope.full_651_Sass_cases_executed,false);
  for(const ref of [...scope.input_members,scope.producer])member(ref);
  const controls=JSON.parse(member(body.compiler_controls));
  assert.equal(controls.positive_unmodified_fixture,1);assert.equal(controls.rejection_controls,6);
  assert.equal(controls.actual_Sass_compiler_and_migration_used,true);
  const consumer=JSON.parse(member(body.consumer_sanity_aggregate_only));
  assert.equal(consumer.consumer_files_written,0);assert.equal(consumer.consumer_build_or_render_execution,false);
  const paths=candidateProductSourcePaths(root).filter(path=>path.endsWith('.scss')).sort();
  assert.deepEqual(paths,scope.current_compiler_scope.owned_scss_population.map(row=>row.path).sort());
  for(const ref of scope.current_compiler_scope.owned_scss_population)member(ref);
  const material=realpathSync(join(root,'node_modules/@angular/material')),cdk=realpathSync(join(root,'node_modules/@angular/cdk'));
  const peer=readFileSync(join(material,'package.json'));assert.equal(hash(peer),scope.current_compiler_scope.peer.package_json_sha256);
  assert.equal(JSON.parse(peer).version,'21.2.14');
  const cdkManifest=JSON.parse(readFileSync(join(cdk,'package.json')));
  assert.equal(cdkManifest.name,'@angular/cdk');assert.equal(cdkManifest.version,'21.2.14');
  for(const [program,roots]of [[scope.current_compiler_scope.candidate,[realpathSync(join(root,'projects/ngx-material-legacy')),material,cdk]],
    [scope.current_compiler_scope.current,[material,cdk]]]){
    for(const ref of program.loaded_sources){
      assert.ok(Number.isInteger(ref.root)&&ref.root>=0&&ref.root<roots.length);
      assert.ok(ref.path&&!ref.path.includes('\\')&&!ref.path.startsWith('/')&&ref.path.split('/').every(part=>part&&part!=='.'&&part!=='..'));
      const raw=readFileSync(join(roots[ref.root],ref.path));assert.equal(hash(raw),ref.sha256);assert.equal(raw.length,ref.bytes);
    }
  }
  return {body,scope,scopeHash:hash(scopeRaw),bound};
}
function validate(args,fresh){
  try{
    const {root,read,entry,body,line}=args,q=inspectLegacySassEntrypointReview({root,read,line});
    assert.deepEqual(body,q.body);assert.equal(entry.sha,LEGACY_SASS_ENTRYPOINT_SHA);
    assert.equal(entry.final_disposition,'not-applicable');assert.equal(entry.evidence_report,LEGACY_SASS_ENTRYPOINT_REVIEW);
    assert.equal(entry.reason,q.body.decision);assert.equal(entry.review_depth,'individual-compatibility');
    assert.deepEqual(entry.files,q.body.frozen_seed_paths);assert.deepEqual(entry.affected_branches,['21.x']);
    assert.deepEqual(entry.individual_proof,legacySassEntrypointProof(q.body));assert.equal(entry.g11_claim,'not-passed');
    if(fresh){const previous=measurements.get(read),rootId=realpathSync(root);
      if(!previous||previous.root!==rootId||previous.scopeHash!==q.scopeHash){
        assert.deepEqual(measureLegacySassEntrypointScope({root:rootId}),q.scope,'fresh default Sass scope differs');
        measurements.set(read,{root:rootId,scopeHash:q.scopeHash});
      }
    }
    return true;
  }catch{return false;}
}
export const legacySassEntrypointEntrySourceOk=args=>validate(args,false);
export const legacySassEntrypointEntryEvidenceOk=args=>validate(args,true);
