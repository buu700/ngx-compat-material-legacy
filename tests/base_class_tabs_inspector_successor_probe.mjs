/**
 * @license
 * Copyright Google LLC All Rights Reserved.
 * Copyright (c) 2026 Ryan Lester.
 * Use of this source code is governed by the MIT license in LICENSE.
 */
/** Runs only inside a disposable, Git-backed copy mounted at its original path. */
import assert from 'node:assert/strict';
import {readFileSync,writeFileSync} from 'node:fs';
import {resolve} from 'node:path';
import {gunzipSync} from 'node:zlib';
import admission from '../scripts/upstream-base-class-removal-admission.cjs';
import {applyBaseClassRemovalCanonicalStage} from '../scripts/base-class-removal-canonical-stage.mjs';
import {tabsFiniteSourceSuccessor} from '../scripts/tabs-finite-source-successor.mjs';
import {readHistoricalContractRepairMember} from '../scripts/historical-contract-repair-source.mjs';
import {baseClassRemovalCanonicalFrameSubject,baseClassRemovalOwnerSourceSubject} from '../scripts/base-class-removal-owner-source.mjs';
const root=process.cwd(),read=p=>readHistoricalContractRepairMember(root,p);
const packet='compatibility/rc/parent-base-admission-tabs-inspector-successor-v1.json';
const cjs='scripts/upstream-base-class-removal-admission.cjs';
const body='projects/ngx-material-legacy/legacy-tabs/internal/tab-body-base.ts';
const transition=JSON.parse(read(packet));
const finite=JSON.parse(read('compatibility/rc/parent-tabs-finite-source-successor-v1.json'));
const selector=tabsFiniteSourceSuccessor({root,line:'21.x',read});
for(const row of finite.branches['21.x'].transitions){
 assert.equal(selector.qualify(row.before).sha256,row.after.sha256);
 assert.throws(()=>selector.qualify({...row.before,sha256:'0'.repeat(64)}));
}
const review=JSON.parse(read(admission.BASE_CLASS_REMOVAL_REVIEW));
const before=gunzipSync(read('compatibility/rc/21x-base-class-removal-admission-canonical-proposal-v2-ledger-before.json.gz'));
const entry=applyBaseClassRemovalCanonicalStage({before,body:review}).entries[0];
const args={root,entry,body:review,review,proof:entry.individual_proof,read};
const source=admission.inspectSource(args);source.assertCurrent();
const frame=baseClassRemovalCanonicalFrameSubject({root,read}); frame.assertCurrent();
assert.ok(frame.bound.some(x=>x.path===packet)); assert.equal(frame.inspectSourceFunctionSha256,transition.inspect_source_function_sha256.after);
const owner=baseClassRemovalOwnerSourceSubject({root,read}); owner.assertCurrent();
assert.ok(owner.bound.some(x=>x.path===packet)); console.log('actual frame and owner constructors, guards, packet binding pass');
for(const path of [packet,cjs,body]){
 const old=read(path);try{writeFileSync(resolve(root,path),Buffer.concat([old,Buffer.from('\n')]));
 assert.throws(()=>frame.assertCurrent());assert.throws(()=>owner.assertCurrent());
 assert.throws(()=>baseClassRemovalCanonicalFrameSubject({root,read}));assert.throws(()=>baseClassRemovalOwnerSourceSubject({root,read}));
 }finally{writeFileSync(resolve(root,path),old);}
 frame.assertCurrent();owner.assertCurrent();console.log('cold/late tamper rejected and restored: '+path);
}
let poison=false;const reader=p=>poison&&p===packet?Buffer.from('wrong'):read(p);
const f=baseClassRemovalCanonicalFrameSubject({root,read:reader});const o=baseClassRemovalOwnerSourceSubject({root,read:reader});
poison=true;assert.throws(()=>f.assertCurrent());assert.throws(()=>o.assertCurrent());assert.throws(()=>baseClassRemovalCanonicalFrameSubject({root,read:reader}));assert.throws(()=>baseClassRemovalOwnerSourceSubject({root,read:reader}));
poison=false;f.assertCurrent();o.assertCurrent();console.log('supplied callback substitution rejected cold/late; restoration accepted');
let mutate=false; const changing=p=>{const raw=read(p);if(mutate&&p===packet){mutate=false;writeFileSync(resolve(root,p),Buffer.concat([raw,Buffer.from('\n')]));}return raw;};
const m=baseClassRemovalCanonicalFrameSubject({root,read:changing});const original=read(packet);
try{mutate=true;assert.throws(()=>m.assertCurrent());}finally{writeFileSync(resolve(root,packet),original);}
m.assertCurrent();console.log('callback physical mutation rejected; restoration accepted');

const saved=review.g11_claim;review.g11_claim='passed';
try{assert.throws(()=>source.assertCurrent());assert.throws(()=>admission.inspectSource(args));}
finally{review.g11_claim=saved;}
source.assertCurrent();console.log('metadata tamper rejected cold/late; restoration accepted');
