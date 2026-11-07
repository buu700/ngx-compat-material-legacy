/**
 * @license
 * Copyright Google LLC All Rights Reserved.
 * Copyright (c) 2026 Ryan Lester.
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.io/license
 */
import assert from 'node:assert/strict';
import {createRequire} from 'node:module';
import {cpSync,readFileSync,writeFileSync,mkdtempSync,mkdirSync,rmSync,realpathSync} from 'node:fs';
import {dirname,join,relative,sep} from 'node:path';
import {captureToolchain,packageDigest} from '../scripts/overlay-inherited-toolchain.mjs';
const root=process.cwd(),req=createRequire(join(root,'package.json')),approved=JSON.parse(readFileSync('compatibility/rc/overlay-inherited-toolchain-main.json','utf8'));
assert.deepEqual(captureToolchain(root),approved.identity);
const moduleRoot=realpathSync('node_modules'),compiler=dirname(realpathSync(req.resolve('@angular/compiler-cli/package.json'))),key=relative(moduleRoot,compiler).split(sep).join('/');
const expected=approved.identity.packages[key];assert.ok(expected);assert.deepEqual(packageDigest(compiler),{files:expected.files,sha256:expected.sha256});
mkdirSync('artifacts',{recursive:true});const temp=mkdtempSync(join(root,'artifacts/overlay-compiler-forgery-'));
try{
 const copy=join(temp,'compiler-cli');cpSync(compiler,copy,{recursive:true,filter:source=>source!==join(compiler,'node_modules')});assert.deepEqual(packageDigest(copy),{files:expected.files,sha256:expected.sha256});
 const body=join(copy,'bundles/src/bin/ngc.js'),original=readFileSync(body);writeFileSync(body,Buffer.concat([original,Buffer.from('\n// forged compiler body\n')]));assert.notDeepEqual(packageDigest(copy),{files:expected.files,sha256:expected.sha256});
}finally{rmSync(temp,{recursive:true,force:true})}
console.log('approved compiler/linker/bundler closure matched; copied compiler body forgery rejected');
