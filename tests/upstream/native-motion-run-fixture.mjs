/**
 * @license
 * Copyright Google LLC All Rights Reserved.
 * Copyright (c) 2026 Ryan Lester.
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.io/license
 */
/** Complete actual writer with disclosed synthetic native outcome callbacks. */
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {createRequire} from 'node:module';
import {readFileSync, writeFileSync, mkdirSync} from 'node:fs';
import {join, relative} from 'node:path';
import {runInNewContext} from 'node:vm';
import {qualifyNativeMotionOutcomes} from '../../scripts/native-motion-acceptance.mjs';
import * as rosterModule from '../../scripts/native-motion-roster.mjs';
import {hash} from './artifact-behavior-fixture.mjs';
export async function writeSyntheticNativeMotionRun(sourceRoot, fixture, makeObservation) {
  const read = path => readFileSync(join(sourceRoot, path)), ts = createRequire(import.meta.url)('typescript');
  const source = ts.createSourceFile('native.mjs', read('scripts/native-motion-acceptance.mjs').toString(), ts.ScriptTarget.Latest, true);
  const writer = source.statements.find(node => ts.isFunctionDeclaration(node) && node.name?.text === 'runAcceptance').getText(source).replace(/^export /, '');
  const f = fixture, line = f.request.line, execution = {run_id: f.run.run_id, invocation_id: 'synthetic-native', exit_code: 0};
  f.request.nativeMotionExecution = execution;
  const ids = rosterModule.deriveMainRoster().ids; assert.equal(ids.length, 306); assert.equal(rosterModule.SOURCE_LINE, line);
  const outputDir = join(f.runDir, 'evidence/native-motion', execution.invocation_id); mkdirSync(outputDir, {recursive: true});
  const request = {binding: f.request.binding, line, runDir: f.runDir, outputDir, runId: f.run.run_id, invocation: execution.invocation_id};
  const context = {root: f.root, readFileSync, writeFileSync, mkdirSync, join, relative, createHash, Buffer,
    console: {log() {}, error() {}}, ...rosterModule, qualifyNativeMotionOutcomes,
    coordinatorRequest: () => request, resolveLibraryFromRun: () => ({tarball: 'synthetic-not-a-package.tgz', digest: f.library.sha256, bytes: f.library.bytes}),
    preflight: () => ({missing: [], notes: []}),
    executeNativeMotion: async () => ({outcomes: ids.map(id => ({id, ok: true, observation: {...makeObservation(id), angularZoneEntered: id.split('/')[3] === 'zoneful'}, evidence: 'Synthetic native observation; no browser launched'})),
      engines: {chromium: {launched: true, product: 'Chrome/128'}, firefox: {launched: true, browserName: 'firefox', version: '130'},
        webkit: {launched: true, backend: 'webkitgtk', api: 'WebKit2-4.1', safari_certification: false, sandboxDisabled: false}}}),
    gitValue: args => args[0] === 'status' ? '' : args[1] === 'HEAD' ? f.request.binding.source_commit : f.request.binding.source_tree};
  assert.equal(await runInNewContext('(' + writer + ')', context)({runPath: 'synthetic-only.json'}), 0);
  const report = JSON.parse(readFileSync(join(f.runDir, 'reports/native-motion.json'))), relativeOutput = report.outputs[0].path;
  const observation = JSON.parse(readFileSync(join(f.runDir, relativeOutput)));
  function save() {
    f.save(); f.runPut(relativeOutput, observation); const bytes = readFileSync(join(f.runDir, relativeOutput));
    report.outputs = [{path: relativeOutput, sha256: hash(bytes), bytes: bytes.length}]; f.runPut('reports/native-motion.json', report);
  }
  return {report, observation, save, relative: relativeOutput, ids, actual_writer_with_synthetic_IO: true};
}
