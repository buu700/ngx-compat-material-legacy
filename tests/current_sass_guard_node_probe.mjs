/**
 * @license
 * Copyright Google LLC All Rights Reserved.
 * Copyright (c) 2026 Ryan Lester.
 * Use of this source code is governed by the MIT license in LICENSE.
 */
import assert from 'node:assert/strict';
import {readFileSync,writeFileSync} from 'node:fs';
import {join,resolve} from 'node:path';
import {createCurrentSassSource} from '../scripts/current-sass-source.mjs';
import {composeCanonicalSourceGuards} from '../scripts/canonical-source-guard-plan.mjs';
const root=resolve(process.argv[2]);assert.ok(root.includes('ngx-current-sass-source-test-'));
let subject,armed=null,calls=0;
const read=path=>{calls++;const raw=readFileSync(join(root,path));if(armed)armed(path,raw);return raw;};
subject=createCurrentSassSource({root,read});
const node=subject.guardPlan.node;assert.equal(node,subject.guardNode);assert.equal(subject.guardPlan.assertCurrent,subject.assertCurrent);
const own=subject.bound.find(r=>r.path==='scripts/current-sass-source.mjs'),file=join(root,own.path),before=readFileSync(file),drift=Buffer.concat([before,Buffer.from('\n# node drift\n')]);
let controls=0;
const check=fn=>{try{fn();controls++;}finally{armed=null;writeFileSync(file,before);}};
check(()=>{calls=0;node.preflight();node.final();assert.equal(calls,0);});
check(()=>{calls=0;node.consume();assert.equal(calls,subject.bound.length);});
check(()=>{calls=0;composeCanonicalSourceGuards(Object.freeze([node,node]))();assert.equal(calls,subject.bound.length);});
const second=createCurrentSassSource({root,read});
check(()=>{calls=0;composeCanonicalSourceGuards(Object.freeze([node,second.guardNode]))();assert.equal(calls,subject.bound.length+second.bound.length);});
check(()=>{writeFileSync(file,drift);calls=0;armed=()=>writeFileSync(file,before);assert.throws(()=>subject.assertCurrent());assert.equal(calls,0);});
check(()=>{armed=(path)=>{if(path===own.path)writeFileSync(file,drift);};assert.throws(()=>subject.assertCurrent());});
check(()=>{armed=path=>{if(path===subject.bound.at(-1).path)writeFileSync(file,drift);};assert.throws(()=>subject.assertCurrent());});
check(()=>{const late=Object.freeze({dependencies:Object.freeze([node]),preflight:()=>{},consume:()=>{writeFileSync(file,drift);},final:()=>{}});assert.throws(()=>composeCanonicalSourceGuards(Object.freeze([late]))());});
for(const operation of [()=>subject.assertCurrent(),()=>node.preflight(),()=>node.consume(),()=>node.final(),()=>composeCanonicalSourceGuards(Object.freeze([node]))(),()=>subject.qualify(subject.transitions[0].current),()=>subject.assertHistoricalSource(subject.transitions[0].path,'unused')])check(()=>{
 let rejected=false;armed=()=>{if(rejected)return;armed=null;assert.throws(operation,/reentrant/);rejected=true;};subject.assertCurrent();assert.equal(rejected,true);
});
check(()=>{let thrown=false;armed=()=>{if(!thrown){thrown=true;throw Error('supplied callback failure');}};assert.throws(()=>subject.assertCurrent(),/supplied callback failure/);armed=null;subject.assertCurrent();});
check(()=>{const forged=createCurrentSassSource({root,read:path=>readFileSync(join(root,path))});const first=forged.bound[0];assert.equal(first.path,'scripts/canonical-source-guard-plan.mjs');forged.bound[0].sha256='0'.repeat(64);forged.assertCurrent();});
check(()=>{const planner=join(root,'scripts/canonical-source-guard-plan.mjs'),raw=readFileSync(planner);try{writeFileSync(planner,Buffer.concat([raw,Buffer.from('\n// changed\n')]));calls=0;assert.throws(()=>createCurrentSassSource({root,read}));assert.equal(calls,0);}finally{writeFileSync(planner,raw);}});
subject.assertCurrent();console.log(JSON.stringify({result:'pass',controls,actual_subject:true,restoration_passed:true,complete_owner_success:false}));
