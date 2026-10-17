/**
 * @license
 * Copyright Google LLC All Rights Reserved.
 * Copyright (c) 2026 Ryan Lester.
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.io/license
 */
import assert from 'node:assert/strict';
import {readFileSync, writeFileSync} from 'node:fs';
import {gunzipSync} from 'node:zlib';
import {createHash} from 'node:crypto';
import {resolve} from 'node:path';
import {fileURLToPath} from 'node:url';
import {inspectMixedCdkSources, mixedCdkPins, reviewMixedCdkSubject,
  inspectMixedCdkFloor, inspectMixedOwnedScope} from '../scripts/mixed-cdk-behavior-source-review.mjs';
const root = fileURLToPath(new URL('..', import.meta.url)), prefix = 'compatibility/rc/mixed-cdk-behavior-source-';
const read = path => readFileSync(resolve(root, path)), hash = x => createHash('sha256').update(x).digest('hex');
const originals = JSON.parse(gunzipSync(read(prefix + 'subjects.json.gz'))).subjects;
const floors = JSON.parse(gunzipSync(read(prefix + 'published-peer-floors.json.gz'))).floors;
const pins = mixedCdkPins({root}), actual = inspectMixedCdkSources({root});
assert.deepEqual(actual.subjects.map(n => [n.cases_before, n.cases_after, n.unchanged_complete_retained_callbacks]),
  [[63, 67, 59], [89, 90, 89], [90, 91, 88], [15, 15, 15]]);
assert.equal(actual.owned_scope.source_members, 1028); assert.equal(actual.owned_product_members, 1141);
assert.equal(actual.current_required_historical_case_ids, 2228);
assert.equal(actual.actual_Angular_native_artifact_browser_SSR_or_floor_qualified, false);
const cases = [];
function reject(id, fn) {assert.throws(fn, undefined, id); cases.push({id, result: 'rejected'});}
for (const [index, subject] of originals.entries()) {
  for (const [i, member] of subject.members.entries()) {
    const mutate = text => member.path.endsWith('.spec.ts') ? text.replace(/\bexpect\(/, 'expect(999, ') :
      text + (member.path.endsWith('.md') ? '\nUnreviewed API declaration.\n' : '\nthrow new Error("unreviewed source operation");\n');
    const after = structuredClone(subject); after.members[i].after.text = mutate(after.members[i].after.text);
    assert.notEqual(after.members[i].after.text, member.after.text);
    reject(subject.sha + ':' + member.path + ':after-frame-drift', () => reviewMixedCdkSubject(after, index, pins.subjects[index]));
    const both = structuredClone(subject);
    both.members[i].before.text = mutate(both.members[i].before.text); both.members[i].after.text = mutate(both.members[i].after.text);
    reject(subject.sha + ':' + member.path + ':synchronized-before-after-drift', () => reviewMixedCdkSubject(both, index, pins.subjects[index]));
  }
  const spec = subject.members.findIndex(n => n.path.endsWith('.spec.ts'));
  const disabled = structuredClone(subject); disabled.members[spec].after.text = disabled.members[spec].after.text.replace(/\bit\(/, 'xit(');
  reject(subject.sha + ':disabled-regression', () => reviewMixedCdkSubject(disabled, index, pins.subjects[index]));
  const hook = structuredClone(subject); hook.members[spec].after.text += '\nafterEach(() => { throw Error("cleanup drift"); });\n';
  reject(subject.sha + ':cleanup-hook-drift', () => reviewMixedCdkSubject(hook, index, pins.subjects[index]));
}
const originalRuntimeChanges = [
  ['filter(records => !!records.length)', 'filter(records => true)'],
  ['slice(0, this._selectedIndex)', 'slice(1, this._selectedIndex)'],
  ['this._selectedIndex !== index', 'this._selectedIndex === index'],
  ['signal(false)', 'signal(true)'],
];
for (const [index, [before, after]] of originalRuntimeChanges.entries()) {
  const changed = structuredClone(originals[index]);
  const m = changed.members.find(n => n.path === pins.subjects[index].observation.runtime_path);
  assert.ok(m.after.text.includes(before)); m.after.text = m.after.text.replace(before, after);
  reject(changed.sha + ':runtime-contract-drift', () => reviewMixedCdkSubject(changed, index, pins.subjects[index]));
}
function mutateFloor(floor, area, rewrite, jsOnly = false) {
  const changed = structuredClone(floor), source = changed.mapped_sources.find(n => n.public_entry.endsWith('/' + area));
  const js = changed.members.find(n => n.archive_member === 'package/fesm2022/' + area + '.mjs');
  const update = row => {row.sha256 = hash(row.text); row.bytes = Buffer.byteLength(row.text);};
  const text = rewrite(js.text); assert.notEqual(text, js.text, 'JS mutation missed'); js.text = text; update(js);
  if (!jsOnly) {
    const text = rewrite(source.text); assert.notEqual(text, source.text, 'mapped source mutation missed');
    source.text = text; source.source_sha256 = hash(text);
    const map = changed.members.find(n => n.archive_member === source.source_map_member), mapping = JSON.parse(map.text);
    mapping.sourcesContent[mapping.sources.indexOf(source.source_map_path)] = text;
    map.text = JSON.stringify(mapping); update(map);
  }
  return changed;
}
const mutations = [
  ['comment-character-data-filter', 'observers', t => t.replace(/record\.type === (['"])characterData\1/, "record.type === 'attributes'")],
  ['noncomment-filter-negation', 'observers', t => t.replace('!shouldIgnoreRecord(record)', 'shouldIgnoreRecord(record)')],
  ['empty-observer-batch-delivery', 'observers', t => t.replace('!!records.length', 'true')],
  ['observer-delivery-zone', 'observers', t => t.replace('this._ngZone.run(', 'this._ngZone.runOutsideAngular(')],
  ['selected-index-getter-offset', 'stepper', t => t.replace('return this._selectedIndex();', 'return this._selectedIndex() + 1;')],
  ['selected-index-initial-value', 'stepper', t => t.replace('_selectedIndex = signal(0', '_selectedIndex = signal(1')],
  ['unchanged-index-interaction-guard', 'stepper', t => t.replace('this.selectedIndex !== index', 'this.selectedIndex === index')],
  ['linear-visited-range', 'stepper', t => t.replace('slice(0, this._selectedIndex())', 'slice(1, this._selectedIndex())')],
  ['linear-interaction-action', 'stepper', t => t.replace('step._markAsInteracted();', 'step.reset();')],
  ['disabled-initial-state', 'accordion', t => t.replace('_disabled = signal(false', '_disabled = signal(true')],
  ['disabled-setter-coercion', 'accordion', t => t.replace('this._disabled.set(value);', 'this._disabled.set(!value);')],
  ['disabled-getter-value', 'accordion', t => t.replace('return this._disabled();', 'return false;')],
  ['compiler-debug-metadata-not-arbitrary-options', 'stepper', t => t.replace('debugName: "_selectedIndex"', 'debugName: "changed"'), true],
  ['public-stepper-export-removed', 'stepper', t => t.replace(/export \{([^}]+)\}/, (_, values) =>
    'export {' + values.replace(/\bCdkStepper,?\s*/, '') + '}'), true],
];
for (const floor of floors) for (const [id, area, rewrite, jsOnly] of mutations) {
  const changed = mutateFloor(floor, area, rewrite, jsOnly);
  reject(floor.line + ':' + id, () => inspectMixedCdkFloor(changed, originals));
}
const ownedPath = 'projects/ngx-material-legacy/legacy-tabs/tabs-module.ts';
for (const [id, addition] of [['ordinary-cdk-fork', '\nclass ContentObserver {}\n'],
  ['owned-stepper-dependency', "\nimport {CdkStepper} from '@angular/cdk/stepper';\n"]])
  reject(id, () => inspectMixedOwnedScope({root, readMember: path => path === ownedPath ? Buffer.concat([read(path), Buffer.from(addition)]) : read(path)}));
assert.equal(cases.length, 64);
const report = {schema_version: 1, line: actual.line, source_decisions: 4, complete_original_files: 11,
  complete_original_hunks: 21, retained_cases: 257, added_cases: 6, unchanged_complete_retained_callbacks: 251,
  exact_published_minimum_source_and_shipped_JS_comparisons: 2, negative_controls: cases.length, cases,
  helper: {path: 'scripts/mixed-cdk-behavior-source-review.mjs', sha256: hash(read('scripts/mixed-cdk-behavior-source-review.mjs'))},
  producer: {path: 'tests/mixed_cdk_behavior_source_probe.mjs', sha256: hash(read('tests/mixed_cdk_behavior_source_probe.mjs'))},
  inherited_observer_runtime_delegation_admission_still_required: true,
  actual_Angular_native_artifact_browser_SSR_or_floor_qualified: false, g11_claim: 'not-passed'};
if (process.argv[2]) writeFileSync(process.argv[2], JSON.stringify(report, null, 2) + '\n', {flag: 'wx'});
console.log(JSON.stringify({...report, cases: undefined}));
