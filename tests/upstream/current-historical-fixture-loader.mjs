/**
 * @license
 * Copyright Google LLC All Rights Reserved.
 * Copyright (c) 2026 Ryan Lester.
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.io/license
 */
// Extend only the test fixture's finite checker import closure in memory. The
// archived fixture is byte-pinned by the historical source replay.
import assert from 'node:assert/strict';
import {readFileSync, realpathSync} from 'node:fs';
import path from 'node:path';
import {fileURLToPath, pathToFileURL} from 'node:url';

const scripts = realpathSync(path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../../scripts'));
const root = path.dirname(scripts);
const fixture = path.join(root, 'tests/upstream/artifact-behavior-fixture.mjs');
let source = readFileSync(fixture, 'utf8');
const oldGuard = "if (!next.startsWith(sourceRoot + '/scripts/')) throw Error('Unexpected checker import');";
const allowed = [
  'compatibility/rc/parallel-spinner-snack-public-bridge-integration-source-subject.mjs',
  'compatibility/rc/ordinary-checkbox-button-legacy-composition-model-v1.mjs',
  'compatibility/rc/ordinary-checkbox-button-expectation-model-v1.mjs',
  'compatibility/rc/ordinary-card-c04-successor-model-v1.mjs',
  'compatibility/rc/ordinary-card-public-bridge-model-v2.mjs',
  'compatibility/rc/ordinary-card-public-bridge-model-v1.mjs',
  'testing/overlay-inherited/contracts-fixture.mjs',
  'testing/table-inherited/contracts.mjs',
];
assert.equal(source.split(oldGuard).length, 2, 'fixture guard changed');
source = source.replace(oldGuard, `if (!next.startsWith(sourceRoot + '/scripts/') && !${JSON.stringify(allowed)}.some(p => next === sourceRoot + '/' + p)) throw Error('Unexpected checker import');`);
for (const name of ['authored-current-use-inventory', 'upstream-artifact-behavior-evidence', 'packed-consumer-evidence']) {
  const previous = `'../../scripts/${name}.mjs'`;
  assert.equal(source.split(previous).length, 2, 'fixture import changed');
  source = source.replace(previous, JSON.stringify(pathToFileURL(path.join(scripts, name + '.mjs')).href));
}
assert.equal(source.split('createRequire(import.meta.url)').length, 2, 'fixture require changed');
source = source.replace('createRequire(import.meta.url)', `createRequire(${JSON.stringify(pathToFileURL(fixture).href)})`);
const loaded = await import('data:text/javascript;base64,' + Buffer.from(source).toString('base64'));
export const {createFixture, hash} = loaded;
