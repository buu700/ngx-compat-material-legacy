/**
 * @license
 * Copyright Google LLC All Rights Reserved.
 * Copyright (c) 2026 Ryan Lester.
 * Use of this source code is governed by the MIT license in LICENSE.
 */
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {join} from 'node:path';
import {fileURLToPath} from 'node:url';
import {createCurrentNativeTabProductSource} from '../scripts/current-native-tab-product-source.mjs';

const root = fileURLToPath(new URL('../', import.meta.url));
const radioPath = 'projects/ngx-material-legacy/legacy-radio/internal/radio-base.ts';
const radioSha = '4309745c130643044a35bf664da6e58f59b070ddcb69787245071d0564d24bef';
const selectSha = '1f58566ca39877ed180af58172aa040851a1f992f039f16ec9de7ea10809d929';
const source = createCurrentNativeTabProductSource({root, line: 'main'});
assert.equal(source.bound.length, 1143);
assert.equal(source.changedProductRefs.length, 55);
assert.deepEqual(source.changedProductRefs.filter(row => row.authority === 'reviewed-radio-lifecycle-v3').map(row => [row.path, row.current_sha256]), [[radioPath, radioSha]]);
assert.deepEqual(source.currentOwnerSources.map(row => row.sha256), [selectSha]);
assert.deepEqual(source.inheritedOwnerSources.find(row => row.path === 'scripts/select-dialog-finite-source-successor.mjs')?.sha256, selectSha);
assert.equal(source.radioEvidence?.sha256, 'bb9a57772c4f064f1758443518114eeef053cf9c29f735614f15456b08760605');
assert.equal(source.formMotionEvidence?.sha256, 'ff566c14bddae70dc836b3f38ada45675d4e202216add2644c57068202dae793');
assert.equal(source.changedProductRefs.filter(row => row.authority === 'reviewed-form-motion-v4').length, 1);
assert.equal(source.changedProductRefs.filter(row => row.authority === 'reviewed-timing-comment-v4').length, 2);
assert.equal(source.resourceChanges.length, 15);
assert.equal(source.sourceOnly, true);
assert.equal(source.actualNativePackedOrFloorQualified, false);
assert.equal(source.g11Claim, 'not-passed');
const radio = source.changedProductRefs.find(row => row.path === radioPath);
assert.equal(source.qualify({path: radioPath, sha256: radio.before_sha256})?.sha256, radioSha);
assert.throws(() => source.qualify({path: radioPath, sha256: '0'.repeat(64)}), /unknown product source identity/);
source.assertCurrent();
console.log('PASS exact main radio, select v5 owner, 1143-path physical inventory');

let proxyTrap = 0;
const hostile = new Proxy({path: radioPath, sha256: radio.before_sha256}, {
  ownKeys() { proxyTrap++; throw new Error('proxy trap invoked'); },
  get() { proxyTrap++; throw new Error('proxy getter invoked'); },
});
assert.throws(() => source.qualify(hostile), /proxy/);
assert.equal(proxyTrap, 0);
let getterCalls = 0;
const getter = () => { getterCalls++; throw new Error('getter invoked'); };
for (const key of ['path', 'sha256', 'bytes']) {
  const item = {path: radioPath, sha256: radio.before_sha256};
  Object.defineProperty(item, key, {get: getter});
  assert.throws(() => source.qualify(item), /data properties/);
}
const unknownGetter = {path: 'projects/ngx-material-legacy/unknown.ts'};
Object.defineProperty(unknownGetter, 'extra', {get: getter});
assert.throws(() => source.qualify(unknownGetter), /data properties/);
assert.equal(getterCalls, 0);
assert.throws(() => source.qualify({path: radioPath, sha256: radio.before_sha256, bytes: undefined}), /nonnegative integer/);
assert.throws(() => source.qualify({path: radioPath, sha256: radio.before_sha256, extra: 1}), /unexpected product reference fields/);
assert.throws(() => source.qualify({path: radioPath, sha256: 42}), /digest/);
assert.equal(source.qualify({path: 'projects/ngx-material-legacy/unknown.ts', sha256: radio.before_sha256}), null);
console.log('PASS proxy, accessor, and malformed product references rejected without invocation');

let nested, armed = false, attempted = false;
const read = path => {
  if (armed && !attempted) {
    attempted = true;
    try { nested.assertCurrent(); } catch { /* Child callback deliberately catches the nested rejection. */ }
  }
  return readFileSync(join(root, path));
};
nested = createCurrentNativeTabProductSource({root, line: 'main', read});
armed = true;
assert.throws(() => nested.assertCurrent(), /nested callback source violation/);
assert.equal(attempted, true);
assert.throws(() => nested.assertCurrent(), /nested callback source violation/);
console.log('PASS caught nested callback remains rejected');

let nestedQualifier, qualifyArmed = false, qualifyAttempted = false;
const qualifyRead = path => {
  if (qualifyArmed && !qualifyAttempted) {
    qualifyAttempted = true;
    try { nestedQualifier.qualify({path: 'projects/ngx-material-legacy/unknown.ts'}); } catch { /* The outer walk must retain the violation. */ }
  }
  return readFileSync(join(root, path));
};
nestedQualifier = createCurrentNativeTabProductSource({root, line: 'main', read: qualifyRead});
qualifyArmed = true;
assert.throws(() => nestedQualifier.assertCurrent(), /nested callback source violation/);
assert.equal(qualifyAttempted, true);
assert.throws(() => nestedQualifier.qualify({path: 'projects/ngx-material-legacy/unknown.ts'}), /nested callback source violation/);
console.log('PASS caught nested unknown qualification remains rejected');

assert.throws(() => createCurrentNativeTabProductSource({root, line: 'main', read: path => path === radioPath ? Buffer.from('forged') : readFileSync(join(root, path))}), /nonphysical supplied source/);
console.log('PASS forged radio callback rejected');
