/**
 * @license
 * Copyright Google LLC All Rights Reserved.
 * Copyright (c) 2026 Ryan Lester.
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.io/license
 */
/** Synthetic input for the real validators/writer/CLI. No product execution. */
import assert from 'node:assert/strict';
import * as fs from 'node:fs';
import path from 'node:path';
import {createRequire} from 'node:module';
import {fileURLToPath} from 'node:url';
import {execFileSync, spawnSync} from 'node:child_process';
import {deriveHistoricalRoster, rejectionReasons, discoveryNegativeResults, isRunnerControl} from '../../scripts/historical-case-roster.mjs';
import {HISTORICAL_BEHAVIOR_KIND, HISTORICAL_BEHAVIOR_SHAS, historicalBehaviorRequirements,
  requiresHistoricalBehavior, validateHistoricalBehavior} from '../../scripts/upstream-historical-behavior-evidence.mjs';
import {createFixture, hash} from './artifact-behavior-fixture.mjs';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
const read = p => fs.readFileSync(path.join(root, p));
const ts = createRequire(import.meta.url)('typescript');
const prefix = 'compatibility/rc/historical-behavior-admission-';
const inputsRaw = read(prefix + 'inputs.json'), inputs = JSON.parse(inputsRaw), line = inputs.line;
assert.equal(hash(inputsRaw), {main: '17f878944ba26cdfc7cf300ef3ec697d69fdb6fc90ab82d67f389d59e926f1a9',
  '21.x': '739e6f88038d84840f2d6892c7b25657ed7f242662d8c969a591a9176ca1f9ca'}[line]);
assert.match(inputs.source_parent, /^[0-9a-f]{40}$/);
const git = args => execFileSync('git', ['-c', 'gc.auto=0', '-c', 'maintenance.auto=0', ...args], {cwd: root, encoding: 'utf8', maxBuffer: 8 * 1024 * 1024});
const before = p => git(['show', inputs.source_parent + ':' + p]);
for (const member of inputs.preceding_members) assert.equal(hash(before(member.path)), member.sha256);
const historicalImport = "import {requiresHistoricalBehavior,validateHistoricalBehavior} from './upstream-historical-behavior-evidence.mjs';\n";
const historicalGuard = '  if (requiresHistoricalBehavior(entry, proof)) {\n    const result = validateHistoricalBehavior({root, entry, proof, request});\n    artifactBehaviorResults.set(entry.sha, result);\n    if (!result.ok) return false;\n  }\n';
const historicalEnvironment = "  let historicalExecution;\n  if (process.env.RC_UPSTREAM_HISTORICAL !== undefined) {\n    try { historicalExecution = JSON.parse(process.env.RC_UPSTREAM_HISTORICAL); }\n    catch { return {error: 'RC_UPSTREAM_HISTORICAL is not JSON'}; }\n  }\n";
const historicalCapture = "        env['RC_UPSTREAM_HISTORICAL'] = json.dumps({\n            'run_id': ACTIVE_RUN.manifest['run_id'],\n            'invocation_id': ACTIVE_RUN.invocations.get('historical-legacy-artifact'),\n            'exit_code': ACTIVE_RUN.exit_codes.get('historical-legacy-artifact'),\n        }, sort_keys=True)\n";
const removeOnce = (text, part) => { assert.equal(text.split(part).length, 2); return text.replace(part, ''); };
let checker = read('scripts/check-upstream-audit-disposition.mjs').toString();
for (const added of [historicalImport, historicalGuard, historicalEnvironment]) checker = removeOnce(checker, added);
assert.equal(checker.split('packedConsumerExecution, historicalExecution};').length, 2);
assert.equal(checker.replace('packedConsumerExecution, historicalExecution};', 'packedConsumerExecution};'), before('scripts/check-upstream-audit-disposition.mjs'));
assert.equal(removeOnce(read('scripts/rc-verify.py').toString(), historicalCapture), before('scripts/rc-verify.py'));
for (const member of inputs.preceding_members.filter(row => !['scripts/check-upstream-audit-disposition.mjs', 'scripts/rc-verify.py'].includes(row.path))) {
  assert.equal(hash(read(member.path)), member.sha256, 'prior validator/writer/fixture changed');
}
const roster = deriveHistoricalRoster(root);
assert.equal(roster.ids.length + roster.discovery_negative_ids.length, 2225);
let namedCases = 0;
for (const sha of HISTORICAL_BEHAVIOR_SHAS) {
  const definition = historicalBehaviorRequirements(sha), original = inputs.original_patches.find(row => row.sha === sha);
  assert.equal(hash(read(original.path)), definition.patch);
  for (const expected of definition.cases) {
    const actual = roster.cases.find(row => row.case_id === expected.case_id);
    for (const [key, value] of Object.entries(expected)) assert.equal(actual?.[key], value);
    namedCases++;
  }
  assert.ok(requiresHistoricalBehavior({sha}, {}));
  definition.cases.length = 0;
  assert.ok(historicalBehaviorRequirements(sha).cases.length > 0, 'requirements escaped ownership');
}
assert.equal(namedCases, 7);
assert.ok(requiresHistoricalBehavior({}, {historical_behavior: null}));
assert.ok(requiresHistoricalBehavior({}, {proof_kind: HISTORICAL_BEHAVIOR_KIND}));
assert.equal(requiresHistoricalBehavior({}, {proof_kind: 'ordinary-review'}), false);
const producer = read('scripts/rc-test-legacy-family.mjs').toString();
const sf = ts.createSourceFile('writer.mjs', producer, ts.ScriptTarget.Latest, true);
const writerBody = sf.statements.find(node => ts.isFunctionDeclaration(node) && node.name?.text === 'writeAcceptance').getText(sf);
const observations = [];
let helperCases = 0, cliCases = 0;
for (const [subjectIndex, sha] of HISTORICAL_BEHAVIOR_SHAS.entries()) {
  const definition = historicalBehaviorRequirements(sha);
  const members = definition.members.map(p => ({path: p, sha256: hash(read(p))}));
  const patch = inputs.original_patches.find(row => row.sha === sha);
  const reviewPath = 'compatibility/rc/synthetic-historical-source-review.json';
  const note = 'Synthetic admission fixture only; no actual source judgment, product behavior, native artifact, floor or release gate is qualified.';
  // The existing fixture copies these members before deriving its authored-use
  // census. Its temporary artifact_behavior field is removed before validation.
  const f = createFixture(root, {review: {sha, status: 'reviewed', final_disposition: 'already-adapted',
    patch_file: patch.path, diff_sha256: definition.patch, fixture_only: true},
    entry: {sha, subject: 'Synthetic historical behavior admission subject', bucket: 'behavior-semantic',
      final_disposition: 'already-adapted', evidence_report: reviewPath, fixture_only: true,
      individual_proof: {proof_kind: HISTORICAL_BEHAVIOR_KIND, diff_sha256: definition.patch,
        review_depth: 'individual-compatibility', affected_branches: [line], decision: note,
        artifact_behavior: {source_members: members}}}});
  delete f.proof.artifact_behavior;
  f.proof.historical_behavior = {kind: definition.kind, case_ids: definition.cases.map(row => row.case_id), source_members: members};
  f.request.historicalExecution = {run_id: f.run.run_id, invocation_id: 'synthetic-historical', exit_code: 0};
  const relative = 'evidence/historical-legacy-artifact/synthetic-historical/historical-observations.json';
  const outputDir = path.join(f.runDir, 'evidence/historical-legacy-artifact/synthetic-historical');
  fs.mkdirSync(outputDir, {recursive: true});
  const writer = new Function('fs', 'path', 'root', 'runPath', 'rejectionReasons', 'discoveryNegativeResults', 'isRunnerControl', 'cryptoSha', 'console',
    writerBody + ';return writeAcceptance;')(fs, path, f.root, path.join(f.runDir, 'run.json'), rejectionReasons, discoveryNegativeResults, isRunnerControl, hash, {log() {}, error() {}});
  assert.equal(writer({...f.request, invocation: 'synthetic-historical', outputDir}, roster, {
    subject_mode: 'artifact', artifact_sha256: f.library.sha256,
    totals: {executed: roster.cases.filter(row => row.kind !== 'shared-export').length},
    mapped_specs: roster.paths.map(historical_path => ({historical_path})),
    specs: roster.cases.filter(row => row.kind !== 'shared-export').map(row => ({full_name: row.full_name, success: true, skipped: false})),
  }, f.library), true);
  const report = JSON.parse(fs.readFileSync(path.join(f.runDir, 'reports/historical-legacy-artifact.json')));
  const native = JSON.parse(fs.readFileSync(path.join(f.runDir, relative)));
  const targets = [f.entry, f.request, f.run, f.report, f.observation, report, native], originals = targets.map(value => structuredClone(value));
  function save() {
    f.save(); f.runPut(relative, native);
    const bytes = fs.readFileSync(path.join(f.runDir, relative)); report.outputs = [{path: relative, sha256: hash(bytes), bytes: bytes.length}];
    f.runPut('reports/historical-legacy-artifact.json', report);
  }
  function reset() {
    for (const [i, target] of targets.entries()) {
      for (const key of Object.keys(target)) delete target[key];
      Object.assign(target, structuredClone(originals[i]));
    }
    save();
  }
  const check = () => validateHistoricalBehavior({root: f.root, entry: f.entry, proof: f.entry.individual_proof, request: f.request});
  const selected = () => native.cases.find(row => row.case_id === definition.cases[0].case_id);
  function negative(name, mutate, pattern, afterSave = false) {
    reset(); assert.equal(check().ok, true, 'baseline before ' + name);
    mutate(); if (!afterSave) save();
    const result = check(); assert.equal(result.ok, false, name); if (pattern) assert.match(result.detail, pattern, name);
    observations.push({sha, name, detail: result.detail, fixture_only: true}); helperCases++;
  }
  try {
    reset(); assert.equal(check().ok, true); helperCases++;
    negative('renamed-kind', () => f.entry.individual_proof.proof_kind = 'source-completed', /unregistered/);
    negative('wrong-patch', () => f.entry.individual_proof.diff_sha256 = '0'.repeat(64), /unregistered/);
    negative('wrong-selected-test', () => selected().full_name = 'unrelated passing test', /test identity/);
    negative('wrong-executed-name', () => selected().executed_full_name = 'unrelated passing test', /test identity/);
    negative('wrong-candidate', () => selected().candidate = 'projects/unrelated.spec.ts', /test identity/);
    negative('wrong-historical-path', () => selected().historical_path = 'src/unrelated.spec.ts', /test identity/);
    negative('failed-native', () => f.request.historicalExecution.exit_code = 9, /coordinator-observed historical/);
    negative('no-native', () => delete f.request.historicalExecution, /coordinator-observed historical/);
    if (subjectIndex === 0) {
      negative('unknown-subject', () => f.entry.sha = '0'.repeat(40), /unregistered/);
      negative('invalid-scope', () => f.entry.individual_proof.historical_behavior = null, /scope/);
      negative('foreign-scope', () => f.entry.individual_proof.historical_behavior.kind = 'tab-link-enter-activation', /scope/);
      negative('omitted-required-case', () => f.entry.individual_proof.historical_behavior.case_ids.pop(), /scope/);
      negative('broadened-required-case', () => f.entry.individual_proof.historical_behavior.case_ids.push('unrelated'), /scope/);
      negative('omitted-reviewed-source', () => f.entry.individual_proof.historical_behavior.source_members.pop(), /source scope/);
      negative('duplicate-reviewed-source', () => {const rows = f.entry.individual_proof.historical_behavior.source_members; rows[0] = rows[1];}, /source scope/);
      negative('stale-reviewed-source', () => f.entry.individual_proof.historical_behavior.source_members[0].sha256 = '0'.repeat(64), /stale historical source/);
      negative('failed-packed', () => f.request.packedConsumerExecution.exit_code = 8, /coordinator-observed packed/);
      negative('incomplete-packed', () => f.report.passed_case_ids.pop(), /incomplete/);
      negative('foreign-native-run', () => f.request.historicalExecution.run_id = 'previous', /coordinator-observed historical/);
      negative('invalid-native-invocation', () => f.request.historicalExecution.invocation_id = '../foreign', /coordinator-observed historical/);
      for (const [field, value] of [['schema_version', 2], ['template', true], ['line', 'wrong-line'], ['check_id', 'packed-consumer'],
        ['run_id', 'previous'], ['invocation_id', 'previous']]) negative('report-' + field, () => report[field] = value, /report subject/);
      negative('report-binding', () => report.binding.source_tree = '0'.repeat(40), /report subject/);
      for (const [field, value] of [['result', 'fail'], ['coverage', 'slice'], ['exit_code', 7], ['subject_kind', 'source'],
        ['subject_ids', ['source']]]) negative('report-' + field, () => report[field] = value, /historical result/);
      negative('report-library', () => report.artifacts.library.sha256 = '0'.repeat(64), /historical result/);
      for (const field of ['expected_case_ids', 'discovered_case_ids', 'executed_case_ids', 'passed_case_ids']) {
        negative('missing-' + field, () => report[field].pop(), /incomplete/);
        negative('duplicate-' + field, () => report[field][0] = report[field][1], /incomplete/);
      }
      for (const field of ['passed', 'failed', 'skipped']) negative('count-' + field, () => report[field]++, /counts/);
      for (const field of ['failed_case_ids', 'skipped_case_ids', 'unresolved_case_ids', 'exceptions']) {
        negative('unresolved-' + field, () => report[field].push('unresolved'), /unresolved/);
      }
      negative('missing-assertion', () => report.case_results.pop(), /report assertions/);
      negative('borrowed-assertion', () => report.case_results[0].output_paths = ['evidence/foreign.json'], /report assertions/);
      negative('failed-assertion', () => report.case_results[0].result = 'fail', /report assertions/);
      negative('marker-assertion', () => report.case_results[0].kind = 'marker', /report assertions/);
      for (const field of ['run_id', 'invocation_id', 'check_id', 'kind', 'library_sha256']) {
        negative('observation-' + field, () => native[field] = 'foreign', /assertion subject/);
      }
      negative('missing-observed-case', () => native.cases.pop(), /observed cases/);
      negative('duplicate-observed-case', () => native.cases[0] = native.cases[1], /observed cases/);
      negative('failed-observed-case', () => native.cases[0].result = 'fail', /observed cases/);
      negative('discovery-rejection', () => native.rejection_reasons.push('missing-path'), /observed cases/);
      negative('tampered-output', () => f.runPut(relative, '{}'), /bytes\/hash/, true);
      for (const mutate of [() => report.outputs.push(report.outputs[0]), () => report.outputs[0].path = 'evidence/foreign.json',
        () => report.outputs[0].sha256 = '0'.repeat(64)]) negative('output-ownership-or-hash', () => {mutate(); f.runPut('reports/historical-legacy-artifact.json', report);}, /ownership|bytes\/hash/, true);
      reset();
      const target = path.join(f.runDir, relative); fs.renameSync(target, target + '.saved'); fs.symlinkSync(target + '.saved', target);
      assert.match(check().detail, /symlink/); helperCases++;
      fs.unlinkSync(target); fs.renameSync(target + '.saved', target);
    }
    const invocation = 'synthetic-upstream', outputDir = path.join(f.runDir, 'evidence/upstream-audit-disposition', invocation);
    fs.mkdirSync(outputDir, {recursive: true});
    const environment = {...process.env};
    for (const key of Object.keys(environment).filter(key => key.startsWith('RC_'))) delete environment[key];
    function cli(name, mutate, expected) {
      reset(); mutate?.(); save();
      f.runPut('seed.json', {commits: [{sha}], fixture_only: true});
      f.runPut('ledger.json', {g11_claim: 'not-passed', entries: [f.entry], fixture_only: true});
      const reportPath = path.join(f.runDir, 'cli-' + name + '.json');
      const env = {...environment, RC_CHECK_ID: 'upstream-audit-disposition', RC_RUN_ID: f.request.runId,
        RC_INVOCATION_ID: invocation, RC_EVIDENCE_BINDING: JSON.stringify(f.request.binding), RC_ASSERTION_OUTPUT_DIR: outputDir,
        RC_UPSTREAM_PACKED_CONSUMER: JSON.stringify(f.request.packedConsumerExecution),
        RC_UPSTREAM_HISTORICAL: JSON.stringify(f.request.historicalExecution ?? null)};
      const child = spawnSync(process.execPath, [path.join(f.root, 'scripts/check-upstream-audit-disposition.mjs'), '--admission', '--line', line,
        '--seed', path.join(f.runDir, 'seed.json'), '--ledger', path.join(f.runDir, 'ledger.json'), '--symbols', path.join(f.root, 'symbols.json'),
        '--current-symbols', path.join(f.root, 'current.json'), '--report', reportPath], {cwd: f.root, env, encoding: 'utf8', timeout: 30000});
      assert.ok([0, 1].includes(child.status), name + ': ' + child.stderr + String(child.error || ''));
      const result = JSON.parse(fs.readFileSync(reportPath));
      assert.equal(child.status === 0, expected, name + ': ' + child.stderr + JSON.stringify(result.artifact_behavior_evidence));
      assert.equal(result.disposition_admission, expected ? 'pass' : 'incomplete');
      assert.equal(result.g11_claim, 'not-passed'); assert.equal(result.authored_use_inventory.expected, 1736);
      assert.equal(result.authored_use_review_evidence.insufficient, 0); assert.equal(result.current_authored_use_inventory.ready, true);
      if (expected) {
        const assertion = JSON.parse(fs.readFileSync(path.join(outputDir, 'disposition-observations.json')));
        assert.deepEqual(assertion.artifact_behavior_evidence, result.artifact_behavior_evidence);
        assert.equal(assertion.artifact_behavior_evidence[0].invocation_id, 'synthetic-historical');
      }
      cliCases++; observations.push({sha, name, actual_cli: true, exit_code: child.status, fixture_only: true});
    }
    cli('complete', null, true);
    cli('failed-native', () => f.request.historicalExecution.exit_code = 9, false);
    cli('partial-native', () => report.coverage = 'slice', false);
    cli('renamed-kind-cannot-bypass', () => f.entry.individual_proof.proof_kind = 'ordinary-review', false);
    if (subjectIndex === 0) {
      // A consistently rehashed, clean synthetic source/matrix cannot replace
      // the complete native roster with only this subject's few passing tests.
      reset();
      const ids = definition.cases.map(row => row.case_id), matrixPath = 'compatibility/rc/matrices/full-verify.json';
      const matrix = JSON.parse(fs.readFileSync(path.join(f.root, matrixPath)));
      matrix.checks.find(row => row.check_id === 'historical-legacy-artifact').acceptance.cases_by_line[line] = {slice: ids};
      f.repoPut(matrixPath, matrix);
      const fixtureGit = args => execFileSync('git', ['-c', 'gc.auto=0', '-c', 'maintenance.auto=0', ...args], {cwd: f.root, encoding: 'utf8'}).trim();
      fixtureGit(['add', matrixPath]);
      fixtureGit(['-c', 'user.name=Validator fixture', '-c', 'user.email=fixture@example.invalid', '-c', 'commit.gpgsign=false', 'commit', '-qm', 'Synthetic incomplete native matrix control']);
      const commit = fixtureGit(['rev-parse', 'HEAD']), tree = fixtureGit(['rev-parse', 'HEAD^{tree}']);
      Object.assign(f.request.binding, {source_commit: commit, source_tree: tree, matrix_sha256: hash(fs.readFileSync(path.join(f.root, matrixPath)))});
      Object.assign(f.run.source, {commit, git_tree_sha: tree}); Object.assign(f.run.execution_inputs, {commit, tree});
      f.report.binding = structuredClone(f.request.binding); report.binding = structuredClone(f.request.binding);
      f.entry.individual_proof.historical_behavior.source_members.find(row => row.path === matrixPath).sha256 = f.request.binding.matrix_sha256;
      for (const key of ['expected_case_ids', 'discovered_case_ids', 'executed_case_ids', 'passed_case_ids']) report[key] = [...ids];
      report.case_results = report.case_results.filter(row => ids.includes(row.case_id)); report.passed = ids.length;
      native.cases = native.cases.filter(row => ids.includes(row.case_id)); save();
      assert.match(check().detail, /full historical matrix roster/); helperCases++;
      observations.push({sha, name: 'self-consistent-rehashed-matrix-slice', rejected: true, fixture_only: true});
    }
  } finally { f.dispose(); }
}
const output = {schema_version: 1, line, role: 'Finite same-run historical artifact admission with genuine current source/writer/CLI and synthetic runtime only',
  source_preservation_controls: inputs.preceding_members.length, subjects: 3, exact_named_cases: namedCases,
  full_historical_roster: 2225, helper_controls: helperCases, actual_CLI_controls: cliCases,
  preceding_packed_validators_path_hash_primitives_writer_and_fixture_unchanged: true,
  actual_native_browser_library_or_floor_execution: false, real_ledger_or_source_judgments_changed: false, g11_claim: 'not-passed',
  input_capsule_sha256: hash(inputsRaw), observations,
  source_members: ['scripts/upstream-historical-behavior-evidence.mjs', 'scripts/check-upstream-audit-disposition.mjs', 'scripts/rc-verify.py',
    'tests/upstream/historical-behavior-admission.mjs'].map(p => ({path: p, sha256: hash(read(p))}))};
if (process.argv[2]) fs.writeFileSync(process.argv[2], JSON.stringify(output, null, 2) + '\n', {flag: 'wx'});
console.log(JSON.stringify({...output, observations: undefined, source_members: undefined}));
