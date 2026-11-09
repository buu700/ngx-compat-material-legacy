/**
 * @license
 * Copyright Google LLC All Rights Reserved.
 * Copyright (c) 2026 Ryan Lester.
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.io/license
 */
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {deriveMainRoster,assertCase,samplePass} from '../scripts/csp-ssr-roster.mjs';
import {transformWindowPeer} from '../scripts/csp-ssr-window-bundle.mjs';
import {windowSsrRequirements,validateWindowSsr} from '../scripts/upstream-window-ssr-evidence.mjs';
const id='csp-ssr/main/server/dom-free-server-and-leaks/render/table-window-scroll',sha='5c75bbecb24f49779baf86203a7e626d34e39f8c';
const roster=deriveMainRoster();assert.equal(roster.ids.filter(x=>x===id).length,1);const good=samplePass(id);assert.deepEqual(assertCase(id,good),[]);
const controls=[];
for(const [name,change] of [
 ['window identity',x=>x.windowScrollable=false],['document identity',x=>x.injectedDocument=false],['row count',x=>x.rowMarkers=1],
 ['missing cell',x=>x.cellMarkup.pop()],['wrong cell',x=>x.cellMarkup[0]='<td>SSR-WINDOW-ROW-A</td>'],
 ['reordered',x=>x.cellMarkup.reverse()],['global leak',x=>x.documentAfter='object'],['server exit',x=>x.exitCode=1],['hydration',x=>x.hydration=true]
]){const x=structuredClone(good);change(x);assert.notEqual(assertCase(id,x).length,0,name);controls.push(name);}
const peer=readFileSync('node_modules/@angular/cdk/fesm2022/scrolling.mjs','utf8');
const current=transformWindowPeer(peer,'current'),instrumented=transformWindowPeer(peer,'instrumented'),mutant=transformWindowPeer(peer,'mutant');
assert.equal(current,peer);assert.match(instrumented,/__WINDOW_CTOR_GLOBAL__/);assert.match(mutant,/__WINDOW_CTOR_GLOBAL__/);assert.notEqual(mutant,instrumented);
assert.throws(()=>transformWindowPeer(peer+'\n','mutant'));assert.throws(()=>transformWindowPeer(peer,'wrong'));
const req=windowSsrRequirements(sha,'main');assert.equal(req.sha,sha);assert.equal(windowSsrRequirements(sha,'21.x'),null);assert.equal(windowSsrRequirements('0'.repeat(40),'main'),null);
assert.equal(validateWindowSsr({root:process.cwd(),entry:{sha},proof:{proof_kind:req.kind,diff_sha256:req.patch,affected_branches:['main'],reachable_behavior:{kind:'executed-delegation',id}},request:null,line:'main'}).ok,false);
console.log(JSON.stringify({rosterPositive:true,controls,originalPeerBound:true,wrongPeerRejected:true,noRunRejected:true,liveSsrOrAuditClaim:false}));
