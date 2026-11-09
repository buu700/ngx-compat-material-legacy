/**
 * @license
 * Copyright Google LLC All Rights Reserved.
 * Copyright (c) 2026 Ryan Lester.
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.io/license
 */
// Run only in an isolated physical source frame: this changes and restores a fixture.
import assert from 'node:assert/strict';
import {readFileSync,writeFileSync} from 'node:fs';
import {windowSsrRequirements,validateWindowSsr} from '../scripts/upstream-window-ssr-evidence.mjs';
import {validateInheritedExecution} from '../scripts/upstream-inherited-execution-evidence.mjs';
const root=process.cwd(),sha='5c75bbecb24f49779baf86203a7e626d34e39f8c',req=windowSsrRequirements(sha,'main');
const proof={proof_kind:req.kind,diff_sha256:req.patch,affected_branches:['main'],reachable_behavior:{kind:'executed-delegation',id:req.case_id}};
const check=(over={})=>validateWindowSsr({root,entry:{sha},proof,request:null,line:'main',...over});
assert.match(check().detail,/packed run not accepted/);
assert.match(check({entry:{sha:'0'.repeat(40)}}).detail,/wrong window SSR subject/);
assert.match(check({proof:{...proof,diff_sha256:'0'.repeat(64)}}).detail,/wrong window SSR subject/);
const fixture='testing/csp-ssr/window-table.ts',scope='compatibility/rc/window-table-ssr-inherited-scope-main.json';
const self='scripts/upstream-window-ssr-evidence.mjs',dispatch='scripts/upstream-inherited-execution-evidence.mjs';
const original=readFileSync(fixture),originalScope=readFileSync(scope),originalSelf=readFileSync(self),originalDispatch=readFileSync(dispatch);
try{
 writeFileSync(fixture,Buffer.concat([original,Buffer.from('\n// physical drift\n')]));assert.match(check().detail,/window source changed/);writeFileSync(fixture,original);
 writeFileSync(scope,Buffer.concat([originalScope,Buffer.from(' ')]));assert.match(check().detail,/changed window SSR scope/);writeFileSync(scope,originalScope);
 writeFileSync(self,Buffer.concat([originalSelf,Buffer.from('\n// self drift\n')]));assert.match(check().detail,/loaded window validator changed/);writeFileSync(self,originalSelf);
 writeFileSync(dispatch,Buffer.concat([originalDispatch,Buffer.from('\n// dispatch drift\n')]));const forwarded=validateInheritedExecution({root,entry:{sha},proof,request:null,line:'main'});assert.equal(forwarded.ok,false);assert.match(forwarded.detail,/loaded window dispatch changed/);writeFileSync(dispatch,originalDispatch);
 assert.match(check().detail,/packed run not accepted/);
 console.log(JSON.stringify({wrongSha:true,wrongPatch:true,physicalSourceDrift:true,physicalScopeDrift:true,loadedValidatorDrift:true,loadedDispatchDrift:true,recovery:true,liveRunExecuted:false}));
}finally{writeFileSync(fixture,original);writeFileSync(scope,originalScope);writeFileSync(self,originalSelf);writeFileSync(dispatch,originalDispatch);}
