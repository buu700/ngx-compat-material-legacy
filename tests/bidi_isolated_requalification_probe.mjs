/**
 * @license
 * Copyright Google LLC All Rights Reserved.
 * Copyright (c) 2026 Ryan Lester.
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.io/license
 */
/** Source-context controls only. No actual packed/native/floor execution. */
import assert from 'node:assert/strict';
import {readFileSync, writeFileSync} from 'node:fs';
import {gunzipSync} from 'node:zlib';
import {createHash} from 'node:crypto';
import {dirname, resolve} from 'node:path';
import {fileURLToPath} from 'node:url';
import {reverseBidiIsolatedPackedSource, bidiRequirementsBefore, readBidiIsolatedReviewBefore} from '../scripts/bidi-isolated-packed-source-requalification.mjs';
import {inspectBidiIsolatedRequalification} from '../scripts/bidi-isolated-packed-evidence-requalification.mjs';
import {artifactBehaviorRequirements} from '../scripts/upstream-artifact-behavior-evidence.mjs';
import {generatedIdentityRequirements} from '../scripts/upstream-generated-identity-evidence.mjs';
import {authoredUseReviewEvidence} from '../scripts/authored-use-inventory.mjs';
import {readBidiPeerReviewSubject} from '../scripts/bidi-peer-source-context.mjs';
const root = resolve(dirname(fileURLToPath(import.meta.url)), '..'), rawRead = path => readFileSync(resolve(root, path));
const read = path => readBidiPeerReviewSubject(path, rawRead);
const hash = value => createHash('sha256').update(value).digest('hex');
const inputPath = 'compatibility/rc/bidi-isolated-packed-source-inputs.json', input = JSON.parse(read(inputPath));
const line = input.line, prior = JSON.parse(gunzipSync(read(input.prior.path)));
const roles = JSON.parse(gunzipSync(read(input.roles.path))), controls = [];
for (const row of prior.members) {
  const current = read(row.path).toString();
  assert.equal(reverseBidiIsolatedPackedSource(row.path, current, line), row.text);
  assert.equal(reverseBidiIsolatedPackedSource(row.path, row.text, line), row.text);
  if (input.changes.some(change => change.path === row.path)) {
    for (const value of [current + '\n', current.replace(/\S/, 'X')]) {
      assert.throws(() => reverseBidiIsolatedPackedSource(row.path, value, line), /unreviewed isolated bidi source change/);
      controls.push('changed-current:' + row.path);
    }
  }
}
for (const path of [inputPath, input.prior.path]) {
  assert.throws(() => reverseBidiIsolatedPackedSource(prior.members[0].path, prior.members[0].text, line,
    {readMember: name => name === path ? Buffer.concat([read(name), Buffer.from(' ')]) : read(name)}));
  controls.push('changed-pinned-input:' + path);
}
assert.throws(() => reverseBidiIsolatedPackedSource(prior.members[0].path, prior.members[0].text, 'foreign'));
controls.push('foreign-line');
for (const row of prior.before_requirements) {
  const definition = artifactBehaviorRequirements(row.sha) || generatedIdentityRequirements(row.sha);
  assert.deepEqual(bidiRequirementsBefore(row.sha, definition, line), row.requirements);
  const values = [
    {...definition, kind: 'changed-policy'},
    {...definition, members: definition.members.filter(path => path !== input.new_dependencies[0])},
    {...definition, members: [...definition.members, input.new_dependencies[0]]},
    {...definition, members: [...definition.members, 'foreign-runtime-dependency']},
  ];
  for (const value of values) {
    assert.throws(() => bidiRequirementsBefore(row.sha, value, line)); controls.push('changed-requirements:' + row.sha);
  }
}
assert.throws(() => bidiRequirementsBefore('0'.repeat(40), {}, line)); controls.push('foreign-sha');
const result = inspectBidiIsolatedRequalification({root, readMember: read});
assert.equal(result.proof.complete_preceding_sources_recovered, prior.members.length);
assert.equal(result.proof.original_runtime_validation_bodies_unchanged, true);
assert.equal(result.proof.unchanged_product_members, 1141);
assert.equal(result.proof.new_role_or_SHA_closures, 0); assert.equal(result.entries.length, 9);
const afterRead = path => result.writes.get(path) || read(path);
for (const store of roles.stores) {
  assert.equal(readBidiIsolatedReviewBefore(store.path, afterRead).toString(), store.text);
  const corrupt = JSON.parse(afterRead(store.path));
  corrupt.symbol_uses.find(row => row.disposition !== 'closed').disposition = 'closed';
  assert.throws(() => readBidiIsolatedReviewBefore(store.path, path => path === store.path ? Buffer.from(JSON.stringify(corrupt)) : afterRead(path)), /live disposition drift/);
  controls.push('foreign-closure:' + store.path);
  const badPointer = JSON.parse(afterRead(store.path));
  badPointer.symbol_uses.find(row => row.source_review?.path.includes('bidi-isolated')).source_review.sha256 = '0'.repeat(64);
  assert.throws(() => readBidiIsolatedReviewBefore(store.path, path => path === store.path ? Buffer.from(JSON.stringify(badPointer)) : afterRead(path)));
  controls.push('changed-pointer:' + store.path);
}
const path = 'compatibility/f10/authored-use-reviews/bidi-isolated-packed-requalified-boundaries.json';
const body = JSON.parse(result.writes.get(path));
assert.equal(body.reviews.length, 167);
for (const mutate of [
  value => value.reviews.pop(), value => value.reviews.push(value.reviews[0]),
  value => {value.reviews[0].candidate_source_sha256 = '0'.repeat(64);},
  value => {value.reviews[0].independent_evidence[0].sha256 = '0'.repeat(64);},
]) {
  const value = structuredClone(body); mutate(value); const bytes = Buffer.from(JSON.stringify(value));
  const candidate = {symbol_uses: body.reviews.map(row => ({file: row.file, module: row.module, symbol: row.symbol,
    status: 'reviewed', disposition: 'closed', source_review: {path, sha256: hash(bytes)}}))};
  const observed = authoredUseReviewEvidence(candidate, line, name => name === path ? bytes : afterRead(name), hash);
  assert.ok(observed.insufficient > 0); controls.push('changed-reviewed-role');
}
for (const path of [input.behavior_inputs.path, input.roles.path]) {
  assert.throws(() => inspectBidiIsolatedRequalification({root, readMember: name => name === path ? Buffer.concat([read(name), Buffer.from(' ')]) : read(name)}));
  controls.push('changed-review-archive:' + path);
}
const report = {schema_version: 1, line, preceding_complete_sources: prior.members.length, source_and_review_corruptions_rejected: controls.length,
  behavior_source_contexts_requalified: 9, existing_authored_uses_requalified: 167, frozen_reviewed: 1446, current_reviewed: 178,
  preserved_original_decisions: true, new_role_or_SHA_closures: 0, actual_packed_native_or_floor_qualified: false,
  source_helper_sha256: hash(read('scripts/bidi-isolated-packed-source-requalification.mjs')),
  evidence_helper_sha256: hash(read('scripts/bidi-isolated-packed-evidence-requalification.mjs')),
  test_sha256: hash(read('tests/bidi_isolated_requalification_probe.mjs')), controls, g11_claim: 'not-passed'};
if (process.argv[2]) writeFileSync(process.argv[2], JSON.stringify(report, null, 2) + '\n', {flag: 'wx'});
console.log(JSON.stringify({line, preceding_complete_sources: prior.members.length, controls: controls.length, new_closures: 0}));
