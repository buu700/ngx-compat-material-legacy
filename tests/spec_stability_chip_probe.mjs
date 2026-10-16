/**
 * @license
 * Copyright Google LLC All Rights Reserved.
 * Copyright (c) 2026 Ryan Lester.
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.io/license
 */
/** Execute the actual owned method with real public query/key-manager objects, not an Angular view. */
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {createRequire} from 'node:module';
import {readFileSync, writeFileSync} from 'node:fs';
import {dirname, resolve} from 'node:path';
import {fileURLToPath, pathToFileURL} from 'node:url';
import {CHIP_SOURCE, CHIP_SPEC, chipRepairPair, inspectChipEmptyRepair} from '../scripts/spec-stability-chip-repair.mjs';
const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const require = createRequire(import.meta.url), ts = require('typescript');
const read = path => readFileSync(resolve(root, path)), hash = bytes => createHash('sha256').update(bytes).digest('hex');
await import(pathToFileURL(require.resolve('@angular/compiler')).href);
const {QueryList} = await import(pathToFileURL(require.resolve('@angular/core')).href);
const {FocusKeyManager} = await import(pathToFileURL(require.resolve('@angular/cdk/a11y')).href);
const source = inspectChipEmptyRepair({root}), pair = chipRepairPair({root});
function method(text) {
  const file = ts.createSourceFile(CHIP_SOURCE, text, ts.ScriptTarget.Latest, true), found = [];
  assert.equal(file.parseDiagnostics.length, 0);
  function visit(node) {
    if (ts.isMethodDeclaration(node) && node.name.getText(file) === '_updateFocusForDestroyedChips') found.push(node);
    ts.forEachChild(node, visit);
  }
  visit(file); assert.equal(found.length, 1); return found[0].getText(file);
}
async function loadOwnedMethod(text) {
  const code = ts.transpileModule('export class OwnedMethodSubject {' + method(text) + '}',
    {compilerOptions: {target: ts.ScriptTarget.ES2022, module: ts.ModuleKind.ES2022}}).outputText;
  return (await import('data:text/javascript;base64,' + Buffer.from(code).toString('base64'))).OwnedMethodSubject;
}
function exercise(Subject, mode) {
  const query = new QueryList(), focusCalls = [0, 0, 0];
  const items = focusCalls.map((_, index) => ({disabled: false, focus() { focusCalls[index]++; }}));
  query.reset(items); query.notifyOnChanges();
  const manager = new FocusKeyManager(query), index = mode === 'neighbor-tail' ? 2 : 1;
  manager.updateActiveItem(index); const removed = items[index];
  let events = 0, refocus = 0;
  const subscription = manager.change.subscribe(() => events++), subject = new Subject();
  const empty = mode.startsWith('empty-'), neighbor = mode.startsWith('neighbor-');
  Object.assign(subject, {chips: query, _keyManager: manager,
    _lastDestroyedChipIndex: mode === 'empty-removed' || neighbor ? index : null,
    focus() { refocus++; }});
  try {
    if (empty || neighbor) { query.reset(empty ? [] : items.filter(n => n !== removed)); query.notifyOnChanges(); }
    subject._updateFocusForDestroyedChips();
    assert.equal(subject._lastDestroyedChipIndex, null);
    if (empty) {
      assert.equal(manager.activeItemIndex, -1, 'empty query retains an active index');
      assert.equal(manager.activeItem, null, 'empty query retains the destroyed chip');
      assert.equal(events, 0, 'internal empty reset must not emit a new selection change');
      assert.equal(refocus, mode === 'empty-removed' ? 1 : 0);
      query.reset([items[0], items[2]]); query.notifyOnChanges();
      subject._updateFocusForDestroyedChips(); assert.equal(manager.activeItem, null);
      manager.setFirstItemActive();
      assert.equal(manager.activeItem, items[0]); assert.notEqual(manager.activeItem, removed);
      assert.equal(manager.activeItemIndex, 0); assert.equal(focusCalls[0], 1);
    } else if (neighbor) {
      const expected = mode === 'neighbor-tail' ? items[1] : items[2];
      assert.equal(manager.activeItem, expected); assert.equal(manager.activeItemIndex, 1);
      assert.equal(focusCalls[items.indexOf(expected)], 1); assert.equal(refocus, 0);
      assert.equal(events, 1);
    } else {
      assert.equal(manager.activeItem, items[1]); assert.equal(manager.activeItemIndex, 1);
      assert.deepEqual(focusCalls, [0, 0, 0]); assert.equal(events, 0); assert.equal(refocus, 0);
    }
    return {mode, result: 'pass', real_public_QueryList_and_FocusKeyManager: true,
      owned_method_executed: true, full_component_or_DOM_instantiated: false};
  } finally { subscription.unsubscribe(); manager.destroy(); query.destroy(); }
}
const modes = ['empty-programmatic', 'empty-removed', 'neighbor-middle', 'neighbor-tail', 'unchanged'];
const Subject = await loadOwnedMethod(read(CHIP_SOURCE).toString());
const cases = modes.map(mode => exercise(Subject, mode));
const previous = await loadOwnedMethod(pair.rows.find(n => n.path === CHIP_SOURCE).before);
for (const mode of modes.slice(0, 2)) {
  assert.throws(() => exercise(previous, mode), /empty query retains/);
  cases.push({mode: 'authentic-before-method-' + mode, result: 'rejected'});
}
const noisy = read(CHIP_SOURCE).toString().replace('this._keyManager.updateActiveItem(-1);',
  'this._keyManager.setActiveItem(-1);');
assert.notEqual(noisy, read(CHIP_SOURCE).toString());
const NoisySubject = await loadOwnedMethod(noisy);
for (const mode of modes.slice(0, 2)) {
  assert.throws(() => exercise(NoisySubject, mode), /must not emit/);
  cases.push({mode: 'unexpected-change-event-' + mode, result: 'rejected'});
}
for (const [path, transform, id] of [
  [CHIP_SOURCE, text => text.replace('this.chips.length === 0', 'this.chips.length === 1'), 'wrong-reset-condition'],
  [CHIP_SPEC, text => text.replace('expect(keyManager.activeItem).toBeNull();', 'expect(keyManager.activeItem).toBeTruthy();'), 'weakened-retained-regression'],
  ['projects/ngx-material-legacy/legacy-chips/chip.ts', text => text + '\n', 'unrelated-product-edit'],
]) {
  const old = read(path).toString(), changed = transform(old); assert.notEqual(changed, old);
  assert.throws(() => inspectChipEmptyRepair({root, readMember: name => name === path ? Buffer.from(changed) : read(name)}));
  cases.push({mode: id, result: 'rejected'});
}
assert.equal(cases.length, 12);
const report = {schema_version: 1, line: source.line, source, controls: cases.length, cases,
  actual_owned_method_protocol_cases: 5, authentic_before_method_rejected: 2,
  unexpected_change_event_mutants_rejected: 2, source_delta_controls_rejected: 3,
  current_cases: 2223, preserved_cases: 2222, unchanged_product_members: 1139,
  public_dependency_specifiers: ['@angular/core', '@angular/cdk/a11y'],
  runtime: {node: process.version, typescript: ts.version, core: require('@angular/core/package.json').version,
    cdk: require('@angular/cdk/package.json').version, canonical_or_floor_qualified: false},
  sources: [CHIP_SOURCE, CHIP_SPEC, 'scripts/spec-stability-chip-repair.mjs'].map(path => ({path, sha256: hash(read(path))})),
  producer_sha256: hash(read('tests/spec_stability_chip_probe.mjs')),
  actual_Angular_DOM_artifact_or_floor_qualified: false, g11_claim: 'not-passed'};
const out = process.argv.indexOf('--out');
if (out >= 0) writeFileSync(process.argv[out + 1], JSON.stringify(report, null, 2) + '\n', {flag: 'wx'});
console.log(JSON.stringify({...report, cases: undefined, source: undefined}));
