/**
 * @license
 * Copyright Google LLC All Rights Reserved.
 * Copyright (c) 2026 Ryan Lester.
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.io/license
 */
import assert from 'node:assert/strict';
import {readFileSync,writeFileSync,mkdirSync,mkdtempSync,rmSync} from 'node:fs';
import {join,dirname} from 'node:path';
import {contracts,faults,verify} from '../testing/overlay-inherited/contracts-fixture.mjs';
import {overlayInheritedRequirements,validateOverlayInherited} from '../scripts/upstream-overlay-inherited-evidence.mjs';
const ledger=JSON.parse(readFileSync('compatibility/f10/disposition-ledger/ledger.json')).entries;
const raw=JSON.parse(readFileSync(new URL('../testing/overlay-inherited/observation-sample.json',import.meta.url),'utf8'));const result=verify(raw);assert.equal(result.pass,true);assert.equal(result.results.length,5);
for(const [sha,fn] of Object.entries(contracts)){
 assert.equal(fn(raw.results.none.result),true);assert.equal(fn(raw.results[faults[sha]].result),false);
 assert.equal(overlayInheritedRequirements(sha,'main').sha,sha);assert.equal(overlayInheritedRequirements(sha,'21.x'),null);
 assert.equal(validateOverlayInherited({root:process.cwd(),entry:{sha},proof:{},line:'main'}).ok,false);
 const scope=overlayInheritedRequirements(sha,'main');const proof={proof_kind:scope.kind,diff_sha256:scope.patch,affected_branches:['main'],reachable_behavior:{kind:'executed-delegation',id:'overlay-inherited-native/'+sha}};
 const entry=ledger.find(e=>e.sha===sha);
 const missing=validateOverlayInherited({root:process.cwd(),entry,proof,line:'main',request:null});assert.equal(missing.ok,false);assert.match(missing.detail,/packed run not accepted/);
 assert.equal(validateOverlayInherited({root:process.cwd(),entry:{sha},proof:{...proof,diff_sha256:'0'.repeat(64)},line:'main'}).ok,false);
}
// The pinned producer and owned-caller bytes are tested before any run or
// observation is accepted. This isolated fixture never executes a browser.
const scoped=['scripts/overlay-inherited-archive.mjs','scripts/inherited-native-profiles.mjs','compatibility/rc/inherited-native-profiles.json','compatibility/rc/overlay-inherited-toolchain-main-x64-provisional.json','scripts/overlay-inherited-toolchain.mjs','compatibility/rc/overlay-inherited-toolchain-main.json','compatibility/rc/overlay-inherited-hunk-accountability.json','compatibility/rc/overlay-inherited-deps-main.json','scripts/overlay-inherited-native-run.mjs','scripts/overlay-inherited-browser.mjs','testing/overlay-inherited/consumer.ts','testing/overlay-inherited/contracts-fixture.mjs','projects/ngx-material-legacy/legacy-tooltip/internal/tooltip-base.ts','projects/ngx-material-legacy/legacy-select/internal/select-base.ts','projects/ngx-material-legacy/legacy-select/select.html','scripts/upstream-packed-run-evidence.mjs'];
mkdirSync('artifacts',{recursive:true});const fakeRoot=mkdtempSync(join(process.cwd(),'artifacts/overlay-source-fixture-'));
try {
 for(const path of scoped){const target=join(fakeRoot,path);mkdirSync(dirname(target),{recursive:true});writeFileSync(target,readFileSync(path));}
 const sha='01cc6f3265903cc6c3a58ea4ae5e03c917597e8f',scope=overlayInheritedRequirements(sha,'main'),proof={proof_kind:scope.kind,diff_sha256:scope.patch,affected_branches:['main'],reachable_behavior:{kind:'executed-delegation',id:'overlay-inherited-native/'+sha}};
 const entry=ledger.find(e=>e.sha===sha);const review=JSON.parse(readFileSync(entry.evidence_report));const archive=review.prior_disposition_source.prior_source_review.archive_path;
 const patch='compatibility/rc/overlay-inherited-original-patches/'+sha+'.patch';
 for(const path of [entry.evidence_report,archive,patch]){const target=join(fakeRoot,path);mkdirSync(dirname(target),{recursive:true});writeFileSync(target,readFileSync(path));}
 const check=(subject=entry)=>validateOverlayInherited({root:fakeRoot,entry:subject,proof,line:'main',request:null});
 assert.match(check({...entry,prior_disposition_record:{...entry.prior_disposition_record,sha:'forged'}}).detail,/prior disposition record changed/);
 const archivePath=join(fakeRoot,archive),saved=readFileSync(archivePath);writeFileSync(archivePath,Buffer.concat([saved,Buffer.from('x')]));assert.match(check().detail,/prior review archive changed/);writeFileSync(archivePath,saved);
 assert.match(check().detail,/packed run not accepted/);
 for(const [path,expected] of [[patch,/current complete patch changed/],[entry.evidence_report,/current individual review changed/]]){const target=join(fakeRoot,path),original=readFileSync(target);writeFileSync(target,Buffer.concat([original,Buffer.from('x')]));assert.match(check().detail,expected);writeFileSync(target,original);}
 for(const path of scoped){const target=join(fakeRoot,path),original=readFileSync(target);writeFileSync(target,Buffer.concat([original,Buffer.from('\nchanged')]));assert.match(check().detail,/overlay source identity changed/);writeFileSync(target,original);}
} finally {rmSync(fakeRoot,{recursive:true,force:true});}
console.log('five bounded overlay contracts and five fixture faults pass; no admission or runtime replay from this test');
