/**
 * @license
 * Copyright Google LLC All Rights Reserved.
 * Copyright (c) 2026 Ryan Lester.
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.io/license
 */
/** Bounded complete constructor/factory/provider evidence; canonical/native gates remain separate. */
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {createHash} from 'node:crypto';
import {join} from 'node:path';
import {qualifiedComponentConfigPublicRuntime} from './component-config-caller-public-runtime-evidence.mjs';

const hash = bytes => createHash('sha256').update(bytes).digest('hex');
const raw = root => path => readFileSync(join(root, path));
const pins = {
  main: {path: 'compatibility/rc/component-config-caller-owned-main.json', sha256: 'f24684ee15990aa8d5cec972c978a10bb14aca8815b95f123e20ee6d397ef4af'},
  '21.x': {path: 'compatibility/rc/component-config-caller-owned-21.json', sha256: '550c1dbbed885d66330bb80e274bfa898863f1840686b8c638313b73bc7700bc'},
};
const markers = {
  'snack-config-loses-assertive': 'owned-snack-config-retains-assertive',
  'snack-factory-uses-peer-config': 'owned-snack-factory-config-class',
  'snack-module-loses-legacy-factory': 'owned-snack-module-provider-config-class',
  'paginator-ignores-parent-intl': 'owned-paginator-intl-reuses-parent',
  'paginator-leaks-intl-notifications': 'owned-paginator-destroy-unsubscribes-intl',
  'paginator-emits-wrong-page-size': 'owned-paginator-page-event-shape',
  'select-trigger-loses-provider-alias': 'owned-provider-alias-MatLegacySelectTrigger',
  'radio-group-loses-provider-alias': 'owned-provider-alias-MatLegacyRadioGroup',
  'list-loses-provider-alias': 'owned-provider-alias-MatLegacyList',
  'nav-list-loses-provider-alias': 'owned-provider-alias-MatLegacyNavList',
};

export function qualifiedComponentConfigOwned({root = process.cwd(), read = raw(root)} = {}) {
  const publicBoundary = qualifiedComponentConfigPublicRuntime({root, read});
  const source = publicBoundary.source, line = source.prior.line, ref = pins[line], bytes = read(ref.path);
  assert.equal(hash(bytes), ref.sha256, 'changed owned configuration runtime proof');
  const proof = JSON.parse(bytes);
  assert.equal(proof.line, line);
  assert.deepEqual(proof.public_boundary, publicBoundary.ref);
  assert.equal(proof.prototype_only, false);
  assert.equal(proof.source_closures, 0);
  assert.equal(proof.SDK_source_rewrites, false);
  assert.equal(proof.actual_native_packed_AOT_or_full_floor_qualified, false);
  assert.equal(proof.g11_claim, 'not-passed');
  const inputs = new Map();
  for (const member of proof.inputs) {
    assert.equal(inputs.has(member.path), false, 'duplicate owned runtime input');
    inputs.set(member.path, member.sha256);
    assert.equal(hash(read(member.path)), member.sha256, 'changed owned runtime input ' + member.path);
    assert.ok(!member.path.includes('snack-dom-source-context'), 'mutable shared owner in independent owned proof');
  }
  for (const member of [publicBoundary.ref, ...publicBoundary.proof.inputs]) {
    assert.equal(inputs.get(member.path), member.sha256, 'missing public owned-runtime dependency');
  }
  for (const path of ['scripts/component-config-caller-public-runtime-evidence.mjs',
    'tests/component_config_caller_owned_subjects.mjs', 'tests/component_config_caller_owned_runtime_subject.mjs',
    'tests/component_config_caller_owned_runtime_probe.mjs', 'tests/component_config_caller_constructor_cases.mjs',
    'tests/component_config_caller_tagged_runtime_subject.mjs']) {
    assert.equal(inputs.get(path), hash(read(path)), 'missing owned runtime implementation');
  }
  const versions = {original: ['16.2.12', '16.2.14'], main: ['22.1.7', '22.1.7'], '21.x': ['21.2.23', '21.2.14']};
  assert.equal(proof.runtime_subjects.length, 4);
  const tagged = proof.runtime_subjects.find(subject => subject.line === 'original' && subject.mode === 'development');
  assert.ok(tagged);
  const contexts = new Set();
  let cases = 0;
  for (const subject of proof.runtime_subjects) {
    assert.ok(['original', line].includes(subject.line));
    const key = subject.line + ':' + subject.mode;
    assert.equal(contexts.has(key), false);
    contexts.add(key);
    assert.deepEqual([subject.Core, subject.Material], versions[subject.line]);
    assert.equal(subject.actual_native_packed_AOT_or_full_floor_qualified, false);
    assert.equal(subject.cases.length, subject.line === 'original' ? 6 : 17);
    assert.equal(new Set(subject.cases).size, subject.cases.length);
    cases += subject.cases.length;
    if (subject.line === 'original') {
      assert.equal(subject.untouched_tagged_constructors, true);
      assert.equal(subject.current_owned_source_loaded, false);
      assert.equal(subject.semantically_emitted_source_files, 0);
      assert.deepEqual(subject.decorator_metadata_protocol_files, []);
      assert.equal(subject.generated_Angular_factory_template_or_query_execution, false);
      assert.deepEqual(subject.observations, tagged.observations);
    } else {
      assert.equal(subject.SDK_source_rewrites, false);
      assert.equal(subject.actual_owned_semantically_emitted_classes_and_factories, true);
      assert.equal(subject.decorator_metadata_capture_and_owner_payloads_are_explicit_protocols, true);
      assert.equal(subject.generated_Angular_module_factory_template_or_query_execution, false);
      assert.equal(subject.semantically_emitted_source_files, 200);
      assert.equal(subject.decorator_metadata_protocol_files.length, 8);
      assert.deepEqual(subject.observations.constructors, tagged.observations);
      assert.deepEqual(subject.observations.snackConfig, {politeness: 'assertive', peerSubtype: true});
      assert.deepEqual(subject.observations.snackModuleProvider, {actualFactory: true, publicTokenIdentity: true,
        legacyConfig: true, politeness: 'assertive', singleton: true});
      assert.deepEqual(subject.observations.paginatorIntlProvider, {parentIdentity: true,
        fallbackGenuineClass: true, fallbackRange: '1 – 10 of 100'});
      assert.deepEqual(subject.observations.componentProviderAliases,
        ['MatLegacySelectTrigger', 'MatLegacyRadioGroup', 'MatLegacyList', 'MatLegacyNavList']);
      assert.deepEqual(subject.observations.scrollProviders, ['MatLegacyTooltipModule',
        'MatLegacyAutocompleteModule', 'MatLegacySelectModule'].map(module => ({module,
        actualFactory: true, evaluatedProvider: true, publicOverlayPayloadIdentity: true,
        options: module === 'MatLegacyTooltipModule' ? {scrollThrottle: 20} : null})));
    }
    for (const [name, version] of [['rxjs', '7.8.2'], ['tslib', '2.8.1'], ['zone.js', '0.16.3']]) {
      assert.equal(subject.borrowed[name].version, version);
      assert.ok(subject.borrowed[name].root.startsWith('/'));
    }
  }
  for (const model of ['original', line]) for (const mode of ['development', 'production']) {
    assert.ok(contexts.has(model + ':' + mode));
  }
  assert.equal(cases, 46);
  assert.equal(proof.source_faults.length, 10);
  assert.deepEqual(proof.source_faults.map(fault => fault.id).sort(), Object.keys(markers).sort());
  for (const fault of proof.source_faults) {
    assert.equal(fault.line, line);
    assert.equal(fault.rejected, true);
    assert.equal(fault.exit_status, 1);
    assert.equal(fault.signal, null);
    assert.equal(fault.marker, markers[fault.id]);
    assert.equal(fault.isolated_emitter_matches_complete_semantic_baseline, true);
    assert.equal(fault.source_before_sha256, hash(source.sources.get(fault.path)));
    assert.match(fault.source_mutant_sha256, /^[0-9a-f]{64}$/);
    assert.notEqual(fault.source_mutant_sha256, fault.source_before_sha256);
  }
  return {publicBoundary, source, proof, ref, cases, source_closures_prepared: 0,
    actual_native_packed_AOT_or_full_floor_qualified: false};
}
