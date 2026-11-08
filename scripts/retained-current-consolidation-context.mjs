/** @license Copyright Google LLC All Rights Reserved. Copyright (c) 2026 Ryan Lester. MIT. */
/** Current context for the original32 source predicate, not test execution. */
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {execFileSync} from 'node:child_process';
import {readFileSync} from 'node:fs';
import {fileURLToPath} from 'node:url';
import {retainedCurrentContextIdentity} from './retained-current-context-identity.mjs';
import {readEvidenceMember} from './upstream-packed-run-evidence.mjs';
import {buildScopeEvidenceOk} from './upstream-build-scope-evidence.mjs';
const SELF='scripts/retained-current-consolidation-context.mjs',image=readFileSync(fileURLToPath(import.meta.url));
const REVIEW={path:'compatibility/rc/main-retained-consolidation-current-review-v1.json',sha256:'7cb43710d9b172892311ce378ae0a6813f0fe928870f7696b725776e5c66fb3d',bytes:4591};
const COMMIT='768dfecc21b297e9c4d89940283c63c31a03dab2';
const PROGRAMS=[
 {path:'scripts/upstream-build-scope-evidence.mjs',sha256:'6136c1ec1a83b93086b056c2f73cd533f6f0abab59dd50b642b0579f1b7ad1c8',bytes:18011},
 {path:'scripts/retained-current-build-context.mjs',sha256:'e45168bb5c73f85bfd0ce02318da9099c3f97e950daebec80e36908de8c3294d',bytes:6752},
 {path:'scripts/retained-current-context-identity.mjs',sha256:'f31427e4aab15bff12a2003931d1ef881fdf9c78d7139cc3473326dbc0f7a067',bytes:9540},
];
const REPORTS={
 'compatibility/rc/c04-main32-consolidation-source-v1.json':'ac2ed346e6b1cb72ed27529a356a3e18b85e7a2f5b6c74d2d3db29e814b0f082',
 'compatibility/rc/packed-upstream-source-test-consolidation.json':'075244bfbac4d46cca909863054578ec44cfd2775dc74d407d18bd73379a0755',
 'compatibility/rc/c04-main32-consolidation-prior-rows-v1.json':'953da7d42d8cba426ece39fbdc9d6b15d581549974d32c84e3fa1be13a32ca05',
 'compatibility/rc/c04-main32-consolidation-ledger-delta-v1.json':'fd35ea81eb923efaf5b906cbe7ed0ac74d0d711e5e4d4c423c1ea1b4826841e1',
};
const sha=raw=>createHash('sha256').update(raw).digest('hex');
export function retainedCurrentConsolidationContext({root,read,body}){
 const physical=path=>readEvidenceMember(root,path),source=retainedCurrentContextIdentity({root,read}),bound=new Map();
 const member=(path,digest,bytes)=>{const raw=physical(path);assert.equal(sha(raw),digest,path);if(bytes!==undefined)assert.equal(raw.length,bytes);assert.ok(raw.equals(read(path)),'nonphysical current consolidation '+path);assert.ok(raw.equals(physical(path)));const ref={path,sha256:digest,bytes:raw.length};if(bound.has(path))assert.deepEqual(bound.get(path),ref);else bound.set(path,ref);return raw;};
 bound.set(SELF,{path:SELF,sha256:sha(image),bytes:image.length});assert.ok(physical(SELF).equals(image));
 const review=JSON.parse(member(REVIEW.path,REVIEW.sha256,REVIEW.bytes));
 assert.equal(review.role,'finite main current-context revalidation of retained32 consolidation source scope');
 assert.equal(review.source_context_commit,'4e6f608402e99da9fb550bb46040aa68a648440a');assert.equal(review.build_owner_commit,COMMIT);
 assert.equal(review.exact_relocation_subjects,27);assert.equal(review.individual_non_exact_subjects,5);
 for(const field of ['original_dispositions_changed','historical_reports_rewritten','runtime_artifact_floor_or_security_qualification'])assert.equal(review[field],false);
 assert.equal(review.g11_claim,'not-passed');
 for(const [path,digest]of Object.entries(REPORTS))member(path,digest);
 assert.deepEqual(JSON.parse(physical(review.original_report.path)),body);assert.equal(REPORTS[review.original_report.path],review.original_report.sha256);
 assert.deepEqual(review.individual_non_exact_revalidation.map(row=>row.sha).sort(),body.reviews.filter(row=>row.individual_source_review).map(row=>row.sha).sort());
 for(const row of review.individual_non_exact_revalidation){assert.ok(row.reason.length>100);assert.equal(body.reviews.find(r=>r.sha===row.sha).individual_source_review.retained_sources[0].family,row.family);}
 const env={PATH:process.env.PATH,LC_ALL:'C',GIT_CONFIG_GLOBAL:'/dev/null',GIT_CONFIG_SYSTEM:'/dev/null',GIT_NO_REPLACE_OBJECTS:'1',GIT_NO_LAZY_FETCH:'1',GIT_TERMINAL_PROMPT:'0'};
 const git=args=>execFileSync('git',['--no-replace-objects','-c','gc.auto=0','-c','maintenance.auto=0',...args],{cwd:root,env,maxBuffer:2*1024*1024});
 git(['merge-base','--is-ancestor',COMMIT,'HEAD']);
 for(const ref of PROGRAMS){const raw=git(['show',COMMIT+':'+ref.path]);assert.equal(sha(raw),ref.sha256);assert.equal(raw.length,ref.bytes);member(ref.path,ref.sha256,ref.bytes);}
 const assertBuildChecker=()=>{assert.equal(sha(Buffer.from(buildScopeEvidenceOk.toString())),'586895c06859bafdf46f506f30e1909384f1d452e1e9d13496c18abb338d0080');for(const ref of PROGRAMS)member(ref.path,ref.sha256,ref.bytes);};
 const profile=source.beforeContexts.find(row=>row.report.path===body.main_current_context.build_report.path);assert.ok(profile);
 const current=new Map([...source.products,...source.inputs].map(ref=>[ref.path,ref]));
 const beforeTesting=profile.products.filter(ref=>ref.path.includes('/testing/'));
 assert.equal(beforeTesting.length,163);assert.deepEqual(source.products.filter(ref=>ref.path.includes('/testing/')),beforeTesting);
 const inventoryPath='testing/legacy-runner/historical-inventory.json',oldRef=profile.inputs.find(ref=>ref.path===inventoryPath);assert.ok(oldRef);
 // Historical JSON data only; no old program is executed or served as current.
 const beforeBytes=git(['show','e1848d4e3a04b31cbb616f16b77d80525f6a7a5c:'+inventoryPath]);assert.equal(sha(beforeBytes),oldRef.sha256);assert.equal(beforeBytes.length,oldRef.bytes);
 const before=JSON.parse(beforeBytes),after=JSON.parse(member(inventoryPath,current.get(inventoryPath).sha256));
 const {rows:oldRows,...oldHeader}=before,{rows:newRows,...newHeader}=after;assert.deepEqual(newHeader,oldHeader);assert.equal(newRows.length,57);
 let changed=0;
 for(let index=0;index<oldRows.length;index++){
  const {candidate_sha256:oldSha,prior_candidate_snapshots:oldHistory,...oldRow}=oldRows[index];
  const {candidate_sha256:newSha,prior_candidate_snapshots:newHistory,...newRow}=newRows[index];assert.deepEqual(newRow,oldRow);
  assert.equal(newRow.execution.bound_to_current_head,false);assert.equal(newSha,current.get(newRow.candidate)?.sha256,newRow.candidate);
  assert.deepEqual((newHistory??[]).slice(0,oldHistory?.length??0),oldHistory??[]);
  if(oldSha!==newSha){changed++;const prior=newHistory.find(row=>row.candidate_sha256===oldSha);assert.ok(prior);assert.deepEqual(prior.execution,oldRow.execution);assert.equal(prior.adaptation,oldRow.adaptation);}
 }
 assert.equal(changed,8);
 const runnerReference=ref=>{const result=source.resolveReference(ref);assert.equal(result?.kind,'current');return result.reference;};
 for(const ref of body.main_current_context.historical_runner_inputs){const selected=runnerReference(ref);member(selected.path,selected.sha256,selected.bytes);}
 const assertCurrent=()=>{
  assertBuildChecker();for(const ref of bound.values())member(ref.path,ref.sha256,ref.bytes);
  source.assertCurrent();
  // Close proof/program observations without another caller callback.
  for(const ref of bound.values()){const raw=physical(ref.path);assert.equal(sha(raw),ref.sha256,ref.path);assert.equal(raw.length,ref.bytes);}
 };
 assertCurrent();return Object.freeze({runnerReference,assertCurrent,assertBuildChecker,
  current_testing_files:163,changed_inventory_candidates:8,execution_claims_changed:false,g11_claim:'not-passed'});
}
