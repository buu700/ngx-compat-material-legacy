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
import {inspectHarnessPreparation} from './harness-animation-preparation-evidence.mjs';
const SELF='scripts/retained-current-consolidation-context.mjs',image=readFileSync(fileURLToPath(import.meta.url));
const REVIEW={path:'compatibility/rc/main-retained-consolidation-current-review-v1.json',sha256:'7cb43710d9b172892311ce378ae0a6813f0fe928870f7696b725776e5c66fb3d',bytes:4591};
const CONTINUATION={path:'compatibility/rc/retained-main-consolidation-source-continuation-3ac.json',sha256:'f2d830fc2deb31492d9f3756b37478a1c446b4932c4d21465352732b9d26ed1c',bytes:4276};
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
let consolidationActive=false,consolidationReentered=false;
function consolidationTransaction(fn){if(consolidationActive){consolidationReentered=true;throw new Error('retained consolidation reentry');}consolidationActive=true;consolidationReentered=false;try{const value=fn();assert.equal(consolidationReentered,false,'retained consolidation reentry');return value;}finally{consolidationActive=false;}}
export function retainedCurrentConsolidationContext(options){return consolidationTransaction(()=>createRetainedCurrentConsolidationContext(options));}
function createRetainedCurrentConsolidationContext({root,read,body}){
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
 const git=(args,input)=>execFileSync('git',['--no-replace-objects','-c','gc.auto=0','-c','maintenance.auto=0',...args],{cwd:root,env,input,maxBuffer:64*1024*1024});
 git(['merge-base','--is-ancestor',COMMIT,'HEAD']);
 const continuation=JSON.parse(member(CONTINUATION.path,CONTINUATION.sha256,CONTINUATION.bytes));
 for(const [key,value]of Object.entries({schema_version:1,role:'main-consolidation-current-source-continuation',original_testing_commit:'e1848d4e3a04b31cbb616f16b77d80525f6a7a5c',original_review_commit:COMMIT,inventory_metadata_commit:'ce9cd3d0b76e240ad0ffc03e2a05ff41f8f363ab',source_commit:'3ac10c5438c5636504f7dd909bf7c50387c649d7',source_only:true,original_reports_rewritten:false,runtime_or_audit_admission_granted:false,g11_claim:'not-passed'}))assert.equal(continuation[key],value,key);
 for(const [a,b]of [[continuation.original_testing_commit,COMMIT],[COMMIT,continuation.inventory_metadata_commit],[continuation.inventory_metadata_commit,continuation.source_commit],[continuation.source_commit,'HEAD']])git(['merge-base','--is-ancestor',a,b]);
 const gitBody=(commit,ref)=>{assert.equal(git(['rev-parse',commit+':'+ref.path]).toString().trim(),ref.blob_oid);const raw=git(['show',commit+':'+ref.path]);assert.equal(sha(raw),ref.sha256,ref.path);assert.equal(raw.length,ref.bytes,ref.path);return raw;};
 assert.deepEqual(continuation.programs.map(row=>row.path),PROGRAMS.map(ref=>ref.path));
 for(let i=0;i<PROGRAMS.length;i++){
  const old=PROGRAMS[i],row=continuation.programs[i];assert.deepEqual({path:row.before.path,sha256:row.before.sha256,bytes:row.before.bytes},old);assert.equal(row.current.path,row.path);
  gitBody(COMMIT,row.before);const after=gitBody(continuation.source_commit,row.current);assert.ok(member(row.path,row.current.sha256,row.current.bytes).equals(after));
  const log=git(['log','--format=%H',COMMIT+'..'+continuation.source_commit,'--',row.path]).toString().trim();assert.deepEqual(log?log.split('\n'):[],row.history);
 }
 const assertBuildChecker=()=>{assert.equal(sha(Buffer.from(buildScopeEvidenceOk.toString())),'586895c06859bafdf46f506f30e1909384f1d452e1e9d13496c18abb338d0080');for(const row of continuation.programs)member(row.path,row.current.sha256,row.current.bytes);
  // The last callback may change an earlier program; finish without callbacks.
  for(const row of continuation.programs){const raw=physical(row.path);assert.equal(sha(raw),row.current.sha256,row.path);assert.equal(raw.length,row.current.bytes,row.path);}
 };
 const profile=source.beforeContexts.find(row=>row.report.path===body.main_current_context.build_report.path);assert.ok(profile);
 const current=new Map([...source.products,...source.inputs].map(ref=>[ref.path,ref]));
 const beforeTesting=profile.products.filter(ref=>ref.path.includes('/testing/')),currentTesting=source.products.filter(ref=>ref.path.includes('/testing/'));
 assert.equal(beforeTesting.length,163);assert.equal(currentTesting.length,163);assert.deepEqual(beforeTesting.map(r=>r.path),currentTesting.map(r=>r.path));
 const oldTesting=continuation.original_testing_member,newTesting=continuation.current_testing_member;gitBody(continuation.original_testing_commit,oldTesting);gitBody(continuation.source_commit,newTesting);
 const differences=beforeTesting.filter((ref,i)=>ref.sha256!==currentTesting[i].sha256||ref.bytes!==currentTesting[i].bytes);assert.deepEqual(differences,[{path:oldTesting.path,sha256:oldTesting.sha256,bytes:oldTesting.bytes}]);assert.deepEqual(current.get(newTesting.path),{path:newTesting.path,sha256:newTesting.sha256,bytes:newTesting.bytes});
 // Bind every actual harness read and retain the unchanged original recipe;
 // no historical code body is used as a current physical source.
 const harnessRead=path=>{const raw=physical(path);return member(path,sha(raw),raw.length);},prepared=inspectHarnessPreparation(harnessRead);
 assert.equal(prepared.files,12);assert.equal(prepared.case_callbacks_unchanged,165);assert.equal(prepared.fixture_classes_unchanged,15);
 const inventoryPath='testing/legacy-runner/historical-inventory.json',oldRef=profile.inputs.find(ref=>ref.path===inventoryPath);assert.ok(oldRef);
 const beforeBytes=gitBody(continuation.original_testing_commit,continuation.original_inventory);assert.equal(sha(beforeBytes),oldRef.sha256);assert.equal(beforeBytes.length,oldRef.bytes);
 const middleBytes=gitBody(COMMIT,continuation.review_inventory),nowBytes=gitBody(continuation.inventory_metadata_commit,continuation.current_inventory),actual=member(inventoryPath,current.get(inventoryPath).sha256,current.get(inventoryPath).bytes);assert.ok(actual.equals(nowBytes));
 const before=JSON.parse(beforeBytes),middle=JSON.parse(middleBytes),after=JSON.parse(nowBytes);
 const {rows:oldRows,...oldHeader}=before,{rows:middleRows,...middleHeader}=middle,{rows:newRows,...newHeader}=after;assert.deepEqual(middleHeader,oldHeader);assert.deepEqual(newHeader,middleHeader);assert.equal(oldRows.length,57);assert.equal(middleRows.length,57);assert.equal(newRows.length,57);
 // Authenticate all 57 original review-frame candidate bodies in one Git
 // transaction. This is the same whole-byte comparison, without 57 processes.
 const candidateBatch=git(['cat-file','--batch'],Buffer.from(middleRows.map(row=>COMMIT+':'+row.candidate+'\n').join('')));let candidateOffset=0;
 for(const row of middleRows){const end=candidateBatch.indexOf(10,candidateOffset);assert.ok(end>=candidateOffset);const header=candidateBatch.subarray(candidateOffset,end).toString().split(' ');candidateOffset=end+1;assert.equal(header.length,3);assert.equal(header[1],'blob');const size=Number(header[2]);assert.ok(Number.isSafeInteger(size)&&size>=0&&candidateOffset+size<candidateBatch.length);const raw=candidateBatch.subarray(candidateOffset,candidateOffset+size);assert.equal(createHash('sha1').update(Buffer.from('blob '+size+'\0')).update(raw).digest('hex'),header[0]);assert.equal(sha(raw),row.candidate_sha256,row.candidate);candidateOffset+=size;assert.equal(candidateBatch[candidateOffset++],10);}assert.equal(candidateOffset,candidateBatch.length);
 let changed=0,later=0;const changedLater=[];
 for(let index=0;index<oldRows.length;index++){
  const {candidate_sha256:oldSha,prior_candidate_snapshots:oldHistory,...oldRow}=oldRows[index];
  const {candidate_sha256:middleSha,prior_candidate_snapshots:middleHistory,...middleRow}=middleRows[index];assert.deepEqual(middleRow,oldRow);assert.equal(middleRow.execution.bound_to_current_head,false);
  assert.deepEqual((middleHistory??[]).slice(0,oldHistory?.length??0),oldHistory??[]);
  if(oldSha!==middleSha){changed++;const prior=middleHistory.find(row=>row.candidate_sha256===oldSha);assert.ok(prior);assert.deepEqual(prior.execution,oldRow.execution);assert.equal(prior.adaptation,oldRow.adaptation);}
  const {candidate_sha256:newSha,prior_candidate_snapshots:newHistory,...newRow}=newRows[index];assert.deepEqual(newRow,middleRow);assert.equal(newSha,current.get(newRow.candidate)?.sha256,newRow.candidate);
  if(middleSha!==newSha){later++;changedLater.push(newRow.family);assert.deepEqual((newHistory??[]).slice(0,-1),middleHistory??[]);const prior=newHistory.at(-1);assert.equal(prior.candidate_sha256,middleSha);assert.equal(prior.adaptation,middleRow.adaptation);assert.deepEqual(prior.execution,middleRow.execution);assert.equal(prior.current_source_binding,false);}else assert.deepEqual(newRows[index],middleRows[index]);
 }
 assert.equal(changed,8);assert.equal(later,7);assert.deepEqual(changedLater,['autocomplete','core','menu','select','table','tabs','tooltip']);
 const runnerReference=ref=>{const result=source.resolveReference(ref);assert.equal(result?.kind,'current');return result.reference;};
 for(const ref of body.main_current_context.historical_runner_inputs){const selected=runnerReference(ref);member(selected.path,selected.sha256,selected.bytes);}
 const assertCurrent=()=>{
  assertBuildChecker();for(const ref of bound.values())member(ref.path,ref.sha256,ref.bytes);
  source.assertCurrent();
  // Close proof/program observations without another caller callback.
  for(const ref of bound.values()){const raw=physical(ref.path);assert.equal(sha(raw),ref.sha256,ref.path);assert.equal(raw.length,ref.bytes);}
 };
 assertCurrent();return Object.freeze({runnerReference,assertCurrent:()=>consolidationTransaction(assertCurrent),assertBuildChecker:()=>consolidationTransaction(assertBuildChecker),
  current_testing_files:163,changed_inventory_candidates:8,subsequent_inventory_candidates:7,execution_claims_changed:false,g11_claim:'not-passed'});
}
