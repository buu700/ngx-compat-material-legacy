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
import {dirname, resolve} from 'node:path';
import {fileURLToPath} from 'node:url';
import {gzipSync, gunzipSync} from 'node:zlib';
import {reviewProviderAnnotations} from '../scripts/provider-annotation-type-review.mjs';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const read = path => readFileSync(resolve(root, path));
const hash = raw => createHash('sha256').update(raw).digest('hex');
const subjects = JSON.parse(read('compatibility/rc/provider-declaration-subjects.json'));
const report = reviewProviderAnnotations({root});
assert.equal(report.cases.length, 3);
assert.equal(report.cases.flatMap(row => row.constants).length, 4);
assert.equal(report.strict_assignments, 52); assert.equal(report.strict_equalities, 26);
assert.equal(report.cases.filter(row => row.population === 'frozen').length, 2);
assert.equal(report.cases.filter(row => row.population === 'additional').length, 1);
assert.ok(report.cases.every(row => row.emits.length === 2 && row.emits.every(e => e.emit_sha256 === e.without_Provider_import_sha256)));
const path = 'projects/ngx-material-legacy/legacy-checkbox/internal/checkbox-required-validator.ts';
const raw = read(path).toString(), mutations = [];
function reject(id, expected, overrides, subjectData = subjects) {
  assert.throws(() => reviewProviderAnnotations({root, subjectData, readSource: p => overrides[p] ?? read(p)}), expected, id);
  mutations.push({id, rejected: true});
}
reject('runtime-reference', /top-level const annotation/, {[path]: raw + '\nconsole.log(Provider);\n'});
reject('constructor-reference', /top-level const annotation/, {[path]: raw + '\nclass Extra { constructor(value: Provider) {} }\n'});
reject('generic-annotation', /top-level const annotation/, {[path]: raw.replace(': Provider =', ': Provider<unknown> =')});
reject('extra-top-level-reference', /exact Provider const roster/, {[path]: raw + '\nconst extra: Provider = {};\n'});
reject('nested-const-reference', /top-level const annotation/, {[path]: raw + '\nfunction extra() { const value: Provider = {}; }\n'});
reject('non-const-reference', /top-level const annotation/, {[path]: raw.replace('export const MAT_CHECKBOX', 'export let MAT_CHECKBOX')});
reject('wrong-constant', /exact Provider const roster/, {[path]: raw.replaceAll('MAT_CHECKBOX_REQUIRED_VALIDATOR', 'DIFFERENT_VALIDATOR')});
reject('missing-import', /missing\/ambiguous Provider import/, {[path]: raw.replace(', Provider}', '}')});
reject('ambiguous-import', /missing\/ambiguous Provider import/, {[path]: raw + "\nimport type {Provider as ExtraProvider} from '@angular/core';\n"});
const subject = subjects.subjects.find(s => s.line === report.line);
reject('stale-chunk', /declaration bytes changed/, {[subject.path]: Buffer.concat([read(subject.path), Buffer.from('changed')])});
reject('stale-barrel', /public barrel bytes changed/, {[subject.root_path]: read(subject.root_path).toString() + '\n'});
function changedSubject(id, edit, expected) {
  const model = structuredClone(subjects), changed = model.subjects.find(s => s.line === report.line);
  const before = gunzipSync(read(changed.path)).toString(), after = edit(before);
  assert.notEqual(before, after, 'mutation must affect genuine declaration');
  const stored = gzipSync(after); changed.sha256 = hash(stored); changed.raw_sha256 = hash(after); changed.bytes = Buffer.byteLength(after);
  reject(id, expected, {[changed.path]: stored}, model);
}
changedSubject('changed-provider-union', s => s.replace('type Provider = TypeProvider | ValueProvider', 'type Provider = ValueProvider'), /Provider closure shape changed/);
changedSubject('changed-dependent-field', s => s.replace('useValue: any;', 'useValue: unknown;'), /Provider closure shape changed/);
changedSubject('changed-constructor-type', s => s.replace('new (...args: any[]): T;', 'new (...args: unknown[]): T;'), /Provider closure shape changed/);
changedSubject('unreviewed-type-dependency', s => s.replace('useExisting: any;', 'useExisting: InjectionToken<unknown>;'), /unreviewed type closure/);
changedSubject('nonpublic-chunk-provider', s => s.replace(/(export (?:type )?\{[^}]*?)\bProvider,/, '$1'), /declaration is not publicly reexported/);
changedSubject('deprecated-provider', s => s.replace('type Provider =', '/** @deprecated */\ntype Provider ='), /private\/deprecated declaration/);
const changedModel = structuredClone(subjects), changedRoot = changedModel.subjects.find(s => s.line === report.line);
const barrel = read(changedRoot.root_path).toString(), wrongAlias = barrel.replace('Type$1 as Type,', 'Type as Type,');
assert.notEqual(barrel, wrongAlias); changedRoot.root_sha256 = hash(wrongAlias);
reject('local-Function-alias-instead-of-public-Type', /wrong public type alias/, {[changedRoot.root_path]: wrongAlias}, changedModel);
report.mutations = mutations;
report.producer_sha256 = hash(read('tests/provider_annotation_type_probe.mjs'));
report.helper_sha256 = hash(read('scripts/provider-annotation-type-review.mjs'));
report.g11_claim = 'not-passed';
if (process.argv[2]) writeFileSync(process.argv[2], JSON.stringify(report, null, 2) + '\n', {flag: 'wx'});
console.log(JSON.stringify({line: report.line, uses: report.cases.length, constants: 4,
  assignments: report.strict_assignments, equalities: report.strict_equalities, mutants_rejected: mutations.length,
  actual_provider_DI_Angular_AOT_native_packed_or_floor_execution: false}));
