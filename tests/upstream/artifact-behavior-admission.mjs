/**
 * @license
 * Copyright Google LLC All Rights Reserved.
 * Copyright (c) 2026 Ryan Lester.
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.io/license
 */
/** Synthetic evidence tests the shipped validator; it certifies no product run. */
import assert from 'node:assert/strict';
import {createRequire} from 'node:module';
import {spawnSync} from 'node:child_process';
import {readFileSync, writeFileSync, mkdirSync, renameSync, symlinkSync, unlinkSync} from 'node:fs';
import {dirname, join, resolve} from 'node:path';
import {fileURLToPath} from 'node:url';
import {requiresArtifactBehavior, validateArtifactBehavior} from '../../scripts/upstream-artifact-behavior-evidence.mjs';
import {createFixture, hash} from './artifact-behavior-fixture.mjs';

const sourceRoot = resolve(dirname(fileURLToPath(import.meta.url)), '../..');
const f = createFixture(sourceRoot), observations = [];
let helperCases = 0, cliCases = 0, mutants = 0;
const objects = [f.entry, f.request, f.run, f.report, f.observation];
const originals = objects.map(value => structuredClone(value));
function reset() {
  for (const [index, target] of objects.entries()) {
    for (const key of Object.keys(target)) delete target[key];
    Object.assign(target, structuredClone(originals[index]));
  }
  f.save();
}
const check = () => validateArtifactBehavior({root: f.root, entry: f.entry, proof: f.entry.individual_proof, request: f.request});
const selected = () => f.observation.cases.find(row => row.case_id === 'packed-consumer/harness/legacy-select');
function negative(name, mutate, pattern, {afterSave = false} = {}) {
  reset(); assert.equal(check().ok, true, 'baseline before ' + name);
  if (!afterSave) { mutate(); f.save(); } else mutate();
  const result = check(); assert.equal(result.ok, false, name); if (pattern) assert.match(result.detail, pattern, name);
  observations.push({name, result: result.detail}); helperCases++;
}
try {
  reset(); assert.equal(check().ok, true); helperCases++;
  assert.equal(f.ids.length, 106); assert.equal(f.frozenUses, 1736);
  assert.equal(requiresArtifactBehavior(f.entry, {}), true);
  assert.equal(requiresArtifactBehavior({sha: 'a'.repeat(40)}, {artifact_behavior: null}), true);
  assert.equal(requiresArtifactBehavior({sha: 'a'.repeat(40)}, {proof_kind: 'ordinary-source-review'}), false);
  negative('unregistered SHA', () => f.entry.sha = 'a'.repeat(40), /unregistered/);
  negative('renamed proof kind', () => f.entry.individual_proof.proof_kind = 'whole-source-review', /unregistered/);
  negative('wrong original patch', () => f.entry.individual_proof.diff_sha256 = 'a'.repeat(64), /unregistered/);
  for (const value of [undefined, null, [], {}, true]) negative('invalid behavior scope ' + String(value), () => f.entry.individual_proof.artifact_behavior = value, /scope/);
  negative('wrong behavior scope', () => f.entry.individual_proof.artifact_behavior.kind = 'source-match', /scope/);
  negative('missing required case', () => f.entry.individual_proof.artifact_behavior.case_ids = [], /scope/);
  negative('broadened required cases', () => f.entry.individual_proof.artifact_behavior.case_ids.push('unrelated'), /scope/);
  negative('omitted reviewed source', () => f.entry.individual_proof.artifact_behavior.source_members.pop(), /source scope/);
  negative('duplicated reviewed source', () => f.entry.individual_proof.artifact_behavior.source_members[0] = f.entry.individual_proof.artifact_behavior.source_members[1], /source scope/);
  negative('stale reviewed source', () => f.entry.individual_proof.artifact_behavior.source_members[0].sha256 = 'f'.repeat(64), /stale reviewed/);
  negative('missing coordinator', () => { for (const key of Object.keys(f.request)) delete f.request[key]; }, /coordinator/);
  negative('prepack binding', () => f.request.binding.phase = 'prepack', /binding/);
  negative('unclean input', () => f.request.binding.input_clean = false, /binding/);
  negative('wrong source line', () => f.request.binding.source_line = f.line === 'main' ? '21.x' : 'main', /binding/);
  negative('self-consistent foreign line binding', () => { f.request.line = f.line === 'main' ? '21.x' : 'main'; f.request.binding.source_line = f.request.line; }, /checkout source line/);
  negative('stale checkout', () => f.request.binding.source_commit = 'a'.repeat(40), /checkout/);
  for (const value of [undefined, null, {}, {run_id: 'old-run', invocation_id: 'synthetic-packed-consumer', exit_code: 0},
    {run_id: f.run.run_id, invocation_id: 'synthetic-packed-consumer', exit_code: 8},
    {run_id: f.run.run_id, invocation_id: '../foreign', exit_code: 0}]) {
    negative('missing/failed/foreign coordinator prerequisite ' + JSON.stringify(value), () => f.request.packedConsumerExecution = value, /coordinator-observed/);
  }
  negative('wrong manifest source', () => f.run.source.git_tree_sha = 'b'.repeat(40), /source snapshot/);
  negative('changed artifact list', () => f.run.artifacts[0].sha256 = 'f'.repeat(64), /changed run artifacts/);
  negative('changed environment', () => f.run.environment.fixture_only = false, /environment/);
  negative('changed oracle', () => f.run.oracles.fixture_only = false, /oracles/);
  negative('changed pack execution', () => f.run.pack_execution.fixture_only = false, /pack_execution/);
  negative('changed pack metadata', () => f.run.pack_metadata.fixture_only = false, /pack_metadata/);
  negative('wrong expected matrix', () => f.request.binding.matrix_sha256 = 'f'.repeat(64), /matrix/);
  for (const [field, value] of [['line', f.line === 'main' ? '21.x' : 'main'], ['run_id', 'prior-run'],
    ['invocation_id', 'prior-invocation'], ['schema_version', 2], ['template', true], ['check_id', 'source-policy']]) {
    negative('wrong report ' + field, () => f.report[field] = value, /report subject/);
  }
  negative('wrong report binding', () => f.report.binding.source_tree = 'b'.repeat(40), /report subject/);
  for (const [field, value] of [['result', 'fail'], ['coverage', 'slice'], ['exit_code', 9], ['subject_kind', 'source'], ['subject_ids', ['source']]]) {
    negative('failed/incomplete ' + field, () => f.report[field] = value, /packed result/);
  }
  negative('wrong report library', () => f.report.artifacts.library.sha256 = 'f'.repeat(64), /packed result/);
  for (const field of ['expected_case_ids', 'discovered_case_ids', 'executed_case_ids', 'passed_case_ids']) {
    negative('omitted ' + field, () => f.report[field].pop(), /incomplete/);
    negative('duplicate ' + field, () => f.report[field][0] = f.report[field][1], /incomplete/);
  }
  for (const field of ['passed', 'failed', 'skipped']) negative('wrong count ' + field, () => f.report[field]++, /counts/);
  for (const field of ['failed_case_ids', 'skipped_case_ids', 'unresolved_case_ids', 'exceptions']) negative('unresolved ' + field, () => f.report[field].push('unresolved'), /unresolved/);
  negative('wrong assertion run', () => f.observation.run_id = 'old-run', /assertion subject/);
  negative('wrong assertion invocation', () => f.observation.invocation_id = 'old-invocation', /assertion subject/);
  negative('wrong assertion library', () => f.observation.library_sha256 = 'f'.repeat(64), /assertion subject/);
  negative('missing report assertion', () => f.report.case_results.pop(), /report assertions/);
  negative('borrowed report assertion', () => f.report.case_results[0].output_paths = ['evidence/foreign.json'], /report assertions/);
  negative('failed report assertion', () => f.report.case_results[0].result = 'fail', /report assertions/);
  negative('missing observed case', () => f.observation.cases.pop(), /observed cases/);
  negative('failed observed case', () => f.observation.cases[0].result = 'fail', /observed cases/);
  negative('marker without observation', () => delete selected().observation, /focus\/click/);
  negative('current generation omitted', () => { selected().observation.contexts = selected().observation.contexts.slice(0, 2); f.observation.extra.harness.selectFocusClick = selected().observation; }, /focus\/click/);
  negative('rehashed focus/click regression', () => { selected().observation.contexts[0].cycles[0].after_click.same_panel_node = false; f.observation.extra.harness.selectFocusClick = selected().observation; }, /focus\/click/);
  negative('boilerplate harness marker', () => selected().legacy_harness_passed = false, /focus\/click/);
  for (const field of ['selectOpened', 'selectClosed', 'viewportShared']) negative('original harness ' + field, () => f.observation.extra.harness[field] = false, /focus\/click/);
  negative('different raw observation', () => f.observation.extra.harness.selectFocusClick = null, /focus\/click/);
  negative('tampered observation bytes', () => f.runPut(f.relative, '{}'), /bytes\/hash/, {afterSave: true});
  negative('tampered library bytes', () => f.runPut('library.tgz', 'changed'), /bytes\/hash/, {afterSave: true});
  f.runPut('library.tgz', 'Synthetic artifact identity bytes; not a package.\n');
  reset();
  f.repoPut('unreviewed-source-change.txt', 'Dirty source fixture control.\n');
  assert.equal(check().ok, false, 'dirty current checkout'); helperCases++;
  unlinkSync(join(f.root, 'unreviewed-source-change.txt'));
  f.repoPut('compatibility/rc/reports/generated-fixture.json', {fixture_only: true});
  assert.equal(check().ok, true, 'coordinator-excluded generated diagnostic'); helperCases++;
  unlinkSync(join(f.root, 'compatibility/rc/reports/generated-fixture.json'));
  const originalReport = readFileSync(join(f.runDir, 'reports/packed-consumer.json'));
  for (const path of ['reports/packed-consumer.json', f.relative]) {
    const target = join(f.runDir, path); renameSync(target, target + '.saved'); symlinkSync(target + '.saved', target);
    assert.equal(check().ok, false, 'symlink ' + path); helperCases++;
    unlinkSync(target); renameSync(target + '.saved', target);
  }
  for (const mutate of [report => report.outputs.push(report.outputs[0]), report => report.outputs[0].path = 'evidence/foreign/consumer-observations.json',
    report => report.outputs[0].sha256 = 'f'.repeat(64)]) {
    reset(); mutate(f.report); f.runPut('reports/packed-consumer.json', f.report); assert.equal(check().ok, false); helperCases++;
  }
  f.runPut('reports/packed-consumer.json', originalReport);
  reset();
  // The real CLI consumes the fixture source review and all 1736 authored rows.
  const environment = {...process.env, NODE_PATH: dirname(dirname(dirname(createRequire(import.meta.url).resolve('typescript'))))};
  for (const name of Object.keys(environment).filter(name => name.startsWith('RC_'))) delete environment[name];
  const invocation = 'synthetic-upstream', outputDir = join(f.runDir, 'evidence/upstream-audit-disposition', invocation);
  mkdirSync(outputDir, {recursive: true});
  const runCli = (name, mutate, expected, {noCoordinator = false, checker = 'check-upstream-audit-disposition.mjs'} = {}) => {
    reset(); mutate?.(); f.save();
    f.runPut('seed.json', {commits: [{sha: f.entry.sha}], fixture_only: true});
    f.runPut('ledger.json', {g11_claim: 'not-passed', entries: [f.entry], fixture_only: true});
    const reportPath = join(f.runDir, name + '.json');
    const env = noCoordinator ? environment : {...environment, RC_CHECK_ID: 'upstream-audit-disposition', RC_RUN_ID: f.request.runId,
      RC_INVOCATION_ID: invocation, RC_EVIDENCE_BINDING: JSON.stringify(f.request.binding), RC_ASSERTION_OUTPUT_DIR: outputDir,
      RC_UPSTREAM_PACKED_CONSUMER: JSON.stringify(f.request.packedConsumerExecution)};
    const child = spawnSync(process.execPath, [join(f.root, 'scripts', checker), '--admission', '--line', f.line,
      '--seed', join(f.runDir, 'seed.json'), '--ledger', join(f.runDir, 'ledger.json'), '--symbols', join(f.root, 'symbols.json'),
      '--current-symbols', join(f.root, 'current.json'), '--report', reportPath], {cwd: f.root, env, encoding: 'utf8', timeout: 30000});
    assert.ok([0, 1].includes(child.status), name + ': ' + child.stderr + String(child.error || ''));
    const report = JSON.parse(readFileSync(reportPath));
    assert.equal(report.authored_use_inventory.expected, 1736); assert.equal(report.authored_use_review_evidence.insufficient, 0);
    assert.equal(report.current_authored_use_inventory.ready, true); assert.equal(report.g11_claim, 'not-passed');
    assert.equal(child.status === 0, expected, name + ': ' + child.stderr + JSON.stringify(report.artifact_behavior_evidence));
    assert.equal(report.disposition_admission, expected ? 'pass' : 'incomplete'); cliCases++;
    if (expected && !noCoordinator) {
      const assertion = JSON.parse(readFileSync(join(outputDir, 'disposition-observations.json')));
      assert.deepEqual(assertion.artifact_behavior_evidence, report.artifact_behavior_evidence);
      assert.equal(assertion.artifact_behavior_evidence.length, 1);
      assert.equal(assertion.artifact_behavior_evidence[0].ok, true);
      assert.equal(assertion.artifact_behavior_evidence[0].invocation_id, f.request.packedConsumerExecution.invocation_id);
      assert.deepEqual(assertion.artifact_behavior_evidence[0].output, f.report.outputs[0]);
    }
    observations.push({name, actual_cli: true, exit_code: child.status, fixture_only: true});
  };
  runCli('complete-current-artifact-fixture', null, true);
  runCli('source-only-without-run', null, false, {noCoordinator: true});
  runCli('failed-prerequisite', () => f.request.packedConsumerExecution.exit_code = 7, false);
  runCli('stale-producer', () => f.report.invocation_id = 'previous-invocation', false);
  runCli('rehashed-incomplete-runtime', () => { selected().observation.contexts.pop(); f.observation.extra.harness.selectFocusClick = selected().observation; }, false);
  runCli('kind-renaming-cannot-bypass', () => f.entry.individual_proof.proof_kind = 'ordinary-review', false);
  runCli('missing-source-judgment-scope', () => f.entry.individual_proof.artifact_behavior.source_members.pop(), false);
  runCli('missing-original-patch-binding', () => f.entry.individual_proof.diff_sha256 = 'a'.repeat(64), false);
  runCli('unfinished-review', () => f.entry.individual_proof.status = 'pending', false);
  runCli('wrong-branch-judgment', () => f.entry.individual_proof.affected_branches = [f.line === 'main' ? '21.x' : 'main'], false);
  // A weakened copy must admit the negative: the control detects the guard itself.
  const checkerPath = join(f.root, 'scripts/check-upstream-audit-disposition.mjs'), checkerBytes = readFileSync(checkerPath, 'utf8');
  const mutant = checkerBytes.replace('if (requiresArtifactBehavior(entry, proof)) {', 'if (false && requiresArtifactBehavior(entry, proof)) {');
  assert.notEqual(mutant, checkerBytes);
  f.repoPut('scripts/artifact-mutant.mjs', mutant);
  runCli('mutant-removes-runtime-guard', null, true, {noCoordinator: true, checker: 'artifact-mutant.mjs'}); mutants++;
  unlinkSync(join(f.root, 'scripts/artifact-mutant.mjs'));
  reset(); assert.equal(check().ok, true);
  const output = {schema_version: 1, line: f.line, node: process.version, helper_cases: helperCases, actual_cli_cases: cliCases,
    checker_mutants_detected: mutants, packed_roster_cases: f.ids.length, frozen_fixture_uses: f.frozenUses,
    current_fixture_additional_uses: f.additionalUses, actual_product_or_packed_or_native_qualified: false, g11_claim: 'not-passed', observations,
    helper_sha256: hash(readFileSync(join(sourceRoot, 'scripts/upstream-artifact-behavior-evidence.mjs'))),
    checker_sha256: hash(readFileSync(join(sourceRoot, 'scripts/check-upstream-audit-disposition.mjs'))),
    coordinator_sha256: hash(readFileSync(join(sourceRoot, 'scripts/rc-verify.py'))),
    producer_sha256: hash(readFileSync(join(sourceRoot, 'tests/upstream/artifact-behavior-admission.mjs'))),
    fixture_sha256: hash(readFileSync(join(sourceRoot, 'tests/upstream/artifact-behavior-fixture.mjs')))};
  if (process.argv[2]) writeFileSync(process.argv[2], JSON.stringify(output, null, 2) + '\n', {flag: 'wx'});
  console.log(JSON.stringify({...output, observations: undefined}));
} finally { f.dispose(); }
