/**
 * @license
 * Copyright Google LLC All Rights Reserved.
 * Copyright (c) 2026 Ryan Lester.
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.io/license
 */
import assert from 'node:assert/strict';
import {qualifyIndependentSnackProductDelta} from './snack-dom-source-context.mjs';
import {createHash} from 'node:crypto';
import {readFileSync} from 'node:fs';
import {fileURLToPath} from 'node:url';
import {gunzipSync} from 'node:zlib';
import {analyzeSharedTestMove,bazelProductionCalls} from './upstream-test-consolidation-analysis.mjs';
import {buildScopeEvidenceOk,ciCaptureReader} from './upstream-build-scope-evidence.mjs';
import {qualifiedCurrentConsolidationSources} from './harness-animation-preparation-evidence.mjs';
import {HISTORICAL_CONSOLIDATION_CAPSULE, retainedConsolidationSources,
  individualConsolidationScope} from './upstream-test-consolidation-historical.mjs';
const loadedConsolidationSource=readFileSync(fileURLToPath(import.meta.url));
export const TEST_CONSOLIDATION_ROLE='C04 finite original32 shared harness consolidation source review';
export const TEST_CONSOLIDATION_CAPSULE='compatibility/rc/upstream-test-consolidation-subjects.json';
export const TEST_CONSOLIDATION_CAPSULE_SHA256='5fd4dc58c2365c659696d4e9f6927a02184f868db043a7055a3bf1afcdebf989';
export const TEST_CONSOLIDATION_PATCHES=Object.freeze({
  "eab085a2d80124c201405530d51df148db44d8b9": "897da00d9c0628d10ef531ede2d67efdcf62cc440ae6553110e383ca750bd6b0",
  "cf4e16b03e0f3474e4a2343c03413b271936aa65": "776355459e5d5511e7ca307b0cda0e36fa1c9b0bac6178a10633891460ffad0c",
  "543abe24e4c78bcfafa3d2b36868f45e51d57b82": "418d24b069beca9661f2d99cc5c2581293f33f96bb19c83489654521eeaa2a23",
  "7c7a1df02470b6333a9423d7a294e76fdb9f67b3": "5e7c70320cac97305945789d74d9d8e5a77b952abd2d8ad54e40899abb8c0f78",
  "12df13a5432992934b7a20a1e5d9f3c45e11e862": "70004e99727622e53f9c62722a4106d4aaa3cf789b82c94df935173b7197df73",
  "c9a9dc8127acebe83f1ae592a9725e753de85bbf": "b85a82a9205774ccaff7985a8ab3f89fcad7675c0940f39ec803472b1bf7575c",
  "032c2e194d0fc8d1f30a2962fe85baf406a6c1db": "e111ad1761395b2c6773a6f768dc45999590bc6a0578a2644b82b7fc8cbbde8a",
  "d52f04127f5931d9b0587ca129b02ad0a4fd41c4": "abb98033835e898a7efb0ffa1e036bb8c01ec412d1e744c292eb18f0576171bd",
  "8648903a22f1f013448bf4285e61e9a08b5c0383": "7ae923a9f3558ff5d28ef8ea61744c9a84bbaf7f7b5bc45563b73b29d2de484f",
  "c5df291f42379617afe038f0d50449a3c97633ed": "73329c6af1b975c228a2b2a9859d4ff88e4c75b13244e510af851f349873abc5",
  "126e4ec8869507ca449db1365a0b061c8713f9d8": "ca44c5c5c6766cb13af92e52dabe815aba8687ff498a880fa1b32fa31721724e",
  "473113e151f7e11ee9617a788958ee70b5ac6fed": "36acb289c8ccf7aa31c4ace3e03854519aa6e1257238b972d2edbbd0a1cf92b1",
  "6a1fa58ffda06c908ba3df0f74c299cdd545f4b9": "f46e7f3affc25bacc9affe13ccb8b403ef1aa30c1823c41846162df03fba7ccb",
  "c1b6e3fc9df114ee5c5588b0f9aa1abb30ecf08d": "e18a94ddfaffc9171d579017219107ead7ddcd36ddb7549abc31f6708e9ede78",
  "74ef04bf050475a3bb62824f977d11e8492d7263": "056e34d32ce037e1915c721b06cfb58f8a6a63be2fb8217eb7825a2ab3310079",
  "7da89fd27bea769716add8aa36f7907bd72c516d": "7abbb27851329c36e670fa532e345f2a2d3e19ca3555eb40cd86af4313666e1a",
  "d4243ac081e963ad12da002388245abdc129e18e": "89d70e94e4ad6e53f5f3156d4587e55d9a236c5b2d3fec40c145cd3d6f6324c3",
  "a41ce098b0eb4e56c05f3ac596aa97fd5a5d53ab": "04bded70c0f5f527d318639faaea3799e74c2cd65958b78f366bd8a28fd88bde",
  "2c08c6cded0cd623502c0665ed99353bd62289da": "a940c784d03980082aae04336a739c34ce780428116530466e04e2b095665cfc",
  "90db7c6b751e3a8954c231b2c055e5f52e0fd580": "b0913b1bf91f338bca5872f9f5abcc0eb3702a1257607c231d092aeb23b1e077",
  "5050b3e2c564cba10f45b836eb51746399507206": "6956c2a2432e623c48751fce062e9bdc268dbd3442bae25c86fbfb05472e5577",
  "e1514fbe829af2a0630db7223bad2268dd0da407": "e06c995e5cdef81f9d5f60a19879e8af5b9fe27742a3a1d9419bae6b133de035",
  "518ac69a7e0f787327e971c710a13bb2da6461cc": "718d75f93b4083ffb3c9b0ac02ff2a1fa30629bc28282437621b921aed1e3948",
  "24c7435e91ede859d4edb60fe2c27dd7e874c13f": "ed12430cf5825a52a417944e4f23a91c15e4de147ce391bb9aac84c255095f52",
  "7ca079a3f6d8a873c3d657b7eb8155435cd65be2": "1adf521df8d05c99713d56d781ab9ff56e22e8c9d144afee6fc585a02b27707a",
  "7c1fbf0bd7771fc738dc85e075457abf3f551514": "446e7de9b4f6cd8a16a884f39708165fb3ccbea2e785a94c8dabd3d17653aec6",
  "33ba7d4dde614b7d40ad6a57d9aefd16555e3d7b": "764bd87dee2d931a0f3a0771ecc7304c751d37668db7465e97d1b4e16c30f976",
  "bff5283469258fc90ad9eddbd31cab829d7ebfdf": "0f7d51027974f7ea148ea44ffec72ea38357e0e18acc6dd7f25dd42d5d486401",
  "fb6e6614d9ba22afd96e683f76a7300a563036d6": "56ad0ceed8332fca43c214e6ffc488143481b378441b4465ffca1e222f532d07",
  "69a2ea8d0ac2eed1e6e7135b5f063c034578a1df": "244a75744e54e1d2fec57acca3f8e799907e664df728e1b92089f417d6c919e8",
  "6e859d35c690e9a66ab90571f7a31d43bce1cce1": "2ca41c0796db64e112ad5c5f86c54a06dc08e757ff11f3db99c8ae7c995dd223",
  "30905b6bf15d61d525800244059a16083ceb31cc": "6d901c3fae33ee3173d2432601f8442f53d59173d3e0fcd5e063dcde9cce69fd"
});
const hash=bytes=>createHash('sha256').update(bytes).digest('hex');
const historicalContextPaths=['scripts/run-legacy-artifact-suite.mjs','testing/legacy-runner/historical-inventory.json','testing/legacy-runner/historical-specs.json'];
const objectHash=(kind,bytes)=>createHash('sha1').update(Buffer.from(kind+' '+bytes.length+'\0')).update(bytes).digest('hex');
export const TEST_CONSOLIDATION_NON_EXACT=Object.freeze([
  '126e4ec8869507ca449db1365a0b061c8713f9d8','a41ce098b0eb4e56c05f3ac596aa97fd5a5d53ab',
  'e1514fbe829af2a0630db7223bad2268dd0da407','518ac69a7e0f787327e971c710a13bb2da6461cc',
  'bff5283469258fc90ad9eddbd31cab829d7ebfdf',
]);

export function analyzeConsolidationSubjects(bytes,readRepo) {
  assert.equal(hash(bytes),TEST_CONSOLIDATION_CAPSULE_SHA256);
  const packet=JSON.parse(bytes),subjects=packet.subjects;
  assert.equal(subjects.length,32);
  assert.deepEqual(subjects.map(s=>s.sha).sort(),Object.keys(TEST_CONSOLIDATION_PATCHES).sort());
  const results=[];
  for(const subject of subjects){
    const commit=Buffer.from(subject.commit);assert.equal(objectHash('commit',commit),subject.sha);assert.equal(hash(commit),subject.commit_sha256);
    const patch=readRepo(subject.patch_file);assert.ok(Buffer.isBuffer(patch));assert.equal(hash(patch),TEST_CONSOLIDATION_PATCHES[subject.sha]);
    const paths=patch.toString().split('\n').filter(row=>row.startsWith('diff --git ')).map(row=>row.split(' b/')[1]);
    assert.deepEqual(subject.patch_paths,paths);assert.deepEqual(subject.members.map(m=>m.path),paths);
    assert.ok(paths.every(p=>p.startsWith('src/material/')&&p.includes('/testing/')&&(p.endsWith('.spec.ts')||p.endsWith('/BUILD.bazel'))));
    const sources=new Map();
    for(const member of subject.members){
      const versions={};
      for(const role of ['before','after']){
        const value=member[role];
        if(value===null){assert.equal(role,'after');assert.ok(member.path.endsWith('.spec.ts'));versions[role]=null;continue;}
        const decoded=gunzipSync(Buffer.from(value.gzip_base64,'base64'));
        assert.equal(decoded.length,value.bytes);assert.equal(hash(decoded),value.sha256);assert.equal(objectHash('blob',decoded),value.git_blob_sha1);
        versions[role]=decoded.toString();
      }
      sources.set(member.path,versions);
    }
    const builds=[],suites=[];
    for(const [path,versions] of sources){
      if(path.endsWith('/BUILD.bazel')){
        const before=bazelProductionCalls(versions.before),after=bazelProductionCalls(versions.after);
        assert.deepEqual(before,after,'upstream production target changed');builds.push({path,production_calls_sha256:hash(JSON.stringify(before)),production_target_count:before.length});continue;
      }
      if(versions.after!==null)continue;
      const stem=path.split('/').at(-1).replace(/\.ts$/,'');
      const targets=[...sources].filter(([p,v])=>v.after&&p.endsWith('.spec.ts')&&v.before.includes(stem));
      assert.equal(targets.length,1,path);
      let analysis;
      try{analysis=analyzeSharedTestMove({sharedPath:path,beforeShared:versions.before,consumerPath:targets[0][0],beforeConsumer:targets[0][1].before,afterConsumer:targets[0][1].after});}
      catch(error){analysis={equivalent:false,unsupported_structure:error.message};}
      const {expected_source,observed_source,...facts}=analysis;
      suites.push({shared_path:path,consumer_path:targets[0][0],...facts});
    }
    assert.ok(builds.length&&suites.length);
    assert.deepEqual([...sources].filter(([p])=>p.endsWith('.spec.ts')).map(([p])=>p).sort(),suites.flatMap(s=>[s.shared_path,s.consumer_path]).sort(),'spec path omitted or ambiguous');
    const equivalent=suites.every(s=>s.equivalent);
    assert.equal(equivalent,!TEST_CONSOLIDATION_NON_EXACT.includes(subject.sha),'exact relocation boundary changed');
    results.push({sha:subject.sha,subject:subject.subject,patch_file:subject.patch_file,diff_sha256:hash(patch),patch_paths:paths,
      original_commit_sha256:subject.commit_sha256,builds,suites,exact_test_body_and_fixture_relocation:equivalent,
      relocation_predicate_disposition:equivalent?'not-applicable':'needs-individual-review'});
  }
  return results;
}

// A finite main-only successor; historical reports and their 21.x route remain unchanged.
const MAIN_REPORT='compatibility/rc/c04-main32-consolidation-source-v1.json';
const MAIN_REPORT_SHA='ac2ed346e6b1cb72ed27529a356a3e18b85e7a2f5b6c74d2d3db29e814b0f082';
const MAIN_PRIOR='compatibility/rc/packed-upstream-source-test-consolidation.json';
const MAIN_PRIOR_SHA='075244bfbac4d46cca909863054578ec44cfd2775dc74d407d18bd73379a0755';
const MAIN_ARCHIVE='compatibility/rc/c04-main32-consolidation-prior-rows-v1.json';
const MAIN_ARCHIVE_SHA='953da7d42d8cba426ece39fbdc9d6b15d581549974d32c84e3fa1be13a32ca05';
const MAIN_DELTA='compatibility/rc/c04-main32-consolidation-ledger-delta-v1.json';
const MAIN_DELTA_SHA='fd35ea81eb923efaf5b906cbe7ed0ac74d0d711e5e4d4c423c1ea1b4826841e1';
const MAIN_BUILD='compatibility/rc/packed-upstream-source-build-main-e184.json';
const MAIN_BUILD_SHA='ffe8ee63051473d9adf28142e30dcbaddb5ed156f71de92a8e1dc2e43efbed6d';
function mainSuccessorBound(body,readRepo,entry){
 try{
  const product=JSON.parse(readRepo('projects/ngx-material-legacy/package.json'));assert.ok(product.version.startsWith('22.'));
  const bytes=readRepo(MAIN_REPORT),priorBytes=readRepo(MAIN_PRIOR),archiveBytes=readRepo(MAIN_ARCHIVE),deltaBytes=readRepo(MAIN_DELTA);
  assert.equal(hash(bytes),MAIN_REPORT_SHA);assert.equal(hash(priorBytes),MAIN_PRIOR_SHA);assert.equal(hash(archiveBytes),MAIN_ARCHIVE_SHA);assert.equal(hash(deltaBytes),MAIN_DELTA_SHA);
  assert.deepEqual(body,JSON.parse(bytes));const prior=JSON.parse(priorBytes);const {main_current_context:context,...unchanged}=body;assert.deepEqual(unchanged,prior);
  assert.deepEqual(Object.keys(context).sort(),['build_report','g11_claim','historical_inventory_is_capture_not_current_execution','historical_runner_inputs','line','previous_report','role','runtime_or_floor_qualified','source_only'].sort());
  assert.equal(context.role,'main-only current source context, not historic test execution');assert.equal(context.line,'main');assert.equal(context.source_only,true);assert.equal(context.runtime_or_floor_qualified,false);assert.equal(context.g11_claim,'not-passed');assert.equal(context.historical_inventory_is_capture_not_current_execution,true);
  assert.deepEqual(context.previous_report,{path:MAIN_PRIOR,sha256:MAIN_PRIOR_SHA,bytes:priorBytes.length});const build=readRepo(MAIN_BUILD);assert.equal(hash(build),MAIN_BUILD_SHA);assert.deepEqual(context.build_report,{path:MAIN_BUILD,sha256:MAIN_BUILD_SHA,bytes:build.length});
  assert.deepEqual(context.historical_runner_inputs.map(r=>r.path).sort(),[...historicalContextPaths].sort());for(const r of context.historical_runner_inputs){const raw=readRepo(r.path);assert.equal(hash(raw),r.sha256);assert.equal(raw.length,r.bytes);}
  const archive=JSON.parse(archiveBytes),delta=JSON.parse(deltaBytes);assert.equal(archive.schema_version,1);assert.equal(archive.line,'main');assert.equal(archive.source_head,'9be00b7baf32477b8e521305efa36273589566b9');assert.equal(delta.schema_version,1);assert.equal(delta.line,'main');
  assert.equal(archive.rows.length,32);assert.equal(delta.rows.length,32);assert.deepEqual(archive.rows.map(r=>r.sha).sort(),body.scope_sha_ids);assert.deepEqual(delta.rows.map(r=>r.sha).sort(),body.scope_sha_ids);
  for(const old of archive.rows){const next=delta.rows.find(r=>r.sha===old.sha);assert.ok(next);const expected=structuredClone(old);expected.evidence_report=MAIN_REPORT;expected.source_check.evidence_report_sha256=MAIN_REPORT_SHA;expected.affected_branches=['main'];expected.prior_disposition_record=structuredClone(old);assert.deepEqual(next,expected);}
  if(entry){const matches=delta.rows.filter(r=>r.sha===entry.sha);assert.equal(matches.length,1);assert.deepEqual(entry,matches[0]);}
  return true;
 }catch{return false;}
}

/** Authenticate the complete batch and both-line ownership context once per invocation. */
export function testConsolidationBatchOk(body,readRepo,currentProductPaths){
  try{
    const captured=ciCaptureReader(readRepo);readRepo=captured.read;
    assert.equal(body.role,TEST_CONSOLIDATION_ROLE);assert.equal(body.g11_claim,'not-passed');
    const mainSuccessor=Object.hasOwn(body,'main_current_context');if(mainSuccessor)assert.ok(mainSuccessorBound(body,readRepo));
    const product=JSON.parse(readRepo('projects/ngx-material-legacy/package.json'));
    const line=product.version.startsWith('21.')?'21.x':'main';assert.equal(body.line,line);
    assert.deepEqual(body.scope_sha_ids,Object.keys(TEST_CONSOLIDATION_PATCHES).sort());
    assert.equal(body.reviews.length,32);assert.deepEqual(body.reviews.map(r=>r.sha).sort(),body.scope_sha_ids);
    // The current copy preserves the original review and rebinds its complete
    // product snapshot. Both paths still require the same strict build proof.
    const contextPath=mainSuccessor?body.main_current_context.build_report.path:body.candidate_context.path;
    if(mainSuccessor){assert.equal(contextPath,MAIN_BUILD);}
    else if(contextPath==='compatibility/rc/snack-dom-source-context-build.json'||contextPath==='compatibility/rc/packed-upstream-source-build.json'){
      // A separately qualified successor still passes the same complete build
      // and historical-suite checks below; this grants no alternate predicate.
      const qualified=qualifyIndependentSnackProductDelta({read:readRepo});
      assert.equal(qualified.line,line);
    }else assert.ok(['compatibility/f10/disposition-ledger/evidence/closeout-fourteen-build-scope-review.json',
      'compatibility/rc/chip-source-scope-requalification-build.json',
      'compatibility/rc/tab-adapter-product-inventory-build.json'].includes(contextPath));
    // The CI afterimage transition is a finite successor of the original 14
    // scope, not a general override for an old or substituted build helper.
    const ciCurrent=mainSuccessor && hash(readRepo('flake.nix'))==='a161c9773fdb018e4a1a7befdb5962c1f4e818d73ae259b4242673bad1115556';
    const checkCiBuildImage=()=>{
      assert.equal(hash(readRepo('scripts/upstream-build-scope-evidence.mjs')),'3c67251388f98f563dcfe43adb5083da0880279855c6eab135840e98c5b81168');
      assert.equal(hash(Buffer.from(buildScopeEvidenceOk.toString())),'f914bdafd30e0d5b7f1d74ef1b58a1c3e17adf38a69100cac44a97f552d99665');
    };
    if(ciCurrent)checkCiBuildImage();
    const contextBytes=readRepo(contextPath);assert.equal(hash(contextBytes),mainSuccessor?body.main_current_context.build_report.sha256:body.candidate_context.sha256);
    const context=JSON.parse(contextBytes),ledger=JSON.parse(readRepo('compatibility/f10/disposition-ledger/ledger.json'));
    const contextEntry=ledger.entries.find(e=>e.sha===context.scope_sha_ids[0]);assert.ok(contextEntry);
    assert.ok(buildScopeEvidenceOk(context,contextEntry,readRepo,currentProductPaths),'current complete product/build context invalid');
    if(mainSuccessor)for(const sha of context.scope_sha_ids){const buildEntry=ledger.entries.find(e=>e.sha===sha);assert.ok(buildEntry&&buildScopeEvidenceOk(context,buildEntry,readRepo,currentProductPaths),'current individual build proof invalid');}
    const compilerConfig=JSON.parse(readRepo('projects/ngx-material-legacy/tsconfig.lib.json'));
    assert.ok(compilerConfig.exclude.includes('**/*.spec.ts'));
    assert.deepEqual(body.historical_suite_context.map(r=>r.path).sort(),[...historicalContextPaths].sort());
    for(const ref of (mainSuccessor?body.main_current_context.historical_runner_inputs:body.historical_suite_context)){const bytes=readRepo(ref.path);assert.ok(Buffer.isBuffer(bytes));assert.equal(hash(bytes),ref.sha256);}
    const inventory=JSON.parse(readRepo('testing/legacy-runner/historical-inventory.json'));
    assert.equal(inventory.denominator,57);assert.equal(inventory.historical_tag,'16.2.14');
    assert.equal(body.subject_capsule.path,TEST_CONSOLIDATION_CAPSULE);assert.equal(body.subject_capsule.sha256,TEST_CONSOLIDATION_CAPSULE_SHA256);
    const actual=analyzeConsolidationSubjects(readRepo(TEST_CONSOLIDATION_CAPSULE),readRepo);
    const retained=body.current_harness_preparation
      ? qualifiedCurrentConsolidationSources(readRepo,body.current_harness_preparation)
      : retainedConsolidationSources(readRepo(HISTORICAL_CONSOLIDATION_CAPSULE),readRepo);
    for(const result of actual){
      const row=body.reviews.find(r=>r.sha===result.sha);assert.ok(row);
      assert.deepEqual(row.source_analysis,result);
      assert.equal(row.diff_sha256,result.diff_sha256);assert.equal(row.patch_file,result.patch_file);assert.deepEqual(row.patch_paths,result.patch_paths);
      assert.equal(row.final_disposition,'not-applicable');assert.deepEqual(row.affected_branches,['main','21.x']);
      if (result.exact_test_body_and_fixture_relocation) {
        assert.equal(row.individual_source_review,undefined);
      } else {
        assert.deepEqual(row.individual_source_review,individualConsolidationScope(result.sha,retained));
      }
      assert.equal(row.review_depth,result.exact_test_body_and_fixture_relocation?'bounded-exact-test-relocation':'individual-compatibility');
      assert.ok(typeof row.decision==='string'&&row.decision.length>=120);
    }
    if(ciCurrent){
      checkCiBuildImage();
      assert.ok(buildScopeEvidenceOk(context,contextEntry,readRepo,currentProductPaths),
        'CI successor changed during consolidation callbacks');
      checkCiBuildImage();
      assert.deepEqual(readRepo('scripts/upstream-test-consolidation-evidence.mjs'),loadedConsolidationSource);
      captured.close();
    }
    return true;
  }catch{return false;}
}

/** Row labels cannot bypass immutable scope or pending residuals. */
export function testConsolidationEntryOk(body,entry,readRepo,batchValid){
  try{
    assert.equal(batchValid,true);if(entry.evidence_report===MAIN_REPORT)assert.ok(mainSuccessorBound(body,readRepo,entry));assert.equal(hash(readRepo(entry.evidence_report)),entry.source_check.evidence_report_sha256);
    const row=body.reviews.find(r=>r.sha===entry.sha);assert.ok(row);
    assert.equal(entry.final_disposition,row.final_disposition);assert.equal(entry.reason,row.decision);assert.deepEqual(entry.files,row.patch_paths);
    assert.deepEqual(entry.affected_branches,entry.evidence_report===MAIN_REPORT?['main']:row.affected_branches);assert.equal(entry.review_depth,row.review_depth);
    assert.equal(entry.source_check.diff_sha256,row.diff_sha256);assert.equal(entry.source_check.patch_path,row.patch_file);
    assert.equal(entry.source_check.review_membership,row.sha);return true;
  }catch{return false;}
}
