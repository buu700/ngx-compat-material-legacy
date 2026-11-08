/** @license Copyright Google LLC All Rights Reserved. Copyright (c) 2026 Ryan Lester. MIT. */
/** Revalidate three complete build exclusions against physical current source. */
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {spawnSync} from 'node:child_process';
import {readFileSync,realpathSync} from 'node:fs';
import {join,resolve} from 'node:path';
import {fileURLToPath} from 'node:url';
import {readEvidenceMember} from './upstream-packed-run-evidence.mjs';
import {retainedCurrentContextIdentity} from './retained-current-context-identity.mjs';
import {RULES_JS_BUILD_SHAS} from './upstream-rules-js-build-admission.mjs';

const SELF='scripts/retained-rules-js-current-source.mjs';
const image=readFileSync(fileURLToPath(import.meta.url));
const REVIEW={path:'compatibility/rc/main-retained-rules-js-current-review-v1.json',
  sha256:'818c4156e9ee49b30ee5da096404fa7a550728a22c1b390d9456dc4ce36e021a'};
const hash=raw=>createHash('sha256').update(raw).digest('hex');
const clean=ref=>({path:ref.path,sha256:ref.sha256,bytes:ref.bytes});

export function retainedRulesJsBuildCurrentSource({root=process.cwd(),read,line='main'}={}){
  root=resolve(root);read??=path=>readEvidenceMember(root,path);assert.equal(line,'main');
  const physical=path=>readEvidenceMember(root,path),bound=new Map();
  const add=ref=>{
    const prior=bound.get(ref.path);
    if(prior)assert.deepEqual(prior,clean(ref));else bound.set(ref.path,clean(ref));
  };
  const member=ref=>{
    const raw=physical(ref.path);assert.equal(hash(raw),ref.sha256,ref.path);
    if(ref.bytes!==undefined)assert.equal(raw.length,ref.bytes,ref.path);
    assert.ok(raw.equals(read(ref.path)),'nonphysical current rules-js input '+ref.path);
    assert.ok(raw.equals(physical(ref.path)));add({...ref,bytes:raw.length});return raw;
  };
  assert.ok(physical(SELF).equals(image));member({path:SELF,sha256:hash(image),bytes:image.length});
  const review=JSON.parse(member(REVIEW));
  assert.equal(review.schema_version,1);
  assert.equal(review.role,'finite main current-context revalidation of three retained rules-js source exclusions');
  assert.equal(review.base_head,'67b61a9c21984926384c09019f94047d436da68a');
  assert.equal(review.source_context_commit,'4e6f608402e99da9fb550bb46040aa68a648440a');
  assert.equal(review.historical_reports_rewritten,false);assert.equal(review.original_dispositions_changed,false);
  assert.equal(review.runtime_artifact_floor_or_security_qualification,false);assert.equal(review.g11_claim,'not-passed');
  assert.deepEqual(review.individual_revalidation.map(row=>row.sha),RULES_JS_BUILD_SHAS);
  for(const row of review.individual_revalidation)assert.ok(row.reason.length>250);
  const proposal=JSON.parse(member(review.original_proposal));
  assert.equal(proposal.line,line);assert.equal(proposal.candidate_context.line,line);
  assert.equal(proposal.canonical_ledger_changes,0);assert.equal(proposal.canonical_admitted,false);
  assert.equal(proposal.current_runtime_or_packed_or_floor_qualified,false);
  assert.equal(proposal.upstream_vendor_security_clearance,false);assert.equal(proposal.g11_claim,'not-passed');
  assert.equal(proposal.analysis.original_file_occurrences,review.original_file_occurrences);
  assert.equal(proposal.analysis.original_hunks,review.original_hunks);
  assert.equal(review.original_file_occurrences,135);assert.equal(review.original_hunks,195);
  assert.deepEqual(proposal.individual_decisions.map(row=>row.sha),RULES_JS_BUILD_SHAS);
  member(proposal.subjects);member(proposal.inspector);
  const source=retainedCurrentContextIdentity({root,read});
  for(const ref of source.bound)add(ref);
  const profile=source.beforeContexts.find(row=>row.report.path==='compatibility/rc/packed-upstream-source-build.json');
  assert.deepEqual(proposal.candidate_context.product_members,profile.products);
  assert.equal(profile.products.length,review.original_product_members);
  assert.equal(hash(profile.products.map(ref=>ref.path).join('\n')+'\n'),proposal.candidate_context.tracked_product_paths_sha256);
  // Unchanged historical root Bazel files are deliberately outside the finite
  // library context. They remain explicit live inputs, never retired members.
  const rootBazel=['.bazelrc','BUILD.bazel','WORKSPACE'];
  const current=structuredClone(proposal);
  current.candidate_context.files=proposal.candidate_context.files.map(ref=>{
    const selected=source.resolveReference(ref);
    if(selected){assert.equal(selected.kind,'current');member(selected.reference);return selected.reference;}
    assert.ok(rootBazel.includes(ref.path),'unknown historical rules-js input '+ref.path);
    member(ref);return {...ref};
  });
  assert.deepEqual(proposal.candidate_context.retained_historical_root_Bazel_members,
    proposal.candidate_context.files.filter(ref=>rootBazel.includes(ref.path)).sort((a,b)=>a.path.localeCompare(b.path)));
  for(const ref of profile.products)assert.ok(source.resolveReference(ref));
  current.candidate_context.product_members=source.products;
  current.candidate_context.product_member_count=source.products.length;
  current.candidate_context.tracked_product_paths_sha256=hash(source.products.map(ref=>ref.path).join('\n')+'\n');
  assert.equal(current.candidate_context.product_member_count,review.current_product_members);
  assert.equal(current.candidate_context.tracked_product_paths_sha256,review.current_product_paths_sha256);
  assert.deepEqual(Object.keys(current.candidate_context).filter(key=>
    JSON.stringify(current.candidate_context[key])!==JSON.stringify(proposal.candidate_context[key])),review.context_changes);
  const external=Object.entries(proposal.candidate_context.installed_peer_manifests).map(([name,ref])=>{
    assert.ok(['@angular/cdk','@angular/material'].includes(name));
    assert.equal(ref.path,'node_modules/'+name+'/package.json');
    const absolute=join(root,ref.path),resolved=realpathSync(absolute),raw=readFileSync(absolute);
    assert.equal(hash(raw),ref.sha256);assert.equal(raw.length,ref.bytes);
    assert.equal(JSON.parse(raw).version,'22.1.7');return {...ref,absolute,resolved};
  });
  assert.equal(external.length,2);
  const assertPeers=()=>{for(const ref of external){
    assert.equal(realpathSync(ref.absolute),ref.resolved);const raw=readFileSync(ref.absolute);
    assert.equal(hash(raw),ref.sha256);assert.equal(raw.length,ref.bytes);
  }};
  const assertCurrent=()=>{
    source.assertCurrent();assertPeers();
    for(const ref of bound.values())member(ref);
    source.assertCurrent();
    // The nested guard also invokes the reader. Close the complete larger
    // domain physically; no caller callback follows this final observation.
    for(const ref of bound.values()){
      const raw=physical(ref.path);assert.equal(hash(raw),ref.sha256,ref.path);assert.equal(raw.length,ref.bytes,ref.path);
    }
    assertPeers();assert.ok(physical(SELF).equals(image));
  };
  const assertFresh=()=>{
    assertCurrent();
    const code='import json,pathlib,sys;sys.path.insert(0,str(pathlib.Path(sys.argv[1])/"scripts"));from upstream_rules_js_build_scope import review;print(json.dumps({"body":review(pathlib.Path(sys.argv[1])),"python":sys.version.split()[0]}))';
    const child=spawnSync('python3',['-I','-c',code,root],{cwd:root,encoding:'utf8',timeout:20000,maxBuffer:2*1024*1024});
    assert.equal(child.status,0,child.error?.message||child.stderr);
    const actual=JSON.parse(child.stdout);assert.equal(actual.python,'3.14.7');
    assert.deepEqual(actual.body,current,'fresh complete rules-js analysis changed beyond the finite current context');
    assertCurrent();
  };
  assertCurrent();
  return Object.freeze({get refs(){return structuredClone([...bound.values()]);},
    get proposal(){return structuredClone(proposal);},get currentProposal(){return structuredClone(current);},
    assertCurrent,assertExternal:assertCurrent,assertFresh,
    source_scope_only:true,current_native_packed_or_floor_qualified:false,
    upstream_vendor_security_clearance:false,g11_claim:'not-passed'});
}
