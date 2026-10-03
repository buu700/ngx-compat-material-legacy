#!/usr/bin/env node
/** Regressions for engine-free evidence. Not a release certificate. */
import {createHash} from 'node:crypto';
import {spawnSync} from 'node:child_process';
import {mkdtempSync, mkdirSync, readFileSync, rmSync, writeFileSync} from 'node:fs';
import {tmpdir} from 'node:os';
import {dirname, join} from 'node:path';
import {fileURLToPath} from 'node:url';
import {
  NPM_INSTALL_ARGS,
  classifyEngineHits,
  engineFreeGroups,
  installUsesLegacyPeerDeps,
  loadExportKeys,
  manifestEngineDeps,
  recipeKeys,
} from './engine-free-consumer-evidence.mjs';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const failures = [];
function expect(name, condition, detail = '') {
  if (!condition) {
    failures.push(detail ? `${name}: ${detail}` : name);
    console.error(`FAIL ${name}${detail ? `: ${detail}` : ''}`);
  }
}

const keys = loadExportKeys();
const groups = engineFreeGroups(keys);
const matrix = JSON.parse(readFileSync(join(root, 'compatibility/rc/matrices/full-verify.json'), 'utf8'));
const row = matrix.checks.find(item => item.check_id === 'engine-free-consumer').acceptance.cases_by_line;
expect('engine-absence roster', JSON.stringify(row.main['engine-absence']) === JSON.stringify(groups['engine-absence']));
expect('strict roster', JSON.stringify(row.main['strict-consumer']) === JSON.stringify(groups['strict-consumer']));
expect('testing roster', JSON.stringify(row.main['testing-entrypoints']) === JSON.stringify(groups['testing-entrypoints']));
expect('21.x engine roster stays unresolved', row['21.x']['engine-absence'] === null && row['21.x']['strict-consumer'] === null && row['21.x']['testing-entrypoints'] === null);
expect('install does not use legacy peer deps', installUsesLegacyPeerDeps(NPM_INSTALL_ARGS) === false);

const clean = classifyEngineHits([{name: 'package/fesm2022/button.mjs', text: "import {x} from '@angular/core';"}]);
expect('clean runtime has no engine hit', clean.runtime.length === 0 && clean.declarations.length === 0 && clean.testing.length === 0);
const injected = classifyEngineHits([
  {name: 'package/fesm2022/button.mjs', text: "import {animate} from '@angular/animations';"},
  {name: 'package/types/button.d.ts', text: "import type {AnimationTriggerMetadata} from '@angular/animations';"},
  {name: 'package/fesm2022/button-testing.mjs', text: "import '@angular/platform-browser/animations';"},
]);
expect('injected runtime import is detected', injected.runtime.length === 1);
expect('injected declaration import is detected', injected.declarations.length === 1);
expect('injected testing import is detected', injected.testing.length === 1);
expect('manifest engine dependency is detected', manifestEngineDeps({dependencies: {'@angular/animations': '22.1.7'}}).length === 1);
expect('recipe entry is detected', recipeKeys(['./legacy-dialog', './legacy-dialog/animations']).join(',') === './legacy-dialog/animations');

const scratch = mkdtempSync(join(tmpdir(), 'engine-free-reg-'));
const packageDir = join(scratch, 'package', 'fesm2022');
mkdirSync(packageDir, {recursive: true});
writeFileSync(join(scratch, 'package/package.json'), JSON.stringify({
  name: '@ngx-compat/material-legacy',
  version: '22.0.0-rc.0',
  exports: {'./legacy-button': {default: './fesm2022/button.mjs'}},
}));
writeFileSync(join(packageDir, 'button.mjs'), "import {animate} from '@angular/animations';\nexport const x = 1;\n");
const tarPath = join(scratch, 'library.tgz');
const packed = spawnSync('tar', ['-czf', tarPath, '-C', scratch, 'package'], {encoding: 'utf8'});
expect('bad tar built', packed.status === 0, packed.stderr);
const fixed = join(root, 'compatibility/rc/reports/engine-free-consumer.json');
const before = readFileSync(fixed);
const scanned = spawnSync(process.execPath, ['scripts/engine-free-consumer.mjs', '--tarball', tarPath], {cwd: root, encoding: 'utf8'});
expect('injected engine import exits 1', scanned.status === 1, scanned.stderr);
expect('standalone failure does not rewrite the fixed report', readFileSync(fixed).equals(before));
const git = args => spawnSync('git', args, {cwd: root, encoding: 'utf8'}).stdout.trim();
const binding = {run_id: 'engine-free-regression', source_commit: git(['rev-parse', 'HEAD']), source_tree: git(['rev-parse', 'HEAD^{tree}']), source_line: 'main'};
const forgedDir = join(scratch, 'evidence', 'engine-free-consumer', 'regression-invocation');
mkdirSync(forgedDir, {recursive: true});
const forged = spawnSync(process.execPath, ['scripts/engine-free-consumer.mjs', '--tarball', tarPath], {
  cwd: root,
  encoding: 'utf8',
  env: {
    ...process.env,
    RC_CHECK_ID: 'engine-free-consumer',
    RC_RUN_ID: binding.run_id,
    RC_INVOCATION_ID: 'regression-invocation',
    RC_EVIDENCE_BINDING: JSON.stringify({...binding, source_commit: 'f'.repeat(40)}),
    RC_ASSERTION_OUTPUT_DIR: forgedDir,
  },
});
expect('forged engine-free identity exits 2', forged.status === 2, forged.stderr);
expect('forged identity leaves the fixed report', readFileSync(fixed).equals(before));
rmSync(scratch, {recursive: true, force: true});
if (failures.length) {
  console.error(`${failures.length} engine-free regression(s) failed`);
  process.exit(1);
}
console.log('engine-free regressions passed');
