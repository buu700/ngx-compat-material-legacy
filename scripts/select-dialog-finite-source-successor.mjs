/**
 * @license
 * Copyright Google LLC All Rights Reserved.
 * Copyright (c) 2026 Ryan Lester.
 * Use of this source code is governed by the MIT license in LICENSE.
 */
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {execFileSync} from 'node:child_process';
import {readFileSync} from 'node:fs';
import {fileURLToPath} from 'node:url';
import {types} from 'node:util';
import {readEvidenceMember} from './upstream-packed-run-evidence.mjs';

const SELF = 'scripts/select-dialog-finite-source-successor.mjs';
const PACKETS = [
  ['compatibility/rc/parent-select-dialog-finite-source-v1.json', 'fe029afba0dbf7b1d9ecf51661cdc98240b6b0c2ee70a352dfdf99fd48ce27a6', 17132],
  ['compatibility/rc/parent-select-dialog-menu-finite-source-v2.json', '67f279d9631a48a4cf69ef41c3ae4c3ab3446bca457d023b7e22e323506c6d88', 34319],
  ['compatibility/rc/parent-select-dialog-menu-snack-finite-source-v3.json', 'bb2be03706f10cc22029facdb916d3527bf40cef120f0746d4ddd8794371159d', 49370],
  ['compatibility/rc/parent-select-dialog-menu-snack-d61-menu-finite-source-v4.json', 'f8f9423c7dff2ffd5ee72fa812f137bb5db8e59a4b88b7c1868086e3bdb28777', 112277],
];
const RESTORED = ['compatibility/rc/parent-restored-select-dialog-test-source-v5.json', 'da132dcf22e68076a4378f5ed2bc3b67cfb4705764107530b40cfb6734b79186', 17761];
const TESTS = ['projects/ngx-material-legacy/legacy-select/select.spec.ts', 'projects/ngx-material-legacy/legacy-dialog/dialog.spec.ts'];
const hash = bytes => createHash('sha256').update(bytes).digest('hex');
const blob = bytes => createHash('sha1').update('blob ' + bytes.length + '\0').update(bytes).digest('hex');
const eq = Buffer.prototype.equals, apply = Reflect.apply;
const same = (a, b) => Buffer.isBuffer(b) && apply(eq, a, [b]);
const ref = (path, bytes) => ({path, sha256: hash(bytes), bytes: bytes.length});
const image = readFileSync(fileURLToPath(import.meta.url));
export const selectDialogFiniteLoadedImage = Object.freeze(ref(SELF, image));

function historical(root, commit, path) {
  assert.match(commit, /^[0-9a-f]{40}$/);
  const env = Object.fromEntries(Object.entries(process.env).filter(([key]) => !key.startsWith('GIT_')));
  Object.assign(env, {GIT_NO_LAZY_FETCH: '1', GIT_NO_REPLACE_OBJECTS: '1', GIT_TERMINAL_PROMPT: '0'});
  return execFileSync('git', ['--no-replace-objects', '-c', 'gc.auto=0', '-c', 'maintenance.auto=0', 'show', commit + ':' + path], {cwd: root, env, maxBuffer: 2 * 1024 * 1024});
}

function replay(row, before) {
  assert.equal(row.before.path, row.path);
  assert.equal(row.after.path, row.path);
  assert.deepEqual(ref(row.path, before), {path: row.path, sha256: row.before.sha256, bytes: row.before.bytes});
  assert.equal(blob(before), row.before.git_blob);
  let cursor = 0;
  const chunks = [];
  for (const edit of row.edits) {
    assert.deepEqual(Object.keys(edit).sort(), ['after', 'before', 'offset']);
    assert.ok(Number.isSafeInteger(edit.offset) && edit.offset >= cursor && edit.offset <= before.length);
    assert.equal(typeof edit.before, 'string');
    assert.equal(typeof edit.after, 'string');
    const old = Buffer.from(edit.before);
    assert.ok(same(before.subarray(edit.offset, edit.offset + old.length), old));
    chunks.push(before.subarray(cursor, edit.offset), Buffer.from(edit.after));
    cursor = edit.offset + old.length;
  }
  chunks.push(before.subarray(cursor));
  const after = Buffer.concat(chunks);
  assert.deepEqual(ref(row.path, after), {path: row.path, sha256: row.after.sha256, bytes: row.after.bytes});
  assert.equal(blob(after), row.after.git_blob);
  return after;
}

export function selectDialogFiniteSuccessor({root, read, line}) {
  assert.ok(line === '21.x' || line === 'main');
  assert.equal(typeof read, 'function');
  const physical = path => readEvidenceMember(root, path);
  const packagePath = 'projects/ngx-material-legacy/package.json', packageRaw = physical(packagePath);
  const version = JSON.parse(packageRaw).version;
  assert.equal(line, version.startsWith('21.') ? '21.x' : version.startsWith('22.') ? 'main' : null, 'wrong select line');
  assert.ok(same(physical(SELF), image), 'changed loaded select successor');
  const bound = [ref(SELF, image), ref(packagePath, packageRaw)];
  const packetAt = ([path, sha256, bytes]) => {
    const raw = physical(path);
    assert.deepEqual(ref(path, raw), {path, sha256, bytes}, 'changed select successor packet');
    bound.push({path, sha256, bytes});
    return JSON.parse(raw);
  };
  const packets = PACKETS.map(packetAt), [older, old, preceding, packet] = packets;
  const roles = ['finite-select-dialog-current-source-successor', 'finite-select-dialog-menu-current-source-successor', 'finite-select-dialog-menu-snack-current-source-successor', 'finite-select-dialog-menu-snack-d61-menu-current-source-successor'];
  for (const [index, item] of packets.entries()) {
    assert.equal(item.schema_version, 1);
    assert.equal(item.role, roles[index]);
    if (index) {
      const [path, sha256, bytes] = PACKETS[index - 1];
      assert.deepEqual(item.previous_packet, {path, sha256, bytes});
    }
  }
  assert.equal(packet.source_scope_only, true);
  assert.equal(packet.historical_programs_executed, false);
  assert.equal(packet.canonical_admission_granted, false);
  assert.equal(packet.g11_claim, 'not-passed');
  const rows = packet.branches[line].transitions, latest = packet.branches[line].d61_menu_transitions;
  assert.deepEqual(rows.map(x => x.path), ['projects/ngx-material-legacy/legacy-select/select.html', TESTS[0], 'projects/ngx-material-legacy/legacy-dialog/internal/dialog-base.ts', 'projects/ngx-material-legacy/legacy-menu/internal/menu-trigger-base.ts', 'projects/ngx-material-legacy/legacy-menu/menu.spec.ts', 'projects/ngx-material-legacy/legacy-snack-bar/snack-bar-container.ts', 'projects/ngx-material-legacy/legacy-snack-bar/internal/snack-bar-base.ts', 'projects/ngx-material-legacy/legacy-snack-bar/snack-bar.spec.ts']);
  assert.deepEqual(rows.slice(0, 3), older.branches[line].transitions);
  assert.deepEqual(rows.slice(0, 5), old.branches[line].transitions);
  assert.deepEqual(rows, preceding.branches[line].transitions);
  assert.deepEqual(latest.map(x => x.path), ['projects/ngx-material-legacy/legacy-dialog/internal/dialog-base.ts', TESTS[1], 'projects/ngx-material-legacy/legacy-menu/internal/menu-trigger-base.ts', 'projects/ngx-material-legacy/legacy-menu/menu.spec.ts']);
  for (const next of latest) {
    const prior = rows.find(row => row.path === next.path);
    if (prior) assert.deepEqual(next.before, prior.after);
  }
  const rendered = new Map();
  for (const row of [...rows, ...latest]) rendered.set(row.path, replay(row, historical(root, row.source_parent, row.path)));
  const effective = rows.map(row => ({...row, after: latest.find(item => item.path === row.path)?.after ?? row.after})).concat(latest.filter(next => !rows.some(row => row.path === next.path)));
  const intermediates = [...latest.map(row => row.before)];
  // Accept only the frozen v4 shape or the exact paired, reviewed test restorations.
  // Git programs are never loaded; their file bytes are comparison inputs to replay.
  if (TESTS.some(path => hash(physical(path)) !== effective.find(row => row.path === path).after.sha256)) {
    const restored = packetAt(RESTORED);
    assert.equal(restored.schema_version, 1);
    assert.equal(restored.role, 'finite-restored-select-dialog-test-source-v5');
    assert.equal(restored.source_scope_only, true);
    assert.equal(restored.historical_programs_executed, false);
    assert.equal(restored.canonical_admission_granted, false);
    assert.equal(restored.g11_claim, 'not-passed');
    const [path, sha256, bytes] = PACKETS[3];
    assert.deepEqual(restored.prior_packet, {path, sha256, bytes});
    const branch = restored.branches[line];
    assert.deepEqual(branch.repairs.map(row => row.path), TESTS);
    for (const row of branch.repairs) {
      const prior = effective.find(item => item.path === row.path);
      assert.deepEqual(row.before, prior.after);
      const after = replay(row, rendered.get(row.path));
      assert.ok(same(after, historical(root, row.after_source_parent, row.path)), 'restored test Git source mismatch');
      intermediates.push(prior.after);
      prior.after = row.after;
    }
    assert.deepEqual(branch.receipts.map(row => row.path), ['compatibility/rc/parent-input-select-historical-repair-v1.json', 'compatibility/rc/parent-four-historical-fixture-repairs-v1.json']);
    const receipts = branch.receipts.map(row => packetAt([row.path, row.sha256, row.bytes]));
    const key = line === '21.x' ? '21' : 'main';
    assert.equal(receipts[0].proposal_manifest.lines[key].original_spec_sha256.select, branch.repairs[0].before.sha256);
    assert.equal(receipts[0].proposal_manifest.lines[key].patched_spec_sha256.select, branch.repairs[0].after.sha256);
    assert.equal(receipts[1].source_afterimages[key][TESTS[1]], branch.repairs[1].after.sha256);
  }
  bound.push(...effective.map(row => ({path: row.path, sha256: row.after.sha256, bytes: row.after.bytes})));
  assert.equal(new Set(bound.map(row => row.path)).size, bound.length);
  let active = false, nestedAttempt = false;
  const idle = () => {
    if (active) { nestedAttempt = true; assert.fail('reentrant select successor consumption'); }
  };
  const sweep = () => {
    for (const row of bound) assert.deepEqual(ref(row.path, physical(row.path)), row, 'changed physical select successor ' + row.path);
    assert.ok(same(physical(SELF), image), 'changed loaded select successor');
  };
  const assertCurrent = () => {
    idle(); active = true; nestedAttempt = false;
    try {
      sweep();
      for (const row of bound) {
        const before = physical(row.path);
        assert.deepEqual(ref(row.path, before), row);
        assert.ok(same(before, read(row.path)), 'nonphysical select successor ' + row.path);
        assert.ok(same(before, physical(row.path)), 'select successor changed during callback ' + row.path);
      }
      assert.equal(nestedAttempt, false, 'reentrant select successor consumption');
      sweep();
    } finally { active = false; }
  };
  const select = (incoming, side) => {
    idle();
    if (incoming === null || typeof incoming !== 'object') return null;
    assert.equal(types.isProxy(incoming), false, 'reference must not be a proxy');
    const descriptors = Object.getOwnPropertyDescriptors(incoming);
    if (!Object.hasOwn(descriptors, 'path')) return null;
    assert.ok(Object.hasOwn(descriptors.path, 'value'), 'reference path must be data');
    assert.equal(typeof descriptors.path.value, 'string');
    const row = effective.find(item => item.path === descriptors.path.value);
    // An unowned plain path consumes no reference. Data descriptors cannot
    // invoke supplied getters or proxy traps while determining ownership.
    if (!row) return null;
    for (const descriptor of Object.values(descriptors)) assert.ok(Object.hasOwn(descriptor, 'value'), 'reference must contain data properties');
    const value = Object.fromEntries(Object.entries(descriptors).map(([key, descriptor]) => [key, descriptor.value]));
    active = true; nestedAttempt = false;
    try {
      sweep();
      assert.deepEqual(Object.keys(value).sort(), value.bytes === undefined ? ['path', 'sha256'] : ['bytes', 'path', 'sha256']);
      assert.equal(typeof value.sha256, 'string');
      if (value.bytes !== undefined) assert.ok(Number.isSafeInteger(value.bytes));
      const expected = [row.before, ...intermediates.filter(item => item.path === row.path), row.after].find(candidate => candidate.sha256 === value.sha256);
      assert.ok(expected, 'unknown select predecessor');
      if (value.bytes !== undefined) assert.equal(value.bytes, expected.bytes);
      const result = {path: row.path, sha256: row[side].sha256, ...(value.bytes === undefined ? {} : {bytes: row[side].bytes})};
      assert.equal(nestedAttempt, false, 'reentrant select successor consumption');
      sweep();
      return result;
    } finally { active = false; }
  };
  assertCurrent();
  return {bound: structuredClone(bound), qualify: incoming => select(incoming, 'after'), historicalReference: incoming => select(incoming, 'before'), assertCurrent, assertPhysical: () => {idle(); sweep();}};
}
