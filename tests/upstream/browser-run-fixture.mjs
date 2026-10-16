/**
 * @license
 * Copyright Google LLC All Rights Reserved.
 * Copyright (c) 2026 Ryan Lester.
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.io/license
 */
/** Execute the complete actual browser writer with explicit synthetic I/O. */
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {createRequire} from 'node:module';
import {readFileSync, writeFileSync, mkdirSync} from 'node:fs';
import {join, relative} from 'node:path';
import {runInNewContext} from 'node:vm';
import {qualifyRelease} from '../../scripts/browser-matrix-acceptance.mjs';
import * as rosterModule from '../../scripts/browser-matrix-roster.mjs';
import {hash} from './artifact-behavior-fixture.mjs';
export async function writeSyntheticBrowserRun(sourceRoot, fixture, makeRaw) {
  const read = path => readFileSync(join(sourceRoot, path)), ts = createRequire(import.meta.url)('typescript');
  const program = ts.createSourceFile('browser.mjs', read('scripts/browser-matrix-acceptance.mjs').toString(), ts.ScriptTarget.Latest, true);
  assert.equal(program.parseDiagnostics.length, 0);
  const writer = program.statements.find(node => ts.isFunctionDeclaration(node) && node.name?.text === 'runAcceptance').getText(program).replace(/^export /, '');
  const f = fixture, line = f.request.line, execution = {run_id: f.run.run_id, invocation_id: 'synthetic-browser', exit_code: 0};
  f.request.browserExecution = execution;
  const ids = rosterModule.deriveReleaseIds(rosterModule.familiesFromInventory(JSON.parse(read('testing/legacy-runner/historical-inventory.json'))), line);
  assert.equal(ids.length, 912);
  const outputDir = join(f.runDir, 'evidence/browser-matrix', execution.invocation_id); mkdirSync(outputDir, {recursive: true});
  const request = {binding: f.request.binding, line, runDir: f.runDir, outputDir, runId: f.run.run_id, invocation: execution.invocation_id};
  const context = {root: f.root, readFileSync, writeFileSync, mkdirSync, join, relative, createHash, Buffer,
    console: {log() {}, error() {}}, ...rosterModule, qualifyRelease,
    coordinatorRequest: () => request, resolveLibraryFromRun: () => ({tarball: join(f.runDir, 'library.tgz'), digest: f.library.sha256, bytes: f.library.bytes}),
    preflight: () => ({missing: [], notes: [], chrome: 'synthetic-only'}),
    fixtureQualificationDefects: () => [], fixtureQualificationDefectsFromTarball: () => [], writeDetail() {},
    runRippleHydrationReplay: async () => ({ok: true, fixture_only: true}),
    runCloseoutDiagnostic: (_request, _library, _launch, zoneless) => ({status: 'executed', exit_code: 0, artifact_bound: true, runtime_passed: true,
      acceptance_credit: false, progress_csp_passed: true, core_high_contrast_passed: true,
      report: `reports/closeout-browser-diagnostics${zoneless ? '-zoneless' : ''}.json`,
      observation: {schema_version: 1, tarball_sha256: f.library.sha256, browser: 'HeadlessChrome/128.0.0.0', error: null,
        zoneless, bundle_has_zone: !zoneless, zone_global: zoneless ? 'undefined' : 'function', angular_zone_entered: !zoneless,
        ...makeRaw(zoneless), fixture_only: true}}),
    executeIds: async () => ({outcomes: ids.map(id => ({id, ok: true, evidence: 'Synthetic assertion only; no browser was launched'})),
      engines: {chromium: {launched: true, product: 'Chrome/128'}, firefox: {launched: true, browserName: 'firefox', version: '130'},
        webkit: {launched: true, backend: 'webkitgtk', api: 'WebKit2-4.1', safari_certification: false}}}),
    gitValue: args => args[0] === 'status' ? '' : args[1] === 'HEAD' ? f.request.binding.source_commit : f.request.binding.source_tree};
  assert.equal(await runInNewContext('(' + writer + ')', context)({runPath: 'synthetic-only.json'}), 0);
  const report = JSON.parse(readFileSync(join(f.runDir, 'reports/browser-matrix.json'))), relativeOutput = report.outputs[0].path;
  const observation = JSON.parse(readFileSync(join(f.runDir, relativeOutput)));
  function save() {
    f.save(); f.runPut(relativeOutput, observation); const bytes = readFileSync(join(f.runDir, relativeOutput));
    report.outputs = [{path: relativeOutput, sha256: hash(bytes), bytes: bytes.length}]; f.runPut('reports/browser-matrix.json', report);
  }
  return {report, observation, save, relative: relativeOutput, ids, actual_writer_with_synthetic_IO: true};
}
