/**
 * @license
 * Copyright Google LLC All Rights Reserved.
 * Copyright (c) 2026 Ryan Lester.
 * Use of this source code is governed by the MIT license in LICENSE.
 */
/**
 * Execute an explicit graph of local guards, without retaining any verdict.
 *
 * This scheduler grants no source, reader, projection or admission authority.
 * Maintained owners must supply their actual predicates and dependency nodes.
 * Their preflight/final predicates must be callback-free; consume predicates
 * must check every supplied byte they use against their captured judgments.
 * Predicates are synchronous, return undefined, and reject by throwing.
 * Integrators must prove that these local predicates cover the original guard.
 */
import assert from 'node:assert/strict';
import {types} from 'node:util';
import {createHash} from 'node:crypto';
import {readFileSync} from 'node:fs';
import {fileURLToPath} from 'node:url';

const loadedSourceImage = readFileSync(fileURLToPath(import.meta.url));
export const canonicalSourceGuardPlanLoadedImage = Object.freeze({path:'scripts/canonical-source-guard-plan.mjs',sha256:createHash('sha256').update(loadedSourceImage).digest('hex'),bytes:loadedSourceImage.length});
const fields = ['dependencies', 'preflight', 'consume', 'final'];
const descriptorFlags = ['enumerable', 'configurable', 'writable'];
const apply = Reflect.apply;

function descriptors(value, array = false) {
  assert.ok(value && typeof value === 'object' && !types.isProxy(value), 'proxy or missing guard metadata');
  assert.equal(Object.getPrototypeOf(value), array ? Array.prototype : Object.prototype, 'foreign guard metadata prototype');
  if (array) assert.ok(Array.isArray(value));
  const own = Object.getOwnPropertyDescriptors(value);
  for (const key of Reflect.ownKeys(own)) {
    assert.equal(typeof key, 'string');
    assert.ok(Object.hasOwn(own[key], 'value'), 'accessor guard metadata');
  }
  const expected = array ? [...Array(value.length).keys()].map(String).concat('length') : fields;
  assert.deepEqual(Reflect.ownKeys(own).sort(), expected.slice().sort(), 'unexpected guard metadata fields');
  return own;
}

function unchanged(value, before, array = false) {
  const now = descriptors(value, array);
  for (const key of Reflect.ownKeys(before)) {
    assert.equal(now[key].value, before[key].value, 'changed guard metadata ' + key);
    for (const flag of descriptorFlags) assert.equal(now[key][flag], before[key][flag], 'changed guard descriptor ' + key);
  }
}

/**
 * Nodes are identified by object identity, never by file, function or owner name.
 * Only the immutable execution graph is retained; all checks run on every call.
 * Mutable input descriptors are checked before and after execution. Predicates
 * use the isolated captured graph, so changing live metadata cannot redirect it.
 */
export function composeCanonicalSourceGuards(roots) {
  const rootDescriptors = descriptors(roots, true), ordered = [], active = new Set(), captured = new Map();
  const visit = node => {
    assert.equal(active.has(node), false, 'cyclic guard dependencies');
    if (captured.has(node)) return;
    const own = descriptors(node), dependencies = own.dependencies.value;
    const dependencyDescriptors = descriptors(dependencies, true);
    const predicates = Object.fromEntries(fields.slice(1).map(key => {
      const fn = own[key].value;
      assert.ok(typeof fn === 'function' && !types.isProxy(fn)
        && !types.isAsyncFunction(fn) && !types.isGeneratorFunction(fn), 'invalid synchronous local guard predicate');
      return [key, fn];
    }));
    active.add(node);
    for (let index = 0; index < dependencies.length; index++) visit(dependencyDescriptors[index].value);
    active.delete(node);
    const snapshot = Object.freeze({node, own, dependencies, dependencyDescriptors, ...predicates});
    captured.set(node, snapshot); ordered.push(snapshot);
  };
  assert.ok(roots.length > 0, 'empty guard plan');
  for (let index = 0; index < roots.length; index++) visit(rootDescriptors[index].value);
  const assertMetadata = () => {
    unchanged(roots, rootDescriptors, true);
    for (const snapshot of ordered) {
      unchanged(snapshot.node, snapshot.own);
      unchanged(snapshot.dependencies, snapshot.dependencyDescriptors, true);
    }
  };
  let running = false;
  const invoke = predicate => {
    // Never expose the private snapshot as a method receiver. Every predicate
    // must complete synchronously and signal rejection by throwing.
    assert.ok(apply(predicate, undefined, []) === undefined, 'guard predicate must return undefined synchronously');
  };
  return () => {
    assert.equal(running, false, 'reentrant guard plan');
    running = true;
    try {
      assertMetadata();
      for (const snapshot of ordered) invoke(snapshot.preflight);
      for (const snapshot of ordered) invoke(snapshot.consume);
      for (const snapshot of ordered) invoke(snapshot.final);
      assertMetadata();
    } finally {
      running = false;
    }
  };
}
