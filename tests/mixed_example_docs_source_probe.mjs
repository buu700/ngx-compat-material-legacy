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
import {inspectExampleDocsSources, exampleDocsPins, reviewExampleDocsSubject, observeExampleDocsSubject,
  inspectExampleDocsOwnedContext, projectExampleMetadata} from '../scripts/mixed-example-docs-source-review.mjs';
const root = fileURLToPath(new URL('..', import.meta.url)), prefix = 'compatibility/rc/mixed-example-docs-source-';
const read = p => readFileSync(resolve(root, p)), hash = v => createHash('sha256').update(v).digest('hex');
const originals = JSON.parse(gunzipSync(read(prefix + 'subjects.json.gz'))).subjects;
const pins = exampleDocsPins({root}), actual = inspectExampleDocsSources({root}), cases = [];
assert.deepEqual(actual.subjects.map(n => [n.cases_before, n.unchanged_complete_callbacks]), [[13, 13], [17, 17], [182, 179], [74, 73]]);
assert.equal(actual.retained_source_case_identities, 286); assert.equal(actual.unchanged_complete_source_callbacks, 282);
assert.equal(actual.owned_product_members, 1141); assert.equal(actual.current_required_historical_case_ids, 2228);
assert.equal(actual.actual_Angular_native_artifact_browser_SSR_or_floor_qualified, false);
function reject(id, fn) {assert.throws(fn, undefined, id); cases.push({id, result: 'rejected'});}
for (const [index, subject] of originals.entries()) {
  for (const [i, member] of subject.members.entries()) {
    const extra = member.path.endsWith('.html') ? '\n<button>Unreviewed markup</button>\n' : '\nthrow Error("unreviewed operation");\n';
    const changed = structuredClone(subject); changed.members[i].after.text += extra;
    reject(subject.sha + ':' + member.path + ':after-body-drift', () => reviewExampleDocsSubject(changed, index, pins.subjects[index]));
    const both = structuredClone(subject); both.members[i].before.text += extra; both.members[i].after.text += extra;
    reject(subject.sha + ':' + member.path + ':synchronized-body-drift', () => reviewExampleDocsSubject(both, index, pins.subjects[index]));
  }
  const i = subject.members.findIndex(n => n.path.endsWith('.spec.ts')), changed = structuredClone(subject);
  changed.members[i].after.text = changed.members[i].after.text.replace(/\bit\(/, 'xit(');
  assert.notEqual(changed.members[i].after.text, subject.members[i].after.text);
  reject(subject.sha + ':disabled-case-identity', () => observeExampleDocsSubject(changed, index));
  const cleanup = structuredClone(subject); cleanup.members[i].after.text += '\nafterEach(() => { throw Error("cleanup drift"); });\n';
  reject(subject.sha + ':cleanup-hook', () => reviewExampleDocsSubject(cleanup, index, pins.subjects[index]));
}
for (const index of [0, 1]) {
  const member = originals[index].members.find(n => n.after.text.includes('imports: ['));
  const changed = member.after.text.replace('imports: [', 'providers: [{provide: Token, useValue: true}], imports: [');
  assert.notEqual(changed, member.after.text);
  assert.notEqual(projectExampleMetadata(changed, index).semantic_sha256, projectExampleMetadata(member.after.text, index).semantic_sha256);
  cases.push({id: 'metadata-projection-retains-providers-' + index, result: 'rejected'});
}
for (const [i, member] of originals[2].members.entries()) {
  if (!member.path.endsWith('.html')) continue;
  const changed = structuredClone(originals[2]); changed.members[i].after.text = member.after.text.replace(/h2/g, 'h3');
  assert.notEqual(changed.members[i].after.text, member.after.text);
  reject(member.path + ':unapproved-heading-level', () => observeExampleDocsSubject(changed, 2));
}
{
  const changed = structuredClone(originals[2]), member = changed.members.find(n => n.path === 'src/material/dialog/dialog.spec.ts');
  const before = member.after.text; member.after.text = before.replace('h2[tabindex="-1"]', 'h3[tabindex="-1"]');
  assert.notEqual(before, member.after.text);
  reject('focus-query-level-drift', () => observeExampleDocsSubject(changed, 2));
}
for (const [id, before, after] of [['duplicate-removal', 'lastIndexOf(keyword)', 'indexOf(keyword)'],
  ['nullable-value-model', 'nonNullable: true', 'nonNullable: false'],
  ['initial-form-values', "['angular', 'how-to', 'tutorial', 'accessibility']", "['angular']"]]) {
  const changed = structuredClone(originals[3]), member = changed.members.find(n => n.path.endsWith('chips-reactive-form-example.ts'));
  assert.ok(member.after.text.includes(before)); member.after.text = member.after.text.replace(before, after);
  reject(id, () => reviewExampleDocsSubject(changed, 3, pins.subjects[3]));
}
{
  const changed = structuredClone(originals[3]), member = changed.members.find(n => n.path === 'src/material/tooltip/tooltip.spec.ts');
  assert.ok(member.after.text.includes('tick(250)')); member.after.text = member.after.text.replace('tick(250)', 'tick(125)');
  reject('tooltip-reviewed-timing-case-drift', () => reviewExampleDocsSubject(changed, 3, pins.subjects[3]));
}
const context = JSON.parse(read(prefix + 'intake.json'));
for (const ref of context.owned_context_read) {
  reject('owned-context-drift:' + ref.path, () => inspectExampleDocsOwnedContext({root,
    readMember: p => p === ref.path ? Buffer.concat([read(p), Buffer.from('\n// unreviewed preparation\n')]) : read(p)}));
}
const scopePath = 'projects/ngx-material-legacy/legacy-menu/menu-item.ts';
for (const [id, extra] of [['import', "\nimport {DialogDataExample} from '@angular/components-examples/material/dialog';\n"],
  ['reexport', "\nexport {KitchenSink} from '../../universal-app/kitchen-sink/kitchen-sink';\n"]])
  reject('owned-example-dependency-' + id, () => inspectExampleDocsOwnedContext({root,
    readMember: p => p === scopePath ? Buffer.concat([read(p), Buffer.from(extra)]) : read(p)}));
assert.equal(cases.length, 97);
const report = {schema_version: 1, line: actual.line,
  helper: {path: 'scripts/mixed-example-docs-source-review.mjs', sha256: hash(read('scripts/mixed-example-docs-source-review.mjs'))},
  producer: {path: 'tests/mixed_example_docs_source_probe.mjs', sha256: hash(read('tests/mixed_example_docs_source_probe.mjs'))}, negative_controls: 97, cases,
  retained_source_case_identities: 286, unchanged_complete_source_callbacks: 282,
  actual_Angular_native_artifact_browser_SSR_or_floor_qualified: false, g11_claim: 'not-passed'};
if (process.argv[2]) writeFileSync(process.argv[2], JSON.stringify(report, null, 2) + '\n', {flag: 'wx'});
console.log(JSON.stringify({line: actual.line, negative_controls: 97, retained_cases: 286, actual_runtime_qualified: false}));
