/**
 * @license
 * Copyright Google LLC All Rights Reserved.
 * Copyright (c) 2026 Ryan Lester.
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.io/license
 */
/** Diagnostic against an independently installed original Angular/Material 16 fixture. */
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {readFileSync} from 'node:fs';
import {resolve,join} from 'node:path';
import {pathToFileURL} from 'node:url';
const args=process.argv.slice(2);assert.equal(args.length,2);assert.equal(args[0],'--root');const root=resolve(args[1]),base=join(root,'node_modules/@angular'),pkg=JSON.parse(readFileSync(join(base,'material/package.json')));assert.equal(pkg.version,'16.2.14');const core=join(base,'material/fesm2022/core.mjs'),hash=createHash('sha256').update(readFileSync(core)).digest('hex');assert.equal(hash,'38b761eb8e9b43297942f6e1412469437bc3ee0291342a766b001f715061d175');await import(pathToFileURL(join(base,'compiler/fesm2022/compiler.mjs')).href);const {MatPseudoCheckbox:C}=await import(pathToFileURL(core).href),value=new C();assert.equal(value.disabled,false);assert.equal(C.ɵcmp.inputs.disabled,'disabled');const observed=[false,true,'false',''].map(x=>{value.disabled=x;return value.disabled});assert.deepEqual(observed,[false,true,'false','']);console.log(JSON.stringify({node:process.version,package_version:pkg.version,bundle_sha256:hash,initial:false,metadata:C.ɵcmp.inputs.disabled,assigned_and_observed:observed}));
