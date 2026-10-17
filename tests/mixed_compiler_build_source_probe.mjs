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
import {inspectCompilerBuildSources, compilerBuildPins, reviewCompilerBuildSubject, observeCompilerBuildSubject,
  inspectCompilerBuildOwnedContext, yamlSourceSections, goldenDeclarationSource} from '../scripts/mixed-compiler-build-source-review.mjs';
const root = fileURLToPath(new URL('..', import.meta.url)), prefix = 'compatibility/rc/mixed-compiler-build-source-';
const read = p => readFileSync(resolve(root, p)), hash = x => createHash('sha256').update(x).digest('hex');
const originals = JSON.parse(gunzipSync(read(prefix + 'subjects.json.gz'))).subjects;
const pins = compilerBuildPins({root}), actual = inspectCompilerBuildSources({root}), cases = [];
assert.deepEqual(actual.subjects.map(n => [n.cases_before, n.unchanged_complete_callbacks]), [[77, 77], [2, 1], [155, 155], [132, 132]]);
assert.equal(actual.retained_source_case_identities, 366); assert.equal(actual.unchanged_complete_source_callbacks, 365);
assert.equal(actual.owned_product_members, 1141); assert.equal(actual.current_required_historical_case_ids, 2228);
assert.equal(actual.actual_Sass_Angular_compiler_native_artifact_browser_SSR_or_floor_qualified, false);
function reject(id, fn) {assert.throws(fn, undefined, id); cases.push({id, result: 'rejected'});}
for (const [index, subject] of originals.entries()) {
  for (const [i, member] of subject.members.entries()) {
    const changed = structuredClone(subject); changed.members[i].after.text += '\n/* unreviewed complete-source drift */\n';
    reject(subject.sha + ':' + member.path + ':after-drift', () => reviewCompilerBuildSubject(changed, index, pins.subjects[index]));
    const both = structuredClone(subject); both.members[i].before.text += '\n/* unreviewed source */\n'; both.members[i].after.text += '\n/* unreviewed source */\n';
    reject(subject.sha + ':' + member.path + ':synchronized-drift', () => reviewCompilerBuildSubject(both, index, pins.subjects[index]));
  }
  const i = subject.members.findIndex(n => n.path.endsWith('.spec.ts')), changed = structuredClone(subject);
  changed.members[i].after.text = changed.members[i].after.text.replace(/\bit\(/, 'xit('); assert.notEqual(changed.members[i].after.text, subject.members[i].after.text);
  reject(subject.sha + ':disabled-case', () => observeCompilerBuildSubject(changed, index));
  const cleanup = structuredClone(subject); cleanup.members[i].after.text += '\nafterEach(() => { throw Error("cleanup drift"); });\n';
  reject(subject.sha + ':cleanup-hook', () => reviewCompilerBuildSubject(cleanup, index, pins.subjects[index]));
}
for (const ref of pins.owned_context[actual.line].owned_context)
  reject('owned-source-tool-migration-context:' + ref.path, () => inspectCompilerBuildOwnedContext({root,
    readMember: p => p === ref.path ? Buffer.concat([read(p), Buffer.from('\n/* context drift */\n')]) : read(p)}));
for (const ref of pins.owned_context[actual.line].compiler_configuration)
  reject('owned-compiler-policy:' + ref.path, () => assert.deepEqual(inspectCompilerBuildOwnedContext({root,
    readMember: p => p === ref.path ? Buffer.concat([read(p), Buffer.from('\n/* context drift */\n')]) : read(p)}), pins.owned_context[actual.line]));
for (const pin of actual.subjects[1].action_pin_substitutions) {
  const changed = structuredClone(originals[1]), member = changed.members.find(n => n.path === pin.path);
  member.after.text += '\n# unreviewed workflow/build operation\n';
  reject('exact-action-pin-only:' + pin.path, () => observeCompilerBuildSubject(changed, 1));
}
for (const member of originals[3].members.filter(n => n.path.startsWith('goldens/'))) {
  const changed = structuredClone(originals[3]), next = changed.members.find(n => n.path === member.path);
  const at = next.after.text.lastIndexOf('\n```'); assert.ok(at >= 0);
  next.after.text = next.after.text.slice(0, at) + '\nexport type UnreviewedContract = "change";\n' + next.after.text.slice(at);
  reject('declaration-population:' + member.path, () => observeCompilerBuildSubject(changed, 3));
  const header = structuredClone(originals[3]), doc = header.members.find(n => n.path === member.path);
  doc.after.text = doc.after.text.replace('## API Report File', '## Unreviewed API Report File'); assert.notEqual(doc.after.text, member.after.text);
  reject('golden-Markdown-surroundings:' + member.path, () => observeCompilerBuildSubject(header, 3));
}
for (const [index, path, from, to] of [
  [0, 'src/cdk/schematics/utils/project-main-file.ts', 'buildOptions.browser', 'buildOptions.main'],
  [0, 'src/cdk/schematics/utils/project-targets.ts', "build: '@angular-devkit/build-angular:application'", "build: '@angular-devkit/build-angular:browser'"],
  [0, 'tools/sass/local-sass-importer.ts', ') as URL;', ') as string;'],
  [1, 'src/cdk/scrolling/virtual-scroll-viewport.zone.spec.ts', 'afterNextRender(spy', 'afterEveryRender(spy'],
  [2, 'src/cdk/overlay/overlay.spec.ts', 'this.element?.classList', 'this.element.classList'],
  [2, 'src/material/timepicker/timepicker.ts', 'this._localeChanges?.unsubscribe()', 'this._localeChanges.unsubscribe()'],
  [2, 'src/cdk/menu/menu-item.spec.ts', "typeahead = '';", "typeahead = 'initial';"],
  [3, 'src/material/timepicker/timepicker.ts', 'viewChildren<MatOption<D>>', 'viewChildren<MatOption<any>>'],
  [3, 'src/cdk/listbox/listbox.ts', 'inject<CdkListbox<T>>(CdkListbox)', 'inject<CdkListbox<T>>(null)'],
]) {
  const changed = structuredClone(originals[index]), member = changed.members.find(n => n.path === path);
  assert.ok(member.after.text.includes(from)); member.after.text = member.after.text.replace(from, to);
  reject(index + ':' + path + ':individual-contract:' + from, () => reviewCompilerBuildSubject(changed, index, pins.subjects[index]));
}
const productPath = 'projects/ngx-material-legacy/legacy-button/button.ts';
for (const dependency of ['@angular/aria/tree', '@angular/cdk/listbox', '@angular/cdk/schematics', '@angular/material/timepicker'])
  reject('unowned-runtime-dependency:' + dependency, () => inspectCompilerBuildOwnedContext({root, readMember: p => p === productPath ?
    Buffer.concat([read(p), Buffer.from(`\nimport {Unknown} from '${dependency}';\n`)]) : read(p)}));
reject('empty-YAML-section-population', () => yamlSourceSections('# comments only\n'));
reject('duplicate-YAML-section', () => yamlSourceSections('snapshots:\n  a: 1\nsnapshots:\n  b: 2\n'));
for (const [id, text] of [
  ['missing-fence', 'export type T = string;\n'],
  ['extra-fence', '```ts\nexport type T = string;\n```\n```ts\nexport type U = string;\n```\n'],
  ['unterminated-fence', '```ts\nexport type T = string;\n'],
]) reject('golden-' + id, () => goldenDeclarationSource(text));
for (const suffix of ['subjects.json.gz', 'observation-pins.json.gz'])
  reject('source-capsule:' + suffix, () => inspectCompilerBuildSources({root,
    readMember: p => p === prefix + suffix ? Buffer.concat([read(p), Buffer.from('drift')]) : read(p)}));
assert.equal(cases.length, 273);
const report = {schema_version: 1, line: actual.line,
  helper: {path: 'scripts/mixed-compiler-build-source-review.mjs', sha256: hash(read('scripts/mixed-compiler-build-source-review.mjs'))},
  producer: {path: 'tests/mixed_compiler_build_source_probe.mjs', sha256: hash(read('tests/mixed_compiler_build_source_probe.mjs'))},
  negative_controls: cases.length, cases, retained_source_case_identities: 366, unchanged_complete_source_callbacks: 365,
  actual_Sass_Angular_compiler_native_artifact_browser_SSR_or_floor_qualified: false, g11_claim: 'not-passed'};
if (process.argv[2]) writeFileSync(process.argv[2], JSON.stringify(report, null, 2) + '\n', {flag: 'wx'});
console.log(JSON.stringify({line: actual.line, negative_controls: cases.length, retained_cases: 366, actual_runtime_qualified: false}));
