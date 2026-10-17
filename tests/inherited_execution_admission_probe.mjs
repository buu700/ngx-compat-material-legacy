/**
 * @license
 * Copyright Google LLC All Rights Reserved.
 * Copyright (c) 2026 Ryan Lester.
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.io/license
 */
// Synthetic validator input only; never product, peer or runtime qualification.
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {execFileSync, spawnSync} from 'node:child_process';
import {createRequire} from 'node:module';
import {createHash} from 'node:crypto';
import {createFixture} from './upstream/artifact-behavior-fixture.mjs';
import {validateInheritedExecution} from '../scripts/upstream-inherited-execution-evidence.mjs';
import {isolatedBidiPackedSample} from './bidi_isolated_packed_sample.mjs';
import {selectionComparatorPackedSample} from './selection_comparator_packed_sample.mjs';
import {TABLE_ONPUSH_SHA, SELECT_FOCUS_PATCH} from '../scripts/upstream-artifact-behavior-evidence.mjs';
const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const line = JSON.parse(fs.readFileSync(path.join(root, 'projects/ngx-material-legacy/package.json'))).version.startsWith('21.') ? '21.x' : 'main';
const sha = 'f'.repeat(40), patch = 'compatibility/rc/select-focus-click-original.patch';
const note = 'Synthetic inherited admission corruption fixture. No installed member or execution exists for this subject; arbitrary digest and executed-delegation id fields must not qualify it.';
const entry = {sha, subject: 'Synthetic inherited execution evidence fixture', bucket: 'behavior-semantic',
  final_disposition: 'inherited', reason: note, evidence_report: 'compatibility/f10/disposition-ledger/evidence/inherited-fixture.json',
  fixture_only: true, individual_proof: {proof_kind: 'complete-individual-runtime-review', diff_sha256: SELECT_FOCUS_PATCH,
    review_depth: 'individual-compatibility', affected_branches: [line], decision: note,
    installed_member: {path: 'package/fesm2022/never-installed.mjs', sha256: 'a'.repeat(64)},
    reachable_behavior: {kind: 'executed-delegation', id: 'never-executed-not-a-report'},
    artifact_behavior: {source_members: []}}};
const review = {sha, status: 'reviewed', final_disposition: 'inherited', diff_sha256: SELECT_FOCUS_PATCH, patch_file: patch, fixture_only: true};
const fixture = createFixture(root, {entry, review}); delete fixture.entry.individual_proof.artifact_behavior;
const observations = [];
const hash = bytes => createHash('sha256').update(bytes).digest('hex');
try {
  fixture.runPut('seed.json', {commits: [{sha}], fixture_only: true});
  fixture.runPut('ledger.json', {entries: [fixture.entry], g11_claim: 'not-passed', fixture_only: true});
  for (const coordinator of [false, true]) {
    const name = coordinator ? 'synthetic-coordinator-without-subject-execution' : 'without-any-coordinator';
    const reportPath = path.join(fixture.runDir, name + '.json'), env = {...process.env};
    for (const key of Object.keys(env).filter(key => key.startsWith('RC_'))) delete env[key];
    if (coordinator) {
      const invocation = 'synthetic-inherited', output = path.join(fixture.runDir, 'evidence/upstream-audit-disposition', invocation);
      fs.mkdirSync(output, {recursive: true});
      Object.assign(env, {RC_CHECK_ID: 'upstream-audit-disposition', RC_RUN_ID: fixture.request.runId,
        RC_INVOCATION_ID: invocation, RC_EVIDENCE_BINDING: JSON.stringify(fixture.request.binding), RC_ASSERTION_OUTPUT_DIR: output});
    }
    const child = spawnSync(process.execPath, [path.join(fixture.root, 'scripts/check-upstream-audit-disposition.mjs'), '--admission', '--line', line,
      '--seed', path.join(fixture.runDir, 'seed.json'), '--ledger', path.join(fixture.runDir, 'ledger.json'),
      '--symbols', path.join(fixture.root, 'symbols.json'), '--current-symbols', path.join(fixture.root, 'current.json'), '--report', reportPath],
    {cwd: fixture.root, env, encoding: 'utf8', timeout: 30000});
    assert.ok([0, 1].includes(child.status), child.stderr);
    const report = JSON.parse(fs.readFileSync(reportPath));
    const expected = process.argv.includes('--baseline') ? 0 : 1;
    assert.equal(child.status, expected, name + ': ' + child.stderr);
    assert.equal(report.insufficient_inherited, expected === 0 ? 0 : 1);
    assert.equal(report.g11_claim, 'not-passed');
    if (expected === 1) assert.match(report.inherited_execution_evidence[0].detail, /no registered verified inherited execution contract/);
    observations.push({name, exit_code: child.status, disposition_admission: report.disposition_admission,
      inherited_insufficient: report.insufficient_inherited, fixture_only: true, actual_subject_execution: false});
  }
} finally { fixture.dispose(); }
if (!process.argv.includes('--baseline')) {
  const ledger = JSON.parse(fs.readFileSync(path.join(root, 'compatibility/f10/disposition-ledger/ledger.json')));
  const sourceEntry = ledger.entries.find(row => row.sha === TABLE_ONPUSH_SHA);
  const sourceReview = JSON.parse(fs.readFileSync(path.join(root, sourceEntry.evidence_report)));
  const f = createFixture(root, {entry: sourceEntry, review: sourceReview});
  // Reuse the existing synthetic observation corpus, never candidate goldens.
  const ts = createRequire(import.meta.url)('typescript');
  const text = fs.readFileSync(path.join(root, 'tests/table_onpush_packed_contract_probe.mjs'), 'utf8');
  const ast = ts.createSourceFile('sample.mjs', text, ts.ScriptTarget.Latest, true);
  const declaration = ast.statements.filter(ts.isVariableStatement).flatMap(node => [...node.declarationList.declarations])
    .find(node => node.name.getText(ast) === 'sample');
  const sample = new Function('return (' + declaration.initializer.getText(ast) + ');')();
  const caseId = f.entry.individual_proof.reachable_behavior.id;
  f.observation.cases.find(row => row.case_id === caseId).observation = sample;
  f.observation.extra.harness.tableOnPushRendering = structuredClone(sample);
  const objects = [f.entry, f.request, f.run, f.report, f.observation], originals = objects.map(value => structuredClone(value));
  const peerPath = f.entry.individual_proof.installed_member.path;
  const peerBytes = fs.readFileSync(path.join(f.root, peerPath));
  const reset = () => {
    for (const [index, target] of objects.entries()) {
      for (const key of Object.keys(target)) delete target[key]; Object.assign(target, structuredClone(originals[index]));
    }
    f.repoPut(peerPath, peerBytes);
  };
  function run(name, mutate, expected, coordinator = true) {
    reset(); mutate?.(); f.save();
    f.runPut('seed.json', {commits: [{sha: f.entry.sha}], fixture_only: true});
    f.runPut('ledger.json', {entries: [f.entry], fixture_only: true, g11_claim: 'not-passed'});
    const env = Object.fromEntries(Object.entries(process.env).filter(([key]) => !key.startsWith('RC_')));
    const invocation = 'synthetic-inherited-table', output = path.join(f.runDir, 'evidence/upstream-audit-disposition', invocation);
    fs.mkdirSync(output, {recursive: true});
    if (coordinator) Object.assign(env, {RC_CHECK_ID: 'upstream-audit-disposition', RC_RUN_ID: f.request.runId,
      RC_INVOCATION_ID: invocation, RC_EVIDENCE_BINDING: JSON.stringify(f.request.binding), RC_ASSERTION_OUTPUT_DIR: output,
      RC_UPSTREAM_PACKED_CONSUMER: JSON.stringify(f.request.packedConsumerExecution ?? null)});
    const reportPath = path.join(f.runDir, name + '.json');
    const child = spawnSync(process.execPath, [path.join(f.root, 'scripts/check-upstream-audit-disposition.mjs'), '--admission', '--line', line,
      '--seed', path.join(f.runDir, 'seed.json'), '--ledger', path.join(f.runDir, 'ledger.json'), '--symbols', path.join(f.root, 'symbols.json'),
      '--current-symbols', path.join(f.root, 'current.json'), '--report', reportPath], {cwd: f.root, env, encoding: 'utf8', timeout: 30000});
    assert.ok([0, 1].includes(child.status), child.stderr + String(child.error || ''));
    const result = JSON.parse(fs.readFileSync(reportPath));
    assert.equal(child.status, expected ? 0 : 1, name + child.stderr + JSON.stringify(result.inherited_execution_evidence));
    assert.equal(result.insufficient_inherited, expected ? 0 : 1); assert.equal(result.g11_claim, 'not-passed');
    if (expected) {
      assert.equal(result.inherited_execution_evidence[0].ok, true);
      const owned = JSON.parse(fs.readFileSync(path.join(output, 'disposition-observations.json')));
      assert.deepEqual(owned.inherited_execution_evidence, result.inherited_execution_evidence);
    }
    observations.push({name, exit_code: child.status, fixture_only: true, actual_subject_execution: false});
  }
  try {
    run('table-complete-registered-contract', null, true);
    run('table-without-coordinator', null, false, false);
    run('table-missing-prerequisite', () => delete f.request.packedConsumerExecution, false);
    run('table-failed-prerequisite', () => f.request.packedConsumerExecution.exit_code = 4, false);
    run('table-stale-invocation', () => f.report.invocation_id = 'other-run', false);
    run('table-passing-slice', () => f.report.coverage = 'slice', false);
    run('table-unrelated-successful-run', () => {
      delete f.observation.cases.find(row => row.case_id === caseId).observation;
      delete f.observation.extra.harness.tableOnPushRendering;
    }, false);
    run('table-rehashed-semantic-regression', () => {
      const value = f.observation.cases.find(row => row.case_id === caseId).observation;
      value.transitions[1].cell_text = 'stale content'; f.observation.extra.harness.tableOnPushRendering = structuredClone(value);
    }, false);
    run('table-renamed-kind', () => f.entry.individual_proof.proof_kind = 'complete-individual-runtime-review', false);
    run('table-wrong-line', () => f.entry.individual_proof.affected_branches = [line === 'main' ? '21.x' : 'main'], false);
    run('table-wrong-installed-digest', () => f.entry.individual_proof.installed_member.sha256 = 'a'.repeat(64), false);
    run('table-dirty-rehashed-wrong-installed-bytes', () => {
      const changed = Buffer.concat([peerBytes, Buffer.from('\n// wrong peer bytes\n')]); f.repoPut(peerPath, changed);
      f.entry.individual_proof.installed_member.sha256 = hash(changed);
      f.entry.individual_proof.artifact_behavior.source_members.find(row => row.path === peerPath).sha256 = hash(changed);
    }, false);
    run('table-restored-complete-contract', null, true);
    run('table-clean-committed-rehashed-wrong-peer', () => {
      const changed = Buffer.concat([peerBytes, Buffer.from('\n// wrong authenticated peer fixture\n')]); f.repoPut(peerPath, changed);
      f.entry.individual_proof.installed_member.sha256 = hash(changed);
      f.entry.individual_proof.artifact_behavior.source_members.find(row => row.path === peerPath).sha256 = hash(changed);
      const inspect = () => validateInheritedExecution({root: f.root, entry: f.entry, proof: f.entry.individual_proof, request: f.request, line});
      assert.match(inspect().detail, /wrong authenticated inherited table member/);
      f.entry.individual_proof.installed_member.sha256 = originals[0].individual_proof.installed_member.sha256;
      assert.match(inspect().detail, /wrong authenticated inherited table bytes/);
      f.entry.individual_proof.installed_member.sha256 = hash(changed);
      // Commit only within the disposable synthetic repository so rejection
      // cannot be attributed to the pre-existing dirty-checkout guard.
      const git = args => execFileSync('git', ['-c', 'gc.auto=0', '-c', 'maintenance.auto=0', ...args], {cwd: f.root, encoding: 'utf8'}).trim();
      git(['add', peerPath]); git(['-c', 'user.name=Validator fixture', '-c', 'user.email=fixture@example.invalid',
        '-c', 'commit.gpgsign=false', 'commit', '-qm', 'Synthetic wrong peer fixture only']);
      const commit = git(['rev-parse', 'HEAD']), tree = git(['rev-parse', 'HEAD^{tree}']);
      Object.assign(f.request.binding, {source_commit: commit, source_tree: tree}); f.report.binding = structuredClone(f.request.binding);
      Object.assign(f.run.source, {commit, git_tree_sha: tree}); Object.assign(f.run.execution_inputs, {commit, tree});
      const reportPath = path.join(f.runDir, 'reports/dependency-eligibility.json');
      const dep = JSON.parse(fs.readFileSync(reportPath)); dep.binding = structuredClone(f.request.binding);
      const output = dep.outputs[0], data = JSON.parse(fs.readFileSync(path.join(f.runDir, output.path)));
      data.binding = structuredClone(f.request.binding); f.runPut(output.path, data);
      const bytes = fs.readFileSync(path.join(f.runDir, output.path)); Object.assign(output, {sha256: hash(bytes), bytes: bytes.length});
      f.runPut('reports/dependency-eligibility.json', dep);
    }, false);
    const last = JSON.parse(fs.readFileSync(path.join(f.runDir, 'table-clean-committed-rehashed-wrong-peer.json')));
    assert.equal(last.artifact_behavior_evidence[0].ok, true, JSON.stringify(last.artifact_behavior_evidence));
    assert.match(last.inherited_execution_evidence[0].detail, /wrong authenticated inherited table member/);
    observations.at(-1).helper_controls = 2;
  } finally {f.dispose();}
}
// Exercise every other registered inherited validator on current sources. The
// original bidi program remains tied to its older immutable source frame.
if (!process.argv.includes('--baseline')) {
  const ledger = JSON.parse(fs.readFileSync(path.join(root, 'compatibility/f10/disposition-ledger/ledger.json')));
  for (const [sha, field, sample, harness, legacy] of [
    ['9494ff2d65c98726046e6a20dd6a6d938e97a2f6', 'selection_behavior', selectionComparatorPackedSample(), 'selectionComparatorObservation', 'selectionComparatorExposure'],
    ['8c3165582fcc1e307f8ddd261f5977c6f2f8b0fc', 'bidi_behavior', isolatedBidiPackedSample(), 'isolatedLegacyBidi', 'legacyBidiScope'],
    ['25f391a3c545a1b829a74584c4f9235ab8d18497', 'bidi_behavior', isolatedBidiPackedSample(), 'isolatedLegacyBidi', 'legacyBidiScope'],
  ]) {
    const entry = structuredClone(ledger.entries.find(row => row.sha === sha));
    const review = JSON.parse(fs.readFileSync(path.join(root, entry.evidence_report)));
    entry.individual_proof.artifact_behavior = {source_members: entry.individual_proof[field].source_members};
    const f = createFixture(root, {entry, review}); delete f.entry.individual_proof.artifact_behavior;
    const selected = f.observation.cases.find(row => row.case_id === entry.individual_proof.reachable_behavior.id);
    selected.observation = sample; selected.legacy_harness_passed = true;
    f.observation.extra.harness[harness] = structuredClone(sample); f.observation.extra.harness[legacy] = true; f.save();
    const check = () => validateInheritedExecution({root: f.root, entry: f.entry, proof: f.entry.individual_proof, request: f.request, line});
    try {
      assert.equal(check().ok, true, JSON.stringify(check()));
      f.observation.extra.harness[legacy] = false; f.save(); assert.equal(check().ok, false);
      f.observation.extra.harness[legacy] = true; f.save();
      const installed = f.entry.individual_proof.installed_member; installed.sha256 = 'f'.repeat(64); assert.equal(check().ok, false);
      observations.push({name: 'registered-' + sha, helper_controls: 3, fixture_only: true, actual_subject_execution: false});
    } finally {f.dispose();}
  }
}
const report = {line, observations, baseline_only: process.argv.includes('--baseline'), actual_product_or_runtime_qualified: false};
const out = process.argv.indexOf('--out'); if (out >= 0) fs.writeFileSync(process.argv[out + 1], JSON.stringify(report, null, 2) + '\n', {flag: 'wx'});
console.log(JSON.stringify(report));
