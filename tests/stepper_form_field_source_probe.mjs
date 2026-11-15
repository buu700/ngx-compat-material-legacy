/**
 * @license
 * Copyright Google LLC All Rights Reserved.
 * Copyright (c) 2026 Ryan Lester.
 * Use of this source code is governed by the MIT license in LICENSE.
 */
/** Source-only continuation controls in a copied fixture; no CSS admission. */
import assert from 'node:assert/strict';
import {lstatSync,readFileSync,realpathSync,writeFileSync} from 'node:fs';
import {basename,join,resolve} from 'node:path';
import {createStepperCurrentPeerSourceV4} from '../scripts/stepper-current-peer-source-v6.mjs';
const root=resolve(process.argv[2]);
assert.ok(basename(root).startsWith('ngx-stepper-form-field-source-'));
assert.notEqual(realpathSync(root),realpathSync(process.cwd()));
assert.ok(lstatSync(root).isDirectory()&&!lstatSync(root).isSymbolicLink());
const path='projects/ngx-material-legacy/styles/bridges/_form-field-state-overrides.scss';
let active=false, source;
const reader=p=>{const raw=readFileSync(join(root,p));if(active&&p===path)return Buffer.concat([raw,Buffer.from(' foreign')]);return raw;};
source=createStepperCurrentPeerSourceV4({root,read:reader});source.assertCurrent();active=true;assert.throws(()=>source.assertCurrent());active=false;source.assertCurrent();
const target=join(root,path),original=readFileSync(target);
try {writeFileSync(target,Buffer.concat([original,Buffer.from(' foreign')]));assert.throws(()=>source.assertCurrent());}
finally {writeFileSync(target,original);}
source.assertCurrent();
let nested=false, holder;
const reentrant=p=>{const raw=readFileSync(join(root,p));if(nested&&p===path){try{holder.assertCurrent();}catch{}}return raw;};
holder=createStepperCurrentPeerSourceV4({root,read:reentrant});nested=true;assert.throws(()=>holder.assertCurrent());nested=false;holder.assertCurrent();
console.log('stepper form-field JS controls pass');
