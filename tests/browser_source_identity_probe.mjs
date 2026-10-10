/**
 * @license
 * Copyright Google LLC All Rights Reserved.
 * Copyright (c) 2026 Ryan Lester.
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.io/license
 */
/** Complete actual browser entrypoint with copied source; stops before artifact reads. */
import assert from 'node:assert/strict';
import {spawnSync} from 'node:child_process';
import {copyFileSync, existsSync, mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync} from 'node:fs';
import {tmpdir} from 'node:os';
import {dirname, join} from 'node:path';
import {fileURLToPath} from 'node:url';
const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const scratch = mkdtempSync(join(tmpdir(), 'browser-source-identity-'));
const cwd = join(scratch, 'source');
const git = args => {
  const r = spawnSync('git', ['-c', 'gc.auto=0', '-c', 'maintenance.auto=0', ...args], {cwd, encoding: 'utf8'});
  assert.equal(r.status, 0, r.stderr); return r.stdout.trim();
};
const report = {schema_version: 1, role: 'Actual browser runAcceptance with copied clean Git source; no artifact install or browser execution.', cases: [], native_executed: false};
try {
  for (const path of [
    ...['browser-matrix-acceptance', 'resolve-run-library', 'legacy-core-high-contrast-contract',
      'browser-matrix-roster', 'browser-required-cells', 'chromium-debug-endpoint',
      'tooltip-aria-lifetime-fixture', 'legacy-tooltip-native-contract',
      'legacy-ink-bar-native-contract', 'legacy-select-font-native-contract', 'legacy-chip-blur-native-contract',
      'legacy-form-field-outline-native-contract',
      'safe-package-extract', 'packed-consumer-evidence'].map(name => `scripts/${name}.mjs`),
    'projects/ngx-material-legacy/package.json', 'testing/legacy-runner/historical-inventory.json',
    'compatibility/rc/matrices/full-verify.json',
  ]) {
    const destination = join(cwd, path); mkdirSync(dirname(destination), {recursive: true});
    copyFileSync(join(root, path), destination);
  }
  const line = JSON.parse(readFileSync(join(cwd, 'projects/ngx-material-legacy/package.json'))).version.startsWith('21.') ? '21.x' : 'main';
  report.line = line;
  const missing = join(scratch, 'artifact-read-stage-must-not-exist.json');
  writeFileSync(join(cwd, 'scripts/entrypoint.mjs'), `import {runAcceptance} from './browser-matrix-acceptance.mjs';
process.exitCode = await runAcceptance({runPath:process.argv[2]});
`);
  git(['init', '--quiet']); git(['add', '.']);
  git(['-c', 'user.name=Fixture', '-c', 'user.email=fixture@example.invalid', '-c', 'commit.gpgsign=false',
    'commit', '--quiet', '-m', 'Synthetic browser source identity fixture']);
  const binding = {run_id: 'browser-source', source_line: line, source_clean: true,
    source_commit: git(['rev-parse', 'HEAD']), source_tree: git(['rev-parse', 'HEAD^{tree}'])};
  let sequence = 0;
  function run(id, changes, expected, message) {
    const invocation = `source-${sequence++}`;
    const out = join(scratch, id, 'evidence/browser-matrix', invocation);
    mkdirSync(out, {recursive: true});
    const env = Object.fromEntries(Object.entries(process.env).filter(([key]) => !key.startsWith('RC_')));
    Object.assign(env, {RC_CHECK_ID: 'browser-matrix', RC_RUN_ID: binding.run_id, RC_INVOCATION_ID: invocation,
      RC_ASSERTION_OUTPUT_DIR: out, RC_EVIDENCE_BINDING: JSON.stringify({...binding, ...changes})});
    const result = spawnSync(process.execPath, ['scripts/entrypoint.mjs', missing], {cwd, env, encoding: 'utf8', timeout: 15000});
    assert.equal(result.status, expected, id + ': ' + result.stderr);
    assert.match(result.stderr, message, id);
    assert.equal(existsSync(join(out, 'browser-observations.json')), false);
    assert.equal(existsSync(join(scratch, id, 'reports/browser-matrix.json')), false);
    assert.equal(existsSync(join(cwd, 'compatibility/rc/reports/browser-matrix-slice.json')), false);
    report.cases.push({id, result: 'pass', exit_code: result.status, reached_artifact_read: result.stderr.includes('Missing run manifest:')});
  }
  run('valid-current-source', {}, 2, /Missing run manifest:/);
  run('foreign-line', {source_line: line === 'main' ? '21.x' : 'main'}, 2, /source line/);
  run('false-clean', {source_clean: false}, 2, /clean/);
  run('missing-clean', {source_clean: undefined}, 2, /clean/);
  run('foreign-commit', {source_commit: 'a'.repeat(40)}, 2, /source identity/);
  run('foreign-tree', {source_tree: 'a'.repeat(40)}, 2, /source identity/);
  run('prepack-binding', {phase: 'prepack'}, 2, /prepack/);
  const dirty = join(cwd, 'untracked-source.txt');
  writeFileSync(dirty, 'uncommitted browser source');
  run('untracked-dirty-source', {}, 2, /dirty/); rmSync(dirty);
  const tracked = join(cwd, 'projects/ngx-material-legacy/package.json'), original = readFileSync(tracked);
  writeFileSync(tracked, Buffer.concat([original, Buffer.from('\n')]));
  run('tracked-dirty-source', {}, 2, /dirty/); writeFileSync(tracked, original);
  run('repaired-current-source', {}, 2, /Missing run manifest:/);
  assert.equal(report.cases.length, 10);
  const index = process.argv.indexOf('--report');
  if (index >= 0) {assert.equal(existsSync(process.argv[index + 1]), false); writeFileSync(process.argv[index + 1], JSON.stringify(report, null, 2) + '\n');}
  console.log(JSON.stringify({line, cases: report.cases.length, rejected: 8, native_executed: false}));
} finally {rmSync(scratch, {recursive: true, force: true});}
