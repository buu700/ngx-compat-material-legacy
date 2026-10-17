/**
 * @license
 * Copyright Google LLC All Rights Reserved.
 * Copyright (c) 2026 Ryan Lester.
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.io/license
 */
// Synthetic run evidence for the real admission path; no native test execution.
import assert from 'node:assert/strict';
import * as fs from 'node:fs';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {createRequire} from 'node:module';
import {spawnSync} from 'node:child_process';
import {gunzipSync} from 'node:zlib';
import {deriveHistoricalRoster, rejectionReasons, discoveryNegativeResults, isRunnerControl} from '../../scripts/historical-case-roster.mjs';
import {historicalBehaviorRequirements, validateHistoricalBehavior} from '../../scripts/upstream-historical-behavior-evidence.mjs';
import {createFixture, hash} from './artifact-behavior-fixture.mjs';
import {inspectEmptySelectionSourceContext} from '../../scripts/autocomplete-empty-selection-source-context.mjs';
const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
const read = p => fs.readFileSync(path.join(root, p)), json = p => JSON.parse(read(p));
const sha = 'db06fa8d8939d793f598bc3dbedc96a5a71c0db0';
const entry = json('compatibility/f10/disposition-ledger/ledger.json').entries.find(row => row.sha === sha);
const review = json(entry.evidence_report), definition = historicalBehaviorRequirements(sha);
const contextBytes = read('compatibility/rc/autocomplete-empty-selection-context.json.gz');
const context = JSON.parse(gunzipSync(contextBytes));
assert.equal(hash(contextBytes), {main: '1f176f656b8b5721165fed24db4dfe8fabcc52dd2ae6ebaa08f52386643e59d9',
  '21.x': '90772da3de4bfce132b2995dd390dfd195dfb3791ed3e35bc1a3a3764494d14e'}[context.line]);
const ledger = json('compatibility/f10/disposition-ledger/ledger.json');
assert.equal(ledger.entries.length, 1697);
const sourceContext = inspectEmptySelectionSourceContext({root});
assert.equal(sourceContext.summary.source_rows_requalified, 52);
const sourceContextMutants = [
  ['changed-native-test', p => p === 'projects/ngx-material-legacy/legacy-autocomplete/autocomplete.spec.ts'],
  ['unrelated-product-change', p => p === 'projects/ngx-material-legacy/legacy-slider/slider.ts'],
  ['corrupted-prior-context', p => p === 'compatibility/rc/autocomplete-empty-selection-scope-context.json.gz'],
];
for (const [name, selected] of sourceContextMutants) {
  assert.throws(() => inspectEmptySelectionSourceContext({root, readMember: p => selected(p) ? Buffer.concat([read(p), Buffer.from('\n')]) : read(p)}), undefined, name);
}
for (const old of context.preceding_entries) {
  const current = ledger.entries.find(row => row.sha === old.sha);
  assert.equal(current.final_disposition, old.final_disposition);
  assert.equal(current.individual_proof.decision, old.individual_proof.decision);
  const required = historicalBehaviorRequirements(old.sha);
  assert.deepEqual(required.cases.map(row => row.case_id), old.individual_proof.historical_behavior.case_ids);
  assert.deepEqual(required.members, old.individual_proof.historical_behavior.source_members.map(row => row.path));
  for (const member of current.individual_proof.historical_behavior.source_members) assert.equal(hash(read(member.path)), member.sha256);
  assert.deepEqual(validateHistoricalBehavior({root, entry: current, proof: current.individual_proof, request: null}), {ok: false, detail: 'missing coordinator run'});
}
assert.deepEqual(entry.individual_proof, review.individual_proof);
assert.equal(hash(read(review.patch_file)), definition.patch);
assert.deepEqual(review.required_native_cases, definition.cases);
for (const member of entry.individual_proof.historical_behavior.source_members) assert.equal(hash(read(member.path)), member.sha256);
assert.deepEqual(validateHistoricalBehavior({root, entry, proof: entry.individual_proof, request: null}), {ok: false, detail: 'missing coordinator run'});
const roster = deriveHistoricalRoster(root);
assert.equal(roster.ids.length + roster.discovery_negative_ids.length, 2228);
for (const expected of definition.cases) {
  const actual = roster.cases.find(row => row.case_id === expected.case_id);
  for (const [key, value] of Object.entries(expected)) assert.equal(actual[key], value);
}
const adapted = structuredClone(entry);
adapted.individual_proof.artifact_behavior = {source_members: adapted.individual_proof.historical_behavior.source_members};
const f = createFixture(root, {entry: adapted, review});
delete f.entry.individual_proof.artifact_behavior;
assert.deepEqual(f.entry, entry);
const relative = 'evidence/historical-legacy-artifact/synthetic-empty-selection/historical-observations.json';
const outDir = path.dirname(path.join(f.runDir, relative)); fs.mkdirSync(outDir, {recursive: true});
f.request.historicalExecution = {run_id: f.run.run_id, invocation_id: 'synthetic-empty-selection', exit_code: 0};
const ts = createRequire(import.meta.url)('typescript');
const source = ts.createSourceFile('writer.mjs', read('scripts/rc-test-legacy-family.mjs').toString(), ts.ScriptTarget.Latest, true);
const body = source.statements.find(n => ts.isFunctionDeclaration(n) && n.name?.text === 'writeAcceptance').getText(source);
const writer = new Function('fs', 'path', 'root', 'runPath', 'rejectionReasons', 'discoveryNegativeResults', 'isRunnerControl', 'cryptoSha', 'console',
  body + ';return writeAcceptance;')(fs, path, f.root, path.join(f.runDir, 'run.json'), rejectionReasons, discoveryNegativeResults, isRunnerControl, hash, {log() {}, error() {}});
const observations = [];
try {
  assert.equal(writer({...f.request, invocation: 'synthetic-empty-selection', outputDir: outDir}, roster, {
    subject_mode: 'artifact', artifact_sha256: f.library.sha256,
    totals: {executed: roster.cases.filter(row => row.kind !== 'shared-export').length},
    mapped_specs: roster.paths.map(historical_path => ({historical_path})),
    specs: roster.cases.filter(row => row.kind !== 'shared-export').map(row => ({full_name: row.full_name, success: true, skipped: false})),
  }, f.library), true);
  const native = JSON.parse(fs.readFileSync(path.join(f.runDir, relative)));
  const report = JSON.parse(fs.readFileSync(path.join(f.runDir, 'reports/historical-legacy-artifact.json')));
  const originals = [f.entry, f.request, native, report].map(value => structuredClone(value));
  const cases = [
    ['complete', null, true],
    ['missing-native', x => { delete x.request.historicalExecution; }, false],
    ['failed-native', x => { x.request.historicalExecution.exit_code = 1; }, false],
    ['sliced-run', x => { x.report.coverage = 'slice'; }, false],
    ['renamed-test', x => { x.native.cases.find(row => row.case_id === definition.cases[0].case_id).executed_full_name = 'unrelated'; }, false],
    ['stale-source', x => { x.entry.individual_proof.historical_behavior.source_members[0].sha256 = '0'.repeat(64); }, false],
    ['omitted-case', x => { x.entry.individual_proof.historical_behavior.case_ids = []; }, false],
    ['wrong-patch', x => { x.entry.individual_proof.diff_sha256 = '0'.repeat(64); }, false],
    ['renamed-proof', x => { x.entry.individual_proof.proof_kind = 'ordinary-review'; }, false],
  ];
  const invocation = 'synthetic-empty-selection-upstream';
  const assertionDir = path.join(f.runDir, 'evidence/upstream-audit-disposition', invocation); fs.mkdirSync(assertionDir, {recursive: true});
  for (const [name, mutate, expected] of cases) {
    const [activeEntry, request, activeNative, activeReport] = originals.map(value => structuredClone(value));
    mutate?.({entry: activeEntry, request, native: activeNative, report: activeReport});
    f.runPut(relative, activeNative); const bytes = fs.readFileSync(path.join(f.runDir, relative));
    activeReport.outputs = [{path: relative, sha256: hash(bytes), bytes: bytes.length}];
    f.runPut('reports/historical-legacy-artifact.json', activeReport);
    const result = validateHistoricalBehavior({root: f.root, entry: activeEntry, proof: activeEntry.individual_proof, request});
    assert.equal(result.ok, expected, name + ': ' + result.detail);
    f.runPut('seed.json', {commits: [{sha}], fixture_only: true});
    f.runPut('ledger.json', {entries: [activeEntry], g11_claim: 'not-passed', fixture_only: true});
    const environment = {...process.env}; for (const key of Object.keys(environment).filter(k => k.startsWith('RC_'))) delete environment[key];
    const reportPath = path.join(f.runDir, 'actual-cli-' + name + '.json');
    const child = spawnSync(process.execPath, [path.join(f.root, 'scripts/check-upstream-audit-disposition.mjs'), '--admission', '--line', f.line,
      '--seed', path.join(f.runDir, 'seed.json'), '--ledger', path.join(f.runDir, 'ledger.json'), '--symbols', path.join(f.root, 'symbols.json'),
      '--current-symbols', path.join(f.root, 'current.json'), '--report', reportPath], {
      cwd: f.root, timeout: 30000, encoding: 'utf8', env: {...environment,
        RC_CHECK_ID: 'upstream-audit-disposition', RC_RUN_ID: request.runId, RC_INVOCATION_ID: invocation,
        RC_EVIDENCE_BINDING: JSON.stringify(request.binding), RC_ASSERTION_OUTPUT_DIR: assertionDir,
        RC_UPSTREAM_PACKED_CONSUMER: JSON.stringify(request.packedConsumerExecution), RC_UPSTREAM_HISTORICAL: JSON.stringify(request.historicalExecution ?? null)},
    });
    assert.ok([0, 1].includes(child.status), child.stderr);
    const cli = JSON.parse(fs.readFileSync(reportPath));
    assert.equal(child.status === 0, expected, name + ': ' + child.stderr + JSON.stringify(cli.artifact_behavior_evidence));
    assert.equal(cli.g11_claim, 'not-passed');
    observations.push({name, helper_ok: result.ok, actual_cli_exit: child.status, fixture_only: true});
  }
  const result = {line: f.line, actual_CLI_controls: observations.length, helper_controls: observations.length,
    complete_historical_roster: 2228, source_context_rows_requalified: 52, source_context_mutants_rejected: sourceContextMutants.length,
    observations, synthetic_only: true, actual_native_packed_or_floor_qualified: false};
  const out = process.argv.indexOf('--out'); if (out >= 0) fs.writeFileSync(process.argv[out + 1], JSON.stringify(result, null, 2) + '\n');
  console.log(JSON.stringify(result));
} finally { f.dispose(); }
