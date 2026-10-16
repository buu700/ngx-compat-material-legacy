/**
 * @license
 * Copyright Google LLC All Rights Reserved.
 * Copyright (c) 2026 Ryan Lester.
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.io/license
 */
/** Original-source controls; neither public peer behavior nor sanitization is executed. */
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {readFileSync, writeFileSync} from 'node:fs';
import {gunzipSync} from 'node:zlib';
import {dirname, resolve} from 'node:path';
import {fileURLToPath} from 'node:url';
import {originalEnvironmentCases} from '../scripts/spec-test-environment-source-review.mjs';
import {SURFACE_ASYNC_SHAS, ICON_TRUST_CASES, analyzeSurfaceAsyncOriginal, compareSurfaceAsyncCases,
  projectSurfaceAsyncBody, reviewSurfaceAsyncGlobals, inspectSurfaceAsyncSources,
} from '../scripts/spec-surface-async-source-review.mjs';
const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const read = path => readFileSync(resolve(root, path));
const hash = bytes => createHash('sha256').update(bytes).digest('hex');
const report = inspectSurfaceAsyncSources({root});
const originals = JSON.parse(gunzipSync(read('compatibility/rc/spec-surface-async-source-subjects.json.gz')));
const controls = [];
function reject(id, action, pattern) { assert.throws(action, pattern, id); controls.push({id, result: 'rejected'}); }
for (const subject of originals.subjects) {
  for (const [id, mutate] of [
    ['raw-commit', row => { row.raw_commit += '\n'; row.raw_commit_sha256 = hash(row.raw_commit); }],
    ['missing-file', row => { row.members.pop(); row.complete_changed_files.pop(); }],
    ['foreign-file', row => { row.members[0].path = 'src/material/unknown.spec.ts'; }],
    ['missing-hunk', row => { row.original_hunks--; }],
    ['rehashed-body', row => { const m = row.members[0].after; m.text += '\n'; m.sha256 = hash(m.text); m.bytes = Buffer.byteLength(m.text); }],
    ['rehashed-diff', row => { row.diff = row.diff.replace(/^@@ /m, '@@  '); row.diff_sha256 = hash(row.diff); row.diff_bytes = Buffer.byteLength(row.diff); }],
  ]) {
    const changed = structuredClone(subject); mutate(changed);
    reject(subject.sha + '-' + id, () => analyzeSurfaceAsyncOriginal(changed));
  }
  const before = originalEnvironmentCases(subject, 'before'), after = originalEnvironmentCases(subject, 'after');
  for (const [id, mutate] of [
    ['lost-case', rows => rows.pop()], ['duplicate-case', rows => rows.push(rows[0])],
    ['reused-case', rows => { rows[1] = rows[0]; }],
    ['case-order', rows => { [rows[0], rows[1]] = [rows[1], rows[0]]; }],
  ]) {
    const changed = structuredClone(after); mutate(changed);
    reject(subject.sha + '-' + id, () => compareSurfaceAsyncCases(subject.sha, before, changed));
  }
  for (const mode of ['fit', 'xit']) {
    const changed = structuredClone(subject), first = after[0]; assert.ok(first.raw.startsWith('it('));
    assert.equal(changed.members[0].after.text.split(first.raw).length, 2);
    changed.members[0].after.text = changed.members[0].after.text.replace(first.raw, first.raw.replace(/^it\(/, mode + '('));
    reject(subject.sha + '-mode-' + mode, () => compareSurfaceAsyncCases(subject.sha, before, originalEnvironmentCases(changed, 'after')));
  }
  for (const [id, needle, replacement] of [
    ['fixture-metadata', '@Component({', '@Component({unreviewed: true,'],
    ['hook-scope', 'beforeEach(', 'afterEach('],
  ]) {
    const changed = structuredClone(subject); assert.ok(changed.members[0].after.text.includes(needle));
    changed.members[0].after.text = changed.members[0].after.text.replace(needle, replacement);
    reject(subject.sha + '-' + id, () => reviewSurfaceAsyncGlobals(changed));
  }
}
function changedCase(index, row, mutate) {
  const subject = originals.subjects[index], changed = structuredClone(subject), text = changed.members[0].after.text;
  assert.equal(text.split(row.raw).length, 2); const next = mutate(row.raw); assert.notEqual(next, row.raw);
  changed.members[0].after.text = text.replace(row.raw, next);
  return {before: originalEnvironmentCases(subject, 'before'), after: originalEnvironmentCases(changed, 'after')};
}
for (let index = 0; index < originals.subjects.length; index++) {
  const after = originalEnvironmentCases(originals.subjects[index], 'after');
  for (const [id, needle, replacement] of [['predicate', '.toBe(', '.not.toBe('], ['declaration-kind', 'const ', 'let ']]) {
    const row = after.find(n => n.raw.includes(needle)); assert.ok(row);
    const changed = changedCase(index, row, raw => raw.replace(needle, replacement));
    reject(SURFACE_ASYNC_SHAS[index] + '-' + id, () => compareSurfaceAsyncCases(SURFACE_ASYNC_SHAS[index], changed.before, changed.after));
  }
}
const iconAfter = originalEnvironmentCases(originals.subjects[0], 'after');
for (const name of ICON_TRUST_CASES) {
  const row = iconAfter.find(n => n.name === name); assert.ok(row && row.raw.includes('.toThrowError('));
  const changed = changedCase(0, row, raw => raw.replace('.toThrowError(', '.not.toThrowError('));
  reject('unchanged-icon-trust-observation-' + name, () => compareSurfaceAsyncCases(SURFACE_ASYNC_SHAS[0], changed.before, changed.after));
}
for (const [needle, replacement, id] of [
  ['withCredentials: true', 'withCredentials: false', 'icon-credential-option-not-normalized'],
  ['.flush(FAKE_SVGS.cat)', '.flush(FAKE_SVGS.dog)', 'HTTP-response-body-not-normalized-as-timing'],
  ["http.expectOne('dog.svg').cancelled).toBe(true)", "http.expectOne('dog.svg').cancelled).toBe(false)", 'destroyed-icon-request-cancellation'],
]) {
  const row = iconAfter.find(n => n.raw.includes(needle)); assert.ok(row, id);
  const changed = changedCase(0, row, raw => raw.replace(needle, replacement));
  reject(id, () => compareSurfaceAsyncCases(SURFACE_ASYNC_SHAS[0], changed.before, changed.after));
}
{
  const row = iconAfter[0], changed = changedCase(0, row, raw => { const at = raw.lastIndexOf('}'); return raw.slice(0, at) + '\ntick();\n' + raw.slice(at); });
  assert.equal(projectSurfaceAsyncBody(changed.before[0], 0).projected_body_sha256, projectSurfaceAsyncBody(changed.after[0], 0).projected_body_sha256);
  reject('projection-does-not-waive-timeline-identity', () => compareSurfaceAsyncCases(SURFACE_ASYNC_SHAS[0], changed.before, changed.after), /ordered authenticated raw pair changed/);
  reject('stale-callback-metadata', () => projectSurfaceAsyncBody({...row, raw: row.raw + ' '}, 0));
}
{
  const after = originalEnvironmentCases(originals.subjects[2], 'after'), row = after.find(n => n.raw.includes('await wait(300)')); assert.ok(row);
  const changed = changedCase(2, row, raw => raw.replace('await wait(300)', 'await wait(301)'));
  reject('expansion-unreviewed-native-deadline', () => compareSurfaceAsyncCases(SURFACE_ASYNC_SHAS[2], changed.before, changed.after));
}
for (const [index, side, needle, replacement, id] of [
  [0, 'before', 'fakeAsync,', 'unknownFunction as fakeAsync,', 'testing-import-binding-identity'],
  [0, 'after', 'useValue: {getPathname:', 'useValue: {unexpected: true, getPathname:', 'icon-location-provider-context'],
  [2, 'after', 'setTimeout(resolve, milliseconds)', 'setTimeout(resolve, milliseconds + 1)', 'expansion-wait-helper'],
  [2, 'after', 'TestBed, waitForAsync}', 'TestBed}', 'retained-expansion-waitForAsync-import'],
]) {
  const changed = structuredClone(originals.subjects[index]); assert.ok(changed.members[0][side].text.includes(needle), id);
  changed.members[0][side].text = changed.members[0][side].text.replace(needle, replacement);
  reject(id, () => reviewSurfaceAsyncGlobals(changed));
}
for (const path of ['compatibility/rc/spec-surface-async-source-subjects.json.gz', 'compatibility/rc/spec-surface-async-source-acquisition.json.gz',
  'scripts/acquire-upstream-spec-originals.py', 'projects/ngx-material-legacy/legacy-table/internal/table-data-source-base.ts',
  'projects/ngx-material-legacy/legacy-table/table-data-source.spec.ts', 'projects/ngx-material-legacy/legacy-chips/testing/shared.spec.ts',
  ...['icon', 'button-toggle', 'expansion', 'sort'].map(name => 'projects/ngx-material-legacy/styles/' + name + '/_' + name + '-theme.scss'),
  'compatibility/f10/authored-use-reviews/chip-empty-context-requalification.json']) {
  reject('capture-or-owned-context-' + path, () => inspectSurfaceAsyncSources({root,
    readMember: name => name === path ? Buffer.concat([read(name), Buffer.from('\n')]) : read(name)}));
}
assert.deepEqual(report.subjects.map(n => n.sha), SURFACE_ASYNC_SHAS);
const pairs = report.subjects.flatMap(n => n.pairs), hooks = report.subjects.flatMap(n => n.hookPairs);
assert.equal(pairs.length, 188); assert.equal(pairs.filter(n => n.unchanged_complete_callback_semantics).length, 147);
assert.equal(pairs.filter(n => n.exact_predicate_expressions_equal).length, 188);
assert.equal(hooks.length, 15); assert.equal(hooks.filter(n => n.before_sha256 !== n.after_sha256).length, 7);
assert.equal(report.subjects.reduce((n, row) => n + row.fixtureClasses.length, 0), 47);
assert.equal(pairs.flatMap(n => n.after.steps).filter(n => n.text === 'await wait(300);').length, 5);
assert.equal(pairs.flatMap(n => n.before.steps).filter(n => n.text === 'tick(250);').length, 5);
assert.equal(pairs.flatMap(n => n.after.steps).filter(n => n.text === 'await fixture.whenStable();').length, 6);
assert.equal(report.subjects[0].trustChecks.length, 3);
assert.ok(report.subjects[2].retained_expansion_waitForAsync_binding_and_setup);
const result = {schema_version: 1, line: report.line, complete_original_files: 4, complete_original_hunks: 71,
  static_occurrences_paired: 188, unchanged_complete_callbacks: 147, exact_predicate_expressions_equal: 188,
  setup_hooks_reviewed: 15, changed_hook_wrappers: 7, fixture_class_bodies_preserved: 47,
  individually_recorded250_to300ms_waits: 5, new_stability_waits: 6, unchanged_icon_trust_cases: 3,
  controls: controls.length, cases: controls, owned_product_members: 1141, current_owned_cases_preserved: 2223,
  helper_sha256: hash(read('scripts/spec-surface-async-source-review.mjs')),
  producer_sha256: hash(read('tests/spec_surface_async_source_probe.mjs')),
  production_HTML_CSS_SCSS_or_template_changes: 0, actual_Angular_native_artifact_or_floor_qualified: false,
  security_clearance: 'not-passed', g11_claim: 'not-passed'};
const out = process.argv.indexOf('--out');
if (out >= 0) writeFileSync(process.argv[out + 1], JSON.stringify(result, null, 2) + '\n', {flag: 'wx'});
console.log(JSON.stringify({...result, cases: undefined}));
