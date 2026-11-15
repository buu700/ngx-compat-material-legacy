/**
 * @license
 * Copyright Google LLC All Rights Reserved.
 * Copyright (c) 2026 Ryan Lester.
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.io/license
 */
import assert from 'node:assert/strict';
import {mkdtempSync, mkdirSync, readFileSync, writeFileSync, rmSync, symlinkSync, readdirSync} from 'node:fs';
import {dirname, join, resolve} from 'node:path';
import {tmpdir} from 'node:os';
import {copyCheckerModules} from './artifact-behavior-fixture.mjs';

const scratch = mkdtempSync(join(tmpdir(), 'checker-closure-test-'));
const source = join(scratch, 'source'), output = join(scratch, 'output');
const put = (path, bytes) => {const target = join(source, path); mkdirSync(dirname(target), {recursive: true}); writeFileSync(target, bytes);};
const entry = 'scripts/check-upstream-audit-disposition.mjs';
const run = () => {rmSync(output, {recursive: true, force: true}); copyCheckerModules(source, output);};
try {
  // Validate the real current closure as well as a minimal controlled graph.
  const actual = join(scratch, 'actual'); copyCheckerModules(resolve('.'), actual);
  const walk = dir => readdirSync(dir, {withFileTypes: true}).flatMap(d => d.isDirectory() ? walk(join(dir, d.name)) : [join(dir, d.name)]);
  for (const file of walk(actual)) assert.deepEqual(readFileSync(file), readFileSync(join(resolve('.'), file.slice(actual.length + 1))));
  assert.deepEqual(readFileSync(join(actual, 'testing/datepicker-inherited/contracts-fixture.mjs')), readFileSync('testing/datepicker-inherited/contracts-fixture.mjs'));

  for (const path of ['scripts/browser-reference-proposal.mjs', 'scripts/revalidate-typeahead.mjs',
    'scripts/measure-sass-inspection-scope.mjs', 'compatibility/rc/matrices/library-exports.json',
    ...['parallel-spinner-snack-css-contract-inputs-v1.json', 'ordinary-checkbox-button-legacy-composition-cases-v1.json',
      'ordinary-checkbox-button-legacy-composition-known-before-v1.json', 'ordinary-card-c04-successor-inputs-v1.json',
      'ordinary-card-public-bridge-original-cases-v1.json', 'current-sass-legacy-retention-reference-v1.json']
      .map(name => 'compatibility/rc/' + name)]) put(path, 'fixture-only eager data\n');
  const original = "import './nested.mjs';\nexport * from '../testing/overlay-inherited/contracts-fixture.mjs';\n";
  put(entry, original); put('scripts/nested.mjs', "export * from '../compatibility/rc/ordinary-card-public-bridge-model-v1.mjs';\n");
  put('testing/overlay-inherited/contracts-fixture.mjs', 'export const overlay = true;\n');
  put('compatibility/rc/ordinary-card-public-bridge-model-v1.mjs', 'export const card = true;\n');
  run();
  for (const path of [entry, 'scripts/browser-reference-proposal.mjs', 'scripts/nested.mjs', 'testing/overlay-inherited/contracts-fixture.mjs', 'compatibility/rc/ordinary-card-public-bridge-model-v1.mjs']) {
    assert.deepEqual(readFileSync(join(output, path)), readFileSync(join(source, path)));
  }
  for (const specifier of ['../../outside.mjs', '../testing/unowned.mjs', '../compatibility/rc/unowned.mjs']) {
    put(entry, `import '${specifier}';\n`); assert.throws(run, /Unexpected checker import/);
  }
  put(entry, original);
  const target = join(source, 'testing/overlay-inherited/contracts-fixture.mjs');
  rmSync(target); symlinkSync(join(scratch, 'outside.mjs'), target);
  assert.throws(run, /Symlink in checker import/);
  rmSync(target); put('testing/overlay-inherited/contracts-fixture.mjs', 'export const overlay = true;\n');
  const directory = join(source, 'testing/overlay-inherited'); rmSync(directory, {recursive: true});
  mkdirSync(join(scratch, 'replacement')); writeFileSync(join(scratch, 'replacement/contracts-fixture.mjs'), 'export {};\n');
  symlinkSync(join(scratch, 'replacement'), directory);
  assert.throws(run, /Symlink in checker import/);
  rmSync(directory); put('testing/overlay-inherited/contracts-fixture.mjs', 'export const overlay = true;\n');
  const data = join(source, 'scripts/browser-reference-proposal.mjs');
  rmSync(data); symlinkSync(join(scratch, 'outside.mjs'), data);
  assert.throws(run, /Symlink in checker import/);
  rmSync(data); put('scripts/browser-reference-proposal.mjs', 'fixture-only eager data\n');
  run(); assert.equal(readFileSync(join(output, entry), 'utf8'), original);
  assert.equal(readFileSync(join(source, entry), 'utf8'), original);
  console.log('checker module closure controls passed (fixture only)');
} finally {rmSync(scratch, {recursive: true, force: true});}
