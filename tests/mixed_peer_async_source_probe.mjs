/**
 * @license
 * Copyright Google LLC All Rights Reserved.
 * Copyright (c) 2026 Ryan Lester.
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.io/license
 */
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {createRequire} from 'node:module';
import {readFileSync, writeFileSync} from 'node:fs';
import {gunzipSync} from 'node:zlib';
import {resolve} from 'node:path';
import {fileURLToPath} from 'node:url';
import {inspectPeerAsyncSources, peerAsyncPins, reviewPeerAsyncSubject, reviewPeerAsyncFloor,
  inspectPeerErrorDefaults, inspectPeerOwnedScope, projectPeerFixture} from '../scripts/mixed-peer-async-source-review.mjs';
const ts = createRequire(import.meta.url)('typescript');
const root = fileURLToPath(new URL('..', import.meta.url)), prefix = 'compatibility/rc/mixed-peer-async-source-';
const read = p => readFileSync(resolve(root, p)), hash = bytes => createHash('sha256').update(bytes).digest('hex');
const load = p => JSON.parse(gunzipSync(read(prefix + p)));
const originals = load('subjects.json.gz').subjects, floors = load('published-peer-floors.json.gz').floors;
const pins = peerAsyncPins({root}), actual = inspectPeerAsyncSources({root}), cases = [];
assert.equal(actual.retained_cases, 1394); assert.equal(actual.unchanged_complete_callbacks, 1027);
assert.equal(actual.owned_product_members, 1141); assert.equal(actual.current_required_historical_case_ids, 2228);
assert.equal(actual.actual_Angular_native_artifact_browser_SSR_or_floor_qualified, false);
function reject(id, fn) {assert.throws(fn, undefined, id); cases.push({id, result: 'rejected'});}
for (const [index, subject] of originals.entries()) {
  for (const [i, member] of subject.members.entries()) {
    const changed = structuredClone(subject); changed.members[i].after.text += '\nthrow Error("unreviewed source operation");\n';
    reject(subject.sha + ':' + member.path + ':complete-frame-drift', () => reviewPeerAsyncSubject(changed, index, pins.subjects[index]));
  }
  const both = structuredClone(subject); both.members[0].before.text += '\nthrow Error("same drift");\n';
  both.members[0].after.text += '\nthrow Error("same drift");\n';
  reject(subject.sha + ':synchronized-original-drift', () => reviewPeerAsyncSubject(both, index, pins.subjects[index]));
  const specAt = subject.members.findIndex(n => n.path.endsWith('.spec.ts'));
  for (const [id, rewrite] of [['disabled-case', t => t.replace(/\bit\(/, 'xit(')],
    ['cleanup-hook', t => t + '\nafterEach(() => { throw Error("lost cleanup"); });\n']]) {
    const changed = structuredClone(subject), before = changed.members[specAt].after.text;
    changed.members[specAt].after.text = rewrite(before); assert.notEqual(before, changed.members[specAt].after.text);
    reject(subject.sha + ':' + id, () => reviewPeerAsyncSubject(changed, index, pins.subjects[index]));
  }
}
for (const index of [0, 1]) {
  const text = originals[index].members.find(n => n.path.endsWith('.spec.ts')).after.text;
  const changed = text.replace(/\bexpect\(/, 'expect(999, '); assert.notEqual(changed, text);
  assert.notEqual(projectPeerFixture(text, index).semantic_sha256, projectPeerFixture(changed, index).semantic_sha256);
  cases.push({id: 'finite-projection-retains-predicates-' + index, result: 'rejected'});
}
function update(row) {row.sha256 = hash(row.text); row.bytes = Buffer.byteLength(row.text);}
function driftFactory(floor, name) {
  const changed = structuredClone(floor), source = changed.mapped_sources.find(n => n.text.includes('export function ' + name + '('));
  assert.ok(source); const js = changed.members.find(n => n.archive_member === source.source_map_member.slice(0, -4));
  function rewrite(text) {const file = ts.createSourceFile('review.ts', text, ts.ScriptTarget.Latest, true);
    const fn = file.statements.find(n => ts.isFunctionDeclaration(n) && n.name?.text === name); assert.ok(fn?.body);
    const at = fn.body.getStart() + 1; return text.slice(0, at) + '\nthrow Error("factory contract drift");\n' + text.slice(at);}
  js.text = rewrite(js.text); update(js); source.text = rewrite(source.text); source.source_sha256 = hash(source.text);
  const row = changed.members.find(n => n.archive_member === source.source_map_member), map = JSON.parse(row.text);
  map.sourcesContent[map.sources.indexOf(source.source_map_path)] = source.text; row.text = JSON.stringify(map); update(row);
  return changed;
}
for (const [i, floor] of floors.entries()) {
  for (const name of ['createOverlayRef', 'createFlexibleConnectedPositionStrategy', 'createGlobalPositionStrategy',
    'createBlockScrollStrategy', 'createRepositionScrollStrategy'])
    reject(floor.line + ':' + name + ':coordinated-source-and-JS-drift', () => reviewPeerAsyncFloor(driftFactory(floor, name), pins.floor_reviews[i]));
  for (const [id, path, rewrite] of [
    ['public-runtime-service-export', 'package/fesm2022/overlay.mjs', t => t.replace(/\bOverlay, /, '')],
    ['public-type-factory-reexport', 'package/types/overlay.d.ts', t => t.replace(/\bcreateFlexibleConnectedPositionStrategy, /, '')],
    ['deprecated-Overlay-service', 'package/types/overlay.d.ts', t => t.replace('declare class Overlay {', '/** @deprecated */\ndeclare class Overlay {')],
  ]) {
    const changed = structuredClone(floor), row = changed.members.find(n => n.archive_member === path), before = row.text;
    row.text = rewrite(row.text); assert.notEqual(row.text, before, id); update(row);
    reject(floor.line + ':' + id, () => reviewPeerAsyncFloor(changed, pins.floor_reviews[i]));
  }
}
for (const [i, subject] of load('fixture-stability-reference-intake.json.gz').subjects.entries()) {
  if (subject.line === 'original') continue;
  for (const [id, before, after] of [['default-error-rethrow-disabled', 'const RETHROW_APPLICATION_ERRORS_DEFAULT = true;', 'const RETHROW_APPLICATION_ERRORS_DEFAULT = false;'],
    ['stability-rejection-detached', 'this.appErrorHandler.whenStableRejectFunctions.add(reject)', 'this.appErrorHandler.whenStableRejectFunctions.delete(reject)']]) {
    const capsule = load('fixture-stability-reference-intake.json.gz'), row = capsule.subjects[i].runtime_member;
    assert.ok(row.text.includes(before)); row.text = row.text.replace(before, after); update(row);
    reject(subject.line + ':' + id, () => inspectPeerErrorDefaults(capsule));
  }
}
const scopePath = 'projects/ngx-material-legacy/legacy-menu/menu-item.ts';
for (const [id, path, rewrite] of [
  ['affected-peer-dependency', scopePath, t => t + "\nimport {CdkListbox} from '@angular/cdk/listbox';\n"],
  ['ordinary-peer-fork', scopePath, t => t + '\nclass DragRef {}\n'],
  ['bootstrap-promise-shortcut', 'testing/legacy-runner/init-test-env.ts', t => t + '\nComponentFixture.prototype.whenStable = () => Promise.resolve(false);\n'],
  ['menu-error-observation-relaxed', 'projects/ngx-material-legacy/legacy-menu/menu.spec.ts', t => t.replace('.toThrowError(/menu cannot contain its own trigger/)', '.not.toThrow()')],
]) {
  const before = read(path).toString(), changed = rewrite(before); assert.notEqual(before, changed);
  reject(id, () => inspectPeerOwnedScope({root, readMember: p => p === path ? Buffer.from(changed) : read(p)}));
}
const report = {schema_version: 1, line: actual.line, helper: {path: 'scripts/mixed-peer-async-source-review.mjs', sha256: hash(read('scripts/mixed-peer-async-source-review.mjs'))},
  producer: {path: 'tests/mixed_peer_async_source_probe.mjs', sha256: hash(read('tests/mixed_peer_async_source_probe.mjs'))},
  negative_controls: cases.length, cases, retained_cases: 1394, unchanged_complete_callbacks: 1027,
  actual_Angular_native_artifact_browser_SSR_or_floor_qualified: false, g11_claim: 'not-passed'};
assert.equal(cases.length, 82);
if (process.argv[2]) writeFileSync(process.argv[2], JSON.stringify(report, null, 2) + '\n', {flag: 'wx'});
console.log(JSON.stringify({line: actual.line, negative_controls: cases.length, retained_cases: 1394, actual_runtime_qualified: false}));
