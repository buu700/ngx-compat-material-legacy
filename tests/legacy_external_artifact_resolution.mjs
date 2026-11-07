/**
 * @license
 * Copyright Google LLC All Rights Reserved.
 * Copyright (c) 2026 Ryan Lester.
 * Use of this source code is governed by the MIT license in LICENSE.
 */
/** Integration coverage for peer resolution from an externally extracted artifact. */
import assert from 'node:assert/strict';
import {spawnSync} from 'node:child_process';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import {fileURLToPath} from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const temp = fs.mkdtempSync(path.join(os.tmpdir(), 'legacy-external-resolution-'));
try {
  const workspace = path.join(temp, 'workspace');
  const runner = path.join(workspace, 'testing/legacy-runner');
  const artifact = path.join(temp, 'outside/package');
  const write = (file, data) => {
    fs.mkdirSync(path.dirname(file), {recursive: true});
    fs.writeFileSync(file, data);
  };
  fs.mkdirSync(runner, {recursive: true});
  for (const file of ['build.mjs', 'adapt-spec.mjs']) {
    fs.copyFileSync(path.join(root, 'testing/legacy-runner', file), path.join(runner, file));
  }
  fs.symlinkSync(path.join(root, 'node_modules'), path.join(workspace, 'node_modules'), 'dir');
  const candidate = 'projects/ngx-material-legacy/legacy-fixture/fixture.spec.ts';
  write(path.join(runner, 'historical-inventory.json'), JSON.stringify({rows: [{family: 'fixture', candidate}]}));
  write(path.join(runner, 'historical-specs.json'), JSON.stringify([{candidate, historical_path: 'fixture.spec.ts'}]));
  write(path.join(workspace, candidate), "import {marker} from '@fixture/legacy'; globalThis.fixtureMarker = marker;\n");
  for (const file of ['testing/legacy-runner/init-test-env.ts', 'testing/legacy-runner/specs/discovery.spec.ts', 'testing/legacy-runner/specs/deliberate-fail.spec.ts']) {
    write(path.join(workspace, file), 'export {};\n');
  }
  write(path.join(artifact, 'package.json'), JSON.stringify({name: '@fixture/legacy', exports: {'.': './index.mjs'}}));
  const artifactFile = path.join(artifact, 'index.mjs');
  const environment = Object.fromEntries(Object.entries(process.env).filter(([key]) => !key.startsWith('LEGACY_')));
  const run = () => spawnSync(process.execPath, [path.join(runner, 'build.mjs')], {
    cwd: workspace,
    env: {...environment, LEGACY_PACKAGE_ROOT: artifact, LEGACY_SUBJECT_MODE: 'artifact', LEGACY_SPEC_FAMILY: 'fixture'},
    encoding: 'utf8',
  });
  write(artifactFile, `import {VERSION} from '@angular/core';
import {CommonModule} from '@angular/common';
import {ComponentHarness} from '@angular/cdk/testing';
export const marker = ['external-artifact-marker', VERSION, CommonModule, ComponentHarness];\n`);
  const success = run();
  assert.equal(success.status, 0, success.stderr);
  const bundle = fs.readFileSync(path.join(runner, 'out/legacy-tests.iife.js'), 'utf8');
  assert.match(bundle, /external-artifact-marker/);
  assert.match(bundle, /CommonModule/);
  write(artifactFile, "import '@missing-peer/never-exists'; export const marker = 1;\n");
  const missing = run();
  assert.notEqual(missing.status, 0);
  assert.match(missing.stderr, /Could not resolve "@missing-peer\/never-exists"/);
  const fallback = path.join(workspace, 'dist/ngx-material-legacy/fallback.js');
  write(fallback, 'export const fallback = 1;\n');
  write(artifactFile, `export {fallback as marker} from ${JSON.stringify(fallback)};\n`);
  const rejected = run();
  assert.notEqual(rejected.status, 0);
  assert.match(rejected.stderr, /artifact mode refused workspace-dist import/);
  console.log('External artifact resolution, missing peer, and workspace fallback checks passed.');
} finally {
  fs.rmSync(temp, {recursive: true, force: true});
}
