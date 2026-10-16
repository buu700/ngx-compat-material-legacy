/**
 * @license
 * Copyright Google LLC All Rights Reserved.
 * Copyright (c) 2026 Ryan Lester.
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.io/license
 */
/** Execute the actual complete writer with explicit synthetic native outcomes. */
import assert from 'node:assert/strict';
import {createRequire} from 'node:module';
import {createHash} from 'node:crypto';
import {readFileSync, writeFileSync, mkdirSync, mkdtempSync, rmSync} from 'node:fs';
import {runInNewContext} from 'node:vm';
import {join, dirname, relative, resolve} from 'node:path';
import {tmpdir} from 'node:os';
import {gunzipSync} from 'node:zlib';
import {fileURLToPath} from 'node:url';
import {deriveMainRoster, samplePass, observationProblems, assertCase, SOURCE_LINE} from '../scripts/native-motion-roster.mjs';
import {qualifyNativeMotionOutcomes} from '../scripts/native-motion-acceptance.mjs';
const root = resolve(dirname(fileURLToPath(import.meta.url)), '..'), read = path => readFileSync(join(root, path));
const hash = value => createHash('sha256').update(value).digest('hex'), ts = createRequire(import.meta.url)('typescript');
const raw = read('scripts/native-motion-acceptance.mjs').toString(), file = ts.createSourceFile('native.mjs', raw, ts.ScriptTarget.Latest, true);
assert.equal(file.parseDiagnostics.length, 0);
const method = name => file.statements.find(node => ts.isFunctionDeclaration(node) && node.name?.text === name).getText(file).replace(/^export /, '');
const writer = method('runAcceptance'), qualifier = method('qualifyNativeMotionOutcomes'), roster = deriveMainRoster(); assert.equal(roster.ids.length, 306);
const all = () => roster.ids.map(id => ({id, ok: true, observation: samplePass(id), evidence: 'Synthetic native outcome; no browser was launched'}));
const engines = {chromium: {launched: true, product: 'Chrome/128'}, firefox: {launched: true, browserName: 'firefox', version: '130'},
  webkit: {launched: true, backend: 'webkitgtk', api: 'WebKit2-4.1', safari_certification: false, sandboxDisabled: false}};
const digest = 'c'.repeat(64), sourceCommit = 'a'.repeat(40), sourceTree = 'b'.repeat(40);
const scenarios = [
  ['complete', {}, {exit: 0, discovered: 306, executed: 306, passed: 306, failed: 0, unresolved: 0}],
  ['missing-engine', {missing: ['webkit']}, {exit: 1, discovered: 0, executed: 0, passed: 0, failed: 0, unresolved: 306}],
  ['empty-child', {outcomes: []}, {exit: 1, discovered: 0, executed: 0, passed: 0, failed: 0, unresolved: 306}],
  ['unobserved-child', {outcomes: all().map(({observation, ...row}) => ({...row, ok: false}))},
    {exit: 1, discovered: 306, executed: 0, passed: 0, failed: 0, unresolved: 306}],
  ['passing-marker-child', {outcomes: all().map(({observation, ...row}) => row)},
    {exit: 1, discovered: 306, executed: 0, passed: 0, failed: 0, unresolved: 306}],
  ['partial-child', {outcomes: all().slice(0, 3)}, {exit: 1, discovered: 3, executed: 3, passed: 3, failed: 0, unresolved: 303}],
  ['failed-child', {outcomes: all().map((row, index) => index ? row : {...row, ok: false})}, {exit: 1, discovered: 306, executed: 306, passed: 305, failed: 1, unresolved: 0}],
  ['forged-child', {outcomes: all().map((row, index) => index ? row : {...row, observation: {...row.observation, detectChangesCalls: 1}})},
    {exit: 1, discovered: 306, executed: 306, passed: 305, failed: 1, unresolved: 0}],
  ['duplicate-child', {outcomes: [...all(), all()[0]]}, {exit: 1, discovered: 306, executed: 306, passed: 305, failed: 1, unresolved: 0}],
  ['foreign-child', {outcomes: [...all(), {id: 'foreign', ok: true, observation: {}, evidence: 'synthetic'}]},
    {exit: 1, discovered: 307, executed: 306, passed: 306, failed: 0, unresolved: 0}],
  ['malformed-child', {outcomes: [...all(), null]}, {exit: 1, discovered: 306, executed: 306, passed: 306, failed: 0, unresolved: 0}],
  ['wrong-line', {line: SOURCE_LINE === 'main' ? '21.x' : 'main'}, {exit: 1, discovered: 0, executed: 0, passed: 0, failed: 0, unresolved: 306}],
  ['wrong-matrix', {wrongMatrix: true}, {exit: 1, discovered: 0, executed: 0, passed: 0, failed: 0, unresolved: 306}],
  ['dirty-end', {status: ' M changed-source\n'}, {exit: 1, discovered: 306, executed: 306, passed: 306, failed: 0, unresolved: 0}],
  ['unknown-clean-state', {status: null}, {exit: 1, discovered: 306, executed: 306, passed: 306, failed: 0, unresolved: 0}],
  ['foreign-source', {commit: 'd'.repeat(40)}, {exit: 1, discovered: 306, executed: 306, passed: 306, failed: 0, unresolved: 0}],
];
let controls = 0;
async function exercise(text, qualify, selected = scenarios, count = true) {
  const scratch = mkdtempSync(join(tmpdir(), 'native-motion-writer-controls-'));
  try {
    for (const [name, input, expected] of selected) {
      const runDir = join(scratch, name), outputDir = join(runDir, 'evidence/native-motion/synthetic-native'); mkdirSync(outputDir, {recursive: true});
      const binding = {run_id: 'synthetic', source_line: SOURCE_LINE, source_clean: true, source_commit: sourceCommit, source_tree: sourceTree};
      const request = {binding, line: input.line ?? SOURCE_LINE, runDir, outputDir, runId: 'synthetic', invocation: 'synthetic-native'};
      let nativeCalls = 0;
      const context = {root, readFileSync: (path, encoding) => {
        if (input.wrongMatrix && path === join(root, 'compatibility/rc/matrices/full-verify.json')) {
          const matrix = JSON.parse(readFileSync(path)); matrix.checks.find(row => row.check_id === 'native-motion').acceptance.cases_by_line[SOURCE_LINE] = {};
          return encoding ? JSON.stringify(matrix) : Buffer.from(JSON.stringify(matrix));
        }
        return readFileSync(path, encoding);
      }, writeFileSync, mkdirSync, join, relative, createHash, Buffer, console: {log() {}, error() {}}, SOURCE_LINE,
        coordinatorRequest: () => request, deriveMainRoster, observationProblems, qualifyNativeMotionOutcomes: qualify,
        resolveLibraryFromRun: () => ({tarball: 'synthetic-not-a-package.tgz', digest, bytes: 1}),
        preflight: () => ({missing: input.missing ?? [], notes: []}),
        executeNativeMotion: async () => {nativeCalls++; return {outcomes: structuredClone(input.outcomes ?? all()), engines: structuredClone(engines)};},
        gitValue: args => args[0] === 'status' ? (Object.hasOwn(input, 'status') ? input.status : '')
          : args[1] === 'HEAD' ? (input.commit ?? sourceCommit) : sourceTree};
      const exit = await runInNewContext('(' + text + ')', context)({runPath: 'synthetic.json'});
      const report = JSON.parse(readFileSync(join(runDir, 'reports/native-motion.json'))), output = report.outputs[0];
      const data = readFileSync(join(runDir, output.path)), observation = JSON.parse(data);
      assert.equal(exit, expected.exit, name); assert.equal(report.result, exit === 0 ? 'pass' : 'fail', name);
      assert.equal(report.expected_case_ids.length, 306, name);
      for (const [field, key] of [['discovered_case_ids', 'discovered'], ['executed_case_ids', 'executed'], ['passed_case_ids', 'passed'],
        ['failed_case_ids', 'failed'], ['unresolved_case_ids', 'unresolved']]) assert.equal(report[field].length, expected[key], name + ':' + field);
      assert.equal(report.passed, expected.passed, name); assert.equal(report.failed, expected.failed, name); assert.equal(report.skipped, 0, name);
      assert.equal(output.sha256, hash(data)); assert.equal(output.bytes, data.length);
      assert.equal(observation.source_commit, input.commit ?? sourceCommit); assert.equal(observation.source_tree, sourceTree);
      assert.equal(observation.source_clean, !Object.hasOwn(input, 'status') || input.status === '', name);
      assert.equal(report.case_results.length, 306); assert.equal(observation.cases.length, 306);
      for (const row of observation.cases) {
        const assertion = report.case_results.find(value => value.case_id === row.case_id); assert.equal(assertion.result, row.result);
        if (!report.executed_case_ids.includes(row.case_id)) {
          assert.equal(row.result, 'unresolved', name); assert.equal(row.observation, null, name); assert.equal(assertion.kind, 'not-executed', name);
        } else {
          assert.equal(assertion.kind, 'assertion', name); assert.ok(row.observation, name);
          const source = (input.outcomes ?? all()).find(value => value?.id === row.case_id); assert.deepEqual(row.observation, source.observation, name);
        }
      }
      assert.equal(nativeCalls, ['missing-engine', 'wrong-line', 'wrong-matrix'].includes(name) ? 0 : 1, name);
      if (count) controls++;
    }
  } finally {rmSync(scratch, {recursive: true, force: true});}
}
await exercise(writer, qualifyNativeMotionOutcomes);
const writerMutants = [
  [writer.replace('discovered_case_ids: qualification.discovered', 'discovered_case_ids: roster.ids'), ['missing-engine']],
  [writer.replace('executed_case_ids: qualification.executed', 'executed_case_ids: roster.ids'), ['empty-child']],
  [writer.replace('observation: qualification.byId.get(id)?.observation ?? null', 'observation: null'), ['complete']],
  [writer.replace("source_clean: request.binding.source_clean === true && status === ''", 'source_clean: request.binding.source_clean === true'), ['dirty-end']],
];
let mutants = 0;
for (const [mutant, names] of writerMutants) {
  assert.notEqual(mutant, writer); await assert.rejects(() => exercise(mutant, qualifyNativeMotionOutcomes, scenarios.filter(row => names.includes(row[0])), false)); mutants++;
}
for (const [before, after, names] of [[' && !rawProblems.length', '', ['forged-child']], [' && !duplicates.has(id)', '', ['duplicate-child']]]) {
  const changed = qualifier.replace(before, after); assert.notEqual(changed, qualifier);
  const mutant = new Function('assertCase', changed + ';return qualifyNativeMotionOutcomes;')(assertCase);
  await assert.rejects(() => exercise(writer, mutant, scenarios.filter(row => names.includes(row[0])), false)); mutants++;
}
const prior = JSON.parse(gunzipSync(read('compatibility/rc/remaining-native-admission-native-motion-prior.json.gz')));
const change = JSON.parse(read('compatibility/rc/remaining-native-admission-native-motion-change.json')); assert.equal(hash(raw), change.current_sha256);
let recovered = raw;
for (const edit of [...change.edits].reverse()) {assert.equal(recovered.slice(edit.start, edit.end), edit.after); recovered = recovered.slice(0, edit.start) + edit.before + recovered.slice(edit.end);}
assert.equal(recovered, prior.members[0].text); assert.equal(hash(recovered), change.before_sha256);
const report = {schema_version: 1, line: SOURCE_LINE, complete_actual_writer_scenarios: controls, actual_writer_and_qualifier_mutants_rejected: mutants,
  unchanged_roster: 306, complete_preceding_writer_recovered: true, raw_native_observations_preserved: true, empty_native_execution_reported_as_unresolved: true,
  synthetic_IO: true, actual_packed_native_or_floor_qualified: false, g11_claim: 'not-passed',
  writer_sha256: hash(raw), producer_sha256: hash(read('tests/native_motion_acceptance_writer_probe.mjs'))};
if (process.argv[2]) writeFileSync(process.argv[2], JSON.stringify(report, null, 2) + '\n', {flag: 'wx'});
console.log(JSON.stringify(report));
