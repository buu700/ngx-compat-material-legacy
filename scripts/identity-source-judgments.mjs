/**
 * @license
 * Copyright Google LLC All Rights Reserved.
 * Copyright (c) 2026 Ryan Lester.
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.io/license
 */
import {readBidiIsolatedBefore,bidiRequirementsBefore} from './bidi-isolated-packed-source-requalification.mjs';
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {createRequire} from 'node:module';
import {execFileSync} from 'node:child_process';
import {readFileSync, writeFileSync, existsSync} from 'node:fs';
import {dirname, resolve} from 'node:path';
import {gunzipSync} from 'node:zlib';
import {fileURLToPath, pathToFileURL} from 'node:url';
import {GENERATED_IDENTITY_KIND, generatedIdentityRequirements} from './upstream-generated-identity-evidence.mjs';
import {candidateProductSourcePaths} from './upstream-candidate-source-evidence.mjs';
import {individualReviewScopeOk} from './upstream-individual-evidence-scope.mjs';
import {historicalBehaviorRequirements} from './upstream-historical-behavior-evidence.mjs';
import {progressCspRequirements} from './upstream-progress-csp-evidence.mjs';
import {stripIdentityIntegration, reverseIdentityEdits, HISTORICAL_IDENTITY_EDITS, CSP_IDENTITY_EDITS} from '../tests/upstream/identity-source-context.mjs';
const ts = createRequire(import.meta.url)('typescript');
const rootDefault = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const prefix = 'compatibility/rc/identity-source-admission-', inputPath = prefix + 'inputs.json', proofPath = prefix + 'source-proof.json';
const ledgerPath = 'compatibility/f10/disposition-ledger/ledger.json';
const pins = {main: 'be73f929ded213e0cbbbbf8170152635aa927c6e2ad9ab33d0256fa643a0759e', '21.x': 'dc9e1a510297932240c4ef99ac4c1123eb7e8e6df2418e82ea6f52f87ee24cce'};
const hash = bytes => createHash('sha256').update(bytes).digest('hex');
const gitObject = (kind, bytes) => createHash('sha1').update(kind + ' ' + Buffer.byteLength(bytes) + '\0').update(bytes).digest('hex');
const json = value => Buffer.from(JSON.stringify(value, null, 2) + '\n');
const profiles = {
  '938f478efdc96ef0de1217e806f98939beb027cd': {name: 'cdk-generator', disposition: 'do-not-adopt',
    decision: 'Do not transplant the complete three-file CDK underscore ID-generator service, barrel or API guard into this legacy add-on. It is current CDK infrastructure, not a historical legacy API or an owned stable public dependency. Its APP_ID/root-service/per-prefix state is independently owned by current peers; owned historical counters neither invoke it nor share its counters. Earlier ancestry and counter-retention arguments therefore did not prove mixed-generation uniqueness. The locally owned suffix/prefix repairs address that reachable collision without introducing an injection requirement into historical manual constructors or promising the younger private service API. Require the complete actual packed mixed-generation identity case: both creation orders, exact unique nodes, ARIA references, explicit inputs, snack modal ownership and cleanup. This does not promise uniqueness across independently loaded copies of the same legacy library, adversarial explicit IDs or new APP_ID/randomization APIs. Full floor/consumer and global release gates remain separate.',
    hunks: [
      'The new root injectable reads APP_ID and stores module counters keyed by prefix, omitting the default ng ID. Both exact minimum current services retain that application distinction; main uses a Map, 21.x an object, and both later add an optional random infix. The legacy historical counter model does not become part of that service through ancestry or provider presence. Preserve owned manual construction and fix the distinct generated namespace locally; actual node/ARIA coexistence is mandatory.',
      'The public CDK a11y barrel exports the underscore helper for upstream infrastructure. That export does not authorize a new legacy facade export, a CDK fork or an owned private upstream import under the repository policy. The maintained peers continue to own their service. All current owned product bytes are checked unchanged and contain no _IdGenerator dependency.',
      'The API guard records the new underscore class and Angular factory/provider metadata. No corresponding historical add-on API or compiler metadata is mirrored. The refusal to adopt the private service does not waive the required actual mixed-generation identity behavior, and it does not raise the advertised minimum peers.',
    ]},
  ea0aed5a0cba3288d89e7448073e0a5556487313: {name: 'menu', disposition: 'already-adapted',
    decision: 'The complete menu ID-generator patch is adapted through an owned historical default-ID namespace, preserving the original explicit constructor and every HTML/CSS/SCSS byte. Both minimum current public menus use their private service with the same mat-menu-panel prefix and an independent counter; the earlier real constructor evidence reproduced collisions in both generation orders before the owned suffix repair. Owned panelId now retains its monotonic counter and mat-menu-panel prefix with a legacy suffix, while real trigger aria-controls must resolve exactly to its own panel. No private service, new injectable dependency, modern API mirror or ordinary menu fork is introduced. Constructor-only observations cannot qualify node identity or overlay cleanup: require the actual full packed case in the same current clean artifact run, including both creation orders, own nodes/ARIA, menu open/close and cleanup. Full native motion and peer-floor gates remain mandatory.',
    hunks: [
      'The original import adds _IdGenerator beside public focus utilities. The add-on must keep its stable public focus boundaries and its manual constructor; it imports no underscore generator. The exact minimum public peer menu owns that dependency independently.',
      'Removing the modern module counter cannot make the separate historical counter share current service state. Retaining two unsuffixed counters was empirically shown to collide; the already implemented owned suffix separates those namespaces while retaining the historical monotonic default-ID model.',
      'The panelId initialization switches the modern component to injected getId(mat-menu-panel-). Both minimum public peers retain that call with default non-randomized generation. The owned field remains a constructor-independent counter template with a legacy suffix. Required actual packed observations check exact own menu panel nodes and trigger aria-controls in both creation orders; broad prefix matching or a nonempty ID cannot pass.',
    ]},
  '69968510fb0222ee565f57171640a99768efa972': {name: 'snack', disposition: 'already-adapted',
    decision: 'The complete snack live-region ID patch is adapted through an owned historical namespace while preserving manual construction, templates/styles and announcement behavior. Both minimum public peers generate mat-snack-bar-container-live IDs through their private service; the owned container uses mat-legacy-snack-bar-container-live plus its historical counter. A trailing legacy suffix alone was insufficient because modal aria-owns cleanup uses substring replacement: the distinct prefix prevents a peer dismissal from partially removing the legacy ID. Required actual packed observations open both real generations under a modal in each creation order, prove unique exact live nodes and preserved existing ownership, dismiss each and require only its own token/node to disappear, then prove complete cleanup. The original service/API itself is not adopted. Synthetic validators and constructor diagnostics do not establish an actual announcement, DOM, floor, hydration or release pass.',
    hunks: [
      'The original import adds the underscore generator and removes the modern uniqueId counter. The maintained public peer container owns its own service state, which does not coordinate the owned historical counter. The existing independently owned legacy prefix avoids both duplicate ID and cross-generation substring cleanup hazards; no private upstream import or new constructor injection is added.',
      'The live-element field changes to injected generation of the modern prefix. The owned field retains its counter with mat-legacy-snack-bar-container-live. Existing modal exposure and teardown remain unchanged. The actual packed fixture must preserve an unrelated aria-owns target, add both live nodes, dismiss in each creation order and require exact retained tokens/nodes after each stage; a coherent rehashed observation with a lost or partially removed peer token must still fail.',
    ]},
};
const contextNames = ['autocomplete', 'tab-link', 'select', 'progress-non-buffer', 'progress-gradient'];
function replaceEntries(text, entries) {
  const tree = ts.parseJsonText('ledger.json', text), array = tree.statements[0].expression.properties.find(p => p.name.text === 'entries').initializer, edits = [];
  for (const node of array.elements) {
    const next = entries.find(row => row.sha === JSON.parse(node.getText(tree)).sha); if (!next) continue;
    const indent = ' '.repeat(tree.getLineAndCharacterOfPosition(node.getStart(tree)).character);
    edits.push({start: node.getStart(tree), end: node.end, text: JSON.stringify(next, null, 2).replaceAll('\n', '\n' + indent)});
  }
  assert.equal(edits.length, 8); for (const edit of edits.reverse()) text = text.slice(0, edit.start) + edit.text + text.slice(edit.end); return text;
}
export function inspectIdentitySourceJudgments({root = rootDefault, readMember} = {}) {
  const rawRead = path => readMember ? readMember(path) : readFileSync(resolve(root, path));
  const read = path => readBidiIsolatedBefore(path, rawRead);
  const pkg = JSON.parse(read('projects/ngx-material-legacy/package.json')), line = pkg.version.startsWith('21.') ? '21.x' : 'main';
  const input = read(inputPath); assert.equal(hash(input), pins[line], 'identity source input changed'); const inputs = JSON.parse(input);
  const stored = read(inputs.prior.path); assert.equal(hash(stored), inputs.prior.sha256); const raw = gunzipSync(stored); assert.equal(hash(raw), inputs.prior.raw_sha256);
  const prior = JSON.parse(raw); assert.equal(prior.entries.length, 8); assert.equal(prior.line, line);
  const old = new Map(prior.members.map(row => {assert.equal(hash(row.text), row.sha256); return [row.path, row.text];}));
  for (const [path, text] of old) if (path.startsWith('compatibility/f10/')) assert.equal(read(path).toString(), text, 'preceding source receipt changed');
  assert.equal(stripIdentityIntegration(read('scripts/check-upstream-audit-disposition.mjs').toString()), old.get('scripts/check-upstream-audit-disposition.mjs'), 'complete preceding checker not recovered');
  for (const [path, edits] of [['tests/upstream/historical-behavior-admission.mjs', HISTORICAL_IDENTITY_EDITS], ['tests/upstream/progress-csp-admission.mjs', CSP_IDENTITY_EDITS]])
    assert.equal(reverseIdentityEdits(read(path).toString(), edits), old.get(path), 'complete preceding test not recovered');
  for (const ref of inputs.source_evidence) assert.equal(hash(read(ref.path)), ref.sha256, 'source receipt changed');
  const product = execFileSync('git', ['-c', 'gc.auto=0', '-c', 'maintenance.auto=0', 'ls-tree', '-r', '-z', inputs.source_parent, '--', 'projects/ngx-material-legacy'], {cwd: root})
    .toString().split('\0').filter(Boolean).map(row => {const [meta, path] = row.split('\t'), [mode, kind, blob] = meta.split(' ');
      assert.equal(mode, '100644'); assert.equal(kind, 'blob'); const bytes = read(path); assert.equal(gitObject('blob', bytes), blob, 'unreviewed product change');
      if (path.endsWith('.ts')) assert.equal(bytes.includes(Buffer.from('_IdGenerator')), false, 'owned private generator use'); return {path, git_blob: blob, sha256: hash(bytes)};});
  assert.equal(product.length, 1141); assert.deepEqual(candidateProductSourcePaths(root).sort(), product.map(row => row.path).filter(path => /\.(ts|scss|css|html)$/.test(path)).sort());
  assert.ok(read('projects/ngx-material-legacy/legacy-menu/internal/menu-base.ts').toString().includes('`mat-menu-panel-${menuPanelUid++}-legacy`'));
  assert.ok(read('projects/ngx-material-legacy/legacy-snack-bar/internal/snack-bar-container-base.ts').toString().includes('`mat-legacy-snack-bar-container-live-${uniqueId++}`'));
  const precedingGenerator = JSON.parse(old.get('compatibility/f10/disposition-ledger/evidence/closeout-remaining-identity-generator-review.json'));
  const capsule = JSON.parse(read('compatibility/rc/remaining-identity-public-subjects.json'));
  const peerReview = [];
  for (const peer of inputs.minimum_peer_id_generators) {
    const service = precedingGenerator.peer_sources.find(row => row.line === peer.line); assert.ok(service); assert.equal(hash(service.actual_source), peer.sha256);
    const subject = capsule.subjects.find(row => row.line === peer.line), member = subject.members.find(row => row.key === peer.path);
    assert.equal(member.sha256, peer.sha256); assert.equal(member.bytes, peer.bytes);
    const callers = [];
    for (const [key, call] of [['@angular/material/fesm2022/menu.mjs', "panelId = inject(_IdGenerator).getId('mat-menu-panel-');"],
      ['@angular/material/fesm2022/snack-bar.mjs', "_liveElementId = inject(_IdGenerator).getId('mat-snack-bar-container-live-');"]]) {
      const item = subject.members.find(row => row.key === key); const packed = read(item.path); assert.equal(hash(packed), item.stored_sha256);
      const source = gunzipSync(packed); assert.equal(hash(source), item.sha256); assert.ok(source.toString().includes(call)); callers.push({key, path: item.path, sha256: item.sha256, exact_default_call: call});
    }
    peerReview.push({...peer, callers, application_prefix_and_optional_randomization_owned_by_current_CDK: true, owned_service_dependency: false});
  }
  const originals = inputs.originals.map(row => {assert.equal(gitObject('commit', row.commit_object), row.sha); assert.equal(hash(row.commit_object), row.commit_object_sha256);
    const bytes = read(row.path); assert.equal(hash(bytes), row.sha256); assert.equal(row.sha256, bidiRequirementsBefore(row.sha,generatedIdentityRequirements(row.sha),line,{readMember:rawRead}).patch);
    const hunks = []; let file; for (const text of bytes.toString().split('\n')) {if (text.startsWith('diff --git ')) file = text.split(' b/')[1]; if (text.startsWith('@@')) hunks.push({hunk: hunks.length + 1, file, header: text});}
    assert.equal(hunks.length, profiles[row.sha].hunks.length); return {...row, paths: [...new Set(hunks.map(row => row.file))], hunks};});
  const dependencies = ['scripts/upstream-generated-identity-evidence.mjs', 'scripts/generated-identity-packed-contract.mjs', 'tests/upstream/identity-source-context.mjs'].map(path => ({path, sha256: hash(read(path))}));
  const proof = {schema_version: 1, line, source_parent: inputs.source_parent, inputs: {path: inputPath, sha256: hash(input)}, prior: inputs.prior,
    complete_preceding_checker_and_two_test_files_recovered: true, unchanged_product_members: 1141, unchanged_product_population_sha256: hash(JSON.stringify(product)),
    originals: originals.map(({commit_object, ...row}) => row), minimum_peer_reviews: peerReview, source_evidence: inputs.source_evidence,
    dependencies, producer_sha256: hash(read('scripts/identity-source-judgments.mjs')), new_individual_source_decisions: 3, preceding_source_contexts_requalified: 5,
    actual_runtime_or_authored_use_closures: 0, actual_packed_native_or_floor_qualified: false, g11_claim: 'not-passed'};
  const proofBytes = json(proof), writes = new Map([[proofPath, proofBytes]]), entries = [], decisions = [];
  for (const previous of prior.entries) {
    const current = structuredClone(previous), before = JSON.parse(old.get(previous.evidence_report)), profile = profiles[previous.sha];
    const previousRef = {path: previous.evidence_report, sha256: hash(old.get(previous.evidence_report))};
    const refs = [previousRef, ...inputs.source_evidence, ...dependencies, {path: proofPath, sha256: hash(proofBytes)}];
    let review, path;
    if (profile) {
      const definition = bidiRequirementsBefore(previous.sha,generatedIdentityRequirements(previous.sha),line,{readMember:rawRead}), original = originals.find(row => row.sha === previous.sha);
      const sourceMembers = definition.members.map(path => ({path, sha256: hash(read(path))}));
      current.final_disposition = profile.disposition; current.reason = profile.decision; current.files = original.paths; current.affected_branches = [line];
      current.individual_proof = {proof_kind: GENERATED_IDENTITY_KIND, review_depth: 'individual-compatibility', diff_sha256: definition.patch, affected_branches: [line], decision: profile.decision,
        generated_identity_behavior: {kind: definition.kind, case_ids: definition.case_ids, source_members: sourceMembers}};
      path = 'compatibility/f10/disposition-ledger/evidence/closeout-identity-' + profile.name + '-source-judgment.json';
      review = {schema_version: 1, line, sha: previous.sha, status: 'reviewed', final_disposition: current.final_disposition, source_parent: inputs.source_parent,
        reviewer: 'Codex primary implementer', review_date: '2026-10-16', review_depth: 'individual-compatibility', affected_branches: [line], judgment_stage: 'source-complete-packed-required',
        diff_sha256: definition.patch, patch_file: original.path, complete_original_files: original.paths, complete_original_hunks: original.hunks.length,
        full_patch_verified_against_cached_Git_object: true, hunk_reviews: original.hunks.map((hunk, index) => ({...hunk, judgment: profile.hunks[index]})),
        source_conclusion: profile.decision, decision: profile.decision, individual_proof: current.individual_proof,
        branch_review: {line, minimum_framework: pkg.peerDependencies['@angular/core'].slice(1), minimum_CDK: pkg.peerDependencies['@angular/cdk'].slice(1), peer_reviews: peerReview},
        independent_evidence: refs, prior_entry: previous, runtime_admission: {required: true, qualified_by_this_document: false, case_ids: definition.case_ids,
          contract: 'Captured actual successful full106 packed coordinator invocation, current clean source/library/run identity, one check-owned rehashed output and equal rich raw/selected observations. Re-evaluate both generation creation orders, own exact nodes/ARIA and explicit IDs, snack ownership/lifecycle and cleanup; source/constructor/synthetic diagnostics are insufficient.'},
        consumer_HTML_CSS_SCSS_changed: false, source_conclusion_only: true, semantic_pass: false, actual_packed_or_native_or_floor_qualified: false, g11_claim: 'not-passed'};
    } else {
      const index = inputs.contexts.indexOf(previous.sha); assert.ok(index >= 0); path = 'compatibility/f10/disposition-ledger/evidence/closeout-identity-context-' + contextNames[index] + '-source-judgment.json';
      const field = previous.individual_proof.historical_behavior ? 'historical_behavior' : 'progress_csp_behavior';
      const definition = field === 'historical_behavior' ? historicalBehaviorRequirements(previous.sha) : progressCspRequirements(previous.sha);
      const oldMembers = previous.individual_proof[field].source_members; assert.deepEqual(oldMembers.map(row => row.path), definition.members);
      const changed = oldMembers.filter(row => hash(read(row.path)) !== row.sha256).map(row => row.path); assert.deepEqual(changed, ['scripts/check-upstream-audit-disposition.mjs']);
      current.individual_proof[field].source_members = oldMembers.map(row => ({...row, sha256: hash(read(row.path))}));
      review = structuredClone(before); review.individual_proof = structuredClone(current.individual_proof); review.independent_evidence.push(...refs);
      review.generated_identity_context_requalification = {source_parent: inputs.source_parent, previous_source_review: previousRef, dependencies,
        conclusion: 'The sole production source context change adds a pure finite three-SHA packed-ID reader and mandatory classification to the root checker. Every earlier packed, historical and CSP predicate and coordinator capture remains unchanged. Removing only those exact additions recovers the complete preceding checker byte for byte. Both earlier test files recover exactly after removal of their explicit read context; original expected hashes and every assertion remain. The five original whole-patch decisions, hunk judgments, source receipts and actual runtime requirements are retained. No new product/native/browser/packed/floor qualification follows.', actual_runtime_qualified: false};
      assert.deepEqual(review.hunk_reviews, before.hunk_reviews); assert.equal(review.decision, before.decision); assert.equal(review.semantic_pass, false);
    }
    writes.set(path, json(review)); current.evidence_report = path;
    current.source_check = {kind: 'individual-source-reviewed-runtime-required', diff_sha256: review.diff_sha256, patch_path: review.patch_file, evidence_report_sha256: hash(writes.get(path))};
    current.generated_identity_source_context = {inputs: {path: inputPath, sha256: hash(input)}, source_proof: {path: proofPath, sha256: hash(proofBytes)}, previous_source_review: previousRef};
    assert.ok(individualReviewScopeOk({entry: current, proof: current.individual_proof, body: review, review, requiresIndividual: true, claimsBehavior: current.final_disposition !== 'do-not-adopt'}));
    entries.push(current); decisions.push({sha: current.sha, evidence_report: path, sha256: hash(writes.get(path)), actual_runtime_qualified: false});
  }
  return {proof, writes, entries, prior_entries: prior.entries, decisions};
}
export function recordIdentitySourceJudgments(root = rootDefault) {
  const inputs = JSON.parse(readFileSync(resolve(root, inputPath))), before = readFileSync(resolve(root, ledgerPath));
  assert.equal(hash(before), inputs.ledger_before_sha256); assert.equal(existsSync(resolve(root, proofPath)), false);
  const result = inspectIdentitySourceJudgments({root}), text = replaceEntries(before.toString(), result.entries), wanted = new Set(result.entries.map(row => row.sha));
  assert.deepEqual(JSON.parse(text).entries.filter(row => !wanted.has(row.sha)), JSON.parse(before).entries.filter(row => !wanted.has(row.sha)));
  for (const [path, bytes] of result.writes) writeFileSync(resolve(root, path), bytes); writeFileSync(resolve(root, ledgerPath), text);
  writeFileSync(resolve(root, prefix + 'decisions.json'), json({line: result.proof.line, decisions: result.decisions, actual_runtime_qualified: false, g11_claim: 'not-passed'}), {flag: 'wx'});
  return {line: result.proof.line, source_decisions: 3, preceding_contexts_preserved: 5, actual_runtime_or_authored_use_closures: 0, g11_claim: 'not-passed'};
}
if (process.argv[1] && import.meta.url === pathToFileURL(resolve(process.argv[1])).href) {assert.deepEqual(process.argv.slice(2), ['--record']); console.log(JSON.stringify(recordIdentitySourceJudgments()));}
