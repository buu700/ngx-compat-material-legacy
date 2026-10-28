/**
 * @license
 * Copyright Google LLC All Rights Reserved.
 * Copyright (c) 2026 Ryan Lester.
 * Use of this source code is governed by the MIT license in LICENSE.
 */
/** Current tool binding and real root native rejection; no browser execution. */
import assert from 'node:assert/strict';
import {readFileSync,writeFileSync,mkdtempSync,rmSync,existsSync} from 'node:fs';
import {createHash} from 'node:crypto';
import {execFileSync,spawnSync} from 'node:child_process';
import {join} from 'node:path';
import {tmpdir} from 'node:os';
import {dialogTitleReaderSubject,dialogTitleProductSubject} from '../scripts/dialog-title-source-context.mjs';
import {autocompleteSelectionNativeSubject} from '../scripts/autocomplete-selection-native-subject.mjs';
import {qualifyCanonicalToolReference,packedUpstreamLedgerRawRead} from '../scripts/packed-upstream-ledger-epoch.mjs';
import {requiresRegisteredSourceReview} from '../scripts/upstream-registered-source-review.mjs';
import {sourceContractDefinitions} from '../scripts/upstream-source-contract-registry.mjs';
import {requiresHistoricalBehavior} from '../scripts/upstream-historical-behavior-evidence.mjs';
import title from '../scripts/upstream-dialog-title-admission.cjs';
const root=process.cwd(),read=path=>title.titleRead(root,path),hash=x=>createHash('sha256').update(x).digest('hex');
const env={...process.env,GIT_NO_LAZY_FETCH:'1',GIT_NO_REPLACE_OBJECTS:'1'};
for(const key of Object.keys(env))if(key.startsWith('RC_')||['GIT_DIR','GIT_WORK_TREE','GIT_INDEX_FILE','GIT_COMMON_DIR','GIT_OBJECT_DIRECTORY','GIT_ALTERNATE_OBJECT_DIRECTORIES'].includes(key))delete env[key];
const original=path=>execFileSync('git',['--no-replace-objects','show','33e11b2965c9ff559865bc81298e6766653672be:'+path],{cwd:root,env,maxBuffer:8*1024*1024});
assert.equal(read('scripts/packed-upstream-ledger-base.mjs').equals(original('scripts/packed-upstream-ledger-epoch.mjs')),true);
assert.equal(read('scripts/check-upstream-audit-disposition.mjs').equals(original('scripts/check-upstream-audit-disposition.mjs')),true);
const native='scripts/upstream-historical-behavior-evidence.mjs',owner='scripts/packed-upstream-ledger-epoch.mjs',subject='scripts/autocomplete-selection-native-subject.mjs';
let rejected=0,late=null;const mutable=path=>path===late?Buffer.concat([read(path),Buffer.from('\n')]):read(path);
for(const path of [owner,native,subject]){
 const before=original(path),prior={path,sha256:hash(before),bytes:before.length};
 const scope=qualifyCanonicalToolReference({root,read:mutable,prior});assert.ok(scope);
 assert.deepEqual(scope.reference,{path,sha256:hash(read(path)),bytes:read(path).length});
 assert.equal(scope.old_tool_bytes_exposed,false);
 for(const ref of scope.bound){late=ref.path;assert.throws(()=>scope.assertCurrent(),undefined,ref.path);rejected++;}late=null;scope.assertCurrent();
 for(const bad of [{...prior,sha256:'0'.repeat(64)},{...prior,bytes:0}]){assert.throws(()=>qualifyCanonicalToolReference({root,read,prior:bad}));rejected++;}
}
const reader=dialogTitleReaderSubject({root,read}),packet=JSON.parse(read('compatibility/rc/dialog-title-current-source-reader-successors.json'));
for(const row of packet.code_subjects){
 const current=reader.qualify({path:row.path,...row.after});assert.equal(current.sha256,hash(read(row.path)));
 assert.deepEqual(reader.historicalReference(current),{path:row.path,...row.before});
}
for(const path of [owner,native,subject]){
 const forged=p=>p===path?original(path):read(p);
 assert.throws(()=>dialogTitleReaderSubject({root,read:forged}),undefined,'unmarked historical '+path);rejected++;
 assert.throws(()=>autocompleteSelectionNativeSubject({root,read:forged}),undefined,'unmarked native historical '+path);rejected++;
}
for(const path of [owner,native]){
 const forged=p=>p==='compatibility/rc/.canonical-owned-tool-metadata-role'?Buffer.from('owned canonical tool metadata'):p===path?original(path):read(p);
 assert.throws(()=>dialogTitleReaderSubject({root,read:forged}),undefined,'metadata bytes are not an owned capability '+path);rejected++;
}
reader.withHistoricalToolMetadata(metadata=>{
 const path='projects/ngx-material-legacy/legacy-dialog/dialog-content-directives.ts';assert.equal(metadata(path).equals(read(path)),true);
});
const currentNative=autocompleteSelectionNativeSubject({root,read});
assert.equal(currentNative.after.sha256,hash(read(native)));assert.equal(currentNative.requirements.length,3);
assert.equal(currentNative.native_artifact_floor_or_G11_credit,false);
const main='/home/parallels/.codex/worktrees/codex-closeout-main/ngx-compat-material-legacy',mainRead=path=>readFileSync(join(main,path));
assert.equal(packedUpstreamLedgerRawRead({root:main,read:mainRead}),mainRead);
const mainProduct=dialogTitleProductSubject({root:main,read:mainRead}),mainReaders=dialogTitleReaderSubject({root:main,read:mainRead});mainProduct.assertCurrent();mainReaders.assertCurrent();
const entry=JSON.parse(read('compatibility/f10/disposition-ledger/ledger.json')).entries.find(row=>row.sha===title.TITLE_SHA);
assert.equal(entry.final_disposition,'already-adapted');assert.equal(requiresRegisteredSourceReview(entry),true);
assert.equal(requiresHistoricalBehavior(entry,undefined),true,'native gate must survive missing proof metadata');
assert.equal(sourceContractDefinitions.length,28);assert.equal(sourceContractDefinitions.filter(row=>row.sha===entry.sha).length,1);
const directory=mkdtempSync(join(tmpdir(),'ngx-title-owner-root-'));let rootCases=0;
try{
 const seed=join(directory,'seed.json'),candidate=join(directory,'candidate.json'),report=join(directory,'report.json'),missing=join(directory,'missing.json');
 writeFileSync(seed,JSON.stringify({commits:[{sha:entry.sha}]}));
 function inspect(value){
  writeFileSync(candidate,JSON.stringify({entries:[value],g11_claim:'not-passed'}));rmSync(report,{force:true});
  const child=spawnSync(process.execPath,['scripts/check-upstream-audit-disposition.mjs','--admission','--line','21.x','--seed',seed,'--ledger',candidate,'--symbols',missing,'--current-symbols',missing,'--report',report],{cwd:root,env,encoding:'utf8',timeout:30000});
  assert.equal(child.error,undefined);assert.equal(child.signal,null);assert.equal(existsSync(report),true,child.stderr);
  const result=JSON.parse(readFileSync(report));assert.equal(result.g11_claim,'not-passed');assert.equal(result.disposition_admission,'incomplete');rootCases++;return result;
 }
 const valid=inspect(entry);assert.equal(valid.evidence_failures.length,0);
 assert.equal(valid.artifact_behavior_evidence.length,1);assert.equal(valid.artifact_behavior_evidence[0].sha,entry.sha);assert.equal(valid.artifact_behavior_evidence[0].ok,false,'source closure must not pass native validation');
 assert.ok(valid.insufficient_review_sha_ids.sensitive.includes(entry.sha));
 const stripped=structuredClone(entry);delete stripped.individual_proof.historical_behavior;
 const missingNative=inspect(stripped);assert.ok(missingNative.evidence_failures.length>0);assert.ok(missingNative.insufficient_review_sha_ids.sensitive.includes(entry.sha));
}finally{rmSync(directory,{recursive:true,force:true});}
const result={schema_version:1,result:'pass',node:process.version,registered_source_contracts:28,
 prior_owner_byte_identical:true,root_checker_byte_identical:true,original_native_scopes_preserved:3,
 current_tool_reference_guards_passed:3,tool_faults_rejected:rejected,unmarked_historical_tool_readers_rejected:6,forged_metadata_capabilities_rejected:2,
 public_metadata_transitions_use_current_hashes:true,main_product_and_reader_source_checks_passed:true,
 actual_root_checker_cases:rootCases,native_missing_after_source_closure_rejected:true,
 canonical_source_decisions:1,actual_native_artifact_browser_floor_or_full_audit_qualified:false,g11_claim:'not-passed'};
if(process.argv[2])writeFileSync(process.argv[2],JSON.stringify(result,null,2)+'\n',{flag:'wx'});
console.log(JSON.stringify(result));
