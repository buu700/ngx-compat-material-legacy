/**
 * @license
 * Copyright Google LLC All Rights Reserved.
 * Copyright (c) 2026 Ryan Lester.
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.io/license
 */
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {readFileSync, writeFileSync} from 'node:fs';
import {gunzipSync} from 'node:zlib';
import {resolve} from 'node:path';
import {fileURLToPath} from 'node:url';
import {inspectThemingSources, themingPins, reviewThemingSubject, observeThemingSubject,
  inspectThemingOwnedContext, sassSourceFacts} from '../scripts/mixed-theming-source-review.mjs';
const root = fileURLToPath(new URL('..', import.meta.url)), prefix = 'compatibility/rc/mixed-theming-source-';
const read = p => readFileSync(resolve(root, p)), hash = v => createHash('sha256').update(v).digest('hex');
const originals = JSON.parse(gunzipSync(read(prefix + 'subjects.json.gz'))).subjects;
const pins = themingPins({root}), actual = inspectThemingSources({root}), cases = [];
assert.deepEqual(actual.subjects.map(n => [n.cases_before, n.unchanged_complete_callbacks]), [[26, 1], [44, 41], [18, 17], [53, 52]]);
assert.equal(actual.retained_source_case_identities, 141); assert.equal(actual.unchanged_complete_source_callbacks, 111);
assert.equal(actual.owned_product_members, 1141); assert.equal(actual.current_required_historical_case_ids, 2228);
assert.equal(actual.actual_Sass_Angular_native_artifact_browser_SSR_or_floor_qualified, false);
function reject(id, fn) {assert.throws(fn, undefined, id); cases.push({id, result: 'rejected'});}
for (const [index, subject] of originals.entries()) {
  for (const [i, member] of subject.members.entries()) {
    const changed = structuredClone(subject); changed.members[i].after.text += '\n/* unreviewed full-source drift */\n';
    reject(subject.sha + ':' + member.path + ':after-drift', () => reviewThemingSubject(changed, index, pins.subjects[index]));
    const both = structuredClone(subject); both.members[i].before.text += '\n/* unreviewed source */\n'; both.members[i].after.text += '\n/* unreviewed source */\n';
    reject(subject.sha + ':' + member.path + ':synchronized-drift', () => reviewThemingSubject(both, index, pins.subjects[index]));
  }
  const i = subject.members.findIndex(n => n.path.endsWith('.spec.ts')), changed = structuredClone(subject);
  changed.members[i].after.text = changed.members[i].after.text.replace(/\bit\(/, 'xit(');
  assert.notEqual(changed.members[i].after.text, subject.members[i].after.text);
  reject(subject.sha + ':disabled-case', () => observeThemingSubject(changed, index));
  const cleanup = structuredClone(subject); cleanup.members[i].after.text += '\nafterEach(() => { throw Error("cleanup drift"); });\n';
  reject(subject.sha + ':cleanup-hook', () => reviewThemingSubject(cleanup, index, pins.subjects[index]));
}
for (const ref of JSON.parse(read(prefix + 'intake.json')).owned_context_read)
  reject('owned-M2-tool-oracle-context:' + ref.path, () => inspectThemingOwnedContext({root,
    readMember: p => p === ref.path ? Buffer.concat([read(p), Buffer.from('\n/* context drift */\n')]) : read(p)}));
const stylePath = 'projects/ngx-material-legacy/styles/bridges/_companion-overrides.scss';
for (const [id, extra] of [
  ['experimental-M3-import', "\n@use '@angular/material-experimental' as matx;\n"],
  ['current-Material-facade-forward', "\n@forward '@angular/material';\n"],
  ['current-m2-call-through', '\n.test { color: mat.m2-get-color-from-palette($palette, 500); }\n'],
  ['new-inspection-call', '\n.test { color: mat.get-theme-color($theme, primary); }\n'],
]) reject(id, () => inspectThemingOwnedContext({root,
  readMember: p => p === stylePath ? Buffer.concat([read(p), Buffer.from(extra)]) : read(p)}));
for (const [index, suffix, before, after] of [
  [2, '/_m3-palettes.scss', '#000000', '#010203'],
  [1, '/_definition.scss', 'm3-palettes.$purple-palette', 'm3-palettes.$red-palette'],
  [2, '/_config-validation.scss', '(theme-type, primary, tertiary)', '(theme-type, primary, secondary, tertiary)'],
  [2, '/_m3-tokens.scss', 'map.get($primary, secondary)', 'map.get($tertiary, secondary)'],
]) {
  const changed = structuredClone(originals[index]), member = changed.members.find(n => n.path.endsWith(suffix));
  assert.ok(member.after.text.includes(before)); member.after.text = member.after.text.replace(before, after);
  reject(originals[index].sha + ':' + suffix + ':individual-contract-drift', () => reviewThemingSubject(changed, index, pins.subjects[index]));
}
for (const [id, text] of [
  ['unterminated-function', '@function f() { @return 1;'],
  ['mismatched-function-pair', '@function f() { @return (x]; }'],
  ['unterminated-map', '$palette: (0: #000;'],
  ['unterminated-string', "$palette: 'unterminated;"],
  ['duplicate-function', '@function f() { @return 1; }\n@function f() { @return 2; }'],
  ['unterminated-map-comment', '$palette: (/* unclosed );'],
]) reject('source-span-' + id, () => sassSourceFacts(text));
{
  const path = 'projects/ngx-material-legacy/package.json', manifest = JSON.parse(read(path)); manifest.engines.node = '>=24.0.0 <25.0.0';
  reject('private-tool-engine-imposed-on-consumers', () => inspectThemingOwnedContext({root,
    readMember: p => p === path ? Buffer.from(JSON.stringify(manifest)) : read(p)}));
}
{
  const path = prefix + originals[3].sha + '.original.patch';
  reject('raw-EOF-diff-marker-drift', () => inspectThemingSources({root,
    readMember: p => p === path ? Buffer.from(read(p).toString().replace('\\ No newline at end of file\n', '')) : read(p)}));
}
assert.equal(cases.length, 90);
const report = {schema_version: 1, line: actual.line,
  helper: {path: 'scripts/mixed-theming-source-review.mjs', sha256: hash(read('scripts/mixed-theming-source-review.mjs'))},
  producer: {path: 'tests/mixed_theming_source_probe.mjs', sha256: hash(read('tests/mixed_theming_source_probe.mjs'))}, negative_controls: 90, cases,
  retained_source_case_identities: 141, unchanged_complete_source_callbacks: 111,
  actual_Sass_Angular_native_artifact_browser_SSR_or_floor_qualified: false, g11_claim: 'not-passed'};
if (process.argv[2]) writeFileSync(process.argv[2], JSON.stringify(report, null, 2) + '\n', {flag: 'wx'});
console.log(JSON.stringify({line: actual.line, negative_controls: 90, retained_cases: 141, actual_runtime_qualified: false}));
