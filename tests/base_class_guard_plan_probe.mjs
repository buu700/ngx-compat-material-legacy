/**
 * @license
 * Copyright Google LLC All Rights Reserved.
 * Copyright (c) 2026 Ryan Lester.
 * Use of this source code is governed by the MIT license in LICENSE.
 */
/** Actual prepared frame/source lifetime controls; no composed owner or compiler. */
import assert from 'node:assert/strict';
import {readFileSync, writeFileSync} from 'node:fs';
import {join} from 'node:path';
import admission from '../scripts/upstream-base-class-removal-admission.cjs';
import {baseClassRemovalCanonicalFrameSubject, baseClassRemovalOwnerSourceSubject} from '../scripts/base-class-removal-owner-source.mjs';
import {baseClassRemovalOwnerContext} from '../scripts/base-class-removal-canonical-stage.mjs';
import {readHistoricalContractRepairMember} from '../scripts/historical-contract-repair-source.mjs';

const root = process.cwd(), helper = 'scripts/canonical-source-guard-plan.mjs';
const transition = 'compatibility/rc/21x-base-class-owner-guard-plan-transition-v3.json';
const disk = path => readHistoricalContractRepairMember(root, path);
const helperBefore = disk(helper), inspectorBefore = Object.getOwnPropertyDescriptor(admission, 'inspectSource');
let calls = 0, onRead = () => {}, override = null, rejected = 0;
const read = path => {
  const actual = disk(path); calls++; onRead(path);
  return override?.(path, actual) ?? actual;
};
const reject = fn => {assert.throws(fn, error => error?.code === 'ERR_ASSERTION'); rejected++;};
const write = (path, bytes) => writeFileSync(join(root, path), bytes);
const reset = () => {onRead = () => {}; override = null; calls = 0;};

// The new dependency is checked before any supplied constructor callback.
for (const path of [helper, transition]) {
  const before = disk(path);
  write(path, Buffer.concat([before, Buffer.from('\n// cold helper drift\n')]));
  try {
    onRead = () => write(path, before);
    reject(() => baseClassRemovalCanonicalFrameSubject({root, read}));
    assert.equal(calls, 0);
  } finally {write(path, before); reset();}
}

// A source inspector already poisoned at entry cannot be restored by the
// frame constructor's first callback and then used as apparently current.
let constructorGetters = 0;
try {
  Object.defineProperty(admission, 'inspectSource', {configurable: true,
    get() {constructorGetters++; return inspectorBefore.value;}});
  onRead = () => Object.defineProperty(admission, 'inspectSource', inspectorBefore);
  reject(() => baseClassRemovalOwnerSourceSubject({root, read}));
  assert.equal(calls, 0); assert.equal(constructorGetters, 0);
} finally {Object.defineProperty(admission, 'inspectSource', inspectorBefore); reset();}

const owner = baseClassRemovalOwnerSourceSubject({root, read});
assert.equal(owner.source.facts.historical_source_bindings_revalidated, 715);
assert.ok(Object.isFrozen(owner.guardNode) && Object.isFrozen(owner.frames.guardNode));
assert.equal(owner.guardNode.dependencies.length, 1);
assert.ok(Object.isFrozen(owner.guardPlan));
assert.equal(owner.guardPlan.assertCurrent, owner.assertCurrent);
assert.equal(owner.guardPlan.node, owner.guardNode);
assert.ok(owner.frames.bound.some(ref => ref.path === transition));
const context = baseClassRemovalOwnerContext({root, read});
assert.ok(Object.isFrozen(context.guardPlan));
assert.equal(context.guardPlan.assertCurrent, context.assertCurrent);
assert.ok(Object.isFrozen(context.guardPlan.node));
context.assertCurrent(); reset();
assert.equal(owner.guardNode.dependencies[0], owner.frames.guardNode);
assert.ok(owner.frames.bound.some(ref => ref.path === helper && ref.bytes === helperBefore.length));
const sourceOnly = owner.source.bound.find(ref => ref.path.startsWith('projects/ngx-material-legacy/legacy-')
  && ref.path.endsWith('.ts') && !owner.frames.bound.some(frame => frame.path === ref.path));
assert.ok(sourceOnly, 'need an actual source-only member');

// A prepared guard checks every physical scope before the first callback.
for (const path of [helper, transition, sourceOnly.path]) {
  const before = disk(path); calls = 0;
  write(path, Buffer.concat([before, Buffer.from('\n// cold prepared drift\n')]));
  try {
    onRead = () => write(path, before);
    reject(owner.assertCurrent); assert.equal(calls, 0);
  } finally {write(path, before); reset();}
  owner.assertCurrent();
}

// Actual consumed frame and source bytes are still checked independently.
for (const target of [helper, transition, sourceOnly.path]) {
  override = (path, actual) => path === target ? Buffer.concat([actual, Buffer.from('\n// forged callback\n')]) : actual;
  try {reject(owner.assertCurrent);} finally {reset();}
  owner.assertCurrent();
}

// A last source callback can change an earlier frame-only dependency. All
// final physical checks must execute after the complete consume phase.
reset(); owner.assertCurrent(); const lastCallback = calls; assert.ok(lastCallback > 0);
calls = 0; let changed = false;
onRead = () => {
  if (calls === lastCallback) {
    write(helper, Buffer.concat([helperBefore, Buffer.from('\n// final source callback drift\n')])); changed = true;
  }
};
try {reject(owner.assertCurrent); assert.equal(changed, true);}
finally {write(helper, helperBefore); reset();}
owner.assertCurrent();

// Loaded inspector poisoning cannot be repaired by a first callback, and a
// final callback cannot leave the inspector poisoned after physical sweeps.
let getters = 0;
try {
  Object.defineProperty(admission, 'inspectSource', {configurable: true, get() {getters++; return inspectorBefore.value;}});
  calls = 0; onRead = () => Object.defineProperty(admission, 'inspectSource', inspectorBefore);
  reject(owner.assertCurrent); assert.equal(calls, 0); assert.equal(getters, 0);
} finally {Object.defineProperty(admission, 'inspectSource', inspectorBefore); reset();}
reset(); owner.assertCurrent(); const inspectorLast = calls; calls = 0;
onRead = () => {if (calls === inspectorLast) Object.defineProperty(admission, 'inspectSource', {...inspectorBefore, value() {}});};
try {reject(owner.assertCurrent);} finally {Object.defineProperty(admission, 'inspectSource', inspectorBefore); reset();}
owner.assertCurrent();

// The actual captured dependency and guard identities are part of the owner.
for (const [object, key] of [[owner.frames, 'guardNode'], [owner.frames, 'assertCurrent'], [owner.source, 'assertCurrent']]) {
  const descriptor = Object.getOwnPropertyDescriptor(object, key); let accesses = 0;
  try {
    Object.defineProperty(object, key, {configurable: true, enumerable: descriptor.enumerable,
      get() {accesses++; return descriptor.value;}});
    calls = 0; reject(owner.assertCurrent); assert.equal(calls, 0); assert.equal(accesses, 0);
  } finally {Object.defineProperty(object, key, descriptor); reset();}
  owner.assertCurrent();
}

// Each standalone narrow operation covers the complete physical frame while
// consuming just its exact current ledger; no operation envelope or cache.
const ledger = 'compatibility/f10/disposition-ledger/ledger.json';
const narrowCounts = [];
for (const [project, expected] of [[() => owner.frames.ledgerSubject().raw, disk(ledger)],
  [() => context.metadataRead(ledger), context.applied ? context.before : disk(ledger)]]) {
  reset(); const raw = project(); narrowCounts.push(calls);
  assert.ok(raw.equals(expected)); assert.equal(calls, 1);
  reset(); write(helper, Buffer.concat([helperBefore, Buffer.from('\n// cold prepared drift\n')]));
  try {
    onRead = () => write(helper, helperBefore);
    reject(project); assert.equal(calls, 0);
  } finally {write(helper, helperBefore); reset();}
  override = (path, actual) => path === ledger ? Buffer.concat([actual, Buffer.from('\n// forged callback\n')]) : actual;
  try {reject(project);} finally {reset();}
  onRead = () => write(helper, Buffer.concat([helperBefore, Buffer.from('\n// final source callback drift\n')]));
  try {reject(project);} finally {write(helper, helperBefore); reset();}
  project(); reset();
}
// Preserve full->narrow, narrow->full, narrow->narrow and dependency-plan
// reentrancy rejection; a caught nested failure must not poison the next run.
for (const [outer, inner] of [
  [owner.frames.assertCurrent, owner.frames.ledgerSubject],
  [owner.frames.ledgerSubject, owner.frames.assertCurrent],
  [owner.frames.ledgerSubject, owner.frames.ledgerSubject],
  [owner.assertCurrent, owner.frames.ledgerSubject],
]) {
  let nested = false;
  onRead = () => {if (!nested) {nested = true; reject(inner);}};
  try {outer(); assert.equal(nested, true);} finally {reset();}
  owner.frames.assertCurrent(); owner.frames.ledgerSubject(); reset();
}
assert.equal(rejected, 25); assert.equal(getters, 0);
assert.ok(readFileSync(join(root, helper)).equals(helperBefore));
console.log(JSON.stringify({result: 'pass', line: '21.x', actual_frame_and_source_owner_executed: true,
  actual_stage_context_executed: true, guard_plan_identity_forwarded: true,
  narrow_projection_callbacks: narrowCounts, narrow_reentrant_controls: 4,
  frame_members: owner.frames.bound.length, source_members: owner.source.bound.length,
  historical_source_bindings_revalidated: owner.source.facts.historical_source_bindings_revalidated,
  rejected_lifetime_faults: rejected, inspector_getters_invoked: getters + constructorGetters,
  source_only_path: sourceOnly.path, restoration_passed: true, constructor_full_guard_retained: true,
  full_composed_owner_executed: false, compiler_or_build_executed: false, g11_claim: 'not-passed'}));
