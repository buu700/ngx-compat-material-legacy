/**
 * @license
 * Copyright Google LLC All Rights Reserved.
 * Copyright (c) 2026 Ryan Lester.
 * Use of this source code is governed by the MIT license in LICENSE.
 */
import assert from 'node:assert/strict';
import {readFileSync,writeFileSync} from 'node:fs';
import {join} from 'node:path';
import {stepperProgramTransitions as oldCreate} from '../scripts/stepper-program-transition-source.mjs';
import {selectProgramTransitions as create} from '../scripts/select-program-transition-source.mjs';
const root=process.argv[2],read=path=>readFileSync(join(root,path));assert.throws(()=>oldCreate({root,line:'main',read}));const s=create({root,line:'main',read});assert.equal(s.refs.size,4);
const paths=['scripts/current-sass-source.mjs','scripts/current_sass_spinner_snack_admission.py','compatibility/rc/current-sass-select-spinner-executables-v2.json','scripts/select-program-transition-source.mjs'];
for(const path of paths){
 const file=join(root,path),saved=read(path);
 try{writeFileSync(file,Buffer.concat([saved,Buffer.from(' foreign')]));assert.throws(()=>create({root,line:'main',read}));assert.throws(()=>s.assertCurrent());}finally{writeFileSync(file,saved);}
 let armed=false;const last=[...s.refs.keys()].at(-1),live=create({root,line:'main',read:p=>{const raw=read(p);if(armed&&p===last){armed=false;writeFileSync(file,Buffer.concat([saved,Buffer.from(' late')]));}return raw;}});
 try{armed=true;assert.throws(()=>live.assertCurrent());}finally{writeFileSync(file,saved);}live.assertCurrent();
}
console.log(JSON.stringify({refs:Object.fromEntries(s.refs),negative_paths:paths.length}));
