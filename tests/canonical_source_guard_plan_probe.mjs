/**
 * @license
 * Copyright Google LLC All Rights Reserved.
 * Copyright (c) 2026 Ryan Lester.
 * Use of this source code is governed by the MIT license in LICENSE.
 */
import assert from 'node:assert/strict';
import {test} from 'node:test';
import {mkdtempSync, readFileSync, writeFileSync, readdirSync, rmSync} from 'node:fs';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {composeCanonicalSourceGuards} from '../scripts/canonical-source-guard-plan.mjs';

function fixture(run) {
  const root = mkdtempSync(join(tmpdir(), 'canonical-guard-plan-'));
  try {
    const file = name => join(root, name);
    writeFileSync(file('base.ts'), 'base'); writeFileSync(file('later.ts'), 'later');
    const events = [], inspector = {inspect: () => 'original'}, inspect = inspector.inspect;
    let callback = () => {}, provided = name => readFileSync(file(name));
    const checkInspector = () => {
      const descriptor = Object.getOwnPropertyDescriptor(inspector, 'inspect');
      assert.ok(descriptor && Object.hasOwn(descriptor, 'value'), 'inspector accessor');
      assert.equal(descriptor.value, inspect, 'inspector identity');
    };
    const checkBase = () => {
      checkInspector(); assert.equal(readFileSync(file('base.ts'), 'utf8'), 'base');
      assert.deepEqual(readdirSync(root).sort(), ['base.ts', 'later.ts']);
    };
    const base = {dependencies: [], preflight: checkBase,
      consume: () => { events.push('base'); assert.ok(provided('base.ts').equals(Buffer.from('base'))); callback('base'); },
      final: checkBase};
    const later = {dependencies: [base],
      preflight: () => assert.equal(readFileSync(file('later.ts'), 'utf8'), 'later'),
      consume: () => { events.push('later'); assert.ok(provided('later.ts').equals(Buffer.from('later'))); callback('later'); },
      final: () => assert.equal(readFileSync(file('later.ts'), 'utf8'), 'later')};
    run({file, root, events, inspector, inspect, base, later,
      setCallback: fn => {callback = fn;}, setProvided: fn => {provided = fn;}});
  } finally { rmSync(root, {recursive: true, force: true}); }
}

test('all scopes preflight before callbacks; cold later input cannot be restored by first callback', () => fixture(f => {
  const guard = composeCanonicalSourceGuards([f.later]);
  writeFileSync(f.file('later.ts'), 'cold invalid');
  f.setCallback(() => writeFileSync(f.file('later.ts'), 'later'));
  assert.throws(guard); assert.deepEqual(f.events, []);
  writeFileSync(f.file('later.ts'), 'later'); guard();
}));

test('a later scope cannot leave an earlier scope changed; success is checked again on next call', () => fixture(f => {
  const guard = composeCanonicalSourceGuards([f.later]); guard();
  f.setCallback(scope => {if (scope === 'later') writeFileSync(f.file('base.ts'), 'late invalid');});
  assert.throws(guard);
  writeFileSync(f.file('base.ts'), 'base'); f.setCallback(() => {}); guard();
  assert.deepEqual(f.events, ['base', 'later', 'base', 'later', 'base', 'later']);
}));

test('late population/absence drift is rejected by the earlier final predicate', () => fixture(f => {
  const guard = composeCanonicalSourceGuards([f.later]);
  f.setCallback(scope => {if (scope === 'later') writeFileSync(f.file('new-owned.ts'), 'added');});
  assert.throws(guard); rmSync(f.file('new-owned.ts')); f.setCallback(() => {}); guard();
}));

test('cold and late loaded inspector poison is rejected without invoking its getter', () => fixture(f => {
  const guard = composeCanonicalSourceGuards([f.later]); let calls = 0;
  const poison = () => Object.defineProperty(f.inspector, 'inspect', {configurable: true, get() {calls++; return f.inspect;}});
  poison(); assert.throws(guard, /inspector accessor/); assert.deepEqual(f.events, []);
  Object.defineProperty(f.inspector, 'inspect', {configurable: true, writable: true, value: f.inspect});
  f.setCallback(scope => {if (scope === 'later') poison();});
  assert.throws(guard, /inspector accessor/); assert.equal(calls, 0);
}));

test('local predicates still reject a consumed nonphysical byte', () => fixture(f => {
  const guard = composeCanonicalSourceGuards([f.later]);
  f.setProvided(() => Buffer.from('forged')); assert.throws(guard);
  f.setProvided(name => readFileSync(f.file(name))); guard();
}));

test('shared dependency identity runs once per phase and every phase repeats on every call', () => {
  const events = [], node = name => ({dependencies: [],
    preflight: () => {events.push(name + ':pre');}, consume: () => {events.push(name + ':read');}, final: () => {events.push(name + ':final');}});
  const base = node('base'), left = node('left'), right = node('right');
  left.dependencies.push(base); right.dependencies.push(base);
  const guard = composeCanonicalSourceGuards([left, right]); guard(); guard();
  const once = ['base:pre', 'left:pre', 'right:pre', 'base:read', 'left:read', 'right:read', 'base:final', 'left:final', 'right:final'];
  assert.deepEqual(events, [...once, ...once]);
});

test('distinct instances sharing the same predicate function are not merged', () => {
  let calls = 0; const predicate = () => {calls++;};
  const node = () => ({dependencies: [], preflight: predicate, consume: predicate, final: predicate});
  composeCanonicalSourceGuards([node(), node()])(); assert.equal(calls, 6);
});

test('metadata accessors, proxies, sparse arrays and cycles fail without executing predicates', () => {
  let calls = 0; const fn = () => {calls++;};
  const node = () => ({dependencies: [], preflight: fn, consume: fn, final: fn});
  const accessor = node(); Object.defineProperty(accessor, 'consume', {get() {calls++; return fn;}});
  assert.throws(() => composeCanonicalSourceGuards([accessor]));
  assert.throws(() => composeCanonicalSourceGuards(new Proxy([node()], {get() {calls++;}})));
  assert.throws(() => composeCanonicalSourceGuards(Array(1)));
  const cycle = node(); cycle.dependencies.push(cycle);
  assert.throws(() => composeCanonicalSourceGuards([cycle]), /cyclic/);
  assert.throws(() => composeCanonicalSourceGuards([]), /empty/); assert.equal(calls, 0);
});

test('changing captured graph metadata cannot redirect checks, and is rejected at either boundary', () => {
  let originalCalls = 0, forgedCalls = 0;
  const node = {dependencies: [], preflight: () => {}, consume: () => {originalCalls++;}, final: () => {}};
  const roots = [node], guard = composeCanonicalSourceGuards(roots), original = node.consume;
  node.consume = () => {forgedCalls++;}; assert.throws(guard, /changed guard metadata/);
  node.consume = original;
  node.final = () => {node.consume = () => {forgedCalls++;};};
  assert.throws(guard, /changed guard metadata/); assert.equal(originalCalls, 0);
  node.final = () => {}; // A fresh plan captures the deliberately changed predicates.
  const consume = node.consume;
  node.final = () => {node.consume = () => {forgedCalls++;};};
  const fresh = composeCanonicalSourceGuards(roots); assert.throws(fresh, /changed guard metadata/);
  assert.equal(originalCalls, 1); assert.equal(forgedCalls, 0); node.consume = consume;
});

test('reentrancy fails closed and a failed invocation does not poison later calls', () => {
  let reenter = true, guard;
  const node = {dependencies: [], preflight: () => {}, consume: () => {if (reenter) guard();}, final: () => {}};
  guard = composeCanonicalSourceGuards([node]); assert.throws(guard, /reentrant/);
  reenter = false; guard();
});

test('a caught nested rejection does not skip outer final checks or taint a later valid call', () => fixture(f => {
  const guard = composeCanonicalSourceGuards([f.later]); let rejected = 0;
  f.setCallback(scope => {
    try {guard();} catch (error) {assert.match(error.message, /reentrant/); rejected++;}
    if (scope === 'later') writeFileSync(f.file('base.ts'), 'late invalid');
  });
  assert.throws(guard); assert.equal(rejected, 2);
  writeFileSync(f.file('base.ts'), 'base');
  f.setCallback(() => {assert.throws(guard, /reentrant/);}); guard();
}));

test('normal functions receive no private snapshot and cannot replace its final predicate', () => {
  let finalCalls = 0;
  const node = {dependencies: [], preflight: function () {assert.equal(this, undefined);},
    consume: function () {assert.equal(this, undefined);}, final: () => {finalCalls++;}};
  composeCanonicalSourceGuards([node])(); assert.equal(finalCalls, 1);
  node.consume = function () {this.final = () => {};};
  assert.throws(composeCanonicalSourceGuards([node]), TypeError); assert.equal(finalCalls, 1);
});

test('async/generator predicates are refused, and every actual return must be undefined', () => {
  let calls = 0;
  const node = consume => ({dependencies: [], preflight: () => {}, consume, final: () => {calls++;}});
  assert.throws(() => composeCanonicalSourceGuards([node(async function () {calls++;})]), /synchronous/);
  assert.throws(() => composeCanonicalSourceGuards([node(function* () {calls++;})]), /synchronous/);
  for (const value of [false, true, Promise.resolve(), {then() {calls++;}}, (function* () {})()]) {
    assert.throws(composeCanonicalSourceGuards([node(() => value)]), /return undefined synchronously/);
  }
  assert.equal(calls, 0);
});
