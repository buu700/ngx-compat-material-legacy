/**
 * @license
 * Copyright Google LLC All Rights Reserved.
 * Copyright (c) 2026 Ryan Lester.
 * Use of this source code is governed by an MIT-style license in LICENSE.
 *
 * Verify the exact main source-scope receipt. No G11 or security pass is implied.
 */
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {spawnSync} from 'node:child_process';
import {createHash} from 'node:crypto';
import {dirname,join} from 'node:path';
import {fileURLToPath} from 'node:url';
import {buildScopeEvidenceOk} from '../scripts/upstream-build-scope-evidence.mjs';

const root=join(dirname(fileURLToPath(import.meta.url)),'..');
const read=path=>readFileSync(join(root,path));
const hash=bytes=>createHash('sha256').update(bytes).digest('hex');
const reportPath='compatibility/rc/packed-upstream-source-build-main-e184.json';
const report=JSON.parse(read(reportPath));
const ledger=JSON.parse(read('compatibility/f10/disposition-ledger/ledger.json'));
const git=spawnSync('git',['-c','gc.auto=0','-c','maintenance.auto=0','ls-files','projects/ngx-material-legacy'],{cwd:root,encoding:'utf8'});
assert.equal(git.status,0,git.stderr);
const paths=git.stdout.trim().split('\n').filter(Boolean);
const rows=report.reviews.map(review=>ledger.entries.find(row=>row.sha===review.sha));
assert.equal(rows.length,14);assert.ok(rows.every(Boolean));
let cases=0,negatives=0;
function check(name,body,entry,expected,overrides={},population=paths) {
  const result=buildScopeEvidenceOk(body,entry,path=>Object.hasOwn(overrides,path)?overrides[path]:read(path),population);
  assert.equal(result,expected,name);
  if(expected)cases++;else negatives++;
}
for(const row of rows)check(`main ${row.sha}`,report,row,true);
const entry=rows[0];let body=structuredClone(report),changed;
body.line='21.x';check('wrong line',body,entry,false);
body=structuredClone(report);body.sealed=false;check('unsealed',body,entry,false);
body=structuredClone(report);body.reviews[0].decision+=' changed';check('detached modified body',body,entry,false);
body=structuredClone(report);body.reviews[0].main_source_judgment+=' changed';check('modified main judgment',body,entry,false);
changed=structuredClone(entry);changed.individual_proof.affected_branches=['main','21.x'];check('dual branch proof',report,changed,false);
changed=structuredClone(entry);changed.reason+=' changed';check('changed ledger decision',report,changed,false);
for(const path of [reportPath,'compatibility/rc/packed-upstream-source-build.json','compatibility/rc/packed-upstream-source-build-main-e184-prior-rows.json','compatibility/rc/packed-upstream-source-build-main-e184-ledger-delta.json',entry.source_check.patch_path,'scripts/npm-tooling-options.mjs','testing/legacy-runner/karma.conf.cjs','compatibility/rc/parent-main-strong-focus-companion-review-v1.json','projects/ngx-material-legacy/styles/core/focus-indicators/_focus-indicators.scss','package.json']) {
  check(`changed ${path}`,report,entry,false,{[path]:Buffer.from('changed')});
}
check('missing product roster member',report,entry,false,{},paths.slice(1));
// Exercise the untouched historical route using a synthetic current-context
// fixture. It does not claim that the real 21.x line was tested.
const historical=JSON.parse(read('compatibility/rc/packed-upstream-source-build.json'));
const prior=JSON.parse(read('compatibility/rc/packed-upstream-source-build-main-e184-prior-rows.json')).rows[0];
historical.candidate_context.files=historical.candidate_context.files.map(({path})=>{const bytes=read(path);return {path,sha256:hash(bytes),bytes:bytes.length};});
historical.candidate_context.product_members=paths.map(path=>{const bytes=read(path);return {path,sha256:hash(bytes),bytes:bytes.length};});
historical.candidate_context.tracked_product_paths=paths;
historical.candidate_context.tracked_product_paths_sha256=hash(Buffer.from(paths.join('\n')+'\n'));
const historicBytes=Buffer.from(JSON.stringify(historical));prior.source_check.evidence_report_sha256=hash(historicBytes);
check('historical route fixture',historical,prior,true,{[prior.evidence_report]:historicBytes});
console.log(JSON.stringify({cases,negative_controls:negatives,line:'main',scope:'finite source-scope evidence only; no G11, security, runtime or 21.x qualification'}));
