/**
 * @license
 * Copyright Google LLC All Rights Reserved.
 * Copyright (c) 2026 Ryan Lester.
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.io/license
 */
/** Original/source tamper controls; no Angular or packed runtime admission. */
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {execFileSync} from 'node:child_process';
import {readFileSync, writeFileSync} from 'node:fs';
import {gunzipSync} from 'node:zlib';
import {dirname, resolve} from 'node:path';
import {fileURLToPath} from 'node:url';
import {candidateProductSourcePaths} from '../scripts/upstream-candidate-source-evidence.mjs';
import {ENV_CAPSULES, originalEnvironmentCases} from '../scripts/spec-test-environment-source-review.mjs';
import {
  OWNED_MENU_GATES, MENU_WITNESS, STANDALONE_SHAS, analyzeStandaloneEnvironment,
  compareStandaloneCases, reviewStandaloneTemplates, inspectStandaloneEnvironmentSources,
} from '../scripts/spec-standalone-environment-source-review.mjs';
const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const read = path => readFileSync(resolve(root, path));
const hash = bytes => createHash('sha256').update(bytes).digest('hex');
const report = inspectStandaloneEnvironmentSources({root});
const originals = JSON.parse(gunzipSync(read('compatibility/rc/spec-test-environment-source-subjects.json.gz')));
const subjects = originals.subjects.slice(2), controls = [];
function reject(id, action) { assert.throws(action, undefined, id); controls.push({id, result: 'rejected'}); }
for (const subject of subjects) {
  for (const [id, mutate] of [
    ['raw-commit', row => { row.raw_commit += '\n'; row.raw_commit_sha256 = hash(row.raw_commit); }],
    ['missing-file', row => { row.members.pop(); row.complete_changed_files.pop(); }],
    ['foreign-file', row => { row.members[0].path = 'src/cdk/unknown.spec.ts'; }],
    ['missing-hunk', row => { row.original_hunks--; }],
    ['rehashed-after-body', row => { const m = row.members[0].after; m.text += '\n'; m.sha256 = hash(m.text); m.bytes = Buffer.byteLength(m.text); }],
    ['rehashed-diff', row => { row.diff = row.diff.replace(/^@@ /m, '@@  '); row.diff_sha256 = hash(row.diff); row.diff_bytes = Buffer.byteLength(row.diff); }],
  ]) {
    const changed = structuredClone(subject); mutate(changed);
    reject(subject.sha + '-' + id, () => analyzeStandaloneEnvironment(changed));
  }
  const before = originalEnvironmentCases(subject, 'before'), after = originalEnvironmentCases(subject, 'after');
  for (const [id, mutate] of [
    ['lost-case', rows => rows.pop()],
    ['duplicate-case', rows => rows.push(rows[0])],
    ['reused-case', rows => { rows[1] = rows[0]; }],
    ['case-order', rows => { [rows[0], rows[1]] = [rows[1], rows[0]]; }],
  ]) {
    const changed = structuredClone(after); mutate(changed);
    reject(subject.sha + '-' + id, () => compareStandaloneCases(before, changed));
  }
  // Exercise the predicate comparator independently of whole-source authentication.
  const index = after.findIndex(n => n.raw.includes('.toBe('));
  assert.ok(index >= 0);
  for (const [id, needle, replacement] of [
    ['negated-matcher', '.toBe(', '.not.toBe('],
    ['matcher-operator', '.toBe(', '.toEqual('],
  ]) {
    const changed = {...after[index], raw: after[index].raw.replace(needle, replacement)};
    reject(subject.sha + '-' + id, () => compareStandaloneCases([before[index]], [changed]));
  }
  const member = subject.members.find(n => n.after.text.includes("it('"));
  for (const mode of ['fit', 'xit']) {
    const changed = structuredClone(subject), m = changed.members.find(n => n.path === member.path);
    m.after.text = m.after.text.replace("it('", mode + "('");
    reject(subject.sha + '-changed-test-mode-' + mode, () => compareStandaloneCases(
      before, originalEnvironmentCases(changed, 'after')));
  }
  const changed = structuredClone(subject);
  changed.members[0].after.text += '\n@Component({template: "<p>new</p>"}) class UnreviewedFixture {}\n';
  reject(subject.sha + '-new-fixture-template', () => reviewStandaloneTemplates(changed));
}
const material = subjects[1], cdk = subjects[0];
{
  const before = originalEnvironmentCases(material, 'before'), after = originalEnvironmentCases(material, 'after');
  const index = after.findIndex(n => n.path === MENU_WITNESS.path && n.name === MENU_WITNESS.name);
  assert.ok(index >= 0);
  for (const [id, needle, replacement] of [
    ['destroyed-checker-missing', '[true, true]', '[true, false]'],
    ['destroyed-checker-count', '[true, true]', '[true]'],
    ['initial-checker-state', '[false, false]', '[true, false]'],
    ['query-matcher-weakened', '.toBe(0)', '.toBeGreaterThanOrEqual(0)'],
  ]) {
    assert.ok(after[index].raw.includes(needle));
    reject(id, () => compareStandaloneCases([before[index]],
      [{...after[index], raw: after[index].raw.replace(needle, replacement)}]));
  }
  const disabled = after.findIndex(n => n.mode === 'xit');
  assert.ok(disabled >= 0);
  reject('disabled-case-not-omitted-from-census', () => compareStandaloneCases(before, after.filter((n, i) => i !== disabled)));
}
for (const [subject, path, side, needle, replacement, id] of [
  [cdk, 'src/cdk-experimental/popover-edit/popover-edit.spec.ts', 'after', '<table', '<table changed', 'changed-inline-popover-markup'],
  [cdk, 'src/cdk-experimental/popover-edit/popover-edit.spec.ts', 'before', 'let', 'modified', 'changed-literal-macro'],
  [cdk, 'src/cdk/tree/tree-with-tree-control.spec.ts', 'after', '@if (treeControl.isExpanded(node))', '@if (false)', 'changed-expanded-tree-condition'],
  [material, 'src/material/menu/menu.spec.ts', 'after', '<ng-content/>', '<span><ng-content/></span>', 'projection-wrapper-not-accepted'],
  [material, 'src/material/autocomplete/autocomplete.zone.spec.ts', 'after', '[floatLabel]="floatLabel"', '[floatLabel]="true"', 'changed-autocomplete-binding'],
]) {
  const changed = structuredClone(subject), member = changed.members.find(n => n.path === path);
  if (id === 'changed-literal-macro') {
    const old = member[side].text;
    member[side].text = old.replace('const NAME_EDIT_TEMPLATE = `', 'const NAME_EDIT_TEMPLATE = `changed');
    assert.notEqual(member[side].text, old);
  } else {
    assert.ok(member[side].text.includes(needle), id);
    member[side].text = member[side].text.replace(needle, replacement);
  }
  reject(id, () => reviewStandaloneTemplates(changed));
}
{
  const changed = structuredClone(cdk);
  changed.members[0].after.text += '\n@Component({template: "", styles: ["p {padding: 1px}"]}) class UnreviewedStyle {}\n';
  reject('added-style-property', () => reviewStandaloneTemplates(changed));
}
for (const path of [...Object.keys(ENV_CAPSULES[report.line]), 'scripts/acquire-upstream-spec-originals.py',
  ...Object.keys(OWNED_MENU_GATES)]) {
  reject('changed-capture-or-owned-gate-' + path, () => inspectStandaloneEnvironmentSources({root,
    readMember: name => name === path ? Buffer.concat([read(name), Buffer.from('\n')]) : read(name)}));
}
reject('zone-review-not-reused-as-standalone-admission', () => analyzeStandaloneEnvironment(originals.subjects[0]));
assert.deepEqual(report.subjects.map(n => n.sha), STANDALONE_SHAS);
// Authenticate every retained product member against the pre-review commit. This
// includes HTML/styles/specs and all old case bodies; no generated candidate golden.
const worksheet = JSON.parse(read('compatibility/rc/spec-test-environment-source-worksheet.json'));
const tree = execFileSync('git', ['--no-replace-objects', '-c', 'gc.auto=0', '-c', 'maintenance.auto=0',
  'ls-tree', '-rz', worksheet.source_parent, '--', 'projects/ngx-material-legacy'],
{cwd: root, env: {...process.env, GIT_NO_LAZY_FETCH: '1'}}).toString().split('\0').filter(Boolean);
const paths = [];
for (const record of tree) {
  const [metadata, path] = record.split('\t'), [mode, kind, blob] = metadata.split(' '), bytes = read(path);
  assert.equal(mode, '100644'); assert.equal(kind, 'blob');
  assert.equal(createHash('sha1').update('blob ' + bytes.length + '\0').update(bytes).digest('hex'), blob, path);
  paths.push(path);
}
assert.equal(paths.length, 1141);
assert.deepEqual(candidateProductSourcePaths(root).sort(), paths.filter(n => /\.(ts|scss|css|html)$/.test(n)).sort());
const result = {schema_version: 1, line: report.line, complete_original_files: 17,
  complete_original_hunks: 675, static_occurrences_paired: 1311, disabled_occurrences_preserved: 1,
  individually_reviewed_destroy_witnesses: 1, changed_template_properties_reviewed: 11,
  changed_style_properties: 0, controls: controls.length, cases: controls,
  unchanged_product_members: paths.length, source_membership_exact: true,
  helper_sha256: hash(read('scripts/spec-standalone-environment-source-review.mjs')),
  producer_sha256: hash(read('tests/spec_standalone_environment_source_probe.mjs')),
  owned_packed_menu_runtime_qualification: 'pending',
  actual_Angular_browser_native_packed_or_floor_qualified: false, g11_claim: 'not-passed'};
const out = process.argv.indexOf('--out');
if (out >= 0) writeFileSync(process.argv[out + 1], JSON.stringify(result, null, 2) + '\n', {flag: 'wx'});
console.log(JSON.stringify({...result, cases: undefined}));
