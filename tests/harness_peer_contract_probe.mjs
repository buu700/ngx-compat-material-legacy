/**
 * @license
 * Copyright Google LLC All Rights Reserved.
 * Copyright (c) 2026 Ryan Lester.
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.io/license
 */
/** Actual public key objects,original/owned forwarding and changed type controls. */
import assert from 'node:assert/strict';
import {existsSync, readFileSync, writeFileSync} from 'node:fs';
import {dirname, join, resolve} from 'node:path';
import {fileURLToPath} from 'node:url';
import {harnessPeerSubjects, keyForwardingContexts, reviewHarnessPeerContracts} from '../scripts/harness-peer-contract-review.mjs';
const root = resolve(dirname(fileURLToPath(import.meta.url)), '..'), read = path => readFileSync(join(root, path), 'utf8'), options = {};
const args = process.argv.slice(2);
for (let index = 0; index < args.length; index += 2) {assert.ok(['--report', '--compiler-root'].includes(args[index]) && args[index + 1]); options[args[index]] = args[index + 1];}
const compilerRoot = options['--compiler-root'] ?? process.env.CLOSEOUT_TYPESCRIPT_ROOT;
const subjects = await harnessPeerSubjects(root), report = await reviewHarnessPeerContracts({root, subjects, compilerRoot});
assert.equal(report.uses, 14); assert.equal(report.key_contexts.length, 12); assert.equal(report.source_override_used, false);
assert.deepEqual(report.key_contexts.map(c => c.cases.length), [5, 10, 5, 6, 5, 10, 5, 6, 5, 10, 5, 6]);
const mutations = [];
for (const model of subjects.models.filter(m => m.subject.line !== 'original')) for (const key of ['ESCAPE', 'DELETE']) {
  const changed = {...model, runtime: {...model.runtime, TestKey: {...model.runtime.TestKey, [key]: model.runtime.TestKey[key] + 1}}};
  await assert.rejects(keyForwardingContexts(root, [changed], read), assert.AssertionError);
  mutations.push({id: model.subject.line + ':wrong-' + key, rejected: true});
}
const file = 'projects/ngx-material-legacy/legacy-tooltip/testing/tooltip-harness-base.ts', text = read(file);
for (const [id, changed, pattern] of [
  ['private-type-import', text.replace("from '@angular/cdk/testing'", "from '@angular/cdk/private-testing'"), /missing\/ambiguous peer contract import/],
  ['duplicate-type-import', text + "\nimport {TestElement as Duplicate} from '@angular/cdk/testing';\n", /missing\/ambiguous peer contract import/],
  ['runtime-type-alias', text + '\nconst Borrowed = TestElement;\n', /interface is implemented or used at runtime/],
  ['element-interface-implementation', text + '\nclass Borrowed implements TestElement {}\n', /interface is implemented or used at runtime/],
  ['new-editor-call', text + '\nfunction borrowed(e:any){e.setContenteditableValue("x");}\n', /new peer member requires separate review/],
  ['new-bracket-editor-call', text + '\nfunction borrowed(e:any){e["setContenteditableValue"]("x");}\n', /new peer member requires separate review/],
  ['new-count-call', text + '\nfunction borrowed(e:any){e.countHarnesses({});}\n', /new peer member requires separate review/],
]) {
  assert.notEqual(changed, text);
  await assert.rejects(reviewHarnessPeerContracts({root, subjects, skipDiagnostics: true, readSource: path => path === file ? changed : read(path)}), pattern);
  mutations.push({id, rejected: true});
}
const keyFile = 'projects/ngx-material-legacy/legacy-chips/testing/chip-harness.ts', keys = read(keyFile);
for (const [id, changed, pattern] of [
  ['type-only-runtime-key', keys.replace(', TestKey}', ', type TestKey}'), /key enum imported as type only/],
  ['unreviewed-key-member', keys.replace('TestKey.DELETE', 'TestKey.ENTER'), /unreviewed key enum access/],
  ['key-member-alias', keys + '\nconst Borrowed = TestKey.DELETE;\n', /directly forwarded to sendKeys/],
]) {
  assert.notEqual(changed, keys);
  await assert.rejects(reviewHarnessPeerContracts({root, subjects, skipDiagnostics: true, readSource: path => path === keyFile ? changed : read(path)}), pattern);
  mutations.push({id, rejected: true});
}
const changedForwarding = keys.replace('sendKeys(TestKey.DELETE)', 'sendKeys(TestKey.DELETE, "extra")');
await assert.rejects(keyForwardingContexts(root, subjects.models, path => path === keyFile ? changedForwarding : read(path)), /forwarding method differs from untouched tag/);
mutations.push({id: 'extra-forwarded-key', rejected: true});
const aliasText = text.replace('ComponentHarness, TestElement}', 'ComponentHarness, TestElement as Element}').replace('Promise<TestElement', 'Promise<Element');
const alias = await reviewHarnessPeerContracts({root, subjects, skipDiagnostics: true, readSource: path => path === file ? aliasText : read(path)});
assert.equal(alias.cases.find(c => c.file === 'legacy-tooltip/testing/tooltip-harness-base.ts').local_name, 'Element');
report.alias_positive = true; report.mutations = mutations; assert.equal(mutations.length, 15);
if (options['--report']) {assert.equal(existsSync(options['--report']), false); writeFileSync(options['--report'], JSON.stringify(report, null, 2) + '\n');}
console.log(JSON.stringify({line: report.line, uses: 14, population: report.population, subjects: 3, key_contexts: 12,
  original_and_owned_protocol_cases_per_subject: 52, mutations: mutations.length, compiler: report.type_compilation.compiler, native_executed: false}));
