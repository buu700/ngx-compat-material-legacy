/**
 * @license
 * Copyright Google LLC All Rights Reserved.
 * Copyright (c) 2026 Ryan Lester.
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.io/license
 */
/** Actual seven-row CLI controls; this is never the full 1697-row audit. */
import assert from 'node:assert/strict';
import {readFileSync,writeFileSync,mkdtempSync,unlinkSync,rmdirSync} from 'node:fs';
import {tmpdir} from 'node:os';
import {basename,dirname,join,resolve} from 'node:path';
import {fileURLToPath} from 'node:url';
import {createHash} from 'node:crypto';
import {spawnSync} from 'node:child_process';
import {testingApi21xSourceProof} from '../scripts/upstream-testing-api-21x-admission.mjs';

const root=resolve(dirname(fileURLToPath(import.meta.url)),'..'),read=path=>readFileSync(join(root,path));
const hash=bytes=>createHash('sha256').update(bytes).digest('hex');
const reviewPath='compatibility/rc/upstream-testing-api-21x-individual-admission.json';
const body=JSON.parse(read(reviewPath)),ledger=JSON.parse(read('compatibility/f10/disposition-ledger/ledger.json'));
assert.equal(body.reviews.length,7);
const entries=body.reviews.map(review=>({...ledger.entries.find(entry=>entry.sha===review.sha),
 final_disposition:review.final_disposition,reason:review.decision,review_depth:review.review_depth,
 evidence_report:reviewPath,individual_proof:testingApi21xSourceProof(review)}));
const temporary=mkdtempSync(join(tmpdir(),'legacy-testing-root-'));
const seed=join(temporary,'seed.json'),candidate=join(temporary,'ledger.json');
const mutant=join(root,'scripts','.'+basename(temporary)+'.mjs'),outputs=[],observations=[];
const checkerPath='scripts/check-upstream-audit-disposition.mjs',checker=read(checkerPath).toString();
const env={...process.env};
for(const name of ['RC_CHECK_ID','RC_RUN_ID','RC_INVOCATION_ID','RC_EVIDENCE_BINDING','RC_ASSERTION_OUTPUT_DIR'])delete env[name];
function run(name,rows,expectPass,script=join(root,checkerPath)){
 writeFileSync(candidate,JSON.stringify({entries:rows,g11_claim:'not-passed'}));
 const out=join(temporary,name+'.json');outputs.push(out);
 const child=spawnSync(process.execPath,[script,'--seed',seed,'--ledger',candidate,'--report',out,
  '--admission','--line','21.x'],{cwd:root,env,encoding:'utf8',timeout:60000,maxBuffer:1024*1024});
 assert.ok([0,1].includes(child.status),child.error?.message||child.stderr);
 const report=JSON.parse(readFileSync(out));
 assert.equal(report.seed_rows,7);assert.equal(report.ledger_rows,7);
 assert.equal(report.authored_use_review_evidence.reviewed,1736);
 assert.equal(report.authored_use_review_evidence.insufficient,0);
 assert.equal(report.current_authored_use_inventory.ready,true,JSON.stringify(report.current_authored_use_inventory));
 assert.equal(report.current_authored_use_inventory.additional_obligations,315);
 assert.equal(report.g11_claim,'not-passed');assert.equal(report.security_clearance,'not-passed');
 assert.equal(child.status===0,expectPass,name+' '+JSON.stringify(report.evidence_failures));
 assert.equal(report.disposition_admission,expectPass?'pass':'incomplete');
 observations.push({name,exit_code:child.status,report});return report;
}
try{
 writeFileSync(seed,JSON.stringify({commits:entries.map(entry=>({sha:entry.sha}))}),{flag:'wx'});
 const positive=run('complete-seven-reviewed-entries',entries,true);
 assert.equal(positive.inherited_execution_evidence.length,1);
 assert.equal(positive.inherited_execution_evidence[0].executed_case_ids.length,55);
 // Erase every optional proof marker and point to an unrelated readable file.
 // Each real SHA must independently retain its mandatory JSON/source contract.
 const stripped=entries.map(entry=>{const row={...entry,final_disposition:'do-not-adopt',evidence_report:'README.md'};
  delete row.individual_proof;return row;});
 const negative=run('all-seven-optional-markers-erased',stripped,false);
 assert.deepEqual(negative.evidence_failures.map(row=>row.sha).sort(),entries.map(row=>row.sha).sort());
 assert.ok(negative.evidence_failures.every(row=>row.reason==='invalid-testing-api-21x-scope'));
 const weakened=checker.replace('const testingApi21xScope = requiresTestingApi21xEntry(',
  'const testingApi21xScope = false && requiresTestingApi21xEntry(');
 assert.notEqual(weakened,checker);writeFileSync(mutant,weakened,{flag:'wx'});
 run('mutant-mandatory-SHA-guard',stripped,true,mutant);
}finally{
 for(const path of [mutant,seed,candidate,...outputs]){try{unlinkSync(path);}catch(error){if(error.code!=='ENOENT')throw error;}}
 rmdirSync(temporary);
}
const summary={line:'21.x',result:'pass',actual_CLI_cases:3,individual_reviews:7,
 original_frozen_uses:1736,additional_obligations:315,missing_marker_entries_rejected:7,
 mandatory_guard_mutants_detected:1,fresh_inherited_cases:55,full_1697_audit_executed:false,
 root_mandatory_SHA_hook_covered:true,checker_sha256:hash(checker),
 producer_sha256:hash(read('tests/upstream_testing_api_21x_root_probe.mjs')),
 current_native_packed_or_floor_or_g11_credit:false};
if(process.argv[2])writeFileSync(process.argv[2],JSON.stringify({summary,observations},null,2)+'\n',{flag:'wx'});
console.log(JSON.stringify(summary));
