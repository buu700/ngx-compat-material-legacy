/**
 * @license
 * Copyright Google LLC All Rights Reserved.
 * Copyright (c) 2026 Ryan Lester.
 * Use of this source code is governed by the MIT license in LICENSE.
 */
/** Finite main source-boundary probes; no native, browser, packed or floor claim. */
import assert from 'node:assert/strict';
import {readFileSync,mkdtempSync,symlinkSync,unlinkSync,rmdirSync} from 'node:fs';
import {tmpdir} from 'node:os';
import {join,resolve,dirname} from 'node:path';
import {fileURLToPath} from 'node:url';
import {createCurrentNativeTabDownstreamSource} from '../scripts/current-native-tab-downstream-source.mjs';
import {reviewCurrentNativeTabLifecycle} from '../scripts/current-native-tab-lifecycle-source.mjs';
import {inspectTabLifecycleRepair} from '../scripts/remaining-native-tab-lifecycle-review.mjs';

const root=resolve(dirname(fileURLToPath(import.meta.url)),'..');
const read=path=>readFileSync(resolve(root,path));
const cases=[];
const pass=id=>cases.push({id,result:'pass'});
const downstream=createCurrentNativeTabDownstreamSource({root,line:'main',read});
assert.equal(downstream.bound.filter(row=>row.path.startsWith('scripts/')||row.path.startsWith('tests/')||row.path.startsWith('projects/')).length>41,true);
assert.equal(downstream.changed.length,18);
const target='scripts/check-upstream-audit-disposition.mjs';
const old=downstream.old_bound.find(row=>row.path===target),current=downstream.bound.find(row=>row.path===target);
assert.deepEqual(downstream.qualify(old),current);pass('exact-retained-parent-to-current');
let getterCalls=0;
assert.throws(()=>downstream.qualify({path:target,get sha256(){getterCalls++;return old.sha256;}}),/data properties/);
assert.equal(getterCalls,0);pass('getter-never-invoked');
assert.throws(()=>downstream.qualify(new Proxy({path:target,sha256:old.sha256},{})),/proxy/);pass('proxy-rejected');
assert.equal(downstream.qualify({path:'outside/finite/owner',sha256:old.sha256}),null);pass('unowned-reference-unconsumed');
let armed=false,owner;
owner=createCurrentNativeTabDownstreamSource({root,line:'main',read:path=>{
 if(armed&&path===target){armed=false;assert.throws(()=>owner.assertCurrent(),/reentrant/);}
 return read(path);
}});
armed=true;assert.throws(()=>owner.assertCurrent(),/reentrant/);owner.assertCurrent();pass('caught-nested-downstream-callback-sticky');
assert.throws(()=>createCurrentNativeTabDownstreamSource({root,line:'main',read:path=>path===target?Buffer.concat([read(path),Buffer.from('x')]):read(path)}),/nonphysical/);pass('downstream-callback-must-match-physical');
const packet='compatibility/rc/current-native-tab-downstream-source-epochs-v3.json';
assert.throws(()=>createCurrentNativeTabDownstreamSource({root,line:'main',read:path=>path===packet?Buffer.concat([read(path),Buffer.from('x')]):read(path)}),/nonphysical/);pass('downstream-packet-callback-must-match-physical');
assert.throws(()=>createCurrentNativeTabDownstreamSource({root,line:'21.x',read}),/main-only/);pass('main-only-epoch');
let lifecycleArmed=false,lifecycle;
const tab='projects/ngx-material-legacy/legacy-tabs/internal/tab-body-base.ts';
lifecycle=reviewCurrentNativeTabLifecycle({root,line:'main',read:path=>{
 if(lifecycleArmed&&path===tab){lifecycleArmed=false;assert.throws(()=>lifecycle.assertCurrent(),/reentrant/);}
 return read(path);
}});
lifecycleArmed=true;assert.throws(()=>lifecycle.assertCurrent(),/nested|reentrant/);lifecycle.assertCurrent();pass('caught-nested-lifecycle-callback-sticky');
const historicalReport='compatibility/rc/remaining-native-admission-tab-repair-lifecycle-controls.json';
assert.throws(()=>reviewCurrentNativeTabLifecycle({root,line:'main',read:path=>path===historicalReport?Buffer.concat([read(path),Buffer.from('x')]):read(path)}),/nonphysical/);pass('lifecycle-report-callback-must-match-physical');
let inspectorArmed=true;
assert.throws(()=>inspectTabLifecycleRepair({root,readMember:path=>{
 if(inspectorArmed&&path==='projects/ngx-material-legacy/package.json'){
  inspectorArmed=false;assert.throws(()=>inspectTabLifecycleRepair({root}),/reentrant/);
 }
 return read(path);
}}),/reentrant/);pass('caught-nested-inspector-callback-sticky');
const temp=mkdtempSync(join(tmpdir(),'tab-source-root-'));
const linked=join(temp,'linked');symlinkSync(root,linked,'dir');
const ancestor=join(temp,'ancestor');symlinkSync(dirname(root),ancestor,'dir');
const nestedRoot=join(ancestor,root.split('/').at(-1));
try{
 assert.throws(()=>reviewCurrentNativeTabLifecycle({root:linked,line:'main',read:path=>readFileSync(resolve(linked,path))}),/linked .* root ancestor/);
 assert.throws(()=>createCurrentNativeTabDownstreamSource({root:linked,line:'main',read:path=>readFileSync(resolve(linked,path))}),/linked .* root ancestor/);
 assert.throws(()=>inspectTabLifecycleRepair({root:linked}),/linked .* root ancestor/);
 assert.throws(()=>reviewCurrentNativeTabLifecycle({root:nestedRoot,line:'main',read:path=>readFileSync(resolve(nestedRoot,path))}),/linked .* root ancestor/);
 assert.throws(()=>createCurrentNativeTabDownstreamSource({root:nestedRoot,line:'main',read:path=>readFileSync(resolve(nestedRoot,path))}),/linked .* root ancestor/);
 assert.throws(()=>inspectTabLifecycleRepair({root:nestedRoot}),/linked .* root ancestor/);
 pass('linked-root-rejected');
}finally{unlinkSync(linked);unlinkSync(ancestor);rmdirSync(temp);}
const result=inspectTabLifecycleRepair({root,readMember:read});
assert.equal(result.schema_version,3);assert.equal(result.current_product_members,1143);assert.equal(result.changed_product.length,52);
assert.equal(result.changed_resources.length,15);assert.equal(result.downstream_source_epochs.changed.length,18);
assert.equal(result.source_only,true);assert.equal(result.g11_claim,'not-passed');pass('main-52-source-composition');
console.log(JSON.stringify({schema_version:1,line:'main',cases,source_only:true,actual_native_packed_or_floor_qualified:false,g11_claim:'not-passed'}));
