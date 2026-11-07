/**
 * @license
 * Copyright Google LLC All Rights Reserved.
 * Copyright (c) 2026 Ryan Lester.
 * Use of this source code is governed by the MIT license in LICENSE.
 */
/** Operates only on the isolated candidate fixture made by test_current_sass_source.py. */
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {readFileSync, writeFileSync} from 'node:fs';
import {join, resolve} from 'node:path';
import {createCurrentSassSource} from '../scripts/current-sass-source.mjs';

const root = resolve(process.argv[2]);
assert.ok(root.includes('ngx-current-sass-source-test-'));
const checks = [];
const check = (name, operation) => {operation(); checks.push(name);};
const context = createCurrentSassSource({root});
check('finite module identities', () => assert.equal(context.transitions.length, context.line==='main'?7:6));
for (const row of context.transitions) {
  check('qualify current ' + row.path, () => assert.equal(context.qualify(row.current).sha256, row.current.sha256));
  check('qualify before ' + row.path, () => assert.equal(context.qualify({path: row.path, ...row.before}).sha256, row.current.sha256));
  check('reject foreign hash ' + row.path, () => assert.throws(() => context.qualify({path: row.path, sha256: '0'.repeat(64)})));
  check('reject wrong size ' + row.path, () => assert.throws(() => context.qualify({...row.current, bytes: row.current.bytes + 1})));
}
check('unknown paths acquire no source identity', () => assert.equal(context.qualify({path: 'unowned.scss', sha256: '0'.repeat(64)}), null));
check('exposed descriptors cannot alter private source identities', () => {
  const before = structuredClone(context.transitions[0].current);
  context.descriptor.source_modules[0].sha256 = '0'.repeat(64);
  assert.equal(context.qualify(before).sha256, before.sha256);
  assert.throws(() => context.qualify({...before, sha256: '0'.repeat(64)}));
  context.assertCurrent();
  context.descriptor.source_modules[0].sha256 = before.sha256;
});
check('current source-set keys hash their current members', () => {
  for (const [key, rows] of Object.entries(context.source_sets)) assert.equal(createHash('sha256').update(JSON.stringify(rows)).digest('hex'), key);
  assert.equal(context.source_set_successors.length, Object.keys(context.source_sets).length);
});
check('reference accessor does not run', () => {
  let calls = 0;
  assert.throws(() => context.qualify({get path() {calls++; return context.transitions[0].path;}, sha256: '0'.repeat(64)}));
  assert.equal(calls, 0);
});
check('cold nonphysical reader rejects', () => assert.throws(() => createCurrentSassSource({root, read: () => Buffer.from('wrong')})));
for (const transition of context.transitions) check('late source mutation rejects ' + transition.path, () => {
  const path = transition.path, file = join(root, path), before = readFileSync(file);
  try {
    writeFileSync(file, Buffer.concat([before, Buffer.from('\n/* changed */\n')]));
    assert.throws(() => context.assertCurrent());
  } finally {writeFileSync(file, before);}
  context.assertCurrent();
});
check('last callback cannot mutate an earlier member', () => {
  let armed = false;
  const first = 'scripts/current-sass-source.mjs', file = join(root, first), before = readFileSync(file);
  const last = context.bound.at(-1).path;
  const guarded = createCurrentSassSource({root, read: path => {
    const bytes = readFileSync(join(root, path));
    if (armed && path === last) {armed = false; writeFileSync(file, Buffer.concat([before, Buffer.from('\n/* late */\n')]));}
    return bytes;
  }});
  try {armed = true; assert.throws(() => guarded.assertCurrent());}
  finally {writeFileSync(file, before);}
  guarded.assertCurrent();
});
console.log(JSON.stringify({line: context.line, checks, transitions: context.transitions, source_sets: context.source_sets,
  source_set_successors: context.source_set_successors,
  descriptor: context.descriptor,
  protected_bound_inputs: context.bound.length, actual_workspace_source_or_css_admission: false}));
