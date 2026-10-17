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
import {originalEnvironmentCases} from '../scripts/spec-test-environment-source-review.mjs';
import {inspectExplicitDetectionSources, explicitDetectionPins, projectExplicitDetectionFile,
  pairExplicitDetectionCases, inspectExplicitDetectionOwnedContext} from '../scripts/mixed-explicit-detection-source-review.mjs';
const root = fileURLToPath(new URL('..', import.meta.url)), prefix = 'compatibility/rc/mixed-explicit-detection-source-';
const read = p => readFileSync(resolve(root, p)), hash = x => createHash('sha256').update(x).digest('hex');
const original = JSON.parse(gunzipSync(read(prefix + 'subjects.json.gz'))).subjects[0], pins = explicitDetectionPins({root}), actual = inspectExplicitDetectionSources({root}), cases = [];
assert.equal(actual.retained_source_case_identities, 5964); assert.equal(actual.unchanged_complete_source_callbacks, 5959);
assert.equal(actual.subject.added_strategy_properties, 945); assert.equal(actual.subject.new_strategy_imports, 206);
assert.equal(actual.subject.existing_strategy_properties_preserved, 20); assert.equal(actual.subject.all220_whole_source_projections_equal, true);
assert.equal(actual.owned_product_members, 1141); assert.equal(actual.current_required_historical_case_ids, 2228);
assert.equal(actual.actual_Angular_compiler_native_artifact_browser_SSR_or_floor_qualified, false);
function reject(id, fn) {assert.throws(fn, undefined, id); cases.push({id, result: 'rejected'});}
function changedMember(path, mutate) {const source = original.members.find(n => n.path === path); assert.ok(source);
  const changed = structuredClone(source); mutate(changed); assert.notDeepEqual(changed, source); return changed;}
const sample = actual.subject.files.find(n => n.added_strategy_properties.length && n.newly_imported_strategy_bindings.length);
const declaration = sample.added_strategy_properties.find(n => original.members.find(m => m.path === sample.path).after.text.includes('class ' + n.owner)); assert.ok(declaration);
for (const [id, mutate] of [
  ['extra-module-operation', n => {n.after.text += '\nthrow Error("unreviewed operation");\n';}],
  ['unreviewed-strategy-value', n => {n.after.text = n.after.text.replace('changeDetection: ChangeDetectionStrategy.Eager', 'changeDetection: ChangeDetectionStrategy.OnPush');}],
  ['duplicate-strategy-property', n => {n.after.text = n.after.text.replace('changeDetection: ChangeDetectionStrategy.Eager', 'changeDetection: ChangeDetectionStrategy.Eager, changeDetection: ChangeDetectionStrategy.Eager');}],
  ['foreign-Core-strategy-import', n => {n.after.text = n.after.text.replace("'@angular/core'", "'unreviewed-core'");}],
  ['changed-Component-owner', n => {n.after.text = n.after.text.replace('class ' + declaration.owner, 'class UnreviewedOwner');}],
  ['unreviewed-property-in-Component-metadata', n => {n.after.text = n.after.text.replace('changeDetection: ChangeDetectionStrategy.Eager', 'changeDetection: ChangeDetectionStrategy.Eager, unreviewedMetadata: true');}],
]) reject(id, () => projectExplicitDetectionFile(changedMember(sample.path, mutate)));
{
  const existing = actual.subject.files.find(n => n.preserved_existing_strategy_properties.some(x => x.before.some(y => y.includes('ChangeDetectionStrategy.OnPush')))); assert.ok(existing);
  reject('changed-existing-OnPush-policy', () => projectExplicitDetectionFile(changedMember(existing.path, n => {n.after.text = n.after.text.replace('ChangeDetectionStrategy.OnPush', 'ChangeDetectionStrategy.Eager');})));
}
const afterCases = originalEnvironmentCases({members: original.members.filter(n => n.path.endsWith('.spec.ts'))}, 'after');
{
  const key = actual.subject.pairs.find(n => !n.complete_callback_semantics_equal).after.key, row = afterCases.find(n => n.key === key); assert.ok(row.raw.includes('expect('));
  reject('assertion-change-inside-local-Component-case', () => projectExplicitDetectionFile(changedMember(row.path, n => {n.after.text = n.after.text.replace(row.raw, row.raw.replace('expect(', 'expect(1 || '));})));
}
for (const ref of pins.owned_context[actual.line].owned_context)
  reject('owned-public-runner-toolchain:' + ref.path, () => inspectExplicitDetectionOwnedContext({root,
    readMember: p => p === ref.path ? Buffer.concat([read(p), Buffer.from('\n/* context drift */\n')]) : read(p)}));
{
  const row = afterCases.find(n => n.mode === 'it'); assert.ok(row);
  for (const [id, replacement] of [['disabled-original-case', row.raw.replace(/^it\b/, 'xit')], ['missing-original-case', 'void 0;'], ['extra-original-case', row.raw + '\nit("unreviewed extra case", () => {});']]) {
    assert.notEqual(replacement, row.raw); const member = changedMember(row.path, n => {assert.ok(n.after.text.includes(row.raw)); n.after.text = n.after.text.replace(row.raw, replacement);});
    const changed = {...original, members: original.members.map(n => n.path === row.path ? member : n)};
    reject(id, () => pairExplicitDetectionCases(changed));
  }
}
for (const suffix of ['subjects.json.gz', 'observation-pins.json.gz'])
  reject('bound-source-capsule:' + suffix, () => inspectExplicitDetectionSources({root,
    readMember: p => p === prefix + suffix ? Buffer.concat([read(p), Buffer.from('drift')]) : read(p)}));
assert.equal(cases.length, 26);
const report = {schema_version: 1, line: actual.line,
  helper: {path: 'scripts/mixed-explicit-detection-source-review.mjs', sha256: hash(read('scripts/mixed-explicit-detection-source-review.mjs'))},
  producer: {path: 'tests/mixed_explicit_detection_source_probe.mjs', sha256: hash(read('tests/mixed_explicit_detection_source_probe.mjs'))},
  negative_controls: cases.length, cases, retained_source_case_identities: 5964, unchanged_complete_source_callbacks: 5959,
  added_strategy_properties: 945, new_strategy_imports: 206, actual_Angular_compiler_native_artifact_browser_SSR_or_floor_qualified: false, g11_claim: 'not-passed'};
if (process.argv[2]) writeFileSync(process.argv[2], JSON.stringify(report, null, 2) + '\n', {flag: 'wx'});
console.log(JSON.stringify({line: actual.line, negative_controls: cases.length, retained_cases: 5964, actual_runtime_qualified: false}));
