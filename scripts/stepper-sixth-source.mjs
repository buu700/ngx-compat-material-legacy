/**
 * @license
 * Copyright Google LLC All Rights Reserved.
 * Copyright (c) 2026 Ryan Lester.
 * Use of this source code is governed by the MIT license in LICENSE.
 */
/** Finite Stepper source identity only. No CSS, artifact, or historical program admission. */
import assert from 'node:assert/strict';
import {execFileSync} from 'node:child_process';
import {createHash} from 'node:crypto';
import {lstatSync, readFileSync} from 'node:fs';
import {isAbsolute, join, resolve} from 'node:path';
import {fileURLToPath} from 'node:url';
import {types} from 'node:util';

const SELF = 'scripts/stepper-sixth-source.mjs';
const PACKET = 'compatibility/rc/current-sass-stepper-sixth-source-inputs-v1.json';
const PACKET_SHA = '1d566395c25e3569cee1031526ec05508e40cb866d7d5fda008cb6a325a9caec';
const BRIDGE = 'projects/ngx-material-legacy/styles/bridges/_companion-overrides.scss';
const SHORT = 'styles/bridges/_companion-overrides.scss';
const loadedImage = readFileSync(fileURLToPath(import.meta.url));
const hash = bytes => createHash('sha256').update(bytes).digest('hex');
const blob = bytes => createHash('sha1').update('blob ' + bytes.length + '\0').update(bytes).digest('hex');
const descriptor = (path, bytes) => ({path, sha256: hash(bytes), bytes: bytes.length});
const equals = Buffer.prototype.equals;
const same = (a, b) => Buffer.isBuffer(b) && Reflect.apply(equals, a, [b]);
export const stepperSixthLoadedImage = Object.freeze(descriptor(SELF, loadedImage));

function safe(path) {
  assert.equal(typeof path, 'string');
  assert.ok(path && !isAbsolute(path) && !path.includes('\\') && !path.includes('\0'));
  assert.ok(path.split('/').every(part => part && part !== '.' && part !== '..'));
  return path;
}
function physical(root, path) {
  let cursor = root;
  for (const part of safe(path).split('/')) {
    cursor = join(cursor, part);
    assert.equal(lstatSync(cursor).isSymbolicLink(), false, 'linked Stepper source ' + path);
  }
  assert.ok(lstatSync(cursor).isFile(), 'nonfile Stepper source ' + path);
  return readFileSync(cursor);
}
function identity(bytes, ref) {
  assert.equal(hash(bytes), ref.sha256, 'changed Stepper source ' + ref.path);
  assert.equal(bytes.length, ref.bytes, 'changed Stepper source size ' + ref.path);
  if (Object.hasOwn(ref, 'git_blob')) assert.equal(blob(bytes), ref.git_blob);
}
function historical(root, commit, path) {
  assert.match(commit, /^[a-f0-9]{40}$/);
  const env = {PATH: process.env.PATH, LANG: 'C', LC_ALL: 'C', GIT_CONFIG_GLOBAL: '/dev/null',
    GIT_CONFIG_SYSTEM: '/dev/null', GIT_TERMINAL_PROMPT: '0', GIT_NO_REPLACE_OBJECTS: '1', GIT_NO_LAZY_FETCH: '1'};
  return execFileSync('git', ['--no-replace-objects', '-c', 'gc.auto=0', '-c', 'maintenance.auto=0',
    'show', commit + ':' + safe(path)], {cwd: root, env, maxBuffer: 2 * 1024 * 1024});
}
function metadata(ref) {
  assert.ok(ref && typeof ref === 'object' && !types.isProxy(ref));
  assert.equal(Object.getPrototypeOf(ref), Object.prototype);
  const descriptors = Object.getOwnPropertyDescriptors(ref), out = {};
  for (const key of ['path', 'sha256', 'bytes']) {
    const value = descriptors[key];
    if (key === 'bytes' && !value) continue;
    assert.ok(value && Object.hasOwn(value, 'value'), 'source reference accessor');
    out[key] = value.value;
  }
  return out;
}

export function createStepperSixthSource({root = process.cwd(), read: providedRead} = {}) {
  assert.ok(isAbsolute(root), 'absolute Stepper root required');
  assert.equal(lstatSync(root).isSymbolicLink(), false, 'linked Stepper root');
  root = resolve(root);
  assert.ok(lstatSync(root).isDirectory());
  assert.ok(providedRead === undefined || typeof providedRead === 'function');
  const self = descriptor(SELF, loadedImage);
  assert.ok(same(physical(root, SELF), loadedImage), 'changed loaded Stepper helper');
  const packetBytes = physical(root, PACKET);
  assert.equal(hash(packetBytes), PACKET_SHA, 'changed Stepper packet');
  const packet = JSON.parse(packetBytes);
  assert.equal(packet.schema_version, 3);
  assert.equal(packet.role, 'finite-sixth-Stepper-M2-bridge-current-source-successor');
  assert.equal(packet.sixth_module_path, BRIDGE);
  assert.equal(packet.source_scope_only, true);
  assert.equal(packet.css_or_artifact_admission_granted, false);
  assert.equal(packet.historical_bytes_exposed_as_current, false);
  const version = JSON.parse(physical(root, 'projects/ngx-material-legacy/package.json')).version;
  const line = version.startsWith('21.') ? '21.x' : version.startsWith('22.') ? 'main' : null;
  assert.ok(line);
  const branch = packet.branches[line], prior = packet.previous_packet;
  assert.deepEqual(prior, {path:'compatibility/rc/current-sass-source-inputs-v2.json',
    sha256:'46e1c8e8657880c1168010c8ec1b5967cbb4aa4c289a4d9b9ae29e3b2182b0a9',bytes:prior.bytes});
  const priorBytes = physical(root, prior.path); identity(priorBytes, prior);
  const v2 = JSON.parse(priorBytes);
  assert.equal(v2.schema_version, 2);
  const sourceBytes = physical(root, v2.historical_source_packet.path);
  identity(sourceBytes, v2.historical_source_packet);
  const source = JSON.parse(sourceBytes).branches[line];
  const cssBytes = physical(root, v2.historical_css_packet.path);
  identity(cssBytes, v2.historical_css_packet);
  const css = JSON.parse(cssBytes);
  const protectedBytes = physical(root, v2.protected_input_packet.path);
  identity(protectedBytes, v2.protected_input_packet);
  const protectedPacket = JSON.parse(protectedBytes);
  const censusBytes = physical(root, v2.style_template_census.path);
  identity(censusBytes, v2.style_template_census);
  const census = JSON.parse(censusBytes);
  assert.equal(source.before_commit, branch.source_parent);
  const old = source.unchanged_owned_sass_before_inputs.filter(x => x.path === BRIDGE);
  assert.equal(old.length, 1);
  assert.equal(old[0].sha256, branch.before_git.sha256);
  assert.equal(old[0].bytes, branch.before_git.bytes);
  assert.equal(old[0].blob, branch.before_git.git_blob);
  for (const list of [source.inputs, protectedPacket.branches[line].protected_inputs,
    census.lines.find(x => x.line === line).non_target_owned_style_template_graph]) {
    assert.equal(list.filter(x => x.path === BRIDGE).length, 1);
  }
  const before = historical(root, branch.source_parent, BRIDGE);
  identity(before, branch.before_git);
  let cursor = 0;
  const pieces = [];
  for (const edit of branch.literal_edits) {
    assert.ok(Number.isSafeInteger(edit.offset) && edit.offset >= cursor);
    assert.equal(typeof edit.before, 'string');
    assert.equal(typeof edit.after, 'string');
    const oldBytes = Buffer.from(edit.before), newBytes = Buffer.from(edit.after);
    assert.ok(same(before.subarray(edit.offset, edit.offset + oldBytes.length), oldBytes));
    pieces.push(before.subarray(cursor, edit.offset), newBytes);
    cursor = edit.offset + oldBytes.length;
  }
  pieces.push(before.subarray(cursor));
  const expected = Buffer.concat(pieces);
  identity(expected, branch.reviewed_after);
  assert.ok(same(physical(root, BRIDGE), expected), 'nonreviewed Stepper afterimage');
  const five = [...source.modules.map(x => ({path:x.path, current:x.current})),
    ...v2.additional_modules.map(x => ({path:x.path, current:x.current}))];
  assert.equal(five.length, 5);
  assert.deepEqual(five.map(x => x.path), v2.product_paths);
  const fiveMap = new Map(five.map(x => [x.path, x.current]));
  const entries = Object.entries(css.branches[line].source_sets);
  assert.equal(entries.length, 1);
  const [historicalKey, historicalRows] = entries[0];
  assert.equal(hash(JSON.stringify(historicalRows)), historicalKey);
  assert.equal(historicalKey, branch.source_set.historical_sha256);
  const v2Rows = historicalRows.map(row => {
    const target = row.root === 0 && fiveMap.get('projects/ngx-material-legacy/' + row.path);
    return target ? {...row, sha256: target.sha256, bytes: target.bytes} : {...row};
  });
  assert.equal(hash(JSON.stringify(v2Rows)), branch.source_set.v2_current_sha256);
  const rows = v2Rows.map(row => row.root === 0 && row.path === SHORT ?
    {...row, sha256: branch.reviewed_after.sha256, bytes: branch.reviewed_after.bytes} : {...row});
  assert.equal(hash(JSON.stringify(rows)), branch.source_set.v3_current_sha256);
  assert.equal(rows.length, branch.source_set.all_source_count);
  const owned = rows.filter(row => row.root === 0);
  assert.equal(owned.length, 286);
  assert.equal(owned.length, branch.source_set.owned_sass_count);
  assert.equal(rows.length - owned.length, branch.source_set.source_set_nonowned_count);
  const changed = rows.filter((row, i) => JSON.stringify(row) !== JSON.stringify(v2Rows[i]));
  assert.deepEqual(changed.map(row => row.path), branch.source_set.changed_owned_sass_paths);
  assert.deepEqual(changed.map(row => row.path), [SHORT]);
  assert.equal(owned.length - changed.length, branch.source_set.unchanged_owned_sass_count);
  for (const anchor of branch.owned_m2_anchors) {
    const row = owned.find(x => 'projects/ngx-material-legacy/' + x.path === anchor.path);
    assert.ok(row);
    assert.equal(row.sha256, anchor.sha256);
    assert.equal(row.bytes, anchor.bytes);
  }
  const bound = [self, descriptor(PACKET, packetBytes), prior, v2.historical_source_packet,
    v2.historical_css_packet, v2.protected_input_packet, v2.style_template_census,
    ...owned.map(row => ({path:'projects/ngx-material-legacy/' + row.path,
      sha256:row.sha256, bytes:row.bytes}))];
  assert.equal(new Set(bound.map(row => row.path)).size, bound.length);
  const assertPhysical = () => {
    assert.ok(same(physical(root, SELF), loadedImage), 'changed loaded Stepper helper');
    for (const row of bound) identity(physical(root, row.path), row);
  };
  let active = false;
  const assertCurrent = () => {
    assert.equal(active, false, 'reentrant Stepper source guard');
    active = true;
    try {
      assertPhysical();
      for (const row of bound) {
        const actual = physical(root, row.path);
        const supplied = providedRead === undefined ? actual : providedRead(row.path);
        assert.ok(same(actual, supplied), 'nonphysical Stepper callback ' + row.path);
        assert.ok(same(actual, physical(root, row.path)), 'Stepper source changed during callback ' + row.path);
      }
      assertPhysical();
    } finally {active = false;}
  };
  const qualify = incoming => {
    assert.equal(active, false, 'reentrant Stepper source qualification');
    const original = metadata(incoming);
    if (original.path !== BRIDGE) return null;
    const selected = [branch.before_git, branch.reviewed_after].find(x => x.sha256 === original.sha256);
    assert.ok(selected, 'unknown Stepper source predecessor');
    if (Object.hasOwn(original, 'bytes')) assert.equal(original.bytes, selected.bytes);
    assertCurrent();
    assert.deepEqual(metadata(incoming), original, 'Stepper source reference mutated');
    const result = {path:BRIDGE, sha256:branch.reviewed_after.sha256};
    if (Object.hasOwn(original, 'bytes')) result.bytes = branch.reviewed_after.bytes;
    assertPhysical();
    return result;
  };
  assertCurrent();
  return {line, root, bound:structuredClone(bound), transition:structuredClone({path:BRIDGE,before:branch.before_git,current:branch.reviewed_after}),
    source_set:structuredClone({historical_sha256:historicalKey,v2_current_sha256:branch.source_set.v2_current_sha256,
      v3_current_sha256:branch.source_set.v3_current_sha256,rows}),
    assertPhysical, assertCurrent, qualify, source_scope_only:true, css_or_artifact_admission_granted:false};
}
