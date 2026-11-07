/**
 * @license
 * Copyright Google LLC All Rights Reserved.
 * Copyright (c) 2026 Ryan Lester.
 * Use of this source code is governed by the MIT license in LICENSE.
 */
import assert from 'node:assert/strict';
import {readFileSync,writeFileSync} from 'node:fs';
import {join} from 'node:path';
import {selectDialogFiniteSuccessor as create} from '../scripts/select-dialog-finite-source-v6.mjs';
const root=process.argv[2],read=p=>readFileSync(join(root,p)),packet=JSON.parse(read('compatibility/rc/parent-select-dialog-menu-reviewed-repair-source-v6.json'));
const s=create({root,line:'main',read});for(const row of packet.repairs){assert.deepEqual(s.qualify({path:row.path,sha256:row.before.sha256,bytes:row.before.bytes}),{path:row.path,sha256:row.after.sha256,bytes:row.after.bytes});assert.deepEqual(s.qualify({path:row.path,sha256:row.after.sha256,bytes:row.after.bytes}),{path:row.path,sha256:row.after.sha256,bytes:row.after.bytes});assert.throws(()=>s.qualify({path:row.path,sha256:'0'.repeat(64)}));}
const row=packet.repairs[0],incoming={path:row.path,sha256:row.before.sha256,bytes:row.before.bytes};let armed=false,live;
live=create({root,line:'main',read:p=>{const b=read(p);if(armed){armed=false;incoming.sha256='0'.repeat(64);}return b;}});
armed=true;assert.throws(()=>live.qualify(incoming));incoming.sha256=row.before.sha256;live.assertCurrent();
let nested=false,owner;owner=create({root,line:'main',read:p=>{const b=read(p);if(nested){nested=false;assert.throws(()=>owner.assertCurrent(),/reentrant/);}return b;}});nested=true;assert.throws(()=>owner.assertCurrent(),/reentrant/);owner.assertCurrent();
const version='projects/ngx-material-legacy/package.json',original=read(version),file=join(root,version);
try{const value=JSON.parse(original);value.version='21.0.0';writeFileSync(file,JSON.stringify(value));assert.throws(()=>s.assertCurrent());assert.throws(()=>create({root,line:'main',read}));}finally{writeFileSync(file,original);}
console.log(JSON.stringify({bound:s.bound,repairs:packet.repairs.map(r=>({before:r.before,after:r.after}))}));
