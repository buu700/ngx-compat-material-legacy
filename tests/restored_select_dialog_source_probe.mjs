/**
 * @license
 * Copyright Google LLC All Rights Reserved.
 * Copyright (c) 2026 Ryan Lester.
 * Use of this source code is governed by the MIT license in LICENSE.
 */
import assert from 'node:assert/strict';
import {readFileSync, writeFileSync, unlinkSync, symlinkSync} from 'node:fs';
import {resolve} from 'node:path';
import {execFileSync} from 'node:child_process';
import {selectDialogFiniteSuccessor as make} from '../scripts/select-dialog-finite-source-successor.mjs';
const root = resolve(process.argv[2]), line = process.argv[3];
const read = path => readFileSync(resolve(root, path));
const build = (reader = read) => make({root, line, read: reader});
const packetPath = 'compatibility/rc/parent-restored-select-dialog-test-source-v5.json';
const repairs = JSON.parse(read(packetPath)).branches[line].repairs;
const owner = build();
assert.equal(owner.bound.length, 18);
for (const row of repairs) {
  for (const source of [row.before, row.after]) {
    const incoming = {path: row.path, sha256: source.sha256, bytes: source.bytes};
    assert.deepEqual(owner.qualify(incoming), {path: row.path, sha256: row.after.sha256, bytes: row.after.bytes});
  }
  assert.throws(() => owner.qualify({path: row.path, sha256: '0'.repeat(64)}));
  assert.throws(() => owner.qualify({path: row.path, sha256: row.after.sha256, bytes: row.after.bytes + 1}));
}
assert.equal(owner.qualify({path: 'unowned', sha256: '0'.repeat(64)}), null);
assert.throws(() => make({root, line: line === 'main' ? '21.x' : 'main', read}));
for (const row of owner.bound) {
  const path = resolve(root, row.path), original = read(row.path);
  try {
    writeFileSync(path, Buffer.concat([original, Buffer.from('\nchanged\n')]));
    assert.throws(() => owner.assertCurrent());
    assert.throws(() => owner.qualify({path: repairs[0].path, sha256: repairs[0].after.sha256}));
  } finally { writeFileSync(path, original); }
  assert.throws(() => build(p => p === row.path ? Buffer.from('wrong') : read(p)));
  let armed = false;
  const subject = build(p => armed && p === row.path ? Buffer.from('wrong') : read(p));
  armed = true;
  assert.throws(() => subject.assertCurrent());
}
for (const operation of ['assertCurrent', 'assertPhysical', 'qualify', 'historicalReference']) {
  let armed = false, attempted = false, subject;
  subject = build(path => {
    if (armed && !attempted) {
      attempted = true;
      try {
        if (['qualify', 'historicalReference'].includes(operation)) subject[operation]({path: 'unowned', sha256: '0'.repeat(64)});
        else subject[operation]();
      } catch {}
    }
    return read(path);
  });
  armed = true;
  assert.throws(() => subject.assertCurrent(), /reentrant/);
  assert.equal(attempted, true);
  armed = false;
  subject.assertCurrent();
}
const victim = repairs[0].path, original = read(victim);
let armed = false;
const subject = build(path => {
  const raw = read(path);
  if (armed && path === owner.bound.at(-1).path) writeFileSync(resolve(root, victim), Buffer.concat([original, Buffer.from('\nchanged\n')]));
  return raw;
});
try {
  armed = true;
  assert.throws(() => subject.assertCurrent());
} finally { armed = false; writeFileSync(resolve(root, victim), original); }
// Caller-controlled getters/proxies run after the first sweep; the final sweep
// and nested-attempt latch must cover the entire selection transaction.
for (const owned of [true, false]) {
  try {
    const incoming = {path: owned ? victim : 'unowned', sha256: repairs[0].after.sha256};
    const proxy = new Proxy(incoming, {get(target, key) {
      if (key === 'path') writeFileSync(resolve(root, victim), Buffer.concat([original, Buffer.from('changed')]));
      return target[key];
    }});
    assert.throws(() => owner.qualify(proxy));
  } finally { writeFileSync(resolve(root, victim), original); }
}
for (const owned of [true, false]) {
  let evaluated = false;
  const incoming = {sha256: repairs[0].after.sha256};
  Object.defineProperty(incoming, 'path', {enumerable: true, get() { evaluated = true; return owned ? victim : 'unowned'; }});
  assert.throws(() => owner.qualify(incoming), /data/);
  assert.equal(evaluated, false);
}
for (const operation of ['qualify', 'historicalReference']) {
  const incoming = {path: victim, sha256: repairs[0].after.sha256};
  let attempted = false;
  const proxy = new Proxy(incoming, {get(target, key) {
    if (key === 'path' && !attempted) {
      attempted = true;
      try { owner[operation]({path: 'unowned', sha256: '0'.repeat(64)}); } catch {}
    }
    return target[key];
  }});
  assert.throws(() => owner[operation](proxy), /proxy/);
  assert.equal(attempted, false);
}
const other = resolve(root, 'linked-packet-copy.json'), path = resolve(root, packetPath), packetRaw = read(packetPath);
try {
  writeFileSync(other, packetRaw); unlinkSync(path); symlinkSync(other, path);
  assert.throws(() => build());
} finally { unlinkSync(path); writeFileSync(path, packetRaw); unlinkSync(other); }
// The historical v4 shape remains independently usable without the v5 packet.
const restoredBytes = new Map(repairs.map(row => [row.path, read(row.path)]));
try {
  for (const row of repairs) writeFileSync(resolve(root, row.path), execFileSync('git', ['--no-replace-objects', 'cat-file', 'blob', row.before.git_blob], {cwd: root}));
  const old = build();
  assert.equal(old.bound.some(row => row.path === packetPath), false);
  writeFileSync(resolve(root, repairs[0].path), restoredBytes.get(repairs[0].path));
  assert.throws(() => build(), undefined, 'mixed v4/restored epoch');
} finally {
  for (const [path, raw] of restoredBytes) writeFileSync(resolve(root, path), raw);
}
owner.assertCurrent();
console.log('PASS restored select/dialog: exact transitions, every bound physical/callback input, swallowed reentrancy, final sweep, links');
