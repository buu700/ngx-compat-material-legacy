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
import {inspectGlobalZonelessSources, globalZonelessPins, reviewGlobalZonelessSubject, pairGlobalZonelessCases,
  inspectGlobalZonelessOwnedContext, projectGlobalZonelessProviders, compareGlobalZonelessMetadata} from '../scripts/mixed-global-zoneless-source-review.mjs';
const root = fileURLToPath(new URL('..', import.meta.url)), prefix = 'compatibility/rc/mixed-global-zoneless-source-';
const read = p => readFileSync(resolve(root, p)), hash = x => createHash('sha256').update(x).digest('hex');
const original = JSON.parse(gunzipSync(read(prefix + 'subjects.json.gz'))).subjects[0], notes = JSON.parse(read(prefix + 'source-read-notes.json'));
const pins = globalZonelessPins({root}), actual = inspectGlobalZonelessSources({root}), cases = [];
assert.equal(actual.retained_source_case_identities, 4232); assert.equal(actual.unchanged_complete_source_callbacks, 4105);
assert.equal(actual.subject.source_provider_projection_equal_files, 86); assert.equal(actual.subject.individually_read_residual_files, 44);
assert.equal(actual.subject.dependency_metadata.package_changes.length, 11); assert.equal(actual.subject.dependency_metadata.lock_unchanged_lexical_sections.length, 2286);
assert.equal(actual.owned_product_members, 1141); assert.equal(actual.current_required_historical_case_ids, 2228);
assert.equal(actual.actual_Angular_compiler_native_artifact_browser_SSR_or_floor_qualified, false);
function reject(id, fn) {assert.throws(fn, undefined, id); cases.push({id, result: 'rejected'});}
function change(path, mutate) {const member = original.members.find(n => n.path === path); assert.ok(member);
  const edited = structuredClone(member); mutate(edited); assert.notDeepEqual(edited, member);
  return {...original, members: original.members.map(n => n === member ? edited : n)};}
const afterCases = originalEnvironmentCases({members: original.members.filter(n => n.path.endsWith('.spec.ts'))}, 'after');
for (const critical of notes.critical_assertion_changes) {
  const row = afterCases.find(n => n.key === critical.key); assert.ok(row.raw.includes('expect('));
  const changed = change(critical.path, n => {assert.ok(n.after.text.includes(row.raw)); n.after.text = n.after.text.replace(row.raw, row.raw.replace('expect(', 'expect(1 || '));});
  reject('changed-critical-callback:' + critical.key, () => pairGlobalZonelessCases(changed, notes));
}
for (const ref of pins.owned_context[actual.line].owned_context)
  reject('owned-public-runner-toolchain:' + ref.path, () => inspectGlobalZonelessOwnedContext({root,
    readMember: p => p === ref.path ? Buffer.concat([read(p), Buffer.from('\n/* context drift */\n')]) : read(p)}));
{
  const projected = actual.subject.source_provider_preparation_projections.find(n => n.whole_source_equal_after_exact_provider_preparation_projection && n.after.exclusions.some(x => x.raw.startsWith('beforeEach(() => {')));
  assert.ok(projected); const member = original.members.find(n => n.path === projected.path), before = projectGlobalZonelessProviders(member.before.text, false);
  for (const [id, mutate] of [
    ['provider-options-not-default', text => text.replace('provideZoneChangeDetection()', 'provideZoneChangeDetection({eventCoalescing: true})')],
    ['provider-import-not-core', text => text.replace("'@angular/core'", "'unreviewed-core'")],
    ['extra-operation-in-provider-hook', text => {const hook = projected.after.exclusions.find(x => x.raw.startsWith('beforeEach(() => {')).raw;
      return text.replace(hook, hook.replace('() => {', '() => { throw Error("extra hook effect");'));}],
  ]) {
    const changed = mutate(member.after.text); assert.notEqual(changed, member.after.text);
    reject(id, () => assert.equal(before.whole_source_projection_sha256, projectGlobalZonelessProviders(changed, true).whole_source_projection_sha256));
  }
}
{
  const changed = change('package.json', n => {const data = JSON.parse(n.after.text); data.scripts.unreviewed = 'unreviewed-command'; n.after.text = JSON.stringify(data);});
  reject('package-change-outside11-prereleases', () => compareGlobalZonelessMetadata(changed));
  const key = actual.subject.dependency_metadata.lock_unchanged_lexical_sections.find(n => n.key !== '<preamble>').key;
  const lock = change('yarn.lock', n => {assert.ok(n.after.text.includes(key + '\n')); n.after.text = n.after.text.replace(key + '\n', key + '\n  unexpected "value"\n');});
  reject('unreviewed-shared-lock-section', () => compareGlobalZonelessMetadata(lock));
}
{
  const changed = change('src/material/chips/testing/chip-row-harness.spec.ts', n => {
    const from = '<mat-chip-row [editable]="editable">'; assert.ok(n.after.text.includes(from)); n.after.text = n.after.text.replace(from, '<mat-chip-row [editable]="editable()">');
  });
  reject('silently-repaired-original-partial-signal-binding', () => reviewGlobalZonelessSubject(changed, notes, pins.subject));
}
for (const suffix of ['subjects.json.gz', 'observation-pins.json.gz', 'source-read-notes.json'])
  reject('bound-source-capsule:' + suffix, () => inspectGlobalZonelessSources({root,
    readMember: p => p === prefix + suffix ? Buffer.concat([read(p), Buffer.from('drift')]) : read(p)}));
{
  const row = afterCases[0];
  for (const [id, replacement] of [['disabled-original-case', row.raw.replace(/^it\(/, 'xit(')], ['missing-original-case', 'void 0;'], ['extra-original-case', row.raw + '\nit("unreviewed extra case", () => {});']]) {
    assert.notEqual(replacement, row.raw);
    const changed = change(row.path, n => {assert.ok(n.after.text.includes(row.raw)); n.after.text = n.after.text.replace(row.raw, replacement);});
    reject(id, () => pairGlobalZonelessCases(changed, notes));
  }
}
assert.equal(cases.length, 33);
const report = {schema_version: 1, line: actual.line,
  helper: {path: 'scripts/mixed-global-zoneless-source-review.mjs', sha256: hash(read('scripts/mixed-global-zoneless-source-review.mjs'))},
  producer: {path: 'tests/mixed_global_zoneless_source_probe.mjs', sha256: hash(read('tests/mixed_global_zoneless_source_probe.mjs'))},
  negative_controls: cases.length, cases, retained_source_case_identities: 4232, unchanged_complete_source_callbacks: 4105, critical_assertion_changes: 8,
  actual_Angular_compiler_native_artifact_browser_SSR_or_floor_qualified: false, g11_claim: 'not-passed'};
if (process.argv[2]) writeFileSync(process.argv[2], JSON.stringify(report, null, 2) + '\n', {flag: 'wx'});
console.log(JSON.stringify({line: actual.line, negative_controls: cases.length, retained_cases: 4232, actual_runtime_qualified: false}));
