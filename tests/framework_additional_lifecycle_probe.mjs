/**
 * @license
 * Copyright Google LLC All Rights Reserved.
 * Copyright (c) 2026 Ryan Lester.
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.io/license
 */
/** Supplementary implements-only type boundaries; no lifecycle execution. */
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {readFileSync, writeFileSync} from 'node:fs';
import {dirname, resolve} from 'node:path';
import {fileURLToPath} from 'node:url';
import {ADDITIONAL_LIFECYCLE_USES, reviewAdditionalFrameworkLifecycleTypes,
  reviewFrameworkLifecycleTypes} from '../scripts/framework-lifecycle-type-review.mjs';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const read = path => readFileSync(resolve(root, path), 'utf8');
const hash = text => createHash('sha256').update(text).digest('hex');
const subjects = JSON.parse(read('compatibility/rc/framework-lifecycle-declaration-subjects.json'));
const original = reviewFrameworkLifecycleTypes({root});
assert.equal(original.cases.length, 96); assert.equal(original.sources.length, 38);
assert.equal(original.population, 'original-frozen-lifecycle-uses');
const report = reviewAdditionalFrameworkLifecycleTypes({root});
assert.equal(report.population, 'three-finite-additional-implements-bindings');
assert.equal(report.cases.length, 3); assert.equal(report.sources.length, 3);
assert.deepEqual(report.cases.map(row => [row.file, row.module, row.symbol]),
  ADDITIONAL_LIFECYCLE_USES.map(row => [row.file, row.module, row.symbol]));
assert.equal(report.strict_default_assignments, 40); assert.equal(report.strict_default_equalities, 20);
assert.equal(report.strict_dynamic_dictionary_lookups, 3);
for (const row of report.cases) assert.equal(row.reference_lines.length, 1);
for (const source of report.sources) assert.equal(source.emit_sha256, source.emit_without_selected_imports_sha256);
const path = 'projects/ngx-material-legacy/legacy-core/internal/legacy-viewport.ts', raw = read(path);
const mutations = [];
function reject(id, expected, overrides = {}, subjectData = subjects) {
  assert.throws(() => reviewAdditionalFrameworkLifecycleTypes({root, subjectData,
    readSource: member => overrides[member] ?? read(member)}), expected, id);
  mutations.push({id, rejected: true});
}
reject('runtime-value', /executable emit|runtime\/unsupported/, {[path]: raw + '\nconsole.log(OnDestroy);\n'});
reject('constructor-type-annotation', /exact class implements boundary/,
  {[path]: raw.replace('constructor(platform:', 'constructor(injected: OnDestroy, platform:')});
reject('extra-type-reference', /exact class implements boundary/,
  {[path]: raw + '\ntype Extra = OnDestroy;\n'});
reject('wrong-owner-class', /exact class implements boundary/,
  {[path]: raw.replace('class _LegacyViewport', 'class DifferentViewport')});
reject('generic-hook-interface', /modern generic type usage/,
  {[path]: raw.replace('implements OnDestroy', 'implements OnDestroy<unknown>')});
reject('missing-import', /missing\/ambiguous/,
  {[path]: raw.replace("import type {OnDestroy} from '@angular/core';", '')});
reject('ambiguous-import', /missing\/ambiguous/,
  {[path]: raw + "\nimport type {OnDestroy as OtherDestroy} from '@angular/core';\n"});
reject('required-hook-argument', /original zero-argument void/,
  {[path]: raw.replace('ngOnDestroy(): void', 'ngOnDestroy(required: string): void')});
reject('changed-hook-return', /original zero-argument void/,
  {[path]: raw.replace('ngOnDestroy(): void', 'ngOnDestroy(): unknown')});
reject('missing-hook-method', /missing owned lifecycle method/,
  {[path]: raw.replace('ngOnDestroy(): void', 'disposeInstead(): void')});
const subject = subjects.subjects.find(row => row.line === report.line);
reject('changed-minimum-declarations', /peer declaration subject changed/,
  {[subject.path]: read(subject.path) + '\n// stale declaration subject\n'});
const privateSubject = structuredClone(subjects);
privateSubject.subjects.find(row => row.line === report.line).symbols.OnDestroy.markers = ['deprecated'];
reject('deprecated-interface', /private\/deprecated public type/, {}, privateSubject);
const nonPublic = structuredClone(subjects);
nonPublic.subjects.find(row => row.line === report.line).symbols.OnInit.public_export = false;
reject('nonpublic-interface', /false.*true|Expected values/si, {}, nonPublic);
report.mutations = mutations;
report.previous_frozen_contract = {uses: original.cases.length, files: original.sources.length,
  assignments: original.strict_default_assignments, equalities: original.strict_default_equalities};
report.producer_sha256 = hash(read('tests/framework_additional_lifecycle_probe.mjs'));
report.helper_sha256 = hash(read('scripts/framework-lifecycle-type-review.mjs'));
report.actual_hook_DI_Angular_native_packed_or_floor_execution = false;
report.g11_claim = 'not-passed';
if (process.argv[2]) writeFileSync(process.argv[2], JSON.stringify(report, null, 2) + '\n', {flag: 'wx'});
console.log(JSON.stringify({line: report.line, uses: report.cases.length, files: report.sources.length,
  original_uses: original.cases.length, original_files: original.sources.length, mutants_rejected: mutations.length,
  assignments: report.strict_default_assignments, equalities: report.strict_default_equalities,
  actual_hook_DI_Angular_native_packed_or_floor_execution: false}));
