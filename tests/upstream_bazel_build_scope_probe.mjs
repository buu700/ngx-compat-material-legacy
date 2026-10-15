/**
 * @license
 * Copyright Google LLC All Rights Reserved.
 * Copyright (c) 2026 Ryan Lester.
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.io/license
 */
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {execFileSync} from 'node:child_process';
import {readFileSync, writeFileSync} from 'node:fs';
import {dirname, resolve} from 'node:path';
import {fileURLToPath} from 'node:url';
import {BAZEL_BUILD_SHAS, BAZEL_BUILD_SUBJECTS, bazelBuildEvidenceOk,
  analyzeBazelBuildSubjects} from '../scripts/upstream-bazel-build-scope.mjs';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..'), read = p => readFileSync(resolve(root, p));
const json = p => JSON.parse(read(p)), hash = b => createHash('sha256').update(b).digest('hex');
const path = 'compatibility/f10/disposition-ledger/evidence/closeout-bazel-build-only-review.json', body = json(path);
const entries = json('compatibility/f10/disposition-ledger/ledger.json').entries.filter(e => BAZEL_BUILD_SHAS.includes(e.sha));
const paths = execFileSync('git', ['-c', 'gc.auto=0', '-c', 'maintenance.auto=0', 'ls-files', 'projects/ngx-material-legacy'],
  {cwd: root, encoding: 'utf8'}).trim().split('\n');
const controls = [];
assert.equal(entries.length, 2);
for (const entry of entries) assert.equal(bazelBuildEvidenceOk(body, entry, read, () => paths, body.line), true);
const actual = analyzeBazelBuildSubjects(read);
assert.deepEqual(actual.reviews.map(r => r.paths.length), [37, 157]);
assert.deepEqual(actual.reviews.map(r => r.hunks), [74, 332]);
assert.equal(actual.starlark.parsed_member_versions, 376);
assert.equal(actual.annotations.reduce((n, r) => n + r.count, 0), 5);
assert.equal(actual.annotations.length, 3); assert.equal(actual.configs.length, 3);
function rejectBody(id, edit, entry = entries[0]) {
  const value = structuredClone(body); edit(value);
  assert.equal(bazelBuildEvidenceOk(value, entry, read, () => paths, body.line), false, id); controls.push(id);
}
rejectBody('missing-SHA', b => b.scope_sha_ids.pop());
rejectBody('extra-SHA', b => b.scope_sha_ids.push('f'.repeat(40)));
rejectBody('wrong-line', b => b.line = b.line === 'main' ? '21.x' : 'main');
rejectBody('missing-original-path', b => b.source_analysis.reviews[0].paths.pop());
rejectBody('missing-review-path', b => b.reviews[0].paths.pop());
rejectBody('lost-Starlark-member', b => b.source_analysis.starlark.reviews[1].members.pop());
rejectBody('altered-Starlark-attribute', b => b.source_analysis.starlark.reviews[0].members[0].changed_entities[0].after.keywords.srcs = '[]');
rejectBody('dropped-test-annotation', b => b.source_analysis.annotations.pop());
rejectBody('changed-executable-program', b => b.source_analysis.annotations[0].emits[0].executable_program_sha256 = 'f'.repeat(64));
rejectBody('changed-compiler-config', b => b.source_analysis.configs[0].after.compilerOptions.types = ['unreviewed']);
rejectBody('wrong-builder-claim', b => b.candidate_context.library_builder = 'bazel build //...');
rejectBody('missing-pack-module', b => b.candidate_context.pack_module_graph.pop());
rejectBody('missing-product-member', b => b.candidate_context.product_members.pop());
rejectBody('forged-build-execution', b => b.candidate_context.actual_build_pack_or_floor_executed = true);
rejectBody('forged-G11-claim', b => b.g11_claim = 'passed');
rejectBody('borrowed-inherited-conclusion', b => b.reviews[0].final_disposition = 'inherited');
rejectBody('unfinished-review', b => b.reviews[0].status = 'pending');
rejectBody('lost-original-member-pair', b => b.reviews[1].members.pop(), entries[1]);
for (const [id, edit] of [
  ['renamed-proof-kind', e => e.individual_proof.proof_kind = 'complete-source-review'],
  ['wrong-proof-branch', e => e.individual_proof.affected_branches = ['other']],
  ['omitted-entry-path', e => e.files.pop()],
  ['lost-prior-entry', e => e.prior_dispositions.pop()],
  ['unearned-runtime-inheritance', e => e.final_disposition = 'inherited'],
]) {
  const entry = structuredClone(entries[0]); edit(entry);
  assert.equal(bazelBuildEvidenceOk(body, entry, read, () => paths, body.line), false, id); controls.push(id);
}
for (const [id, member, change] of [
  ['Bazel-builder-introduced', 'scripts/pack-library.mjs', s => s.replace("'ng-packagr'", "'bazel'")],
  ['wrong-library-build-script', 'package.json', s => {const p = JSON.parse(s); p.scripts['build:lib'] = 'bazel build //...'; return JSON.stringify(p);}],
  ['changed-toolchain-subject', '.node-version', s => s + '\n'],
]) {
  const before = read(member).toString(), after = change(before); assert.notEqual(before, after);
  assert.equal(bazelBuildEvidenceOk(body, entries[0], p => p === member ? Buffer.from(after) : read(p), () => paths, body.line), false, id);
  controls.push(id);
}
const extra = 'projects/ngx-material-legacy/BUILD.bazel';
assert.equal(bazelBuildEvidenceOk(body, entries[0], p => p === extra ? Buffer.from('cc_binary(name="unexpected")') : read(p), () => [...paths, extra], body.line), false);
controls.push('new-product-Bazel-source');
assert.equal(bazelBuildEvidenceOk(body, entries[0], read, () => paths.slice(1), body.line), false);
controls.push('omitted-real-product-source');
assert.equal(bazelBuildEvidenceOk(body, entries[0], p => p === BAZEL_BUILD_SUBJECTS ? Buffer.from('wrong source corpus') : read(p), () => paths, body.line), false);
controls.push('changed-original-corpus');
const output = {schema_version: 1, line: body.line, source_only: true, original_reviews: 2, original_files: 194, original_hunks: 406,
  Starlark_before_after_programs: 376, original_test_files: 3, exact_parameter_type_additions: 5,
  exact_compiler_config_changes: 3, negative_controls: controls, product_files: paths.length,
  inputs: [path, BAZEL_BUILD_SUBJECTS, 'scripts/upstream-bazel-build-scope.mjs', 'scripts/upstream_bazel_source_analysis.py',
    'tests/upstream_bazel_build_scope_probe.mjs'].map(path => ({path, sha256: hash(read(path))})),
  actual_upstream_tests_Bazel_library_build_native_packed_or_floor_execution: false, g11_claim: 'not-passed'};
if (process.argv[2]) writeFileSync(process.argv[2], JSON.stringify(output, null, 2) + '\n', {flag: 'wx'});
console.log(JSON.stringify({reviews: 2, files: 194, hunks: 406, negative_controls: controls.length, source_only: true}));
