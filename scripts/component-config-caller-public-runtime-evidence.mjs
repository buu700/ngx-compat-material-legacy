/**
 * @license
 * Copyright Google LLC All Rights Reserved.
 * Copyright (c) 2026 Ryan Lester.
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.io/license
 */
/** Observed SDK boundaries retain every difference; owned source decisions remain separate. */
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {createHash} from 'node:crypto';
import {join} from 'node:path';
import {isDeepStrictEqual} from 'node:util';
import {qualifiedComponentConfigTypes} from './component-config-caller-type-evidence.mjs';

const hash = bytes => createHash('sha256').update(bytes).digest('hex');
const raw = root => path => readFileSync(join(root, path));
const pins = {
  main: {path: 'compatibility/rc/component-config-caller-public-runtime-main.json', sha256: 'aebc3b7c9b146200d761da5e47eace1047cac0a487c3ed07afda1a1323b1d527'},
  '21.x': {path: 'compatibility/rc/component-config-caller-public-runtime-21.json', sha256: 'fe53b1e7a7f401778f9bccf2a9bdecd7d43a72ed7be52781198843dcfa6b5eed'},
};
const tokenNames = ['MAT_SELECT_TRIGGER', 'MAT_SELECT_CONFIG', 'MAT_SNACK_BAR_DATA',
  'MAT_SNACK_BAR_DEFAULT_OPTIONS', 'MAT_RADIO_GROUP', 'MAT_RADIO_DEFAULT_OPTIONS', 'MAT_LIST',
  'MAT_NAV_LIST', 'MAT_CHECKBOX_DEFAULT_OPTIONS', 'MAT_PROGRESS_SPINNER_DEFAULT_OPTIONS',
  'MAT_TOOLTIP_DEFAULT_OPTIONS', 'MAT_TOOLTIP_SCROLL_STRATEGY', 'MAT_AUTOCOMPLETE_DEFAULT_OPTIONS',
  'MAT_AUTOCOMPLETE_SCROLL_STRATEGY'];
const undefinedValue = {kind: 'undefined'};
function currentSnackConfig(reference) {
  return {...reference, politeness: 'polite', viewContainerRef: undefinedValue,
    panelClass: undefinedValue, direction: undefinedValue};
}

export function qualifiedComponentConfigPublicRuntime({root = process.cwd(), read = raw(root)} = {}) {
  const types = qualifiedComponentConfigTypes({root, read}), line = types.source.prior.line, ref = pins[line];
  const bytes = read(ref.path);
  assert.equal(hash(bytes), ref.sha256, 'changed public configuration runtime proof');
  const proof = JSON.parse(bytes);
  assert.equal(proof.line, line);
  assert.deepEqual(proof.typed_boundary, types.ref);
  assert.equal(proof.prototype_only, false);
  assert.equal(proof.SDK_source_rewrites, false);
  assert.equal(proof.actual_owned_callers_executed, false);
  assert.equal(proof.source_closures, 0);
  assert.equal(proof.actual_native_packed_AOT_or_full_floor_qualified, false);
  assert.equal(proof.g11_claim, 'not-passed');
  const inputs = new Map();
  for (const member of proof.inputs) {
    assert.equal(inputs.has(member.path), false, 'duplicate public runtime input');
    inputs.set(member.path, member.sha256);
    assert.equal(hash(read(member.path)), member.sha256, 'changed public runtime input ' + member.path);
    assert.ok(!member.path.includes('snack-dom-source-context'), 'mutable source owner in public runtime proof');
  }
  for (const member of [types.ref, ...types.proof.inputs]) {
    assert.equal(inputs.get(member.path), member.sha256, 'missing type dependency in public runtime proof');
  }
  for (const path of ['scripts/component-config-caller-type-evidence.mjs',
    'scripts/api-public-node-context.mjs', 'tests/a11y_caller_node_protocol.mjs',
    'tests/component_config_caller_public_runtime_subject.mjs', 'tests/component_config_caller_public_runtime_probe.mjs']) {
    assert.equal(inputs.get(path), hash(read(path)), 'missing public runtime implementation input');
  }
  assert.equal(proof.runtime_subjects.length, 6);
  const reference = proof.runtime_subjects.find(subject => subject.line === 'original' && subject.mode === 'development');
  assert.ok(reference);
  const expectedCurrentDefaults = {...reference.observations.defaults,
    MAT_AUTOCOMPLETE_DEFAULT_OPTIONS: {...reference.observations.defaults.MAT_AUTOCOMPLETE_DEFAULT_OPTIONS, hasBackdrop: false},
    MAT_RADIO_DEFAULT_OPTIONS: {...reference.observations.defaults.MAT_RADIO_DEFAULT_OPTIONS, disabledInteractive: false},
    MAT_CHECKBOX_DEFAULT_OPTIONS: {...reference.observations.defaults.MAT_CHECKBOX_DEFAULT_OPTIONS, disabledInteractive: false},
    MAT_SNACK_BAR_DEFAULT_OPTIONS: currentSnackConfig(reference.observations.defaults.MAT_SNACK_BAR_DEFAULT_OPTIONS)};
  assert.equal(reference.observations.defaults.MAT_SNACK_BAR_DEFAULT_OPTIONS.politeness, 'assertive');
  const versions = {original: ['16.2.12', '16.2.14'], main: ['22.1.7', '22.1.7'], '21.x': ['21.2.23', '21.2.14']};
  const contexts = new Set(), differences = [];
  let cases = 0;
  for (const subject of proof.runtime_subjects) {
    const key = subject.line + ':' + subject.mode;
    assert.equal(contexts.has(key), false);
    contexts.add(key);
    assert.deepEqual([subject.Core, subject.Material], versions[subject.line]);
    for (const field of ['actual_public_application_and_injectors', 'actual_public_classes_and_factories',
      'public_scroll_service_overrides_are_explicit_payload_protocols',
      'DOM_visibility_renderer_and_borrowed_Zone_are_protocols']) assert.equal(subject[field], true);
    for (const field of ['SDK_source_rewrites', 'actual_owned_callers_executed',
      'actual_native_packed_AOT_or_full_floor_qualified']) assert.equal(subject[field], false);
    assert.equal(subject.cases.length, 35);
    assert.equal(new Set(subject.cases).size, 35);
    cases += subject.cases.length;
    assert.equal(subject.observations.tokens.length, 14);
    assert.deepEqual(subject.observations.tokens.map(token => token.name), tokenNames);
    assert.deepEqual(subject.observations.tokens, reference.observations.tokens);
    assert.equal(subject.observations.childProviderOverridesPreserveOwnerIdentity, true);
    assert.deepEqual(subject.observations.scroll, reference.observations.scroll);
    assert.equal(subject.observations.scroll.SCROLL_THROTTLE_MS, 20);
    for (const name of ['MAT_TOOLTIP_SCROLL_STRATEGY', 'MAT_AUTOCOMPLETE_SCROLL_STRATEGY']) {
      assert.deepEqual(subject.observations.scroll[name], {dispatcherSubscriptions: 1,
        throttle: name === 'MAT_TOOLTIP_SCROLL_STRATEGY' ? 20 : 0, singletonFactory: true,
        distinctStrategyInstances: true, actualStrategyUpdatesOwner: true, disablingStopsUpdates: true});
    }
    assert.deepEqual(subject.observations.paginator, reference.observations.paginator);
    assert.equal(subject.observations.paginator.ranges.length, 8);
    assert.equal(subject.observations.paginator.realChangeSubjectAndUnsubscription, true);
    assert.equal(subject.observations.paginator.manualConstructorOutsideDI, true);
    assert.equal(subject.observations.paginator.mutableLabelsAndRange, true);
    assert.deepEqual(subject.observations.defaults,
      subject.line === 'original' ? reference.observations.defaults : expectedCurrentDefaults);
    assert.deepEqual(subject.observations.dataClasses, subject.line === 'original' ?
      reference.observations.dataClasses : {...reference.observations.dataClasses,
        MatSnackBarConfig: currentSnackConfig(reference.observations.dataClasses.MatSnackBarConfig)});
    for (const boundary of ['defaults', 'scroll', 'paginator', 'dataClasses']) {
      if (!isDeepStrictEqual(subject.observations[boundary], reference.observations[boundary])) {
        differences.push({line: subject.line, mode: subject.mode, boundary,
          reference: reference.observations[boundary], current: subject.observations[boundary]});
      }
    }
    for (const [name, version] of [['rxjs', '7.8.2'], ['tslib', '2.8.1'], ['zone.js', '0.16.3']]) {
      assert.equal(subject.borrowed[name].version, version);
      assert.ok(subject.borrowed[name].root.startsWith('/'));
    }
  }
  for (const model of Object.keys(versions)) for (const mode of ['development', 'production']) {
    assert.ok(contexts.has(model + ':' + mode));
  }
  assert.equal(cases, 210);
  assert.equal(differences.length, 8);
  assert.deepEqual(proof.public_default_or_service_differences, differences,
    'public default differences were hidden or normalized');
  return {types, source: types.source, proof, ref, cases, differences,
    source_closures_prepared: 0, actual_owned_callers_executed: false,
    actual_native_packed_AOT_or_full_floor_qualified: false};
}
