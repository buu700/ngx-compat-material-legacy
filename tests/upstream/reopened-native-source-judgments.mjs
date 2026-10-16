/**
 * @license
 * Copyright Google LLC All Rights Reserved.
 * Copyright (c) 2026 Ryan Lester.
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.io/license
 */
/** Current real source judgments; all runtime input below is synthetic. */
import assert from 'node:assert/strict';
import * as fs from 'node:fs';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {createRequire} from 'node:module';
import {gunzipSync} from 'node:zlib';
import {execFileSync, spawnSync} from 'node:child_process';
import {deriveHistoricalRoster, rejectionReasons, discoveryNegativeResults, isRunnerControl} from '../../scripts/historical-case-roster.mjs';
import {historicalBehaviorRequirements} from '../../scripts/upstream-historical-behavior-evidence.mjs';
import {createFixture, hash} from './artifact-behavior-fixture.mjs';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
const read = p => fs.readFileSync(path.join(root, p)), json = p => JSON.parse(read(p));
const prefix = 'compatibility/rc/reopened-native-behavior-', inputBytes = read(prefix + 'inputs.json'), inputs = JSON.parse(inputBytes);
assert.equal(hash(inputBytes), {main: '3d5250e048e374fb62c6b44c5f49fb2110d1187d8930c5c08781ccca18a727b6',
  '21.x': '39e920d50807e546eb2c8a693409748ca997018d07296f2edafeed1f74e8473b'}[inputs.line]);
for (const row of [...inputs.source_members, ...inputs.preceding_review_members, inputs.preceding_native_controls]) assert.equal(hash(read(row.path)), row.sha256);
const proofSummary = json(prefix + 'source-proof.json'), ledgerPath = 'compatibility/f10/disposition-ledger/ledger.json';
let recovered = read(ledgerPath).toString();
const ledger = json(ledgerPath), rows = [], roster = deriveHistoricalRoster(root);
const block = value => JSON.stringify(value, null, 2).split('\n').map(line => '    ' + line).join('\n');
let hunkCount = 0;
for (const decision of proofSummary.decisions) {
  const entry = ledger.entries.find(row => row.sha === decision.sha), review = json(entry.evidence_report), requirements = historicalBehaviorRequirements(entry.sha);
  assert.equal(entry.evidence_report, decision.review); assert.equal(hash(read(entry.evidence_report)), decision.review_sha256);
  assert.equal(review.status, 'reviewed'); assert.equal(review.source_conclusion_only, true);
  assert.equal(review.actual_native_or_packed_or_floor_qualified, false);
  assert.deepEqual(review.individual_proof, entry.individual_proof);
  assert.deepEqual(entry.individual_proof.affected_branches, [inputs.line]);
  assert.deepEqual(requirements, inputs.current_native_requirements.find(row => row.sha === entry.sha) &&
    Object.fromEntries(Object.entries(inputs.current_native_requirements.find(row => row.sha === entry.sha)).filter(([key]) => key !== 'sha')));
  assert.deepEqual(review.required_native_cases, requirements.cases);
  for (const expected of requirements.cases) {
    const actual = roster.cases.find(row => row.case_id === expected.case_id);
    for (const [key, value] of Object.entries(expected)) assert.equal(actual?.[key], value);
  }
  for (const member of entry.individual_proof.historical_behavior.source_members) assert.equal(hash(read(member.path)), member.sha256);
  for (const member of review.independent_evidence) assert.equal(hash(read(member.path)), member.sha256);
  const patch = read(review.patch_file); assert.equal(hash(patch), requirements.patch);
  const hunks = [];
  for (const section of patch.toString().split(/(?=^diff --git )/m).filter(Boolean)) {
    const file = section.split('\n')[0].split(' b/')[1];
    const starts = [...section.matchAll(/^@@[^\n]*\n/gm)].map(match => match.index);
    for (const [i, start] of starts.entries()) {
      const text = section.slice(start, starts[i + 1] ?? section.length);
      hunks.push({path: file, header: text.split('\n')[0], hunk_sha256: hash(text)});
    }
  }
  assert.deepEqual(review.hunk_reviews.map(({path, header, hunk_sha256}) => ({path, header, hunk_sha256})), hunks);
  assert.equal(hunks.length, review.original_hunks); assert.equal(new Set(hunks.map(row => row.path)).size, review.original_files);
  assert.ok(review.hunk_reviews.every(row => row.judgment.length > 80)); hunkCount += hunks.length;
  const old = inputs.preceding_entries.find(row => row.sha === entry.sha);
  assert.deepEqual(review.prior_entry, old);
  assert.equal(recovered.split(block(entry)).length, 2); recovered = recovered.replace(block(entry), block(old));
  rows.push({entry, review});
}
assert.equal(hash(recovered), inputs.ledger_before_sha256, 'an unrelated ledger byte changed');
const diagnostics = JSON.parse(gunzipSync(read(prefix + 'diagnostics.json.gz'))).reports;
assert.equal(hash(read(diagnostics.autocomplete.candidate_source.path)), diagnostics.autocomplete.candidate_source.sha256);
assert.equal(hash(read(diagnostics.tab_link.source.path)), diagnostics.tab_link.source.sha256);
assert.equal(diagnostics.autocomplete.native_executed, false); assert.equal(diagnostics.tab_link.native_executed, false);
assert.equal(diagnostics.motion.failures.length, 0); assert.equal(diagnostics.public_select.failures.length, 0);

const ts = createRequire(import.meta.url)('typescript'), source = read('scripts/rc-test-legacy-family.mjs').toString();
const file = ts.createSourceFile('writer.mjs', source, ts.ScriptTarget.Latest, true);
const body = file.statements.find(node => ts.isFunctionDeclaration(node) && node.name?.text === 'writeAcceptance').getText(file);
const observations = [];
for (const {entry, review} of rows) {
  const fixtureEntry = structuredClone(entry);
  fixtureEntry.individual_proof.artifact_behavior = {source_members: entry.individual_proof.historical_behavior.source_members};
  const f = createFixture(root, {entry: fixtureEntry, review});
  delete f.entry.individual_proof.artifact_behavior;
  assert.deepEqual(f.entry, entry, 'synthetic adapter changed the real individual judgment');
  const relative = 'evidence/historical-legacy-artifact/synthetic-historical/historical-observations.json';
  const outputDir = path.dirname(path.join(f.runDir, relative)); fs.mkdirSync(outputDir, {recursive: true});
  f.request.historicalExecution = {run_id: f.run.run_id, invocation_id: 'synthetic-historical', exit_code: 0};
  const writer = new Function('fs', 'path', 'root', 'runPath', 'rejectionReasons', 'discoveryNegativeResults', 'isRunnerControl', 'cryptoSha', 'console',
    body + ';return writeAcceptance;')(fs, path, f.root, path.join(f.runDir, 'run.json'), rejectionReasons, discoveryNegativeResults, isRunnerControl, hash, {log() {}, error() {}});
  assert.equal(writer({...f.request, invocation: 'synthetic-historical', outputDir}, roster, {
    subject_mode: 'artifact', artifact_sha256: f.library.sha256, totals: {executed: roster.cases.filter(row => row.kind !== 'shared-export').length},
    mapped_specs: roster.paths.map(historical_path => ({historical_path})),
    specs: roster.cases.filter(row => row.kind !== 'shared-export').map(row => ({full_name: row.full_name, success: true, skipped: false})),
  }, f.library), true);
  const native = JSON.parse(fs.readFileSync(path.join(f.runDir, relative))), report = JSON.parse(fs.readFileSync(path.join(f.runDir, 'reports/historical-legacy-artifact.json')));
  const originals = [entry, review, f.request, native, report].map(value => structuredClone(value));
  const invocation = 'synthetic-upstream', upstreamDir = path.join(f.runDir, 'evidence/upstream-audit-disposition', invocation);
  fs.mkdirSync(upstreamDir, {recursive: true});
  const environment = {...process.env};
  for (const key of Object.keys(environment).filter(key => key.startsWith('RC_'))) delete environment[key];
  try {
    function run(name, mutate, expected) {
      const [activeEntry, activeReview, request, activeNative, activeReport] = structuredClone(originals);
      mutate?.({entry: activeEntry, review: activeReview, request, native: activeNative, report: activeReport});
      f.repoPut(activeEntry.evidence_report, activeReview);
      // Review mutations are deliberate fixture inputs. Commit their exact bytes
      // and update the synthetic run source identities so only the intended
      // metadata defect, rather than a dirty/stale checkout, causes rejection.
      const git = args => execFileSync('git', ['-c', 'gc.auto=0', '-c', 'maintenance.auto=0', ...args], {cwd: f.root, encoding: 'utf8'}).trim();
      if (git(['status', '--porcelain']).length) {
        git(['add', activeEntry.evidence_report]);
        git(['-c', 'user.name=Validator fixture', '-c', 'user.email=fixture@example.invalid', '-c', 'commit.gpgsign=false', 'commit', '-qm', 'Synthetic source-review metadata control']);
      }
      const commit = git(['rev-parse', 'HEAD']), tree = git(['rev-parse', 'HEAD^{tree}']);
      Object.assign(request.binding, {source_commit: commit, source_tree: tree});
      Object.assign(f.run.source, {commit, git_tree_sha: tree}); Object.assign(f.run.execution_inputs, {commit, tree});
      f.report.binding = structuredClone(request.binding); f.save(); activeReport.binding = structuredClone(request.binding);
      const advisoryPath = 'reports/dependency-eligibility.json';
      const advisory = JSON.parse(fs.readFileSync(path.join(f.runDir, advisoryPath))), advisoryOutput = advisory.outputs[0];
      const advisoryObservation = JSON.parse(fs.readFileSync(path.join(f.runDir, advisoryOutput.path)));
      advisory.binding = structuredClone(request.binding); advisoryObservation.binding = structuredClone(request.binding);
      f.runPut(advisoryOutput.path, advisoryObservation);
      const advisoryBytes = fs.readFileSync(path.join(f.runDir, advisoryOutput.path));
      advisoryOutput.sha256 = hash(advisoryBytes); advisoryOutput.bytes = advisoryBytes.length; f.runPut(advisoryPath, advisory);
      f.runPut(relative, activeNative); const bytes = fs.readFileSync(path.join(f.runDir, relative));
      activeReport.outputs = [{path: relative, sha256: hash(bytes), bytes: bytes.length}];
      f.runPut('reports/historical-legacy-artifact.json', activeReport);
      f.runPut('seed.json', {commits: [{sha: entry.sha}], fixture_only: true});
      f.runPut('ledger.json', {g11_claim: 'not-passed', entries: [activeEntry], fixture_only: true});
      const out = path.join(f.runDir, 'actual-source-cli-' + name + '.json');
      const child = spawnSync(process.execPath, [path.join(f.root, 'scripts/check-upstream-audit-disposition.mjs'), '--admission', '--line', inputs.line,
        '--seed', path.join(f.runDir, 'seed.json'), '--ledger', path.join(f.runDir, 'ledger.json'), '--symbols', path.join(f.root, 'symbols.json'),
        '--current-symbols', path.join(f.root, 'current.json'), '--report', out], {cwd: f.root, encoding: 'utf8', timeout: 30000,
        env: {...environment, RC_CHECK_ID: 'upstream-audit-disposition', RC_RUN_ID: request.runId, RC_INVOCATION_ID: invocation,
          RC_EVIDENCE_BINDING: JSON.stringify(request.binding), RC_ASSERTION_OUTPUT_DIR: upstreamDir,
          RC_UPSTREAM_PACKED_CONSUMER: JSON.stringify(request.packedConsumerExecution), RC_UPSTREAM_HISTORICAL: JSON.stringify(request.historicalExecution)}});
      assert.ok([0, 1].includes(child.status), child.stderr + String(child.error || ''));
      const result = JSON.parse(fs.readFileSync(out));
      assert.equal(child.status === 0, expected, entry.sha + '/' + name + ': ' + child.stderr + JSON.stringify(result.artifact_behavior_evidence));
      assert.equal(result.g11_claim, 'not-passed'); assert.equal(result.authored_use_inventory.expected, 1736);
      assert.equal(result.insufficient_behavior, expected ? 0 : 1, 'wrong individual admission failure');
      assert.equal(result.authored_use_review_evidence.insufficient, 0); assert.equal(result.current_authored_use_inventory.ready, true);
      observations.push({sha: entry.sha, name, exit_code: child.status, fixture_only: true});
    }
    run('complete-real-source-judgment', null, true);
    run('missing-native', ({request}) => request.historicalExecution = null, false);
    run('rehashed-wrong-test', ({native}) => native.cases.find(row => row.case_id === entry.individual_proof.historical_behavior.case_ids[0]).executed_full_name = 'unrelated', false);
    run('renamed-kind', ({entry}) => entry.individual_proof.proof_kind = 'ordinary-source-review', false);
    run('omitted-source', ({entry}) => entry.individual_proof.historical_behavior.source_members.pop(), false);
    run('unfinished-source-review', ({review}) => review.status = 'pending', false);
  } finally { f.dispose(); }
}
const output = {schema_version: 1, line: inputs.line, source_judgments: rows.length, whole_original_hunks_reviewed: hunkCount,
  exact_preceding_ledger_recovered: true, actual_CLI_controls: observations.length, actual_browser_native_packed_or_floor_qualified: false,
  real_runtime_or_authored_use_closures: 0, g11_claim: 'not-passed', input_capsule_sha256: hash(inputBytes), observations,
  producer_sha256: hash(read('tests/upstream/reopened-native-source-judgments.mjs'))};
if (process.argv[2]) fs.writeFileSync(process.argv[2], JSON.stringify(output, null, 2) + '\n', {flag: 'wx'});
console.log(JSON.stringify({...output, observations: undefined}));
