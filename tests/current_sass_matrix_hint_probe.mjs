/** @license Copyright Google LLC All Rights Reserved.
 * Copyright (c) 2026 Ryan Lester. Use of this source code is governed by the MIT license in LICENSE. */
import assert from 'node:assert/strict';
import {readFileSync,writeFileSync} from 'node:fs';
import {resolve} from 'node:path';
import {execFileSync} from 'node:child_process';
import {currentSassToolReferenceSubject as make} from '../scripts/current-sass-tool-references.mjs';
const root=resolve(process.argv[2]),packet='compatibility/rc/current-tool-matrix-hint-id-owner-successor-v1.json';
const refs=[packet,'scripts/current-tool-matrix-source.mjs','scripts/current_tool_matrix_source.py'];
const read=p=>readFileSync(resolve(root,p)),subject=make({root});subject.assertCurrent();
for(const path of refs){const f=resolve(root,path),saved=readFileSync(f);try{writeFileSync(f,Buffer.concat([saved,Buffer.from('\n')]));assert.throws(()=>make({root}));assert.throws(()=>subject.assertCurrent());}finally{writeFileSync(f,saved)}subject.assertCurrent();}
const path='scripts/current-tool-matrix-source.mjs',old=execFileSync('git',['--no-replace-objects','show','7e9ecb0a8fe31d44c1f37b8a509fc58c6ab705ad:'+path],{cwd:root});
assert.throws(()=>make({root,read:p=>p===path?old:read(p)}));
subject.assertCurrent();console.log(JSON.stringify({result:'pass',cold_late_physical:refs.length,historical_owner_callback_rejected:true}));
