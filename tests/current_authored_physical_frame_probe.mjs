/**
 * @license
 * Copyright Google LLC All Rights Reserved.
 * Copyright (c) 2026 Ryan Lester.
 * Use of this source code is governed by the MIT license in LICENSE.
 */
/** Mutate a second member during a callback in isolated physical roots. */
import assert from 'node:assert/strict';
import {execFileSync} from 'node:child_process';
import {mkdtempSync,mkdirSync,readFileSync,writeFileSync,rmSync} from 'node:fs';
import {join,resolve,dirname} from 'node:path';
import {tmpdir} from 'node:os';
import {fileURLToPath} from 'node:url';
import {qualifyCurrentMenuRetirementReceipt} from '../scripts/current-menu-retirement-receipt.mjs';
import {qualifyFormFieldRetiredUse} from '../scripts/form-field-retired-use.mjs';
import {scanCurrentAuthoredUses} from '../scripts/authored-current-use-inventory.mjs';
const root=resolve(dirname(fileURLToPath(import.meta.url)),'..'),current=scanCurrentAuthoredUses({root}),fixture=mkdtempSync(join(tmpdir(),'authored-frame-'));
const menu='projects/ngx-material-legacy/legacy-menu/internal/menu-panel.ts',menuProof='compatibility/rc/menu-panel-content-boundary-main.json',field='projects/ngx-material-legacy/legacy-form-field/form-field.ts',fieldProof='compatibility/f10/authored-use-reviews/form-field-render-subclass-current-v2.json';
try{
 const gitdir=execFileSync('git',['rev-parse','--absolute-git-dir'],{cwd:root,encoding:'utf8'}).trim();writeFileSync(join(fixture,'.git'),'gitdir: '+gitdir+'\n');
 for(const path of [menu,menuProof,field,fieldProof]){mkdirSync(dirname(join(fixture,path)),{recursive:true});writeFileSync(join(fixture,path),readFileSync(join(root,path)));}
 let menuCalls=0;const menuRead=p=>{const bytes=readFileSync(join(fixture,p));if(p===menu&&++menuCalls===2)writeFileSync(join(fixture,menuProof),'tampered');return bytes;};
 assert.throws(()=>qualifyCurrentMenuRetirementReceipt({root:fixture,current,readMember:menuRead}),/changed menu receipt frame/);assert.equal(menuCalls,2);
 let fieldCalls=0;const fieldRead=p=>{const bytes=readFileSync(join(fixture,p));if(p===fieldProof&&++fieldCalls===2)writeFileSync(join(fixture,field),'tampered');return bytes;};
 assert.throws(()=>qualifyFormFieldRetiredUse({root:fixture,current,readMember:fieldRead}),/changed form-field source frame/);assert.equal(fieldCalls,2);
 console.log('cross-member callback mutations rejected');
}finally{rmSync(fixture,{recursive:true,force:true});}
