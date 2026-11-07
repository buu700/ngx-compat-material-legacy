/**
 * @license
 * Copyright Google LLC All Rights Reserved.
 * Copyright (c) 2026 Ryan Lester.
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.io/license
 */
import assert from 'node:assert/strict';
import {readFileSync,mkdirSync,readdirSync} from 'node:fs';
import {resolve,join} from 'node:path';
import {overlayInheritedRequirements,validateOverlayInherited} from '../scripts/upstream-overlay-inherited-evidence.mjs';
const runDir=resolve(process.argv[2]||'');if(!process.argv[2])throw Error('provide a genuine coordinator run directory');
const report=JSON.parse(readFileSync(join(runDir,'reports/packed-consumer.json'))),run=JSON.parse(readFileSync(join(runDir,'run.json'))),out=join(runDir,'evidence/overlay-live-validator-test');mkdirSync(out,{recursive:true});
const request={runDir,runId:run.run_id,line:'main',binding:report.binding,outputDir:out,invocation:'live-validator-test',packedConsumerExecution:{run_id:run.run_id,invocation_id:report.invocation_id,exit_code:0}};
const sha='01cc6f3265903cc6c3a58ea4ae5e03c917597e8f',scope=overlayInheritedRequirements(sha,'main'),proof={proof_kind:scope.kind,diff_sha256:scope.patch,affected_branches:['main'],reachable_behavior:{kind:'executed-delegation',id:'overlay-inherited-native/'+sha}};
const entry=JSON.parse(readFileSync('compatibility/f10/disposition-ledger/ledger.json')).entries.find(e=>e.sha===sha);
const invoke=(p=proof,r=request)=>validateOverlayInherited({root:process.cwd(),entry,proof:p,request:r,line:'main'});
assert.equal(invoke({...proof,diff_sha256:'0'.repeat(64)}).ok,false);
assert.equal(invoke(proof,{...request,packedConsumerExecution:{...request.packedConsumerExecution,invocation_id:'forged-invocation'}}).ok,false);
assert.equal(invoke(proof,{...request,runId:'forged-run'}).ok,false);
const original=process.env.CHROME_BIN;process.env.CHROME_BIN='/usr/bin/false';const wrongBrowser=invoke();assert.equal(wrongBrowser.ok,false);assert.match(wrongBrowser.detail,/overlay producer failed/);process.env.CHROME_BIN=original;
const before=new Set(readdirSync(out));const good=invoke();assert.equal(good.ok,true,good.detail);assert.ok(!before.has(good.output));const actual=JSON.parse(readFileSync(join(out,good.output)));assert.equal(actual.nonce,good.nonce);assert.equal(actual.artifact_sha256,report.artifacts.library.sha256);assert.equal(actual.run_id,run.run_id);assert.equal(actual.contracts.length,5);assert.ok(actual.contracts.every(c=>c.baseline&&!c.fault_accepted));
console.log(JSON.stringify({kind:'real-packed-live-validator-test',source_commit:run.source.commit,library_sha256:actual.artifact_sha256,run_id:run.run_id,producer_nonce:good.nonce,positive:true,wrong_diff_rejected:true,forged_invocation_rejected:true,forged_run_rejected:true,wrong_browser_rejected:true,scope:'focused overlay only; no G11'}));
