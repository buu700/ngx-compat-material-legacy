/**
 * @license
 * Copyright Google LLC All Rights Reserved.
 * Copyright (c) 2026 Ryan Lester.
 * Use of this source code is governed by an MIT-style license in LICENSE.
 */
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {execFileSync} from 'node:child_process';
import {testConsolidationBatchOk,testConsolidationEntryOk} from '../scripts/upstream-test-consolidation-evidence.mjs';

const reportPath='compatibility/rc/c04-main32-consolidation-source-v1.json';
const priorPath='compatibility/rc/packed-upstream-source-test-consolidation.json';
const archivePath='compatibility/rc/c04-main32-consolidation-prior-rows-v1.json';
const deltaPath='compatibility/rc/c04-main32-consolidation-ledger-delta-v1.json';
const read=p=>readFileSync(p),body=JSON.parse(read(reportPath)),delta=JSON.parse(read(deltaPath));
const paths=execFileSync('git',['ls-files','projects/ngx-material-legacy']).toString().trim().split('\n');
assert.equal(testConsolidationBatchOk(body,read,paths),true);
for(const entry of delta.rows)assert.equal(testConsolidationEntryOk(body,entry,read,true),true,entry.sha);
assert.equal(delta.rows.length,32);
const mutate=target=>p=>p===target?Buffer.concat([read(p),Buffer.from(' ')]):read(p);
let negatives=0;
for(const [name,path] of [
 ['prior report',priorPath],['new report',reportPath],['prior ledger archive',archivePath],['new ledger delta',deltaPath],
 ['current build proof','compatibility/rc/packed-upstream-source-build-main-e184.json'],
 ['current build graph','.node-version'],
 ['owned harness shim','testing/legacy-runner/shims/harness/dialog/shared.spec.ts'],
 ['preparation qualification','compatibility/rc/harness-animation-preparation-current-qualification.json'],
 ['current runner roster','testing/legacy-runner/historical-specs.json'],
]){assert.equal(testConsolidationBatchOk(body,mutate(path),paths),false,name);negatives++;}
const wrongLine=p=>{if(p!=='projects/ngx-material-legacy/package.json')return read(p);const x=JSON.parse(read(p));x.version='21.0.0';return Buffer.from(JSON.stringify(x));};
assert.equal(testConsolidationBatchOk(body,wrongLine,paths),false,'wrong line');negatives++;
const omitted=structuredClone(body);delete omitted.main_current_context;
assert.equal(testConsolidationEntryOk(omitted,delta.rows[0],read,true),false,'new path cannot bypass missing context');negatives++;
const badEntry=structuredClone(delta.rows[0]);badEntry.reason+=' altered';assert.equal(testConsolidationEntryOk(body,badEntry,read,true),false,'changed ledger row');negatives++;
const missing=structuredClone(body);missing.reviews.pop();assert.equal(testConsolidationBatchOk(missing,read,paths),false,'missing review');negatives++;
const dup=structuredClone(body);dup.reviews[1]=dup.reviews[0];assert.equal(testConsolidationBatchOk(dup,read,paths),false,'duplicate review');negatives++;
console.log(JSON.stringify({positive_entries:delta.rows.length,negative_controls:negatives}));
