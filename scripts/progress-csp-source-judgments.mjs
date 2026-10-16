/**
 * @license
 * Copyright Google LLC All Rights Reserved.
 * Copyright (c) 2026 Ryan Lester.
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.io/license
 */
/** Complete source decisions; actual current packed/browser execution is mandatory. */
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {execFileSync} from 'node:child_process';
import {existsSync, readFileSync, writeFileSync} from 'node:fs';
import {createRequire} from 'node:module';
import {dirname, resolve} from 'node:path';
import {gunzipSync} from 'node:zlib';
import {fileURLToPath, pathToFileURL} from 'node:url';
import {PROGRESS_CSP_KIND, progressCspRequirements} from './upstream-progress-csp-evidence.mjs';
import {historicalBehaviorRequirements} from './upstream-historical-behavior-evidence.mjs';
import {candidateProductSourcePaths} from './upstream-candidate-source-evidence.mjs';
import {individualReviewScopeOk} from './upstream-individual-evidence-scope.mjs';
import {stripProgressCspIntegration, precedingHistoricalContextMember} from '../tests/upstream/progress-csp-source-context.mjs';
const ts = createRequire(import.meta.url)('typescript');
const rootDefault = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const prefix = 'compatibility/rc/progress-csp-admission-', inputPath = prefix + 'inputs.json', proofPath = prefix + 'source-proof.json';
const ledgerPath = 'compatibility/f10/disposition-ledger/ledger.json';
const pins = {main: 'ab738de4ca939d371e5e9622191a9a79bc3b6a77d0c8ab5880deb9f676014df5',
  '21.x': '89a6524cf9312a71e7cb1e5f26ee8642236ebdd8cb1c4dc5890457041c416158'};
const hash = bytes => createHash('sha256').update(bytes).digest('hex');
const gitObject = (kind, bytes) => createHash('sha1').update(kind + ' ' + Buffer.byteLength(bytes) + '\0').update(bytes).digest('hex');
const json = value => Buffer.from(JSON.stringify(value, null, 2) + '\n');
const profiles = {
  cf3506adf1af1556d705dbb651e7e96a7141b81d: {
    name: 'non-buffer',
    conclusion: 'The complete one-file/one-hunk non-buffer CSP fix is satisfied through two distinct preserved boundaries. Owned Material16 legacy progress markup uses an inline SVG pattern and never a current MDC buffer-dot element. The exported ordinary companion theme remains reachable, so legacy markup alone cannot exclude the change: both advertised minimum public MatProgressBar implementations create dots only in buffer mode. The owned companion still emits historical background CSS, including its inactive IE-only data URI, and the ordinary current component supplies its structural gradient. Require actual current packed Sass plus public current/legacy controls in both Angular runtime modes, all four progress modes, no positive image-policy violations and a real blocked-data-image negative. No template/style migration, current private machinery or ordinary component fork is introduced. Source identity is conditional evidence; complete native artifact admission and all global release gates remain mandatory.',
    hunks: ['The original template wraps only the buffer-dot div in a buffer-mode condition. Both complete minimum public peer component sources retain that exact condition. The unchanged owned legacy SVG is a different historical structure, and Cyph targets its background node directly; replacing it would violate the consumer structure contract. The required real browser observations include current determinate/query/indeterminate hosts with no dots, current buffer with dots and the preserved legacy inline SVG. Exported companion CSS and CSP enforcement are exercised together, rather than inferring no image request from a source search.'],
  },
  '878700d10ab042b6a62c6f86f4fcc24d5a0ae685': {
    name: 'buffer-gradient',
    conclusion: 'The complete one-file/two-hunk buffer CSP fix is satisfied by the current minimum public companion structure while retaining the independently owned historical contract. Both own-line minimum peer structural styles remove the data-SVG mask and use a track-colored radial gradient with half-track-height dots, repeated size, fixed left position, inherited buffering transform/animation and forced-color fallback. The exported historical ordinary progress theme retains its original selectors/backgrounds and IE-only SVG data URI; its existing public progress-bar-overrides bridge supplies the independently owned M2 track/indicator colors consumed by the current structure. Require the actual packed exported Sass, current buffer gradient/color/no-mask and all non-buffer modes, inactive IE media, retained historical URI and legacy inline SVG, with enforced image-policy positive/negative observations in both real Angular runtime modes. No consumer CSS/SCSS change, palette mutation, helper rename, current m2 compatibility call-through, golden change or animation fork is authorized. This fixed-theme resource/style conclusion does not qualify arbitrary themes, enabled motion, general CSP/security, full Sass or the release.',
    hunks: [
      'Removing the unused vendor-prefixes import follows removal of the current data-SVG mask; it does not authorize deleting historical independently owned Sass helpers or changing the facade export map. Both complete minimum public peer structural sources contain no mask-image declaration for dots. No owned product import or source module changes in this worksheet.',
      'The whole structural hunk replaces the generated mask with a radial gradient using current track color and half track height, repeats at five dot radii, pins background-position left, and retains flex/rotation/buffering animation plus forced-colors fallback. Both minimum peer sources contain that full block. The ordinary historical theme still contributes its existing background-color and IE-only data URI, while its already-reviewed public override supplies the correct current M2 track slot. A required actual native fixed indigo observation checks computed 2px gradient, rgba(63,81,181,.25), no mask, inactive IE media and no applied data-image violation. Existing global high-contrast and enabled-motion checks remain required; this finite guard does not certify RTL animation positioning, all themes or general CSP.',
    ],
  },
};
const historicalNames = ['autocomplete', 'tab-link', 'select'];
const probeEdits = [
  ["import {stripProgressCspIntegration, precedingHistoricalContextMember} from './progress-csp-source-context.mjs';\n", ''],
  ["let checker = stripProgressCspIntegration(read('scripts/check-upstream-audit-disposition.mjs').toString(), 'checker');", "let checker = read('scripts/check-upstream-audit-disposition.mjs').toString();"],
  ["removeOnce(stripProgressCspIntegration(read('scripts/rc-verify.py').toString(), 'coordinator'), historicalCapture)", "removeOnce(read('scripts/rc-verify.py').toString(), historicalCapture)"],
  ['hash(precedingHistoricalContextMember(member.path, read))', 'hash(read(member.path))'],
];
function reverseProbe(text) {
  for (const [current, preceding] of probeEdits) {assert.equal(text.split(current).length, 2); text = text.replace(current, () => preceding);}
  return text;
}
function replaceEntries(text, entries) {
  const tree = ts.parseJsonText('ledger.json', text), array = tree.statements[0].expression.properties.find(p => p.name.text === 'entries').initializer;
  const edits = [];
  for (const node of array.elements) {
    const old = JSON.parse(node.getText(tree)), next = entries.find(row => row.sha === old.sha); if (!next) continue;
    const indent = ' '.repeat(tree.getLineAndCharacterOfPosition(node.getStart(tree)).character);
    edits.push({start: node.getStart(tree), end: node.end, text: JSON.stringify(next, null, 2).replaceAll('\n', '\n' + indent)});
  }
  assert.equal(edits.length, 5);
  for (const edit of edits.reverse()) text = text.slice(0, edit.start) + edit.text + text.slice(edit.end);
  return text;
}
export function inspectProgressCspJudgments({root = rootDefault, readMember} = {}) {
  const read = path => readMember ? readMember(path) : readFileSync(resolve(root, path));
  const pkg = JSON.parse(read('projects/ngx-material-legacy/package.json')), line = pkg.version.startsWith('21.') ? '21.x' : 'main';
  const input = read(inputPath); assert.equal(hash(input), pins[line], 'progress CSP source input changed'); const inputs = JSON.parse(input);
  const priorBytes = read(inputs.prior.path); assert.equal(hash(priorBytes), inputs.prior.sha256);
  const raw = gunzipSync(priorBytes); assert.equal(hash(raw), inputs.prior.raw_sha256); const prior = JSON.parse(raw);
  assert.equal(prior.line, line); assert.equal(prior.entries.length, 5);
  const old = new Map(prior.members.map(row => {assert.equal(hash(row.text), row.sha256); return [row.path, row.text];}));
  for (const [kind, path] of [['checker', 'scripts/check-upstream-audit-disposition.mjs'], ['coordinator', 'scripts/rc-verify.py']])
    assert.equal(stripProgressCspIntegration(read(path).toString(), kind), old.get(path), 'preceding complete file not recovered');
  assert.equal(reverseProbe(read('tests/upstream/historical-behavior-admission.mjs').toString()), old.get('tests/upstream/historical-behavior-admission.mjs'), 'preceding complete historical assertions not recovered');
  const precedingPacked = precedingHistoricalContextMember('scripts/upstream-artifact-behavior-evidence.mjs', read);
  assert.equal(hash(precedingPacked), '06deea33059729448f3b095be0e14bf1ea10c8bf1f9f3e0a522129d5a75af52b', 'earlier complete packed guard not recovered');
  for (const ref of inputs.source_evidence) assert.equal(hash(read(ref.path)), ref.sha256, 'source receipt changed');
  const product = execFileSync('git', ['-c', 'gc.auto=0', '-c', 'maintenance.auto=0', 'ls-tree', '-r', '-z', inputs.source_parent, '--', 'projects/ngx-material-legacy'], {cwd: root})
    .toString().split('\0').filter(Boolean).map(row => {
      const [meta, path] = row.split('\t'), [mode, kind, blob] = meta.split(' '); assert.equal(mode, '100644'); assert.equal(kind, 'blob');
      const bytes = read(path); assert.equal(gitObject('blob', bytes), blob, 'unreviewed product change'); return {path, sha256: hash(bytes), git_blob: blob};
    });
  assert.equal(product.length, 1141);
  assert.deepEqual(candidateProductSourcePaths(root).sort(), product.map(row => row.path).filter(path => /\.(ts|scss|css|html)$/.test(path)).sort());
  const peer = inputs.minimum_peer.members.map(ref => {
    const bytes = read(ref.path); assert.equal(hash(bytes), ref.sha256, 'minimum peer source changed'); const source = gunzipSync(bytes);
    assert.equal(hash(source), ref.raw_sha256); return {...ref, source: source.toString()};
  });
  const component = peer.find(row => row.package_member === 'package/fesm2022/progress-bar.mjs').source;
  assert.ok(component.includes("@if (mode === 'buffer')"));
  for (const text of ['background-image: radial-gradient(', 'background-repeat: repeat-x', 'background-size:', 'background-position: left', 'transform: rotate(180deg)', 'animation: mdc-linear-progress-buffering', 'background-color: ButtonBorder']) assert.ok(component.includes(text), text);
  assert.equal(component.includes('mask-image:'), false);
  const originals = inputs.originals.map(row => {
    assert.equal(gitObject('commit', row.commit_object), row.sha); assert.equal(hash(row.commit_object), row.commit_object_sha256);
    const patch = read(row.path); assert.equal(hash(patch), row.sha256); assert.equal(row.sha256, progressCspRequirements(row.sha).patch);
    const hunks = []; let file;
    for (const text of patch.toString().split('\n')) {if (text.startsWith('diff --git ')) file = text.split(' b/')[1]; if (text.startsWith('@@')) hunks.push({hunk: hunks.length + 1, file, header: text});}
    assert.equal(hunks.length, profiles[row.sha].hunks.length); return {...row, paths: [...new Set(hunks.map(row => row.file))], hunks};
  });
  const dependencyPaths = ['scripts/upstream-progress-csp-evidence.mjs', 'scripts/progress-csp-style-contract.mjs', 'scripts/browser-matrix-roster.mjs', 'tests/upstream/progress-csp-source-context.mjs'];
  const dependencies = dependencyPaths.map(path => ({path, sha256: hash(read(path))}));
  const proof = {schema_version: 1, line, source_parent: inputs.source_parent, inputs: {path: inputPath, sha256: hash(input)}, prior: inputs.prior,
    exact_complete_preceding_checker_and_coordinator_recovered: true, exact_complete_preceding_historical_test_recovered: true,
    preceding_three_scope_packed_guard_sha256: hash(precedingPacked), current_six_scope_packed_guard_sha256: hash(read('scripts/upstream-artifact-behavior-evidence.mjs')),
    new_finite_checker_dependencies: dependencies, unchanged_product_members: product.length, unchanged_product_population_sha256: hash(JSON.stringify(product)),
    originals: originals.map(({commit_object, ...row}) => row), minimum_peer: inputs.minimum_peer,
    source_evidence: inputs.source_evidence, producer_sha256: hash(read('scripts/progress-csp-source-judgments.mjs')),
    new_individual_source_decisions: 2, preceding_historical_source_contexts_requalified: 3,
    actual_native_or_packed_or_floor_qualified: false, actual_runtime_or_authored_use_closures: 0, g11_claim: 'not-passed'};
  const proofBytes = json(proof), writes = new Map([[proofPath, proofBytes]]), entries = [], decisions = [];
  for (const previous of prior.entries) {
    const current = structuredClone(previous), before = JSON.parse(old.get(previous.evidence_report)), profile = profiles[previous.sha];
    const priorRef = {path: previous.evidence_report, sha256: hash(old.get(previous.evidence_report))};
    const refs = [...inputs.source_evidence, ...dependencies, {path: proofPath, sha256: hash(proofBytes)}, priorRef];
    let review, docPath;
    if (profile) {
      const original = originals.find(row => row.sha === previous.sha), definition = progressCspRequirements(previous.sha);
      const sourceMembers = definition.members.map(path => ({path, sha256: hash(read(path))}));
      docPath = 'compatibility/f10/disposition-ledger/evidence/closeout-progress-' + profile.name + '-source-judgment.json';
      const individual = {proof_kind: PROGRESS_CSP_KIND, diff_sha256: definition.patch, review_depth: 'individual-compatibility', affected_branches: [line], decision: profile.conclusion,
        progress_csp_behavior: {kind: definition.kind, runtimes: definition.runtimes, modes: definition.modes, source_members: sourceMembers}};
      current.final_disposition = 'already-adapted'; current.reason = profile.conclusion; current.files = original.paths;
      current.affected_branches = [line]; current.individual_proof = individual;
      review = {schema_version: 1, line, sha: current.sha, status: 'reviewed', final_disposition: current.final_disposition,
        reviewer: 'Codex primary implementer', review_date: '2026-10-16',
        source_parent: inputs.source_parent, judgment_stage: 'source-complete-browser-required', review_depth: 'individual-compatibility', affected_branches: [line],
        diff_sha256: original.sha256, patch_file: original.path, full_original_patch_verified_against_cached_Git_object: true,
        original_files: original.paths, original_hunks: original.hunks.length,
        hunk_reviews: original.hunks.map((hunk, index) => ({...hunk, judgment: profile.hunks[index]})),
        source_conclusion: profile.conclusion, decision: profile.conclusion, individual_proof: individual,
        branch_review: {source_line: line, minimum_framework: pkg.peerDependencies['@angular/core'].slice(1), minimum_material: inputs.minimum_peer.version,
          minimum_public_peer: inputs.minimum_peer, no_consumer_HTML_CSS_SCSS_change: true},
        independent_evidence: refs, prior_entry: previous,
        runtime_admission: {required: true, qualified_by_this_document: false, checks: ['packed-consumer', 'browser-matrix'],
          contract: 'Current clean source/library/run identity, captured successful actual child outcomes, complete106 packed plus complete912 browser cells, hashed check-owned raw observations, both real Angular runtime modes and all four fixed-theme progress modes. No source, old diagnostic or synthetic fixture can qualify this requirement.'},
        source_conclusion_only: true, actual_native_or_packed_or_floor_qualified: false, semantic_pass: false,
        full_CSP_security_motion_Sass_and_release_qualification: false, g11_claim: 'not-passed'};
    } else {
      const index = inputs.historical_context_subjects.indexOf(previous.sha); assert.ok(index >= 0);
      docPath = 'compatibility/f10/disposition-ledger/evidence/closeout-progress-context-' + historicalNames[index] + '-source-judgment.json';
      const originalMembers = previous.individual_proof.historical_behavior.source_members;
      assert.deepEqual(originalMembers.map(row => row.path), historicalBehaviorRequirements(previous.sha).members);
      const changed = originalMembers.filter(row => hash(read(row.path)) !== row.sha256).map(row => row.path);
      assert.deepEqual(changed.sort(), ['scripts/check-upstream-audit-disposition.mjs', 'scripts/rc-verify.py'].sort());
      current.individual_proof.historical_behavior.source_members = originalMembers.map(row => ({...row, sha256: hash(read(row.path))}));
      review = structuredClone(before); review.individual_proof = structuredClone(current.individual_proof);
      review.progress_csp_context_requalification = {source_parent: inputs.source_parent, prior_source_review: priorRef,
        complete_old_checker_coordinator_and_historical_assertions_recovered: true,
        source_context_conclusion: 'The root checker additions dispatch and enforce a pure finite registry for the two different progress SHAs even if their metadata is relabeled, parse its captured browser outcome and preserve every original historical/packed guard in place. The only coordinator addition captures the earlier browser-matrix invocation/exit without altering packed or historical capture. Complete preceding files are recovered byte for byte after removing those exact additions. All old historical assertions and pins remain after finite context reversal. The retained source comparison additionally recovers the exact earlier three-scope guard from its already authenticated six-scope change capsule, preserving the original expected hash. The three original patch/hunk decisions, named historical requirements and every prior receipt remain unchanged. No runtime or floor credit follows.',
        added_dependencies: dependencies, actual_runtime_qualified: false};
      review.independent_evidence.push(...refs);
      assert.deepEqual(review.hunk_reviews, before.hunk_reviews); assert.equal(review.decision, before.decision);
      assert.equal(review.actual_native_or_packed_or_floor_qualified, false); assert.equal(review.semantic_pass, false);
    }
    writes.set(docPath, json(review)); current.evidence_report = docPath;
    current.source_check = {kind: 'individual-source-reviewed-runtime-required', diff_sha256: review.diff_sha256, patch_path: review.patch_file, evidence_report_sha256: hash(writes.get(docPath))};
    current.progress_csp_source_context = {inputs: {path: inputPath, sha256: hash(input)}, source_proof: {path: proofPath, sha256: hash(proofBytes)}, prior_source_review: priorRef};
    assert.ok(individualReviewScopeOk({entry: current, proof: current.individual_proof, body: review, review, requiresIndividual: true, claimsBehavior: true}));
    entries.push(current); decisions.push({sha: current.sha, evidence_report: docPath, sha256: hash(writes.get(docPath)), actual_runtime_qualified: false});
  }
  return {proof, writes, entries, prior_entries: prior.entries, decisions};
}
export function recordProgressCspJudgments(root = rootDefault) {
  const input = JSON.parse(readFileSync(resolve(root, inputPath)));
  const before = readFileSync(resolve(root, ledgerPath)); assert.equal(hash(before), input.ledger_before_sha256); assert.equal(existsSync(resolve(root, proofPath)), false);
  const result = inspectProgressCspJudgments({root}), text = replaceEntries(before.toString(), result.entries);
  const wanted = new Set(result.entries.map(row => row.sha));
  assert.deepEqual(JSON.parse(text).entries.filter(row => !wanted.has(row.sha)), JSON.parse(before).entries.filter(row => !wanted.has(row.sha)));
  for (const [path, bytes] of result.writes) writeFileSync(resolve(root, path), bytes);
  writeFileSync(resolve(root, ledgerPath), text);
  writeFileSync(resolve(root, prefix + 'decisions.json'), json({line: result.proof.line, decisions: result.decisions, actual_runtime_qualified: false, g11_claim: 'not-passed'}), {flag: 'wx'});
  return {line: result.proof.line, new_source_decisions: 2, preserved_historical_contexts: 3, actual_runtime_or_authored_use_closures: 0, g11_claim: 'not-passed'};
}
if (process.argv[1] && import.meta.url === pathToFileURL(resolve(process.argv[1])).href) {
  assert.deepEqual(process.argv.slice(2), ['--record']); console.log(JSON.stringify(recordProgressCspJudgments()));
}
