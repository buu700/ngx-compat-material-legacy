/**
 * @license
 * Copyright Google LLC All Rights Reserved.
 * Copyright (c) 2026 Ryan Lester.
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.io/license
 */
/** One individual source decision; current packed execution stays mandatory. */
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {createRequire} from 'node:module';
import {execFileSync} from 'node:child_process';
import {existsSync, readFileSync, writeFileSync} from 'node:fs';
import {gunzipSync} from 'node:zlib';
import {dirname, resolve} from 'node:path';
import {fileURLToPath, pathToFileURL} from 'node:url';
import {selectionComparatorSourceContext, reverseSelectionComparatorSource, selectionRequirementsBefore} from './selection-comparator-packed-source-context.mjs';
import {bidiPeerSourceContext, reverseBidiPeerSource} from './bidi-peer-source-context.mjs';
import {SELECTION_BEHAVIOR_SHA, SELECTION_BEHAVIOR_KIND, selectionBehaviorRequirements} from './upstream-selection-evidence.mjs';
import {artifactBehaviorRequirements} from './upstream-artifact-behavior-evidence.mjs';
import {generatedIdentityRequirements} from './upstream-generated-identity-evidence.mjs';
import {bidiBehaviorRequirements} from './upstream-bidi-evidence.mjs';
import {historicalBehaviorRequirements} from './upstream-historical-behavior-evidence.mjs';
import {progressCspRequirements} from './upstream-progress-csp-evidence.mjs';
import {reviewSelectionModelUses} from './selection-model-use-review.mjs';
import {candidateProductSourcePaths} from './upstream-candidate-source-evidence.mjs';
import {authoredUseReviewEvidence} from './authored-use-inventory.mjs';
import {scanCurrentAuthoredUses, currentAuthoredUseAdmission} from './authored-current-use-inventory.mjs';
const rootDefault = resolve(dirname(fileURLToPath(import.meta.url)), '..'), ts = createRequire(import.meta.url)('typescript');
const prefix = 'compatibility/rc/selection-comparator-packed-', proofPath = prefix + 'source-proof.json';
const ledgerPath = 'compatibility/f10/disposition-ledger/ledger.json';
const rolePath = 'compatibility/f10/authored-use-reviews/selection-comparator-packed-requalified-boundaries.json';
const hash = value => createHash('sha256').update(value).digest('hex'), json = value => Buffer.from(JSON.stringify(value, null, 2) + '\n');
const key = row => JSON.stringify([row.file, row.module, row.symbol]);
const decision = 'Inherit the complete public SelectionModel comparator fix through the advertised current CDK peer. Both exact minimum public collections closures implement concrete-value canonicalization and retain a real selected option when setSelection receives a distinct comparator-equivalent option. Four owned constructors in three files use identity-only models and no owned caller invokes setSelection; the public selection-list model nevertheless permits application comparator and selection changes. Preserve that public capability without a CDK fork, private import, consumer API migration or component/style change. The original two-call regression remains independently required. The added packed probe must use actual options from two real legacy lists, retain the first list model/options/nodes, observe exact selected identities/getters/ARIA and all reentrant event payloads across eight phases, leave the second list untouched and unsubscribe its own observer. Exact untouched tagged receiver methods with complete authentic peer models explain the historical duplicate emissions; explicit callback/HTML protocols are source diagnostics only. Require the original assertion, equal raw/selected rich observation, full106 current-clean same-run packed evidence and exact artifact identity before runtime admission. Compiler, Node/RxJS, native and remaining peer floors, all authored uses and complete G11 remain separately pending.';
const judgments = [
  'setSelection canonicalizes each prospective value against the existing concrete selection before the deletion phase. A distinct real option with the same public value must retain the already-selected option identity. Both minimum complete algorithms also canonicalize the removed-value predicate; reverting only the new Set expression is therefore insufficient to reproduce the old defect. The complete-original-algorithm reversion is rejected. Own no model implementation or private helper.',
  'The added upstream regression invokes the public single-selection model twice with distinct comparator-equivalent values and disabled notifications. The earlier whole-authenticated-module diagnostic executes that original condition. The unchanged packed two-call assertion and the new eight-phase genuine-list probe additionally require public identity, getters, real nodes/ARIA and exact event histories. The second list supplies valid option instances, and every state requires its own model/getters/nodes to remain untouched. These requirements do not imply that a source protocol or synthetic admission control is a packed/native/floor pass.',
];
function replaceRows(text, property, updates, identify) {
  const tree = ts.parseJsonText('rows.json', text); assert.equal(tree.parseDiagnostics.length, 0);
  const array = tree.statements[0].expression.properties.find(row => row.name.text === property).initializer, edits = [];
  for (const node of array.elements) {
    const next = updates.get(identify(JSON.parse(node.getText(tree)))); if (!next) continue;
    const indent = ' '.repeat(tree.getLineAndCharacterOfPosition(node.getStart(tree)).character);
    edits.push({start: node.getStart(tree), end: node.end, text: JSON.stringify(next, null, 2).replaceAll('\n', '\n' + indent)});
  }
  assert.equal(edits.length, updates.size);
  for (const edit of edits.reverse()) text = text.slice(0, edit.start) + edit.text + text.slice(edit.end);
  return Buffer.from(text);
}
export function inspectSelectionComparatorJudgments({root = rootDefault, readMember} = {}) {
  const read = path => readMember ? readMember(path) : readFileSync(resolve(root, path));
  const {data, prior} = selectionComparatorSourceContext(read), line = data.line;
  const old = new Map([...prior.members, ...prior.review_subjects].map(row => [row.path, Buffer.from(row.text)]));
  assert.equal(data.target_sha, SELECTION_BEHAVIOR_SHA); assert.equal(prior.entries.length, 17); assert.equal(data.source_changes.length, 20);
  for (const change of data.source_changes) {
    assert.equal(hash(read(change.path)), change.current_sha256);
    assert.equal(reverseSelectionComparatorSource(change.path, read(change.path).toString(), {readMember: read}), old.get(change.path).toString());
  }
  for (const row of prior.members.filter(row => row.path.startsWith('compatibility/f10/'))) assert.equal(hash(read(row.path)), row.sha256, 'preceding individual/role review changed');
  const earlierContextReceipts = [];
  const refreshRef = ref => {
    const bytes = read(ref.path); if (hash(bytes) === ref.sha256) return {...ref};
    if (!old.has(ref.path)) {
      assert.equal(ref.path, 'tests/bidi_isolated_requalification_probe.mjs', 'unreviewed earlier stale source receipt');
      const peer = bidiPeerSourceContext(read), change = peer.inputs.source_changes.find(row => row.path === ref.path);
      assert.equal(change.before_sha256, ref.sha256); assert.equal(change.current_sha256, hash(bytes));
      assert.equal(hash(reverseBidiPeerSource(ref.path, bytes.toString(), read)), ref.sha256, 'complete earlier source not recovered');
      return {...ref, sha256: hash(bytes)};
    }
    assert.equal(hash(old.get(ref.path)), ref.sha256, 'receipt was already stale before this worksheet: ' + ref.path);
    assert.ok(data.source_changes.some(row => row.path === ref.path), 'changed receipt outside finite reviewed source scope');
    return {...ref, sha256: hash(bytes)};
  };
  for (const entry of prior.entries) {
    for (const ref of JSON.parse(old.get(entry.evidence_report)).independent_evidence || []) {
      if (!old.has(ref.path) && hash(read(ref.path)) !== ref.sha256) {
        const refreshed = refreshRef(ref);
        earlierContextReceipts.push({sha: entry.sha, path: ref.path, before_sha256: ref.sha256, current_sha256: refreshed.sha256,
          reason: 'The earlier bidi-peer worksheet changed only this offline review-subject adapter. Six artifact reviews still cited its preceding bytes. The immutable bidi-peer capsule recovers the complete source exactly; retain each original review and requalify the context without runtime credit.'});
      }
    }
  }
  assert.equal(earlierContextReceipts.length, 6);
  const pkg = JSON.parse(read('projects/ngx-material-legacy/package.json'));
  assert.equal(pkg.version.startsWith('21.') ? '21.x' : 'main', line);
  const product = execFileSync('git', ['-c', 'gc.auto=0', '-c', 'maintenance.auto=0', 'ls-tree', '-r', '-z', data.source_parent, '--', 'projects/ngx-material-legacy'], {cwd: root})
    .toString().split('\0').filter(Boolean).map(row => {
      const [meta, path] = row.split('\t'), [mode, kind, blob] = meta.split(' '), bytes = read(path);
      assert.equal(mode, '100644'); assert.equal(kind, 'blob');
      assert.equal(createHash('sha1').update('blob ' + bytes.length + '\0').update(bytes).digest('hex'), blob, 'product source changed');
      return {path, sha256: hash(bytes), git_blob: blob};
    });
  assert.equal(product.length, 1141); assert.deepEqual(candidateProductSourcePaths(root).sort(), product.map(row => row.path).filter(path => /\.(ts|scss|css|html)$/.test(path)).sort());
  const uses = reviewSelectionModelUses({root, readSource: path => read(path).toString()}); assert.equal(uses.cases.length, 3);
  assert.equal(uses.cases.flatMap(row => row.constructors).length, 4); assert.equal(uses.delta_sources[0].reads.length, 2);
  const original = data.original;
  assert.equal(createHash('sha1').update('commit ' + Buffer.byteLength(original.commit_object) + '\0').update(original.commit_object).digest('hex'), SELECTION_BEHAVIOR_SHA);
  assert.equal(hash(original.commit_object), original.commit_object_sha256); assert.equal(hash(read(original.path)), original.sha256);
  const hunks = []; let file;
  for (const text of read(original.path).toString().split('\n')) {
    if (text.startsWith('diff --git ')) file = text.split(' b/')[1];
    if (text.startsWith('@@')) hunks.push({hunk: hunks.length + 1, file, header: text});
  }
  assert.deepEqual(hunks.map(row => row.file), ['src/cdk/collections/selection-model.ts', 'src/cdk/collections/selection.spec.ts']);
  const capsule = JSON.parse(read('compatibility/rc/selection-model-public-subjects.json')), minimumPeers = [];
  assert.equal(hash(read('compatibility/rc/selection-model-public-subjects.json')), '4932727a9d031223efc0108d2d22c4a95019b81ee06e834424246173bf7998cc');
  for (const peerLine of ['main', '21.x']) {
    const subject = capsule.subjects.find(row => row.line === peerLine), sources = new Map();
    for (const member of subject.members) {
      const bytes = read(member.path); assert.equal(hash(bytes), member.stored_sha256); const raw = gunzipSync(bytes);
      assert.equal(hash(raw), member.sha256); assert.equal(raw.length, member.bytes); sources.set(member.module_path, raw.toString());
    }
    const definition = selectionBehaviorRequirements(SELECTION_BEHAVIOR_SHA, peerLine), model = sources.get('fesm2022/_selection-model-chunk.mjs');
    assert.ok(model.includes('new Set(values.map(value => this._getConcreteValue(value)))'));
    assert.ok(model.includes('!newSelectedSet.has(this._getConcreteValue(value, newSelectedSet))'));
    const declarations = sources.get('types/_selection-model-chunk.d.ts');
    assert.ok(declarations.includes('setSelection(...values: T[]): boolean;'));
    assert.ok(declarations.includes('compareWith?: ((o1: T, o2: T) => boolean) | undefined;')); assert.doesNotMatch(declarations, /@deprecated/);
    const metadata = JSON.parse(sources.get('package.json')); assert.equal(metadata.version, definition.installed_member.version);
    assert.equal(metadata.exports['./collections'].types, './types/collections.d.ts');
    assert.ok(sources.get('fesm2022/collections.mjs').includes('SelectionModel'));
    minimumPeers.push({line: peerLine, version: metadata.version, installed_member: definition.installed_member, members: subject.members,
      stable_public_export_declarations_and_complete_algorithm_reviewed: true});
  }
  assert.equal(pkg.peerDependencies['@angular/cdk'].slice(1), minimumPeers.find(row => row.line === line).version);
  const evidencePaths = ['tests/selection_comparator_packed_probe.mjs', 'tests/selection_comparator_tagged_protocol.mjs', 'tests/selection_comparator_source_judgments_probe.mjs',
    'tests/upstream/selection-comparator-admission.mjs', prefix + 'collector-controls.json', prefix + 'tagged-protocol.json', prefix + 'admission-controls.json',
    'compatibility/rc/selection-model-current-source-diagnostic.json', 'compatibility/rc/selection-model-cyph-source-sanity.json'];
  const evidence = evidencePaths.map(path => ({path, sha256: hash(read(path))}));
  const collector = JSON.parse(read(prefix + 'collector-controls.json')), tagged = JSON.parse(read(prefix + 'tagged-protocol.json')), admission = JSON.parse(read(prefix + 'admission-controls.json'));
  assert.equal(collector.line, line); assert.equal(collector.semantic_and_actual_collector_defects_rejected, 248); assert.equal(collector.original_regression_retained, true);
  assert.equal(tagged.fixture_sha256, hash(read('scripts/selection-comparator-packed-fixture.mjs'))); assert.equal(tagged.contract_sha256, hash(read('scripts/selection-comparator-packed-contract.mjs')));
  assert.equal(tagged.producer_sha256, hash(read('tests/selection_comparator_tagged_protocol.mjs')));
  assert.equal(tagged.results.filter(row => row.generated_observer_protocol_passed).length, 6); assert.equal(tagged.results.filter(row => row.original_bug_reproduced).length, 2);
  assert.deepEqual(tagged.event_counts_from_tagged_receiver_and_upstream_fix, [0, 2, 2, 2, 5, 5, 7, 9]); assert.equal(tagged.mutations.length, 4);
  assert.equal(admission.line, line); assert.equal(admission.helper_sha256, hash(read('scripts/upstream-selection-evidence.mjs')));
  assert.equal(admission.producer_sha256, hash(read('tests/upstream/selection-comparator-admission.mjs')));
  assert.equal(admission.actual_helper_controls, 23); assert.equal(admission.cached_actual_body_semantic_controls, 248); assert.equal(admission.actual_CLI_controls, 8);
  for (const report of [tagged, admission]) assert.equal(report.actual_packed_native_or_floor_qualified, false);
  const dependencies = ['scripts/selection-comparator-source-judgments.mjs', 'scripts/selection-comparator-packed-source-context.mjs',
    'scripts/upstream-selection-evidence.mjs', ...data.new_dependencies].map(path => ({path, sha256: hash(read(path))}));
  const proof = {schema_version: 1, line, source_parent: data.source_parent, inputs: {path: prefix + 'inputs.json', sha256: hash(read(prefix + 'inputs.json'))}, prior: data.prior, supplement: data.supplement,
    source_changes: data.source_changes.map(({edits, ...row}) => ({...row, exact_edits: edits.length})), complete_preceding_source_programs_recovered: 20,
    original: Object.fromEntries(Object.entries(original).filter(([key]) => key !== 'commit_object')), hunks, owned_model_uses: uses, minimum_peers: minimumPeers,
    unchanged_product_members: product.length, unchanged_product_population_sha256: hash(JSON.stringify(product)), evidence, dependencies,
    individual_source_decisions: 1, preceding_runtime_contexts_requalified: 16, existing_authored_uses_requalified: 167, earlier_context_receipts_requalified: earlierContextReceipts,
    original_hunk_and_role_decisions_retained: true, new_authored_use_closures: 0,
    actual_runtime_qualified: false, actual_packed_native_or_floor_qualified: false, g11_claim: 'not-passed'};
  const proofBytes = json(proof), proofRef = {path: proofPath, sha256: hash(proofBytes)}, writes = new Map([[proofPath, proofBytes]]), entries = [];
  const requirementFunctions = {artifact_behavior: artifactBehaviorRequirements, generated_identity_behavior: generatedIdentityRequirements,
    bidi_behavior: sha => bidiBehaviorRequirements(sha, line), historical_behavior: historicalBehaviorRequirements, progress_csp_behavior: progressCspRequirements};
  for (const previous of prior.entries) {
    const current = structuredClone(previous), before = JSON.parse(old.get(previous.evidence_report)), previousRef = {path: previous.evidence_report, sha256: hash(old.get(previous.evidence_report))};
    let review, path;
    if (previous.sha === SELECTION_BEHAVIOR_SHA) {
      const definition = selectionBehaviorRequirements(previous.sha, line); assert.equal(definition.patch, original.sha256);
      current.final_disposition = 'inherited'; current.reason = decision; current.files = hunks.map(row => row.file); current.affected_branches = [line];
      current.individual_proof = {proof_kind: SELECTION_BEHAVIOR_KIND, diff_sha256: definition.patch, review_depth: 'individual-compatibility', affected_branches: [line], decision,
        selection_behavior: {kind: definition.kind, case_ids: definition.case_ids, source_members: definition.members.map(path => ({path, sha256: hash(read(path))}))},
        installed_member: definition.installed_member, reachable_behavior: {kind: 'executed-delegation', id: definition.case_ids[0]}};
      path = 'compatibility/f10/disposition-ledger/evidence/closeout-selection-comparator-source-judgment.json';
      review = {schema_version: 1, line, sha: previous.sha, status: 'reviewed', final_disposition: 'inherited', review_depth: 'individual-compatibility', affected_branches: [line],
        source_parent: data.source_parent, reviewer: 'Codex primary implementer', judgment_stage: 'source-complete-packed-required', diff_sha256: definition.patch, patch_file: original.path,
        complete_original_files: current.files, complete_original_hunks: hunks.length, hunk_reviews: hunks.map((row, index) => ({...row, judgment: judgments[index]})),
        source_conclusion: decision, decision, individual_proof: current.individual_proof, minimum_peers: minimumPeers, owned_model_uses: uses,
        independent_evidence: [previousRef, proofRef, ...evidence, ...dependencies], prior_entry: previous,
        runtime_admission: {required: true, qualified_by_this_document: false, case_ids: definition.case_ids},
        product_HTML_CSS_SCSS_or_API_changed: false, semantic_pass: false, actual_packed_native_or_floor_qualified: false, g11_claim: 'not-passed'};
    } else {
      const fields = Object.keys(requirementFunctions).filter(field => previous.individual_proof[field]); assert.equal(fields.length, 1); const field = fields[0];
      const definition = requirementFunctions[field](previous.sha), members = previous.individual_proof[field].source_members;
      const expanded = ['artifact_behavior', 'generated_identity_behavior', 'bidi_behavior'].includes(field);
      if (expanded) selectionRequirementsBefore(previous.sha, definition, line, {readMember: read});
      assert.deepEqual(definition.members.filter(path => !expanded || !data.new_dependencies.includes(path)), members.map(row => row.path), 'preceding runtime source scope changed');
      members.forEach(refreshRef);
      current.individual_proof[field].source_members = definition.members.map(path => ({path, sha256: hash(read(path))}));
      review = structuredClone(before);
      if (review.individual_proof) review.individual_proof = structuredClone(current.individual_proof);
      if (review.reviewed_source_members) review.reviewed_source_members = structuredClone(current.individual_proof[field].source_members);
      review.independent_evidence = review.independent_evidence.map(refreshRef);
      review.independent_evidence.push(previousRef, proofRef, ...dependencies);
      review.selection_comparator_context_requalification = {previous_source_review: previousRef, source_proof: proofRef,
        complete_preceding_source_and_scope_recovered: true, original_runtime_predicate_and_hunk_decisions_retained: true, actual_runtime_qualified: false};
      assert.deepEqual(review.hunk_reviews, before.hunk_reviews); assert.equal(review.source_conclusion, before.source_conclusion); assert.equal(review.semantic_pass, false);
      path = 'compatibility/f10/disposition-ledger/evidence/closeout-selection-context-' + previous.sha + '.json';
    }
    writes.set(path, json(review)); current.evidence_report = path;
    current.source_check = {kind: 'individual-source-reviewed-runtime-required', diff_sha256: review.diff_sha256, patch_path: review.patch_file, evidence_report_sha256: hash(writes.get(path))};
    current.selection_comparator_source_context = {previous_source_review: previousRef, source_proof: proofRef}; entries.push(current);
  }
  const currentLedger = read(ledgerPath).toString(), wanted = new Map(entries.map(row => [row.sha, row]));
  for (const row of JSON.parse(currentLedger).entries) {const before = prior.entries.find(value => value.sha === row.sha); if (before) assert.ok(JSON.stringify(row) === JSON.stringify(before) || JSON.stringify(row) === JSON.stringify(wanted.get(row.sha)), 'live SelectionModel disposition drift');}
  const ledger = replaceRows(currentLedger, 'entries', wanted, row => row.sha);
  assert.deepEqual(JSON.parse(ledger).entries.filter(row => !wanted.has(row.sha)), JSON.parse(currentLedger).entries.filter(row => !wanted.has(row.sha))); writes.set(ledgerPath, ledger);
  const stores = prior.review_subjects.filter(row => row.path !== ledgerPath), affectedKeys = new Set(prior.affected_roles.map(row => JSON.stringify(row.key)));
  const affected = stores.flatMap(store => JSON.parse(store.text).symbol_uses.filter(row => affectedKeys.has(key(row)))); assert.equal(affected.length, 167);
  const oldRead = path => old.get(path) || read(path); assert.equal(authoredUseReviewEvidence({symbol_uses: affected}, line, oldRead, hash).insufficient, 0);
  const roleReviews = new Map([...new Set(affected.map(row => row.source_review.path))].map(path =>
    [path, new Map(JSON.parse(old.get(path)).reviews.map(row => [key(row), row]))]));
  const reviews = affected.map(row => {
    const before = roleReviews.get(row.source_review.path).get(key(row)); assert.ok(before); const review = structuredClone(before);
    review.independent_evidence = review.independent_evidence.map(refreshRef);
    review.independent_evidence.push(row.source_review, proofRef);
    review.selection_comparator_context_requalification = {previous_source_review: row.source_review, source_proof: proofRef,
      original_product_roles_decisions_and_runtime_scope_retained: true, actual_runtime_qualified: false};
    assert.equal(review.decision, before.decision); assert.equal(review.conclusion, before.conclusion); return review;
  });
  const reviewBytes = json({schema_version: 1, line, status: 'reviewed', reviews, g11_claim: 'not-passed'}); writes.set(rolePath, reviewBytes);
  for (const store of stores) {
    const updates = new Map(JSON.parse(store.text).symbol_uses.filter(row => affectedKeys.has(key(row))).map(row => {
      const next = structuredClone(row); next.source_review = {path: rolePath, sha256: hash(reviewBytes)};
      next.source_review_history = [...(row.source_review_history || []), {source_parent: data.source_parent, prior_source_review: row.source_review,
        reason: 'Exact preceding SelectionModel collector/source context; original product roles and runtime scopes retained.'}]; return [key(row), next];
    }));
    const bytes = replaceRows(store.text, 'symbol_uses', updates, key);
    assert.ok(read(store.path).equals(Buffer.from(store.text)) || read(store.path).equals(bytes), 'live SelectionModel authored-use drift'); writes.set(store.path, bytes);
  }
  const afterRead = path => writes.get(path) || read(path), frozen = JSON.parse(writes.get(stores[0].path)), current = JSON.parse(writes.get(stores[1].path));
  const frozenEvidence = authoredUseReviewEvidence(frozen, line, afterRead, hash); assert.equal(frozenEvidence.reviewed, 1446); assert.equal(frozenEvidence.insufficient, 0);
  const currentAdmission = currentAuthoredUseAdmission({root,current: scanCurrentAuthoredUses({root, readSource: read}), frozen: frozen.symbol_uses, candidate: current, line, readMember: afterRead});
  assert.equal(currentAdmission.source_snapshot_valid, true); assert.equal(currentAdmission.review_evidence.reviewed, 178); assert.equal(currentAdmission.review_evidence.insufficient, 0);
  return {proof, writes, entries, frozenEvidence, currentAdmission};
}
export function recordSelectionComparatorJudgments(root = rootDefault) {
  assert.equal(existsSync(resolve(root, proofPath)), false, 'SelectionModel source proof already recorded');
  const result = inspectSelectionComparatorJudgments({root});
  for (const [path, bytes] of result.writes) writeFileSync(resolve(root, path), bytes);
  return {line: result.proof.line, individual_source_decisions: 1, preceding_runtime_contexts_requalified: 16, existing_authored_uses_requalified: 167,
    actual_runtime_qualified: false, new_authored_use_closures: 0, g11_claim: 'not-passed'};
}
if (process.argv[1] && import.meta.url === pathToFileURL(resolve(process.argv[1])).href) {
  assert.deepEqual(process.argv.slice(2), ['--record']); console.log(JSON.stringify(recordSelectionComparatorJudgments()));
}
