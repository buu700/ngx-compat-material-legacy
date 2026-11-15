/**
 * @license
 * Copyright Google LLC All Rights Reserved.
 * Copyright (c) 2026 Ryan Lester.
 * Use of this source code is governed by the MIT license in LICENSE.
 */
/** Finite source continuation controls on a temporary physical fixture. */
import assert from 'node:assert/strict';
import {readFileSync,writeFileSync,realpathSync} from 'node:fs';
import {basename,join,resolve} from 'node:path';
import {createCurrentSpinnerSnackContract} from '../scripts/current-sass-spinner-snack-contract.mjs';
const root=resolve(process.argv[2]);assert.ok(basename(root).startsWith('ngx-current-sass-source-test-'));assert.notEqual(realpathSync(root),realpathSync(process.cwd()));
const packet='compatibility/rc/current-main-sass-form-field-executable-source-v1.json';
let mode='',holder,last='';const reader=p=>{const bytes=readFileSync(join(root,p));
 if(mode==='forged'&&p===packet)return Buffer.concat([bytes,Buffer.from(' ')]);
 if(mode==='nested'&&p==='scripts/current-sass-spinner-snack-contract.mjs'){try{holder.assertCurrent();}catch{}}
 if(mode==='late'&&p===last){mode='';writeFileSync(join(root,packet),Buffer.concat([saved,Buffer.from(' ')]));}
 return bytes;};
const saved=readFileSync(join(root,packet));holder=createCurrentSpinnerSnackContract({root,read:reader});last=holder.bound.at(-1).path;
mode='forged';assert.throws(()=>holder.assertCurrent());mode='';holder.assertCurrent();
mode='nested';assert.throws(()=>holder.assertCurrent());mode='';holder.assertCurrent();
try{mode='late';assert.throws(()=>holder.assertCurrent());}finally{mode='';writeFileSync(join(root,packet),saved);}holder.assertCurrent();
try{writeFileSync(join(root,packet),Buffer.concat([saved,Buffer.from(' ')]));assert.throws(()=>createCurrentSpinnerSnackContract({root}));}finally{writeFileSync(join(root,packet),saved);}holder.assertCurrent();
console.log('spinner source JS forged, nested, late and recovery controls pass');
