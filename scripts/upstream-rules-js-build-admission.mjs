/**
 * @license
 * Copyright Google LLC All Rights Reserved.
 * Copyright (c) 2026 Ryan Lester.
 * Use of this source code is governed by the MIT license in LICENSE.
 */
/** Three complete source exclusions; no inherited runtime or audit credit. */
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {readFileSync,realpathSync} from 'node:fs';
import {spawnSync,execFileSync} from 'node:child_process';
import {join} from 'node:path';
import {gunzipSync} from 'node:zlib';
import {isDeepStrictEqual} from 'node:util';
import {autocompleteSelectionSpecSubject} from './autocomplete-selection-spec-subject.mjs';

export const RULES_JS_BUILD_SHAS=Object.freeze(['3b9854e97a6ff942241ef3b233939f7bd1cfd22d',
 '9ae960d9dabf045b1fe14a7afe0cc6ef6c6c1b7b','fba42e30c3dfe3711b8d53dc7eeda1e28ad4e301']);
const proposalPath='compatibility/rc/upstream-rules-js-build-individual-review.json';
export const RULES_JS_BUILD_REPORT='compatibility/rc/upstream-rules-js-build-admission-review.json';
const proposals={main:'825ed4a139ab452b1b919b4e2c3524db787bc2d30507345a748cfcc6728c0c44',
 '21.x':'44ab558cdf978d3c5927ceada8dc0e54a167f2765acd44b28e023d1e8d874bd8'};
const reports={main:'28a16f7e70b2ffebea8e159bae1a4f837ddade60606430ff4f592800c61d80a7',
 '21.x':'2cd211e992b0e374bca6acd31e54a9a24545a663ef765f247ff50951aebd69c1'};
const prior={main:['5308fa387d0f5aee95000b4d279e4f98aae89e3f4a5e28b307222ce6fa9e99e0',
 '39dbc23f278932ed2416d591ab1ac023e117d8000c6606477184a6440d26bef4','7db3c6755eb7121dc31d2207fe5e7dee6e18021ae3d25222e993d5c9dd66017a'],
 '21.x':['7b6208ade3252e6583657b63a1e29c256183f444171024958210d9c4f99dd71a',
 '9574b124adf1323431d0c542ba264a5877079f524dec848fae583f455da002f6','450c6e32d05c831e2550a3d74637172fc57b64dc63fed6e158b951abdec2c52d']};
const parents={main:'6484f6dcb499c5c62cdd94d98b28e355f1962485','21.x':'29911639fb9b7b49482ea6f99741d1a9f753722e'};
const hash=raw=>createHash('sha256').update(raw).digest('hex');
const measured=new WeakMap();
const member=(read,ref)=>{const raw=read(ref.path);assert.equal(hash(raw),ref.sha256,'changed build review input '+ref.path);if(ref.bytes!==undefined)assert.equal(raw.length,ref.bytes);return raw;};

export function requiresRulesJsBuild(entry){return RULES_JS_BUILD_SHAS.includes(entry?.sha)||entry?.individual_proof?.rules_js_build_source_scope!==undefined;}
export function rulesJsBuildAdmissionReport(read,line){
 assert.ok(Object.hasOwn(proposals,line));
 const proposal=JSON.parse(member(read,{path:proposalPath,sha256:proposals[line]}));
 assert.equal(proposal.line,line);assert.equal(proposal.canonical_admitted,false);
 const reviews=proposal.analysis.reviews.map((row,index)=>({sha:row.sha,status:'reviewed',review_depth:'individual-compatibility',
  final_disposition:'not-applicable',affected_branches:[line],diff_sha256:row.patch_sha256,
  prior_entry_sha256:prior[line][index],prior_source_parent:parents[line],
  frozen_seed_paths:line==='main'?row.members.map(m=>m.path):['src/cdk/overlay/BUILD.bazel','src/material/slider/BUILD.bazel'],
  complete_original_paths:row.members.map(m=>m.path),complete_original_hunks:row.complete_hunks,
  decision:proposal.individual_decisions[index].reason}));
 assert.deepEqual(reviews.map(row=>row.sha),RULES_JS_BUILD_SHAS);
 return {schema_version:1,line,status:'reviewed',role:'Three individual complete upstream rules_js build-source exclusions',
  proposal:{path:proposalPath,sha256:proposals[line]},reviews,source_scope_only:true,
  current_native_packed_or_floor_qualified:false,upstream_vendor_security_clearance:false,g11_claim:'not-passed'};
}
export function rulesJsBuildProof(row,line){
 assert.ok(RULES_JS_BUILD_SHAS.includes(row.sha));assert.ok(Object.hasOwn(reports,line));
 return {proof_kind:'individual-complete-build-source-exclusion',review_depth:'individual-compatibility',
  affected_branches:[line],decision:row.decision,diff_sha256:row.diff_sha256,
  rules_js_build_source_scope:{sha:row.sha,review:{path:RULES_JS_BUILD_REPORT,sha256:reports[line]},
   source_scope_only:true,current_native_packed_or_floor_qualified:false}};
}
export function rulesJsBuildOriginalPatch(read,sha){
 assert.ok(RULES_JS_BUILD_SHAS.includes(sha));
 const subject=JSON.parse(gunzipSync(member(read,{path:'compatibility/rc/upstream-rules-js-build-subjects.json.gz',
  sha256:'2c1ce31d855f2f4fd24185ede57165b769431c0f86168a218cc17b1fcfd7a8b1'})));
 const row=subject.reviews.find(row=>row.sha===sha);assert.ok(row);assert.equal(hash(row.patch),row.patch_sha256);
 return Buffer.from(row.patch);
}
export function rulesJsBuildBoundInputs({root,read,line}){
 const proposal=JSON.parse(member(read,{path:proposalPath,sha256:proposals[line]}));
 assert.equal(proposal.line,line);assert.equal(proposal.canonical_ledger_changes,0);
 assert.equal(proposal.current_runtime_or_packed_or_floor_qualified,false);
 assert.equal(proposal.analysis.original_file_occurrences,135);assert.equal(proposal.analysis.original_hunks,195);
 const spec=autocompleteSelectionSpecSubject({root,read,line});
 const recordedRefs=[{path:proposalPath,sha256:proposals[line]},proposal.subjects,proposal.inspector,
  ...proposal.candidate_context.files,...proposal.candidate_context.product_members];
 const refs=recordedRefs.map(ref=>{
  if(ref.path!==spec.path)return ref;
  assert.equal(ref.sha256,spec.before.sha256);assert.equal(ref.bytes,spec.before.bytes);
  return {...ref,...spec.after};
 });
 for(const ref of spec.bound)if(!refs.some(row=>row.path===ref.path))refs.push(ref);
 for(const ref of refs)member(read,ref);
 const population=execFileSync('git',['--no-replace-objects','-c','gc.auto=0','-c','maintenance.auto=0',
  'ls-files','--cached','--others','--exclude-standard','--','projects/ngx-material-legacy'],{cwd:root,encoding:'utf8'}).trim().split('\n').sort();
 assert.deepEqual(population,proposal.candidate_context.product_members.map(ref=>ref.path).sort());
 const external=Object.values(proposal.candidate_context.installed_peer_manifests).map(ref=>{
  assert.ok(['node_modules/@angular/cdk/package.json','node_modules/@angular/material/package.json'].includes(ref.path));
  const path=join(root,ref.path),resolved=realpathSync(path);assert.equal(hash(readFileSync(path)),ref.sha256);
  assert.equal(JSON.parse(readFileSync(path)).version,line==='main'?'22.1.7':'21.2.14');return {...ref,absolute:path,resolved};});
 const assertExternal=()=>{spec.assertCurrent();for(const ref of external){assert.equal(realpathSync(ref.absolute),ref.resolved);assert.equal(hash(readFileSync(ref.absolute)),ref.sha256);}};
 assertExternal();return {refs,assertExternal,proposal};
}
function validate({root,read,line,entry,body},fresh){
 try{
  assert.ok(Object.hasOwn(proposals,line));
  const report=JSON.parse(member(read,{path:RULES_JS_BUILD_REPORT,sha256:reports[line]}));
  assert.deepEqual(body,report);assert.deepEqual(report,rulesJsBuildAdmissionReport(read,line));
  const row=report.reviews.find(row=>row.sha===entry.sha);assert.ok(row);
  assert.equal(entry.evidence_report,RULES_JS_BUILD_REPORT);assert.equal(entry.final_disposition,'not-applicable');
  assert.equal(entry.reason,row.decision);assert.equal(entry.review_depth,'individual-compatibility');
  assert.deepEqual(entry.affected_branches,[line]);assert.deepEqual(entry.files,row.frozen_seed_paths);
  assert.equal(entry.diff_sha256,row.diff_sha256);assert.equal(entry.patch_sha256,row.diff_sha256);
  assert.equal(entry.g11_claim,'not-passed');assert.equal(Object.hasOwn(entry,'peer_floor'),false);
  assert.deepEqual(entry.individual_proof,rulesJsBuildProof(row,line));
  assert.deepEqual(entry.source_check,{evidence_report_sha256:reports[line],review_membership:entry.sha});
  assert.deepEqual(entry.prior_dispositions,[{source_parent:row.prior_source_parent,source_entry_sha256:row.prior_entry_sha256,
   source_line:line,final_disposition:line==='main'?'inherited':'needs-individual-review'}]);
  const checked=rulesJsBuildBoundInputs({root,read,line});
  const rootId=realpathSync(root),previous=measured.get(read);
  if(fresh&&(!previous||previous.root!==rootId||previous.line!==line)){
   const code='import json,pathlib,sys;sys.path.insert(0,str(pathlib.Path(sys.argv[1])/"scripts"));from upstream_rules_js_build_scope import review;print(json.dumps({"body":review(pathlib.Path(sys.argv[1])),"python":sys.version.split()[0]}))';
   const child=spawnSync('python3',['-I','-c',code,rootId],{cwd:rootId,encoding:'utf8',timeout:20000,maxBuffer:2*1024*1024});
   assert.equal(child.status,0,child.stderr);const actual=JSON.parse(child.stdout);assert.equal(actual.python,'3.14.7');
   const spec=autocompleteSelectionSpecSubject({root,read,line}),expected=structuredClone(checked.proposal);
   const refs=expected.candidate_context.product_members.filter(ref=>ref.path===spec.path);assert.equal(refs.length,1);
   assert.equal(refs[0].sha256,spec.before.sha256);assert.equal(refs[0].bytes,spec.before.bytes);Object.assign(refs[0],spec.after);
   assert.equal(isDeepStrictEqual(actual.body,expected),true,'fresh full build-source facts changed beyond the exact additive native spec');
   measured.set(read,{root:rootId,line});
  }
  return true;
 }catch{return false;}
}
/** Historical projection rehashes current inputs without granting a fresh gate. */
export function rulesJsBuildEntrySourceOk(args){return validate(args,false);}
export function rulesJsBuildEntryEvidenceOk(args){return validate(args,true);}
