/**
 * @license
 * Copyright Google LLC All Rights Reserved.
 * Copyright (c) 2026 Ryan Lester.
 * Use of this source code is governed by the MIT license in LICENSE.
 */
import assert from 'node:assert/strict';
import {readFileSync,writeFileSync} from 'node:fs';
import {join} from 'node:path';
import {createCurrentSassSource} from '../scripts/current-sass-source.mjs';
const root=process.argv[2],s=createCurrentSassSource({root}),packet=JSON.parse(readFileSync(join(root,'compatibility/rc/current-sass-stepper-current-peer-source-inputs-v4.json')));
assert.equal(s.qualify(packet.transition.before).sha256,packet.transition.after.sha256);
const focus=JSON.parse(readFileSync(join(root,'compatibility/rc/current-main-strong-focus-source-v1.json')));
assert.equal(focus.source_set_before,packet.source_set.v4_current_sha256);assert.equal(s.source_set_successors[0].current_sha256,focus.source_set_after);
const other=s.transitions.find(row=>row.path!==packet.transition.after.path),file=join(root,other.path),saved=readFileSync(file);
try{writeFileSync(file,Buffer.concat([saved,Buffer.from(' foreign')]));assert.throws(()=>s.qualify(packet.transition.before));}finally{writeFileSync(file,saved);}
s.assertCurrent();console.log(JSON.stringify({transitions:s.transitions,sets:s.source_sets,successors:s.source_set_successors}));
