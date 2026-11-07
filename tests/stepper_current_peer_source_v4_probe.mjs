/**
 * @license
 * Copyright Google LLC All Rights Reserved.
 * Copyright (c) 2026 Ryan Lester.
 * Use of this source code is governed by the MIT license in LICENSE.
 */
import assert from 'node:assert/strict';
import {readFileSync,writeFileSync} from 'node:fs';
import {join,resolve} from 'node:path';
import {createStepperCurrentPeerSourceV4 as create} from '../scripts/stepper-current-peer-source-v4.mjs';
const root=resolve(process.argv[2]),read=path=>readFileSync(join(root,path));
const p=JSON.parse(read('compatibility/rc/current-sass-stepper-current-peer-source-inputs-v4.json'));
const s=create({root});assert.equal(s.line,'main');assert.equal(s.bound.length,296);
for(const r of [p.transition.before,p.transition.after])assert.equal(s.qualify(r).sha256,p.transition.after.sha256);
assert.throws(()=>s.qualify({...p.transition.before,sha256:'0'.repeat(64)}));
assert.throws(()=>s.qualify({...p.transition.before,bytes:p.transition.before.bytes+1}));
assert.throws(()=>create({root,read:path=>path===p.transition.before.path?Buffer.from('foreign'):read(path)}));
for(const path of [p.transition.after.path,'compatibility/rc/current-sass-stepper-current-peer-source-inputs-v4.json','scripts/stepper-sixth-source.mjs','projects/ngx-material-legacy/styles/stepper/_stepper-theme.scss','projects/ngx-material-legacy/package.json']){
 const file=join(root,path),saved=read(path);
 try{writeFileSync(file,Buffer.concat([saved,Buffer.from('\nforeign')]));assert.throws(()=>create({root}));assert.throws(()=>s.assertCurrent());}finally{writeFileSync(file,saved);}
 let armed=false;const last=s.bound.at(-1).path, live=create({root,read:path=>{const value=read(path);if(armed&&path===last){armed=false;writeFileSync(file,Buffer.concat([saved,Buffer.from('\nlate')]));}return value;}});
 try{armed=true;assert.throws(()=>live.assertCurrent());}finally{writeFileSync(file,saved);}live.assertCurrent();
}
const versionFile=join(root,'projects/ngx-material-legacy/package.json'),versionBytes=read('projects/ngx-material-legacy/package.json');
assert.throws(()=>create({root,read:path=>{if(path==='projects/ngx-material-legacy/package.json'){const value=JSON.parse(versionBytes);value.version='21.0.0';return Buffer.from(JSON.stringify(value));}return read(path);}}));
try{const version=JSON.parse(versionBytes);version.version='21.0.0';writeFileSync(versionFile,JSON.stringify(version));assert.throws(()=>s.assertCurrent());assert.throws(()=>create({root}));}finally{writeFileSync(versionFile,versionBytes);}
let nestedArmed=false,nestedOwner;
nestedOwner=create({root,read:path=>{const raw=read(path);if(nestedArmed){nestedArmed=false;assert.throws(()=>nestedOwner.assertCurrent(),/reentrant/);}return raw;}});
nestedArmed=true;assert.throws(()=>nestedOwner.assertCurrent(),/nested|reentrant/);nestedOwner.assertCurrent();
console.log(JSON.stringify({line:s.line,transition:s.transition,source_set:s.source_set,bound:s.bound.length,negative_paths:5}));
