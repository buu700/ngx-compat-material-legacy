/**
 * @license
 * Copyright Google LLC All Rights Reserved.
 * Copyright (c) 2026 Ryan Lester.
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.io/license
 */
/** Actual complete report path with synthetic native outcomes; never browser qualification. */
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync} from 'node:fs';
import {createRequire} from 'node:module';
import {tmpdir} from 'node:os';
import {join, relative} from 'node:path';
import {fileURLToPath} from 'node:url';
import {runInNewContext} from 'node:vm';
import {qualifyRelease} from '../scripts/browser-matrix-acceptance.mjs';
import * as rosterModule from '../scripts/browser-matrix-roster.mjs';
const ts = createRequire(import.meta.url)('typescript');
const root = fileURLToPath(new URL('..', import.meta.url));
const raw = readFileSync(join(root, 'scripts/browser-matrix-acceptance.mjs'), 'utf8');
const source = ts.createSourceFile('browser-matrix-acceptance.mjs', raw, ts.ScriptTarget.Latest, true, ts.ScriptKind.JS);
const declaration = source.statements.find(node => ts.isFunctionDeclaration(node) && node.name.text === 'runAcceptance');
assert.ok(declaration); assert.equal(source.parseDiagnostics.length, 0);
const expression = declaration.getText(source).replace(/^export /, '');
const line = JSON.parse(readFileSync(join(root, 'projects/ngx-material-legacy/package.json'))).version.startsWith('21.') ? '21.x' : 'main';
const roster = line === 'main' ? rosterModule.loadMainReleaseRoster() : rosterModule.loadReleaseRoster(line);
const scratch = mkdtempSync(join(tmpdir(), 'browser-source-completion-'));
const binding = {source_clean: true, source_line: line, source_commit: 'a'.repeat(40), source_tree: 'b'.repeat(40)};
const scenarios = [
  {id: 'clean-after-native-stage', status: '', expected: 0},
  {id: 'tracked-dirty-after-native-stage', status: ' M candidate.ts', expected: 1},
  {id: 'untracked-dirty-after-native-stage', status: '?? candidate.ts', expected: 1},
  {id: 'unknown-after-native-stage', status: null, expected: 1},
  {id: 'changed-commit-after-native-stage', status: '', commit: 'c'.repeat(40), expected: 1},
  {id: 'changed-tree-after-native-stage', status: '', tree: 'c'.repeat(40), expected: 1},
  {id: 'missing-genuine-hydration', status: '', hydration: false, expected: 1},
];
async function run(scenario, functionSource = expression) {
  const runDir = join(scratch, scenario.id + '-' + createHash('sha256').update(functionSource).digest('hex').slice(0, 8));
  const outputDir = join(runDir, 'evidence/browser-matrix/fixture'); mkdirSync(outputDir, {recursive: true});
  const request = {binding, line, outputDir, runDir, runId: 'fixture-only', invocation: 'fixture'};
  let nativeStageReached = false, detail;
  const context = {root, readFileSync, writeFileSync, mkdirSync, join, relative, createHash, Buffer,
    console: {log() {}, error() {}}, ...rosterModule, qualifyRelease,
    coordinatorRequest: () => request,
    resolveLibraryFromRun: () => ({tarball: 'fixture-only.tgz', digest: 'd'.repeat(64), bytes: 1}),
    preflight: () => ({missing: [], notes: [], chrome: 'fixture-only'}),
    fixtureQualificationDefects: () => [], fixtureQualificationDefectsFromTarball: () => [],
    runCloseoutDiagnostic: () => ({core_high_contrast_passed: true, progress_csp_passed: true}), writeDetail: value => {detail = value;},
    runRippleHydrationReplay: async () => ({ok:scenario.hydration !== false, protocol_only:true}),
    executeIds: async () => {
      nativeStageReached = true;
      return {outcomes: roster.ids.map(id => ({id, ok: true, evidence: 'Synthetic assertion fixture; no native execution'})),
        engines: {chromium: {launched: true, product: 'Chrome/128.0.0.0'},
          firefox: {launched: true, browserName: 'firefox', version: '130.0'},
          webkit: {launched: true, backend: 'webkitgtk', api: 'WebKit2-4.1', safari_certification: false}}};
    },
    gitValue: args => {
      assert.equal(nativeStageReached, true, 'post-execution source identity must be checked after the native stage');
      if (args[0] === 'status') return scenario.status;
      assert.equal(args[0], 'rev-parse');
      return args[1] === 'HEAD' ? scenario.commit ?? binding.source_commit : scenario.tree ?? binding.source_tree;
    },
  };
  const execute = runInNewContext('(' + functionSource + ')', context);
  const code = await execute({runPath: 'fixture-only.json'});
  const report = JSON.parse(readFileSync(join(runDir, 'reports/browser-matrix.json')));
  const observations = JSON.parse(readFileSync(join(outputDir, 'browser-observations.json')));
  return {code, report, observations, detail};
}
try {
  for (const scenario of scenarios) {
    const observed = await run(scenario);
    assert.equal(observed.code, scenario.expected, scenario.id);
    assert.equal(observed.report.exit_code, scenario.expected, scenario.id);
    assert.equal(observed.report.result, scenario.expected === 0 ? 'pass' : 'fail', scenario.id);
    assert.equal(observed.detail.result, observed.report.result, scenario.id);
    assert.equal(observed.report.coverage, scenario.expected === 0 ? 'complete' : 'incomplete', scenario.id);
    assert.equal(observed.observations.source_clean, scenario.status === '', scenario.id);
    assert.equal(observed.observations.source_commit, scenario.commit ?? binding.source_commit);
    assert.equal(observed.observations.source_tree, scenario.tree ?? binding.source_tree);
  }
  const mutant = expression.replace("  if (status === null) identity.push('checkout clean source state is unknown');\n  else if (status !== '') identity.push('checkout source became dirty during browser execution');", '');
  assert.notEqual(mutant, expression);
  const bypass = await run(scenarios[1], mutant);
  assert.equal(bypass.code, 0, 'Removing the source drift gate must expose a false accepted report');
  console.log(JSON.stringify({line, scenarios: scenarios.length, mutant_rejected: 1,
    synthetic_outcomes: true, native_executed: false, acceptance_credit: false}));
} finally {rmSync(scratch, {recursive: true, force: true});}
