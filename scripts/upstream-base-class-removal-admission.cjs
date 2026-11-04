/**
 * @license
 * Copyright Google LLC All Rights Reserved.
 * Copyright (c) 2026 Ryan Lester.
 * Use of this source code is governed by the MIT license in LICENSE.
 */
/** One source applicability contract; canonical application belongs to the shared owner. */
'use strict';
const assert = require('node:assert/strict');
const {createHash} = require('node:crypto');
const {readFileSync} = require('node:fs');
const {execFileSync} = require('node:child_process');
const {join, resolve} = require('node:path');
const {gunzipSync} = require('node:zlib');
const ROOT = resolve(__dirname, '..');
const HANDLER = 'scripts/upstream-base-class-removal-admission.cjs';
const SHA = '55f9618b687fc0da4743a3cf27e113ceb837e151';
const PREFIX = 'compatibility/rc/21x-base-class-removal-admission-';
const SOURCE = 'compatibility/rc/21x-base-class-removal-source-';
const REVIEW = PREFIX + 'individual-review.json';
const REVIEW_HASH = '7bcfeb099e643da1c0099d4a1773f612d2e4b134d6e85f0679c5b4596f30b762';
const KIND = 'individual-historical-base-class-removal-source-review';
const SCOPE = 'base_class_removal_source_scope';
const hash = raw => createHash('sha256').update(raw).digest('hex');
const functionToString = Function.prototype.toString;
const image = readFileSync(__filename), handlerRef = {path: HANDLER, sha256: hash(image), bytes: image.length};
// Capture each producer before loading it. Current-file checks alone would not
// reject a producer changed after import; exact exported function identities
// also reject a previously cached implementation with different behavior.
const producerPaths = ['scripts/upstream-base-class-removal-source.mjs', SOURCE + 'final-review.mjs', 'scripts/historical-contract-repair-source.mjs'];
const loadedImages = new Map(producerPaths.map(path => [path, readFileSync(join(ROOT, path))]));
const {verifyBaseClassRemovalOriginal} = require('./upstream-base-class-removal-source.mjs');
const {validateBaseClassRemovalReview} = require('../' + SOURCE + 'final-review.mjs');
const {historicalContractRepairSourceSubject, readHistoricalContractRepairMember} = require('./historical-contract-repair-source.mjs');
const producerFunctions = [
  [verifyBaseClassRemovalOriginal, 'd67b84def0d5420b818feb336806d70009c0aaee53dab62c6cd7546da1a7fd33'],
  [validateBaseClassRemovalReview, '7ba2e397b673ed63a07f00a58a5cfdfcfd89238f8d4d574d6cdb992ae6527734'],
  [historicalContractRepairSourceSubject, '03b7124b9363c1c2a6d0b240d3f1d6de1ced5fa1073e34cbe90a414d84a663f4'],
  [readHistoricalContractRepairMember, '1c68187440d74b8d393de47b7660de0c86aa0c8689a687f125de1db001a8053b'],
];

function baseClassRemovalProof(body) {
  assert.equal(body?.sha, SHA);
  return {proof_kind: KIND, diff_sha256: body.diff_sha256, review_depth: 'individual-compatibility', affected_branches: ['21.x'], decision: body.decision,
    [SCOPE]: {sha: SHA, review: {path: REVIEW, sha256: REVIEW_HASH}, handler: {...handlerRef},
      source_inputs: structuredClone(body.source_inputs), qualified_repair_successors: structuredClone(body.qualified_repair_successors),
      complete_original_files: 72, original_hunks: 329, historical_source_bindings: 715, repaired_source_or_API_paths: 5,
      source_scope_only: true, canonical_transaction_delegated_to_shared_owner: true,
      canonical_admission_granted: false, actual_native_packed_browser_floor_or_full_audit_qualified: false}};
}

/** Pure exact metadata predicate: no reads and no cached source-pass admission. */
function metadataOk({entry, body, review, proof = entry?.individual_proof}) {
  try {
    assert.equal(hash(JSON.stringify(body, null, 2) + '\n'), REVIEW_HASH); assert.deepEqual(body, review);
    assert.equal(body.line, '21.x'); assert.equal(body.sha, SHA); assert.equal(body.status, 'reviewed');
    assert.equal(body.source_review_complete, true); assert.equal(body.source_scope_only, true);
    assert.equal(body.proposed_final_disposition, 'do-not-adopt'); assert.equal(body.read_note_disposition, 'owned-retained');
    assert.equal(body.canonical_admission_granted, false); assert.equal(body.g11_claim, 'not-passed');
    assert.equal(body.actual_native_packed_browser_floor_or_full_audit_qualified, false);
    const expectedProof = baseClassRemovalProof(body);
    const expected = {...body.before_entry, final_disposition: 'do-not-adopt', read_note_disposition: 'owned-retained',
      reason: body.decision, review_depth: 'individual-compatibility', evidence_report: REVIEW, individual_proof: expectedProof};
    assert.deepEqual(entry, expected); assert.deepEqual(proof, expectedProof); return true;
  } catch { return false; }
}

function gitOriginal(root, commit, path) {
  assert.match(commit, /^[0-9a-f]{40}$/);
  const env = {...process.env, GIT_NO_LAZY_FETCH: '1', GIT_NO_REPLACE_OBJECTS: '1'};
  for (const key of ['GIT_DIR', 'GIT_WORK_TREE', 'GIT_INDEX_FILE', 'GIT_COMMON_DIR', 'GIT_OBJECT_DIRECTORY', 'GIT_ALTERNATE_OBJECT_DIRECTORIES']) delete env[key];
  return execFileSync('git', ['--no-replace-objects', '-c', 'gc.auto=0', '-c', 'maintenance.auto=0', 'show', commit + ':' + path], {cwd: root, env, maxBuffer: 8 * 1024 * 1024});
}

/** Fresh physical source qualification; never invokes either old inspector/CLI. */
function inspectSource(request = {}) {
  const {root = ROOT, read: providedRead} = request;
  const metadata = () => ({entry: request.entry, body: request.body, review: request.review,
    proof: request.proof === undefined ? request.entry?.individual_proof : request.proof});
  assert.equal(resolve(root), ROOT); assert.equal(metadataOk(metadata()), true);
  // All judgments use one authenticated snapshot. Callbacks may not change the
  // live metadata while bytes are read, nor after a guard has been returned.
  const intended = structuredClone(metadata()), body = intended.body;
  const assertMetadata = () => {
    assert.equal(resolve(request.root ?? ROOT), ROOT);
    assert.equal(metadataOk(metadata()), true, 'changed live base-class admission metadata');
    assert.deepEqual(metadata(), intended, 'reattributed base-class admission metadata');
  };
  const bound = new Map();
  const read = path => {
    const actual = readHistoricalContractRepairMember(root, path);
    if (providedRead) { const provided = providedRead(path); assert.ok(Buffer.isBuffer(provided) && provided.equals(actual), 'nonphysical base-class admission input ' + path); }
    const ref = {path, sha256: hash(actual), bytes: actual.length}, prior = bound.get(path);
    if (prior) assert.deepEqual(ref, prior, 'input changed during base-class admission ' + path); else bound.set(path, ref);
    return actual;
  };
  const member = ref => {
    const raw = read(ref.path); assert.equal(hash(raw), ref.sha256, 'changed base-class admission input ' + ref.path);
    if (ref.bytes !== undefined) assert.equal(raw.length, ref.bytes); return raw;
  };
  member(handlerRef); member({path: REVIEW, sha256: REVIEW_HASH});
  assert.deepEqual(JSON.parse(read(REVIEW)), body);
  for (const ref of body.source_inputs) member(ref);
  for (const [path, loaded] of loadedImages) assert.ok(read(path).equals(loaded), 'loaded/current base-class producer ' + path);
  for (const [fn, expected] of producerFunctions) assert.equal(hash(functionToString.call(fn)), expected, 'loaded base-class producer function ' + fn.name);
  assert.equal(process.versions.node, JSON.parse(read('toolchain-lock.json')).repository.node);
  assert.ok(JSON.parse(read('projects/ngx-material-legacy/package.json')).version.startsWith('21.'));

  const repairs = historicalContractRepairSourceSubject({root, read});
  assert.equal(repairs.line, '21.x'); assert.equal(repairs.old_product_bytes_exposed, false);
  for (const ref of repairs.bound) member(ref);
  assert.deepEqual(repairs.images.map(({path, before, after}) => ({path, before, after})), body.qualified_repair_successors);
  const final = JSON.parse(read(SOURCE + 'final-review-qualified.json'));
  assert.equal(final.source_bindings.length, 715); assert.equal(new Set(final.source_bindings.map(ref => ref.path)).size, 715);
  assert.equal(final.required_repairs_satisfied, false); assert.equal(final.canonical_admission_ready, false);
  assert.equal(final.source_review_complete, true); assert.equal(final.substantive_whole_SHA_review_complete, true);
  const canonicalHistory = new Map(body.acquisition_canonical_context.map(ref => [ref.path, ref]));
  assert.equal(canonicalHistory.size, 3);
  const historicalCanonicalMember = ref => {
    assert.deepEqual(ref, canonicalHistory.get(ref.path));
    const old = gitOriginal(root, body.canonical_history_commit, ref.path);
    assert.equal(hash(old), ref.sha256, 'unauthenticated acquisition context ' + ref.path); assert.equal(old.length, ref.bytes);
  };
  let changed = 0, historical = 0;
  for (const ref of final.source_bindings) {
    if (canonicalHistory.has(ref.path)) {
      historicalCanonicalMember(ref);
      historical++; continue;
    }
    const successor = repairs.qualify(ref);
    if (successor) { assert.deepEqual(repairs.historicalReference(ref), ref); assert.notEqual(successor.sha256, ref.sha256); changed++; }
    member(successor || ref);
  }
  assert.equal(changed, 5); assert.equal(historical, 3);
  const original = JSON.parse(gunzipSync(read(SOURCE + 'originals.json.gz')));
  const census = JSON.parse(gunzipSync(read('compatibility/rc/upstream-complete-patch-census.json.gz')));
  const originalFacts = verifyBaseClassRemovalOriginal(original, census);
  assert.deepEqual(originalFacts.files.map(row => row.path), body.complete_original_paths);
  assert.deepEqual(originalFacts.files.filter(row => row.path.startsWith('src/')).map(row => row.path), body.frozen_seed_paths);
  assert.equal(original.diff_sha256, body.diff_sha256);
  const keys = {original: 'original-qualified', journal: 'review-progress-tabs-tooltip', controls: 'owned-control-member-review',
    overlays: 'owned-overlay-member-review', dialog: 'owned-dialog-member-review', unmatched: 'unmatched-declarations-assessed',
    bindings: 'public-binding-qualified', rx: 'rx-signature-qualified', error: 'error-harness-proposal-qualified',
    snack: 'snack-token-proposal-qualified', ink: 'nav-inkbar-proposal-qualified', keyboard: 'menu-keyboard-proposal-qualified',
    initial: 'owned-member-inventory', supplement: 'owned-closure-supplement'};
  const data = Object.fromEntries(Object.entries(keys).map(([key, suffix]) => [key, JSON.parse(read(SOURCE + suffix + '.json'))]));
  const facts = validateBaseClassRemovalReview(data, original);
  assert.deepEqual(facts.decisions, final.per_hunk_decisions);
  assert.equal(facts.member_entries_reviewed, body.member_difference_entries_reviewed);
  assert.equal(facts.headers_reviewed, body.changed_headers_reviewed);
  assert.equal(facts.declarations_reviewed, body.remaining_tagged_declarations_reviewed);
  const api = JSON.parse(read('compatibility/rc/base-class-removal-api-contract-21x-qualified.json'));
  let apiHistoricalCanonicalReferences = 0;
  for (const ref of api.source_bindings) {
    if (canonicalHistory.has(ref.path)) { historicalCanonicalMember(ref); apiHistoricalCanonicalReferences++; }
    else member(ref);
  }
  assert.equal(apiHistoricalCanonicalReferences, 1);
  assert.equal(api.line, '21.x'); assert.equal(api.status, 'pass'); assert.deepEqual(api.comparison.blocking, []);
  assert.equal(api.waiver_transition.current, 113); assert.equal(api.controls_rejected, 11);
  assert.equal(api.full449symbol_program_executed, false);
  const assertCurrent = () => {
    assertMetadata();
    repairs.assertCurrent();
    for (const ref of bound.values()) {
      const actual = readHistoricalContractRepairMember(root, ref.path);
      assert.equal(hash(actual), ref.sha256, 'late base-class admission input ' + ref.path); assert.equal(actual.length, ref.bytes);
      if (providedRead) { const provided = providedRead(ref.path); assert.ok(Buffer.isBuffer(provided) && provided.equals(actual), 'late nonphysical base-class admission input ' + ref.path); }
    }
    assertMetadata();
  };
  assertCurrent();
  return {bound: structuredClone([...bound.values()]), historical_canonical_context: structuredClone([...canonicalHistory.values()]), assertCurrent,
    facts: {original_files: 72, original_hunks: 329, member_entries: 361, changed_headers: 71, tagged_declarations: 65,
      historical_source_bindings_revalidated: 715, qualified_repair_successors: 5, authenticated_historical_canonical_context: 3,
      additional_historical_canonical_reference_occurrences: apiHistoricalCanonicalReferences,
      pure_original_authentication_reexecuted: true, pure_individual_hunk_review_reexecuted: true,
      source_scope_only: true, canonical_transaction_delegated_to_shared_owner: true, canonical_admission_granted: false,
      actual_native_packed_browser_floor_or_full_audit_qualified: false, g11_claim: 'not-passed'}};
}
function sourceOk(args) { try { const source = inspectSource(args); source.assertCurrent(); return true; } catch { return false; } }
function inspectCanonicalSource(request) {
  const {entries, body, ...args} = request;
  const intended = structuredClone({entries, body});
  const assertMetadata = () => {
    assert.deepEqual(request.entries.map(row => row.sha), [SHA]);
    assert.deepEqual({entries: request.entries, body: request.body}, intended, 'changed canonical base-class metadata');
    assert.equal(metadataOk({entry: request.entries[0], body: request.body, review: request.body}), true);
  };
  assertMetadata();
  const source = inspectSource({...args, entry: entries[0], body, review: body, proof: entries[0].individual_proof});
  const assertCurrent = () => { assertMetadata(); source.assertCurrent(); assertMetadata(); };
  assertCurrent();
  return {...source, assertCurrent, individual_metadata_cases: 1, fresh_whole_body_source_reviews: 1, source_scope_only: true,
    current_native_packed_floor_or_G11_credit: false};
}
module.exports = {BASE_CLASS_REMOVAL_SHA: SHA, BASE_CLASS_REMOVAL_REVIEW: REVIEW, BASE_CLASS_REMOVAL_REVIEW_HASH: REVIEW_HASH,
  BASE_CLASS_REMOVAL_PROOF_KIND: KIND, BASE_CLASS_REMOVAL_SCOPE_KEY: SCOPE,
  baseClassRemovalProof, metadataOk, inspectSource, sourceOk, inspectCanonicalSource};
