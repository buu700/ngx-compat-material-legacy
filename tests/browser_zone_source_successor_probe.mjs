/**
 * @license
 * Copyright Google LLC All Rights Reserved.
 * Copyright (c) 2026 Ryan Lester.
 * Use of this source code is governed by the MIT license in LICENSE.
 */
import assert from 'node:assert/strict';
import {writeFileSync} from 'node:fs';
import {join} from 'node:path';
import {browserZoneSourceSuccessor} from '../scripts/browser-zone-source-successor.mjs';
import {inspectBrowserReferenceSource} from '../scripts/browser-reference-source.mjs';
import {prepareBrowserReferenceSourceMetadata} from '../scripts/browser-reference-proposal.mjs';
import {browserReferenceOwnerContext} from '../scripts/browser-reference-owner.mjs';
import {readCheckerOwnerMember} from '../scripts/checker-owner-source.mjs';
const root=process.cwd(),helper='scripts/browser-zone-source-successor.mjs',browser='scripts/browser-required-cells.mjs';
const physical=p=>readCheckerOwnerMember(root,p),saved=new Map([[helper,physical(helper)],[browser,physical(browser)]]),suffix=Buffer.from('\n// browser zone successor fault\n');
const restore=p=>{const raw=physical(p),before=saved.get(p);if(raw.equals(Buffer.concat([before,suffix])))writeFileSync(join(root,p),before);else assert.ok(raw.equals(before),'foreign bytes preserved '+p);};
const line=JSON.parse(physical('projects/ngx-material-legacy/package.json')).version.startsWith('21.')?'21.x':'main';let mode='',calls=0,reached=false,lastOuterPath='';
const read=p=>{calls++;const raw=physical(p);if(mode==='cold')restore(browser);if(mode==='late'&&!reached&&p===browser){reached=true;writeFileSync(join(root,helper),Buffer.concat([saved.get(helper),suffix]));}if(mode==='throw'&&p===browser)throw sentinel;if(mode==='outer'&&!reached&&p===lastOuterPath){const caller=(new Error().stack??'').split('\n')[2]??'';if(caller.includes('assertCurrent')&&caller.includes('browser-reference-'+group+'.mjs')){reached=true;writeFileSync(join(root,browser),Buffer.concat([saved.get(browser),suffix]));}}return raw;};
const sentinel=new Error('browser zone callback sentinel'),group=process.argv[2]??'helper';
assert.ok(['helper','source','proposal','owner'].includes(group));
if(group!=='helper'){
 const factory=group==='source'?inspectBrowserReferenceSource:group==='proposal'?prepareBrowserReferenceSourceMetadata:browserReferenceOwnerContext;
 try{
  writeFileSync(join(root,browser),Buffer.concat([saved.get(browser),suffix]));mode='cold';
  assert.throws(()=>factory({root,read}),e=>e?.code==='ERR_ASSERTION'&&e.message.includes(browser));assert.equal(calls,0);restore(browser);
  mode='';const outer=factory({root,read});lastOuterPath=outer.bound.at(-1).path;assert.ok(![helper,browser,'compatibility/rc/parent-zone-binder-finite-transition-v1.json'].includes(lastOuterPath));
  mode='outer';assert.throws(outer.assertCurrent,e=>e?.code==='ERR_ASSERTION'&&e.message.includes(browser)&&e.message.includes('physical browser zone'));assert.equal(reached,true);restore(browser);
  mode='';outer.assertCurrent();
 }finally{restore(helper);restore(browser);}
 console.log(JSON.stringify({result:'pass',line,group,composed_cold_before_callbacks:true,composed_outer_final_rejected:true,restoration_passed:true}));
 process.exit(0);
}
try{
 writeFileSync(join(root,browser),Buffer.concat([saved.get(browser),suffix]));mode='cold';
 assert.throws(()=>browserZoneSourceSuccessor({root,read,line}),e=>e?.code==='ERR_ASSERTION'&&e.message.includes(browser));assert.equal(calls,0);restore(browser);
 mode='';const subject=browserZoneSourceSuccessor({root,read,line});subject.assertCurrent();
 mode='late';assert.throws(subject.assertCurrent,e=>e?.code==='ERR_ASSERTION'&&e.message.includes(helper));assert.equal(reached,true);restore(helper);
 mode='throw';assert.throws(subject.assertCurrent,e=>e===sentinel);mode='';subject.assertCurrent();
}finally{restore(helper);restore(browser);}
console.log(JSON.stringify({result:'pass',line,cold_before_callbacks:true,late_earlier_file_rejected:true,exception_same_subject_recovered:true}));
