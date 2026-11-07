/**
 * @license
 * Copyright Google LLC All Rights Reserved.
 * Copyright (c) 2026 Ryan Lester.
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.io/license
 */
// Synthetic validator and writer inputs; this is not a browser or artifact run.
import assert from 'node:assert/strict';
import * as fs from 'node:fs';
import path from 'node:path';
import {createRequire} from 'node:module';
import {fileURLToPath} from 'node:url';
import {deriveHistoricalRoster, rejectionReasons, discoveryNegativeResults, isRunnerControl} from '../../scripts/historical-case-roster.mjs';
import {HISTORICAL_BEHAVIOR_KIND, HISTORICAL_BEHAVIOR_SHAS, historicalBehaviorRequirements,
  historicalRegressionRequirements, validateHistoricalBehavior} from '../../scripts/upstream-historical-behavior-evidence.mjs';
import {createFixture, hash} from './current-historical-fixture-loader.mjs';

const root = path.dirname(fs.realpathSync(path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../../scripts')));
const read = p => fs.readFileSync(path.join(root, p));
const epoch = 'main-pointer-regression-v2';
const options = {epoch, line: 'main'};
const pointerId = 'historical-legacy-artifact/original-and-shared-cases/src/material/legacy-autocomplete/autocomplete.spec.ts#179';
const pointerName = 'autocomplete hidden overlay pointer state > should release an empty group pane and restore inline pointer policy when options return';
const roster = deriveHistoricalRoster(root);
assert.equal(roster.ids.length + roster.discovery_negative_ids.length, 2328);
assert.equal(roster.cases.find(row => row.case_id === pointerId)?.full_name, pointerName);
assert.equal(historicalRegressionRequirements(options).find(row => row.case_id === pointerId)?.full_name, pointerName);
const archivedScopes = {scopes: HISTORICAL_BEHAVIOR_SHAS.map(sha => [sha, historicalBehaviorRequirements(sha)]),
  regressions: historicalRegressionRequirements()};
assert.equal(hash(JSON.stringify(archivedScopes)), '5d75270cdd561bc00c19ad51eae17cbf79ac61db958315af8f58167b7c82d27e');
for (const sha of HISTORICAL_BEHAVIOR_SHAS) {
  assert.deepEqual(historicalBehaviorRequirements(sha), historicalBehaviorRequirements(sha, {line: 'main'}));
  assert.deepEqual(historicalBehaviorRequirements(sha), historicalBehaviorRequirements(sha, {line: '21.x'}));
  assert.throws(() => historicalBehaviorRequirements(sha, {epoch, line: '21.x'}), /unsupported historical roster epoch/);
  assert.throws(() => historicalBehaviorRequirements(sha, {epoch: 'unknown', line: 'main'}), /unsupported historical roster epoch/);
}
const ts = createRequire(import.meta.url)('typescript');
const source = ts.createSourceFile('writer.mjs', read('scripts/rc-test-legacy-family.mjs').toString(), ts.ScriptTarget.Latest, true);
const writerBody = source.statements.find(node => ts.isFunctionDeclaration(node) && node.name?.text === 'writeAcceptance').getText(source);
const subjects = [
  '008212a9807fd01fd32fe136a075763b7b2c854d',
  '13629b0cd814ccc5fa01cf670b8b3001bc0021ff',
  '77ffdf98ba71c11d908b29e02b516dddf487ae0b',
  'cf868a5089a4c9eaddd4a55fd18b952fb96d5c19',
  'd5d468a29a2db4c0676c57d60bc8431ed4fd6e18',
  'db06fa8d8939d793f598bc3dbedc96a5a71c0db0',
];
for (const sha of subjects) {
  const definition = historicalBehaviorRequirements(sha, options);
  const members = definition.members.map(p => ({path: p, sha256: hash(read(p))}));
  const reviewPath = 'compatibility/rc/synthetic-main-epoch-review.json';
  const fixture = createFixture(root, {
    review: {sha, status: 'reviewed', final_disposition: 'already-adapted',
      patch_file: 'compatibility/rc/select-focus-click-original.patch', diff_sha256: definition.patch, fixture_only: true},
    entry: {sha, subject: 'Synthetic current historical roster', bucket: 'behavior-semantic',
      final_disposition: 'already-adapted', evidence_report: reviewPath, fixture_only: true,
      individual_proof: {proof_kind: HISTORICAL_BEHAVIOR_KIND, diff_sha256: definition.patch,
        review_depth: 'individual-compatibility', affected_branches: ['main'],
        decision: 'Synthetic fixture only; no product, artifact or release pass.', artifact_behavior: {source_members: members}}},
  });
  delete fixture.proof.artifact_behavior;
  fixture.proof.historical_behavior = {roster_epoch: epoch, kind: definition.kind,
    case_ids: definition.cases.map(row => row.case_id), source_members: members};
  fixture.request.historicalExecution = {run_id: fixture.run.run_id, invocation_id: 'synthetic-main', exit_code: 0};
  const relative = 'evidence/historical-legacy-artifact/synthetic-main/historical-observations.json';
  const outputDir = path.join(fixture.runDir, 'evidence/historical-legacy-artifact/synthetic-main');
  fs.mkdirSync(outputDir, {recursive: true});
  const writer = new Function('fs', 'path', 'root', 'runPath', 'rejectionReasons', 'discoveryNegativeResults', 'isRunnerControl', 'cryptoSha', 'console',
    writerBody + ';return writeAcceptance;')(fs, path, fixture.root, path.join(fixture.runDir, 'run.json'),
    rejectionReasons, discoveryNegativeResults, isRunnerControl, hash, {log() {}, error() {}});
  try {
    const specs = roster.cases.filter(row => row.kind !== 'shared-export').map(row => ({full_name: row.full_name, success: true, skipped: false}));
    assert.equal(writer({...fixture.request, invocation: 'synthetic-main', outputDir}, roster, {
      subject_mode: 'artifact', artifact_sha256: fixture.library.sha256, totals: {executed: specs.length},
      mapped_specs: roster.paths.map(historical_path => ({historical_path})), specs,
    }, fixture.library), true);
    const report = JSON.parse(fs.readFileSync(path.join(fixture.runDir, 'reports/historical-legacy-artifact.json')));
    const observed = JSON.parse(fs.readFileSync(path.join(fixture.runDir, relative)));
    const targets = [fixture.entry, fixture.request, report, observed];
    const originals = targets.map(value => structuredClone(value));
    function save() {
      fixture.save();
      fixture.runPut(relative, observed);
      const bytes = fs.readFileSync(path.join(fixture.runDir, relative));
      report.outputs = [{path: relative, sha256: hash(bytes), bytes: bytes.length}];
      fixture.runPut('reports/historical-legacy-artifact.json', report);
    }
    function reset() {
      for (const [i, target] of targets.entries()) {
        for (const key of Object.keys(target)) delete target[key];
        Object.assign(target, structuredClone(originals[i]));
      }
      save();
    }
    const check = () => validateHistoricalBehavior({root: fixture.root, entry: fixture.entry,
      proof: fixture.entry.individual_proof, request: fixture.request});
    const selected = () => observed.cases.find(row => row.case_id === definition.cases[0].case_id);
    const pointer = () => observed.cases.find(row => row.case_id === pointerId);
    const controls = [
      ['omitted case', () => { observed.cases = observed.cases.filter(row => row.case_id !== definition.cases[0].case_id); }],
      ['duplicate case', () => observed.cases.push(structuredClone(observed.cases[0]))],
      ['unexecuted case', () => { selected().result = 'fail'; }],
      ['renamed case', () => { selected().executed_full_name = 'wrong'; }],
      ['missing pointer', () => { observed.cases = observed.cases.filter(row => row.case_id !== pointerId); }],
      ['renamed pointer', () => { pointer().executed_full_name = 'wrong'; }],
      ['missing coordinator', () => { delete fixture.request.historicalExecution; }],
      ['failed packed consumer', () => { fixture.request.packedConsumerExecution.exit_code = 8; }],
      ['wrong line', () => { fixture.request.binding.source_line = '21.x'; }],
      ['wrong epoch', () => { fixture.entry.individual_proof.historical_behavior.roster_epoch = 'unknown'; }],
      ['missing epoch', () => { delete fixture.entry.individual_proof.historical_behavior.roster_epoch; }],
    ];
    for (const [name, mutate] of controls) {
      reset();
      assert.equal(check().ok, true, `baseline before ${name}`);
      mutate();
      save();
      assert.equal(check().ok, false, `${sha}: ${name}`);
    }
  } finally {
    fixture.dispose();
  }
}
console.log(JSON.stringify({subjects: subjects.length, negative_controls: subjects.length * 11, fixture_only: true}));
