/**
 * @license
 * Copyright Google LLC All Rights Reserved.
 * Copyright (c) 2026 Ryan Lester.
 * Use of this source code is governed by the MIT license in LICENSE.
 */
/** Physical source-continuation controls in a disposable fixture only. */
import assert from 'node:assert/strict';
import {readFileSync,writeFileSync,realpathSync} from 'node:fs';
import {basename,join,resolve} from 'node:path';
import {selectProgramTransitions} from '../scripts/select-program-transition-source-v2.mjs';
const root=resolve(process.argv[2]);assert.ok(basename(root).startsWith('ngx-current-sass-source-test-'));assert.notEqual(realpathSync(root),realpathSync(process.cwd()));
const packet='compatibility/rc/current-main-density-source-ae9-successor-v1.json',last='scripts/current_sass_spinner_snack_admission.py',saved=readFileSync(join(root,packet));let mode='',holder;
const read=path=>{const value=readFileSync(join(root,path));if(mode==='forged'&&path===packet)return Buffer.concat([value,Buffer.from(' ')]);if(mode==='nested'&&path===packet){try{holder.assertCurrent()}catch{}}if(mode==='late'&&path===last){mode='';writeFileSync(join(root,packet),Buffer.concat([saved,Buffer.from(' ')]));}return value;};
holder=selectProgramTransitions({root,line:'main',read});assert.equal(holder.refs.size,4);
mode='forged';assert.throws(()=>holder.assertCurrent());mode='';holder.assertCurrent();
mode='nested';assert.throws(()=>holder.assertCurrent());mode='';holder.assertCurrent();
try{mode='late';assert.throws(()=>holder.assertCurrent());}finally{mode='';writeFileSync(join(root,packet),saved);}holder.assertCurrent();
try{writeFileSync(join(root,packet),Buffer.concat([saved,Buffer.from(' ')]));assert.throws(()=>selectProgramTransitions({root,line:'main',read}));}finally{writeFileSync(join(root,packet),saved);}holder.assertCurrent();
console.log('density source JS forged, reentry, late and recovery pass');
