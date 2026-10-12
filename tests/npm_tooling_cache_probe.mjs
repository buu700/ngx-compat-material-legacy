/**
 * @license
 * Copyright Google LLC All Rights Reserved.
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.dev/license
 * Copyright (c) 2026 Ryan Lester.
 */
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {readFileSync} from 'node:fs';
import {createRequire} from 'node:module';
import {dirname, join, resolve} from 'node:path';
import {fileURLToPath} from 'node:url';
import {assessNativeMotionCache, nativeMotionCacheStamp, readNativeMotionLinkedTooling} from '../scripts/native-motion-run.mjs';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const ts = createRequire(import.meta.url)('typescript');
const profile = readFileSync(join(root, 'scripts/npm-tooling-options.mjs'), 'utf8');
const linked = readNativeMotionLinkedTooling();
assert.equal(linked.npmProfile, profile);

for (const zoneless of [false, true]) {
  const identity = {dependencies: {}, npmrc: '', tsconfig: {}, source: '', theme: '',
    linkedTooling: linked, zoneless, tarball: 'packed-artifact-marker'};
  const stamp = nativeMotionCacheStamp(identity);
  const previous = {...identity, linkedTooling: {...linked}};
  delete previous.linkedTooling.npmProfile;
  const changed = {...identity, linkedTooling: {...linked, npmProfile: profile + '\n'}};
  assert.notEqual(nativeMotionCacheStamp(previous), stamp);
  assert.notEqual(nativeMotionCacheStamp(changed), stamp);
  assert.equal(assessNativeMotionCache({...previous, stamp, bundles: {app: true, theme: true}}, {...identity, stamp}), false);
  assert.equal(assessNativeMotionCache({...identity, stamp, bundles: {app: true, theme: true}}, {...changed, stamp}), false);
}

// Evaluate only the production cache-hash expression, never its install/build path.
const path = join(root, 'scripts/browser-required-cells.mjs');
const sf = ts.createSourceFile(path, readFileSync(path, 'utf8'), ts.ScriptTarget.Latest, true, ts.ScriptKind.JS);
const build = sf.statements.find(node => ts.isFunctionDeclaration(node) && node.name?.text === 'buildConsumer');
assert.ok(build);
const declarations = [];
function find(node) {
  if (ts.isVariableDeclaration(node) && node.name.getText(sf) === 'stamp') declarations.push(node);
  ts.forEachChild(node, find);
}
find(build);
assert.equal(declarations.length, 1);
const expression = declarations[0].initializer.getText(sf);
const evaluate = new Function('createHash', 'versions', 'spec', 'readFileSync', 'probePath', 'zoneless', 'join', 'root', 'return (' + expression + ');');
for (const zoneless of [false, true]) {
  const compute = content => evaluate(createHash, {}, {dependencies: {}, npmrc: '', tsconfig: {}, labSource: '', themeSource: ''},
    file => file === join(root, 'scripts/npm-tooling-options.mjs') ? content : 'probe-marker',
    'probe-path', zoneless, join, root);
  assert.notEqual(compute(profile), compute(profile + '\n'));
}
console.log(JSON.stringify({result: 'pass', native_motion_runtime_variants: 2,
  required_browser_runtime_variants: 2, stale_profile_cache_controls: 8,
  npm_installs_or_builds_executed: false}));
