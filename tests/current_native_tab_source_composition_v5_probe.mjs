/**
 * @license
 * Copyright Google LLC All Rights Reserved.
 * Copyright (c) 2026 Ryan Lester.
 * Use of this source code is governed by the MIT license in LICENSE.
 */
import assert from 'node:assert/strict';
import {readFileSync,writeFileSync} from 'node:fs';
import {join} from 'node:path';
import {createCurrentNativeTabDownstreamSource} from '../scripts/current-native-tab-downstream-source.mjs';
const root=process.argv[2],read=path=>readFileSync(join(root,path));
const packet=JSON.parse(read('compatibility/rc/current-native-tab-downstream-source-epochs-v5.json'));
const create=options=>createCurrentNativeTabDownstreamSource({root,line:'main',...options});
const s=create();assert.equal(s.old_bound.length,41);assert.equal(s.changed.length,18);
assert.equal(s.changed.find(row=>row.path===packet.update.path).current_sha256,packet.update.after.sha256);
assert.equal(s.changed.find(row=>row.path===packet.update.path).authority,'fixed-report-capture-v5-source-transition');
for(const row of [packet.update,packet.closure_update]){
 assert.deepEqual(s.qualify(row.before),row.after);assert.deepEqual(s.qualify(row.after),row.after);
 assert.throws(()=>s.qualify({...row.before,sha256:'0'.repeat(64)}));
 assert.throws(()=>create({read:path=>path===row.path?Buffer.from('old or foreign bytes'):read(path)}));
}
const paths=[packet.update.path,packet.closure_update.path,packet.additional_inputs[0].path,'compatibility/rc/current-native-tab-downstream-source-epochs-v5.json'];
for(const path of paths){
 const file=join(root,path),saved=read(path);
 try{writeFileSync(file,Buffer.concat([saved,Buffer.from(' cold')]));assert.throws(()=>create());assert.throws(()=>s.assertCurrent());}finally{writeFileSync(file,saved);}
 let armed=false;const last=s.bound.at(-1).path;
 const live=create({read:p=>{const raw=read(p);if(armed&&p===last){armed=false;writeFileSync(file,Buffer.concat([saved,Buffer.from(' late')]));}return raw;}});
 try{armed=true;assert.throws(()=>live.assertCurrent());}finally{writeFileSync(file,saved);}
 live.assertCurrent();
}
console.log(JSON.stringify({result:'pass',historical:41,closure_sources:24,cold:paths.length,late:paths.length,source_only:s.source_only,g11:s.g11_claim}));
