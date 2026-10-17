/**
 * @license
 * Copyright Google LLC All Rights Reserved.
 * Copyright (c) 2026 Ryan Lester.
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.io/license
 */
import assert from 'node:assert/strict';
import {readFileSync, writeFileSync} from 'node:fs';
import {createHash} from 'node:crypto';
import {resolve} from 'node:path';
import {fileURLToPath} from 'node:url';
import {bootstrapBefore, publicFixtureReferenceFacts, compareBootstrapSource,
  exerciseBootstrapContract, BOOTSTRAP_PATH} from '../scripts/bootstrap-stability-contract.mjs';
const root = fileURLToPath(new URL('..', import.meta.url)), read = path => readFileSync(resolve(root, path));
const hash = bytes => createHash('sha256').update(bytes).digest('hex');
const before = bootstrapBefore({root}), source = read(BOOTSTRAP_PATH).toString();
const references = publicFixtureReferenceFacts({root}), delta = compareBootstrapSource(before.bootstrap.text, source);
const original = await exerciseBootstrapContract(before.bootstrap.text), current = await exerciseBootstrapContract(source);
assert.equal(original.passed, 5); assert.equal(original.failed, 3);
assert.deepEqual(original.cases.filter(n => n.result === 'fail').map(n => n.id),
  ['fakeAsync-marker/pending-resolution', 'fakeAsync-marker/pending-rejection', 'fakeAsync-marker/pending-destruction']);
assert.equal(current.passed, 8); assert.equal(current.failed, 0);
const cases = [];
const patch = body => source + '\nimport {ComponentFixture} from "@angular/core/testing";\n' +
  'const originalWhenStable = ComponentFixture.prototype.whenStable;\n' +
  'ComponentFixture.prototype.whenStable = function () {' + body + '};\n';
const mutants = [
  ['original-unconditional-fakeAsync-shortcut', before.bootstrap.text],
  ['always-resolve-stable', patch('return Promise.resolve(false);')],
  ['always-resolve-work-complete', patch('return Promise.resolve(true);')],
  ['swallow-framework-rejection', patch('return originalWhenStable.call(this).catch(() => false);')],
  ['inverted-stability-fast-path', patch('if (!this.isStable()) return Promise.resolve(false); return originalWhenStable.call(this);')],
  ['lose-public-method-receiver', patch('return originalWhenStable();')],
];
for (const [id, text] of mutants) {
  const result = await exerciseBootstrapContract(text); assert.ok(result.failed > 0, id);
  cases.push({id, result: 'rejected', contract_cases_failed: result.failed});
}
for (const [id, text] of [
  ['zone-preparation-drift', source.replace('providers: [provideZoneChangeDetection()]', 'providers: []')],
  ['metadata-reflection-drift', source.replace('metaFor(target).set(key, value);', 'metaFor(target).set(key, undefined);')],
]) {
  assert.notEqual(text, source); assert.throws(() => compareBootstrapSource(before.bootstrap.text, text));
  cases.push({id, result: 'rejected'});
}
const report = {schema_version: 1, line: before.line, scope: 'Owned bootstrap public-interface contract model and authenticated public framework source guards; no native/floor claim.',
  original_control: original, current_control: current, original_public_framework_references: references, exact_source_delta: delta,
  negative_controls: cases.length, cases, source_helper: {path: 'scripts/bootstrap-stability-contract.mjs', sha256: hash(read('scripts/bootstrap-stability-contract.mjs'))},
  producer: {path: 'tests/bootstrap_stability_probe.mjs', sha256: hash(read('tests/bootstrap_stability_probe.mjs'))},
  actual_Angular_fixture_fakeAsync_native_browser_SSR_or_floor_qualified: false, g11_claim: 'not-passed'};
if (process.argv[2]) writeFileSync(process.argv[2], JSON.stringify(report, null, 2) + '\n', {flag: 'wx'});
console.log(JSON.stringify({line: before.line, before_contract_cases_passed: original.passed, before_contract_cases_failed: original.failed,
  current_contract_cases_passed: current.passed, current_contract_cases_failed: current.failed, negative_controls: cases.length,
  actual_Angular_native_or_floor_qualified: false}));
