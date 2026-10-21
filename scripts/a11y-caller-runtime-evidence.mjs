/**
 * @license
 * Copyright Google LLC All Rights Reserved.
 * Copyright (c) 2026 Ryan Lester.
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.io/license
 */
/** Bounded SDK/owned caller runtime evidence; native and packed gates stay separate. */
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {createHash} from 'node:crypto';
import {join} from 'node:path';
import {qualifiedA11yCallerTypes} from './a11y-caller-type-evidence.mjs';

const hash = bytes => createHash('sha256').update(bytes).digest('hex');
const raw = root => path => readFileSync(join(root, path));
const pins = {
  main: {path: 'compatibility/rc/a11y-caller-runtime-main.json', sha256: '32ec7f4538c0d1c060388c327cac6b2df8a1122177cb493ed94239d049091e9b'},
  '21.x': {path: 'compatibility/rc/a11y-caller-runtime-21.json', sha256: '824adccb87c998cd1399e38b2809688ed37bb77dba81f706e23253bafd6ebfb3'},
};
const publicCases = [
  'public-module-color-protocol-0',
  'real-aria-shared-reference-and-removal',
  'real-aria-literal-text-and-label-suppression',
  'real-announcer-numeric-second-argument',
  'real-announcer-deferred-default-and-clear',
  'real-announcer-politeness-duration-and-modal-ownership',
  'real-checker-visible-disabled-controls',
  'real-focus-trap-anchor-focus-and-destruction',
  'real-child-injector-destroys-live-region',
  'public-module-color-protocol-1',
  'public-module-color-protocol-2',
];
const ownedCases = [
  'owned-initial-focus-real-factory-and-checker',
  'owned-fallback-promise-and-cancellation',
  'owned-selector-tabindex-restore-with-real-checker',
  'owned-consumer-factory-fault-still-destroys-selection',
];
const faults = {
  'temporary-selection-inserts-anchors': 'temporary selection must not insert anchors',
  'canceled-fallback-steals-focus': 'owned-cancellation-preserves-focus',
  'selector-skips-temporary-tabindex': 'owned-selector-temporary-tabindex',
  'focused-selection-not-notified': 'owned-initial-focus-notification',
  'throwing-selection-not-destroyed': 'owned-throwing-selection-cleanup',
  'common-module-omits-a11y': 'owned-common-module-a11y-initialization',
};

export function qualifiedA11yCallerRuntime({root = process.cwd(), read = raw(root)} = {}) {
  const types = qualifiedA11yCallerTypes({root, read});
  const line = types.source.prior.line, ref = pins[line], bytes = read(ref.path);
  assert.equal(hash(bytes), ref.sha256, 'changed a11y runtime proof');
  const proof = JSON.parse(bytes);
  assert.equal(proof.schema_version, 1);
  assert.equal(proof.line, line);
  assert.deepEqual(proof.typed_boundary, types.ref);
  assert.equal(proof.prototype_only, false);
  assert.equal(proof.SDK_source_rewrites, false);
  assert.equal(proof.source_closures, 0);
  assert.equal(proof.actual_native_packed_AOT_or_full_floor_qualified, false);
  assert.equal(proof.g11_claim, 'not-passed');
  assert.equal(proof.node, 'v22.23.3'); // Diagnostic host, not the pinned private toolchain.
  assert.equal(proof.typescript, line === 'main' ? '6.0.3' : '5.9.2');

  const inputs = new Map();
  for (const member of proof.inputs) {
    assert.equal(inputs.has(member.path), false, 'duplicate a11y runtime input');
    inputs.set(member.path, member.sha256);
    assert.equal(hash(read(member.path)), member.sha256, 'changed a11y runtime input ' + member.path);
    assert.ok(!member.path.includes('snack-dom-source-context'), 'mutable shared-owner runtime dependency');
  }
  for (const member of [...types.proof.inputs, types.ref]) {
    assert.equal(inputs.get(member.path), member.sha256, 'missing typed runtime dependency ' + member.path);
  }
  for (const path of ['scripts/api-public-node-context.mjs', 'tests/a11y_caller_node_protocol.mjs',
    'tests/a11y_caller_runtime_subject.mjs', 'tests/a11y_caller_runtime_probe.mjs']) {
    assert.equal(inputs.get(path), hash(read(path)), 'missing runtime execution input ' + path);
  }

  const versions = {original: ['16.2.12', '16.2.14'], main: ['22.1.7', '22.1.7'],
    '21.x': ['21.2.23', '21.2.14']};
  assert.equal(proof.runtime_subjects.length, 6);
  const contexts = new Set();
  const reference = proof.runtime_subjects.find(s => s.line === 'original' && s.mode === 'development');
  assert.ok(reference);
  let cases = 0;
  for (const subject of proof.runtime_subjects) {
    const key = subject.line + ':' + subject.mode, own = subject.line === line;
    assert.equal(contexts.has(key), false, 'duplicate runtime context');
    contexts.add(key);
    assert.deepEqual([subject.Core, subject.CDK], versions[subject.line]);
    assert.equal(subject.public_application_and_injectors, true);
    assert.equal(subject.SDK_source_rewrites, false);
    assert.equal(subject.actual_owned_common_module_factory, own);
    assert.equal(subject.actual_owned_initial_focus_module, own);
    assert.equal(subject.consumer_factory_fault_is_an_explicit_payload_protocol, true);
    assert.equal(subject.DOM_visibility_color_renderer_and_Reflect_metadata_are_protocols, true);
    assert.equal(subject.actual_native_packed_AOT_or_full_floor_qualified, false);
    assert.deepEqual(subject.high_contrast_enum.values, {NONE: 0, BLACK_ON_WHITE: 1, WHITE_ON_BLACK: 2});
    assert.match(subject.high_contrast_enum.sha256, /^[0-9a-f]{64}$/);
    assert.deepEqual(Object.keys(subject.borrowed).sort(), ['rxjs', 'tslib', 'zone.js']);
    for (const [name, version] of [['rxjs', '7.8.2'], ['tslib', '2.8.1'], ['zone.js', '0.16.3']]) {
      assert.equal(subject.borrowed[name].version, version);
      assert.ok(subject.borrowed[name].root.startsWith('/'));
    }
    const expected = [...publicCases];
    if (own) expected.splice(8, 0, ...ownedCases);
    assert.deepEqual(subject.cases, expected);
    cases += subject.cases.length;
    for (const name of ['aria', 'announcer', 'focus']) {
      assert.deepEqual(subject.observations[name], reference.observations[name], 'public behavior drift ' + key);
      assert.equal(subject.observations[name].length, 1);
      assert.ok(Object.values(subject.observations[name][0]).every(value => value === true));
    }
    assert.deepEqual(subject.observations.highContrast, [0, 1, 2].map(mode =>
      ({mode, active: mode !== 0, ownedCommonModuleFactory: own})));
    assert.deepEqual(subject.observations.owned, own ? [{realServices: true,
      selectionNeverAttachesAnchors: true, cancellation: true, promiseFallback: true,
      temporaryTabindexRestored: true, consumerFactoryFaultCleanup: true}] : []);
  }
  for (const model of Object.keys(versions)) for (const mode of ['development', 'production']) {
    assert.ok(contexts.has(model + ':' + mode));
  }
  assert.equal(cases, 74);
  assert.equal(proof.owned_source_faults.length, 6);
  assert.deepEqual(proof.owned_source_faults.map(f => f.id).sort(), Object.keys(faults).sort());
  for (const fault of proof.owned_source_faults) {
    assert.equal(fault.line, line);
    assert.equal(fault.rejected, true);
    assert.equal(fault.assertion, faults[fault.id]);
    assert.equal(fault.exit_status, 1);
    assert.equal(fault.signal, null);
    assert.equal(fault.rejection, 'actual-owned-helper-or-module-observation');
  }
  return {types, source: types.source, proof, ref, cases,
    source_closures_prepared: 0, actual_native_packed_AOT_or_full_floor_qualified: false};
}
