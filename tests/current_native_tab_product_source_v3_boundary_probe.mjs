/**
 * @license
 * Copyright Google LLC All Rights Reserved.
 * Copyright (c) 2026 Ryan Lester.
 * Use of this source code is governed by the MIT license in LICENSE.
 */
import assert from 'node:assert/strict';
import {execFileSync} from 'node:child_process';
import {randomUUID} from 'node:crypto';
import {mkdirSync, mkdtempSync, readFileSync, realpathSync, renameSync, rmSync, symlinkSync, unlinkSync, writeFileSync} from 'node:fs';
import {tmpdir} from 'node:os';
import {join, sep} from 'node:path';
import {fileURLToPath} from 'node:url';
import {createCurrentNativeTabProductSource} from '../scripts/current-native-tab-product-source.mjs';

const root = fileURLToPath(new URL('../', import.meta.url));
const clone = mkdtempSync(join(tmpdir(), 't02-source-boundary-'));
const radio = 'projects/ngx-material-legacy/legacy-radio/internal/radio-base.ts';
const prior = 'compatibility/rc/remaining-native-admission-tab-lifecycle-repair-prior.json.gz';
const last = 'scripts/c03-t02-current-native-tab-product-source-packet-v3.json';
const child = path => {
  const target = realpathSync(join(clone, path));
  assert.ok(target.startsWith(clone + sep), 'test target escaped clone');
  return target;
};
const isolatedWrite = (target, bytes) => {
  const temporary = target + '.t02-' + randomUUID();
  writeFileSync(temporary, bytes);
  renameSync(temporary, target);
};
const changed = bytes => Buffer.concat([bytes, Buffer.from('\n')]);

try {
  // Hardlinks make a full source tree cheap to copy. All mutations replace an
  // inode inside the clone, so the original candidate is never written.
  execFileSync('cp', ['-a', '-l', root + '/.', clone]);
  const localDependencies = join(clone, 'projects/ngx-material-legacy/node_modules');
  mkdirSync(join(localDependencies, '@angular'), {recursive: true});
  for (const name of ['cdk', 'material']) {
    const localPeer = join(localDependencies, '@angular', name);
    try {
      symlinkSync('../../../../node_modules/@angular/' + name, localPeer);
    } catch (error) {
      if (error.code !== 'EEXIST') throw error;
      assert.equal(realpathSync(localPeer), realpathSync(join(clone, 'node_modules/@angular', name)),
        'existing fixture peer must resolve to the pinned clone peer');
    }
  }
  const source = createCurrentNativeTabProductSource({root: clone, line: 'main'});
  source.assertCurrent();
  console.log('PASS exact ignored project dependency tree excluded with matching root peers');

  const unknown = join(clone, 'projects/ngx-material-legacy/unexpected-t02-probe.ts');
  try {
    writeFileSync(unknown, 'unexpected product member');
    assert.throws(() => source.assertCurrent(), /unexpected physical product member|late extra\/removed product member/);
  } finally { unlinkSync(unknown); }
  const linkedProduct = join(clone, 'projects/ngx-material-legacy/legacy-radio/unexpected-t02-probe.ts');
  try {
    symlinkSync(join(clone, radio), linkedProduct);
    assert.throws(() => source.assertCurrent(), /product symlink/);
  } finally { unlinkSync(linkedProduct); }
  const localCdk = join(localDependencies, '@angular/cdk');
  try {
    unlinkSync(localCdk);
    symlinkSync('../../../../node_modules/@angular/material', localCdk);
    assert.throws(() => source.assertCurrent(), /project-local peer resolution differs from pinned root cdk/);
  } finally { unlinkSync(localCdk); symlinkSync('../../../../node_modules/@angular/cdk', localCdk); }
  source.assertCurrent();
  console.log('PASS unexpected product file, product symlink, and shadowed local peer rejected');

  const paths = source.authorityInputs.map(row => row.path);
  for (const path of [prior, 'compatibility/rc/remaining-native-admission-source-inputs.json', 'compatibility/rc/remaining-native-admission-tab-cyph-style-sanity.json', 'compatibility/rc/tab-adapter-product-inventory-inputs.json', 'compatibility/rc/autocomplete-selection-native-contract-proposal.json', 'scripts/current-native-tab-product-source.mjs', last, 'node_modules/@angular/cdk/package.json']) {
    assert.ok(paths.includes(path), 'missing retained authority ' + path);
  }
  assert.equal(paths.length, 44);
  for (const path of paths) {
    const target = child(path), original = readFileSync(target);
    try {
      isolatedWrite(target, changed(original));
      assert.throws(() => source.assertCurrent(), /changed|source|helper|packet|peer/i, 'late authority mutation accepted: ' + path);
    } finally {
      isolatedWrite(target, original);
    }
    assert.deepEqual(readFileSync(target), original);
  }
  source.assertCurrent();
  console.log('PASS all 44 retained authority references reject late mutation');

  const radioTarget = child(radio), radioOriginal = readFileSync(radioTarget);
  try {
    isolatedWrite(radioTarget, changed(radioOriginal));
    assert.throws(() => source.assertCurrent(), /changed product|changed retained source/);
  } finally { isolatedWrite(radioTarget, radioOriginal); }
  source.assertCurrent();
  console.log('PASS late product mutation rejected');

  const priorTarget = child(prior), priorOriginal = readFileSync(priorTarget);
  try {
    unlinkSync(priorTarget);
    symlinkSync(join(root, prior), priorTarget);
    assert.throws(() => source.assertCurrent(), /symlink in source descendant/);
  } finally { isolatedWrite(priorTarget, priorOriginal); }
  source.assertCurrent();
  console.log('PASS retained authority symlink rejected');

  let armed = false, mutation = null;
  const read = path => {
    if (armed && path === last) {
      armed = false;
      const target = child(mutation), original = readFileSync(target);
      isolatedWrite(target, changed(original));
    }
    return readFileSync(join(clone, path));
  };
  const late = createCurrentNativeTabProductSource({root: clone, line: 'main', read});
  for (mutation of [radio, prior]) {
    const target = child(mutation), original = readFileSync(target);
    try {
      armed = true;
      assert.throws(() => late.assertCurrent(), /changed product|changed retained source/);
      assert.equal(armed, false, 'last callback was not reached');
    } finally { isolatedWrite(target, original); armed = false; }
    late.assertCurrent();
  }
  console.log('PASS final physical sweep rejects last callback mutations of earlier product and authority');

  for (const path of [prior, 'compatibility/rc/remaining-native-admission-tab-cyph-style-sanity.json']) {
    const target = child(path), original = readFileSync(target);
    try {
      isolatedWrite(target, changed(original));
      assert.throws(() => createCurrentNativeTabProductSource({root: clone, line: 'main'}));
    } finally { isolatedWrite(target, original); }
  }
  source.assertCurrent();
  console.log('PASS cold prior and style authority mutations rejected');
} finally {
  rmSync(clone, {recursive: true, force: true});
}
