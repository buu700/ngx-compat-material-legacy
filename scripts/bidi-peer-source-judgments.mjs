/**
 * @license
 * Copyright Google LLC All Rights Reserved.
 * Copyright (c) 2026 Ryan Lester.
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.io/license
 */
/** Individual public-peer source decisions; actual packed admission is separate. */
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {createRequire} from 'node:module';
import {execFileSync} from 'node:child_process';
import {existsSync, readFileSync, writeFileSync} from 'node:fs';
import {gunzipSync} from 'node:zlib';
import {dirname, resolve} from 'node:path';
import {fileURLToPath, pathToFileURL} from 'node:url';
import {bidiPeerSourceContext, reverseBidiPeerSource} from './bidi-peer-source-context.mjs';
import {readBidiIsolatedBefore} from './bidi-isolated-packed-source-requalification.mjs';
import {readSelectionComparatorBefore, selectionRequirementsBefore} from './selection-comparator-packed-source-context.mjs';
import {BIDI_BEHAVIOR_KIND, bidiBehaviorRequirements} from './upstream-bidi-evidence.mjs';
import {reviewBidiModuleUses} from './bidi-module-use-review.mjs';
import {candidateProductSourcePaths} from './upstream-candidate-source-evidence.mjs';
import {authoredUseReviewEvidence} from './authored-use-inventory.mjs';
import {scanCurrentAuthoredUses, currentAuthoredUseAdmission} from './authored-current-use-inventory.mjs';
const rootDefault = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const prefix = 'compatibility/rc/bidi-peer-admission-', proofPath = prefix + 'source-proof.json';
const ledgerPath = 'compatibility/f10/disposition-ledger/ledger.json';
const rolePath = 'compatibility/f10/authored-use-reviews/bidi-peer-source-context-requalified-boundaries.json';
const hash = value => createHash('sha256').update(value).digest('hex'), json = value => Buffer.from(JSON.stringify(value, null, 2) + '\n');
const ts = createRequire(import.meta.url)('typescript'), key = row => JSON.stringify([row.file, row.module, row.symbol]);
const profiles = {
  '8c3165582fcc1e307f8ddd261f5977c6f2f8b0fc': {
    name: 'standalone',
    decision: 'Inherit the complete public-CDK standalone bidi change through the advertised current peer. All25 owned NgModule bindings import and export the stable public BidiModule without providing, wrapping or redeclaring Dir. Both exact minimum peers import/export standalone Dir with unchanged nearest Directionality provider, host attribute and input/output contract. The documentation, test-host and API-guard hunks are individually accounted for; they do not authorize a CDK fork or new legacy facade API. The earlier mixed harness could receive Dir from unrelated imports, so it was insufficient by itself. The current isolated standalone component imports only legacy form-field/input modules and must execute seven direction stages and real teardown through actual legacy nodes. Require its equal rich raw/selected observation, preserved mixed predicate and complete same-run full106 packed evidence at the current clean source and exact artifact. Existing whole-public-module diagnostics are historical source/DI evidence, not a packed/native/floor pass. Product HTML/CSS/SCSS and conservative historical APIs remain unchanged; general Directionality callers, auto-locale behavior, all runtime floors and global G11 remain separate.',
    hunks: [
      'BidiModule imports rather than declares standalone Dir and retains its export. Both minimum public module implementations have that exact ownership arrangement. The25 owned NgModules only reexport the public module; the isolated packed host must obtain the real directive solely through the legacy modules.',
      'The documentation example gains a blank line. No exported API, consumer resource or runtime behavior changes in this hunk; retain the original documentation membership rather than omitting it from the full patch.',
      'The Dir and auto-direction documentation sections gain blank lines. The nearest-ancestor Directionality contract remains explicit; actual legacy field/input provider identity is required by the packed case. Locale-specific auto behavior is covered only by the disclosed whole-module diagnostic here.',
      'Dir becomes standalone while keeping its selector, provider alias, host raw attribute, export name and input/output declarations. Both minimum peer implementations preserve these public contracts. Own no directive mirror or private CDK helper; real node/provider/output observations remain mandatory.',
      'The upstream test hosts move from declarations to imports together with BidiModule. This is upstream standalone fixture wiring, not a legacy product migration. The add-on retains its historical NgModule exports and compiles a separately isolated actual consumer host.',
      'The injected-directionality host becomes standalone and the parent host explicitly imports Dir and that child. These changes preserve scope-aware injection in the upstream regression. The add-on packed isolation deliberately imports only the two legacy modules, so unrelated current-module imports cannot supply the directive.',
      'The predefined-auto host becomes standalone and imports Dir. This is a test-scope change; no new auto resolver is owned. Original/current whole-module diagnostics retain their explicit auto-locale scope and limits.',
      'The predefined-uppercase host becomes standalone with Dir and the previous child declaration is removed after its relocation. Uppercase and invalid/empty public updates are independently required in the isolated packed case; no fixture class is transplanted into product code.',
      'The BidiModule static API metadata moves Dir from the declarations slot into the imports slot while retaining exports. Both exact minimum declaration bundles are inspected. Static metadata inspection alone cannot qualify Angular consumer scope, hence the mandatory packed compile/run.',
      'The Dir static API metadata marks the directive standalone. Its public selector, input, output and export remain unchanged; this does not require an owned public API or a minimum-peer increase.',
    ],
  },
  '25f391a3c545a1b829a74584c4f9235ab8d18497': {
    name: 'raw-initialization',
    decision: 'Inherit the complete strict-initialization change in the maintained public Dir implementation. The original16 raw field starts undefined; both exact minimum public peers initialize it to an empty string. This is current CDK infrastructure, and the add-on neither reads that private before-first-input field nor owns a copy of the directive. The three upstream ViewChild definite-assignment hunks are fixture compile annotations, not legacy API changes. Prior complete original/current dev-and-production namespace diagnostics explicitly observe the initial field and reject reverting it, but that private observation is not attributed to the packed fixture. The required isolated packed case instead proves public normalized values, raw DOM host attributes, real nearest Directionality identities, output ordering/repeat suppression and teardown after actual bindings through the legacy module exports. Require the complete same-run current clean full106 packed artifact execution; source-only or marker-only receipts cannot admit this inherited decision. No CDK fork, consumer HTML/CSS/SCSS change, private product dependency or peer-floor increase is introduced. Complete runtime/compiler/RxJS floors, other callers and G11 remain pending independently.',
    hunks: [
      'The raw field gains an empty-string initializer to satisfy strict property initialization. Both exact minimum complete public modules contain it; the original module diagnostic distinguishes undefined from empty and rejects the current-field reversion. Owned legacy sources do not import or read this implementation field. Packed public binding/host observations are required but do not pretend to observe the constructor-private before-input state.',
      'The dynamic-direction test ViewChild field gains a definite-assignment assertion. Angular populates the query before its use; there is no emitted runtime operation or historical component API to mirror.',
      'The predefined-auto test ViewChild field gains the same compile-only assertion. Keep this hunk in the complete individual review without expanding the actual packed case to claim private initialization or every locale.',
      'The predefined-uppercase test ViewChild field gains the compile-only assertion. The actual packed public uppercase/invalid/empty updates remain separately mandatory, with real output suppression and completion.',
    ],
  },
};
function replaceRows(text, property, updates, identify) {
  const tree = ts.parseJsonText('rows.json', text), array = tree.statements[0].expression.properties.find(row => row.name.text === property).initializer, edits = [];
  assert.equal(tree.parseDiagnostics.length, 0);
  for (const node of array.elements) {
    const next = updates.get(identify(JSON.parse(node.getText(tree)))); if (!next) continue;
    const indent = ' '.repeat(tree.getLineAndCharacterOfPosition(node.getStart(tree)).character);
    edits.push({start: node.getStart(tree), end: node.end, text: JSON.stringify(next, null, 2).replaceAll('\n', '\n' + indent)});
  }
  assert.equal(edits.length, updates.size);
  for (const edit of edits.reverse()) text = text.slice(0, edit.start) + edit.text + text.slice(edit.end);
  return Buffer.from(text);
}
export function inspectBidiPeerJudgments({root = rootDefault, readMember} = {}) {
  const rawRead = path => readMember ? readMember(path) : readFileSync(resolve(root, path));
  const read = path => readSelectionComparatorBefore(path, rawRead);
  const {inputs, prior} = bidiPeerSourceContext(read), line = inputs.line;
  const old = new Map([...prior.members, ...prior.review_subjects].map(row => {assert.equal(hash(row.text), row.sha256); return [row.path, Buffer.from(row.text)];}));
  for (const change of inputs.source_changes) {
    const current = read(change.path).toString(); assert.equal(hash(current), change.current_sha256, 'current bidi context changed');
    assert.equal(reverseBidiPeerSource(change.path, current, read), old.get(change.path).toString());
  }
  for (const row of prior.members.filter(row => row.path.startsWith('compatibility/f10/'))) assert.equal(hash(read(row.path)), row.sha256, 'original individual review changed');
  for (const ref of inputs.source_evidence) assert.equal(hash(read(ref.path)), ref.sha256, 'bidi source receipt changed');
  const pkg = JSON.parse(read('projects/ngx-material-legacy/package.json'));
  assert.equal(pkg.version.startsWith('21.') ? '21.x' : 'main', line);
  const product = execFileSync('git', ['-c', 'gc.auto=0', '-c', 'maintenance.auto=0', 'ls-tree', '-r', '-z', inputs.source_parent, '--', 'projects/ngx-material-legacy'], {cwd: root})
    .toString().split('\0').filter(Boolean).map(row => {
      const [meta, path] = row.split('\t'), [mode, kind, blob] = meta.split(' '), bytes = read(path);
      assert.equal(mode, '100644'); assert.equal(kind, 'blob');
      assert.equal(createHash('sha1').update('blob ' + bytes.length + '\0').update(bytes).digest('hex'), blob, 'bidi product source changed');
      return {path, sha256: hash(bytes), git_blob: blob};
    });
  assert.equal(product.length, 1141); assert.deepEqual(candidateProductSourcePaths(root).sort(), product.map(row => row.path).filter(path => /\.(ts|scss|css|html)$/.test(path)).sort());
  const uses = reviewBidiModuleUses({root, readSource: path => read(path).toString()}); assert.equal(uses.cases.length, 25);
  const capsule = JSON.parse(read('compatibility/rc/material-public-subjects.json')), minimumPeers = [];
  for (const peerLine of ['main', '21.x']) {
    const subject = capsule.subjects.find(row => row.line === peerLine), definition = selectionRequirementsBefore(inputs.new_subjects[0], bidiBehaviorRequirements(inputs.new_subjects[0], peerLine), peerLine, {readMember: rawRead});
    const members = subject.members.filter(row => row.package === '@angular/cdk' && ['fesm2022/bidi.mjs', 'fesm2022/_directionality-chunk.mjs', 'types/bidi.d.ts', 'types/_bidi-module-chunk.d.ts'].includes(row.module_path));
    assert.equal(members.length, 4); const sources = new Map();
    for (const row of members) {const stored = read(row.path); assert.equal(hash(stored), row.stored_sha256); const raw = gunzipSync(stored); assert.equal(raw.length, row.bytes); assert.equal(hash(raw), row.sha256); sources.set(row.module_path, raw.toString());}
    const module = sources.get('fesm2022/bidi.mjs');
    for (const text of ['class Dir {', "_rawDir = '';", 'isStandalone: true', 'imports: [Dir]', 'exports: [Dir]', 'provide: Directionality', 'useExisting: Dir', 'this.change.complete()']) assert.ok(module.includes(text), text);
    assert.ok(sources.get('types/_bidi-module-chunk.d.ts').includes('NgModuleDeclaration<BidiModule, never, [typeof Dir], [typeof Dir]>'));
    const member = members.find(row => row.module_path === 'fesm2022/bidi.mjs'); assert.equal(definition.installed_member.sha256, member.sha256);
    minimumPeers.push({line: peerLine, version: definition.installed_member.version, members, public_module_ownership_and_contract_reviewed: true});
  }
  assert.equal(pkg.peerDependencies['@angular/cdk'].slice(1), minimumPeers.find(row => row.line === line).version);
  const originals = inputs.originals.map(row => {
    assert.equal(createHash('sha1').update('commit ' + Buffer.byteLength(row.commit_object) + '\0').update(row.commit_object).digest('hex'), row.sha);
    assert.equal(hash(row.commit_object), row.commit_object_sha256); assert.equal(hash(read(row.path)), row.sha256);
    assert.equal(row.sha256, selectionRequirementsBefore(row.sha, bidiBehaviorRequirements(row.sha, line), line, {readMember: rawRead}).patch);
    const hunks = []; let file; for (const text of read(row.path).toString().split('\n')) {
      if (text.startsWith('diff --git ')) file = text.split(' b/')[1];
      if (text.startsWith('@@')) hunks.push({hunk: hunks.length + 1, file, header: text});
    }
    assert.equal(hunks.length, profiles[row.sha].hunks.length); return {...row, hunks};
  });
  const earlierContextReceipts = [];
  for (const previous of prior.entries.filter(row => !profiles[row.sha])) {
    const review = JSON.parse(old.get(previous.evidence_report));
    for (const ref of review.independent_evidence) if (hash(read(ref.path)) !== ref.sha256 && !old.has(ref.path)) {
      assert.equal(hash(readBidiIsolatedBefore(ref.path, read)), ref.sha256, 'unreviewed earlier context receipt');
      earlierContextReceipts.push({sha: previous.sha, path: ref.path, before_sha256: ref.sha256, current_sha256: hash(read(ref.path)),
        reason: 'The preceding isolated-bidi capsule recovers this complete earlier helper/test exactly. Its source-only edit had left this older independent receipt stale; retain the original document and explicitly requalify its context without runtime credit.'});
    }
  }
  const dependencies = ['scripts/upstream-bidi-evidence.mjs', 'scripts/bidi-peer-source-context.mjs', 'scripts/bidi-peer-source-judgments.mjs',
    'scripts/bidi-isolated-packed-source-requalification.mjs'].map(path => ({path, sha256: hash(read(path))}));
  const proof = {schema_version: 1, line, source_parent: inputs.source_parent, inputs: {path: prefix + 'inputs.json', sha256: hash(read(prefix + 'inputs.json'))},
    prior: inputs.prior, complete_preceding_checker_context_and_probe_recovered: true, source_changes: inputs.source_changes.map(({edits, ...row}) => ({...row, exact_edits: edits.length})),
    source_evidence: inputs.source_evidence, dependencies, unchanged_product_members: 1141, unchanged_product_population_sha256: hash(JSON.stringify(product)),
    minimum_peers: minimumPeers, owned_module_reexports: uses.cases,
    originals: originals.map(({commit_object, ...row}) => row), individual_source_decisions: 2, preceding_runtime_contexts_requalified: 8,
    existing_authored_uses_requalified: 167, earlier_context_receipts_requalified: earlierContextReceipts,
    original_hunk_and_role_decisions_retained: true, new_authored_use_closures: 0,
    actual_runtime_qualified: false, actual_packed_native_or_floor_qualified: false, g11_claim: 'not-passed'};
  const proofBytes = json(proof), proofRef = {path: proofPath, sha256: hash(proofBytes)}, writes = new Map([[proofPath, proofBytes]]), entries = [];
  for (const previous of prior.entries) {
    const current = structuredClone(previous), before = JSON.parse(old.get(previous.evidence_report)), previousRef = {path: previous.evidence_report, sha256: hash(old.get(previous.evidence_report))};
    const profile = profiles[previous.sha]; let review, path;
    if (profile) {
      const definition = selectionRequirementsBefore(previous.sha, bidiBehaviorRequirements(previous.sha, line), line, {readMember: rawRead}), original = originals.find(row => row.sha === previous.sha);
      current.final_disposition = 'inherited'; current.reason = profile.decision; current.files = [...new Set(original.hunks.map(row => row.file))]; current.affected_branches = [line];
      current.individual_proof = {proof_kind: BIDI_BEHAVIOR_KIND, diff_sha256: definition.patch, review_depth: 'individual-compatibility', affected_branches: [line], decision: profile.decision,
        bidi_behavior: {kind: definition.kind, case_ids: definition.case_ids, source_members: definition.members.map(path => ({path, sha256: hash(read(path))}))},
        installed_member: definition.installed_member, reachable_behavior: {kind: 'executed-delegation', id: definition.case_ids[0]}};
      path = 'compatibility/f10/disposition-ledger/evidence/closeout-bidi-peer-' + profile.name + '-source-judgment.json';
      review = {schema_version: 1, line, sha: previous.sha, status: 'reviewed', final_disposition: 'inherited', review_depth: 'individual-compatibility', affected_branches: [line],
        source_parent: inputs.source_parent, reviewer: 'Codex primary implementer', judgment_stage: 'source-complete-packed-required', diff_sha256: definition.patch, patch_file: original.path,
        complete_original_files: current.files, complete_original_hunks: original.hunks.length, hunk_reviews: original.hunks.map((row, index) => ({...row, judgment: profile.hunks[index]})),
        source_conclusion: profile.decision, decision: profile.decision, individual_proof: current.individual_proof, minimum_peers: minimumPeers, owned_module_reexports: uses.cases,
        independent_evidence: [previousRef, proofRef, ...inputs.source_evidence, ...dependencies], prior_entry: previous,
        runtime_admission: {required: true, qualified_by_this_document: false, case_ids: definition.case_ids, private_before_first_input_field_observed_by_packed_fixture: false},
        product_HTML_CSS_SCSS_or_API_changed: false, semantic_pass: false, actual_packed_native_or_floor_qualified: false, g11_claim: 'not-passed'};
    } else {
      const field = ['historical_behavior', 'progress_csp_behavior', 'generated_identity_behavior'].find(field => previous.individual_proof[field]); assert.ok(field);
      const members = previous.individual_proof[field].source_members;
      assert.deepEqual(members.filter(row => hash(read(row.path)) !== row.sha256).map(row => row.path), ['scripts/check-upstream-audit-disposition.mjs']);
      current.individual_proof[field].source_members = members.map(row => ({...row, sha256: hash(read(row.path))}));
      review = structuredClone(before);
      if (review.individual_proof) review.individual_proof = structuredClone(current.individual_proof);
      if (review.reviewed_source_members) review.reviewed_source_members = structuredClone(current.individual_proof[field].source_members);
      for (const ref of review.independent_evidence) if (hash(read(ref.path)) !== ref.sha256) {
        const preceding = old.get(ref.path) || readBidiIsolatedBefore(ref.path, read);
        assert.equal(hash(preceding), ref.sha256); ref.sha256 = hash(read(ref.path));
      }
      review.independent_evidence.push(previousRef, proofRef, ...dependencies);
      review.bidi_peer_context_requalification = {previous_source_review: previousRef, source_proof: proofRef,
        complete_preceding_root_and_assertions_recovered: true, original_runtime_validation_bodies_and_hunk_decisions_retained: true, actual_runtime_qualified: false};
      assert.deepEqual(review.hunk_reviews, before.hunk_reviews); assert.equal(review.source_conclusion, before.source_conclusion); assert.equal(review.semantic_pass, false);
      path = 'compatibility/f10/disposition-ledger/evidence/closeout-bidi-peer-context-' + previous.sha + '.json';
    }
    writes.set(path, json(review)); current.evidence_report = path;
    current.source_check = {kind: 'individual-source-reviewed-runtime-required', diff_sha256: review.diff_sha256, patch_path: review.patch_file, evidence_report_sha256: hash(writes.get(path))};
    current.bidi_peer_source_context = {previous_source_review: previousRef, source_proof: proofRef}; entries.push(current);
  }
  const currentLedger = read(ledgerPath).toString(), wanted = new Map(entries.map(row => [row.sha, row]));
  for (const row of JSON.parse(currentLedger).entries) {const before = prior.entries.find(value => value.sha === row.sha); if (before) assert.ok(JSON.stringify(row) === JSON.stringify(before) || JSON.stringify(row) === JSON.stringify(wanted.get(row.sha)), 'live bidi disposition drift');}
  const ledger = replaceRows(currentLedger, 'entries', wanted, row => row.sha);
  assert.deepEqual(JSON.parse(ledger).entries.filter(row => !wanted.has(row.sha)), JSON.parse(currentLedger).entries.filter(row => !wanted.has(row.sha))); writes.set(ledgerPath, ledger);
  const stores = prior.review_subjects.filter(row => row.path !== ledgerPath), affectedKeys = new Set(prior.affected_roles.map(row => JSON.stringify(row.key)));
  const affected = stores.flatMap(store => JSON.parse(store.text).symbol_uses.filter(row => affectedKeys.has(key(row)))); assert.equal(affected.length, 167);
  const oldRead = path => old.get(path) || read(path); assert.equal(authoredUseReviewEvidence({symbol_uses: affected}, line, oldRead, hash).insufficient, 0);
  const reviews = affected.map(row => {
    const before = JSON.parse(old.get(row.source_review.path)).reviews.find(value => key(value) === key(row)); assert.ok(before); const review = structuredClone(before);
    for (const ref of review.independent_evidence) if (hash(read(ref.path)) !== ref.sha256) {
      assert.equal(ref.path, 'tests/bidi_isolated_requalification_probe.mjs'); assert.equal(hash(old.get(ref.path)), ref.sha256); ref.sha256 = hash(read(ref.path));
    }
    review.independent_evidence.push(row.source_review, proofRef);
    review.bidi_peer_test_context_requalification = {previous_source_review: row.source_review, source_proof: proofRef,
      original_product_roles_decisions_and_runtime_scope_retained: true, actual_runtime_qualified: false};
    assert.equal(review.decision, before.decision); assert.equal(review.conclusion, before.conclusion); return review;
  });
  const reviewBytes = json({schema_version: 1, line, status: 'reviewed', reviews, g11_claim: 'not-passed'}); writes.set(rolePath, reviewBytes);
  for (const store of stores) {
    const updates = new Map(JSON.parse(store.text).symbol_uses.filter(row => affectedKeys.has(key(row))).map(row => {
      const next = structuredClone(row); next.source_review = {path: rolePath, sha256: hash(reviewBytes)};
      next.source_review_history = [...(row.source_review_history || []), {source_parent: inputs.source_parent, prior_source_review: row.source_review,
        reason: 'Exact preceding bidi review-subject adapter; original product roles and runtime scopes retained.'}]; return [key(row), next];
    }));
    const bytes = replaceRows(store.text, 'symbol_uses', updates, key);
    assert.ok(read(store.path).equals(Buffer.from(store.text)) || read(store.path).equals(bytes), 'live bidi authored-use drift'); writes.set(store.path, bytes);
  }
  const afterRead = path => writes.get(path) || read(path), frozen = JSON.parse(writes.get(stores[0].path)), current = JSON.parse(writes.get(stores[1].path));
  const frozenEvidence = authoredUseReviewEvidence(frozen, line, afterRead, hash); assert.equal(frozenEvidence.reviewed, 1446); assert.equal(frozenEvidence.insufficient, 0);
  const currentAdmission = currentAuthoredUseAdmission({root,current: scanCurrentAuthoredUses({root, readSource: read}), frozen: frozen.symbol_uses, candidate: current, line, readMember: afterRead});
  assert.equal(currentAdmission.source_snapshot_valid, true); assert.equal(currentAdmission.review_evidence.reviewed, 178); assert.equal(currentAdmission.review_evidence.insufficient, 0);
  return {proof, writes, entries, frozenEvidence, currentAdmission};
}
export function recordBidiPeerJudgments(root = rootDefault) {
  assert.equal(existsSync(resolve(root, proofPath)), false, 'bidi peer source proof already recorded');
  const result = inspectBidiPeerJudgments({root});
  for (const [path, bytes] of result.writes) writeFileSync(resolve(root, path), bytes);
  return {line: result.proof.line, individual_source_decisions: 2, earlier_runtime_contexts_requalified: 8, existing_authored_uses_requalified: 167,
    actual_runtime_qualified: false, new_authored_use_closures: 0, g11_claim: 'not-passed'};
}
if (process.argv[1] && import.meta.url === pathToFileURL(resolve(process.argv[1])).href) {
  assert.deepEqual(process.argv.slice(2), ['--record']); console.log(JSON.stringify(recordBidiPeerJudgments()));
}
