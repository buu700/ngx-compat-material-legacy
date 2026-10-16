/**
 * @license
 * Copyright Google LLC All Rights Reserved.
 * Copyright (c) 2026 Ryan Lester.
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.io/license
 */
/** Real helper/CLI with synthetic review/run fixtures; no source decision closes. */
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {createRequire} from 'node:module';
import {gunzipSync} from 'node:zlib';
import {isDeepStrictEqual} from 'node:util';
import {readFileSync, writeFileSync, mkdirSync} from 'node:fs';
import {spawnSync} from 'node:child_process';
import {dirname, join, resolve} from 'node:path';
import {fileURLToPath} from 'node:url';
import {createFixture, hash} from './artifact-behavior-fixture.mjs';
import {SELECTION_BEHAVIOR_KIND, SELECTION_BEHAVIOR_SHA, selectionBehaviorRequirements, requiresSelectionBehavior, validateSelectionBehavior} from '../../scripts/upstream-selection-evidence.mjs';
import {SELECTION_COMPARATOR_CASE_ID, packedSelectionComparatorCase} from '../../scripts/selection-comparator-packed-contract.mjs';
import {selectionComparatorPackedSample} from '../selection_comparator_packed_sample.mjs';
import {validatePackedConsumerRun, readEvidenceMember} from '../../scripts/upstream-packed-run-evidence.mjs';
const root = resolve(dirname(fileURLToPath(import.meta.url)), '../..'), read = path => readFileSync(join(root, path));
const ts = createRequire(import.meta.url)('typescript'), line = JSON.parse(read('projects/ngx-material-legacy/package.json')).version.startsWith('21.') ? '21.x' : 'main';
const definition = selectionBehaviorRequirements(SELECTION_BEHAVIOR_SHA, line), sample = selectionComparatorPackedSample();
assert.equal(requiresSelectionBehavior({sha: SELECTION_BEHAVIOR_SHA}, {}), true);
assert.equal(requiresSelectionBehavior({}, {proof_kind: SELECTION_BEHAVIOR_KIND}), true);
assert.equal(requiresSelectionBehavior({}, {selection_behavior: null}), true); assert.equal(requiresSelectionBehavior({}, {}), false);
for (const foreign of ['unknown', '__proto__', 'constructor']) assert.equal(selectionBehaviorRequirements(SELECTION_BEHAVIOR_SHA, foreign), null);
assert.equal(selectionBehaviorRequirements('unknown', line), null);
const escaped = selectionBehaviorRequirements(SELECTION_BEHAVIOR_SHA, line); escaped.members.length = 0;
assert.ok(selectionBehaviorRequirements(SELECTION_BEHAVIOR_SHA, line).members.length > 0);
const note = 'Synthetic validator fixture only. This is no original-hunk/source audit conclusion, real Angular component execution, packed consumer, native behavior or floor qualification.';
const entry = {sha: SELECTION_BEHAVIOR_SHA, bucket: 'behavior-semantic', subject: 'Synthetic public comparator admission fixture', final_disposition: 'inherited',
  evidence_report: 'compatibility/f10/disposition-ledger/evidence/fixture-selection-comparator.json',
  individual_proof: {proof_kind: SELECTION_BEHAVIOR_KIND, diff_sha256: definition.patch, review_depth: 'individual-compatibility', affected_branches: [line], decision: note,
    installed_member: definition.installed_member, reachable_behavior: {kind: 'executed-delegation', id: SELECTION_COMPARATOR_CASE_ID},
    selection_behavior: {kind: definition.kind, case_ids: definition.case_ids, source_members: definition.members.map(path => ({path, sha256: hash(read(path))}))}}};
const review = {schema_version: 1, sha: entry.sha, line, status: 'reviewed', final_disposition: 'inherited', diff_sha256: definition.patch,
  patch_file: 'compatibility/f10/disposition-ledger/evidence/patches/9494ff2d65c98726046e6a20dd6a6d938e97a2f6-selection-comparator-full.patch',
  decision: note, semantic_pass: false, fixture_only: true, g11_claim: 'not-passed'};
entry.individual_proof.artifact_behavior = {source_members: entry.individual_proof.selection_behavior.source_members};
const f = createFixture(root, {entry, review}); delete f.entry.individual_proof.artifact_behavior;
const selected = () => f.observation.cases.find(row => row.case_id === SELECTION_COMPARATOR_CASE_ID);
const assign = value => {Object.assign(selected(), packedSelectionComparatorCase(value), {legacy_harness_passed: true});
  f.observation.extra.harness.selectionComparatorExposure = true; f.observation.extra.harness.selectionComparatorObservation = structuredClone(value);};
assign(sample); f.save();
const targets = [f.entry, f.request, f.run, f.report, f.observation], originals = targets.map(value => structuredClone(value));
function reset(write = true) {for (const [i, target] of targets.entries()) {for (const key of Object.keys(target)) delete target[key]; Object.assign(target, structuredClone(originals[i]));} if (write) f.save();}
const check = () => validateSelectionBehavior({root: f.root, entry: f.entry, proof: f.entry.individual_proof, request: f.request});
let helperCases = 0, semanticCases = 0, cliCases = 0;
function negative(name, mutate, pattern = /./, noSave = false) {reset(); mutate(); if (!noSave) f.save(); const observed = check();
  assert.equal(observed.ok, false, name); assert.match(observed.detail, pattern, name); helperCases++;}
try {
  assert.equal(check().ok, true, JSON.stringify(check())); helperCases++;
  const prerequisite = validatePackedConsumerRun({root: f.root, request: f.request}); assert.equal(prerequisite.ok, true);
  const guard = ts.createSourceFile('guard.mjs', read('scripts/upstream-selection-evidence.mjs').toString(), ts.ScriptTarget.Latest, true);
  const executable = guard.statements.filter(node => !ts.isImportDeclaration(node)).map(node => node.getText(guard).replace(/^export /, '')).join('\n');
  const members = new Map(definition.members.map(path => [path, readEvidenceMember(f.root, path)]));
  const cached = new Function('createHash', 'gunzipSync', 'isDeepStrictEqual', 'readEvidenceMember', 'validatePackedConsumerRun',
    'SELECTION_COMPARATOR_CASE_ID', 'packedSelectionComparatorCase', executable + ';return validateSelectionBehavior;')(
    createHash, gunzipSync, isDeepStrictEqual, (_root, path) => {assert.ok(members.has(path)); return members.get(path);},
    () => ({...prerequisite, observation: f.observation}), SELECTION_COMPARATOR_CASE_ID, packedSelectionComparatorCase);
  const semantic = () => cached({root: f.root, entry: f.entry, proof: f.entry.individual_proof, request: f.request}); assert.equal(semantic().ok, true);
  const corpusText = read('tests/selection_comparator_packed_probe.mjs').toString(), corpus = ts.createSourceFile('corpus.mjs', corpusText, ts.ScriptTarget.Latest, true);
  const start = corpus.statements.find(node => ts.isVariableStatement(node) && [...node.declarationList.declarations].some(row => row.name.getText(corpus) === 'mutations')).getStart(corpus);
  const end = corpus.statements.find(node => ts.isForOfStatement(node) && node.expression.getText(corpus) === 'mutations').getStart(corpus);
  const mutations = new Function('sample', corpusText.slice(start, end) + ';return mutations;')(sample);
  for (const mutate of mutations) {reset(false); const bad = structuredClone(sample); mutate(bad); assign(bad); selected().result = 'pass'; assert.equal(semantic().ok, false); semanticCases++;}
  for (const absent of [undefined, null, true, [], {}, 'pass']) {reset(false); assign(absent); selected().result = 'pass'; assert.equal(semantic().ok, false); semanticCases++;}
  negative('foreign-sha', () => {f.entry.sha = '0'.repeat(40);}, /unregistered/);
  negative('renamed-kind', () => {f.entry.individual_proof.proof_kind = 'ordinary-source';}, /unregistered/);
  negative('wrong-patch', () => {f.entry.individual_proof.diff_sha256 = '0'.repeat(64);}, /unregistered/);
  negative('wrong-scope', () => {f.entry.individual_proof.selection_behavior.kind = 'foreign';}, /wrong .* scope/);
  negative('wrong-case', () => {f.entry.individual_proof.selection_behavior.case_ids = ['foreign'];}, /wrong .* scope/);
  negative('wrong-peer', () => {f.entry.individual_proof.installed_member.version = '16.2.14';}, /installed member/);
  negative('wrong-delegation', () => {f.entry.individual_proof.reachable_behavior.id = 'foreign';}, /delegation/);
  negative('wrong-line', () => {f.request.line = line === 'main' ? '21.x' : 'main';}, /installed member/);
  negative('missing-source', () => {f.entry.individual_proof.selection_behavior.source_members.pop();}, /source scope/);
  negative('duplicate-source', () => {f.entry.individual_proof.selection_behavior.source_members[0] = f.entry.individual_proof.selection_behavior.source_members[1];}, /source scope/);
  negative('stale-source', () => {f.entry.individual_proof.selection_behavior.source_members[0].sha256 = '0'.repeat(64);}, /stale/);
  negative('missing-child', () => {delete f.request.packedConsumerExecution;}, /packed invocation/);
  negative('failed-child', () => {f.request.packedConsumerExecution.exit_code = 7;}, /packed invocation/);
  negative('passing-slice', () => {f.report.coverage = 'slice';}, /packed result/);
  negative('foreign-library', () => {f.report.artifacts.library.sha256 = '0'.repeat(64);}, /packed result/);
  negative('omitted-case', () => {f.observation.cases = f.observation.cases.filter(row => row.case_id !== SELECTION_COMPARATOR_CASE_ID);}, /observed cases/);
  negative('marker', () => {selected().observation = null;}, /observations/);
  negative('raw-selected-mismatch', () => {f.observation.extra.harness.selectionComparatorObservation.states.reverse();}, /observations/);
  negative('original-regression-failed', () => {f.observation.extra.harness.selectionComparatorExposure = false;}, /observations/);
  negative('collector-flag-failed', () => {selected().legacy_harness_passed = false;}, /observations/);
  negative('tampered-output', () => {f.runPut(f.relative, '{}');}, /bytes\/hash/, true);
  reset(); const peerPath = f.entry.individual_proof.installed_member.path, peerBytes = readFileSync(join(f.root, peerPath));
  try {const changed = Buffer.concat([peerBytes, Buffer.from(' ')]); f.repoPut(peerPath, changed);
    f.entry.individual_proof.selection_behavior.source_members.find(row => row.path === peerPath).sha256 = hash(changed); f.save();
    assert.match(check().detail, /wrong public selection peer bytes/); helperCases++;
  } finally {f.repoPut(peerPath, peerBytes);}
  const out = join(f.runDir, 'evidence/upstream-audit-disposition/synthetic-selection'); mkdirSync(out, {recursive: true});
  const environment = Object.fromEntries(Object.entries(process.env).filter(([key]) => !key.startsWith('RC_')));
  function cli(name, mutate, expected) {
    reset(); mutate?.(); f.save(); f.runPut('seed.json', {commits: [{sha: f.entry.sha}], fixture_only: true}); f.runPut('ledger.json', {entries: [f.entry], fixture_only: true, g11_claim: 'not-passed'});
    const reportPath = join(f.runDir, name + '.json'), env = {...environment, RC_CHECK_ID: 'upstream-audit-disposition', RC_RUN_ID: f.request.runId,
      RC_INVOCATION_ID: 'synthetic-selection', RC_EVIDENCE_BINDING: JSON.stringify(f.request.binding), RC_ASSERTION_OUTPUT_DIR: out,
      RC_UPSTREAM_PACKED_CONSUMER: JSON.stringify(f.request.packedConsumerExecution ?? null)};
    const child = spawnSync(process.execPath, [join(f.root, 'scripts/check-upstream-audit-disposition.mjs'), '--admission', '--line', line,
      '--seed', join(f.runDir, 'seed.json'), '--ledger', join(f.runDir, 'ledger.json'), '--symbols', join(f.root, 'symbols.json'),
      '--current-symbols', join(f.root, 'current.json'), '--report', reportPath], {cwd: f.root, env, encoding: 'utf8', timeout: 30000});
    assert.ok([0, 1].includes(child.status), child.stderr); const observed = JSON.parse(readFileSync(reportPath));
    assert.equal(child.status === 0, expected, name + child.stderr + JSON.stringify(observed.artifact_behavior_evidence));
    assert.equal(observed.g11_claim, 'not-passed'); assert.equal(observed.authored_use_review_evidence.insufficient, 0);
    if (expected) {const owned = JSON.parse(readFileSync(join(out, 'disposition-observations.json'))); assert.deepEqual(owned.artifact_behavior_evidence, observed.artifact_behavior_evidence);}
    cliCases++;
  }
  cli('complete', null, true); cli('missing-child', () => {delete f.request.packedConsumerExecution;}, false);
  cli('failed-child', () => {f.request.packedConsumerExecution.exit_code = 7;}, false);
  cli('forged-rich-state', () => {const bad = structuredClone(sample); bad.states[2].selected_indices = [-1]; assign(bad); selected().result = 'pass';}, false);
  cli('marker', () => {selected().observation = true;}, false);
  cli('relabeled-irrelevant', () => {f.entry.final_disposition = 'irrelevant'; f.entry.individual_proof.proof_kind = 'ordinary-source';}, false);
  cli('removed-proof', () => {f.entry.final_disposition = 'irrelevant'; delete f.entry.individual_proof;}, false);
  cli('wrong-installed-peer', () => {f.entry.individual_proof.installed_member.version = '16.2.14';}, false);
} finally {f.dispose();}
const report = {schema_version: 1, line, finite_subjects: 1, full_packed_roster: 106, actual_helper_controls: helperCases,
  cached_actual_body_semantic_controls: semanticCases, actual_CLI_controls: cliCases, synthetic_input_and_review: true,
  actual_source_judgment_completed_by_this_test: false, actual_packed_native_or_floor_qualified: false, g11_claim: 'not-passed',
  helper_sha256: hash(read('scripts/upstream-selection-evidence.mjs')), producer_sha256: hash(read('tests/upstream/selection-comparator-admission.mjs'))};
if (process.argv[2]) writeFileSync(process.argv[2], JSON.stringify(report, null, 2) + '\n', {flag: 'wx'});
console.log(JSON.stringify(report));
