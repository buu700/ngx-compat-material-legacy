/**
 * @license
 * Copyright Google LLC All Rights Reserved.
 * Copyright (c) 2026 Ryan Lester.
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.io/license
 */
/** Actual three-row CLI admissions and guard mutation; never the full audit. */
import assert from 'node:assert/strict';
import {readFileSync,writeFileSync,mkdtempSync,unlinkSync,rmdirSync} from 'node:fs';
import {tmpdir} from 'node:os';
import {basename,dirname,join,resolve} from 'node:path';
import {fileURLToPath} from 'node:url';
import {createHash} from 'node:crypto';
import {spawnSync} from 'node:child_process';
import {gunzipSync} from 'node:zlib';
const root=resolve(dirname(fileURLToPath(import.meta.url)),'..'),read=path=>readFileSync(join(root,path));
const hash=raw=>createHash('sha256').update(raw).digest('hex');
const reviewPath='compatibility/rc/upstream-rules-js-build-admission-review.json',body=JSON.parse(read(reviewPath)),line=body.line;
const packet=JSON.parse(gunzipSync(read('compatibility/rc/upstream-rules-js-build-ledger-transition.json.gz')));
const entries=packet.entries.map(row=>row.after_entry);
const temporary=mkdtempSync(join(tmpdir(),'rules-js-build-root-')),seed=join(temporary,'seed.json'),candidate=join(temporary,'ledger.json');
const checkerPath='scripts/check-upstream-audit-disposition.mjs',checker=read(checkerPath).toString(),mutant=join(root,'scripts','.'+basename(temporary)+'.mjs');
const outputs=[],observations=[],env={...process.env};
for(const name of ['RC_CHECK_ID','RC_RUN_ID','RC_INVOCATION_ID','RC_EVIDENCE_BINDING','RC_ASSERTION_OUTPUT_DIR'])delete env[name];
function run(name,rows,expected,script=join(root,checkerPath)){
 writeFileSync(candidate,JSON.stringify({entries:rows,g11_claim:'not-passed'}));const out=join(temporary,name+'.json');outputs.push(out);
 const child=spawnSync(process.execPath,[script,'--seed',seed,'--ledger',candidate,'--report',out,'--admission','--line',line],
  {cwd:root,env,encoding:'utf8',timeout:60000,maxBuffer:1024*1024});
 assert.ok([0,1].includes(child.status),child.error?.message||child.stderr);
 const report=JSON.parse(readFileSync(out));assert.equal(report.seed_rows,3);assert.equal(report.ledger_rows,3);
 assert.equal(report.authored_use_review_evidence.reviewed,1736);assert.equal(report.authored_use_review_evidence.insufficient,0);
 assert.equal(report.current_authored_use_inventory.ready,true,JSON.stringify(report.current_authored_use_inventory));
 assert.equal(report.current_authored_use_inventory.additional_obligations,315);
 assert.equal(report.g11_claim,'not-passed');assert.equal(report.security_clearance,'not-passed');
 assert.equal(child.status===0,expected,name+' '+JSON.stringify(report.evidence_failures));
 assert.equal(report.disposition_admission,expected?'pass':'incomplete');observations.push({name,exit_code:child.status,report});return report;
}
try{
 writeFileSync(seed,JSON.stringify({commits:entries.map(row=>({sha:row.sha}))}),{flag:'wx'});
 run('three-complete-individual-source-decisions',entries,true);
 const stripped=entries.map(entry=>{const value={...entry,evidence_report:'README.md'};delete value.individual_proof;return value;});
 const rejected=run('three-proof-markers-and-report-erased',stripped,false);
 assert.deepEqual(rejected.evidence_failures.map(row=>row.sha).sort(),entries.map(row=>row.sha).sort());
 assert.ok(rejected.evidence_failures.every(row=>row.reason==='invalid-rules-js-build-scope'));
 const weakened=checker.replace('const rulesJsBuildScope = requiresRulesJsBuild(',
  'const rulesJsBuildScope = false && requiresRulesJsBuild(');
 assert.notEqual(weakened,checker);writeFileSync(mutant,weakened,{flag:'wx'});
 run('mutant-mandatory-SHA-guard',stripped,true,mutant);
}finally{for(const path of [mutant,seed,candidate,...outputs]){try{unlinkSync(path);}catch(error){if(error.code!=='ENOENT')throw error;}}rmdirSync(temporary);}
const summary={line,result:'pass',actual_CLI_cases:3,individual_reviews:3,missing_marker_entries_rejected:3,
 checker_mutants_detected:1,frozen_authored_uses:1736,additional_obligations:315,
 root_mandatory_SHA_hook_covered:true,full_1697_audit_executed:false,native_floor_or_G11_qualified:false,
 checker_sha256:hash(checker),producer_sha256:hash(read('tests/rules_js_build_root_probe.mjs'))};
if(process.argv[2])writeFileSync(process.argv[2],JSON.stringify({summary,observations},null,2)+'\n',{flag:'wx'});
console.log(JSON.stringify(summary));
