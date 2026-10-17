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
import {inspectZoneMovesSources, zoneMovesPins, reviewZoneMovesSubject, observeZoneMovesSubject,
  inspectZoneOwnedContext, lockSourceEntries} from '../scripts/mixed-zone-moves-source-review.mjs';
const root = fileURLToPath(new URL('..', import.meta.url)), prefix = 'compatibility/rc/mixed-zone-moves-source-';
const read = p => readFileSync(resolve(root, p)), hash = x => createHash('sha256').update(x).digest('hex');
const originals = JSON.parse(gunzipSync(read(prefix + 'subjects.json.gz'))).subjects;
const pins = zoneMovesPins({root}), actual = inspectZoneMovesSources({root}), cases = [];
assert.deepEqual(actual.subjects.map(n => [n.cases_before, n.unchanged_complete_callbacks, n.exact_reviewed_relocations]),
  [[105, 102, 0], [10, 9, 0], [219, 161, 1], [64, 57, 5]]);
assert.equal(actual.retained_source_case_identities, 398); assert.equal(actual.unchanged_complete_source_callbacks, 329);
assert.equal(actual.owned_product_members, 1141); assert.equal(actual.current_required_historical_case_ids, 2228);
assert.equal(actual.actual_Angular_native_artifact_browser_SSR_or_floor_qualified, false);
function reject(id, fn) {assert.throws(fn, undefined, id); cases.push({id, result: 'rejected'});}
for (const [index, subject] of originals.entries()) {
  for (const [i, member] of subject.members.entries()) {
    const changed = structuredClone(subject); changed.members[i].after.text += '\n/* unreviewed complete-source drift */\n';
    reject(subject.sha + ':' + member.path + ':after-drift', () => reviewZoneMovesSubject(changed, index, pins.subjects[index]));
    const both = structuredClone(subject); both.members[i].before.text += '\n/* unreviewed source */\n'; both.members[i].after.text += '\n/* unreviewed source */\n';
    reject(subject.sha + ':' + member.path + ':synchronized-drift', () => reviewZoneMovesSubject(both, index, pins.subjects[index]));
  }
  const i = subject.members.findIndex(n => n.path.endsWith('.spec.ts')), changed = structuredClone(subject);
  changed.members[i].after.text = changed.members[i].after.text.replace(/\bit\(/, 'xit(');
  assert.notEqual(changed.members[i].after.text, subject.members[i].after.text);
  reject(subject.sha + ':disabled-case', () => observeZoneMovesSubject(changed, index));
  const cleanup = structuredClone(subject); cleanup.members[i].after.text += '\nafterEach(() => { throw Error("cleanup drift"); });\n';
  reject(subject.sha + ':cleanup-hook', () => reviewZoneMovesSubject(cleanup, index, pins.subjects[index]));
}
for (const ref of JSON.parse(read(prefix + 'intake.json')).owned_context_read)
  reject('owned-zone-lifetime-context:' + ref.path, () => inspectZoneOwnedContext({root,
    readMember: p => p === ref.path ? Buffer.concat([read(p), Buffer.from('\n/* context drift */\n')]) : read(p)}));
const productPath = 'projects/ngx-material-legacy/legacy-button/button.ts';
for (const dependency of ['menu', 'tree']) for (const [kind, extra] of [
  ['import', `\nimport {Cdk${dependency === 'menu' ? 'MenuBase' : 'Tree'}} from '@angular/cdk/${dependency}';\n`],
  ['fork', `\nclass Cdk${dependency === 'menu' ? 'MenuBase' : 'TreeNode'} {}\n`],
]) reject('unowned-CDK-' + dependency + '-' + kind, () => inspectZoneOwnedContext({root,
  readMember: p => p === productPath ? Buffer.concat([read(p), Buffer.from(extra)]) : read(p)}));
// Independently exercise the finite relocation matcher, rather than merely the byte pin.
for (const index of [2, 3]) {
  for (const pair of pins.subjects[index].observation.pairs.filter(n => n.exact_reviewed_relocation)) {
    const changed = structuredClone(originals[index]), move = pair.exact_reviewed_relocation;
    const member = changed.members.find(n => n.path === move[1]);
    const at = member.after.text.indexOf(move[2]); assert.ok(at >= 0);
    const arrow = member.after.text.indexOf('=> {', at); assert.ok(arrow >= 0);
    member.after.text = member.after.text.slice(0, arrow + 4) + '\nthrow Error("relocated delivery drift");' + member.after.text.slice(arrow + 4);
    reject('relocation-callback:' + index + ':' + move[2], () => observeZoneMovesSubject(changed, index));
  }
}
for (const path of ['src/cdk/menu/menu-base.ts', 'src/cdk/tree/tree.ts']) {
  const changed = structuredClone(originals[2]), member = changed.members.find(n => n.path === path);
  member.after.text += '\nthrow Error("unreviewed runtime operation");\n';
  reject('runtime-projection:' + path, () => observeZoneMovesSubject(changed, 2));
}
for (const [index, subject] of originals.entries()) for (const [i, member] of subject.members.entries()) {
  if (subject.complete_changed_files[i].status === 'M') continue;
  const changed = structuredClone(subject); changed.complete_changed_files[i].status = 'M';
  reject('original-lifecycle:' + member.path, () => reviewZoneMovesSubject(changed, index, pins.subjects[index]));
}
reject('lock-empty-population', () => lockSourceEntries('# header only\n'));
reject('lock-duplicate-header', () => lockSourceEntries('x@1:\n  version "1"\nx@1:\n  version "2"\n'));
for (const suffix of ['subjects.json.gz', 'observation-pins.json.gz'])
  reject('source-capsule:' + suffix, () => inspectZoneMovesSources({root,
    readMember: p => p === prefix + suffix ? Buffer.concat([read(p), Buffer.from('drift')]) : read(p)}));
assert.equal(cases.length, 93);
const report = {schema_version: 1, line: actual.line,
  helper: {path: 'scripts/mixed-zone-moves-source-review.mjs', sha256: hash(read('scripts/mixed-zone-moves-source-review.mjs'))},
  producer: {path: 'tests/mixed_zone_moves_source_probe.mjs', sha256: hash(read('tests/mixed_zone_moves_source_probe.mjs'))},
  negative_controls: cases.length, cases, retained_source_case_identities: 398, unchanged_complete_source_callbacks: 329,
  exact_reviewed_case_relocations: 6, actual_Angular_native_artifact_browser_SSR_or_floor_qualified: false, g11_claim: 'not-passed'};
if (process.argv[2]) writeFileSync(process.argv[2], JSON.stringify(report, null, 2) + '\n', {flag: 'wx'});
console.log(JSON.stringify({line: actual.line, negative_controls: cases.length, retained_cases: 398, actual_runtime_qualified: false}));
