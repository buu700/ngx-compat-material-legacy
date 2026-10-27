/**
 * @license
 * Copyright Google LLC All Rights Reserved.
 * Copyright (c) 2026 Ryan Lester.
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.io/license
 */
/** One exact verifier successor and one unchanged source judgment. */
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {execFileSync} from 'node:child_process';
import {readFileSync} from 'node:fs';
import {join} from 'node:path';

const inputPath = 'compatibility/rc/packed-upstream-source-inspector-inputs.json';
const pins = {main: 'ea593eb8c71952bfc0de94e56f14774cdeff655e97e85685047b4823955271fb',
  '21.x': '9e0e7349d6623fb4344584e60688b762b6cdd110c70384a156cd3e9321c54e27'};
const inspectorPath = 'scripts/chip-focus-contract.mjs';
const frozenPath = 'compatibility/f10/authored-dependency-dispositions.json';
const reviewPath = 'compatibility/f10/authored-use-reviews/packed-upstream-focus-source-context.json';
const hash = bytes => createHash('sha256').update(bytes).digest('hex');
const bytes = value => Buffer.from(JSON.stringify(value, null, 2) + '\n');
const disk = root => path => readFileSync(join(root, path));
const useKey = row => JSON.stringify([row.file, row.module, row.symbol]);

function original(root, parent, path) {
  assert.match(parent, /^[0-9a-f]{40}$/);
  const env = {...process.env, GIT_NO_LAZY_FETCH: '1', GIT_NO_REPLACE_OBJECTS: '1'};
  for (const key of ['GIT_DIR', 'GIT_WORK_TREE', 'GIT_INDEX_FILE', 'GIT_COMMON_DIR',
    'GIT_OBJECT_DIRECTORY', 'GIT_ALTERNATE_OBJECT_DIRECTORIES']) delete env[key];
  return execFileSync('git', ['--no-replace-objects', '-c', 'gc.auto=0', '-c', 'maintenance.auto=0',
    'show', parent + ':' + path], {cwd: root, env, maxBuffer: 16 * 1024 * 1024});
}

export function qualifyPackedUpstreamFocusInspector({root = process.cwd(), read = disk(root), member} = {}) {
  const raw = read(inputPath), profile = JSON.parse(raw);
  assert.equal(hash(raw), pins[profile.line], 'changed current focus inspector inputs');
  assert.equal(profile.path, inspectorPath); assert.equal(profile.edits.length, 6);
  if (member) {assert.equal(member.path, inspectorPath); assert.equal(member.sha256, profile.before_sha256);}
  const registry = read(profile.product_registry.path);
  assert.equal(hash(registry), profile.product_registry.sha256);
  const product = JSON.parse(registry); assert.equal(profile.line, product.line);
  assert.equal(profile.authority, product.packed_repairs.qualification.source_parent);
  const before = original(root, profile.authority, profile.path);
  assert.equal(hash(before), profile.before_sha256);
  let current = before.toString();
  for (const edit of profile.edits) {
    assert.equal(current.split(edit.before).length, 2);
    current = current.replace(edit.before, edit.after);
  }
  assert.equal(hash(current), profile.sha256);
  assert.equal(read(profile.path).toString(), current, 'unqualified current raw focus inspector');
  return {profile, before, ref: {path: profile.path, sha256: profile.sha256}};
}

function consolidationInspector(root, read, profile, member) {
  const delta = profile.consolidation_inspector;
  assert.equal(delta.path, 'scripts/upstream-test-consolidation-evidence.mjs');
  assert.equal(delta.edits.length, 1);
  if (member) {assert.equal(member.path, delta.path); assert.equal(member.sha256, delta.before_sha256);}
  const before = original(root, delta.source_parent, delta.path);
  assert.equal(hash(before), delta.before_sha256);
  const edit = delta.edits[0], text = before.toString();
  assert.equal(text.split(edit.before).length, 2);
  const current = text.replace(edit.before, edit.after);
  assert.equal(hash(current), delta.sha256);
  assert.equal(read(delta.path).toString(), current, 'unqualified current consolidation inspector');
  return {before, ref: {path: delta.path, sha256: delta.sha256}};
}

/** The new context uses exactly the same full build and suite predicates. */
export function qualifyPackedUpstreamConsolidationInspector({root = process.cwd(), read = disk(root), member} = {}) {
  const inspector = qualifyPackedUpstreamFocusInspector({root, read});
  return consolidationInspector(root, read, inspector.profile, member);
}

/** Construct fresh evidence; never rewrite its original 63-review document. */
export function preparePackedUpstreamFocusMetadata({root = process.cwd(), read = disk(root)} = {}) {
  const inspector = qualifyPackedUpstreamFocusInspector({root, read}), {profile} = inspector;
  const consolidation = consolidationInspector(root, read, profile);
  const metadata = profile.source_role_metadata;
  assert.equal(metadata.frozen_ledger.path, frozenPath); assert.equal(metadata.review.path, reviewPath);
  assert.deepEqual(metadata.use, {file: 'legacy-chips/chip.ts', module: '@angular/core', symbol: 'NgZone'});
  const before = original(root, metadata.source_parent, frozenPath);
  assert.equal(hash(before), metadata.frozen_ledger.sha256);
  const priorBytes = read(metadata.prior_review.path);
  assert.equal(hash(priorBytes), metadata.prior_review.sha256);
  assert.equal(hash(original(root, metadata.source_parent, metadata.prior_review.path)), hash(priorBytes));
  const prior = JSON.parse(priorBytes); assert.equal(prior.line, profile.line);
  const selected = prior.reviews.filter(row => useKey(row) === useKey(metadata.use));
  assert.equal(selected.length, 1);
  const review = structuredClone(selected[0]);
  const evidence = review.independent_evidence.filter(ref => ref.path === inspectorPath);
  assert.equal(evidence.length, 1); assert.equal(evidence[0].sha256, profile.before_sha256);
  evidence[0].sha256 = profile.sha256;
  const body = {schema_version: 1, line: profile.line, status: 'reviewed', criteria: prior.criteria,
    reviews: [review], prior_review: metadata.prior_review, current_raw_contract_source: inspector.ref,
    new_semantic_closures: 0, actual_native_packed_or_floor_qualified: false, g11_claim: 'not-passed'};
  const reviewBytes = bytes(body); assert.equal(hash(reviewBytes), metadata.review.sha256);
  const ledger = JSON.parse(before); assert.equal(ledger.symbol_uses.length, 1736);
  const uses = ledger.symbol_uses.filter(row => useKey(row) === useKey(metadata.use));
  assert.equal(uses.length, 1); assert.deepEqual(uses[0].source_review, metadata.prior_review);
  uses[0].source_review = metadata.review;
  uses[0].source_review_history.push({source_parent: metadata.source_parent,
    prior_source_review: metadata.prior_review, reason: metadata.history_reason});
  const writes = new Map([[reviewPath, reviewBytes], [frozenPath, bytes(ledger)]]);
  // All other source judgments, source bytes, and the complete old review stay
  // byte-for-byte represented by the authenticated reconstruction above.
  return {line: profile.line, inspector, consolidation, before, writes, source_judgments_changed: 0,
    independent_code_bindings_refreshed: 1, actual_native_packed_or_floor_qualified: false};
}

/** Only a fully applied exact successor may enter the old CVA metadata lane. */
export function packedUpstreamFocusMetadataEpoch({root = process.cwd(), read = disk(root)} = {}) {
  const prepared = preparePackedUpstreamFocusMetadata({root, read});
  const assertCurrent = () => {
    assert.equal(hash(read(inputPath)), pins[prepared.line], 'late focus metadata inputs change');
    const prior = prepared.inspector.profile.source_role_metadata.prior_review;
    assert.equal(hash(read(prior.path)), prior.sha256, 'late original focus review change');
    for (const [path, expected] of prepared.writes)
      assert.equal(hash(read(path)), hash(expected), 'changed current focus source metadata ' + path);
    assert.equal(hash(read(inspectorPath)), prepared.inspector.ref.sha256, 'late current focus inspector change');
    assert.equal(hash(read(prepared.consolidation.ref.path)), prepared.consolidation.ref.sha256,
      'late current consolidation inspector change');
  };
  assertCurrent();
  const historical = path => {
    if (prepared.writes.has(path) || path === inspectorPath || path === prepared.consolidation.ref.path) assertCurrent();
    if (path === frozenPath) return Buffer.from(prepared.before);
    if (path === inspectorPath) return Buffer.from(prepared.inspector.before);
    if (path === prepared.consolidation.ref.path) return Buffer.from(prepared.consolidation.before);
    return read(path);
  };
  return {line: prepared.line, read: historical, raw: read, assertCurrent,
    inspector: {...prepared.inspector.ref},
    inspectors: [{...prepared.inspector.ref}, {...prepared.consolidation.ref}],
    projected_metadata_paths: [frozenPath, inspectorPath, prepared.consolidation.ref.path],
    source_judgments_changed: 0, actual_native_packed_or_floor_qualified: false};
}
