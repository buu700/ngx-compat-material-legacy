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
import {inspectTreeSources, treePins, reviewTreeSubject, observeTreeSubject,
  inspectTreeRelations, inspectTreeOwnedScope, projectTreeRuntime} from '../scripts/mixed-tree-source-review.mjs';
const root = fileURLToPath(new URL('..', import.meta.url)), prefix = 'compatibility/rc/mixed-tree-source-';
const read = p => readFileSync(resolve(root, p)), hash = v => createHash('sha256').update(v).digest('hex');
const originals = JSON.parse(gunzipSync(read(prefix + 'subjects.json.gz'))).subjects;
const pins = treePins({root}), actual = inspectTreeSources({root}), cases = [];
assert.deepEqual(actual.subjects.map(n => [n.cases_before, n.unchanged_complete_callbacks]), [[59, 54], [59, 54], [59, 54], [7, 7]]);
assert.equal(actual.retained_source_case_identities, 184); assert.equal(actual.unchanged_complete_source_callbacks, 169);
assert.equal(actual.owned_product_members, 1141); assert.equal(actual.current_required_historical_case_ids, 2228);
assert.equal(actual.actual_Angular_native_artifact_browser_SSR_or_floor_qualified, false);
function reject(id, fn) {assert.throws(fn, undefined, id); cases.push({id, result: 'rejected'});}
for (const [index, subject] of originals.entries()) {
  for (const [i, member] of subject.members.entries()) {
    const extra = member.path.endsWith('.md') ? '\nUnreviewed public API contract.\n' : '\nthrow Error("unreviewed source");\n';
    const changed = structuredClone(subject); changed.members[i].after.text += extra;
    reject(subject.sha + ':' + member.path + ':after-body-drift', () => reviewTreeSubject(changed, index, pins.subjects[index]));
    const both = structuredClone(subject); both.members[i].before.text += extra; both.members[i].after.text += extra;
    reject(subject.sha + ':' + member.path + ':synchronized-body-drift', () => reviewTreeSubject(both, index, pins.subjects[index]));
  }
  const i = subject.members.findIndex(n => n.path.endsWith('.spec.ts')), changed = structuredClone(subject);
  changed.members[i].after.text = changed.members[i].after.text.replace(/\bit\(/, 'xit(');
  assert.notEqual(changed.members[i].after.text, subject.members[i].after.text);
  reject(subject.sha + ':disabled-case-identity', () => observeTreeSubject(changed, index));
  const cleanup = structuredClone(subject); cleanup.members[i].after.text += '\nafterEach(() => { throw Error("cleanup drift"); });\n';
  reject(subject.sha + ':cleanup-hook', () => reviewTreeSubject(cleanup, index, pins.subjects[index]));
}
for (const [index, path, before, after] of [
  [0, 'src/cdk/tree/tree.ts', 'getDescendants(this._data).length === 0', 'getDescendants(this._data).length > 0'],
  [1, 'src/cdk/tree/tree.ts', "'[attr.aria-expanded]': 'isExpanded'", "'[attr.aria-expanded]': 'false'"],
  [2, 'src/cdk/tree/tree.ts', 'isExpandable !== undefined', 'isExpandable === undefined'],
  [3, 'src/cdk/tree/tree.ts', 'currentType !== newType', 'currentType === newType'],
  [3, 'src/cdk/tree/nested-node.ts', "_type: 'flat' | 'nested' = 'nested'", "_type: 'flat' | 'nested' = 'flat'"],
]) {
  const changed = structuredClone(originals[index]), member = changed.members.find(n => n.path === path);
  assert.ok(member.after.text.includes(before)); member.after.text = member.after.text.replace(before, after);
  reject(originals[index].sha + ':' + before + ':runtime-contract', () => reviewTreeSubject(changed, index, pins.subjects[index]));
}
for (const [i, member] of originals[0].members.entries()) {
  const changed = structuredClone(originals); changed[2].members[i].after.text += '\nUnreviewed reapply drift.\n';
  reject(member.path + ':reapply-is-not-exact', () => inspectTreeRelations(changed));
}
const path = 'projects/ngx-material-legacy/legacy-menu/menu-item.ts';
for (const [id, extra] of [
  ['import', "\nimport {CdkTree} from '@angular/cdk/tree';\n"],
  ['reexport', "\nexport {MatTree} from '@angular/material/tree';\n"],
  ['dynamic-import', "\nimport('@angular/cdk/tree');\n"],
  ['require', "\nrequire('@angular/material/tree/testing');\n"],
  ['flat-template', '\nconst ownedTreeTemplate = `<mat-tree-node></mat-tree-node>`;\n'],
  ['nested-template', '\nconst ownedTreeTemplate = `<mat-nested-tree-node></mat-nested-tree-node>`;\n'],
  ['peer-fork', '\nclass CdkTreeNodeOutlet {}\n'],
]) reject('owned-scope-' + id, () => inspectTreeOwnedScope({root, readMember: p => p === path ? Buffer.concat([read(p), Buffer.from(extra)]) : read(p)}));
for (const index of [0, 3]) {
  const member = originals[index].members.find(n => n.path === 'src/cdk/tree/tree.ts');
  const drift = member.after.text + '\nthrow Error("unreviewed retained operation");\n';
  assert.notEqual(projectTreeRuntime(member.after.text, index, member.path).semantic_sha256,
    projectTreeRuntime(drift, index, member.path).semantic_sha256);
  cases.push({id: 'runtime-projection-retains-other-operations-' + index, result: 'rejected'});
}
assert.equal(cases.length, 58);
const report = {schema_version: 1, line: actual.line, helper: {path: 'scripts/mixed-tree-source-review.mjs', sha256: hash(read('scripts/mixed-tree-source-review.mjs'))},
  producer: {path: 'tests/mixed_tree_source_probe.mjs', sha256: hash(read('tests/mixed_tree_source_probe.mjs'))}, negative_controls: 58, cases,
  retained_source_case_identities: 184, unchanged_complete_source_callbacks: 169,
  actual_Angular_native_artifact_browser_SSR_or_floor_qualified: false, g11_claim: 'not-passed'};
if (process.argv[2]) writeFileSync(process.argv[2], JSON.stringify(report, null, 2) + '\n', {flag: 'wx'});
console.log(JSON.stringify({line: actual.line, negative_controls: 58, retained_cases: 184, actual_runtime_qualified: false}));
