/**
 * @license
 * Copyright Google LLC All Rights Reserved.
 * Copyright (c) 2026 Ryan Lester.
 * Use of this source code is governed by the MIT license in LICENSE.
 */
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {execFileSync} from 'node:child_process';
import {buildScopeEvidenceOk,ciCaptureReader} from '../scripts/upstream-build-scope-evidence.mjs';
import {testConsolidationBatchOk,testConsolidationEntryOk} from '../scripts/upstream-test-consolidation-evidence.mjs';
const read=p=>readFileSync(p),paths=execFileSync('git',['ls-files','projects/ngx-material-legacy']).toString().trim().split('\n');
const report=JSON.parse(read('compatibility/rc/packed-upstream-source-build-main-e184.json'));
const consolidation=JSON.parse(read('compatibility/rc/c04-main32-consolidation-source-v1.json'));
const ledger=JSON.parse(read('compatibility/f10/disposition-ledger/ledger.json'));
const builds=report.scope_sha_ids.map(sha=>ledger.entries.find(e=>e.sha===sha));
const entries=consolidation.scope_sha_ids.map(sha=>ledger.entries.find(e=>e.sha===sha));
assert.equal(paths.length,1143);assert.equal(builds.length,14);assert.equal(entries.length,32);assert(builds.every(Boolean)&&entries.every(Boolean));
for(const row of builds)assert.equal(buildScopeEvidenceOk(report,row,read,paths),true,row.sha);
assert.equal(testConsolidationBatchOk(consolidation,read,paths),true);
for(const row of entries)assert.equal(testConsolidationEntryOk(consolidation,row,read,true),true,row.sha);
const changed=p=>q=>q===p?Buffer.from('forged or stale bytes'):read(q);
for(const path of ['flake.nix','.github/workflows/ci.yml','compatibility/rc/parent-main-ci-context46-source-v1.json','compatibility/rc/parent-main-ci-browser-pin-review-v1.json','scripts/npm-tooling-options.mjs',paths[0]])assert.equal(buildScopeEvidenceOk(report,builds[0],changed(path),paths),false,path);
assert.equal(buildScopeEvidenceOk(report,builds[0],changed('scripts/upstream-build-scope-evidence.mjs'),paths),false,'wrong direct helper image');
const fakeCapture=ciCaptureReader(()=>Buffer.from('forged physical bytes'));fakeCapture.read('flake.nix');assert.throws(()=>fakeCapture.close(),'final physical sweep must not trust callback');
const wrong=structuredClone(builds[0]);wrong.affected_branches=['main','21.x'];assert.equal(buildScopeEvidenceOk(report,wrong,read,paths),false,'wrong branch');
const wrongLine=p=>{if(p!=='projects/ngx-material-legacy/package.json')return read(p);const x=JSON.parse(read(p));x.version='21.0.0';return Buffer.from(JSON.stringify(x));};
assert.equal(buildScopeEvidenceOk(report,builds[0],wrongLine,paths),false,'wrong line');
const target=paths[0],trigger=builds[0].source_check.patch_path;let switched=false;
const late=p=>{if(p===trigger)switched=true;return p===target&&switched?Buffer.from('late mutation'):read(p);};
assert.equal(buildScopeEvidenceOk(report,builds[0],late,paths),false,'late product mutation');
assert.equal(testConsolidationBatchOk(consolidation,changed('scripts/upstream-build-scope-evidence.mjs'),paths),false,'wrong build helper source image');
assert.equal(testConsolidationBatchOk(consolidation,changed('scripts/upstream-test-consolidation-evidence.mjs'),paths),false,'wrong consolidation helper source image');
let count=0;const lateHelper=p=>p==='scripts/upstream-build-scope-evidence.mjs'&&++count>1?Buffer.from('late helper mutation'):read(p);
assert.equal(testConsolidationBatchOk(consolidation,lateHelper,paths),false,'late build helper image');
let afterBuild=false;const lateConsolidation=p=>{if(p==='testing/legacy-runner/historical-inventory.json')afterBuild=true;return p===target&&afterBuild?Buffer.from('late consolidation source mutation'):read(p);};
assert.equal(testConsolidationBatchOk(consolidation,lateConsolidation,paths),false,'late consolidation callback source');
const menuFiles=['projects/ngx-material-legacy/legacy-menu/internal/menu-trigger-base.ts','projects/ngx-material-legacy/legacy-menu/menu.spec.ts'];
const menuFrame='compatibility/rc/parent-main-menu-context46-source-v1.json';
const menuReview='compatibility/rc/parent-main-menu-item-di-ownership-review-v1.json';
for(const path of [...menuFiles,menuFrame,menuReview])assert.equal(buildScopeEvidenceOk(report,builds[0],changed(path),paths),false,'menu source or proof mutation: '+path);
const wrongRole=structuredClone(JSON.parse(read(menuFrame)));wrongRole.role='other approval';assert.equal(buildScopeEvidenceOk(report,builds[0],p=>p===menuFrame?Buffer.from(JSON.stringify(wrongRole)):read(p),paths),false,'forged role');
const another=paths.find(p=>!menuFiles.includes(p));assert.equal(buildScopeEvidenceOk(report,builds[0],changed(another),paths),false,'changed one of 1141');
let crossed=false;const lateMenu=p=>{if(p===menuReview)crossed=true;return p===menuFiles[1]&&crossed?Buffer.from('late changed menu test'):read(p);};
assert.equal(buildScopeEvidenceOk(report,builds[0],lateMenu,paths),false,'late menu callback');
console.log(JSON.stringify({builds:builds.length,consolidations:entries.length,context_records:70,product_paths:paths.length,negative_controls:22,source_only:true,security_runtime_g11:false}));
