/**
 * @license
 * Copyright Google LLC All Rights Reserved.
 * Copyright (c) 2026 Ryan Lester.
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.io/license
 */
/** Finite source-context repair. No new semantic closure or runtime credit. */
import assert from 'node:assert/strict';
import {readNativeDatePackedBefore,nativeDateHistoricalProductRead} from './native-date-packed-source-context.mjs';
import {createHash} from 'node:crypto';
import {createRequire} from 'node:module';
import {execFileSync} from 'node:child_process';
import {readFileSync, writeFileSync, existsSync} from 'node:fs';
import {gunzipSync} from 'node:zlib';
import {dirname, resolve} from 'node:path';
import {fileURLToPath, pathToFileURL} from 'node:url';
import {reverseBidiIsolatedPackedSource, bidiRequirementsBefore} from './bidi-isolated-packed-source-requalification.mjs';
import {artifactBehaviorRequirements} from './upstream-artifact-behavior-evidence.mjs';
import {selectionRequirementsBefore,readSelectionComparatorBefore} from './selection-comparator-packed-source-context.mjs';
import {generatedIdentityRequirements} from './upstream-generated-identity-evidence.mjs';
import {authoredUseReviewEvidence} from './authored-use-inventory.mjs';
import {scanCurrentAuthoredUses, currentAuthoredUseAdmission} from './authored-current-use-inventory.mjs';
import {candidateProductSourcePaths} from './upstream-candidate-source-evidence.mjs';
const rootDefault = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const prefix = 'compatibility/rc/bidi-isolated-packed-', inputPath = prefix + 'source-inputs.json';
const proofPath = prefix + 'requalification-proof.json';
const ledgerPath = 'compatibility/f10/disposition-ledger/ledger.json';
const reviewPath = 'compatibility/f10/authored-use-reviews/bidi-isolated-packed-requalified-boundaries.json';
const ts = createRequire(import.meta.url)('typescript');
const hash = value => createHash('sha256').update(value).digest('hex');
const json = value => Buffer.from(JSON.stringify(value, null, 2) + '\n');
const key = row => JSON.stringify([row.file, row.module, row.symbol]);
function replaceRows(text, property, updates, rowKey) {
  const tree = ts.parseJsonText('rows.json', text); assert.equal(tree.parseDiagnostics.length, 0);
  const array = tree.statements[0].expression.properties.find(row => row.name.text === property).initializer;
  const edits = [];
  for (const node of array.elements) {
    const next = updates.get(rowKey(JSON.parse(node.getText(tree)))); if (!next) continue;
    const indent = ' '.repeat(tree.getLineAndCharacterOfPosition(node.getStart(tree)).character);
    edits.push({start: node.getStart(tree), end: node.end, text: JSON.stringify(next, null, 2).replaceAll('\n', '\n' + indent)});
  }
  assert.equal(edits.length, updates.size);
  for (const edit of edits.reverse()) text = text.slice(0, edit.start) + edit.text + text.slice(edit.end);
  return Buffer.from(text);
}
export function inspectBidiIsolatedRequalification({root = rootDefault, readMember} = {}) {
  const actualRead = path => readMember ? readMember(path) : readFileSync(resolve(root, path));
  const historicalRead = readMember || (path => readSelectionComparatorBefore(path, name => readNativeDatePackedBefore(name, actualRead)));
  const productParent = JSON.parse(historicalRead(inputPath)).source_parent;
  const read = nativeDateHistoricalProductRead(productParent, historicalRead);
  const line = JSON.parse(read('projects/ngx-material-legacy/package.json')).version.startsWith('21.') ? '21.x' : 'main';
  // This call authenticates the input pin and complete archive before parsing it here.
  reverseBidiIsolatedPackedSource('scripts/packed-consumer-aot-smoke.mjs', read('scripts/packed-consumer-aot-smoke.mjs').toString(), line, {readMember: read});
  const inputs = JSON.parse(read(inputPath)); assert.equal(inputs.line, line);
  const unpack = ref => {
    const stored = read(ref.path); assert.equal(hash(stored), ref.sha256, 'preceding archive changed');
    const raw = gunzipSync(stored); assert.equal(hash(raw), ref.raw_sha256);
    const data = JSON.parse(raw); assert.equal(data.line, line); return data;
  };
  const prior = unpack(inputs.prior), roles = unpack(inputs.roles);
  const behaviorInputBytes = read(inputs.behavior_inputs.path);
  assert.equal(hash(behaviorInputBytes), inputs.behavior_inputs.sha256, 'preceding behavior inputs changed');
  const behaviorInputs = JSON.parse(behaviorInputBytes), behavior = unpack(behaviorInputs.prior);
  assert.equal(prior.source_parent, inputs.source_parent); assert.equal(roles.source_parent, inputs.source_parent);
  const before = new Map(prior.members.map(row => {
    assert.equal(hash(row.text), row.sha256);
    const current = read(row.path).toString();
    assert.equal(hash(current), inputs.changes.find(change => change.path === row.path)?.current_sha256 || row.sha256,
      'current reviewed source changed');
    assert.equal(reverseBidiIsolatedPackedSource(row.path, current, line, {readMember: read}), row.text, 'preceding source not recovered');
    return [row.path, Buffer.from(row.text)];
  }));
  const addedLine = "  'scripts/bidi-isolated-packed-contract.mjs', 'scripts/bidi-isolated-packed-fixture.mjs',\n";
  for (const path of ['scripts/upstream-artifact-behavior-evidence.mjs', 'scripts/upstream-generated-identity-evidence.mjs']) {
    const current = read(path).toString();
    assert.equal(current.split(addedLine).length - 1, path.includes('artifact-behavior') ? 2 : 1);
    assert.equal(current.replaceAll(addedLine, ''), before.get(path).toString(), 'runtime validation policy changed');
  }
  const producerChange = JSON.parse(read(prefix + 'producer-change.json'));
  let producer = read('scripts/packed-consumer-aot-smoke.mjs').toString(); assert.equal(hash(producer), producerChange.current_sha256);
  assert.equal(producerChange.edits.length, 9);
  for (const [old, current] of [...producerChange.edits].reverse()) {
    assert.equal(producer.split(current).length, 2); producer = producer.replace(current, () => old);
  }
  assert.equal(producer, before.get('scripts/packed-consumer-aot-smoke.mjs').toString());
  const product = execFileSync('git', ['-c', 'gc.auto=0', '-c', 'maintenance.auto=0', 'ls-tree', '-r', '-z', inputs.source_parent, '--', 'projects/ngx-material-legacy'], {cwd: root})
    .toString().split('\0').filter(Boolean).map(row => {
      const [meta, path] = row.split('\t'), [mode, kind, blob] = meta.split(' '), bytes = read(path);
      assert.equal(mode, '100644'); assert.equal(kind, 'blob');
      assert.equal(createHash('sha1').update('blob ' + bytes.length + '\0').update(bytes).digest('hex'), blob, 'product changed');
      return {path, sha256: hash(bytes), git_blob: blob};
    });
  assert.equal(product.length, 1141);
  assert.deepEqual(candidateProductSourcePaths(root).sort(), product.map(row => row.path).filter(path => /\.(ts|scss|css|html)$/.test(path)).sort());
  const oldDocs = new Map([...behavior.members, ...roles.reviews, ...roles.stores].map(row => {
    assert.equal(hash(row.text), row.sha256);
    if (!roles.stores.some(store => store.path === row.path) && !before.has(row.path))
      assert.equal(hash(read(row.path)), row.sha256, 'original review changed');
    return [row.path, Buffer.from(row.text)];
  }));
  const oldRead = path => before.get(path) || oldDocs.get(path) || read(path);
  const affectedKeys = new Set(roles.affected.map(row => JSON.stringify(row.key))); assert.equal(affectedKeys.size, 167);
  const affected = roles.stores.flatMap(store => JSON.parse(store.text).symbol_uses.filter(row => affectedKeys.has(key(row))));
  assert.equal(affected.length, 167);
  assert.deepEqual(authoredUseReviewEvidence({symbol_uses: affected}, line, oldRead, hash), {reviewed: 167, insufficient: 0, insufficient_uses: []});
  const dependencies = ['scripts/bidi-isolated-packed-contract.mjs', 'scripts/bidi-isolated-packed-fixture.mjs',
    'scripts/bidi-isolated-packed-source-requalification.mjs', 'scripts/bidi-isolated-packed-evidence-requalification.mjs',
    'tests/bidi_isolated_packed_sample.mjs', 'tests/bidi_isolated_packed_probe.mjs',
    'tests/bidi_isolated_requalification_probe.mjs', 'tests/test_bidi_isolated_requalification.py'].map(path => ({path, sha256: hash(read(path))}));
  const proof = {schema_version: 1, line, source_parent: inputs.source_parent, inputs: {path: inputPath, sha256: hash(read(inputPath))},
    preceding_sources: prior.members.map(({text, ...row}) => row), source_changes: inputs.changes.map(({edits, ...row}) => ({...row, exact_edits: edits.length})),
    complete_preceding_sources_recovered: before.size, original_runtime_validation_bodies_unchanged: true,
    unchanged_product_members: product.length, unchanged_product_population_sha256: hash(JSON.stringify(product)),
    behavior_subjects: behavior.entries.map(row => row.sha), existing_authored_uses: roles.affected, dependencies,
    producer_change: {path: prefix + 'producer-change.json', sha256: hash(read(prefix + 'producer-change.json'))},
    focused_controls: {path: prefix + 'controls.json', sha256: hash(read(prefix + 'controls.json'))},
    scope: 'Only a strict additional isolated bidi observation enters the existing full106 packed case. Earlier runtime predicates, patch judgments, product bytes, per-use decisions and historical receipts retain their subjects and limits. Source-context receipts additionally bind both new fixture/contract dependencies. No new runtime, SHA or authored-use closure is claimed.',
    new_role_or_SHA_closures: 0, actual_packed_native_or_floor_qualified: false, g11_claim: 'not-passed'};
  const proofBytes = json(proof), proofRef = {path: proofPath, sha256: hash(proofBytes)}, writes = new Map([[proofPath, proofBytes]]);
  const entries = [];
  for (const previous of behavior.entries) {
    const current = structuredClone(previous), field = previous.individual_proof.artifact_behavior ? 'artifact_behavior' : 'generated_identity_behavior';
    const currentDefinition = field === 'artifact_behavior' ? artifactBehaviorRequirements(previous.sha) : generatedIdentityRequirements(previous.sha);
    const definition = selectionRequirementsBefore(previous.sha, currentDefinition, line, {readMember: read});
    const previousDefinition = bidiRequirementsBefore(previous.sha, definition, line, {readMember: read});
    assert.deepEqual(previous.individual_proof[field].source_members.map(row => row.path), previousDefinition.members);
    for (const ref of previous.individual_proof[field].source_members) assert.equal(hash(oldRead(ref.path)), ref.sha256);
    current.individual_proof[field].source_members = definition.members.map(path => ({path, sha256: hash(read(path))}));
    const original = JSON.parse(oldDocs.get(previous.evidence_report)), review = structuredClone(original);
    const previousRef = {path: previous.evidence_report, sha256: hash(oldDocs.get(previous.evidence_report))};
    if (field === 'artifact_behavior') {
      assert.deepEqual(review.reviewed_source_members, previous.individual_proof[field].source_members);
      review.reviewed_source_members = structuredClone(current.individual_proof[field].source_members);
    } else {
      assert.deepEqual(review.individual_proof, previous.individual_proof);
      review.individual_proof = structuredClone(current.individual_proof);
    }
    for (const ref of review.independent_evidence) if (hash(read(ref.path)) !== ref.sha256) {
      assert.ok(before.has(ref.path)); assert.equal(hash(before.get(ref.path)), ref.sha256); ref.sha256 = hash(read(ref.path));
    }
    review.independent_evidence.push(previousRef, proofRef, ...dependencies);
    review.bidi_isolated_source_context = {previous_source_review: previousRef, source_proof: proofRef,
      original_hunk_decisions_retained: true, runtime_validation_bodies_unchanged: true, actual_runtime_qualified: false};
    assert.deepEqual(review.hunk_reviews, original.hunk_reviews); assert.equal(review.source_conclusion, original.source_conclusion);
    assert.equal(review.semantic_pass, false);
    const path = 'compatibility/f10/disposition-ledger/evidence/closeout-bidi-context-' + previous.sha + '.json';
    writes.set(path, json(review)); current.evidence_report = path;
    current.source_check = {...current.source_check, evidence_report_sha256: hash(writes.get(path))};
    current.bidi_isolated_source_context = {previous_source_review: previousRef, source_proof: proofRef}; entries.push(current);
  }
  assert.equal(entries.length, 9);
  const ledgerBefore = read(ledgerPath).toString(), wanted = new Map(entries.map(row => [row.sha, row]));
  const ledger = replaceRows(ledgerBefore, 'entries', wanted, row => row.sha);
  for (const row of JSON.parse(ledgerBefore).entries) {
    const old = behavior.entries.find(value => value.sha === row.sha);
    if (old) assert.ok(JSON.stringify(row) === JSON.stringify(old) || JSON.stringify(row) === JSON.stringify(wanted.get(row.sha)), 'live behavior disposition drift');
  }
  assert.deepEqual(JSON.parse(ledger).entries.filter(row => !wanted.has(row.sha)), JSON.parse(ledgerBefore).entries.filter(row => !wanted.has(row.sha)));
  writes.set(ledgerPath, ledger);
  const reviews = affected.map(row => {
    const doc = JSON.parse(oldDocs.get(row.source_review.path)), matches = doc.reviews.filter(value => key(value) === key(row)); assert.equal(matches.length, 1);
    const old = matches[0], review = structuredClone(old);
    assert.equal(hash(read('projects/ngx-material-legacy/' + row.file)), old.candidate_source_sha256);
    for (const ref of review.independent_evidence) if (hash(read(ref.path)) !== ref.sha256) {
      assert.ok(before.has(ref.path), 'unreviewed role receipt change'); assert.equal(hash(before.get(ref.path)), ref.sha256); ref.sha256 = hash(read(ref.path));
    }
    review.independent_evidence.push(row.source_review, proofRef, ...dependencies);
    review.bidi_isolated_source_context = {previous_source_review: row.source_review, source_proof: proofRef,
      original_decision_and_product_unchanged: true, actual_packed_or_floor_qualified: false};
    assert.equal(review.decision, old.decision); assert.equal(review.conclusion, old.conclusion); return review;
  });
  const reviewBytes = json({schema_version: 1, line, status: 'reviewed', reviews, g11_claim: 'not-passed'});
  writes.set(reviewPath, reviewBytes);
  for (const store of roles.stores) {
    const old = JSON.parse(store.text), updates = new Map(old.symbol_uses.filter(row => affectedKeys.has(key(row))).map(row => {
      const next = structuredClone(row); next.source_review = {path: reviewPath, sha256: hash(reviewBytes)};
      next.source_review_history = [...(row.source_review_history || []), {source_parent: inputs.source_parent, prior_source_review: row.source_review,
        reason: 'Exact isolated bidi tooling requalification; original role conclusions and runtime scopes retained.'}]; return [key(row), next];
    }));
    const bytes = replaceRows(store.text, 'symbol_uses', updates, key);
    assert.ok(read(store.path).equals(Buffer.from(store.text)) || read(store.path).equals(bytes), 'live authored disposition drift');
    writes.set(store.path, bytes);
  }
  const afterRead = path => writes.get(path) || read(path);
  const frozen = JSON.parse(writes.get(roles.stores[0].path)), current = JSON.parse(writes.get(roles.stores[1].path));
  const frozenEvidence = authoredUseReviewEvidence(frozen, line, afterRead, hash);
  assert.equal(frozenEvidence.reviewed, 1446); assert.equal(frozenEvidence.insufficient, 0);
  const currentAdmission = currentAuthoredUseAdmission({root,current: scanCurrentAuthoredUses({root, readSource: read}),
    frozen: frozen.symbol_uses, candidate: current, line, readMember: afterRead});
  assert.equal(currentAdmission.source_snapshot_valid, true); assert.equal(currentAdmission.review_evidence.reviewed, 178);
  assert.equal(currentAdmission.review_evidence.insufficient, 0); assert.equal(currentAdmission.inventory.open, 130);
  return {proof, writes, entries, frozenEvidence, currentAdmission};
}
export function recordBidiIsolatedRequalification(root = rootDefault) {
  assert.equal(existsSync(resolve(root, proofPath)), false, 'already recorded');
  const result = inspectBidiIsolatedRequalification({root});
  for (const [path, bytes] of result.writes) writeFileSync(resolve(root, path), bytes);
  return {line: result.proof.line, source_contexts_requalified: result.entries.length, existing_authored_uses_requalified: 167,
    new_role_or_SHA_closures: 0, actual_packed_native_or_floor_qualified: false, g11_claim: 'not-passed'};
}
if (process.argv[1] && import.meta.url === pathToFileURL(resolve(process.argv[1])).href) {
  assert.deepEqual(process.argv.slice(2), ['--record']); console.log(JSON.stringify(recordBidiIsolatedRequalification()));
}
