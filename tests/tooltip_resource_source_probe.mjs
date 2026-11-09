/**
 * @license
 * Copyright Google LLC All Rights Reserved.
 * Copyright (c) 2026 Ryan Lester.
 * Use of this source code is governed by the MIT license in LICENSE.
 */
import assert from 'node:assert/strict';
import {execFileSync} from 'node:child_process';
import {readFileSync, writeFileSync} from 'node:fs';
import {join} from 'node:path';
import {createCurrentSassSource} from '../scripts/current-sass-source.mjs';

const root = process.argv[2];
assert.ok(root.includes('ngx-current-sass-source-test-'));
const read = path => readFileSync(join(root, path));
const packetPath = 'compatibility/rc/current-main-tooltip-resource-source-v1.json';
const packet = JSON.parse(read(packetPath));
const context = createCurrentSassSource({root});
assert.equal(context.transitions.length, 7);
assert.deepEqual(context.resource_transitions.map(row => row.path), [packet.before.path,
  'projects/ngx-material-legacy/legacy-form-field/form-field.html',
  'projects/ngx-material-legacy/legacy-form-field/form-field.scss', 'projects/ngx-material-legacy/legacy-menu/menu.scss']);
assert.deepEqual(context.resource_transitions[0], {path: packet.before.path, before: packet.before, current: packet.after});
const resources = structuredClone(context.resource_transitions);
for (const row of resources) for (const ref of [row.before, row.current]) {
  assert.deepEqual(context.qualify(ref), row.current);
  const {bytes, ...noLength} = ref;
  const {bytes: currentBytes, ...currentNoLength} = row.current;
  assert.deepEqual(context.qualify(noLength), currentNoLength);
  assert.throws(() => context.qualify({...ref, bytes: bytes + 1}));
}
assert.throws(() => context.qualify({...packet.before, sha256: '0'.repeat(64)}));
let getters = 0;
assert.throws(() => context.qualify({get path() {getters++; return packet.before.path;}, sha256: packet.before.sha256}));
assert.equal(getters, 0);
assert.equal(context.descriptor.source_modules.some(row => row.path === packet.before.path), false);
for (const rows of Object.values(context.source_sets)) assert.equal(rows.some(row =>
  row.root === 0 && 'projects/ngx-material-legacy/' + row.path === packet.before.path), false);

const original = execFileSync('git', ['--no-replace-objects', '-c', 'gc.auto=0', '-c', 'maintenance.auto=0',
  'show', packet.parent + ':' + packet.before.path], {cwd: root});
assert.equal(context.assertHistoricalSource(packet.before.path, original).current_sha256, packet.after.sha256);
assert.throws(() => context.assertHistoricalSource(packet.before.path, Buffer.concat([original, Buffer.from(' ')])));
assert.throws(() => createCurrentSassSource({root, read: path => path === packet.before.path ? original : read(path)}));
const targets = [...resources.map(row => row.path), packetPath, ...packet.reviews.map(row => row.path)];
for (const path of targets) {
  const file = join(root, path), saved = read(path);
  try {
    writeFileSync(file, Buffer.concat([saved, Buffer.from(' ')]));
    assert.throws(() => context.assertCurrent());
    assert.throws(() => createCurrentSassSource({root}));
  } finally {writeFileSync(file, saved);}
  context.assertCurrent();
}
// A known historical hash is valid comparison metadata, never current bytes.
const file = join(root, packet.before.path), saved = read(packet.before.path);
try {
  writeFileSync(file, original);
  assert.throws(() => createCurrentSassSource({root}));
} finally {writeFileSync(file, saved);}
let armed = false;
const live = createCurrentSassSource({root, read: path => {
  const bytes = read(path);
  if (armed) {armed = false; writeFileSync(file, Buffer.concat([saved, Buffer.from(' ')]));}
  return bytes;
}});
try {armed = true; assert.throws(() => live.qualify(packet.before));}
finally {armed = false; writeFileSync(file, saved);}
live.assertCurrent();
const exposed = context.resource_transitions[0];
exposed.current.sha256 = '0'.repeat(64);
assert.deepEqual(context.qualify(packet.before), packet.after);
console.log(JSON.stringify({result: 'pass', bound: context.bound.length, transitions: context.transitions,
  resource_transitions: resources,
  source_sets: context.source_sets, descriptor: context.descriptor, physical_mutations_rejected: targets.length,
  cold_historical_bytes_rejected: true, late_callback_mutation_rejected: true, accessor_calls: getters,
  css_or_artifact_admission_granted: false}));
